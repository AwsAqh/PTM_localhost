import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Header from '../components/Header';
import { colors } from '../styles/them';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to PTM</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Browse Models')}>
          <Text style={styles.buttonText}>Browse Trained Models</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Train New Model')}>
          <Text style={styles.buttonText}>Train New Model</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { color: colors.text, fontSize: 28, fontWeight: 'bold', marginBottom: 32, textAlign: 'center' },
  button: { backgroundColor: colors.primary, borderRadius: 8, padding: 16, marginVertical: 12, width: '100%' },
  buttonText: { color: colors.text, fontSize: 18, textAlign: 'center' }
});
