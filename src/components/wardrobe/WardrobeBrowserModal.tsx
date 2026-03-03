import React, { useCallback, useMemo } from 'react';
import {
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/contexts/ThemeContext';
import { WardrobeItem } from '@/lib/wardrobe';
import { LoadingSpinner } from '@/components/shared';
import { useWardrobeBrowser } from '@/hooks/wardrobe/useWardrobeBrowser';
import ItemGrid from './ItemGrid';
import BrowserCategoryBar from './BrowserCategoryBar';
import { createStyles } from './WardrobeBrowserModal.styles';

interface WardrobeBrowserModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called when the user taps an item */
  onSelectItem: (item: WardrobeItem) => void;
  /** Wardrobe to browse */
  wardrobeId: string | null;
  /** Current user ID */
  userId: string | null;
  /** Optional: open with this category pre-selected */
  initialCategoryId?: string | null;
  /** Optional: highlight these items as already selected */
  selectedItemIds?: string[];
  /** Optional: modal title (defaults to "Browse Wardrobe") */
  title?: string;
}

export default function WardrobeBrowserModal({
  visible,
  onClose,
  onSelectItem,
  wardrobeId,
  userId,
  initialCategoryId = null,
  selectedItemIds = [],
  title = 'Browse Wardrobe',
}: WardrobeBrowserModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    categories,
    subcategories,
    selectedCategoryId,
    selectedSubcategoryId,
    selectCategory,
    selectSubcategory,
    items,
    imageCache,
    loading,
    refreshing,
    refresh,
    reset,
  } = useWardrobeBrowser({
    wardrobeId,
    userId,
    initialCategoryId,
    enabled: visible,
  });

  const singleCategoryMode = Boolean(initialCategoryId);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close wardrobe browser"
          >
            <Ionicons
              name="close-outline"
              size={28}
              color={colors.textLight}
            />
          </TouchableOpacity>
        </View>

        <BrowserCategoryBar
          categories={categories}
          subcategories={subcategories}
          selectedCategoryId={selectedCategoryId}
          selectedSubcategoryId={selectedSubcategoryId}
          onSelectCategory={selectCategory}
          onSelectSubcategory={selectSubcategory}
          singleCategoryMode={singleCategoryMode}
        />

        {loading && items.length === 0 ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="large" />
          </View>
        ) : (
          <ItemGrid
            items={items}
            imageCache={imageCache}
            selectedItems={selectedItemIds}
            onItemPress={onSelectItem}
            onRefresh={refresh}
            refreshing={refreshing}
            showFavorite={false}
            numColumns={3}
            style={styles.gridContainer}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
