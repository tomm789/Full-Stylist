/**
 * TextArea Component
 * Reusable multi-line text input
 */

import React from 'react';
import Input from './Input';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';

interface TextAreaProps extends React.ComponentProps<typeof Input> {
  rows?: number;
}

export default function TextArea({ rows = 3, style, ...props }: TextAreaProps) {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
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
