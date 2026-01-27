/**
 * TextArea Component
 * Reusable multi-line text input
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import Input from './Input';
import { theme, commonStyles } from '@/styles';

const { typography } = theme;

interface TextAreaProps extends React.ComponentProps<typeof Input> {
  rows?: number;
}

export default function TextArea({ rows = 3, style, ...props }: TextAreaProps) {
  const textAreaStyle = [
    commonStyles.textArea,
    { height: rows * 24 }, // Approximate line height
    style,
  ];

  return (
    <Input
      multiline
      numberOfLines={rows}
      textAlignVertical="top"
      style={textAreaStyle}
      {...props}
    />
  );
}

const styles = StyleSheet.create({});
