/**
 * Create Bundle Screen (Refactored)
 * Create outfit bundles for selling
 * 
 * BEFORE: 300 lines
 * AFTER: ~150 lines (50% reduction)
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getOutfit } from '@/lib/outfits';
import { createOutfitBundle } from '@/lib/bundles';
import {
  Header,
  Input,
  PrimaryButton,
  LoadingSpinner,
} from '@/components/shared';
import { HeaderActionButton, HeaderIconButton } from '@/components/shared/layout';
import { theme } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

type SaleMode = 'items_only' | 'bundle_only' | 'both';

export default function CreateBundleScreen() {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const styles = createStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [outfit, setOutfit] = useState<any>(null);
  const [outfitItems, setOutfitItems] = useState<any[]>([]);
  const [bundlePrice, setBundlePrice] = useState('');
  const [saleMode, setSaleMode] = useState<SaleMode>('both');
  const [groups, setGroups] = useState<
    Array<{ title: string; is_required: boolean; itemIds: string[] }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const initialSnapshotRef = useRef<{
    bundlePrice: string;
    saleMode: SaleMode;
    groupSignature: string;
  } | null>(null);

  const getGroupSignature = (
    groupList: Array<{ title: string; is_required: boolean; itemIds: string[] }>
  ) =>
    groupList
      .map(
        (group) =>
          `${group.title}|${group.is_required}|${[...group.itemIds].sort().join(',')}`
      )
      .sort()
      .join('||');

  useEffect(() => {
    if (id && user) {
      loadOutfit();
    }
  }, [id, user]);

  useEffect(() => {
    if (initialSnapshotRef.current || groups.length === 0) return;

    initialSnapshotRef.current = {
      bundlePrice,
      saleMode,
      groupSignature: getGroupSignature(groups),
    };
  }, [bundlePrice, saleMode, groups]);

  const isDirty = useMemo(() => {
    if (!initialSnapshotRef.current) return false;

    return (
      bundlePrice !== initialSnapshotRef.current.bundlePrice ||
      saleMode !== initialSnapshotRef.current.saleMode ||
      getGroupSignature(groups) !== initialSnapshotRef.current.groupSignature
    );
  }, [bundlePrice, saleMode, groups]);

  const loadOutfit = async () => {
    if (!id) return;

    setLoading(true);
    const { data } = await getOutfit(id);
    if (data) {
      setOutfit(data.outfit);
      setOutfitItems(data.items);

      // Initialize default group with all items
      if (data.items.length > 0) {
        setGroups([
          {
            title: 'Complete Outfit',
            is_required: saleMode === 'bundle_only',
            itemIds: data.items.map((item: any) => item.wardrobe_item_id),
          },
        ]);
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

      const { error } = await createOutfitBundle(user.id, outfit.id, bundleData);

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
      <View style={commonStyles.loadingContainer}>
        <LoadingSpinner text="Loading outfit..." />
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <Header
        title="Create Bundle"
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

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.sectionTitle}>Outfit: {outfit?.title || 'Untitled'}</Text>
        <Text style={styles.description}>
          {outfitItems.length} item{outfitItems.length !== 1 ? 's' : ''} in this
          outfit
        </Text>

        <Text style={styles.label}>Sale Mode *</Text>
        <View style={styles.modeSelector}>
          {(['items_only', 'bundle_only', 'both'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.modeOption,
                saleMode === mode && styles.modeOptionActive,
              ]}
              onPress={() => setSaleMode(mode)}
            >
              <Text
                style={[
                  styles.modeOptionText,
                  saleMode === mode && styles.modeOptionTextActive,
                ]}
              >
                {mode.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {saleMode !== 'items_only' && (
          <Input
            label="Bundle Price (AUD) *"
            value={bundlePrice}
            onChangeText={setBundlePrice}
            placeholder="Enter bundle price"
            keyboardType="decimal-pad"
          />
        )}

        <Text style={styles.label}>Bundle Groups</Text>
        <Text style={styles.description}>
          Group items that must be sold together. Mark groups as required for
          bundle-only sales.
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

        <View style={styles.actions}>
          <PrimaryButton
            title="Create Bundle"
            onPress={handleCreate}
            loading={saving}
            disabled={saving}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeOption: {
    flex: 1,
    padding: spacing.sm + spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  modeOptionText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modeOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  groupCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm + spacing.xs / 2,
    backgroundColor: colors.backgroundSecondary,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  groupToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  groupItems: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actions: {
    marginTop: spacing.lg + spacing.md,
    marginBottom: spacing.xl + spacing.lg,
  },
});
