import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useNewLookbook } from '@/hooks/lookbooks';
import { OutfitGridSelector } from '@/components/lookbooks';
import FilterDefinitionEditor from '@/components/FilterDefinitionEditor';

export default function NewLookbookScreen() {
  const router = useRouter();
  const {
    // Form state
    title,
    description,
    type,
    visibility,
    selectedOutfits,
    filterDefinition,
    setTitle,
    setDescription,
    setType,
    setVisibility,
    setFilterDefinition,

    // Outfits
    outfits,
    outfitImageUrls,
    loading,
    toggleOutfit,

    // Actions
    saving,
    handleCreate,
    loadOutfits,
  } = useNewLookbook();

  // Reload outfits when screen comes into focus (e.g., after deleting an outfit)
  useFocusEffect(
    React.useCallback(() => {
      loadOutfits();
    }, [loadOutfits])
  );

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
              <OutfitGridSelector
                outfits={outfits}
                selectedIds={selectedOutfits}
                imageUrls={outfitImageUrls}
                onToggle={toggleOutfit}
              />
            )}
          </>
        )}

        {type === 'custom_filter' && (
          <FilterDefinitionEditor
            onFilterChange={(filterDef) => {
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
