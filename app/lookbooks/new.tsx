import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  FlatList,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { saveLookbook } from '@/lib/lookbooks';
import { getUserOutfits } from '@/lib/outfits';
import { getOutfitCoverImageUrl } from '@/lib/images';
import FilterDefinitionEditor from '@/components/FilterDefinitionEditor';

type LookbookType = 'custom_manual' | 'custom_filter';

export default function NewLookbookScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<LookbookType>('custom_manual');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private_link'>('followers');
  const [selectedOutfits, setSelectedOutfits] = useState<Set<string>>(new Set());
  const [outfits, setOutfits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterDefinition, setFilterDefinition] = useState<any>({});
  const [outfitImageUrls, setOutfitImageUrls] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    if (user) {
      loadOutfits();
    }
  }, [user]);

  // Reload outfits when screen comes into focus (e.g., after deleting an outfit)
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadOutfits();
      }
    }, [user])
  );

  const loadOutfits = async () => {
    if (!user) return;

    setLoading(true);
    const { data: userOutfits } = await getUserOutfits(user.id);
    if (userOutfits) {
      setOutfits(userOutfits);
      
      // Pre-load all outfit images
      const imageUrlMap = new Map<string, string | null>();
      await Promise.all(
        userOutfits.map(async (outfit: any) => {
          const url = await getOutfitCoverImageUrl(outfit);
          imageUrlMap.set(outfit.id, url);
        })
      );
      setOutfitImageUrls(imageUrlMap);
    }
    setLoading(false);
  };

  const toggleOutfit = useCallback((outfitId: string) => {
    setSelectedOutfits((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(outfitId)) {
        newSelected.delete(outfitId);
      } else {
        newSelected.add(outfitId);
      }
      return newSelected;
    });
  }, []);

  const handleCreate = async () => {
    if (!user) return;

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your lookbook');
      return;
    }

    if (type === 'custom_manual' && selectedOutfits.size === 0) {
      Alert.alert('Error', 'Please select at least one outfit for your lookbook');
      return;
    }

    setSaving(true);

    try {
      const lookbookData = {
        title: title.trim(),
        description: description.trim() || undefined,
        visibility: visibility,
        type: type,
        filter_definition: type === 'custom_filter' ? filterDefinition : undefined,
      };

      const outfitIds = type === 'custom_manual' ? Array.from(selectedOutfits) : undefined;

      const { data: lookbook, error } = await saveLookbook(
        user.id,
        lookbookData,
        outfitIds
      );

      if (error) {
        throw error;
      }

      // Navigate directly to the lookbook editor
      if (lookbook?.id) {
        router.replace(`/lookbooks/${lookbook.id}`);
      } else {
        router.back();
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to create lookbook: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  // Memoize OutfitCard - now receives pre-loaded imageUrl as prop
  const OutfitCard = React.memo(({ item, imageUrl, isSelected, onToggle }: { item: any; imageUrl: string | null; isSelected: boolean; onToggle: (id: string) => void }) => {
    return (
      <TouchableOpacity
        style={[styles.outfitCard, isSelected && styles.outfitCardSelected]}
        onPress={() => onToggle(item.id)}
      >
        {imageUrl ? (
          <ExpoImage source={{ uri: imageUrl }} style={styles.outfitImage} contentFit="cover" />
        ) : (
          <View style={styles.outfitImagePlaceholder}>
            <Text style={styles.outfitImagePlaceholderText}>No Image</Text>
          </View>
        )}
        <View style={styles.outfitCardOverlay}>
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>✓</Text>
            </View>
          )}
          <Text style={styles.outfitCardTitle} numberOfLines={2}>
            {item.title || 'Untitled Outfit'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  });

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
        <Text style={styles.headerTitle}>New Lookbook</Text>
        <TouchableOpacity onPress={handleCreate} disabled={saving}>
          <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter lookbook title"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter description (optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          maxLength={500}
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeOption, type === 'custom_manual' && styles.typeOptionActive]}
            onPress={() => setType('custom_manual')}
          >
            <Text
              style={[styles.typeOptionText, type === 'custom_manual' && styles.typeOptionTextActive]}
            >
              Manual
            </Text>
            <Text style={styles.typeOptionDescription}>Select outfits manually</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOption, type === 'custom_filter' && styles.typeOptionActive]}
            onPress={() => setType('custom_filter')}
          >
            <Text
              style={[styles.typeOptionText, type === 'custom_filter' && styles.typeOptionTextActive]}
            >
              Filter-based
            </Text>
            <Text style={styles.typeOptionDescription}>Auto-update based on filters (coming soon)</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Visibility</Text>
        <View style={styles.visibilitySelector}>
          <TouchableOpacity
            style={[styles.visibilityOption, visibility === 'public' && styles.visibilityOptionActive]}
            onPress={() => setVisibility('public')}
          >
            <Text
              style={[
                styles.visibilityOptionText,
                visibility === 'public' && styles.visibilityOptionTextActive,
              ]}
            >
              Public
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.visibilityOption,
              visibility === 'followers' && styles.visibilityOptionActive,
            ]}
            onPress={() => setVisibility('followers')}
          >
            <Text
              style={[
                styles.visibilityOptionText,
                visibility === 'followers' && styles.visibilityOptionTextActive,
              ]}
            >
              Followers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.visibilityOption,
              visibility === 'private_link' && styles.visibilityOptionActive,
            ]}
            onPress={() => setVisibility('private_link')}
          >
            <Text
              style={[
                styles.visibilityOptionText,
                visibility === 'private_link' && styles.visibilityOptionTextActive,
              ]}
            >
              Private Link
            </Text>
          </TouchableOpacity>
        </View>

        {type === 'custom_manual' && (
          <>
            <View style={styles.outfitsHeader}>
              <Text style={styles.label}>Select Outfits ({selectedOutfits.size} selected)</Text>
            </View>
            {outfits.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No outfits yet</Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push('/outfits/new')}
                >
                  <Text style={styles.emptyButtonText}>Create your first outfit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={outfits}
                renderItem={({ item }) => (
                  <OutfitCard
                    item={item}
                    imageUrl={outfitImageUrls.get(item.id) || null}
                    isSelected={selectedOutfits.has(item.id)}
                    onToggle={toggleOutfit}
                  />
                )}
                keyExtractor={(item) => item.id}
                numColumns={2}
                scrollEnabled={false}
                contentContainerStyle={styles.outfitsList}
              />
            )}
          </>
        )}

        {type === 'custom_filter' && (
          <FilterDefinitionEditor
            onFilterChange={(filterDef) => {
              // Store filter definition for saving
              setFilterDefinition(filterDef);
            }}
          />
        )}
      </View>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.savingText}>Creating lookbook...</Text>
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  typeOption: {
    flex: 1,
    padding: 16,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  typeOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#e7f3ff',
  },
  typeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  typeOptionTextActive: {
    color: '#007AFF',
  },
  typeOptionDescription: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  visibilitySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  visibilityOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#e7f3ff',
  },
  visibilityOptionText: {
    fontSize: 14,
    color: '#666',
  },
  visibilityOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  outfitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  outfitsList: {
    gap: 8,
  },
  outfitCard: {
    flex: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
    position: 'relative',
  },
  outfitCardSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  outfitImage: {
    width: '100%',
    aspectRatio: 1,
  },
  outfitImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outfitImagePlaceholderText: {
    color: '#999',
    fontSize: 12,
  },
  outfitCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
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
  outfitCardTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterPlaceholder: {
    padding: 24,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginTop: 8,
  },
  filterPlaceholderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
