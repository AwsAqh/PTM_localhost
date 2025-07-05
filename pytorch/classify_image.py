import sys
import os
import io
import json
from io import BytesIO
from dotenv import load_dotenv

import numpy as np
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from google.cloud import storage

# Load environment variables
load_dotenv()

# Handle GCP_KEY_JSON for Render deployments
if os.getenv("GCP_KEY_JSON"):
    with open("gcs-key.json", "w") as f:
        f.write(os.getenv("GCP_KEY_JSON"))
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "gcs-key.json"

# Configure HTTP session with retries
session = requests.Session()
retry = Retry(total=5, backoff_factor=1,
              status_forcelist=[429, 500, 502, 503, 504],
              allowed_methods=["GET"])
adapter = HTTPAdapter(max_retries=retry)
session.mount('https://', adapter)

# Preprocessing transforms (must match training val_transform)
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

def log(msg: str):
    print(msg, file=sys.stderr)

# Load model weights from GCS if valid, else local
def load_model_from_path(model, local_path: str, cloud_path: str):
    log("\n=== Model Loading Process ===")
    log(f"Local path: {local_path}")
    log(f"Cloud path: {cloud_path}")

    # Try cloud only if cloud_path is a non-empty gs:// URI
    if isinstance(cloud_path, str) and cloud_path.startswith("gs://"):
        try:
            log(f"Attempting to load from GCS: {cloud_path}")
            parts = cloud_path.replace("gs://", "").split("/")
            bucket_name = parts[0]
            blob_name = "/".join(parts[1:])
            client = storage.Client()
            bucket = client.bucket(bucket_name)
            blob = bucket.blob(blob_name)
            if blob.exists():
                buffer = io.BytesIO()
                blob.download_to_file(buffer)
                buffer.seek(0)
                model.load_state_dict(torch.load(buffer, map_location='cpu'))
                log("Model loaded from GCS successfully")
                return model
            else:
                log("Blob not found in GCS, falling back to local path")
        except Exception as e:
            log(f"Error loading from GCS: {e}")
            log("Falling back to local path...")
    # Fallback to local
    try:
        log(f"Attempting to load from local path: {local_path}")
        if not local_path or not os.path.exists(local_path):
            raise FileNotFoundError("Local model file not found")
        model.load_state_dict(torch.load(local_path, map_location='cpu'))
        log("Model loaded from local path successfully")
        return model
    except Exception as e:
        log(f"Error loading from local path: {e}")
        raise FileNotFoundError("Failed to load model from both GCS and local paths")

# Main classification function
def classify_image(image_url: str, local_path: str, cloud_path: str,
                   model_arch: str, classes_length: int):
    log("\n=== Starting Classification Process ===")
    log(f"Image URL: {image_url}")
    log(f"Model architecture: {model_arch}")
    log(f"Number of classes: {classes_length}")

    # Build model skeleton
    log("\nSetting up model architecture...")
    if model_arch == "resnet50":
        model = models.resnet50(pretrained=False)
    elif model_arch == "googlenet":
        model = models.googlenet(weights=models.GoogLeNet_Weights.IMAGENET1K_V1)
    elif model_arch == "mobilenet_v2":
        model = models.mobilenet_v2(pretrained=False)
    else:
        raise ValueError(f"Unsupported model architecture: {model_arch}")

    # Replace head
    if hasattr(model, "fc"):
        model.fc = nn.Linear(model.fc.in_features, classes_length)
    else:
        model.classifier[1] = nn.Linear(
            model.classifier[1].in_features, classes_length
        )
    log(f"Model skeleton created with {classes_length} outputs")

    # Load weights and set to eval
    model = load_model_from_path(model, local_path, cloud_path)
    model.eval()
    log("Model set to evaluation mode")

    # Fetch and preprocess image
    log("\nLoading and preprocessing image...")
    resp = session.get(image_url, timeout=10)
    if resp.status_code != 200:
        raise ValueError(f"Failed to download image: HTTP {resp.status_code}")
    img = Image.open(BytesIO(resp.content)).convert("RGB")
    tensor = preprocess(img).unsqueeze(0)
    log("Image preprocessed successfully")

    # Inference
    log("\nRunning inference...")
    with torch.no_grad():
        out = model(tensor)
        probs = torch.nn.functional.softmax(out[0], dim=0).tolist()

    # Threshold decision
    threshold = 0.58
    max_conf = max(probs) if probs else 0.0
    pred_idx = int(np.argmax(probs)) if probs else None

    if max_conf >= threshold:
        predicted_label = str(pred_idx)
        is_other = False
    else:
        predicted_label = "other/uncertain"
        is_other = True

    result = {
        "predicted_class": pred_idx if not is_other else None,
        "predicted_label": predicted_label,
        "confidences": probs,
        "is_other": is_other,
        "max_confidence": max_conf
    }

    log("\nClassification completed successfully")
    log(f"Result: {json.dumps(result, indent=2)}")
    print(json.dumps(result))
    return result

# CLI entrypoint
if __name__ == '__main__':
    print("\n=== STARTING CLASSIFICATION SCRIPT ===")
    if len(sys.argv) != 6:
        print("Usage: python classify_image.py <image_url> <local_path> <cloud_path> <model_arch> <classes_length>")
        sys.exit(1)

    image_url  = sys.argv[1] or ""
    local_path = sys.argv[2] or ""
    cloud_path = sys.argv[3] or ""
    model_arch = sys.argv[4] or ""
    try:
        classes_length = int(sys.argv[5])
    except ValueError:
        log("ERROR: classes_length must be an integer")
        sys.exit(1)

    try:
        classify_image(image_url, local_path, cloud_path, model_arch, classes_length)
    except Exception as e:
        log(f"Classification failed: {e}")
        sys.exit(1)
