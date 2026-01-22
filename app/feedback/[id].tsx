import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import {
  getFeedbackThread,
  updateFeedbackThread,
  getFeedbackThreadComments,
  createFeedbackThreadComment,
  FeedbackThread,
} from '@/lib/feedback';
import { Comment } from '@/lib/engagement';

// Helper function to format timestamps
const formatTimestamp = (timestamp: string): string => {
  const now = new Date();
  const posted = new Date(timestamp);
  const diffMs = now.getTime() - posted.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (posted.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric';
  }
  return posted.toLocaleDateString('en-US', options);
};

const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'bug':
      return '#ff3b30';
    case 'feature':
      return '#007AFF';
    case 'general':
      return '#34c759';
    case 'other':
      return '#8e8e93';
    default:
      return '#8e8e93';
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'open':
      return '#007AFF';
    case 'in_progress':
      return '#ff9500';
    case 'resolved':
      return '#34c759';
    case 'closed':
      return '#8e8e93';
    default:
      return '#8e8e93';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'open':
      return 'Open';
    case 'in_progress':
      return 'In Progress';
    case 'resolved':
      return 'Resolved';
    case 'closed':
      return 'Closed';
    default:
      return status;
  }
};

export default function FeedbackThreadDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const threadId = params.id as string;

  const [thread, setThread] = useState<FeedbackThread | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  useEffect(() => {
    if (threadId && user) {
      loadThread();
    }
  }, [threadId, user]);

  const loadThread = async () => {
    if (!threadId) return;

    setLoading(true);
    const { data: threadData, error: threadError } = await getFeedbackThread(threadId);
    if (threadData) {
      setThread(threadData);
    }

    const { data: commentsData, error: commentsError } = await getFeedbackThreadComments(threadId);
    if (commentsData) {
      setComments(commentsData);
    }

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadThread();
    setRefreshing(false);
  };

  const handleSubmitComment = async () => {
    if (!user || !threadId || !commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const { data: comment, error } = await createFeedbackThreadComment(
        user.id,
        threadId,
        commentText.trim()
      );

      if (error) {
        throw error;
      }

      if (comment) {
        setComments([comment, ...comments]);
        setCommentText('');
        // Refresh thread to update comment count
        await loadThread();
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to post comment: ${error.message || error}`);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    if (!user || !thread || thread.user_id !== user.id) return;

    try {
      const { data: updatedThread, error } = await updateFeedbackThread(user.id, thread.id, {
        status: newStatus,
      });

      if (error) {
        throw error;
      }

      if (updatedThread) {
        setThread(updatedThread);
        setShowStatusPicker(false);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to update status: ${error.message || error}`);
    }
  };

  if (loading && !thread) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Feedback</Text>
          <View style={{ width: 24 }} />
        </View>
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      </View>
    );
  }

  if (!thread) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Feedback</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Thread not found</Text>
        </View>
      </View>
    );
  }

  const categoryColor = getCategoryColor(thread.category);
  const statusColor = getStatusColor(thread.status);
  const isOwner = user?.id === thread.user_id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback</Text>
        {isOwner && (
          <TouchableOpacity onPress={() => setShowStatusPicker(!showStatusPicker)}>
            <Ionicons name="options-outline" size={24} color="#000" />
          </TouchableOpacity>
        )}
        {!isOwner && <View style={{ width: 24 }} />}
      </View>

      {showStatusPicker && isOwner && (
        <View style={styles.statusPicker}>
          <Text style={styles.statusPickerTitle}>Update Status</Text>
          {(['open', 'in_progress', 'resolved', 'closed'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusOption,
                thread.status === status && styles.statusOptionActive,
              ]}
              onPress={() => handleUpdateStatus(status)}
            >
              <Text
                style={[
                  styles.statusOptionText,
                  thread.status === status && styles.statusOptionTextActive,
                ]}
              >
                {getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Thread Content */}
        <View style={styles.threadContainer}>
          <View style={styles.threadHeader}>
            <View style={styles.threadTitleRow}>
              <Text style={styles.threadTitle}>{thread.title}</Text>
              <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
                <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
                  {thread.category.charAt(0).toUpperCase() + thread.category.slice(1)}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {getStatusLabel(thread.status)}
              </Text>
            </View>
          </View>

          <Text style={styles.threadBody}>{thread.body}</Text>

          <View style={styles.threadMeta}>
            <Text style={styles.threadAuthor}>
              {thread.user?.display_name || thread.user?.handle || 'User'}
            </Text>
            <Text style={styles.threadTime}>{formatTimestamp(thread.created_at)}</Text>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>
              Comments ({comments.length})
            </Text>
          </View>

          {comments.length === 0 ? (
            <View style={styles.noCommentsContainer}>
              <Text style={styles.noCommentsText}>No comments yet</Text>
            </View>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>
                    {comment.user?.display_name || comment.user?.handle || 'User'}
                  </Text>
                  <Text style={styles.commentTime}>{formatTimestamp(comment.created_at)}</Text>
                </View>
                <Text style={styles.commentBody}>{comment.body}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          value={commentText}
          onChangeText={setCommentText}
          editable={!submittingComment}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.commentSubmitButton,
            (!commentText.trim() || submittingComment) && styles.commentSubmitButtonDisabled,
          ]}
          onPress={handleSubmitComment}
          disabled={!commentText.trim() || submittingComment}
        >
          {submittingComment ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.commentSubmitText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  statusPicker: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusPickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  statusOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statusOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusOptionText: {
    fontSize: 14,
    color: '#666',
  },
  statusOptionTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  threadContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  threadHeader: {
    marginBottom: 12,
  },
  threadTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  threadTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  threadBody: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
  },
  threadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  commentsSection: {
    padding: 16,
  },
  commentsHeader: {
    marginBottom: 16,
  },
  commentsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  noCommentsContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: 14,
    color: '#999',
  },
  commentItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    backgroundColor: '#f9f9f9',
  },
  commentSubmitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSubmitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  commentSubmitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
});
