# Portable Teachable Machine: Cloud-Based Image Classification Platform

## Overview

PTM is a full-stack platform for training, managing, and deploying custom image classification models. Users can upload datasets, train models using transfer learning (ResNet, GoogLeNet, MobileNetV2), and classify new images via a modern web interface. The system supports cloud storage (Cloudinary, Google Cloud Storage) and robust handling of out-of-distribution images.

**Note:** PTM also includes a mobile app, and supports capturing images directly from a Raspberry Pi device. This makes it a truly portable teachable machine, enabling on-the-go data collection and model training from various devices.

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
node app.js
```

### 3. Frontend Setup

```bash
cd ..
npm install
# Set up your .env file with API URLs
npm run dev
```

### 4. Python Training Server

```bash
cd ../pytorch
pip install -r requirements.txt
# Set up your .env file with Cloudinary and GCP credentials
python server.py
```

---

## Cloud Storage & API Key Setup

### Google Cloud Storage (GCS) for Model Storage

1. **Create a GCS Bucket:**

   - Go to the [Google Cloud Console](https://console.cloud.google.com/).

   - Create a new bucket (e.g., `ptm_models`).

   - Update the bucket name in `pytorch/train_model.py` if you use a different name.

2. **Service Account & Credentials:**

   - Go to IAM & Admin > Service Accounts.

   - Create a new service account with roles:

     - Storage Object Viewer

     - Storage Object Creator

   - Create a new key (JSON format) and download it.

   - Place the file as `pytorch/secrets/gcs-key.json`.

3. **.env Setup for PyTorch Server:**

   - In `pytorch/.env`, add:

     ```
     GOOGLE_APPLICATION_CREDENTIALS=secrets/gcs-key.json
     ```

   - The code will automatically use this file for GCS access.

4. **Required Folders:**

   - Ensure `pytorch/models/` exists for local model storage. The code will create it if missing.

### Cloudinary for Dataset Storage

1. **Create a Cloudinary Account:**

   - [Sign up here](https://cloudinary.com/).

   - Get your Cloud Name, API Key, and API Secret from the dashboard.

2. **.env Setup for Backend:**

   - In `backend/.env`, add:

     ```
     CloudName=your_cloudinary_cloud_name
     ApiKey=your_cloudinary_api_key
     ApiSecret=your_cloudinary_api_secret
     ```

### Security & Best Practices

- **Never commit sensitive files** like `.env` or `gcs-key.json` to version control. Add these to your `.gitignore`:

  ```
  # .gitignore
  .env
  secrets/gcs-key.json
  pytorch/models/*
  !pytorch/models/.gitkeep
  ```

- For production, use environment variables for all secrets.

- For Render.com or similar, set `GCP_KEY_JSON` as an environment variable (the code will write it to `gcs-key.json` automatically).

### Summary of Required Files & Folders

- `pytorch/.env` (with GCS credentials)

- `pytorch/secrets/gcs-key.json` (GCS service account key)

- `pytorch/models/` (local model storage)

- `backend/.env` (with Cloudinary credentials)

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