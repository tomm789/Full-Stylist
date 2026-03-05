import { StyleSheet } from 'react-native';
import type { ThemeColors } from '@/styles/themeColors';

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sliderContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
});
