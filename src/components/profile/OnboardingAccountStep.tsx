/**
 * OnboardingAccountStep Component (Improved)
 * Account setup step in onboarding - matches overall onboarding styling
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

interface OnboardingAccountStepProps {
  handle: string;
  displayName: string;
  accountPrivacy: 'public' | 'private';
  searchVisibility: 'visible' | 'hidden';
  loading: boolean;
  onHandleChange: (handle: string) => void;
  onDisplayNameChange: (displayName: string) => void;
  onAccountPrivacyChange: (privacy: 'public' | 'private') => void;
  onSearchVisibilityChange: (visibility: 'visible' | 'hidden') => void;
  onComplete: () => void;
}

export function OnboardingAccountStep({
  handle,
  displayName,
  accountPrivacy,
  searchVisibility,
  loading,
  onHandleChange,
  onDisplayNameChange,
  onAccountPrivacyChange,
  onSearchVisibilityChange,
  onComplete,
}: OnboardingAccountStepProps) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.stepIndicator}>Welcome</Text>
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>
            Set up your profile to get started with Full-Stylist
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Handle Field */}
          <View style={styles.field}>
            <Text style={styles.label}>Handle *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="at"
                size={20}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={handle}
                onChangeText={onHandleChange}
                placeholder="username"
                placeholderTextColor={colors.textPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
            <Text style={styles.hint}>
              3-20 characters, letters, numbers, and underscores only
            </Text>
          </View>

          {/* Display Name Field */}
          <View style={styles.field}>
            <Text style={styles.label}>Display Name *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={20}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={onDisplayNameChange}
                placeholder="Your name"
                placeholderTextColor={colors.textPlaceholder}
                editable={!loading}
              />
            </View>
          </View>

          {/* Account Privacy */}
          <View style={styles.field}>
            <Text style={styles.label}>Account Privacy</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  styles.segmentLeft,
                  accountPrivacy === 'public' && styles.segmentSelected,
                ]}
                onPress={() => onAccountPrivacyChange('public')}
                disabled={loading}
              >
                <Ionicons
                  name="globe-outline"
                  size={18}
                  color={accountPrivacy === 'public' ? colors.textLight : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.segmentText,
                    accountPrivacy === 'public' && styles.segmentTextSelected,
                  ]}
                >
                  Public
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segment,
                  styles.segmentRight,
                  accountPrivacy === 'private' && styles.segmentSelected,
                ]}
                onPress={() => onAccountPrivacyChange('private')}
                disabled={loading}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={accountPrivacy === 'private' ? colors.textLight : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.segmentText,
                    accountPrivacy === 'private' && styles.segmentTextSelected,
                  ]}
                >
                  Private
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              {accountPrivacy === 'public'
                ? 'Anyone can view your wardrobe and outfits'
                : 'Only approved followers can view your content'}
            </Text>
          </View>

          {/* Search Visibility */}
          <View style={styles.field}>
            <Text style={styles.label}>Search Visibility</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  styles.segmentLeft,
                  searchVisibility === 'visible' && styles.segmentSelected,
                ]}
                onPress={() => onSearchVisibilityChange('visible')}
                disabled={loading}
              >
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={searchVisibility === 'visible' ? colors.textLight : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.segmentText,
                    searchVisibility === 'visible' && styles.segmentTextSelected,
                  ]}
                >
                  Visible
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segment,
                  styles.segmentRight,
                  searchVisibility === 'hidden' && styles.segmentSelected,
                ]}
                onPress={() => onSearchVisibilityChange('hidden')}
                disabled={loading}
              >
                <Ionicons
                  name="eye-off-outline"
                  size={18}
                  color={searchVisibility === 'hidden' ? colors.textLight : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.segmentText,
                    searchVisibility === 'hidden' && styles.segmentTextSelected,
                  ]}
                >
                  Hidden
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              {searchVisibility === 'visible'
                ? 'Your profile will appear in search results'
                : 'Others can only find you via direct link'}
            </Text>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, loading && styles.continueButtonDisabled]}
            onPress={onComplete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textLight} />
            ) : (
              <>
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.textLight} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
  },
  headerSection: {
    marginBottom: spacing.xxxl,
  },
  stepIndicator: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  formSection: {
    gap: spacing.xxl,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.lg,
  },
  inputIcon: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  segmentLeft: {
    borderRightWidth: 0.5,
    borderRightColor: colors.borderLight,
  },
  segmentRight: {
    borderLeftWidth: 0.5,
    borderLeftColor: colors.borderLight,
  },
  segmentSelected: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  segmentTextSelected: {
    color: colors.textLight,
  },
  continueButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
