/**
 * Wardrobe Item Detail Screen (Refactored)
 * View and manage a single wardrobe item
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import {
  useWardrobeItemDetail,
  useWardrobeItemNavigation,
  useWardrobeItemDetailActions,
} from '@/hooks/wardrobe';
import {
  ItemImageCarousel,
  ItemAttributes,
  ItemNavigation,
  ItemActions,
} from '@/components/wardrobe';

export default function ItemDetailScreen() {
  const { id, itemIds, readOnly } = useLocalSearchParams<{
    id: string;
    itemIds?: string;
    readOnly?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();
  const isReadOnly = readOnly === 'true';

  // Data loading with polling
  const {
    item,
    category,
    displayImages,
    attributes,
    tags,
    loading,
    isGeneratingProductShot,
  } = useWardrobeItemDetail({
    itemId: id,
    userId: user?.id,
  });

  // Navigation
  const {
    navigationItems,
    currentItemIndex,
    navigationScrollRef,
    currentScreenWidth,
  } = useWardrobeItemNavigation({
    itemIds,
    currentItemId: id,
    userId: user?.id,
  });

  // Actions
  const actions = useWardrobeItemDetailActions({
    item,
    itemId: id,
    itemIds,
    isReadOnly,
  });

  const isOwnItem = item && user && item.owner_user_id === user.id && !isReadOnly;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Item not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRightButtons}>
          {isOwnItem && (
            <TouchableOpacity
              onPress={actions.toggleFavorite}
              style={styles.headerButton}
            >
              <Ionicons
                name={item?.is_favorite ? 'heart' : 'heart-outline'}
                size={24}
                color={item?.is_favorite ? '#ff0000' : '#000'}
              />
            </TouchableOpacity>
          )}
          {isOwnItem && (
            <TouchableOpacity onPress={actions.handleEdit} style={styles.headerButton}>
              <Ionicons name="pencil-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
          {isOwnItem && (
            <TouchableOpacity
              onPress={actions.handleDelete}
              style={[styles.headerButton, styles.deleteButton]}
            >
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={actions.handleShare} style={styles.headerButton}>
            <Ionicons name="share-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Carousel */}
        <ItemImageCarousel
          images={displayImages}
          currentScreenWidth={currentScreenWidth}
          onImageIndexChange={actions.setCurrentImageIndex}
          currentImageIndex={actions.currentImageIndex}
        />

        {/* Item Details */}
        <View style={styles.detailsContent}>
          <Text style={styles.itemTitle}>{item.title}</Text>

          {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}

          {category && (
            <Text style={styles.itemCategory}>{category.name}</Text>
          )}

          {item.description && (
            <Text style={styles.itemDescription}>{item.description}</Text>
          )}

          {/* Attributes and Tags */}
          <ItemAttributes attributes={attributes} tags={tags} item={item} />

          {/* Action Buttons */}
          <ItemActions
            isReadOnly={isReadOnly}
            isOwnItem={isOwnItem || false}
            isSaved={actions.isSaved}
            isSaving={actions.isSaving}
            onSave={actions.handleSaveItem}
            onAddToOutfit={actions.handleAddToOutfit}
          />
        </View>
      </ScrollView>

      {/* Item Navigation */}
      <ItemNavigation
        items={navigationItems}
        currentItemId={id}
        scrollRef={navigationScrollRef}
        onNavigate={actions.handleNavigateToItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerRightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  backButton: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButton: {
    padding: 8,
  },
  deleteButton: {
    // No special background, icon color indicates delete
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 100,
  },
  detailsContent: {
    padding: 20,
    backgroundColor: '#fff',
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  itemBrand: {
    fontSize: 18,
    color: '#666',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  itemDescription: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    lineHeight: 24,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
