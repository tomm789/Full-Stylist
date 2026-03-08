/**
 * ItemNavigation Component
 * Horizontal navigation bar for browsing between items
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { haptics } from '@/utils/haptics';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { GRID_IMAGE_PROPS } from '@/lib/images';

interface NavigationItem {
  id: string;
  title: string;
  imageUrl: string | null;
}

interface ItemNavigationProps {
  items: NavigationItem[];
  currentItemId: string | undefined;
  scrollRef: React.RefObject<ScrollView>;
  onNavigate: (itemId: string) => void;
}

const ITEM_WIDTH = 60;
const ITEM_GAP = 12;

export function ItemNavigation({
  items,
  currentItemId,
  scrollRef,
  onNavigate,
}: ItemNavigationProps) {
  const containerWidthRef = useRef(0);

  // Auto-scroll to keep the active thumbnail centered/visible
  useEffect(() => {
    if (!currentItemId || !scrollRef.current) return;
    const index = items.findIndex((item) => item.id === currentItemId);
    if (index < 0) return;
    const itemOffset = index * (ITEM_WIDTH + ITEM_GAP);
    const centered = itemOffset - containerWidthRef.current / 2 + ITEM_WIDTH / 2;
    scrollRef.current.scrollTo({ x: Math.max(0, centered), animated: true });
  }, [currentItemId, items, scrollRef]);

  if (items.length <= 1) return null;

  return (
    <BlurView
      intensity={50}
      tint="dark"
      style={styles.container}
      onLayout={(e) => {
        containerWidthRef.current = e.nativeEvent.layout.width;
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((navItem) => {
          const isActive = navItem.id === currentItemId;
          return (
            <TouchableOpacity
              key={navItem.id}
              style={[
                styles.item,
                isActive && styles.itemActive,
              ]}
              onPress={() => {
                if (!isActive) {
                  haptics.light();
                  onNavigate(navItem.id);
                }
              }}
            >
              {navItem.imageUrl ? (
                <Image
                  {...GRID_IMAGE_PROPS}
                  source={{ uri: navItem.imageUrl }}
                  style={styles.image}
                  recyclingKey={navItem.id}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>?</Text>
                </View>
              )}
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 12,
    paddingBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 12,
  },
  item: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemActive: {
    borderColor: '#fff',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#666',
    fontSize: 16,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#fff',
  },
});
