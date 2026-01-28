/**
 * EditLookbookModal Component
 * Modal for editing lookbook details (title, description, visibility)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type VisibilityType = 'public' | 'followers' | 'private_link' | 'private';

interface EditLookbookModalProps {
  visible: boolean;
  title: string;
  description: string;
  visibility: VisibilityType;
  outfitCount: number;
  onClose: () => void;
  onSave: (title: string, description: string, visibility: VisibilityType) => Promise<void>;
}

const VISIBILITY_OPTIONS: Array<{ value: VisibilityType; label: string }> = [
  { value: 'public', label: 'Public' },
  { value: 'followers', label: 'Followers' },
  { value: 'private_link', label: 'Private Link' },
  { value: 'private', label: 'Private' },
];

export const EditLookbookModal = ({
  visible,
  title: initialTitle,
  description: initialDescription,
  visibility: initialVisibility,
  outfitCount,
  onClose,
  onSave,
}: EditLookbookModalProps) => {
  const [editTitle, setEditTitle] = useState(initialTitle);
  const [editDescription, setEditDescription] = useState(initialDescription);
  const [editVisibility, setEditVisibility] = useState(initialVisibility);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setEditTitle(initialTitle);
      setEditDescription(initialDescription);
      setEditVisibility(initialVisibility);
    }
  }, [visible, initialTitle, initialDescription, initialVisibility]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editTitle, editDescription, editVisibility);
      onClose();
    } catch (error) {
      console.error('Error saving lookbook:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={saving}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Lookbook</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving || !editTitle.trim()}>
            {saving ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={[styles.saveButton, !editTitle.trim() && styles.saveButtonDisabled]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Enter lookbook title"
              editable={!saving}
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Enter description (optional)"
              multiline
              numberOfLines={4}
              editable={!saving}
            />
          </View>

          {/* Visibility */}
          <View style={styles.section}>
            <Text style={styles.label}>Visibility</Text>
            {VISIBILITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.visibilityOption,
                  editVisibility === option.value && styles.visibilityOptionSelected,
                ]}
                onPress={() => setEditVisibility(option.value)}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.visibilityLabel,
                    editVisibility === option.value && styles.visibilityLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {editVisibility === option.value && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Outfit Count */}
          <View style={styles.section}>
            <Text style={styles.label}>Outfits</Text>
            <Text style={styles.infoText}>{outfitCount} outfit(s) in this lookbook</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  saveButtonDisabled: {
    color: '#ccc',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  visibilityOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  visibilityLabel: {
    fontSize: 16,
    color: '#000',
  },
  visibilityLabelSelected: {
    fontWeight: '600',
    color: '#007AFF',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
});
