import sys
import os
import random
import time
import ast
from io import BytesIO
from dotenv import load_dotenv

import numpy as np
import requests
import cloudinary
import cloudinary.api
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import OneCycleLR
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms
from PIL import Image
from google.cloud import storage

# Load environment variables from .env file
load_dotenv()

# Handle GCP_KEY_JSON for Render deployments
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

# Training transforms with augmentation
train_transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.RandomResizedCrop(224),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
    transforms.RandomAffine(degrees=0, translate=(0.1, 0.1), scale=(0.9, 1.1)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    transforms.RandomErasing(p=0.5, scale=(0.02, 0.33), ratio=(0.3, 3.3)),
])

# Validation transforms (no augmentation)
val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# MixUp utility functions
def mixup_data(x, y, alpha=0.4, device='cpu'):
    if alpha > 0:
        lam = np.random.beta(alpha, alpha)
    else:
        lam = 1
    batch_size = x.size(0)
    index = torch.randperm(batch_size).to(device)
    mixed_x = lam * x + (1 - lam) * x[index]
    y_a, y_b = y, y[index]
    return mixed_x, y_a, y_b, lam

def mixup_criterion(criterion, pred, y_a, y_b, lam):
    return lam * criterion(pred, y_a) + (1 - lam) * criterion(pred, y_b)

# Fetch image URLs from Cloudinary by class
def get_image_urls_from_cloudinary(model_name, class_names):
    print("\n=== FETCHING IMAGES FROM CLOUDINARY ===")
    image_urls = {}

    for class_name in class_names:
        print(f"Fetching class '{class_name}' URLs…")
        all_resources = []
        next_cursor = None

        while True:
            params = {
                'type': 'upload',
                'prefix': f"dataset/{model_name}/{class_name}",
                'max_results': 500
            }
            if next_cursor:
                params['next_cursor'] = next_cursor

            result = cloudinary.api.resources(**params)
            resources = result.get('resources', [])
            all_resources.extend(resources)
            print(f"  • got {len(resources)} images")

            next_cursor = result.get('next_cursor')
            if not next_cursor:
                break

        urls = [res['secure_url'] for res in all_resources]
        print(f"Class {class_name} - total fetched: {len(urls)} images")

        if len(urls) < 10:
            raise ValueError(f"Class {class_name} has insufficient images (<10)")

        image_urls[class_name] = urls

    counts = {cls: len(lst) for cls, lst in image_urls.items()}
    print("Successfully fetched images:", counts)
    return image_urls


# Custom Dataset for Cloudinary images
class CloudinaryDataset(Dataset):
    def __init__(self, image_urls, transform=None):
        self.image_urls = image_urls
        self.transform = transform
        self.image_list = [
            (cls, url)
            for cls, lst in image_urls.items()
            for url in lst
        ]
        self.session = requests.Session()
        retries = Retry(
            total=5,
            backoff_factor=2,
            status_forcelist=[429,500,502,503,504],
            allowed_methods=["GET"]
        )
        adapter = HTTPAdapter(max_retries=retries)
        self.session.mount('https://', adapter)

    def __len__(self):
        return len(self.image_list)

    def __getitem__(self, idx):
        class_name, url = self.image_list[idx]
        response = self.session.get(url, timeout=10)
        response.raise_for_status()
        img = Image.open(BytesIO(response.content))
        img = img.convert('RGB') if img.mode != 'RGB' else img
        img = self.transform(img) if self.transform else img
        label = list(self.image_urls.keys()).index(class_name)
        return img, label

# Setup model and replace classifier head
def setup_model(model_arch, num_classes):
    print(f"Setting up model architecture: {model_arch}")
    if model_arch == 'resnet50':
        model = models.resnet50(pretrained=True)
        model.fc = nn.Linear(model.fc.in_features, num_classes)
    elif model_arch == 'googlenet':
        model = models.googlenet(pretrained=True)
        model.fc = nn.Linear(model.fc.in_features, num_classes)
    elif model_arch == 'mobilenet_v2':
        model = models.mobilenet_v2(pretrained=True)
        model.classifier[1] = nn.Linear(
            model.classifier[1].in_features,
            num_classes
        )
    else:
        raise ValueError(f"Unsupported model architecture: {model_arch}")
    print(f"Model {model_arch} created successfully on device {device}")
    return model.to(device)

