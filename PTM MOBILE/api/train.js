// Train a new model
export async function trainModel({ formData, token }) {
  const response = await fetch('http://localhost:5000/api/classify/train', {
    method: 'POST',
    headers: {
      'x-auth-token': token
      // Do not set Content-Type for FormData; browser will set it
    },
    body: formData
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Training failed');
  return data;
} 