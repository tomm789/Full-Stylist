/**
 * NavigationSlider Component
 * Horizontal slider for navigating between items
 */

import React, { useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { ImagePlaceholder } from '@/components/shared';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, layout } = theme;

interface NavigationItem {
  id: string;
  title: string;
  imageUrl: string | null;
}

interface NavigationSliderProps {
  items: NavigationItem[];
  currentItemId: string;
  onNavigate: (itemId: string) => void;
  style?: ViewStyle;
}

export default function NavigationSlider({
  items,
  currentItemId,
  onNavigate,
  style,
}: NavigationSliderProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const scrollRef = useRef<ScrollView>(null);
  const currentIndex = items.findIndex((item) => item.id === currentItemId);

  useEffect(() => {
    // Auto-scroll to current item
    if (currentIndex >= 0 && scrollRef.current) {
      const itemWidth = layout.itemThumbnailSize + spacing.md;
      const scrollPosition = Math.max(
        0,
        currentIndex * itemWidth - 150 // Center approximately
      );

      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: scrollPosition, animated: true });
      }, 100);
    }
  }, [currentIndex]);

  if (items.length <= 1) return null;

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => {
          const isActive = item.id === currentItemId;

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.item, isActive && styles.itemActive]}
              onPress={() => !isActive && onNavigate(item.id)}
              activeOpacity={0.7}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.image}
                  contentFit="cover"
                />
              ) : (
                <ImagePlaceholder text="" iconSize={24} />
              )}
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  item: {
    width: layout.itemThumbnailSize,
    height: layout.itemThumbnailSize,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.transparent,
  },
  itemActive: {
    borderColor: colors.white,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.white,
  },
});
