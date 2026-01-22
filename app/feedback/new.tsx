import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { createFeedbackThread } from '@/lib/feedback';

export default function NewFeedbackThreadScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<'bug' | 'feature' | 'general' | 'other'>('general');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a feedback thread');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your feedback');
      return;
    }

    if (!body.trim()) {
      Alert.alert('Error', 'Please enter a description for your feedback');
      return;
    }

    setSaving(true);

    try {
      const { data: thread, error } = await createFeedbackThread(user.id, {
        title: title.trim(),
        body: body.trim(),
        category: category,
      });

      if (error) {
        throw error;
      }

      if (thread?.id) {
        router.replace(`/feedback/${thread.id}`);
      } else {
        router.back();
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to create feedback thread: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  const categories: Array<{ value: 'bug' | 'feature' | 'general' | 'other'; label: string }> = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'general', label: 'General Feedback' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} disabled={saving}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Feedback</Text>
        <TouchableOpacity onPress={handleCreate} disabled={saving}>
          <Text style={[styles.createButton, saving && styles.createButtonDisabled]}>
            Create
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.titleInput}
          placeholder="Enter a title for your feedback"
          value={title}
          onChangeText={setTitle}
          editable={!saving}
          maxLength={200}
        />

        <Text style={styles.label}>Category *</Text>
        <View style={styles.categoryContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryButton,
                category === cat.value && styles.categoryButtonSelected,
              ]}
              onPress={() => setCategory(cat.value)}
              disabled={saving}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  category === cat.value && styles.categoryButtonTextSelected,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={styles.bodyInput}
          placeholder="Describe your feedback in detail..."
          value={body}
          onChangeText={setBody}
          editable={!saving}
          multiline
          numberOfLines={10}
          textAlignVertical="top"
        />
      </View>

      {saving && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  createButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  createButtonDisabled: {
    color: '#999',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 16,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 44,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  categoryButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryButtonTextSelected: {
    color: '#fff',
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 200,
    textAlignVertical: 'top',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
