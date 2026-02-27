/**
 * New Feedback Thread Screen (Refactored)
 * Create new feedback thread
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Header, HeaderActionButton, HeaderIconButton, KeyboardAwareScreen } from '@/components/shared/layout';
import { styles } from './new.styles';

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

  const isDirty =
    title.trim().length > 0 ||
    body.trim().length > 0 ||
    category !== 'general';

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
      <Header
        title="New Feedback"
        leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
        rightContent={
          isDirty ? (
            <HeaderActionButton
              label="Submit"
              onPress={handleSubmit}
              disabled={submitting}
              loading={submitting}
            />
          ) : null
        }
      />

      <KeyboardAwareScreen
        keyboardShouldPersistTaps="handled"
        dismissOnTap
        scrollViewStyle={styles.scrollContainer}
        contentContainerStyle={styles.content}
      >
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
            blurOnSubmit={false}
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
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}
