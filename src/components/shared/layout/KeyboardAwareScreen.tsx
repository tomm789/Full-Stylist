import React from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

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

  const body = scrollEnabled ? (
    <KeyboardAwareScrollView
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
    </KeyboardAwareScrollView>
  ) : (
    <View style={[styles.flex, contentContainerStyle, { paddingBottom: insets.bottom + bottomSpacer }]}>
      {children}
    </View>
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
