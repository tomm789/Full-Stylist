/**
 * Lookbook Helper Utilities
 * Utility functions for lookbook operations
 */

import { Lookbook } from '@/lib/lookbooks';

/**
 * Get visibility label for display
 */
export function getVisibilityLabel(visibility: string): string {
  switch (visibility) {
    case 'public':
      return 'Public';
    case 'followers':
      return 'Followers';
    case 'private_link':
      return 'Private Link';
    default:
      return 'Private';
  }
}

/**
 * Check if lookbook is editable by user
 */
export function isLookbookEditable(
  lookbook: Lookbook | null,
  userId: string | undefined
): boolean {
  if (!lookbook || !userId) return false;
  return (
    lookbook.owner_user_id === userId && lookbook.type.startsWith('custom_')
  );
}

/**
 * Check if lookbook is a system lookbook
 */
export function isSystemLookbook(lookbookId: string | string[] | undefined): boolean {
  if (!lookbookId) return false;
  return typeof lookbookId === 'string' && lookbookId.startsWith('system-');
}
