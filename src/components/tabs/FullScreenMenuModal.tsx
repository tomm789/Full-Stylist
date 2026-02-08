/**
 * FullScreenMenuModal Component
 * Full-screen navigation menu with search and card-style links.
 * Header matches the standard tab header pattern:
 *   title - add new ----- search - notifications - close
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/contexts/NotificationsContext';
import { borderRadius, spacing, typography, shadows } from '@/styles/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

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
  onAdd?: () => void;
  gridTitle: string;
  gridItems: MenuItem[];
  actionItems: MenuItem[];
};

export function FullScreenMenuModal({
  visible,
  onClose,
  onAdd,
  gridTitle,
  gridItems,
  actionItems,
}: FullScreenMenuModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { unreadCount } = useNotifications();
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

  const handleSearch = () => {
    onClose();
    router.push('/search' as any);
  };

  const handleNotifications = () => {
    onClose();
    router.push('/notifications' as any);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header — matches Calendar page header layout */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <RNText style={styles.title}>Menu</RNText>
            {onAdd && (
              <TouchableOpacity style={styles.headerIcon} onPress={onAdd}>
                <Ionicons name="add-circle-outline" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIcon} onPress={handleSearch}>
              <Ionicons name="search-outline" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon} onPress={handleNotifications}>
              <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <RNText style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </RNText>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Inline menu search */}
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  headerIcon: {
    position: 'relative',
    padding: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.error,
    borderRadius: borderRadius.round,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    color: colors.textLight,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
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
