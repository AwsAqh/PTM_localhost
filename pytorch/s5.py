import numpy as np
import sys
import os
import random
import cloudinary
import cloudinary.api
import cloudinary.uploader
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
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

# MixUp utilities
def mixup_data(x, y, alpha=0.4, device='cpu'):
    '''Returns mixed inputs, pairs of targets, and lambda''' 
    if alpha > 0:
        lam = np.random.beta(alpha, alpha)
    else:
        lam = 1.0
    batch_size = x.size(0)
    index = torch.randperm(batch_size).to(device)
    mixed_x = lam * x + (1 - lam) * x[index, :]
    y_a, y_b = y, y[index]
    return mixed_x, y_a, y_b, lam

def mixup_criterion(criterion, pred, y_a, y_b, lam):
    return lam * criterion(pred, y_a) + (1 - lam) * criterion(pred, y_b)

# Adaptive transforms based on dataset size
def get_transforms(dataset_size):
    normalize = transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
    if dataset_size < 200:
        # minimal augmentation
        train_tf = transforms.Compose([
            transforms.Resize((224,224)),
            transforms.ToTensor(),
            normalize
        ])
    elif dataset_size < 1000:
        # balanced augmentation
        train_tf = transforms.Compose([
            transforms.Resize((256,256)),
            transforms.RandomResizedCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.ToTensor(),
            normalize
        ])
    else:
        # aggressive augmentation
        train_tf = transforms.Compose([
            transforms.Resize((256,256)),
            transforms.RandomResizedCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(0.2,0.2,0.2,0.1),
            transforms.RandomAffine(0,translate=(0.1,0.1),scale=(0.9,1.1)),
            transforms.ToTensor(),
            normalize
        ])
    val_tf = transforms.Compose([
        transforms.Resize((224,224)),
        transforms.ToTensor(),
        normalize
    ])
    return train_tf, val_tf

# Dataset class for pickling
class CloudinaryDataset(Dataset):
    def __init__(self, image_urls, transform):
        self.image_urls = image_urls
        self.transform = transform
        self.items = [(cls,url) for cls,urls in image_urls.items() for url in urls]
        self.session = requests.Session()
        retries = Retry(total=5, backoff_factor=2,
                        status_forcelist=[429,500,502,503,504], allowed_methods=["GET"])
        self.session.mount('https://', HTTPAdapter(max_retries=retries))
    def __len__(self): return len(self.items)
    def __getitem__(self, idx):
        cls,url = self.items[idx]
        try:
            r = self.session.get(url,timeout=None)
            if r.status_code!=200 or 'image' not in r.headers.get('Content-Type',''):
                raise ValueError("Invalid image response")
            img = Image.open(BytesIO(r.content)).convert('RGB')
            img = self.transform(img)
            label = list(self.image_urls.keys()).index(cls)
            return img,label
        except Exception as e:
            print(f"[ERROR] {cls}@{url}: {e}")
            return None,None

# Fetch all Cloudinary URLs
def get_image_urls_from_cloudinary(model_name,class_names):
    image_urls={}
    for cls in class_names:
        print(f"\n=== FETCHING CLASS: {cls} ===")
        urls=[];cursor=None
        while True:
            params={'type':'upload','prefix':f"dataset/{model_name}/{cls}",'max_results':500}
            if cursor: params['next_cursor']=cursor
            res=cloudinary.api.resources(**params)
            fetched=res.get('resources',[])
            print(f" Fetched {len(fetched)}")
            urls += [r['secure_url'] for r in fetched]
            cursor=res.get('next_cursor');
            if not cursor: break
        print(f"Total {cls}: {len(urls)}")
        if len(urls)<10: raise ValueError(f"{cls} <10 images")
        image_urls[cls]=urls
    return image_urls

# Model setup
def setup_model(arch,num_classes):
    if arch=='resnet50': m=models.resnet50(pretrained=True)
    elif arch=='googlenet': m=models.googlenet(pretrained=True)
    elif arch=='mobilenet_v2': m=models.mobilenet_v2(pretrained=True)
    else: raise ValueError(f"Unsupported: {arch}")
    print(f"Training model: {arch}")
    for p in m.parameters(): p.requires_grad=False
    if arch=='mobilenet_v2': m.classifier[1]=nn.Linear(m.classifier[1].in_features,num_classes)
    else: m.fc=nn.Linear(m.fc.in_features,num_classes)
    return m.to(device)

