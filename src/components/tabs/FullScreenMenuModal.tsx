/**
 * FullScreenMenuModal Component
 * Full-screen navigation menu with search and card-style links
 */

import React, { useMemo, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, spacing, typography, shadows } from '@/styles/theme';

export type MenuItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  description?: string;
  tone?: 'default' | 'destructive';
  keywords?: string[];
};

type FullScreenMenuModalProps = {
  visible: boolean;
  onClose: () => void;
  gridTitle: string;
  gridItems: MenuItem[];
  actionItems: MenuItem[];
};

export function FullScreenMenuModal({
  visible,
  onClose,
  gridTitle,
  gridItems,
  actionItems,
}: FullScreenMenuModalProps) {
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLowerCase();

  const matchesQuery = (item: MenuItem) => {
    if (!normalizedQuery) return true;
    const haystack = [
      item.label,
      item.description || '',
      ...(item.keywords || []),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  };

  const filteredGridItems = useMemo(
    () => gridItems.filter(matchesQuery),
    [gridItems, normalizedQuery]
  );
  const filteredActionItems = useMemo(
    () => actionItems.filter(matchesQuery),
    [actionItems, normalizedQuery]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <RNText style={styles.title}>Menu</RNText>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search menu"
              placeholderTextColor={colors.textTertiary}
              style={styles.searchInput}
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>

          {filteredGridItems.length > 0 && (
            <View style={styles.section}>
              {!!gridTitle && <RNText style={styles.sectionTitle}>{gridTitle}</RNText>}
              <View style={styles.grid}>
                {filteredGridItems.map((item) => (
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
          )}

          {filteredActionItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.cardGroup}>
                {filteredActionItems.map((item) => (
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
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  cardGroup: {
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridCard: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.sm,
  },
  gridIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  gridCardDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardTextWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  cardTitleDestructive: {
    color: colors.error,
  },
  cardDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});
