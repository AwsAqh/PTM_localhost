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

cloudinary.config(
    cloud_name=os.getenv('CloudName'),
    api_key=os.getenv('ApiKey'),
    api_secret=os.getenv('ApiSecret'),
)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

def get_image_urls_from_cloudinary(model_name, class_names):
    image_urls = {}
    for class_name in class_names:
        result = cloudinary.api.resources(type='upload', prefix=f"dataset/{model_name}/{class_name}", max_results=100)
        image_urls[class_name] = [resource['secure_url'] for resource in result['resources']]
    return image_urls

class CloudinaryDataset(Dataset):
    def __init__(self, image_urls, transform=None):
        self.image_urls = image_urls
        self.transform = transform
        self.image_list = [(class_name, url) for class_name, urls in self.image_urls.items() for url in urls]

    def __len__(self):
        return len(self.image_list)

    def __getitem__(self, idx):
        class_name, image_url = self.image_list[idx]
        response = requests.get(image_url)
        img = Image.open(BytesIO(response.content))
        img = self.transform(img)
        label = list(self.image_urls.keys()).index(class_name)
        return img, label

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

def train_model(model, dataloaders, criterion, optimizer, num_epochs=12):
    best_model_wts = model.state_dict()
    best_acc = 0.0

    for epoch in range(num_epochs):
        print(f'Epoch {epoch}/{num_epochs - 1}')
        print('-' * 10)

        model.train()  
        running_loss = 0.0
        running_corrects = 0

        for inputs, labels in dataloaders:
            inputs, labels = inputs.to(device), labels.to(device)
            optimizer.zero_grad()

            outputs = model(inputs)
            _, preds = torch.max(outputs, 1)
            loss = criterion(outputs, labels)

            loss.backward()
            optimizer.step()

            running_loss += loss.item() * inputs.size(0)
            running_corrects += torch.sum(preds == labels.data)

        epoch_loss = running_loss / len(dataloaders.dataset)
        epoch_acc = running_corrects.double() / len(dataloaders.dataset)

        print(f'Train Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}')

        if epoch_acc > best_acc:
            best_acc = epoch_acc
            best_model_wts = model.state_dict()

    print(f'Best Train Acc: {best_acc:.4f}')
    model.load_state_dict(best_model_wts)
    return model

def save_model_locally(model, file_name):
    local_path = f"./models/{file_name}"
    torch.save(model.state_dict(), local_path)
    return local_path



if __name__ == '__main__':
    if len(sys.argv) < 5:
        print("Error: Model name, classes, model architecture, and file path arguments are required")
        sys.exit(1)

    model_name = sys.argv[1]
    classes = eval(sys.argv[2])  
    model_arch = sys.argv[3]  
    file_name = sys.argv[4]  

    print(f"Training model: {model_name}")
    print(f"Classes: {classes}")
    print(f"Model Architecture: {model_arch}")

    num_classes = len(classes)

    
    image_urls = get_image_urls_from_cloudinary(model_name, classes)

    dataset = CloudinaryDataset(image_urls, transform=transform)
    train_loader = DataLoader(dataset, batch_size=32, shuffle=True)

    
    model = setup_model(model_arch, num_classes)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.SGD(model.parameters(), lr=0.001, momentum=0.9)

    trained_model = train_model(model, train_loader, criterion, optimizer, num_epochs=12)

    local_model_path = save_model_locally(trained_model, file_name)
    print(f"Model saved locally at {local_model_path}")
