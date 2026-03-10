/**
 * PrivacySettingsSection Component
 * Privacy-related settings section for account settings
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserSettings } from '@/lib/settings';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

type VisibilityValue = 'public' | 'followers' | 'private_link' | 'private' | 'inherit';

const ENTITY_TYPES = [
  { key: 'default_visibility_outfit' as const, label: 'Outfits', icon: 'shirt-outline' as const },
  { key: 'default_visibility_lookbook' as const, label: 'Lookbooks', icon: 'book-outline' as const },
  { key: 'default_visibility_headshot' as const, label: 'Headshots', icon: 'person-outline' as const },
  { key: 'default_visibility_wardrobe' as const, label: 'Wardrobe', icon: 'cube-outline' as const },
] as const;

const VISIBILITY_OPTIONS: { value: VisibilityValue; label: string }[] = [
  { value: 'inherit', label: 'Use default' },
  { value: 'public', label: 'Public' },
  { value: 'followers', label: 'Followers' },
  { value: 'private_link', label: 'Link only' },
  { value: 'private', label: 'Private' },
];

interface PrivacySettingsSectionProps {
  settings: UserSettings;
  saving: boolean;
  onUpdateSetting: <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => Promise<void>;
}

export function PrivacySettingsSection({
  settings,
  saving,
  onUpdateSetting,
}: PrivacySettingsSectionProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Privacy</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[
              styles.radioOption,
              settings.account_privacy === 'public' && styles.radioSelected,
            ]}
            onPress={() => onUpdateSetting('account_privacy', 'public')}
            disabled={saving}
          >
            <Text
              style={[
                styles.radioText,
                settings.account_privacy === 'public' && styles.radioTextSelected,
              ]}
            >
              Public
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.radioOption,
              settings.account_privacy === 'private' && styles.radioSelected,
            ]}
            onPress={() => onUpdateSetting('account_privacy', 'private')}
            disabled={saving}
          >
            <Text
              style={[
                styles.radioText,
                settings.account_privacy === 'private' && styles.radioTextSelected,
              ]}
            >
              Private
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Search Visibility</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[
              styles.radioOption,
              settings.search_visibility === 'visible' && styles.radioSelected,
            ]}
            onPress={() => onUpdateSetting('search_visibility', 'visible')}
            disabled={saving}
          >
            <Text
              style={[
                styles.radioText,
                settings.search_visibility === 'visible' && styles.radioTextSelected,
              ]}
            >
              Visible
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.radioOption,
              settings.search_visibility === 'hidden' && styles.radioSelected,
            ]}
            onPress={() => onUpdateSetting('search_visibility', 'hidden')}
            disabled={saving}
          >
            <Text
              style={[
                styles.radioText,
                settings.search_visibility === 'hidden' && styles.radioTextSelected,
              ]}
            >
              Hidden
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Default Visibility</Text>
        <View style={styles.optionsList}>
          {['public', 'followers', 'private_link', 'private'].map((visibility) => (
            <TouchableOpacity
              key={visibility}
              style={[
                styles.option,
                settings.default_visibility === visibility && styles.optionSelected,
              ]}
              onPress={() => onUpdateSetting('default_visibility', visibility as any)}
              disabled={saving}
            >
              <Text
                style={[
                  styles.optionText,
                  settings.default_visibility === visibility && styles.optionTextSelected,
                ]}
              >
                {visibility.charAt(0).toUpperCase() + visibility.slice(1).replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Per-Type Defaults</Text>
        <Text style={styles.sectionHint}>
          Override the default visibility for each content type. "Use default" falls back to your account default above.
        </Text>
        {ENTITY_TYPES.map(({ key, label, icon }) => {
          const current = (settings[key] as VisibilityValue) || 'inherit';
          return (
            <View key={key} style={styles.perTypeRow}>
              <View style={styles.perTypeLabel}>
                <Ionicons name={icon} size={18} color={colors.textSecondary} />
                <Text style={styles.perTypeLabelText}>{label}</Text>
              </View>
              <View style={styles.chipRow}>
                {VISIBILITY_OPTIONS.map(({ value, label: optLabel }) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.chip,
                      current === value && styles.chipSelected,
                    ]}
                    onPress={() => onUpdateSetting(key, value)}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        current === value && styles.chipTextSelected,
                      ]}
                    >
                      {optLabel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>External Sharing</Text>
        <TouchableOpacity
          style={styles.toggleContainer}
          onPress={() =>
            onUpdateSetting('allow_external_sharing', !settings.allow_external_sharing)
          }
          disabled={saving}
        >
          <Text style={styles.toggleLabel}>Allow external sharing</Text>
          <View
            style={[
              styles.toggle,
              settings.allow_external_sharing && styles.toggleActive,
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                settings.allow_external_sharing && styles.toggleThumbActive,
              ]}
            />
          </View>
        </TouchableOpacity>
      </View>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.textPrimary,
  },
  radioText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  radioTextSelected: {
    color: colors.background,
    fontWeight: '600',
  },
  optionsList: {
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  optionSelected: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.backgroundTertiary,
  },
  optionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  optionTextSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  sectionHint: {
    fontSize: 13,
    color: colors.textTertiary,
    marginBottom: 16,
    lineHeight: 18,
  },
  perTypeRow: {
    marginBottom: 16,
  },
  perTypeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  perTypeLabelText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.textPrimary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.background,
    fontWeight: '600' as const,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.textPrimary,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.background,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
});
