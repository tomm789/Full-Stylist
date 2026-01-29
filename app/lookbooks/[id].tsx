/**
 * Lookbook Detail Screen (Refactored)
 * View and manage a single lookbook with outfits
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import {
  useLookbookDetail,
  useSlideshow,
  useLookbookOutfits,
  useLookbookDetailActions,
} from '@/hooks/lookbooks';
import {
  LookbookHeader,
  LookbookOutfitGrid,
  AddOutfitsModal,
  OutfitActionsMenu,
  EditLookbookModal,
  SlideshowModal,
} from '@/components/lookbooks';
import { LoadingSpinner } from '@/components/shared';
import { isLookbookEditable } from '@/utils/lookbookHelpers';

export default function LookbookDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // Data loading
  const { lookbook, outfits, loading, refresh } = useLookbookDetail({
    lookbookId: id as string,
    userId: user?.id,
  });

  // Slideshow
  const slideshow = useSlideshow({ autoPlayInterval: 4000 });

  // Outfit management
  const [outfitsState, setOutfitsState] = useState<any[]>([]);
  useEffect(() => {
    setOutfitsState(outfits);
  }, [outfits]);

  const outfitManagement = useLookbookOutfits({
    lookbook,
    userId: user?.id,
    outfits: outfitsState,
    onOutfitsChange: setOutfitsState,
    onRefresh: refresh,
  });

  // Actions and modals
  const actions = useLookbookDetailActions({
    lookbook,
    outfits: outfitsState,
    onOutfitsChange: setOutfitsState,
    onRefresh: refresh,
    onSlideshowOpen: slideshow.open,
  });

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      if (id && user) {
        refresh();
      }
    }, [id, user, refresh])
  );

  const isEditable = isLookbookEditable(lookbook, user?.id);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
        </View>
      </View>
    );
  }

  if (!lookbook) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Lookbook not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {outfitsState.length > 0 && (
            <TouchableOpacity
              onPress={actions.handleOpenSlideshow}
              disabled={slideshow.loading}
            >
              <Text
                style={[
                  styles.playButton,
                  slideshow.loading && styles.playButtonDisabled,
                ]}
              >
                {slideshow.loading ? 'Loading...' : '▶ Play'}
              </Text>
            </TouchableOpacity>
          )}
          {isEditable && (
            <>
              <TouchableOpacity
                onPress={actions.handleEdit}
                style={styles.headerIconButton}
              >
                <Ionicons name="pencil-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={actions.handlePublish}
                disabled={actions.publishing}
                style={styles.headerIconButton}
              >
                {actions.publishing ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Ionicons
                    name="paper-plane-outline"
                    size={24}
                    color="#007AFF"
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={actions.handleDelete}
                disabled={actions.deleting}
                style={styles.headerIconButton}
              >
                {actions.deleting ? (
                  <ActivityIndicator size="small" color="#FF3B30" />
                ) : (
                  <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Lookbook Header */}
        <LookbookHeader lookbook={lookbook} outfitCount={outfitsState.length} />

        {/* Outfits Grid */}
        {outfitsState.length === 0 ? (
          <View style={styles.emptyOutfitsContainer}>
            <Text style={styles.emptyOutfitsText}>
              No outfits in this lookbook yet
            </Text>
            {lookbook.type === 'custom_manual' && isEditable && (
              <TouchableOpacity
                style={styles.addOutfitsButton}
                onPress={actions.openAddOutfitsModal}
              >
                <Text style={styles.addOutfitsButtonText}>Add Outfits</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <LookbookOutfitGrid
            outfits={outfitsState}
            lookbook={lookbook}
            lookbookId={id}
            onFavoritePress={actions.toggleFavorite}
            onMenuPress={actions.openOutfitMenu}
          />
        )}
      </ScrollView>

      {/* Edit Modal */}
      <EditLookbookModal
        visible={actions.showEditModal}
        title={actions.editTitle}
        description={actions.editDescription}
        visibility={actions.editVisibility}
        outfitCount={outfitsState.length}
        onClose={() => actions.setShowEditModal(false)}
        onSave={actions.handleSaveEdit}
      />

      {/* Add Outfits Modal */}
      <AddOutfitsModal
        visible={actions.showAddOutfitsModal}
        availableOutfits={actions.availableOutfits}
        selectedOutfitIds={actions.selectedNewOutfits}
        imageUrls={actions.addOutfitImageUrls}
        loading={actions.loadingOutfits}
        adding={outfitManagement.addingOutfits}
        onClose={actions.handleCloseAddOutfitsModal}
        onToggleSelection={actions.toggleNewOutfitSelection}
        onAdd={() => actions.handleAddOutfits(outfitManagement.addOutfits)}
      />

      {/* Outfit Actions Menu */}
      <OutfitActionsMenu
        visible={actions.showOutfitMenu}
        onClose={() => actions.setShowOutfitMenu(false)}
        onEditOutfit={actions.handleEditOutfitFromMenu}
        onRemoveOutfit={() =>
          actions.handleRemoveOutfitFromMenu(outfitManagement.removeOutfitWithConfirm)
        }
      />

      {/* Slideshow Modal */}
      <SlideshowModal
        visible={slideshow.visible}
        outfits={slideshow.outfits}
        images={slideshow.images}
        currentIndex={slideshow.currentIndex}
        isAutoPlaying={slideshow.isAutoPlaying}
        onClose={slideshow.close}
        onNext={() => slideshow.next()}
        onPrevious={() => slideshow.previous()}
        onToggleAutoPlay={slideshow.toggleAutoPlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  playButtonDisabled: {
    opacity: 0.5,
  },
  headerIconButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  emptyOutfitsContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyOutfitsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  addOutfitsButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  addOutfitsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
