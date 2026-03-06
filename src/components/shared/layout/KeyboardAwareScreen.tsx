import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

let KBScrollView: React.ComponentType<any> = ScrollView;
try {
  const mod = require('react-native-keyboard-controller');
  if (mod?.KeyboardAwareScrollView) {
    KBScrollView = mod.KeyboardAwareScrollView;
  }
} catch {
  // Native module not available (Expo Go) — use ScrollView fallback
}

type KeyboardAwareScreenProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scrollViewStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
  dismissOnTap?: boolean;
  bottomSpacer?: number;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  keyboardDismissMode?: ScrollViewProps['keyboardDismissMode'];
};

export default function KeyboardAwareScreen({
  children,
  style,
  scrollViewStyle,
  contentContainerStyle,
  scrollEnabled = true,
  dismissOnTap = false,
  bottomSpacer = 0,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode = 'on-drag',
}: KeyboardAwareScreenProps) {
  const insets = useSafeAreaInsets();

  const scrollContent = scrollEnabled ? (
    <KBScrollView
      style={[styles.flex, scrollViewStyle]}
      contentContainerStyle={[
        contentContainerStyle,
        { paddingBottom: insets.bottom + bottomSpacer },
      ]}
      bottomOffset={80}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
    >
      {children}
    </KBScrollView>
  ) : (
    <View style={[styles.flex, contentContainerStyle, { paddingBottom: insets.bottom + bottomSpacer }]}>
      {children}
    </View>
  );

  // Wrap in KeyboardAvoidingView when using the ScrollView fallback
  const body = KBScrollView === ScrollView ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {scrollContent}
    </KeyboardAvoidingView>
  ) : (
    scrollContent
  );

  return (
    <View style={[styles.flex, style]}>
      {dismissOnTap ? (
        <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
          {body}
        </Pressable>
      ) : (
        body
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
