import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useNewListing } from '@/hooks/listings';

export default function NewListingScreen() {
  const router = useRouter();
  const {
    items,
    loading,
    selectedItem,
    itemImages,
    selectedImageIds,
    price,
    condition,
    setSelectedItem,
    setPrice,
    setCondition,
    toggleImage,
    saving,
    handleCreate,
    selectItem,
    getImageUrl,
  } = useNewListing();

  const renderItem = ({ item }: { item: typeof items[0] }) => {
    const isSelected = selectedItem?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.itemCard, isSelected && styles.itemCardSelected]}
        onPress={() => selectItem(item)}
      >
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderImage = ({
    item,
  }: {
    item: { id: string; image_id: string; type: string; image: any };
  }) => {
    const imageUrl = getImageUrl(item.image);
    const isSelected = selectedImageIds.has(item.image_id);

    return (
      <TouchableOpacity
        style={[styles.imageCard, isSelected && styles.imageCardSelected]}
        onPress={() => toggleImage(item.image_id)}
      >
        {imageUrl ? (
          <ExpoImage
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>No Image</Text>
          </View>
        )}
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Listing</Text>
        <TouchableOpacity onPress={handleCreate} disabled={saving}>
          <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
            Create
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Select Wardrobe Item *</Text>
        {!selectedItem ? (
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.itemsList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No wardrobe items found</Text>
            }
          />
        ) : (
          <View style={styles.selectedItemContainer}>
            <Text style={styles.selectedItemTitle}>{selectedItem.title}</Text>
            <TouchableOpacity onPress={() => setSelectedItem(null)}>
              <Text style={styles.changeButton}>Change</Text>
            </TouchableOpacity>
          </View>
        )}

        {selectedItem && (
          <>
            <Text style={styles.label}>Select Images (Original Only) *</Text>
            <Text style={styles.description}>
              Only original images can be used in listings. AI-generated images are not
              allowed.
            </Text>
            {itemImages.length === 0 ? (
              <Text style={styles.emptyText}>
                No original images found for this item
              </Text>
            ) : (
              <FlatList
                data={itemImages}
                renderItem={renderImage}
                keyExtractor={(item) => item.id}
                numColumns={3}
                contentContainerStyle={styles.imagesList}
              />
            )}

            <Text style={styles.label}>Price (AUD) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter price"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Condition *</Text>
            <View style={styles.conditionSelector}>
              {(['new', 'like_new', 'good', 'worn'] as const).map((cond) => (
                <TouchableOpacity
                  key={cond}
                  style={[
                    styles.conditionOption,
                    condition === cond && styles.conditionOptionActive,
                  ]}
                  onPress={() => setCondition(cond)}
                >
                  <Text
                    style={[
                      styles.conditionOptionText,
                      condition === cond && styles.conditionOptionTextActive,
                    ]}
                  >
                    {cond.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.savingText}>Creating listing...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 16,
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  itemsList: {
    gap: 8,
  },
  itemCard: {
    flex: 1,
    margin: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  itemCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e7f3ff',
  },
  itemTitle: {
    fontSize: 14,
    color: '#000',
  },
  selectedItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: '#e7f3ff',
  },
  selectedItemTitle: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  changeButton: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  imagesList: {
    gap: 8,
  },
  imageCard: {
    flex: 1,
    margin: 4,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  imageCardSelected: {
    borderColor: '#007AFF',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#999',
    fontSize: 12,
  },
  selectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  conditionSelector: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  conditionOption: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  conditionOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#e7f3ff',
  },
  conditionOptionText: {
    fontSize: 14,
    color: '#666',
  },
  conditionOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 16,
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
});
