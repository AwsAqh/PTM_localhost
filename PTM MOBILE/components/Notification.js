import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors } from '../styles/them';

export default function Notification({ message, type = 'info', actions = [], onClose, visible }) {
  if (!visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'loading':
        return colors.primary;
      default:
        return colors.primary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <Text style={styles.message}>{message}</Text>
      {actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionButton,
                action.type === 'primary' && styles.primaryAction
              ]}
              onPress={action.onClick}
            >
              <Text style={[
                styles.actionText,
                action.type === 'primary' && styles.primaryActionText
              ]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {!actions.length && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  message: {
    color: colors.text,
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  primaryAction: {
    backgroundColor: colors.text,
  },
  actionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  primaryActionText: {
    color: colors.primary,
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
});
