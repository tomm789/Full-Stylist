/**
 * OutfitNavigation Component
 * Horizontal navigation bar for browsing between outfits
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Image } from 'expo-image';

interface NavigationOutfit {
  id: string;
  title: string;
  imageUrl: string | null;
}

interface OutfitNavigationProps {
  outfits: NavigationOutfit[];
  currentOutfitId: string | undefined;
  onNavigate: (outfitId: string) => void;
}

export function OutfitNavigation({
  outfits,
  currentOutfitId,
  onNavigate,
}: OutfitNavigationProps) {
  if (outfits.length <= 1) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {outfits.map((navOutfit) => {
          const isActive = navOutfit.id === currentOutfitId;
          return (
            <TouchableOpacity
              key={navOutfit.id}
              style={[styles.item, isActive && styles.itemActive]}
              onPress={() => !isActive && onNavigate(navOutfit.id)}
              disabled={isActive}
            >
              {navOutfit.imageUrl ? (
                <Image
                  source={{ uri: navOutfit.imageUrl }}
                  style={styles.image}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderText}>
                    {navOutfit.title?.charAt(0) || 'O'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
  },
  content: {
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
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
});
