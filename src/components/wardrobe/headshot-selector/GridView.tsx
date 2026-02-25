/**
 * GridView — 3-column headshot selection grid.
 */

import React, { useMemo, useCallback } from 'react';
import { View, FlatList, TouchableOpacity } from 'react-native';
import { Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles, type Headshot } from './styles';

type GridViewProps = {
  headshots: Headshot[];
  currentHeadshotId: string | null;
  loading: boolean;
  onSelect: (headshot: Headshot) => void;
};

export function GridView({ headshots, currentHeadshotId, loading, onSelect }: GridViewProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const renderItem = useCallback(
    ({ item }: { item: Headshot }) => {
      const isActive = currentHeadshotId === item.id;
      return (
        <TouchableOpacity
          style={styles.gridItem}
          onPress={() => onSelect(item)}
          activeOpacity={0.85}
          disabled={loading}
        >
          {item.url ? (
            <Image source={{ uri: item.url }} style={styles.gridImage} contentFit="cover" />
          ) : (
            <View style={styles.gridImagePlaceholder}>
              <Ionicons name="image-outline" size={32} color={colors.textTertiary} />
            </View>
          )}
          {isActive && (
            <View style={styles.checkmarkBadge}>
              <Ionicons name="checkmark" size={16} color={colors.white} />
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [currentHeadshotId, loading, onSelect, colors, styles]
  );

  const keyExtractor = useCallback((item: Headshot) => item.id, []);

  return (
    <FlatList
      data={headshots}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={3}
      columnWrapperStyle={styles.columnWrapper}
      contentContainerStyle={styles.gridContent}
      scrollEnabled
      ListEmptyComponent={
        loading ? null : (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyStateText}>No headshots yet</Text>
            <Text style={styles.emptyStateSubtext}>Generate a headshot to get started</Text>
          </View>
        )
      }
    />
  );
}
