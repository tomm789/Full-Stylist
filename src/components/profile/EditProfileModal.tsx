/**
 * EditProfileModal Component
 * Modal for editing profile (handle, display name, avatar)
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  handle: string;
  displayName: string;
  headshotUrl: string | null;
  onHandleChange: (text: string) => void;
  onDisplayNameChange: (text: string) => void;
  onSave: () => void;
  onUploadAvatar: () => void;
  saving: boolean;
  uploadingAvatar: boolean;
}

export function EditProfileModal({
  visible,
  onClose,
  handle,
  displayName,
  headshotUrl,
  onHandleChange,
  onDisplayNameChange,
  onSave,
  onUploadAvatar,
  saving,
  uploadingAvatar,
}: EditProfileModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <TouchableOpacity
              style={styles.avatarEditButton}
              onPress={onUploadAvatar}
              disabled={uploadingAvatar}
            >
              {headshotUrl ? (
                <ExpoImage
                  source={{ uri: headshotUrl }}
                  style={styles.avatarEdit}
                  contentFit="cover"
                />
              ) : (
                <Ionicons name="person-circle-outline" size={100} color="#999" />
              )}
              {uploadingAvatar ? (
                <ActivityIndicator
                  style={styles.avatarLoader}
                  size="small"
                  color="#007AFF"
                />
              ) : (
                <View style={styles.avatarEditOverlay}>
                  <Ionicons name="camera" size={24} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Handle (username)</Text>
            <TextInput
              style={styles.input}
              placeholder="yourhandle"
              value={handle}
              onChangeText={onHandleChange}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
            />
            <Text style={styles.hint}>
              3-20 characters, letters, numbers, and underscores only
            </Text>

            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Name"
              value={displayName}
              onChangeText={onDisplayNameChange}
              editable={!saving}
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  modalBody: {
    padding: 20,
  },
  avatarEditButton: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  avatarEdit: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLoader: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
