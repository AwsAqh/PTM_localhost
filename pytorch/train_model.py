import sys
import os
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
import uuid
import tempfile
from dotenv import load_dotenv
import time
import io
from google.cloud import storage
import json
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Load environment variables from .env file
load_dotenv()

# Handle GCP_KEY_JSON for Render deployments
if os.getenv("GCP_KEY_JSON"):
    with open("gcs-key.json", "w") as f:
        f.write(os.getenv("GCP_KEY_JSON"))
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "gcs-key.json"

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
    transforms.ColorJitter(
        brightness=0.2,  
        contrast=0.2,   
        saturation=0.2,  
        hue=0.1       
    ),
    transforms.RandomAffine(
        degrees=0,
        translate=(0.1, 0.1), 
        scale=(0.9, 1.1)    
    ),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# Validation transforms (no augmentation)
val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

def get_image_urls_from_cloudinary(model_name, class_names):
    image_urls = {}
    for class_name in class_names:
        result = cloudinary.api.resources(type='upload', prefix=f"dataset/{model_name}/{class_name}", max_results=500)
        print(f"Class {class_name} - Found {len(result['resources'])} resources")
        for res in result['resources']:
            print(res['secure_url'])
        image_urls[class_name] = [resource['secure_url'] for resource in result['resources']]
        if len(image_urls[class_name]) < 10:
            raise ValueError(f"Class {class_name} has insufficient images. Minimum 10 images required.")
    return image_urls

class CloudinaryDataset(Dataset):
    def __init__(self, image_urls, transform=None, is_training=True):
        self.image_urls = image_urls
        self.transform = transform
        self.is_training = is_training
        self.image_list = [(class_name, url) for class_name, urls in self.image_urls.items() for url in urls]

        # Set up a requests session with retry logic
        self.session = requests.Session()
        retries = Retry(
            total=5,
            backoff_factor=2,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET"]
        )
        self.session.mount('https://', HTTPAdapter(max_retries=retries))

    def __len__(self):
        return len(self.image_list)

    def __getitem__(self, idx):
        class_name, image_url = self.image_list[idx]
        try:
            response = self.session.get(image_url, timeout=None)
            if response.status_code != 200:
                print(f"[ERROR] Failed to fetch image: {image_url} (status {response.status_code})")
                raise ValueError("Image fetch failed")
            content_type = response.headers.get('Content-Type', '')
            if 'image' not in content_type:
                print(f"[ERROR] URL did not return an image: {image_url} (Content-Type: {content_type})")
                raise ValueError("Not an image")
            img = Image.open(BytesIO(response.content))
            if img.mode != 'RGB':
                img = img.convert('RGB')
            if self.is_training:
                img = train_transform(img)
            else:
                img = val_transform(img)
            label = list(self.image_urls.keys()).index(class_name)
            return img, label
        except Exception as e:
            print(f"[ERROR] Could not process image {image_url}: {e}. Skipping this image.")
            return None, None

def setup_model(model_arch, num_classes):
    if model_arch == 'resnet50':
        model = models.resnet50(pretrained=True)  
    elif model_arch == 'googlenet':
        model = models.googlenet(pretrained=True)  
    elif model_arch == 'mobilenet_v2':
        model = models.mobilenet_v2(pretrained=True)  
    else:
        raise ValueError(f"Unsupported model architecture: {model_arch}")
    
    print(f'Training model on {model_arch}')
    
    
    for param in model.parameters():
        param.requires_grad = False  
    
    
    if model_arch == 'mobilenet_v2':
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    else:
        model.fc = nn.Linear(model.fc.in_features, num_classes)

    return model.to(device)

