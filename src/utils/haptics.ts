import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

function noop() {}

const isNative = Platform.OS !== 'web';

export const haptics = {
  light: isNative
    ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(noop)
    : noop,
  medium: isNative
    ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(noop)
    : noop,
  heavy: isNative
    ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(noop)
    : noop,
  success: isNative
    ? () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(noop)
    : noop,
  warning: isNative
    ? () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(noop)
    : noop,
  error: isNative
    ? () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(noop)
    : noop,
  selection: isNative
    ? () => Haptics.selectionAsync().catch(noop)
    : noop,
};
