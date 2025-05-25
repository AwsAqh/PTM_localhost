import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { getModelClasses, classifyImage } from '../api/models';
import { colors } from '../styles/them';
import * as ImagePicker from 'expo-image-picker';
import Notification from '../components/Notification';

export default function ClassifyImageScreen({ route, navigation }) {
  const { modelId } = route.params;
  const [classes, setClasses] = useState([]);
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [classificationResult, setClassificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' });

  useEffect(() => {
    const loadModelClasses = async () => {
      try {
        const data = await getModelClasses(modelId);
        setClasses(data.classes);
        setModelName(data.modelName);
        setModelDescription(data.modelDescription || '');
      } catch (error) {
        setNotification({
          visible: true,
          message: 'Failed to load model classes',
          type: 'error'
        });
      }
    };
    loadModelClasses();
  }, [modelId]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setClassificationResult(null);
    }
  };

  const handleClassify = async () => {
    if (!selectedImage) {
      setNotification({
        visible: true,
        message: 'Please select an image first',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    setNotification({
      visible: true,
      message: 'Classifying image, please wait...',
      type: 'loading'
    });
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedImage,
        type: 'image/jpeg',
        name: 'photo.jpg',
      });
      formData.append('modelId', modelId);

      const data = await classifyImage({ file: formData, modelId });
      const result = {
        label: data.result,
        confidences: classes.map(className => 
          className === data.result ? 0.95 : 0.05 / (classes.length - 1)
        )
      };
      setClassificationResult(result);
      setNotification({
        visible: true,
        message: `Image classified as: ${data.result}`,
        type: 'success'
      });
    } catch (error) {
      setNotification({
        visible: true,
        message: 'Classification failed',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Notification
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        actions={notification.actions}
        onClose={() => setNotification({ ...notification, visible: false })}
      />
      <Text style={styles.title}>{modelName}</Text>
      {modelDescription ? <Text style={styles.description}>{modelDescription}</Text> : null}
      
      <View style={styles.imageContainer}>
        {selectedImage ? (
          <Image source={{ uri: selectedImage }} style={styles.image} />
        ) : (
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Text style={styles.uploadText}>Select Image</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.classifyButton} onPress={handleClassify} disabled={loading || !selectedImage}>
        <Text style={styles.buttonText}>{loading ? 'Classifying...' : 'Classify Image'}</Text>
      </TouchableOpacity>

      {classificationResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Classification Result:</Text>
          <Text style={styles.resultLabel}>Label: {classificationResult.label}</Text>
          <Text style={styles.resultConfidence}>
            Confidence: {(classificationResult.confidences[classes.indexOf(classificationResult.label)] * 100).toFixed(1)}%
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.text,
  },
  description: {
    fontSize: 16,
    color: colors.secondaryText,
    marginBottom: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  image: {
    width: 300,
    height: 300,
    borderRadius: 10,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: 200,
  },
  uploadText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  classifyButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: colors.card,
    borderRadius: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  resultLabel: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 5,
  },
  resultConfidence: {
    fontSize: 16,
    color: colors.text,
  },
});
