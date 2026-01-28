/**
 * Comments Modal Component
 * Modal for viewing and adding comments
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Comment, createComment, getComments, getCommentCount } from '@/lib/engagement';

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string | null;
  userId: string | undefined;
  comments: Comment[];
  onCommentsUpdate: (comments: Comment[]) => void;
  onCountUpdate: (count: number) => void;
}

export const CommentsModal = ({
  visible,
  onClose,
  postId,
  userId,
  comments,
  onCommentsUpdate,
  onCountUpdate,
}: CommentsModalProps) => {
  const [commentText, setCommentText] = useState('');

  const handleComment = async () => {
    if (!userId || !postId || !commentText.trim()) return;

    const { error } = await createComment(userId, 'post', postId, commentText.trim());
    if (!error) {
      setCommentText('');
      // Refresh comments
      const { data: updatedComments } = await getComments('post', postId);
      if (updatedComments) {
        onCommentsUpdate(updatedComments);
      }
      // Refresh counts
      const count = await getCommentCount('post', postId);
      onCountUpdate(count);
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
        <View style={styles.header}>
          <Text style={styles.title}>Comments</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.commentsList}>
          {comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet</Text>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Text style={styles.commentAuthor}>
                  {comment.user?.display_name || comment.user?.handle || 'User'}
                </Text>
                <Text style={styles.commentBody}>{comment.body}</Text>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleComment}
            disabled={!commentText.trim()}
          >
            <Text style={styles.sendText}>Post</Text>
          </TouchableOpacity>
        </View>
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
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  commentsList: {
    flex: 1,
    padding: 16,
  },
  commentItem: {
    marginBottom: 16,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  commentBody: {
    fontSize: 14,
    color: '#333',
  },
  noComments: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sendText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});
