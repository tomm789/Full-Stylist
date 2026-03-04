import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useNewListing } from '@/hooks/listings';
import { Header, HeaderActionButton, HeaderIconButton } from '@/components/shared/layout';
import { styles } from '@/styles/screens/listings-new.styles';

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

  const isDirty =
    !!selectedItem ||
    selectedImageIds.size > 0 ||
    price.trim().length > 0 ||
    condition !== 'good';

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
      <Header
        title="New Listing"
        leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
        rightContent={
          isDirty ? (
            <HeaderActionButton
              label="Create"
              onPress={handleCreate}
              disabled={saving}
            />
          ) : null
        }
      />

      <View style={styles.form}>
        <Text style={styles.label}>Select Wardrobe Item *</Text>
        {!selectedItem ? (
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            initialNumToRender={8}
            maxToRenderPerBatch={4}
            windowSize={5}
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
                initialNumToRender={8}
                maxToRenderPerBatch={4}
                windowSize={5}
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
