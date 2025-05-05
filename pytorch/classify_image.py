import torch
from torchvision import models, transforms
from PIL import Image
import requests
from io import BytesIO
import sys

def classify_image(image_url, model_path, model_arch, classes_length):
    if model_arch == 'resnet50':
        model = models.resnet50(pretrained=False)
    elif model_arch == 'googlenet':
        model =  models.googlenet(weights="IMAGENET1K_V1")
    elif model_arch == 'mobilenet_v2':
        model = models.mobilenet_v2(pretrained=False)
    else:
        raise ValueError(f"Unsupported model architecture: {model_arch}")
    
    # Modify the final layer based on the number of classes
    if model_arch == 'mobilenet_v2':
        model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, classes_length)
    else:
        model.fc = torch.nn.Linear(in_features=model.fc.in_features, out_features=classes_length)

   
    model.load_state_dict(torch.load(model_path))
    model.eval()  # Set model to evaluation mode

    
    response = requests.get(image_url)
    img = Image.open(BytesIO(response.content))

    preprocess = transforms.Compose([
        transforms.Resize(256),  
        transforms.CenterCrop(224),  
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    img_tensor = preprocess(img)
    img_tensor = img_tensor.unsqueeze(0)  

    with torch.no_grad(): 
        output = model(img_tensor)

    _, predicted_class = torch.max(output, 1)
    print(predicted_class.item())  

if __name__ == '__main__':
    image_url = sys.argv[1]  
    model_path = sys.argv[2]  
    model_arch = sys.argv[3]  
    classes_length = int(sys.argv[4]) 

    classify_image(image_url, model_path, model_arch, classes_length)
