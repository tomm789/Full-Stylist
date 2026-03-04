import { StyleSheet } from 'react-native';
import type { ThemeColors } from '@/styles/themes';

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.gray200,
    marginRight: 12,
  },
  userText: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  handle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  previewGrid: {
    width: 84,
    height: 84,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 12,
  },
  previewImage: {
    width: 26,
    height: 26,
    margin: 1,
    borderRadius: 4,
    backgroundColor: colors.backgroundTertiary,
  },
  previewPlaceholder: {
    width: 26,
    height: 26,
    margin: 1,
    borderRadius: 4,
    backgroundColor: colors.backgroundTertiary,
  },
});
