import time
import subprocess
import uuid
from flask import Flask, request, jsonify

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


if __name__ == '__main__':
    app.run(debug=True, port=5000)
