import React from 'react';
import { View, Text as RNText, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MenuItem } from './FullScreenMenuModal';
import type { ThemeColors } from '@/styles/themeColors';
import { createStyles } from './FullScreenMenuModal.styles';

interface MenuActionListProps {
  items: MenuItem[];
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}

export function MenuActionList({ items, styles, colors }: MenuActionListProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.cardGroup}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.card}
            onPress={item.onPress}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconWrap}>
              <Ionicons
                name={item.icon}
                size={20}
                color={item.tone === 'destructive' ? colors.error : colors.textPrimary}
              />
            </View>
            <View style={styles.cardTextWrap}>
              <RNText
                style={[
                  styles.cardTitle,
                  item.tone === 'destructive' && styles.cardTitleDestructive,
                ]}
              >
                {item.label}
              </RNText>
              {!!item.description && (
                <RNText style={styles.cardDescription}>{item.description}</RNText>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
