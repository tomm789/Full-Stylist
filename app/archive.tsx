/**
 * Archive Screen
 * Displays archived outfits, lookbooks, and wardrobe items
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useArchivedOutfits } from '@/hooks/outfits';
import { useArchivedLookbooks } from '@/hooks/lookbooks';
import { useWardrobe, useArchivedWardrobeItems } from '@/hooks/wardrobe';
import { OutfitCard } from '@/components/outfits';
import ItemGrid from '@/components/wardrobe/ItemGrid';
import { Header, LoadingSpinner } from '@/components/shared';
import { HeaderIconButton } from '@/components/shared/layout';
import { DropdownMenuModal, DropdownMenuItem } from '@/components/shared/modals';
import PostGrid, { postGridStyles } from '@/components/social/PostGrid';
import { theme } from '@/styles';
import { restoreOutfit } from '@/lib/outfits';
import { restoreLookbook } from '@/lib/lookbooks';
import { restoreWardrobeItem } from '@/lib/wardrobe';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';
import type { ThemeColors } from '@/styles/themes';

const { spacing, typography } = theme;

type ArchiveTab = 'outfits' | 'lookbooks' | 'wardrobe';

export default function ArchiveScreen() {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const styles = createStyles(colors);
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ArchiveTab>('outfits');

  const [openOutfitId, setOpenOutfitId] = useState<string | null>(null);
  const [openLookbookId, setOpenLookbookId] = useState<string | null>(null);
  const [openWardrobeItemId, setOpenWardrobeItemId] = useState<string | null>(null);

  const outfitsState = useArchivedOutfits({ userId: user?.id });
  const lookbooksState = useArchivedLookbooks({ userId: user?.id });
  const { wardrobeId } = useWardrobe(user?.id);
  const wardrobeState = useArchivedWardrobeItems({ wardrobeId });

  const tabs = useMemo(
    () => [
      { key: 'outfits' as const, label: 'Outfits' },
      { key: 'lookbooks' as const, label: 'Lookbooks' },
      { key: 'wardrobe' as const, label: 'Wardrobe' },
    ],
    []
  );

  const handleRestoreOutfit = (outfitId: string) => {
    if (!user?.id) return;
    Alert.alert('Restore outfit', 'Move this outfit back to your outfits?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        onPress: async () => {
          setOpenOutfitId(null);
          const { error } = await restoreOutfit(user.id, outfitId);
          if (error) {
            if (Platform.OS === 'web') {
              alert(error?.message || 'Failed to restore outfit');
            } else {
              Alert.alert('Error', error?.message || 'Failed to restore outfit');
            }
            return;
          }
          if (Platform.OS === 'web') {
            alert('Outfit restored');
          } else {
            Alert.alert('Success', 'Outfit restored');
          }
          await outfitsState.refresh();
        },
      },
    ]);
  };

  const handleRestoreLookbook = (lookbookId: string) => {
    if (!user?.id) return;
    Alert.alert('Restore lookbook', 'Move this lookbook back to your lookbooks?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        onPress: async () => {
          setOpenLookbookId(null);
          const { error } = await restoreLookbook(user.id, lookbookId);
          if (error) {
            if (Platform.OS === 'web') {
              alert(error?.message || 'Failed to restore lookbook');
            } else {
              Alert.alert('Error', error?.message || 'Failed to restore lookbook');
            }
            return;
          }
          if (Platform.OS === 'web') {
            alert('Lookbook restored');
          } else {
            Alert.alert('Success', 'Lookbook restored');
          }
          await lookbooksState.refresh();
        },
      },
    ]);
  };

  const handleRestoreWardrobeItem = (itemId: string) => {
    if (!user?.id) return;
    Alert.alert('Restore item', 'Move this item back to your wardrobe?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        onPress: async () => {
          setOpenWardrobeItemId(null);
          const { error } = await restoreWardrobeItem(itemId, user.id);
          if (error) {
            if (Platform.OS === 'web') {
              alert(error?.message || 'Failed to restore item');
            } else {
              Alert.alert('Error', error?.message || 'Failed to restore item');
            }
            return;
          }
          if (Platform.OS === 'web') {
            alert('Item restored');
          } else {
            Alert.alert('Success', 'Item restored');
          }
          await wardrobeState.refresh();
        },
      },
    ]);
  };

  const renderOutfits = () => {
    if (outfitsState.loading && outfitsState.outfits.length === 0) {
      return (
        <View style={commonStyles.loadingContainer}>
          <LoadingSpinner text="Loading archive..." />
        </View>
      );
    }

    if (outfitsState.outfits.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No archived outfits</Text>
          <Text style={styles.emptyMessage}>
            Archive outfits from the menu on any outfit card.
          </Text>
        </View>
      );
    }

    return (
      <PostGrid
        data={outfitsState.outfits}
        keyExtractor={(item) => item.id}
        refreshing={outfitsState.refreshing}
        onRefresh={outfitsState.refresh}
        renderItem={({ item }) => {
          const imageUrl = outfitsState.imageCache.get(item.id) ?? null;
          const imageLoading = !outfitsState.imageCache.has(item.id);

          return (
            <OutfitCard
              outfit={item}
              imageUrl={imageUrl}
              imageLoading={imageLoading}
              onPress={() => router.push(`/outfits/${item.id}/view`)}
              onLongPress={() => setOpenOutfitId(item.id)}
            />
          );
        }}
      />
    );
  };

  const renderLookbooks = () => {
    if (lookbooksState.loading && lookbooksState.lookbooks.length === 0) {
      return (
        <View style={commonStyles.loadingContainer}>
          <LoadingSpinner text="Loading archive..." />
        </View>
      );
    }

    if (lookbooksState.lookbooks.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No archived lookbooks</Text>
          <Text style={styles.emptyMessage}>
            Archived lookbooks will appear here.
          </Text>
        </View>
      );
    }

    return (
      <PostGrid
        data={lookbooksState.lookbooks}
        keyExtractor={(item) => item.id}
        refreshing={lookbooksState.loading}
        onRefresh={lookbooksState.refresh}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={postGridStyles.gridItem}
            onPress={() => router.push(`/lookbooks/${item.id}`)}
            onLongPress={() => setOpenLookbookId(item.id)}
            delayLongPress={500}
            activeOpacity={0.8}
          >
            <View style={styles.lookbookThumbnail}>
              <Text style={styles.lookbookIcon}>📚</Text>
            </View>
            <View style={postGridStyles.infoOverlay}>
              <Text style={styles.lookbookTitle} numberOfLines={2}>
                {item.title || 'Untitled lookbook'}
              </Text>
              {item.description ? (
                <Text style={styles.lookbookDescription} numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
      />
    );
  };

  const renderWardrobe = () => {
    if (wardrobeState.loading && wardrobeState.items.length === 0) {
      return (
        <View style={commonStyles.loadingContainer}>
          <LoadingSpinner text="Loading archive..." />
        </View>
      );
    }

    return (
      <ItemGrid
        items={wardrobeState.items}
        imageCache={wardrobeState.imageCache}
        onItemPress={(item) => router.push(`/wardrobe/item/${item.id}`)}
        onItemLongPress={(item) => setOpenWardrobeItemId(item.id)}
        onRefresh={wardrobeState.refresh}
        refreshing={wardrobeState.refreshing}
        showFavorite={false}
        emptyTitle="No archived wardrobe items"
        emptyMessage="Archived wardrobe items will appear here."
        numColumns={3}
        style={styles.wardrobeGrid}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Archive"
        leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
      />

      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {activeTab === 'outfits' && renderOutfits()}
        {activeTab === 'lookbooks' && renderLookbooks()}
        {activeTab === 'wardrobe' && renderWardrobe()}
      </View>

      <DropdownMenuModal
        visible={openOutfitId !== null}
        onClose={() => setOpenOutfitId(null)}
        align="right"
      >
        <DropdownMenuItem
          label="Restore"
          icon="refresh-outline"
          onPress={() => openOutfitId && handleRestoreOutfit(openOutfitId)}
        />
        <DropdownMenuItem
          label="View"
          icon="eye-outline"
          onPress={() => {
            if (!openOutfitId) return;
            const targetId = openOutfitId;
            setOpenOutfitId(null);
            router.push(`/outfits/${targetId}/view`);
          }}
        />
      </DropdownMenuModal>

      <DropdownMenuModal
        visible={openLookbookId !== null}
        onClose={() => setOpenLookbookId(null)}
        align="right"
      >
        <DropdownMenuItem
          label="Restore"
          icon="refresh-outline"
          onPress={() => openLookbookId && handleRestoreLookbook(openLookbookId)}
        />
        <DropdownMenuItem
          label="View"
          icon="eye-outline"
          onPress={() => {
            if (!openLookbookId) return;
            const targetId = openLookbookId;
            setOpenLookbookId(null);
            router.push(`/lookbooks/${targetId}`);
          }}
        />
      </DropdownMenuModal>

      <DropdownMenuModal
        visible={openWardrobeItemId !== null}
        onClose={() => setOpenWardrobeItemId(null)}
        align="right"
      >
        <DropdownMenuItem
          label="Restore"
          icon="refresh-outline"
          onPress={() => openWardrobeItemId && handleRestoreWardrobeItem(openWardrobeItemId)}
        />
        <DropdownMenuItem
          label="View"
          icon="eye-outline"
          onPress={() => {
            if (!openWardrobeItemId) return;
            const targetId = openWardrobeItemId;
            setOpenWardrobeItemId(null);
            router.push(`/wardrobe/item/${targetId}`);
          }}
        />
      </DropdownMenuModal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.backgroundSecondary,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.semibold,
  },
  tabTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  lookbookThumbnail: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookbookIcon: {
    fontSize: 36,
  },
  lookbookTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  lookbookDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
    marginTop: spacing.xs,
  },
  wardrobeGrid: {
    flex: 1,
  },
});
