/**
 * New Feedback Thread Screen (Refactored)
 * Create new feedback thread
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type Category = 'bug' | 'feature' | 'general' | 'other';

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'bug', label: 'Bug Report', icon: 'bug-outline' },
  { value: 'feature', label: 'Feature Request', icon: 'bulb-outline' },
  { value: 'general', label: 'General Feedback', icon: 'chatbubble-outline' },
  { value: 'other', label: 'Other', icon: 'help-circle-outline' },
];

export default function NewFeedbackScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [category, setCategory] = useState<Category>('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!body.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('feedback_threads')
        .insert({
          user_id: user.id,
          category: category,
          status: 'open',
          title: title.trim(),
          body: body.trim()
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        router.replace(`/feedback/${data.id}` as any);
      } else {
        router.back();
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      Alert.alert('Error', error.message || 'Failed to create feedback thread');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Feedback</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={styles.submitButton}
        >
          {submitting ? (
            <ActivityIndicator color="#007AFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryButton,
                  category === cat.value && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory(cat.value)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={24}
                  color={category === cat.value ? '#007AFF' : '#999'}
                />
                <Text
                  style={[
                    styles.categoryText,
                    category === cat.value && styles.categoryTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Brief summary of your feedback"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            editable={!submitting}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Body Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.bodyInput}
            placeholder="Provide details about your feedback..."
            value={body}
            onChangeText={setBody}
            maxLength={1000}
            multiline
            textAlignVertical="top"
            editable={!submitting}
          />
          <Text style={styles.charCount}>{body.length}/1000</Text>
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Tips for good feedback:</Text>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={16} color="#34c759" />
            <Text style={styles.tipText}>Be specific and descriptive</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={16} color="#34c759" />
            <Text style={styles.tipText}>
              Include steps to reproduce (for bugs)
            </Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={16} color="#34c759" />
            <Text style={styles.tipText}>Explain the use case (for features)</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  submitButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  categoryButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  categoryTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 200,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  tipsSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
});
