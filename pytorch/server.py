import time
import subprocess
import uuid
from flask import Flask, request, jsonify

import sys

app = Flask(__name__)

@app.route('/train', methods=['POST'])
def train_model():
    model_name = request.json.get('modelName')  
    classes = request.json.get('classes')  

    if not model_name:
        return jsonify({'error': 'Model name is required'}), 400
    if not classes or not isinstance(classes, list):
        return jsonify({'error': 'Classes are required and must be a list'}), 400

    try:
     
        file_name = f"{model_name}.pth" 

        
        subprocess.run(['python3', 'train_model.py', model_name, str(classes), file_name], check=True)

        
        return jsonify({'modelPath': file_name}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/classify', methods=['POST'])
def classify():
    # Get the input data (image_url and model_path) from the request
    data = request.get_json()
    image_url = data.get('image_url')
    model_path = data.get('model_path')
    classes_length = data.get('classes_length')

    if not image_url or not model_path or not classes_length:
        return jsonify({"error": "image_url, model_path, and classes_length are required"}), 400

    try:
        # Run the classification script using subprocess and capture its output
        result = subprocess.run(
            ['python3', './classify_image.py', image_url, model_path, str(classes_length)],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )

        # If there was an error in the subprocess, capture the error and return it
        if result.returncode != 0:
            return jsonify({'error': f"Error classifying image: {result.stderr}"}), 500

        # Get the predicted class index from the stdout of the subprocess
        predicted_class = result.stdout.strip()  # Strip any surrounding whitespace

        return jsonify({"predicted_class": predicted_class}), 200

    except Exception as e:
        # Handle errors
        return jsonify({'error': str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True, port=5000)
