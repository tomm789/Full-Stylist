import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useNewLookbook } from '@/hooks/lookbooks';
import { OutfitGridSelector } from '@/components/lookbooks';
import FilterDefinitionEditor from '@/components/lookbooks/FilterDefinitionEditor';
import { Header, HeaderActionButton, HeaderIconButton, KeyboardAwareScreen } from '@/components/shared/layout';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles } from '@/styles/screens/lookbook-new.styles';

export default function NewLookbookScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  const isDirty =
    title.trim().length > 0 ||
    description.trim().length > 0 ||
    type !== 'custom_manual' ||
    visibility !== 'followers' ||
    selectedOutfits.size > 0 ||
    Object.keys(filterDefinition || {}).length > 0;

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
    <KeyboardAwareScreen
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      dismissOnTap
    >
      <Header
        title="New Lookbook"
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
          blurOnSubmit={false}
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
    </KeyboardAwareScreen>
  );
}
