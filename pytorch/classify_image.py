import torch
from torchvision import models, transforms
from PIL import Image
import requests
from io import BytesIO
import sys

def classify_image(image_url, model_path, classes_length):
    # Load the model architecture
    model = models.resnet18(pretrained=False)  
    
    # Modify the final fully connected layer for 2 classes (or any number of classes)
    model.fc = torch.nn.Linear(in_features=model.fc.in_features, out_features=classes_length)
    
    model.load_state_dict(torch.load(model_path))
    
   
    model.eval()

    # Fetch the image from the URL
    response = requests.get(image_url)
    img = Image.open(BytesIO(response.content))

    
    preprocess = transforms.Compose([
        transforms.Resize(256),  
        transforms.CenterCrop(224), 
        transforms.ToTensor(), 
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),  
    ])

    # Apply the preprocessing transformation
    img_tensor = preprocess(img)
    img_tensor = img_tensor.unsqueeze(0) 

    # Make the prediction
    with torch.no_grad(): 
        output = model(img_tensor)

    # Get the predicted class index
    _, predicted_class = torch.max(output, 1)

    print(predicted_class.item())

if __name__ == '__main__':
   
    image_url = sys.argv[1]
    model_path = sys.argv[2]
    classes_length = int(sys.argv[3])

    classify_image(image_url, model_path, classes_length)
