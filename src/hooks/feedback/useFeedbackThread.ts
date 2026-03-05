/**
 * useFeedbackThread Hook
 * Load thread details, comments, and handle interactions
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showErrorToast } from '@/utils/toast';
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

async function fetchThread(threadId: string) {
  const [{ data: threadData }, { data: commentsData }] = await Promise.all([
    getFeedbackThread(threadId),
    getFeedbackThreadComments(threadId),
  ]);

  return {
    thread: threadData ?? null,
    comments: commentsData ?? [],
  };
}

export function useFeedbackThread({
  threadId,
  userId,
}: UseFeedbackThreadProps): UseFeedbackThreadReturn {
  const queryClient = useQueryClient();
  const [submittingComment, setSubmittingComment] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['feedbackThread', threadId],
    queryFn: () => fetchThread(threadId!),
    enabled: !!threadId && !!userId,
    staleTime: 1000 * 60 * 2,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['feedbackThread', threadId] });
  }, [queryClient, threadId]);

  const submitComment = useCallback(async (text: string): Promise<boolean> => {
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
        await queryClient.invalidateQueries({ queryKey: ['feedbackThread', threadId] });
        return true;
      }
      return false;
    } catch (error: any) {
      showErrorToast(`Failed to post comment: ${error.message || error}`);
      return false;
    } finally {
      setSubmittingComment(false);
    }
  }, [userId, threadId, queryClient]);

  const updateStatus = useCallback(async (
    newStatus: 'open' | 'in_progress' | 'resolved' | 'closed'
  ) => {
    if (!userId || !data?.thread || data.thread.user_id !== userId) return;

    try {
      const { data: updatedThread, error } = await updateFeedbackThread(
        userId,
        data.thread.id,
        { status: newStatus }
      );

      if (error) throw error;

      if (updatedThread) {
        queryClient.setQueryData(['feedbackThread', threadId], {
          thread: updatedThread,
          comments: data.comments,
        });
      }
    } catch (error: any) {
      showErrorToast(`Failed to update status: ${error.message || error}`);
    }
  }, [userId, data, threadId, queryClient]);

  return {
    thread: data?.thread ?? null,
    comments: data?.comments ?? [],
    loading: isLoading,
    submittingComment,
    refresh,
    submitComment,
    updateStatus,
  };
}
