/**
 * FirstPostVisibilityModal
 * One-time modal shown after a user's first auto-post for each entity type.
 * Lets them set default visibility for the type and adjust the specific post.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';
import type { Visibility, EntityType } from '@/lib/posts';

const { spacing, borderRadius, typography } = theme;

type IoniconsName = keyof typeof Ionicons.glyphMap;

const VISIBILITY_OPTIONS: Array<{
  value: Exclude<Visibility, 'inherit'>;
  label: string;
  icon: IoniconsName;
  description: string;
}> = [
  { value: 'public', label: 'Public', icon: 'eye-outline', description: 'Anyone can see' },
  { value: 'followers', label: 'Followers', icon: 'people-outline', description: 'Followers only' },
  { value: 'private_link', label: 'Link Only', icon: 'link-outline', description: 'Only people with the link' },
  { value: 'private', label: 'Private', icon: 'eye-off-outline', description: 'Only you' },
];

const ENTITY_LABELS: Record<EntityType, string> = {
  outfit: 'outfit',
  lookbook: 'lookbook',
  headshot: 'headshot',
  wardrobe: 'wardrobe item',
};

interface FirstPostVisibilityModalProps {
  visible: boolean;
  entityType: EntityType;
  currentVisibility: Exclude<Visibility, 'inherit'>;
  defaultVisibility: Exclude<Visibility, 'inherit'>;
  onDone: (postVisibility: Exclude<Visibility, 'inherit'>, defaultVisibility: Exclude<Visibility, 'inherit'>) => void;
}

export function FirstPostVisibilityModal({
  visible,
  entityType,
  currentVisibility,
  defaultVisibility,
  onDone,
}: FirstPostVisibilityModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [postVis, setPostVis] = useState(currentVisibility);
  const [typeDefault, setTypeDefault] = useState(defaultVisibility);

  const entityLabel = ENTITY_LABELS[entityType];

  const handleDone = useCallback(() => {
    onDone(postVis, typeDefault);
  }, [onDone, postVis, typeDefault]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDone}>
      <Pressable style={styles.overlay} onPress={() => {}}>
        <Pressable style={styles.container} onPress={() => {}}>
          <Text style={styles.title}>Your {entityLabel} is on your feed</Text>
          <Text style={styles.subtitle}>
            Every {entityLabel} you save is automatically shared to your feed.
            Choose who can see it.
          </Text>

          {/* Default visibility for this type */}
          <Text style={styles.sectionLabel}>Default for all {entityLabel}s</Text>
          <View style={styles.optionsRow}>
            {VISIBILITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionChip,
                  typeDefault === opt.value && styles.optionChipActive,
                ]}
                onPress={() => {
                  setTypeDefault(opt.value);
                  // Sync post visibility when changing default (unless user already customised)
                  if (postVis === typeDefault) {
                    setPostVis(opt.value);
                  }
                }}
              >
                <Ionicons
                  name={opt.icon}
                  size={16}
                  color={typeDefault === opt.value ? colors.white : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    typeDefault === opt.value && styles.optionLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* This post's visibility */}
          <Text style={styles.sectionLabel}>This {entityLabel}</Text>
          <View style={styles.optionsRow}>
            {VISIBILITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionChip,
                  postVis === opt.value && styles.optionChipActive,
                ]}
                onPress={() => setPostVis(opt.value)}
              >
                <Ionicons
                  name={opt.icon}
                  size={16}
                  color={postVis === opt.value ? colors.white : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    postVis === opt.value && styles.optionLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Helper text */}
          <View style={styles.helpRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
            <Text style={styles.helpText}>
              Change visibility anytime with the{' '}
              <Ionicons name="eye-outline" size={13} color={colors.textTertiary} />{' '}
              icon in the header, or update defaults in Settings.
            </Text>
          </View>

          {/* Done button */}
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlayDark,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    container: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      width: '100%',
      maxWidth: 400,
    },
    title: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: typography.lineHeight.normal,
      marginBottom: spacing.lg,
    },
    sectionLabel: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },
    optionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.lg,
    },
    optionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.round,
      borderWidth: 1,
      borderColor: colors.gray300,
      backgroundColor: colors.white,
    },
    optionChipActive: {
      backgroundColor: colors.black,
      borderColor: colors.black,
    },
    optionLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
    },
    optionLabelActive: {
      color: colors.white,
    },
    helpRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.xs,
    },
    helpText: {
      flex: 1,
      fontSize: typography.fontSize.xs,
      color: colors.textTertiary,
      lineHeight: typography.lineHeight.tight,
    },
    doneButton: {
      paddingVertical: spacing.sm + 2,
      borderRadius: borderRadius.md,
      backgroundColor: colors.black,
      alignItems: 'center',
    },
    doneButtonText: {
      color: colors.white,
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.semibold,
    },
  });
