/**
 * AIModelSection Component
 * AI model selection section for account settings
 */

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Switch } from 'react-native';
import PrimaryButton from '@/components/shared/buttons/PrimaryButton';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, borderRadius, typography } = theme;

interface AIModelSectionProps {
  aiModelPreference: string;
  saving: boolean;
  onModelSelection: (model: string, password?: string) => Promise<void>;
  includeHeadshot: boolean;
  onHeadshotToggle: (enabled: boolean, password: string) => Promise<void>;
  onOpenAISettings?: () => void;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: {
    marginBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  optionsList: {
    gap: spacing.sm,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  optionSelected: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.backgroundTertiary,
  },
  optionText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  optionTextSelected: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  optionSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  headshotToggleSection: {
    marginBottom: spacing.xxxl,
    paddingBottom: spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headshotToggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headshotToggleLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  headshotToggleTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginRight: spacing.sm,
  },
  betaBadge: {
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  betaBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  passwordContainer: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  passwordLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.sm,
    color: colors.gray800,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: 10,
    fontSize: typography.fontSize.md,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  passwordButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  passwordButton: {
    flex: 1,
    padding: 10,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  passwordButtonCancel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordButtonConfirm: {
    backgroundColor: colors.backgroundDark,
  },
  passwordButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  passwordButtonCancelText: {
    color: colors.gray800,
  },
  passwordButtonConfirmText: {
    color: colors.textLight,
  },
  advancedSettings: {
    marginTop: spacing.lg,
    alignItems: 'flex-start',
  },
});

export function AIModelSection({
  aiModelPreference,
  saving,
  onModelSelection,
  includeHeadshot,
  onHeadshotToggle,
  onOpenAISettings,
}: AIModelSectionProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');
  const [showModelPasswordInput, setShowModelPasswordInput] = useState(false);
  const [modelPassword, setModelPassword] = useState('');
  const [pendingModel, setPendingModel] = useState<string | null>(null);

  const handleTogglePress = () => {
    if (!includeHeadshot) {
      // Enabling - require password
      setShowPasswordInput(true);
    } else {
      // Disabling - also require password
      setShowPasswordInput(true);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      return;
    }
    const newValue = !includeHeadshot;
    await onHeadshotToggle(newValue, password);
    setPassword('');
    setShowPasswordInput(false);
  };

  const handlePasswordCancel = () => {
    setPassword('');
    setShowPasswordInput(false);
  };

  const handleModelPress = (model: string) => {
    // If selecting Pro model and not already selected, require password
    if (model === 'gemini-3-pro-image-preview' && aiModelPreference !== 'gemini-3-pro-image-preview') {
      setPendingModel(model);
      setShowModelPasswordInput(true);
    } else {
      // Standard model or already selected Pro model - no password needed
      onModelSelection(model);
    }
  };

  const handleModelPasswordSubmit = async () => {
    if (!modelPassword.trim() || !pendingModel) {
      return;
    }
    await onModelSelection(pendingModel, modelPassword);
    setModelPassword('');
    setShowModelPasswordInput(false);
    setPendingModel(null);
  };

  const handleModelPasswordCancel = () => {
    setModelPassword('');
    setShowModelPasswordInput(false);
    setPendingModel(null);
  };

  return (
    <View style={styles.section}>
      {/* Headshot Toggle - Above AI Model Selection */}
      <View style={styles.headshotToggleSection}>
        <View style={styles.headshotToggleHeader}>
          <View style={styles.headshotToggleLabelContainer}>
            <Text style={styles.headshotToggleTitle}>Include Headshot in Generation</Text>
            <View style={styles.betaBadge}>
              <Text style={styles.betaBadgeText}>Beta</Text>
            </View>
          </View>
          <Switch
            value={includeHeadshot}
            onValueChange={handleTogglePress}
            disabled={saving || showPasswordInput}
          />
        </View>
        <Text style={styles.hint}>
          When enabled, your headshot will be included in outfit generation. Password required to change.
        </Text>

        {showPasswordInput && (
          <View style={styles.passwordContainer}>
            <Text style={styles.passwordLabel}>Enter Password</Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              blurOnSubmit
            />
            <View style={styles.passwordButtons}>
              <TouchableOpacity
                style={[styles.passwordButton, styles.passwordButtonCancel]}
                onPress={handlePasswordCancel}
                disabled={saving}
              >
                <Text style={[styles.passwordButtonText, styles.passwordButtonCancelText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.passwordButton, styles.passwordButtonConfirm]}
                onPress={handlePasswordSubmit}
                disabled={saving || !password.trim()}
              >
                <Text style={[styles.passwordButtonText, styles.passwordButtonConfirmText]}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>AI Model Selection</Text>
      <Text style={styles.hint}>
        Choose the AI model for outfit generation. Advanced models require a password.
      </Text>

      <View style={styles.optionsList}>
        <TouchableOpacity
          style={[
            styles.option,
            aiModelPreference === 'gemini-2.5-flash-image' && styles.optionSelected,
          ]}
          onPress={() => handleModelPress('gemini-2.5-flash-image')}
          disabled={saving || showModelPasswordInput}
        >
          <Text
            style={[
              styles.optionText,
              aiModelPreference === 'gemini-2.5-flash-image' && styles.optionTextSelected,
            ]}
          >
            Standard (gemini-2.5-flash-image)
          </Text>
          <Text style={styles.optionSubtext}>Up to 2 items, always available</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.option,
            aiModelPreference === 'gemini-3-pro-image-preview' && styles.optionSelected,
          ]}
          onPress={() => handleModelPress('gemini-3-pro-image-preview')}
          disabled={saving || showModelPasswordInput}
        >
          <Text
            style={[
              styles.optionText,
              aiModelPreference === 'gemini-3-pro-image-preview' && styles.optionTextSelected,
            ]}
          >
            Pro (gemini-3-pro-image-preview)
          </Text>
          <Text style={styles.optionSubtext}>Up to 7 items, password required</Text>
        </TouchableOpacity>

        {showModelPasswordInput && (
          <View style={styles.passwordContainer}>
            <Text style={styles.passwordLabel}>Enter Password for Pro Model</Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              value={modelPassword}
              onChangeText={setModelPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              blurOnSubmit
            />
            <View style={styles.passwordButtons}>
              <TouchableOpacity
                style={[styles.passwordButton, styles.passwordButtonCancel]}
                onPress={handleModelPasswordCancel}
                disabled={saving}
              >
                <Text style={[styles.passwordButtonText, styles.passwordButtonCancelText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.passwordButton, styles.passwordButtonConfirm]}
                onPress={handleModelPasswordSubmit}
                disabled={saving || !modelPassword.trim()}
              >
                <Text style={[styles.passwordButtonText, styles.passwordButtonConfirmText]}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {onOpenAISettings && (
        <View style={styles.advancedSettings}>
          <PrimaryButton
            title="AI Settings"
            variant="outline"
            size="small"
            onPress={onOpenAISettings}
            disabled={saving}
          />
        </View>
      )}
    </View>
  );
}
