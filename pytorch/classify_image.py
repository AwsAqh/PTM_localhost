import torch
from torchvision import models, transforms
from PIL import Image
import requests
from io import BytesIO
import sys
import json
import io
from google.cloud import storage
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Handle GCP_KEY_JSON for Render deployments
if os.getenv("GCP_KEY_JSON"):
    with open("gcs-key.json", "w") as f:
        f.write(os.getenv("GCP_KEY_JSON"))
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "gcs-key.json"

def load_model_from_path(model, local_path, cloud_path):
    """Load model from Google Cloud Storage first, fall back to local path if not found"""
    # Use stderr for logging so it doesn't interfere with JSON output
    def log(msg):
        print(msg, file=sys.stderr)
        
    log(f"\n=== Model Loading Process ===")
    log(f"Local path: {local_path}")
    log(f"Cloud path: {cloud_path}")
    
    # First try loading from cloud if cloud path is provided
    if cloud_path and cloud_path.startswith("gs://"):
        log(f"\nAttempting to load model from Google Cloud Storage: {cloud_path}")
        try:
            # Extract bucket and blob from gs:// path
            _, _, bucket, *blob_parts = cloud_path.split("/")
            blob_name = "/".join(blob_parts)
            log(f"Bucket: {bucket}")
            log(f"Blob name: {blob_name}")
            
            client = storage.Client()
            bucket_obj = client.bucket(bucket)
            blob = bucket_obj.blob(blob_name)
            
            # Check if blob exists
            if not blob.exists():
                log(f"Model not found in GCS: {cloud_path}")
                raise FileNotFoundError("Model not in cloud")
            
            log("Downloading model from GCS...")
            # Download to buffer
            buffer = io.BytesIO()
            blob.download_to_file(buffer)
            buffer.seek(0)
            
            log("Loading model from buffer...")
            # Load model from buffer
            model.load_state_dict(torch.load(buffer))
            log("Model successfully loaded from Google Cloud Storage")
            return model
        except Exception as e:
            log(f"Error loading from GCS: {str(e)}")
            log("Stack trace:")
            import traceback
            traceback.print_exc(file=sys.stderr)
            log("\nFalling back to local path...")
    else:
        log("\nCloud path not provided or invalid, attempting local path")

    # Try loading from local path
    try:
        log(f"\nAttempting to load model from local path: {local_path}")
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Model file not found in local path: {local_path}")
        
        log("Loading model from local file...")
        model.load_state_dict(torch.load(local_path))
        log("Model successfully loaded from local path")
        return model
    except Exception as e:
        log(f"Error loading from local path: {str(e)}")
        log("Stack trace:")
        import traceback
        traceback.print_exc(file=sys.stderr)
        raise FileNotFoundError(f"Failed to load model from both cloud and local paths. Last error: {str(e)}")

def classify_image(image_url, local_path, cloud_path, model_arch, classes_length):
    try:
        # Use stderr for logging so it doesn't interfere with JSON output
        def log(msg):
            print(msg, file=sys.stderr)
            
        log("\n=== Starting Classification Process ===")
        log(f"Image URL: {image_url}")
        log(f"Model architecture: {model_arch}")
        log(f"Number of classes: {classes_length}")
        
        # Setup model architecture
        log("\nSetting up model architecture...")
        if model_arch == 'resnet50':
            model = models.resnet50(pretrained=False)
        elif model_arch == 'googlenet':
            model = models.googlenet(weights="IMAGENET1K_V1")
        elif model_arch == 'mobilenet_v2':
            model = models.mobilenet_v2(pretrained=False)
        else:
            raise ValueError(f"Unsupported model architecture: {model_arch}")
        
        log(f"Created {model_arch} model with {classes_length} output classes")
        
        # Modify the final layer based on the number of classes
        log("Modifying final layer for classification...")
        if model_arch == 'mobilenet_v2':
            model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, classes_length)
        else:
            model.fc = torch.nn.Linear(in_features=model.fc.in_features, out_features=classes_length)

        # Load model weights
        log("\nLoading model weights...")
        model = load_model_from_path(model, local_path, cloud_path)
        model.eval()  # Set model to evaluation mode
        log("Model set to evaluation mode")

        # Load and preprocess image
        log("\nLoading and preprocessing image...")
        log(f"Fetching image from URL: {image_url}")
        response = requests.get(image_url)
        if response.status_code != 200:
            raise ValueError(f"Failed to download image: HTTP {response.status_code}")
            
        img = Image.open(BytesIO(response.content))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        log("Image loaded and converted to RGB")

        # Preprocess image
        log("Applying image transformations...")
        preprocess = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        img_tensor = preprocess(img)
        img_tensor = img_tensor.unsqueeze(0)
        log("Image preprocessed successfully")

        # Perform classification
        log("\nRunning inference...")
        with torch.no_grad():
            output = model(img_tensor)
            probabilities = torch.nn.functional.softmax(output[0], dim=0)
            predicted_class = torch.argmax(probabilities).item()
            confidences = probabilities.tolist()

        result = {
            "predicted_class": predicted_class,
            "confidences": confidences
        }
        log("\nClassification completed successfully")
        log("Result: " + json.dumps(result, indent=2))
        
        # Print only the JSON result to stdout
        print(json.dumps(result))
        return result

    except Exception as e:
        log(f"\n!!! Error during classification: {str(e)}")
        log("Stack trace:")
        import traceback
        traceback.print_exc(file=sys.stderr)
        raise

if __name__ == '__main__':
    if len(sys.argv) != 6:
        print("Usage: python classify_image.py <image_url> <local_path> <cloud_path> <model_arch> <classes_length>")
        sys.exit(1)

    image_url = sys.argv[1]
    local_path = sys.argv[2]
    cloud_path = sys.argv[3]
    model_arch = sys.argv[4]
    classes_length = int(sys.argv[5])

    try:
        classify_image(image_url, local_path, cloud_path, model_arch, classes_length)
    except Exception as e:
        print(f"Classification failed: {str(e)}")
        sys.exit(1)