def train_model(model, dataset, criterion, optimizer, target_accuracy=0.95, patience=5):
    best_model_wts = model.state_dict()
    best_acc = 0.0
    no_improve_epochs = 0
    epoch = 0
    
    print("\n=== Training Configuration ===")
    print(f"Target Accuracy: {target_accuracy}")
    print(f"Patience: {patience}")
    print(f"Initial Learning Rate: {optimizer.param_groups[0]['lr']}")
    
    # Add learning rate scheduler
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, 
        mode='max',          
        factor=0.5,          
        patience=3,          # Wait 3 epochs before reducing
        verbose=True         # Print when LR is reduced
    )
    
    # Track training time
    start_time = time.time()
    
    # Split dataset into train and validation
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(dataset, [train_size, val_size])
    
    # Create datasets with appropriate transforms
    train_dataset = CloudinaryDataset(dataset.image_urls, transform=train_transform, is_training=True)
    val_dataset = CloudinaryDataset(dataset.image_urls, transform=val_transform, is_training=False)
    
    # Dynamic batch size based on dataset size
    total_samples = len(train_dataset)
    if total_samples < 100:
        batch_size = min(8, total_samples)  # Small dataset: smaller batches
        print(f"\nSmall dataset detected ({total_samples} samples)")
        print("Using smaller batch size to prevent overfitting")
    elif total_samples > 1000:
        batch_size = 64  # Large dataset: larger batches
        print(f"\nLarge dataset detected ({total_samples} samples)")
        print("Using larger batch size for efficiency")
    else:
        batch_size = 32  # Medium dataset: default batch size
        print(f"\nMedium dataset detected ({total_samples} samples)")
        print("Using default batch size")
    
    print(f"Batch Size: {batch_size}")
    print(f"Training Samples: {len(train_dataset)}")
    print(f"Validation Samples: {len(val_dataset)}")
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    print("\n=== Starting Training ===")
    while True:
        print(f'\nEpoch {epoch}')
        print('-' * 10)

        # Training phase
        model.train()
        running_loss = 0.0
        running_corrects = 0

        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            optimizer.zero_grad()

            outputs = model(inputs)
            _, preds = torch.max(outputs, 1)
            loss = criterion(outputs, labels)

            loss.backward()
            optimizer.step()

            running_loss += loss.item() * inputs.size(0)
            running_corrects += torch.sum(preds == labels.data)

        train_loss = running_loss / len(train_dataset)
        train_acc = running_corrects.double() / len(train_dataset)

        # Validation phase
        model.eval()
        val_loss = 0.0
        val_corrects = 0
        num_classes = len(dataset.image_urls)
        class_corrects = [0] * num_classes
        class_totals = [0] * num_classes

        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, preds = torch.max(outputs, 1)
                loss = criterion(outputs, labels)

                val_loss += loss.item() * inputs.size(0)
                val_corrects += torch.sum(preds == labels.data)

                # Track per-class accuracy
                for i in range(len(labels)):
                    label = labels[i]
                    pred = preds[i]
                    if label == pred:
                        class_corrects[label] += 1
                    class_totals[label] += 1

        val_loss = val_loss / len(val_dataset)
        val_acc = val_corrects.double() / len(val_dataset)

        print(f'Train Loss: {train_loss:.4f} Acc: {train_acc:.4f}')
        print(f'Val Loss: {val_loss:.4f} Acc: {val_acc:.4f}')
        print(f'Current Learning Rate: {optimizer.param_groups[0]["lr"]}')
        
        # Print per-class accuracy
        print('\nPer-class accuracy:')
        for i, class_name in enumerate(dataset.image_urls.keys()):
            if class_totals[i] > 0:
                class_acc = class_corrects[i] / class_totals[i]
                print(f'Class {class_name}: {class_acc:.4f}')

        # Update learning rate based on validation accuracy
        old_lr = optimizer.param_groups[0]['lr']
        scheduler.step(val_acc)
        new_lr = optimizer.param_groups[0]['lr']
        if new_lr != old_lr:
            print(f'\nLearning rate adjusted: {old_lr} -> {new_lr}')

        # Check if we've reached target accuracy
        if val_acc >= target_accuracy:
            print(f'\nReached target accuracy of {target_accuracy:.4f}!')
            break

        # Early stopping check
        if val_acc > best_acc:
            best_acc = val_acc
            best_model_wts = model.state_dict()
            no_improve_epochs = 0
            print(f'New best accuracy: {best_acc:.4f}')
        else:
            no_improve_epochs += 1
            if no_improve_epochs >= patience:
                print(f'\nEarly stopping triggered after {patience} epochs without improvement')
                break
            print(f'Epochs without improvement: {no_improve_epochs}/{patience}')

        epoch += 1

    training_time = time.time() - start_time
    print(f'\n=== Training Summary ===')
    print(f'Total Training Time: {training_time:.2f} seconds')
    print(f'Final Validation Accuracy: {val_acc:.4f}')
    print(f'Best Validation Accuracy: {best_acc:.4f}')
    print(f'Total Epochs: {epoch}')
    print(f'Final Learning Rate: {optimizer.param_groups[0]["lr"]}')
    
    model.load_state_dict(best_model_wts)
    return model

