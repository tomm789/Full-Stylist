import React, { useCallback, useEffect, useRef } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  findNodeHandle,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useKeyboardInsets } from '@/hooks/ui/useKeyboardInsets';

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
  autoScrollToFocusedInput?: boolean;
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
  autoScrollToFocusedInput = true,
}: KeyboardAwareScreenProps) {
  const { bottomInset, keyboardVisible, keyboardTop } = useKeyboardInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollYRef = useRef(0);

  const ensureFocusedInputVisible = useCallback(() => {
    if (!scrollEnabled || !autoScrollToFocusedInput || !keyboardVisible) {
      return;
    }

    const state = TextInput.State as any;
    const focusedInput = state.currentlyFocusedInput?.();
    if (!focusedInput) {
      return;
    }

    const nativeHandle =
      typeof focusedInput === 'number'
        ? focusedInput
        : findNodeHandle(focusedInput);
    if (!nativeHandle) {
      return;
    }

    const responder = (scrollRef.current as any)?.getScrollResponder?.();
    if (typeof responder?.scrollResponderScrollNativeHandleToKeyboard === 'function') {
      responder.scrollResponderScrollNativeHandleToKeyboard(nativeHandle, 16, true);
      return;
    }

    const nodeWithMeasure = focusedInput as any;
    if (!nodeWithMeasure || typeof nodeWithMeasure.measureInWindow !== 'function') {
      return;
    }

    nodeWithMeasure.measureInWindow((_x: number, y: number, _w: number, height: number) => {
      const visibleBottom = keyboardTop - 16;
      const inputBottom = y + height;
      const overlap = inputBottom - visibleBottom;
      if (overlap <= 0) {
        return;
      }

      const nextY = Math.max(0, scrollYRef.current + overlap + 12);
      scrollRef.current?.scrollTo({ y: nextY, animated: true });
      scrollYRef.current = nextY;
    });
  }, [autoScrollToFocusedInput, keyboardTop, keyboardVisible, scrollEnabled]);

  useEffect(() => {
    if (!keyboardVisible || !autoScrollToFocusedInput || !scrollEnabled) {
      return;
    }

    const timeout = setTimeout(ensureFocusedInputVisible, 48);
    const interval = setInterval(ensureFocusedInputVisible, 180);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [autoScrollToFocusedInput, ensureFocusedInputVisible, keyboardVisible, scrollEnabled]);

  const body = scrollEnabled ? (
    <ScrollView
      ref={scrollRef}
      style={[styles.flex, scrollViewStyle]}
      contentContainerStyle={[
        contentContainerStyle,
        { paddingBottom: bottomInset + bottomSpacer },
      ]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
      onScroll={(event) => {
        scrollYRef.current = event.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
      onMomentumScrollEnd={ensureFocusedInputVisible}
      onScrollEndDrag={ensureFocusedInputVisible}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentContainerStyle, { paddingBottom: bottomInset + bottomSpacer }]}>
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
