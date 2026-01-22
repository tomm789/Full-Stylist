import React, { useState, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getOutfit } from '@/lib/outfits';
import { createOutfitBundle } from '@/lib/bundles';

export default function CreateBundleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [outfit, setOutfit] = useState<any>(null);
  const [outfitItems, setOutfitItems] = useState<any[]>([]);
  const [bundlePrice, setBundlePrice] = useState('');
  const [saleMode, setSaleMode] = useState<'items_only' | 'bundle_only' | 'both'>('both');
  const [groups, setGroups] = useState<Array<{ title: string; is_required: boolean; itemIds: string[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id && user) {
      loadOutfit();
    }
  }, [id, user]);

  const loadOutfit = async () => {
    if (!id) return;

    setLoading(true);
    const { data } = await getOutfit(id);
    if (data) {
      setOutfit(data.outfit);
      setOutfitItems(data.items);
      
      // Initialize groups from outfit items (one group per category for MVP)
      // Simplified: create one default group with all items
      if (data.items.length > 0) {
        setGroups([{
          title: 'Complete Outfit',
          is_required: saleMode === 'bundle_only',
          itemIds: data.items.map((item: any) => item.wardrobe_item_id),
        }]);
      }
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !outfit || groups.length === 0) return;

    if (saleMode !== 'items_only' && !bundlePrice) {
      Alert.alert('Error', 'Please enter a bundle price');
      return;
    }

    setSaving(true);

    try {
      const bundleData = {
        bundle_price: bundlePrice ? parseFloat(bundlePrice) : undefined,
        currency: 'AUD',
        sale_mode: saleMode,
        groups: groups.map((group) => ({
          title: group.title,
          is_required: group.is_required,
          items: group.itemIds.map((itemId) => ({
            wardrobe_item_id: itemId,
            quantity: 1,
          })),
        })),
      };

      const { data: bundle, error } = await createOutfitBundle(
        user.id,
        outfit.id,
        bundleData
      );

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Bundle created successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', `Failed to create bundle: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  const updateGroupRequired = (index: number, isRequired: boolean) => {
    const newGroups = [...groups];
    newGroups[index].is_required = isRequired;
    setGroups(newGroups);
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
        <Text style={styles.headerTitle}>Create Bundle</Text>
        <TouchableOpacity onPress={handleCreate} disabled={saving}>
          <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Outfit: {outfit?.title || 'Untitled'}</Text>
        <Text style={styles.description}>
          {outfitItems.length} item{outfitItems.length !== 1 ? 's' : ''} in this outfit
        </Text>

        <Text style={styles.label}>Sale Mode *</Text>
        <View style={styles.modeSelector}>
          {(['items_only', 'bundle_only', 'both'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.modeOption, saleMode === mode && styles.modeOptionActive]}
              onPress={() => setSaleMode(mode)}
            >
              <Text
                style={[styles.modeOptionText, saleMode === mode && styles.modeOptionTextActive]}
              >
                {mode.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {saleMode !== 'items_only' && (
          <>
            <Text style={styles.label}>Bundle Price (AUD) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter bundle price"
              value={bundlePrice}
              onChangeText={setBundlePrice}
              keyboardType="decimal-pad"
            />
          </>
        )}

        <Text style={styles.label}>Bundle Groups</Text>
        <Text style={styles.description}>
          Group items that must be sold together. Mark groups as required for bundle-only sales.
        </Text>

        {groups.map((group, index) => (
          <View key={index} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <View style={styles.groupToggle}>
                <Text style={styles.toggleLabel}>Required</Text>
                <Switch
                  value={group.is_required}
                  onValueChange={(value) => updateGroupRequired(index, value)}
                  disabled={saleMode === 'items_only'}
                />
              </View>
            </View>
            <Text style={styles.groupItems}>{group.itemIds.length} items</Text>
          </View>
        ))}
      </View>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.savingText}>Creating bundle...</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modeOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  modeOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#e7f3ff',
  },
  modeOptionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  modeOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  groupCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: '#f9f9f9',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  groupToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 12,
    color: '#666',
  },
  groupItems: {
    fontSize: 12,
    color: '#666',
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
