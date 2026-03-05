import React from 'react';
import { View, Text as RNText, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MenuItem } from './FullScreenMenuModal';
import type { ThemeColors } from '@/styles/themeColors';
import { createStyles } from './FullScreenMenuModal.styles';

interface MenuGridProps {
  title: string;
  items: MenuItem[];
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}

export function MenuGrid({ title, items, styles, colors }: MenuGridProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      {!!title && <RNText style={styles.sectionTitle}>{title}</RNText>}
      <View style={styles.grid}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.gridCard}
            onPress={item.onPress}
            activeOpacity={0.85}
          >
            <View style={styles.gridIconWrap}>
              <Ionicons
                name={item.icon}
                size={20}
                color={item.tone === 'destructive' ? colors.error : colors.textPrimary}
              />
            </View>
            <RNText
              style={[
                styles.gridCardTitle,
                item.tone === 'destructive' && styles.cardTitleDestructive,
              ]}
            >
              {item.label}
            </RNText>
            {!!item.description && (
              <RNText style={styles.gridCardDescription}>{item.description}</RNText>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
