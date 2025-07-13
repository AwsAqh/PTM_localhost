import sys
import os
import random
import cloudinary
import cloudinary.api
import cloudinary.uploader
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms
from PIL import Image
import requests
from io import BytesIO
from dotenv import load_dotenv
import time
from google.cloud import storage
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import torch.backends.cudnn as cudnn
from torch.cuda.amp import GradScaler, autocast

# Load environment variables
load_dotenv()

# Configure GCP credentials if provided
if os.getenv("GCP_KEY_JSON"):
    with open("gcs-key.json", "w") as f:
        f.write(os.getenv("GCP_KEY_JSON"))
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "gcs-key.json"

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CloudName'),
    api_key=os.getenv('ApiKey'),
    api_secret=os.getenv('ApiSecret'),
)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
cudnn.benchmark = True  # Enable cuDNN autotuner for optimized kernels

# Data transforms
def get_transforms():
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(224),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(0.2, 0.2, 0.2, 0.1),
        transforms.RandomAffine(0, translate=(0.1, 0.1), scale=(0.9, 1.1)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    return train_transform, val_transform

# Top-level dataset class for pickling
class CloudinaryDataset(Dataset):
    def __init__(self, image_urls, transform, is_training=True):
        self.image_urls = image_urls
        self.transform = transform
        self.is_training = is_training
        # flatten (class, url) pairs
        self.items = [(cls, url) for cls, urls in image_urls.items() for url in urls]
        # HTTP session with retries
        self.session = requests.Session()
        retries = Retry(total=5, backoff_factor=2,
                        status_forcelist=[429, 500, 502, 503, 504], allowed_methods=["GET"])
        adapter = HTTPAdapter(max_retries=retries)
        self.session.mount('https://', adapter)

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        cls, url = self.items[idx]
        try:
            r = self.session.get(url, timeout=None)
            if r.status_code != 200 or 'image' not in r.headers.get('Content-Type', ''):
                raise ValueError(f"Invalid response for URL: {url}")
            img = Image.open(BytesIO(r.content)).convert('RGB')
            img = self.transform(img)
            label = list(self.image_urls.keys()).index(cls)
            return img, label
        except Exception as e:
            print(f"[ERROR] {cls} @ {url}: {e}")
            return None, None

# Fetch image URLs for each class (all pages)
def get_image_urls_from_cloudinary(model_name, class_names):
    image_urls = {}
    for cls in class_names:
        print(f"\n=== FETCHING CLASS: {cls} ===")
        urls = []
        next_cursor = None
        while True:
            params = {
                'type': 'upload',
                'prefix': f"dataset/{model_name}/{cls}",
                'max_results': 500
            }
            if next_cursor:
                params['next_cursor'] = next_cursor
            res = cloudinary.api.resources(**params)
            fetched = res.get('resources', [])
            print(f"  Fetched {len(fetched)} images")
            urls.extend([r['secure_url'] for r in fetched])
            next_cursor = res.get('next_cursor')
            if not next_cursor:
                break
        print(f"Total images for class '{cls}': {len(urls)}")
        if len(urls) < 10:
            raise ValueError(f"Class {cls} has insufficient images (<10)")
        image_urls[cls] = urls
    return image_urls

# Initialize model
def setup_model(arch, num_classes):
    if arch == 'resnet50':
        model = models.resnet50(pretrained=True)
    elif arch == 'googlenet':
        model = models.googlenet(pretrained=True)
    elif arch == 'mobilenet_v2':
        model = models.mobilenet_v2(pretrained=True)
    else:
        raise ValueError(f"Unsupported architecture: {arch}")
    print(f"Training model: {arch}")
    for p in model.parameters():
        p.requires_grad = False
    if arch == 'mobilenet_v2':
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    else:
        model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model.to(device)

# Training loop with speed enhancements
def train_model(model, image_urls, criterion, optimizer, target_accuracy=0.95, patience=5):
    train_tf, val_tf = get_transforms()
    scaler = GradScaler()
    best_wts = model.state_dict()
    best_acc = 0.0
    no_imp = 0
    epoch = 0

    print(f"\n=== Training Configuration ===\nTarget: {target_accuracy}, Patience: {patience}, Initial LR: {optimizer.param_groups[0]['lr']}")
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=3, verbose=True)

    # Build and split dataset
    full_train = CloudinaryDataset(image_urls, train_tf, is_training=True)
    N = len(full_train)
    indices = list(range(N))
    random.shuffle(indices)
    split = int(0.8 * N)
    train_idx, val_idx = indices[:split], indices[split:]

    train_sub = torch.utils.data.Subset(full_train, train_idx)
    full_val = CloudinaryDataset(image_urls, val_tf, is_training=False)
    val_sub = torch.utils.data.Subset(full_val, val_idx)

    # Determine batch size
    nS = len(train_sub)
    if nS < 100:
        bs = min(8, nS)
    elif nS > 1000:
        bs = 64
    else:
        bs = 32
    print(f"Batch Size: {bs}, Train samples: {nS}, Val samples: {len(val_sub)}")

    nw = min(4, os.cpu_count() or 1)
    train_loader = DataLoader(train_sub, batch_size=bs, shuffle=True, num_workers=nw, pin_memory=True)
    val_loader = DataLoader(val_sub, batch_size=bs, shuffle=False, num_workers=nw, pin_memory=True)
    start = time.time()
    print("\n=== Starting Training ===")
    while True:
        print(f"\nEpoch {epoch}\n{'-'*10}")
        # Training phase
        model.train()
        running_loss = 0.0
        running_corrects = 0
        for inputs, labels in train_loader:
            if inputs is None:
                continue
            inputs = inputs.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)
            optimizer.zero_grad()
            with autocast():
                outputs = model(inputs)
                loss = criterion(outputs, labels)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            preds = outputs.argmax(1)
            running_loss += loss.item() * inputs.size(0)
            running_corrects += (preds == labels).sum().item()
        train_loss = running_loss / len(train_sub)
        train_acc = running_corrects / len(train_sub)

        # Validation phase
        model.eval()
        val_loss = 0.0
        val_corrects = 0
        class_corrects = [0] * len(image_urls)
        class_totals = [0] * len(image_urls)
        with torch.no_grad():
            for inputs, labels in val_loader:
                if inputs is None:
                    continue
                inputs = inputs.to(device, non_blocking=True)
                labels = labels.to(device, non_blocking=True)
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                preds = outputs.argmax(1)
                val_loss += loss.item() * inputs.size(0)
                val_corrects += (preds == labels).sum().item()
                for i, lbl in enumerate(labels):
                    class_totals[lbl] += 1
                    class_corrects[lbl] += int(preds[i] == lbl)
        val_loss = val_loss / len(val_sub)
        val_acc = val_corrects / len(val_sub)

        # Print metrics
        print(f'Train Loss: {train_loss:.4f} Acc: {train_acc:.4f}')
        print(f'Val Loss: {val_loss:.4f} Acc: {val_acc:.4f}')
        print(f'Current LR: {optimizer.param_groups[0]['lr']}')
        print('\nPer-class accuracy:')
        for idx, cls in enumerate(image_urls):
            if class_totals[idx] > 0:
                acc_i = class_corrects[idx] / class_totals[idx]
                print(f'  Class {cls}: {acc_i:.4f} ({class_corrects[idx]}/{class_totals[idx]})')

        old_lr = optimizer.param_groups[0]['lr']
        scheduler.step(val_acc)
        new_lr = optimizer.param_groups[0]['lr']
        if new_lr != old_lr:
            print(f'\nLearning rate adjusted: {old_lr} -> {new_lr}')

        if val_acc >= target_accuracy:
            print(f'\nReached target accuracy of {target_accuracy}!')
            break
        if val_acc > best_acc:
            best_acc = val_acc
            best_wts = model.state_dict()
            no_imp = 0
            print(f'New best accuracy: {best_acc:.4f}')
        else:
            no_imp += 1
            print(f'Epochs without improvement: {no_imp}/{patience}')
            if no_imp >= patience:
                print(f'\nEarly stopping triggered after {patience} epochs')
                break
        epoch += 1

    print(f"\n=== Training Summary ===\nTotal Time: {time.time() - start:.1f}s | Final Val Acc: {val_acc:.4f} | Best Val Acc: {best_acc:.4f} | Epochs: {epoch} | LR: {optimizer.param_groups[0]['lr']}")
    model.load_state_dict(best_wts)
    return model

