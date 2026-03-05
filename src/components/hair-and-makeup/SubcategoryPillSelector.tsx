/**
 * SubcategoryPillSelector
 * Horizontal scrolling pill row used for Accessories and Jewellery subcategory tabs.
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PillButton } from '@/components/shared';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles } from '@/styles/hairAndMakeupStyles';

type SubcategoryOption = { id: string; name: string };

type SubcategoryPillSelectorProps = {
  options: SubcategoryOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export default function SubcategoryPillSelector({
  options,
  selectedId,
  onSelect,
}: SubcategoryPillSelectorProps) {
  const colors = useThemeColors();
  const styles = StyleSheet.create(createStyles(colors));

  return (
    <View style={styles.categoryPills}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.categoryPillsRow}>
          {options.map((sub) => (
            <PillButton
              key={sub.id}
              label={sub.name}
              selected={selectedId === sub.id}
              onPress={() => onSelect(selectedId === sub.id ? null : sub.id)}
              size="medium"
              variant="default"
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
