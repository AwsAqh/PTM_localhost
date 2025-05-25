// Get all models
export async function getModels() {
  const response = await fetch('http://localhost:5000/api/classify/models', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error('Failed to fetch models');
  return response.json();
}

// Get classes for a model
export async function getModelClasses(modelId) {
  const response = await fetch(`http://localhost:5000/api/classify/classes/${modelId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error('Failed to fetch model classes');
  return response.json();
}

// Classify an image
export async function classifyImage({ file, modelId }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('modelId', modelId);
  const response = await fetch('http://localhost:5000/api/classify/classify', {
    method: 'POST',
    body: formData
  });
  if (!response.ok) throw new Error('Classification failed');
  return response.json();
} 