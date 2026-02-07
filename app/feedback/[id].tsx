/**
 * Feedback Thread Detail Screen (Refactored)
 * View and comment on feedback thread
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useFeedbackThread } from '@/hooks/feedback';
import { LoadingSpinner } from '@/components/shared';
import { commonStyles } from '@/styles';
import { CommentInput, ThreadHeader, CommentsList } from '@/components/feedback';
import { Header, HeaderIconButton } from '@/components/shared/layout';

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
    return (
      <View style={[styles.container, commonStyles.loadingContainer]}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!thread) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
      />

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
