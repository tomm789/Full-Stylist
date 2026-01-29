/**
 * Feedback Thread Detail Screen (Refactored)
 * View and comment on feedback thread
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useFeedbackThread } from '@/hooks/feedback';
import { LoadingSpinner } from '@/components/shared';
import { CommentInput, ThreadHeader, CommentsList } from '@/components/feedback';

export default function FeedbackThreadDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: threadId } = useLocalSearchParams();
  const [commentBody, setCommentBody] = useState('');

  const {
    thread,
    comments,
    loading,
    submittingComment,
    submitComment,
    updateStatus,
  } = useFeedbackThread({
    threadId: threadId as string,
    userId: user?.id,
  });

  const handleSubmitComment = async () => {
    if (!commentBody.trim()) return;

    const success = await submitComment(commentBody.trim());
    if (success) {
      setCommentBody('');
    }
  };

  const isOwner = thread?.user_id === user?.id;

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!thread) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <View style={styles.backButton} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
          <ThreadHeader
            thread={thread}
            isOwner={isOwner}
            onStatusChange={updateStatus}
          />

          <CommentsList comments={comments} />
        </ScrollView>

        <CommentInput
          commentBody={commentBody}
          submittingComment={submittingComment}
          onCommentBodyChange={setCommentBody}
          onSubmit={handleSubmitComment}
        />
      </KeyboardAvoidingView>
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
    width: 40,
  },
  headerTitle: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
});
