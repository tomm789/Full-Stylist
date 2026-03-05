/**
 * Calendar Error Boundary
 * Catches errors in calendar components and displays fallback UI
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/contexts/ThemeContext';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themeColors';

interface CalendarErrorBoundaryProps {
  children: React.ReactNode;
}

interface CalendarErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class CalendarErrorBoundary extends React.Component<
  CalendarErrorBoundaryProps,
  CalendarErrorBoundaryState
> {
  constructor(props: CalendarErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): CalendarErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Calendar] Error caught:', error);
    console.error('[Calendar] Error info:', errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <CalendarErrorFallback error={this.state.error} onReset={this.resetError} />;
    }

    return this.props.children;
  }
}

interface CalendarErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

export function CalendarErrorFallback({ error, onReset }: CalendarErrorFallbackProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
        </View>

        <Text style={styles.title}>Something went wrong</Text>

        <Text style={styles.description}>
          {error?.message || 'An unexpected error occurred while loading the calendar.'}
        </Text>

        {__DEV__ && error?.stack && (
          <View style={styles.stackTrace}>
            <Text style={styles.stackTraceText}>{error.stack}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={onReset}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    content: {
      alignItems: 'center',
      maxWidth: 320,
    },
    iconWrapper: {
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    description: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
      lineHeight: 20,
    },
    stackTrace: {
      backgroundColor: colors.backgroundTertiary,
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
      maxHeight: 150,
    },
    stackTraceText: {
      fontSize: 10,
      color: colors.textSecondary,
      fontFamily: 'monospace',
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      minWidth: 120,
    },
    buttonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