# Training function with scheduling and early stopping
def train_model(model, dataset, criterion, optimizer,
                target_accuracy=0.95, patience=5):
    print("\n=== Training Configuration ===")
    print(f"Target Accuracy: {target_accuracy}")
    print(f"Patience: {patience}")
    print(f"Initial Learning Rate: {optimizer.param_groups[0]['lr']}")

    total = len(dataset)
    train_size = int(0.8 * total)
    val_size = total - train_size
    train_subset, val_subset = torch.utils.data.random_split(
        dataset, [train_size, val_size]
    )

    batch_size = 32
    if train_size < 100:
        batch_size = min(8, train_size)
        print(f"\nSmall dataset detected ({train_size} samples). "
              f"Using batch_size={batch_size}")
    elif train_size > 1000:
        batch_size = 64
        print(f"\nLarge dataset detected ({train_size} samples). "
              f"Using batch_size={batch_size}")
    else:
        print(f"\nMedium dataset detected ({train_size} samples). "
              f"Using batch_size={batch_size}")

    train_loader = DataLoader(
        train_subset, batch_size=batch_size, shuffle=True
    )
    val_loader = DataLoader(
        val_subset, batch_size=batch_size, shuffle=False
    )

    # Discriminative LR: head vs body
    body_params = [
        p for n, p in model.named_parameters()
        if p.requires_grad and not any(k in n for k in ['fc','classifier'])
    ]
    head_params = (
        model.fc.parameters()
        if hasattr(model, 'fc')
        else model.classifier[1].parameters()
    )
    optimizer = optim.AdamW([
        {'params': body_params, 'lr': 1e-4},
        {'params': head_params, 'lr': 1e-3}
    ], weight_decay=1e-2)

    scheduler = OneCycleLR(
        optimizer, max_lr=[1e-4, 1e-3],
        epochs=100, steps_per_epoch=len(train_loader)
    )

    best_acc = 0.0
    no_improve = 0
    epoch = 0
    best_wts = model.state_dict()
    start_time = time.time()

    print("\n=== Starting Training ===")
    while True:
        print(f"\nEpoch {epoch}")
        print('-' * 10)

        model.train()
        running_loss = 0.0
        running_corrects = 0
        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            inputs, ya, yb, lam = mixup_data(inputs, labels, device=device)
            outputs = model(inputs)
            loss = mixup_criterion(criterion, outputs, ya, yb, lam)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            scheduler.step()

            running_loss += loss.item() * inputs.size(0)
            running_corrects += torch.sum(
                outputs.argmax(1) == ya
            ).item()

        train_loss = running_loss / train_size
        train_acc = running_corrects / train_size
        print("Training phase completed, going to validation phase")

        model.eval()
        val_loss = 0.0
        val_corrects = 0
        class_corrects = [0] * len(dataset.image_urls)
        class_totals = [0] * len(dataset.image_urls)

        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * inputs.size(0)
                _, preds = torch.max(outputs, 1)
                val_corrects += torch.sum(preds == labels).item()
                for i in range(len(labels)):
                    label, pred = labels[i], preds[i]
                    if label == pred:
                        class_corrects[label] += 1
                    class_totals[label] += 1

        val_loss /= val_size
        val_acc = val_corrects / val_size

        print(f"Train Loss: {train_loss:.4f} Acc: {train_acc:.4f}")
        print(f"Val Loss:   {val_loss:.4f} Acc: {val_acc:.4f}")
        print(f"Current Learning Rate: {optimizer.param_groups[0]['lr']}")
        print("\nPer-class accuracy:")
        for i, cls in enumerate(dataset.image_urls.keys()):
            if class_totals[i] > 0:
                acc_i = class_corrects[i] / class_totals[i]
                print(f"Class {cls}: {acc_i:.4f}")

        if val_acc >= target_accuracy:
            print(f"\nReached target accuracy of {target_accuracy:.4f}!")
            break
        if val_acc > best_acc:
            best_acc = val_acc
            best_wts = model.state_dict()
            no_improve = 0
            print(f"New best accuracy: {best_acc:.4f}")
        else:
            no_improve += 1
            print(f"Epochs without improvement: {no_improve}/{patience}")
            if no_improve >= patience:
                print(f"\nEarly stopping triggered after {patience} epochs without improvement")
                break

        epoch += 1

    elapsed = time.time() - start_time
    print("\n=== Training Summary ===")
    print(f"Total Training Time: {elapsed:.2f} seconds")
    print(f"Final Validation Accuracy: {val_acc:.4f}")
    print(f"Best Validation Accuracy: {best_acc:.4f}")
    print(f"Total Epochs: {epoch+1}")
    print(f"Final Learning Rate: {optimizer.param_groups[0]['lr']}")

    model.load_state_dict(best_wts)
    return model

