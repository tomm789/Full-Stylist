/**
 * CommentInput Component
 * Comment input for feedback threads
 */

import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CommentInputProps {
  commentBody: string;
  submittingComment: boolean;
  onCommentBodyChange: (text: string) => void;
  onSubmit: () => Promise<void>;
}

export function CommentInput({
  commentBody,
  submittingComment,
  onCommentBodyChange,
  onSubmit,
}: CommentInputProps) {
  return (
    <View style={styles.commentInputContainer}>
      <TextInput
        style={styles.commentInput}
        placeholder="Add a comment..."
        value={commentBody}
        onChangeText={onCommentBodyChange}
        multiline
        maxLength={500}
        editable={!submittingComment}
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          (!commentBody.trim() || submittingComment) && styles.sendButtonDisabled,
        ]}
        onPress={onSubmit}
        disabled={!commentBody.trim() || submittingComment}
      >
        {submittingComment ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name="send" size={20} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
