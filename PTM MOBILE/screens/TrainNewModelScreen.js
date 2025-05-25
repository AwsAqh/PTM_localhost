import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../styles/them';
import { trainModel } from '../api/train';
import * as ImagePicker from 'expo-image-picker';
import Notification from '../components/Notification';

export default function TrainNewModelScreen({ navigation }) {
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const [category, setCategory] = useState('');
  const [classes, setClasses] = useState([{ id: 1, name: 'Class 1', images: [] }]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' });

  const handleAddClass = () => {
    const newClassId = classes.length + 1;
    setClasses([...classes, { id: newClassId, name: `Class ${newClassId}`, images: [] }]);
  };

  const handleDeleteClass = (id) => {
    setClasses(classes.filter(cls => cls.id !== id));
  };

  const handlePickImages = async (classId) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      setClasses(classes.map(cls => 
        cls.id === classId 
          ? { ...cls, images: [...cls.images, ...result.assets.map(asset => asset.uri)] }
          : cls
      ));
    }
  };

  const handleTrain = async () => {
    if (!modelName || !modelDescription || !category) {
      setNotification({
        visible: true,
        message: 'Please fill in all fields',
        type: 'error'
      });
      return;
    }

    const emptyClasses = classes.some(cls => cls.images.length === 0);
    if (emptyClasses) {
      setNotification({
        visible: true,
        message: 'Please add images for all classes',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    setNotification({
      visible: true,
      message: 'Training model, please wait...',
      type: 'loading'
    });
    try {
      const formData = new FormData();
      formData.append('modelName', modelName);
      formData.append('modelDescription', modelDescription);
      formData.append('category', category);
      formData.append('classesCount', classes.length);

      classes.forEach((cls, index) => {
        formData.append(`class_name_${index}`, cls.name);
        cls.images.forEach((imageUri, imageIndex) => {
          formData.append(`class_dataset_${index}`, {
            uri: imageUri,
            type: 'image/jpeg',
            name: `image_${imageIndex}.jpg`,
          });
        });
      });

      const token = 'YOUR_AUTH_TOKEN'; // Replace with actual token
      const data = await trainModel({ formData, token });
      setNotification({
        visible: true,
        message: 'Model trained successfully!',
        type: 'success',
        actions: [{
          label: 'Browse Models',
          type: 'primary',
          onClick: () => navigation.navigate('Browse Models')
        }]
      });
    } catch (error) {
      setNotification({
        visible: true,
        message: error.message || 'Training failed',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Notification
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        actions={notification.actions}
        onClose={() => setNotification({ ...notification, visible: false })}
      />
      <Text style={styles.title}>Train New Model</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Model Name"
        value={modelName}
        onChangeText={setModelName}
      />
      
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Model Description"
        value={modelDescription}
        onChangeText={setModelDescription}
        multiline
        numberOfLines={4}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Category"
        value={category}
        onChangeText={setCategory}
      />

      {classes.map(cls => (
        <View key={cls.id} style={styles.classContainer}>
          <Text style={styles.classTitle}>Class {cls.id}</Text>
          <TextInput
            style={styles.input}
            placeholder={`Class ${cls.id} Name`}
            value={cls.name}
            onChangeText={(text) => {
              setClasses(classes.map(c => 
                c.id === cls.id ? { ...c, name: text } : c
              ));
            }}
          />
          <TouchableOpacity 
            style={styles.imageButton} 
            onPress={() => handlePickImages(cls.id)}
          >
            <Text style={styles.buttonText}>Add Images</Text>
          </TouchableOpacity>
          <Text style={styles.imageCount}>
            {cls.images.length} images selected
          </Text>
          {classes.length > 1 && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => handleDeleteClass(cls.id)}
            >
              <Text style={styles.deleteButtonText}>Delete Class</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={handleAddClass}>
        <Text style={styles.buttonText}>Add Class</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.trainButton} 
        onPress={handleTrain}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Training...' : 'Train Model'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
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
    marginBottom: 20,
    color: colors.text,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 10,
    backgroundColor: colors.card,
    color: colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  classContainer: {
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 8,
    marginBottom: 16,
  },
  classTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  imageButton: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  imageCount: {
    color: colors.secondaryText,
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  trainButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
