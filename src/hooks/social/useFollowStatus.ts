/**
 * useFollowStatus Hook
 * Manage follow/unfollow state for a user
 */

import { useState, useEffect } from 'react';
import { followUser, unfollowUser, isFollowing } from '@/lib/user';

interface UseFollowStatusProps {
  currentUserId: string | undefined;
  targetUserId: string | undefined;
}

interface UseFollowStatusReturn {
  isFollowing: boolean;
  status: string | null;
  loading: boolean;
  follow: () => Promise<void>;
  unfollow: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useFollowStatus({
  currentUserId,
  targetUserId,
}: UseFollowStatusProps): UseFollowStatusReturn {
  const [followState, setFollowState] = useState<{
    isFollowing: boolean;
    status: string | null;
  }>({ isFollowing: false, status: null });
  const [loading, setLoading] = useState(false);

  const checkFollowStatus = async () => {
    if (!currentUserId || !targetUserId) return;

    try {
      const result = await isFollowing(currentUserId, targetUserId);
      setFollowState(result);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const follow = async () => {
    if (!currentUserId || !targetUserId) return;

    setLoading(true);
    try {
      const { error } = await followUser(currentUserId, targetUserId);
      if (!error) {
        setFollowState({ isFollowing: true, status: 'requested' });
        // Re-check to get actual status
        await checkFollowStatus();
      }
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setLoading(false);
    }
  };

  const unfollow = async () => {
    if (!currentUserId || !targetUserId) return;

    setLoading(true);
    try {
      const { error } = await unfollowUser(currentUserId, targetUserId);
      if (!error) {
        setFollowState({ isFollowing: false, status: null });
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await checkFollowStatus();
  };

  useEffect(() => {
    checkFollowStatus();
  }, [currentUserId, targetUserId]);

  return {
    isFollowing: followState.isFollowing,
    status: followState.status,
    loading,
    follow,
    unfollow,
    refresh,
  };
}