# Training loop
def train_model(model,image_urls,criterion,optimizer,target_accuracy=0.95,patience=5):
    # Determine transforms
    total_samples=sum(len(v) for v in image_urls.values())
    train_tf,val_tf=get_transforms(total_samples)
    # Prepare dataset and sampler
    full_ds=CloudinaryDataset(image_urls,train_tf)
    counts=[len(image_urls[c]) for c in image_urls]
    maxc=max(counts);minc=min(counts)
    imbalance=(maxc/minc)>1.5
    if imbalance:
        class_weights=[1.0/c for c in counts]
        criterion=nn.CrossEntropyLoss(weight=torch.tensor(class_weights,device=device))
    scheduler=optim.lr_scheduler.ReduceLROnPlateau(optimizer,mode='max',factor=0.5,patience=3,verbose=True)
    # Split
    N=len(full_ds);idxs=list(range(N));random.shuffle(idxs)
    split=int(0.8*N);train_idx,val_idx=idxs[:split],idxs[split:]
    train_ds=CloudinaryDataset(image_urls,train_tf)
    val_ds=CloudinaryDataset(image_urls,val_tf)
    train_sub=torch.utils.data.Subset(train_ds,train_idx)
    val_sub=torch.utils.data.Subset(val_ds,val_idx)
    # Sampler
    if imbalance:
        sample_weights=[class_weights[list(image_urls.keys()).index(full_ds.items[i][0])] for i in train_idx]
        sampler=WeightedRandomSampler(sample_weights,len(sample_weights),replacement=True)
    else:
        sampler=None
    # DataLoaders
    nS=len(train_sub)
    bs=8 if nS<100 else 64 if nS>1000 else 32
    nw=min(4,os.cpu_count() or 1)
    train_loader=DataLoader(train_sub,batch_size=bs,sampler=sampler,shuffle=(sampler is None),num_workers=nw,pin_memory=True)
    val_loader=DataLoader(val_sub,batch_size=bs,shuffle=False,num_workers=nw,pin_memory=True)
    # Training
    scaler=GradScaler();best_wts=model.state_dict();best_acc=0.0;no_imp=0;epoch=0
    print(f"\n=== Training Config ===\nTarget: {target_accuracy}, Patience: {patience}, LR: {optimizer.param_groups[0]['lr']}")
    start=time.time()
    print("\n=== Starting Training ===")
    while True:
        print(f"\nEpoch {epoch}\n{'-'*10}")
        model.train();rl=0.0;rc=0
        for x,y in train_loader:
            if x is None: continue
            x,y=x.to(device,non_blocking=True),y.to(device,non_blocking=True)
            optimizer.zero_grad()
            with autocast():
                mixed_x,ya,yb,lam=mixup_data(x,y,device=device)
                out=model(mixed_x)
                loss=mixup_criterion(criterion,out,ya,yb,lam)
            scaler.scale(loss).backward();scaler.step(optimizer);scaler.update()
            preds=out.argmax(1)
            rl+=loss.item()*x.size(0);rc+=torch.sum(preds==ya).item()
        tr_loss,tr_acc=rl/len(train_sub),rc/len(train_sub)
        model.eval();vl=0.0;vc=0;cc=[0]*len(image_urls);ct=[0]*len(image_urls)
        with torch.no_grad():
            for x,y in val_loader:
                if x is None: continue
                x,y=x.to(device,non_blocking=True),y.to(device,non_blocking=True)
                out=model(x);loss=criterion(out,y);pred=out.argmax(1)
                vl+=loss.item()*x.size(0);vc+=torch.sum(pred==y).item()
                for i,lbl in enumerate(y):ct[lbl]+=1;cc[lbl]+=int(pred[i]==lbl)
        vl_loss,vl_acc=vl/len(val_sub),vc/len(val_sub)
        print(f'Train Loss: {tr_loss:.4f} Acc: {tr_acc:.4f}')
        print(f'Val Loss:   {vl_loss:.4f} Acc: {vl_acc:.4f}')
        print(f'LR: {optimizer.param_groups[0]['lr']}')
        print('\nPer-class accuracy:')
        for i,cls in enumerate(image_urls):
            if ct[i]>0:print(f'  Class {cls}: {cc[i]/ct[i]:.4f} ({cc[i]}/{ct[i]})')
        old=optimizer.param_groups[0]['lr'];scheduler.step(vl_acc);new=optimizer.param_groups[0]['lr']
        if new!=old:print(f'\nLearning rate adjusted: {old}->{new}')
        if vl_acc>=target_accuracy:print(f'\nReached target accuracy {target_accuracy}!');break
        if vl_acc>best_acc:best_acc, best_wts, no_imp=vl_acc, model.state_dict(),0;print(f'New best acc: {best_acc:.4f}')
        else:no_imp+=1;print(f'Epochs without improvement: {no_imp}/{patience}');
        if no_imp>=patience:print(f'\nEarly stopping triggered after {patience} epochs');break
        epoch+=1
    print(f"\n=== Training Summary ===\nTotal Time: {time.time()-start:.1f}s | Final Val Acc: {vl_acc:.4f} | Best Val Acc: {best_acc:.4f} | Epochs: {epoch} | LR: {optimizer.param_groups[0]['lr']}")
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

    # <-- fixed slice here:
    model_name, cls_str, arch, out = sys.argv[1:]
    classes = eval(cls_str)

    print(f"Model: {model_name} | Classes: {classes} | Arch: {arch} | Out: {out} | Device: {device}")

    try:
        image_urls = get_image_urls_from_cloudinary(model_name, classes)
        print('Fetched images')
    except Exception as e:
        print(f'ERROR fetching images: {e}')
        sys.exit(1)

    try:
        model   = setup_model(arch, len(classes))
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)

        model  = train_model(model, image_urls, criterion, optimizer)
        paths  = save_model(model, model_name, out)
        print(f'Model saved: {paths}')
        with open('model_cloud_path.txt', 'w') as f:
            f.write(paths['cloud_path'])
    except Exception as e:
        print(f'Fatal: {e}')
        import traceback; traceback.print_exc()
        sys.exit(1)
