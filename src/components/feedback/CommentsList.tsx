/**
 * CommentsList Component
 * List of comments for feedback thread
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { Comment } from '@/lib/engagement';

interface CommentsListProps {
  comments: Comment[];
}

export function CommentsList({ comments }: CommentsListProps) {
  return (
    <View style={styles.commentsSection}>
      <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>

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
  );
}

const styles = StyleSheet.create({
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
});
