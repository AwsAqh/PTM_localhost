import time
import subprocess
import uuid
from flask import Flask, request, jsonify
import json

import sys

app = Flask(__name__)

@app.route('/train', methods=['POST'])
def train_model():
    model_name = request.json.get('modelName')  
    classes = request.json.get('classes')  
    model_arch=request.json.get("modelArch")

    if not model_name:
        return jsonify({'error': 'Model name is required'}), 400
    if not classes or not isinstance(classes, list):
        return jsonify({'error': 'Classes are required and must be a list'}), 400

    try:
     
        file_name = f"{model_name}.pth" 

        
        subprocess.run(['python3', 'train_model.py', model_name, str(classes),model_arch, file_name], check=True)

        
        return jsonify({'modelPath': file_name}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/classify', methods=['POST'])
def classify():
    
    data = request.get_json()
    image_url = data.get('image_url')
    model_path = data.get('model_path')
    classes_length = data.get('classes_length')
    model_arch=data.get('model_arch')
    print(f'data recieved : {image_url} {model_arch} {model_path} {classes_length}')
    if not image_url or not model_path or not classes_length:
        return jsonify({"error": "image_url, model_path, and classes_length are required"}), 400

    try:
       
        result = subprocess.run(
            ['python3', './classify_image.py', image_url, model_path,model_arch, str(classes_length)],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )

       
        if result.returncode != 0:
            return jsonify({'error': f"Error classifying image: {result.stderr}"}), 500

        # Parse the JSON output from classify_image.py
        try:
            classification_result = json.loads(result.stdout.strip())
            return jsonify({
                "predicted_class": classification_result["predicted_class"],
                "confidences": classification_result["confidences"]
            }), 200
        except json.JSONDecodeError as e:
            return jsonify({'error': f"Error parsing classification result: {str(e)}"}), 500

    except Exception as e:
       
        return jsonify({'error': str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True, port=5000)
