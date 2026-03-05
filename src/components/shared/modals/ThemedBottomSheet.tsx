/**
 * ThemedBottomSheet
 * Gesture-driven bottom sheet modal wrapping @gorhom/bottom-sheet.
 * Drop-in replacement for the old Modal-based BottomSheet.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing } = theme;

interface ThemedBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  footerContent?: React.ReactNode;
  snapPoints?: (string | number)[];
  style?: ViewStyle;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    closeButton: {
      padding: spacing.xs,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.xl,
    },
    footer: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
  });

export default function ThemedBottomSheet({
  visible,
  onClose,
  title,
  children,
  headerRight,
  footerContent,
  snapPoints: snapPointsProp,
  style,
}: ThemedBottomSheetProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const snapPoints = useMemo(
    () => snapPointsProp ?? ['80%'],
    [snapPointsProp],
  );

  const bottomPadding = Math.max(spacing.xl, insets.bottom + spacing.sm);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: colors.gray400 }}
      backgroundStyle={{ backgroundColor: colors.background }}
      style={style}
    >
      {(title || headerRight) && (
        <View style={commonStyles.modalHeader}>
          {title && <Text style={commonStyles.modalTitle}>{title}</Text>}
          <View style={styles.headerRight}>
            {headerRight}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={colors.gray600} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={[styles.content, { paddingBottom: bottomPadding }]}>
        {children}
      </View>
      {footerContent && (
        <View style={[styles.footer, { paddingBottom: bottomPadding }]}>
          {footerContent}
        </View>
      )}
    </BottomSheetModal>
  );
}
