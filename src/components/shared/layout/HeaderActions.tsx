/**
 * HeaderActions Component
 * Shared row layout for header right/left actions.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '@/styles';

const { spacing } = theme;

type HeaderActionsAlign = 'start' | 'center' | 'end';

interface HeaderActionsProps {
  children?: React.ReactNode;
  align?: HeaderActionsAlign;
  style?: ViewStyle;
}

export default function HeaderActions({
  children,
  align = 'end',
  style,
}: HeaderActionsProps) {
  return (
    <View style={[styles.base, alignStyles[align], style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

const alignStyles = StyleSheet.create({
  start: {
    justifyContent: 'flex-start',
  },
  center: {
    justifyContent: 'center',
  },
  end: {
    justifyContent: 'flex-end',
  },
});