def save_model(model, model_name, output_file):
    """Save model locally and to Google Cloud Storage"""
    try:
        # Create models directory if it doesn't exist
        models_dir = os.path.join(os.path.dirname(__file__), 'models')
        os.makedirs(models_dir, exist_ok=True)
        
        # Construct the full path for the local model file
        local_model_path = os.path.join(models_dir, os.path.basename(output_file))
        
        print(f'Saving model locally to {local_model_path}...')
        torch.save(model.state_dict(), local_model_path)
        print('Model saved locally successfully!')

        # Save to Google Cloud Storage
        print('Uploading model to Google Cloud Storage...')
        client = storage.Client()
        bucket = client.bucket('ptm_models')
        cloud_blob_name = f'models/{os.path.basename(output_file)}'
        blob = bucket.blob(cloud_blob_name)
        
        # Upload the file
        blob.upload_from_filename(local_model_path)
        cloud_path = f'gs://ptm_models/{cloud_blob_name}'
        print(f'Model uploaded to {cloud_path} successfully!')
        
        return {
            'local_path': local_model_path,
            'cloud_path': cloud_path
        }
    except Exception as e:
        print(f'Error saving model: {str(e)}')
        raise

if __name__ == '__main__':
    print('\n=== STARTING TRAINING SCRIPT ===')
    print('Arguments received:', sys.argv)
    
    if len(sys.argv) != 5:
        print('ERROR: Invalid number of arguments')
        print('Usage: python train_model.py <model_name> <classes> <model_arch> <output_file>')
        print('Note: Models will be saved locally in pytorch/models/ and in Google Cloud Storage')
        sys.exit(1)
        
    try:
        model_name = sys.argv[1]
        classes = eval(sys.argv[2])  # Convert string representation of list back to list
        model_arch = sys.argv[3]
        output_file = sys.argv[4]  # This will be just the filename, e.g. "model.pth"
        
        print('\n=== CONFIGURATION ===')
        print(f'Model name: {model_name}')
        print(f'Classes: {classes}')
        print(f'Model architecture: {model_arch}')
        print(f'Output file: {output_file} (will be saved in pytorch/models/)')
        print(f'Device: {device}')
        
        # Get image URLs from Cloudinary
        print('\n=== FETCHING IMAGES FROM CLOUDINARY ===')
        try:
            image_urls = get_image_urls_from_cloudinary(model_name, classes)
            print('Successfully fetched images from Cloudinary')
            for class_name, urls in image_urls.items():
                print(f'Class {class_name}: {len(urls)} images')
        except Exception as e:
            print(f'ERROR fetching images from Cloudinary: {str(e)}')
            raise
        
        # Create dataset
        print('\n=== CREATING DATASET ===')
        try:
            dataset = CloudinaryDataset(image_urls, transform=train_transform)
            print(f'Dataset created with {len(dataset)} total images')
        except Exception as e:
            print(f'ERROR creating dataset: {str(e)}')
            raise
        
        # Setup model
        print('\n=== SETTING UP MODEL ===')
        try:
            model = setup_model(model_arch, len(classes))
            print(f'Model {model_arch} created successfully')
            print(f'Model moved to device: {next(model.parameters()).device}')
        except Exception as e:
            print(f'ERROR setting up model: {str(e)}')
            raise
        
        # Setup training
        print('\n=== SETTING UP TRAINING ===')
        try:
            criterion = nn.CrossEntropyLoss()
            optimizer = optim.Adam(model.parameters(), lr=0.001)
            print('Loss function and optimizer created')
        except Exception as e:
            print(f'ERROR setting up training: {str(e)}')
            raise
        
        # Train model
        print('\n=== STARTING TRAINING PROCESS ===')
        try:
            model = train_model(model, dataset, criterion, optimizer)
            print('Training completed successfully')
        except Exception as e:
            print(f'ERROR during training: {str(e)}')
            raise
        
        # Save model locally and to cloud
        print('\n=== SAVING MODEL ===')
        try:
            model_paths = save_model(model, model_name, output_file)
            print(f'Model saved locally to: {model_paths["local_path"]}')
            print(f'Model saved to cloud at: {model_paths["cloud_path"]}')
            
            # Write the cloud path to a temporary file for the server to read
            with open('model_cloud_path.txt', 'w') as f:
                f.write(model_paths['cloud_path'])
        except Exception as e:
            print(f'ERROR saving model: {str(e)}')
            raise
        
        print('\n=== TRAINING COMPLETED SUCCESSFULLY ===')
        
    except Exception as e:
        print(f'\n!!! FATAL ERROR: {str(e)}')
        print('Stack trace:')
        import traceback
        traceback.print_exc()
        sys.exit(1)
