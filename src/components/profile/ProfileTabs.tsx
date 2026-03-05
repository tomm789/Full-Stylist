/**
 * ProfileTabs Component
 * Tab navigation for headshots and bodyshots
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import PostGrid, { postGridStyles } from '@/components/social/PostGrid';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, typography } = theme;

type TabType = 'headshots' | 'bodyshots';

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.transparent,
  },
  tabActive: {
    borderBottomColor: colors.textPrimary,
  },
  tabText: {
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
    fontWeight: typography.fontWeight.medium,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  tabContent: {
    backgroundColor: colors.background,
    minHeight: 400,
  },
  uploadCard: {
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  uploadCardText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  headshotImages: Array<{ id: string; url: string }>;
  bodyShotImages: Array<{ id: string; url: string }>;
  onHeadshotPress: (id: string) => void;
  onBodyShotPress: (id: string) => void;
  onNewHeadshot: () => void;
  onNewBodyShot: () => void;
}

export function ProfileTabs({
  activeTab,
  onTabChange,
  headshotImages,
  bodyShotImages,
  onHeadshotPress,
  onBodyShotPress,
  onNewHeadshot,
  onNewBodyShot,
}: ProfileTabsProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const renderTabBar = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'headshots' && styles.tabActive]}
        onPress={() => onTabChange('headshots')}
      >
        <Ionicons
          name="person-outline"
          size={24}
          color={activeTab === 'headshots' ? colors.textPrimary : colors.textTertiary}
        />
        <Text style={[styles.tabText, activeTab === 'headshots' && styles.tabTextActive]}>
          Headshots
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'bodyshots' && styles.tabActive]}
        onPress={() => onTabChange('bodyshots')}
      >
        <Ionicons
          name="body-outline"
          size={24}
          color={activeTab === 'bodyshots' ? colors.textPrimary : colors.textTertiary}
        />
        <Text style={[styles.tabText, activeTab === 'bodyshots' && styles.tabTextActive]}>
          Body Shots
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'headshots':
        return (
          <PostGrid
            data={[{ id: 'new' }, ...headshotImages]}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              if (item.id === 'new') {
                return (
                  <TouchableOpacity
                    style={[postGridStyles.gridItem, styles.uploadCard]}
                    onPress={onNewHeadshot}
                  >
                    <View style={styles.uploadCardContent}>
                      <Ionicons name="add-circle-outline" size={48} color={colors.primary} />
                      <Text style={styles.uploadCardText}>New Headshot</Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              const img = item as { id: string; url: string };
              return (
                <TouchableOpacity
                  style={postGridStyles.gridItem}
                  onPress={() => onHeadshotPress(img.id)}
                >
                  <ExpoImage
                    source={{ uri: img.url }}
                    style={postGridStyles.gridImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                    recyclingKey={img.id}
                  />
                </TouchableOpacity>
              );
            }}
          />
        );

      case 'bodyshots':
        return (
          <PostGrid
            data={[{ id: 'new' }, ...bodyShotImages]}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              if (item.id === 'new') {
                return (
                  <TouchableOpacity
                    style={[postGridStyles.gridItem, styles.uploadCard]}
                    onPress={onNewBodyShot}
                  >
                    <View style={styles.uploadCardContent}>
                      <Ionicons name="add-circle-outline" size={48} color={colors.primary} />
                      <Text style={styles.uploadCardText}>New Body Shot</Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              const img = item as { id: string; url: string };
              return (
                <TouchableOpacity
                  style={postGridStyles.gridItem}
                  onPress={() => onBodyShotPress(img.id)}
                >
                  <ExpoImage
                    source={{ uri: img.url }}
                    style={postGridStyles.gridImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                    recyclingKey={img.id}
                  />
                </TouchableOpacity>
              );
            }}
          />
        );
    }
  };

  return (
    <>
      {renderTabBar()}
      <View style={styles.tabContent}>{renderContent()}</View>
    </>
  );
}
