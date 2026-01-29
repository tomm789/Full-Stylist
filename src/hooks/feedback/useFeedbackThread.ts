/**
 * useFeedbackThread Hook
 * Load thread details, comments, and handle interactions
 */

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  getFeedbackThread,
  updateFeedbackThread,
  getFeedbackThreadComments,
  createFeedbackThreadComment,
  FeedbackThread,
} from '@/lib/feedback';
import { Comment } from '@/lib/engagement';

interface UseFeedbackThreadProps {
  threadId: string | undefined;
  userId: string | undefined;
}

interface UseFeedbackThreadReturn {
  thread: FeedbackThread | null;
  comments: Comment[];
  loading: boolean;
  submittingComment: boolean;
  refresh: () => Promise<void>;
  submitComment: (text: string) => Promise<boolean>;
  updateStatus: (
    status: 'open' | 'in_progress' | 'resolved' | 'closed'
  ) => Promise<void>;
}

export function useFeedbackThread({
  threadId,
  userId,
}: UseFeedbackThreadProps): UseFeedbackThreadReturn {
  const [thread, setThread] = useState<FeedbackThread | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadThread = async () => {
    if (!threadId) return;

    setLoading(true);

    const { data: threadData } = await getFeedbackThread(threadId);
    if (threadData) {
      setThread(threadData);
    }

    const { data: commentsData } = await getFeedbackThreadComments(threadId);
    if (commentsData) {
      setComments(commentsData);
    }

    setLoading(false);
  };

  const refresh = async () => {
    await loadThread();
  };

  const submitComment = async (text: string): Promise<boolean> => {
    if (!userId || !threadId || !text.trim()) return false;

    setSubmittingComment(true);

    try {
      const { data: comment, error } = await createFeedbackThreadComment(
        userId,
        threadId,
        text.trim()
      );

      if (error) throw error;

      if (comment) {
        setComments([comment, ...comments]);
        await loadThread();
        return true;
      }
      return false;
    } catch (error: any) {
      Alert.alert('Error', `Failed to post comment: ${error.message || error}`);
      return false;
    } finally {
      setSubmittingComment(false);
    }
  };

  const updateStatus = async (
    newStatus: 'open' | 'in_progress' | 'resolved' | 'closed'
  ) => {
    if (!userId || !thread || thread.user_id !== userId) return;

    try {
      const { data: updatedThread, error } = await updateFeedbackThread(
        userId,
        thread.id,
        { status: newStatus }
      );

      if (error) throw error;

      if (updatedThread) {
        setThread(updatedThread);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to update status: ${error.message || error}`);
    }
  };

  useEffect(() => {
    if (threadId && userId) {
      loadThread();
    }
  }, [threadId, userId]);

  return {
    thread,
    comments,
    loading,
    submittingComment,
    refresh,
    submitComment,
    updateStatus,
  };
}
