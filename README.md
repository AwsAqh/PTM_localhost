# PTM: Cloud-Based Image Classification Platform

## Overview

PTM is a full-stack platform for training, managing, and deploying custom image classification models. Users can upload datasets, train models using transfer learning (ResNet, GoogLeNet, MobileNetV2), and classify new images via a modern web interface. The system supports cloud storage (Cloudinary, Google Cloud Storage) and robust handling of out-of-distribution images.

---

## Features

- **User-friendly web interface** for dataset upload, model training, and image classification.
- **Transfer learning** with popular architectures (ResNet50, GoogLeNet, MobileNetV2).
- **Cloudinary** for dataset storage and serving.
- **Google Cloud Storage** for model storage.
- **Automatic data augmentation** for robust training.
- **Confidence-based "other/uncertain" detection** for out-of-distribution images.
- **Per-class accuracy reporting** and training progress feedback.
- **JWT-based authentication** and user management.
- **Modern React frontend** and RESTful Node.js/Express backend.
- **Python (PyTorch) training and inference server**.

---

## Tech Stack

- **Frontend:** React, CSS
- **Backend:** Node.js, Express, MongoDB, Mongoose
- **ML/Training:** Python, PyTorch, torchvision
- **Cloud Storage:** Cloudinary (images), Google Cloud Storage (models)
- **Authentication:** JWT

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/awsaqh/ptm.git
cd ptm
```

### 2. Backend Setup

```bash
cd backend
npm install
# Set up your .env file with Cloudinary, MongoDB, and JWT secrets
npm start
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
# Set up your .env file with API URLs
npm start
```

### 4. Python Training Server

```bash
cd ../pytorch
pip install -r requirements.txt
# Set up your .env file with Cloudinary and GCP credentials
python server.py
```

---

## Usage

1. **Register/Login** on the web interface.
2. **Upload your dataset** (images organized by class).
3. **Train a new model** by selecting architecture and classes.
4. **Classify images** using your trained model.
5. **View model performance** and per-class accuracy.

---

## Handling Out-of-Distribution Images

- The system uses a confidence threshold (default: 58%) to flag predictions as "other/uncertain" if the model is not confident.
- This helps prevent misleading results when users upload images unrelated to the trained classes.

---

## Screenshots

### Home

![Home](screenshots/home.png)

### Browse Models

![Browse Models](screenshots/browse_models.png)

### Train New Model

![Train New Model](screenshots/train_new_model.png)

### Classify Image

![Classify Image](screenshots/classify_image.png)

### Classification Result

![Classification Result](screenshots/classification_result.png)

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License

[MIT](LICENSE)

#   P T M _ l o c a l h o s t 
 
 