# Save model locally and to GCS
def save_model(model, model_name, output_file):
    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(models_dir, exist_ok=True)
    local_path = os.path.join(models_dir, output_file)
    print(f"Saving model locally to {local_path}...")
    torch.save(model.state_dict(), local_path)
    print("Model saved locally!")

    print("Uploading to GCS...")
    client = storage.Client()
    bucket = client.bucket('ptm_models')
    blob = bucket.blob(f"models/{output_file}")

    # send in 5 MB chunks rather than one giant request
    blob.chunk_size = 5 * 1024 * 1024  

    # give it up to 5 minutes per chunk
    blob.upload_from_filename(local_path, timeout=300)  

    cloud_path = f"gs://ptm_models/models/{output_file}"
    print(f"Uploaded to {cloud_path}")
    return {'local_path': local_path, 'cloud_path': cloud_path}

# Main execution
if __name__ == '__main__':
    print('\n=== STARTING TRAINING SCRIPT ===')
    print('Args:', sys.argv)
    if len(sys.argv) != 5:
        print('Usage: python train_model.py <model_name> <classes> <arch> <output_file>')
        sys.exit(1)
    model_name, cls_str, arch, out = sys.argv[1:]
    classes = eval(cls_str)
    print(f"Model: {model_name} | Classes: {classes} | Arch: {arch} | Out: {out} | Device: {device}")
    try:
        image_urls = get_image_urls_from_cloudinary(model_name, classes)
        print('Fetched images')
    except Exception as e:
        print(f'ERROR fetching images: {e}'); sys.exit(1)
    try:
        model = setup_model(arch, len(classes))
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)
        model = train_model(model, image_urls, criterion, optimizer)
        paths = save_model(model, model_name, out)
        print(f'Model saved: {paths}')
        with open('model_cloud_path.txt', 'w') as f:
            f.write(paths['cloud_path'])
    except Exception as e:
        print(f'Fatal: {e}')
        import traceback; traceback.print_exc()
        sys.exit(1)
