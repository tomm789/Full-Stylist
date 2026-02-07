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
  headshotOptions: Array<{ id: string; url: string }>;
  selectedAvatarUrl: string | null;
  onHandleChange: (text: string) => void;
  onDisplayNameChange: (text: string) => void;
  onSelectAvatar: (url: string) => void;
  onClearAvatar: () => void;
  onCreateHeadshot: () => void;
  onSave: () => void;
  saving: boolean;
}

export function EditProfileModal({
  visible,
  onClose,
  handle,
  displayName,
  headshotUrl,
  headshotOptions,
  selectedAvatarUrl,
  onHandleChange,
  onDisplayNameChange,
  onSelectAvatar,
  onClearAvatar,
  onCreateHeadshot,
  onSave,
  saving,
}: EditProfileModalProps) {
  const avatarUrl = selectedAvatarUrl || headshotUrl;

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
            <View style={styles.avatarPreview}>
              {avatarUrl ? (
                <ExpoImage
                  source={{ uri: avatarUrl }}
                  style={styles.avatarEdit}
                  contentFit="cover"
                />
              ) : (
                <Ionicons name="person-circle-outline" size={100} color="#999" />
              )}
            </View>

            <Text style={styles.sectionLabel}>Profile Photo</Text>
            {avatarUrl && (
              <TouchableOpacity style={styles.clearButton} onPress={onClearAvatar}>
                <Text style={styles.clearButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.headshotRow}
            >
              {headshotOptions.map((headshot) => {
                const isSelected = headshot.url === avatarUrl;
                return (
                  <TouchableOpacity
                    key={headshot.id}
                    style={[styles.headshotCard, isSelected && styles.headshotCardSelected]}
                    onPress={() => onSelectAvatar(headshot.url)}
                  >
                    <ExpoImage
                      source={{ uri: headshot.url }}
                      style={styles.headshotImage}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.newHeadshotCard} onPress={onCreateHeadshot}>
                <Ionicons name="add" size={24} color="#007AFF" />
                <Text style={styles.newHeadshotText}>New</Text>
              </TouchableOpacity>
            </ScrollView>

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
  avatarPreview: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 16,
  },
  avatarEdit: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  clearButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ff3b30',
  },
  headshotRow: {
    gap: 12,
    paddingBottom: 8,
    marginBottom: 8,
  },
  headshotCard: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  headshotCardSelected: {
    borderColor: '#007AFF',
  },
  headshotImage: {
    width: '100%',
    height: '100%',
  },
  newHeadshotCard: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#f9f9f9',
  },
  newHeadshotText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
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
