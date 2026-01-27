import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface PolicyBlockModalProps {
  visible: boolean;
  message?: string;
  onClose: () => void;
}

export default function PolicyBlockModal({ visible, message, onClose }: PolicyBlockModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Generation Blocked</Text>
          <Text style={styles.message}>
            {message || 'Gemini could not generate this image because it conflicts with safety policy. No credits were charged.'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  message: {
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
  },
  button: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
