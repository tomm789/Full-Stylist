/**
 * Feedback Thread Detail Screen (Refactored)
 * View and comment on feedback thread
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useFeedbackThread } from '@/hooks/feedback';
import { LoadingSpinner } from '@/components/shared';
import { formatDistanceToNow } from 'date-fns';

const STATUS_COLORS = {
  open: '#007AFF',
  in_progress: '#ff9500',
  resolved: '#34c759',
  closed: '#8e8e93',
};

const CATEGORY_COLORS = {
  bug: '#ff3b30',
  feature: '#007AFF',
  general: '#34c759',
  other: '#8e8e93',
};

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

  const isOwner = thread?.owner_user_id === user?.id;

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
        <Text style={styles.headerTitle}>Feedback</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
          {/* Thread Header */}
          <View style={styles.threadHeader}>
            <View style={styles.threadBadges}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: CATEGORY_COLORS[thread.category] + '20' },
                ]}
              >
                <Text
                  style={[styles.badgeText, { color: CATEGORY_COLORS[thread.category] }]}
                >
                  {thread.category}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: STATUS_COLORS[thread.status] + '20' },
                ]}
              >
                <Text style={[styles.badgeText, { color: STATUS_COLORS[thread.status] }]}>
                  {thread.status.replace('_', ' ')}
                </Text>
              </View>
            </View>

            <Text style={styles.threadTitle}>{thread.title}</Text>
            <Text style={styles.threadBody}>{thread.body}</Text>

            <View style={styles.threadMeta}>
              <Text style={styles.threadAuthor}>
                {thread.user?.display_name || thread.user?.handle || 'Unknown'}
              </Text>
              <Text style={styles.threadTime}>
                {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
              </Text>
            </View>

            {/* Status Changer (Owner Only) */}
            {isOwner && (
              <View style={styles.statusChanger}>
                <Text style={styles.statusLabel}>Change Status:</Text>
                <View style={styles.statusButtons}>
                  {(['open', 'in_progress', 'resolved', 'closed'] as const).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        thread.status === status && styles.statusButtonActive,
                        {
                          borderColor: STATUS_COLORS[status],
                          backgroundColor:
                            thread.status === status
                              ? STATUS_COLORS[status]
                              : 'transparent',
                        },
                      ]}
                      onPress={() => updateStatus(status)}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          thread.status === status && styles.statusButtonTextActive,
                          {
                            color:
                              thread.status === status ? '#fff' : STATUS_COLORS[status],
                          },
                        ]}
                      >
                        {status.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Comments */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              Comments ({comments.length})
            </Text>

            {comments.map((comment) => (
              <View key={comment.id} style={styles.comment}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>
                    {comment.user?.display_name || comment.user?.handle || 'Unknown'}
                  </Text>
                  <Text style={styles.commentTime}>
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                    })}
                  </Text>
                </View>
                <Text style={styles.commentBody}>{comment.body}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            value={commentBody}
            onChangeText={setCommentBody}
            multiline
            maxLength={500}
            editable={!submittingComment}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!commentBody.trim() || submittingComment) && styles.sendButtonDisabled,
            ]}
            onPress={handleSubmitComment}
            disabled={!commentBody.trim() || submittingComment}
          >
            {submittingComment ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
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
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
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
  threadHeader: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  threadBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  threadTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  threadBody: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
  },
  threadMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  threadAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  threadTime: {
    fontSize: 12,
    color: '#999',
  },
  statusChanger: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusButtonActive: {
    borderWidth: 0,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  commentsSection: {
    marginBottom: 80,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000',
  },
  comment: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  commentBody: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
