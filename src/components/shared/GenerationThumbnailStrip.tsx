/**
 * GenerationThumbnailStrip
 * Horizontal scrollable strip of generation variation thumbnails.
 * Domain-agnostic — used by both outfit and headshot session navigation.
 *
 * Built from the OutfitNavigation.tsx pattern with additions for:
 *   - pending/failed state overlays
 *   - saved indicator
 *   - auto-scroll to active item
 *   - back/forward arrows
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/contexts/ThemeContext';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ThumbnailItem {
  id: string;
  imageUrl: string | null;
  isActive: boolean;
  isSaved: boolean;
  status: 'pending' | 'complete' | 'failed';
}

export interface GenerationThumbnailStripProps {
  items: ThumbnailItem[];
  onSelect: (id: string) => void;
  /** Optional back/forward navigation arrows flanking the strip. */
  canNavigateBack?: boolean;
  canNavigateForward?: boolean;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  /** Called when the save icon is pressed on a non-saved item. */
  onSavePress?: (id: string) => void;
  showSaveIndicator?: boolean;
  style?: ViewStyle;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function GenerationThumbnailStrip({
  items,
  onSelect,
  canNavigateBack,
  canNavigateForward,
  onNavigateBack,
  onNavigateForward,
  onSavePress,
  showSaveIndicator = false,
  style,
}: GenerationThumbnailStripProps) {
  const colors = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to the active item when it changes
  const activeIndex = items.findIndex((i) => i.isActive);
  useEffect(() => {
    if (activeIndex >= 0 && scrollRef.current) {
      const x = activeIndex * (THUMB_SIZE + THUMB_GAP);
      scrollRef.current.scrollTo({ x, animated: true });
    }
  }, [activeIndex]);

  const showArrows = Boolean(onNavigateBack && onNavigateForward);

  if (items.length === 0) return null;

  return (
    <View style={[styles.container, style]}>
      {showArrows && (
        <TouchableOpacity
          style={[styles.arrowButton, !canNavigateBack && styles.arrowDisabled]}
          onPress={onNavigateBack}
          disabled={!canNavigateBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={canNavigateBack ? colors.text : colors.textSecondary}
          />
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
      >
        {items.map((item) => (
          <Thumbnail
            key={item.id}
            item={item}
            onSelect={onSelect}
            onSavePress={onSavePress}
            showSaveIndicator={showSaveIndicator}
            activeColor={colors.primary}
            errorColor={colors.error}
          />
        ))}
      </ScrollView>

      {showArrows && (
        <TouchableOpacity
          style={[styles.arrowButton, !canNavigateForward && styles.arrowDisabled]}
          onPress={onNavigateForward}
          disabled={!canNavigateForward}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={canNavigateForward ? colors.text : colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Thumbnail sub-component ──────────────────────────────────────────────────

function Thumbnail({
  item,
  onSelect,
  onSavePress,
  showSaveIndicator,
  activeColor,
  errorColor,
}: {
  item: ThumbnailItem;
  onSelect: (id: string) => void;
  onSavePress?: (id: string) => void;
  showSaveIndicator: boolean;
  activeColor: string;
  errorColor: string;
}) {
  const handlePress = useCallback(() => {
    if (item.status === 'complete') onSelect(item.id);
  }, [item.id, item.status, onSelect]);

  const handleSavePress = useCallback(() => {
    onSavePress?.(item.id);
  }, [item.id, onSavePress]);

  return (
    <TouchableOpacity
      style={[
        styles.thumb,
        item.isActive && [styles.thumbActive, { borderColor: activeColor }],
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={item.status !== 'complete'}
    >
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.thumbImage}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={styles.thumbPlaceholder}>
          {item.status === 'pending' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="image-outline" size={18} color="#999" />
          )}
        </View>
      )}

      {/* Pending overlay */}
      {item.status === 'pending' && item.imageUrl && (
        <View style={styles.overlay}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}

      {/* Failed overlay */}
      {item.status === 'failed' && (
        <View style={[styles.overlay, { backgroundColor: 'rgba(255,0,0,0.4)' }]}>
          <Ionicons name="alert-circle" size={18} color="#fff" />
        </View>
      )}

      {/* Saved indicator */}
      {showSaveIndicator && item.isSaved && (
        <View style={styles.savedBadge}>
          <Ionicons name="checkmark-circle" size={14} color={activeColor} />
        </View>
      )}

      {/* Save button (for unsaved complete items) */}
      {showSaveIndicator &&
        !item.isSaved &&
        item.status === 'complete' &&
        onSavePress && (
          <TouchableOpacity
            style={styles.saveTouchable}
            onPress={handleSavePress}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Ionicons name="bookmark-outline" size={12} color="#fff" />
          </TouchableOpacity>
        )}
    </TouchableOpacity>
  );
}

// ── Constants & Styles ───────────────────────────────────────────────────────

const THUMB_SIZE = 52;
const THUMB_GAP = 8;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: THUMB_GAP,
  },
  arrowButton: {
    padding: 4,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbActive: {
    borderWidth: 2,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  saveTouchable: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    padding: 2,
  },
});
