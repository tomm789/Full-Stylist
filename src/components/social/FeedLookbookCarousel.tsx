/**
 * FeedLookbookCarousel Component
 * Carousel for lookbooks in feed
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing } = theme;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_WIDTH = Math.min(SCREEN_WIDTH, 630);

interface FeedLookbookCarouselProps {
  lookbook: any;
  lookbookImages: Map<string, any>;
  onPress: () => void;
  onPlayPress: () => void;
  loading?: boolean;
}

export default function FeedLookbookCarousel({
  lookbook,
  lookbookImages,
  onPress,
  onPlayPress,
  loading = false,
}: FeedLookbookCarouselProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const outfits = lookbookImages.get(`${lookbook.id}_outfits`) || [];

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / MAX_WIDTH);
    setCurrentIndex(index);
  };

  // Show loading spinner
  if (loading) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={styles.container}>
          <View style={styles.imagePlaceholder}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
          <Text style={styles.title}>{lookbook.title}</Text>
          {lookbook.description && (
            <Text style={styles.description}>{lookbook.description}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Render fallback if no outfits
  if (outfits.length === 0) {
    const thumbnailUrl = lookbookImages.get(lookbook.id);
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={styles.container}>
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.image}
              contentFit="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>📚</Text>
              <Text style={styles.placeholderSubtext}>Lookbook</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.playButton}
            onPress={(e) => {
              e.stopPropagation();
              onPlayPress();
            }}
          >
            <Text style={styles.playButtonText}>▶</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{lookbook.title}</Text>
          {lookbook.description && (
            <Text style={styles.description}>{lookbook.description}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Render carousel
  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.carousel}
        >
          {outfits.map((outfit: any) => {
            const imageUrl = lookbookImages.get(`${lookbook.id}_outfit_${outfit.id}`);
            return (
              <TouchableOpacity
                key={outfit.id}
                style={[styles.carouselItem, { width: MAX_WIDTH }]}
                onPress={onPress}
                activeOpacity={0.9}
              >
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Pagination Dots */}
        {outfits.length > 1 && (
          <View style={styles.paginationDots}>
            {outfits.map((_: any, index: number) => (
              <View
                key={index}
                style={[styles.paginationDot, index === currentIndex && styles.paginationDotActive]}
              />
            ))}
          </View>
        )}

        {/* Play Button */}
        <TouchableOpacity
          style={styles.playButton}
          onPress={(e) => {
            e.stopPropagation();
            onPlayPress();
          }}
        >
          <Text style={styles.playButtonText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Tappable title/description */}
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.title}>{lookbook.title}</Text>
        {lookbook.description && <Text style={styles.description}>{lookbook.description}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    padding: 0,
    backgroundColor: colors.white,
    borderRadius: 0,
    marginBottom: 0,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  carousel: {
    width: '100%',
  },
  carouselItem: {
    width: '100%',
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 0,
    marginBottom: 0,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 0,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  placeholderText: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  playButton: {
    position: 'absolute',
    top: spacing.sm + spacing.xs / 2,
    right: spacing.sm + spacing.xs / 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  playButtonText: {
    color: colors.white,
    fontSize: 18,
    marginLeft: 2,
  },
  paginationDots: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs + spacing.xs / 4,
    zIndex: 5,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: colors.white,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    paddingHorizontal: spacing.sm + spacing.xs / 2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs / 2,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm + spacing.xs / 2,
    paddingBottom: spacing.sm,
  },
});
