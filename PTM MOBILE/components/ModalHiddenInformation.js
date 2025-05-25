import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../styles/them';
import { MaterialIcons } from '@expo/vector-icons';

export default function ModalHiddenInformation({ visible, onClose, model }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{model.name}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.info}>{model.modelDescription}</Text>
          <Text style={styles.info}>{model.modelCategory}</Text>
          <Text style={styles.info}>{model.modelCreatedAt}</Text>
          <Text style={styles.info}>{model.modelCreatedBy}</Text>
          <Text style={styles.info}>{model.modelCreatorEmail}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#0008',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    width: 300,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 20,
  },
  info: {
    color: colors.secondaryText,
    marginBottom: 6,
  },
});