# Save model locally and to GCS
def save_model(model, model_name, output_file):
    print(f"Saving model locally to models/{output_file}...")
    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(models_dir, exist_ok=True)
    local_path = os.path.join(models_dir, output_file)
    torch.save(model.state_dict(), local_path)
    print("Model saved locally successfully!")

    print("Uploading model to Google Cloud Storage...")
    client = storage.Client()
    bucket = client.bucket('ptm_models')
    blob_name = f"models/{output_file}"
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(local_path)
    cloud_path = f"gs://ptm_models/{blob_name}"
    print(f"Model uploaded to {cloud_path} successfully!")
    return {'local_path': local_path, 'cloud_path': cloud_path}

# Entry point
if __name__ == '__main__':
    argv = [arg if arg is not None else "" for arg in sys.argv]
    print("\n=== STARTING TRAINING SCRIPT ===")
    print("Arguments received:", argv)
    if len(argv) != 5:
        print("ERROR: Invalid number of arguments")
        print("Usage: python train_model.py <model_name> <classes> <model_arch> <output_file>")
        sys.exit(1)

    model_name, cls_str, model_arch, output_file = argv[1:]
    classes = ast.literal_eval(cls_str)

    print("\n=== CONFIGURATION ===")
    print(f"Model name: {model_name}")
    print(f"Classes: {classes}")
    print(f"Model architecture: {model_arch}")
    print(f"Output file: {output_file}")
    print(f"Device: {device}")

    try:
        image_urls = get_image_urls_from_cloudinary(model_name, classes)
    except Exception as e:
        print(f"ERROR fetching images from Cloudinary: {e}")
        sys.exit(1)

    try:
        dataset = CloudinaryDataset(image_urls, transform=train_transform)
        print(f"Dataset created with {len(dataset)} total images")
    except Exception as e:
        print(f"ERROR creating dataset: {e}")
        sys.exit(1)

    try:
        model = setup_model(model_arch, len(classes))
    except Exception as e:
        print(f"ERROR setting up model: {e}")
        sys.exit(1)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

    # Prepare optimizer with discriminative LR
    body_params = [
        p for n, p in model.named_parameters()
        if p.requires_grad and not any(k in n for k in ['fc','classifier'])
    ]
    head_params = (
        model.fc.parameters()
        if hasattr(model, 'fc')
        else model.classifier[1].parameters()
    )
    optimizer = optim.AdamW([
        {'params': body_params, 'lr': 1e-4},
        {'params': head_params, 'lr': 1e-3}
    ], weight_decay=1e-2)

    try:
        trained = train_model(model, dataset, criterion, optimizer)
        print("Training completed successfully")
    except Exception as e:
        print(f"ERROR during training: {e}")
        sys.exit(1)

    try:
        paths = save_model(trained, model_name, output_file)
        print(f"Model saved locally to: {paths['local_path']}")
        print(f"Model saved to cloud at: {paths['cloud_path']}")
    except Exception as e:
        print(f"ERROR saving model: {e}")
        sys.exit(1)

    print("\n=== TRAINING COMPLETED SUCCESSFULLY ===")
    # Output cloud path for backend
    print(paths['cloud_path'])
