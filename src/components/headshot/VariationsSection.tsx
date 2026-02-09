import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import type { HeadshotGenerationVariation } from '@/lib/headshot/generation';
import { theme } from '@/styles';

const { spacing, borderRadius, typography } = theme;

interface VariationsSectionProps {
  variations: HeadshotGenerationVariation[];
  variationUrls: Map<string, string | null>;
  selectedVariationIds: string[];
  loadingHistory: boolean;
  onToggleSelection: (variationId: string) => void;
  onSaveSelected: () => void;
}

export default function VariationsSection({
  variations,
  variationUrls,
  selectedVariationIds,
  loadingHistory,
  onToggleSelection,
  onSaveSelected,
}: VariationsSectionProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.historySection}>
      <Text style={styles.sectionTitle}>Variations</Text>
      {loadingHistory ? (
        <View style={styles.historyLoading}>
          <ActivityIndicator color={colors.textSecondary} />
          <Text style={styles.historyLoadingText}>Loading variations...</Text>
        </View>
      ) : variations.length === 0 ? (
        <Text style={styles.historyEmptyText}>No variations yet.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.variationRow}
        >
          {variations.map((variation) => {
            const isSelected = selectedVariationIds.includes(variation.id);
            const imageUrl =
              variation.image_id ? variationUrls.get(variation.image_id) : null;
            return (
              <TouchableOpacity
                key={variation.id}
                style={[
                  styles.variationCard,
                  isSelected && styles.variationCardSelected,
                ]}
                onPress={() => onToggleSelection(variation.id)}
                activeOpacity={0.85}
              >
                {variation.status === 'failed' ? (
                  <View style={styles.variationPending}>
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                    <Text style={styles.variationStatusText}>Failed</Text>
                  </View>
                ) : variation.status !== 'complete' ? (
                  <View style={styles.variationPending}>
                    <ActivityIndicator color={colors.textSecondary} />
                    <Text style={styles.variationStatusText}>Generating</Text>
                  </View>
                ) : imageUrl ? (
                  <ExpoImage
                    source={{ uri: imageUrl }}
                    style={styles.variationImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.variationPending}>
                    <Text style={styles.variationStatusText}>Unavailable</Text>
                  </View>
                )}
                {variation.is_saved && (
                  <View style={styles.savedBadge}>
                    <Ionicons name="bookmark" size={14} color={colors.textLight} />
                    <Text style={styles.savedBadgeText}>Saved</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {selectedVariationIds.length > 0 && (
        <TouchableOpacity
          style={styles.saveButton}
          onPress={onSaveSelected}
        >
          <Ionicons name="bookmark-outline" size={18} color={colors.textLight} />
          <Text style={styles.saveButtonText}>
            Save Selected as Headshots ({selectedVariationIds.length})
          </Text>
        </TouchableOpacity>
      )}
    </View>
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
    historySection: {
      gap: spacing.md,
    },
    historyLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    historyLoadingText: {
      color: colors.textSecondary,
    },
    historyEmptyText: {
      color: colors.textSecondary,
    },
    variationRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingVertical: spacing.xs / 2,
    },
    variationCard: {
      width: 130,
      aspectRatio: 3 / 4,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: colors.gray100,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    variationCardSelected: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    variationImage: {
      width: '100%',
      height: '100%',
    },
    variationPending: {
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    variationStatusText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
    },
    savedBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.round,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs / 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs / 2,
    },
    savedBadgeText: {
      color: colors.textLight,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.black,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
    },
    saveButtonText: {
      color: colors.textLight,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
    },
  });
