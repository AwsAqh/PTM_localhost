import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ModelDetailsScreen({ route }) {
  const { model } = route.params;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{model.name}</Text>
      <Text style={styles.desc}>{model.modelDescription}</Text>
      <Text style={styles.info}>Category: {model.modelCategory}</Text>
      <Text style={styles.info}>Created by: {model.creatorName}</Text>
      <Text style={styles.info}>Email: {model.creatorEmail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181a20', padding: 16 },
  title: { color: '#fff', fontWeight: 'bold', fontSize: 22, marginBottom: 8 },
  desc: { color: '#b0c4de', marginBottom: 8 },
  info: { color: '#ccc', marginBottom: 4 }
});
