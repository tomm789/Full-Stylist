/**
 * ItemDetailSheet Component
 * Expandable bottom sheet for wardrobe item quick view → full detail.
 * Collapsed (~55%): preview image, title, description, action buttons.
 * Expanded (~95%): full carousel, attributes, tags, navigation rail.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useWardrobeItemDetail } from '@/hooks/wardrobe';
import {
  ItemImageCarousel,
  ItemAttributes,
  ItemNavigation,
} from '@/components/wardrobe';
import { DETAIL_IMAGE_PROPS } from '@/lib/images';
import {
  DropdownMenuModal,
  DropdownMenuItem,
} from '@/components/shared/modals';
import ImagePlaceholder from '@/components/shared/images/ImagePlaceholder';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themeColors';
import type { WardrobeItem } from '@/lib/wardrobe';

const { spacing, borderRadius, typography } = theme;
const SCREEN_WIDTH = Dimensions.get('window').width;
// Height of the ItemNavigation rail (paddingVertical 12 + paddingBottom 20 + item 60 + border 1)
const NAV_RAIL_HEIGHT = 93;

interface ItemDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  item: WardrobeItem | null;
  imageUrl: string | null;
  isOwner: boolean;
  itemIds: string[];
  imageCache: Map<string, string>;
  userId: string | undefined;
  onAddToOutfit?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onChangeItem?: (itemId: string) => void;
}

export default function ItemDetailSheet({
  visible,
  onClose,
  item,
  imageUrl,
  isOwner,
  itemIds,
  imageCache,
  userId,
  onAddToOutfit,
  onEdit,
  onDelete,
  onChangeItem,
}: ItemDetailSheetProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const snapPoints = useMemo(() => ['55%', '95%'], []);
  const screenWidth = useMemo(() => Math.min(SCREEN_WIDTH, 630), []);

  // Eagerly load full detail data whenever item changes
  const {
    item: fullItem,
    category,
    displayImages,
    activeImageId,
    attributes,
    tags,
    loading: detailLoading,
    isGeneratingProductShot,
  } = useWardrobeItemDetail({
    itemId: item?.id,
    userId,
  });

  // Use full data when available, fall back to preview props
  const displayItem = fullItem || item;
  const hasFullData = !!fullItem && !detailLoading;
  const hasMenuItems = isOwner && (onEdit || onDelete);

  // Navigation items for expanded mode
  const navigationItems = useMemo(() => {
    if (!itemIds.length) return [];
    return itemIds.map((id) => ({
      id,
      title: '',
      imageUrl: imageCache.get(id) || null,
    }));
  }, [itemIds, imageCache]);

  const navigationScrollRef = useRef<any>(null);

  // Present/dismiss the sheet
  useEffect(() => {
    if (visible && item) {
      setCurrentImageIndex(0);
      bottomSheetRef.current?.present();
    } else if (!visible) {
      setIsExpanded(false);
      bottomSheetRef.current?.close();
    }
  }, [visible, item?.id]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
        return;
      }
      setIsExpanded(index >= 1);
    },
    [onClose]
  );

  const handleDismiss = useCallback(() => {
    setIsExpanded(false);
    onClose();
  }, [onClose]);

  const handleExpandToggle = useCallback(() => {
    if (isExpanded) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.snapToIndex(1);
    }
  }, [isExpanded]);

  const handleNavigateItem = useCallback(
    (targetItemId: string) => {
      if (onChangeItem) {
        onChangeItem(targetItemId);
      }
    },
    [onChangeItem]
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  if (!item) return null;

  return (
    <>
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: colors.gray400 }}
      backgroundStyle={{
        backgroundColor: colors.background,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
      }}
      enablePanDownToClose
      enableDynamicSizing={false}
    >
      <View style={styles.sheetContent}>
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: isExpanded && navigationItems.length > 1
              ? NAV_RAIL_HEIGHT + insets.bottom
              : insets.bottom + spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          {onAddToOutfit && (
            <TouchableOpacity style={styles.addButton} onPress={onAddToOutfit}>
              <Ionicons name="add-circle" size={20} color={colors.white} />
              <Text style={styles.addButtonText}>Add to outfit</Text>
            </TouchableOpacity>
          )}

          <View style={styles.headerActions}>
            {isExpanded && isOwner && displayItem?.is_favorite !== undefined && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  /* favorite toggle handled by parent */
                }}
              >
                <Ionicons
                  name={displayItem.is_favorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={displayItem.is_favorite ? colors.favorite : colors.textPrimary}
                />
              </TouchableOpacity>
            )}

            {hasMenuItems ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowMenu(true)}
              >
                <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.actionButton} onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Image Section */}
        <View style={styles.imageSection}>
          {isExpanded && hasFullData && displayImages.length > 0 ? (
            <ItemImageCarousel
              key={activeImageId ?? 'carousel'}
              images={displayImages}
              currentScreenWidth={screenWidth}
              onImageIndexChange={setCurrentImageIndex}
              currentImageIndex={currentImageIndex}
            />
          ) : imageUrl ? (
            <Image
              {...DETAIL_IMAGE_PROPS}
              source={{ uri: imageUrl }}
              style={styles.previewImage}
              recyclingKey={item.id}
              contentFit="cover"
            />
          ) : (
            <ImagePlaceholder aspectRatio={1} />
          )}

          {isGeneratingProductShot && (
            <View style={styles.generatingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.generatingText}>Generating…</Text>
            </View>
          )}
        </View>

        {/* Details */}
        <View style={styles.details}>
          <Text style={styles.title}>{displayItem?.title || 'Untitled'}</Text>

          {displayItem?.brand && (
            <Text style={styles.brand}>{displayItem.brand}</Text>
          )}

          {isExpanded && category && (
            <Text style={styles.category}>{category.name}</Text>
          )}

          {displayItem?.description && (
            <Text style={styles.description} numberOfLines={isExpanded ? undefined : 3}>
              {displayItem.description}
            </Text>
          )}

          {/* Expanded: Attributes & Tags */}
          {isExpanded && hasFullData && displayItem && (
            <ItemAttributes attributes={attributes} tags={tags} item={displayItem} />
          )}

          {/* Expanded: Loading indicator for detail data */}
          {isExpanded && detailLoading && (
            <View style={styles.expandedLoading}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
          )}
        </View>
      </BottomSheetScrollView>

      {/* Expanded: Item Navigation Rail — pinned at bottom */}
      {isExpanded && navigationItems.length > 1 && (
        <View style={[styles.navRailContainer, { paddingBottom: insets.bottom }]}>
          <ItemNavigation
            items={navigationItems}
            currentItemId={item.id}
            scrollRef={navigationScrollRef}
            onNavigate={handleNavigateItem}
          />
        </View>
      )}
      </View>

    </BottomSheetModal>

    {/* Dropdown Menu — rendered outside BottomSheetModal portal to access ThemeProvider */}
    <DropdownMenuModal
      visible={showMenu}
      onClose={() => setShowMenu(false)}
      align="right"
      topOffset={120}
    >
      {onEdit && isOwner && (
        <DropdownMenuItem
          label="Edit"
          icon="create-outline"
          onPress={() => {
            setShowMenu(false);
            onEdit();
          }}
        />
      )}
      {onDelete && isOwner && (
        <DropdownMenuItem
          label="Delete"
          icon="trash-outline"
          danger
          onPress={() => {
            setShowMenu(false);
            onDelete();
          }}
        />
      )}
    </DropdownMenuModal>
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    sheetContent: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    navRailContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      gap: spacing.md,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      gap: spacing.xs,
    },
    addButtonText: {
      color: colors.white,
      fontWeight: typography.fontWeight.semibold,
      fontSize: typography.fontSize.md,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    actionButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    imageSection: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      position: 'relative',
    },
    previewImage: {
      width: '100%',
      height: 320,
      borderRadius: borderRadius.lg,
    },
    generatingOverlay: {
      ...StyleSheet.absoluteFillObject,
      marginHorizontal: spacing.lg,
      marginTop: spacing.lg,
      borderRadius: borderRadius.lg,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    generatingText: {
      color: '#fff',
      marginTop: spacing.sm,
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.medium,
    },
    details: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      gap: spacing.sm,
    },
    title: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
    },
    brand: {
      fontSize: typography.fontSize.md,
      color: colors.textSecondary,
    },
    category: {
      fontSize: typography.fontSize.md,
      color: colors.textSecondary,
    },
    description: {
      fontSize: typography.fontSize.md,
      color: colors.textSecondary,
      lineHeight: typography.lineHeight.normal,
    },
    expandedLoading: {
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
  });
