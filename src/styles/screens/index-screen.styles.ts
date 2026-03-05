import { StyleSheet } from 'react-native';
import type { ThemeColors } from '@/styles/themeColors';

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    color: colors.gray600,
    fontSize: 14,
    textAlign: 'center',
  },
  loadingText: {
    color: colors.gray600,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
