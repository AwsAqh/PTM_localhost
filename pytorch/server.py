import time
import subprocess
import uuid
from flask import Flask, request, jsonify
import json
import os

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
        
        # Run the training script
        subprocess.run(['python3', 'train_model.py', model_name, str(classes), model_arch, file_name], check=True)

        # Read the cloud path from the temporary file
        cloud_path = None
        try:
            with open('model_cloud_path.txt', 'r') as f:
                cloud_path = f.read().strip()
            # Clean up the temporary file
            os.remove('model_cloud_path.txt')
        except Exception as e:
            print(f"Error reading cloud path: {str(e)}")
        
        return jsonify({
            'modelPath': file_name,
            'cloudPath': cloud_path
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/classify', methods=['POST'])
def classify():
    try:
        data = request.json
        print("Received data:", data)  # Log received data
        
        image_url = data.get('image_url')
        local_path = data.get('local_path')
        cloud_path = data.get('cloud_path')
        model_arch = data.get('model_arch')
        classes_length = data.get('classes_length')

        # Validate and log each parameter
        print(f"Parameters received:")
        print(f"image_url: {image_url}")
        print(f"local_path: {local_path}")
        print(f"cloud_path: {cloud_path}")
        print(f"model_arch: {model_arch}")
        print(f"classes_length: {classes_length}")

        if not all([image_url, local_path, model_arch, classes_length]):
            missing = [k for k, v in {
                'image_url': image_url,
                'local_path': local_path,
                'model_arch': model_arch,
                'classes_length': classes_length
            }.items() if not v]
            error_msg = f"Missing required parameters: {', '.join(missing)}"
            print(error_msg)
            return jsonify({'error': error_msg}), 400

        # Verify paths exist
        if not os.path.exists(local_path):
            print(f"Warning: Local path does not exist: {local_path}")
        
        # Run the classification script with both paths
        cmd = ['python', 'classify_image.py', image_url, local_path, cloud_path, model_arch, str(classes_length)]
        print(f"Running command: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        
        print("Script stdout:", result.stdout)
        print("Script stderr:", result.stderr)
        
        # Parse the classification result from stdout
        try:
            classification_result = json.loads(result.stdout)
            return jsonify(classification_result), 200
        except json.JSONDecodeError as e:
            error_msg = f"Failed to parse classification result: {str(e)}\nOutput was: {result.stdout}"
            print(error_msg)
            return jsonify({'error': error_msg}), 500

    except subprocess.CalledProcessError as e:
        error_msg = f"Classification script error:\nCommand: {' '.join(e.cmd)}\nExit code: {e.returncode}\nOutput: {e.output}\nStderr: {e.stderr}"
        print(error_msg)
        return jsonify({'error': error_msg}), 500
    except Exception as e:
        error_msg = f"Server error: {str(e)}\nFull error: {repr(e)}"
        print(error_msg)
        return jsonify({'error': error_msg}), 500



if __name__ == '__main__':
   app.run(debug=True, port=5000)