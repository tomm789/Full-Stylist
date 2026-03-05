/**
 * AddToHomeScreenInstructionsModal Component
 * Modal showing instructions for adding app to home screen on iOS
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';

interface AddToHomeScreenInstructionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AddToHomeScreenInstructionsModal({
  visible,
  onClose,
}: AddToHomeScreenInstructionsModalProps) {
  // Web-only styles (React Native Web compatible)
  const webStyles: any = Platform.OS === 'web'
    ? {
        modalOverlay: {
          position: 'fixed' as const,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end' as const,
          zIndex: 10000,
        },
        modalContent: {
          backgroundColor: '#ffffff',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          maxHeight: '80vh',
          paddingBottom: `calc(20px + env(safe-area-inset-bottom))`,
          boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.25)',
        },
        modalTitle: {
          fontSize: '22px',
          fontWeight: '700' as const,
          color: '#000000',
        },
        stepNumber: {
          width: '32px',
          height: '32px',
          borderRadius: '16px',
          backgroundColor: '#007AFF',
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          marginRight: '12px',
        },
        stepText: {
          fontSize: '16px',
          color: '#000000',
          lineHeight: '24px',
          flex: 1,
        },
        noteText: {
          fontSize: '14px',
          color: '#666666',
          lineHeight: '20px',
          fontStyle: 'italic' as const,
        },
        modalFooter: {
          paddingTop: '16px',
          paddingBottom: '20px',
          paddingHorizontal: '20px',
          borderTopWidth: '1px',
          borderTopColor: '#e0e0e0',
        },
        gotItButton: {
          backgroundColor: '#007AFF',
          borderRadius: '12px',
          paddingVertical: '14px',
          paddingHorizontal: '24px',
          alignItems: 'center' as const,
        },
        gotItButtonText: {
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: '600' as const,
        },
      }
    : {};

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, webStyles.modalOverlay as any]}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.modalContent, webStyles.modalContent as any]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, webStyles.modalTitle as any]}>
              Add to Home Screen
            </Text>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.instructionsContainer}>
              <View style={styles.stepContainer}>
                <View style={[styles.stepNumber, webStyles.stepNumber as any]}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={[styles.stepText, webStyles.stepText as any]}>
                  Tap the <Text style={styles.boldText}>Share icon</Text> (square with arrow) in
                  Safari's toolbar at the bottom
                </Text>
              </View>

              <View style={styles.stepContainer}>
                <View style={[styles.stepNumber, webStyles.stepNumber as any]}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={[styles.stepText, webStyles.stepText as any]}>
                  Scroll down in the share menu and tap{' '}
                  <Text style={styles.boldText}>"Add to Home Screen"</Text>
                </Text>
              </View>

              <View style={styles.stepContainer}>
                <View style={[styles.stepNumber, webStyles.stepNumber as any]}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={[styles.stepText, webStyles.stepText as any]}>
                  Tap <Text style={styles.boldText}>"Add"</Text> in the top right corner
                </Text>
              </View>

              <View style={styles.noteContainer}>
                <Text style={[styles.noteText, webStyles.noteText as any]}>
                  This installs the app like a native app on your home screen. You can launch it
                  anytime without opening Safari.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, webStyles.modalFooter as any]}>
            <TouchableOpacity
              style={[styles.gotItButton, webStyles.gotItButton as any]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.gotItButtonText, webStyles.gotItButtonText as any]}>
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  instructionsContainer: {
    paddingVertical: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
    flex: 1,
  },
  boldText: {
    fontWeight: '600',
  },
  noteContainer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  noteText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  modalFooter: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  gotItButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  gotItButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
