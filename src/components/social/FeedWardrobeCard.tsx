/**
 * FeedWardrobeCard Component
 * Renders a wardrobe aggregate post as a horizontal carousel of item thumbnails.
 */

import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, borderRadius, typography } = theme;

interface WardrobeItemSummary {
  id: string;
  title: string;
  image_url?: string | null;
}

interface FeedWardrobeCardProps {
  items: WardrobeItemSummary[];
  caption?: string;
}

export default function FeedWardrobeCard({ items, caption }: FeedWardrobeCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  return (
    <View style={styles.container}>
      {caption && <Text style={styles.caption}>{caption}</Text>}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.itemCard}
            onPress={() => router.push(`/wardrobe/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.itemImagePlaceholder}>
              <Ionicons name="shirt-outline" size={28} color={colors.textTertiary} />
            </View>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {items.length > 3 && (
        <Text style={styles.countLabel}>
          {items.length} items
        </Text>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  caption: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  itemCard: {
    width: 100,
    alignItems: 'center',
  },
  itemImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    width: 100,
  },
  countLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
});
