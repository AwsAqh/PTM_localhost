import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../styles/them';
import Button from '../components/Button';

export default function PreTrainedModelBlock({ model, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.title}>{model.name}</Text>
      <Text style={styles.desc}>{model.modelDescription}</Text>
      <Text style={styles.category}>{model.modelCategory}</Text>
      <Button onPress={handleSubmit}>Submit</Button>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  title: { color: colors.text, fontWeight: 'bold', fontSize: 18, marginBottom: 6 },
  desc: { color: colors.secondaryText, marginBottom: 6 },
  category: { color: colors.accent, fontWeight: '600', fontSize: 13 },
});
