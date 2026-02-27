import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type KeyboardInsets = {
  keyboardVisible: boolean;
  keyboardHeight: number;
  keyboardTop: number;
  bottomInset: number;
};

export function useKeyboardInsets(): KeyboardInsets {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [keyboardTop, setKeyboardTop] = useState(screenHeight);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    setKeyboardTop(screenHeight);
  }, [screenHeight]);

  useEffect(() => {
    const setFromEvent = (event: any) => {
      const endY = event?.endCoordinates?.screenY;
      if (typeof endY === 'number') {
        setKeyboardTop(endY);
        setKeyboardVisible(endY < screenHeight);
        return;
      }

      const endHeight = event?.endCoordinates?.height;
      if (typeof endHeight === 'number') {
        const nextTop = Math.max(0, screenHeight - endHeight);
        setKeyboardTop(nextTop);
        setKeyboardVisible(endHeight > 0);
      }
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, setFromEvent);
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardTop(screenHeight);
      setKeyboardVisible(false);
    });

    const frameSub =
      Platform.OS === 'ios'
        ? Keyboard.addListener('keyboardWillChangeFrame', setFromEvent)
        : null;

    return () => {
      showSub.remove();
      hideSub.remove();
      frameSub?.remove();
    };
  }, [screenHeight]);

  return useMemo(() => {
    const keyboardHeight = Math.max(0, screenHeight - keyboardTop);
    const bottomInset = keyboardVisible
      ? Math.max(0, keyboardHeight - insets.bottom)
      : insets.bottom;

    return {
      keyboardVisible,
      keyboardHeight,
      keyboardTop,
      bottomInset,
    };
  }, [insets.bottom, keyboardTop, keyboardVisible, screenHeight]);
}
