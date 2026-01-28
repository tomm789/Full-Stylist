/**
 * Generating Outfit Modal Component
 * Modal shown while generating an outfit with try-on feature
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';

interface GeneratingOutfitModalProps {
  visible: boolean;
  outfitId: string | null;
  onViewOutfit: (outfitId: string) => void;
  onDismiss: () => void;
}

export const GeneratingOutfitModal = ({
  visible,
  outfitId,
  onViewOutfit,
  onDismiss,
}: GeneratingOutfitModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.text}>Generating Outfit...</Text>
          <Text style={styles.subtext}>This may take 60-90 seconds</Text>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                if (outfitId) {
                  onViewOutfit(outfitId);
                }
              }}
            >
              <Text style={styles.buttonText}>See Outfit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onDismiss}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    color: '#000',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#007AFF',
  },
});
