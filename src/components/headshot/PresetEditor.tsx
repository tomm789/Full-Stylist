import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PillButton } from '@/components/shared';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import type { PresetCategory, PresetOption } from '@/lib/headshot/presetTypes';
import type { TabId } from '@/hooks/headshot';
import { theme } from '@/styles';

const { spacing, borderRadius, typography } = theme;

interface PresetEditorProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  presets: PresetCategory[];
  activeCategory: PresetCategory | null;
  activeCategoryId: string | null;
  onCategoryChange: (id: string) => void;
  selectedIds: string[];
  onToggleSelection: (optionId: string) => void;
  onInfoPress: (option: PresetOption) => void;
  customDescription: string;
  onCustomDescriptionChange: (text: string) => void;
}

export default function PresetEditor({
  activeTab,
  onTabChange,
  presets,
  activeCategory,
  activeCategoryId,
  onCategoryChange,
  selectedIds,
  onToggleSelection,
  onInfoPress,
  customDescription,
  onCustomDescriptionChange,
}: PresetEditorProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'hair' && styles.tabActive]}
          onPress={() => onTabChange('hair')}
        >
          <Ionicons
            name="cut-outline"
            size={20}
            color={activeTab === 'hair' ? colors.textPrimary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'hair' && styles.tabTextActive]}>
            Hair
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'makeup' && styles.tabActive]}
          onPress={() => onTabChange('makeup')}
        >
          <Ionicons
            name="color-palette-outline"
            size={20}
            color={activeTab === 'makeup' ? colors.textPrimary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'makeup' && styles.tabTextActive]}>
            Make-Up
          </Text>
        </TouchableOpacity>
      </View>

      {presets.length > 0 && (
        <View style={styles.categoryPills}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.categoryPillsRow}>
              {presets.map((category) => (
                <PillButton
                  key={category.id}
                  label={category.title}
                  selected={activeCategory?.id === category.id}
                  onPress={() => onCategoryChange(category.id)}
                  size="medium"
                  variant="default"
                />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {activeCategory && (
        <View style={styles.categoryCard}>
          {activeCategory.sections.map((section) => (
            <View key={section.id} style={styles.sectionBlock}>
              {activeCategory.sections.length > 1 && (
                <Text style={styles.sectionLabel}>{section.title}</Text>
              )}
              <View style={styles.pillRow}>
                {section.options.map((option) => {
                  const isSelected = selectedIds.includes(option.id);
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[styles.pill, isSelected && styles.pillSelected]}
                      onPress={() => onToggleSelection(option.id)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          isSelected && styles.pillTextSelected,
                        ]}
                      >
                        {option.title}
                      </Text>
                      <TouchableOpacity
                        style={styles.infoButton}
                        onPress={(event) => {
                          event.stopPropagation?.();
                          onInfoPress(option);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="information-circle-outline"
                          size={16}
                          color={isSelected ? colors.textLight : colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.customSection}>
        <Text style={styles.sectionTitle}>Custom Description</Text>
        <Text style={styles.customHint}>
          Add any extra details to combine with presets (optional).
        </Text>
        <TextInput
          style={styles.customInput}
          placeholder="e.g., soft glam with glossy lips, warm brown smoky eye"
          placeholderTextColor={colors.textTertiary}
          multiline
          value={customDescription}
          onChangeText={onCustomDescriptionChange}
        />
      </View>
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    sectionTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: colors.textPrimary,
    },
    tabText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.semibold,
    },
    categoryPills: {
      paddingVertical: spacing.xs,
    },
    categoryPillsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    categoryCard: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: spacing.lg,
      gap: spacing.md,
    },
    sectionBlock: {
      gap: spacing.sm,
    },
    sectionLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.round,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    pillSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pillText: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
    },
    pillTextSelected: {
      color: colors.textLight,
      fontWeight: typography.fontWeight.semibold,
    },
    infoButton: {
      paddingLeft: spacing.xs,
    },
    customSection: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    customHint: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
    },
    customInput: {
      minHeight: 90,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      fontSize: typography.fontSize.base,
      backgroundColor: colors.background,
      color: colors.textPrimary,
      textAlignVertical: 'top',
    },
  });
