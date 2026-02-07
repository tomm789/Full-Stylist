/**
 * User module - exports all user-related functions
 * 
 * Usage:
 * import { getUserProfile, followUser, initializeUserProfile } from '@/lib/user';
 */

// Re-export from profile
export {
  getUserProfile,
  updateUserProfile,
  searchUsers,
  getFullUserProfile,
} from './profile';

// Re-export from follows
export {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
  getPendingFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
} from './follows';

// Re-export from initialization
export {
  initializeUserProfile,
  isUserProfileComplete,
} from './initialization';

// Re-export from deletion
export {
  deactivateAccount,
  reactivateAccount,
  getDeactivationStatus,
  deleteAccountPermanently,
} from './deletion';
