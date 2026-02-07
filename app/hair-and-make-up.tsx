/**
 * Hair & Make-Up Presets Screen (UI only)
 * Phase 1: Build UI for preset selection without wiring generation logic.
 */

import React, { useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { Header } from '@/components/shared/layout';
import { PillButton } from '@/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useProfileImages } from '@/hooks/profile';
import { theme } from '@/styles';
import { hairPresets } from '@/lib/headshot/hairPresets';
import { makeupPresets } from '@/lib/headshot/makeupPresets';
import type { PresetCategory, PresetOption } from '@/lib/headshot/presetTypes';
import {
  createHeadshotGenerationSession,
  createHeadshotGenerationVariation,
  getLatestHeadshotGenerationSession,
  listHeadshotGenerationVariations,
  updateHeadshotGenerationSession,
  updateHeadshotGenerationVariation,
  type HeadshotGenerationVariation,
} from '@/lib/headshot/generation';
import { buildHairMakeupPrompt } from '@/lib/headshot/hairMakeupPrompt';
import { getPublicImageUrl } from '@/lib/images';
import { supabase } from '@/lib/supabase';
import {
  triggerAIJobExecution,
  waitForAIJobCompletion,
  isGeminiPolicyBlockError,
  triggerHeadshotGenerateWithPrompt,
} from '@/lib/ai-jobs';
import PolicyBlockModal from '@/components/PolicyBlockModal';
import ErrorModal from '@/components/ErrorModal';

const { colors, spacing, borderRadius, typography, shadows } = theme;

type TabId = 'hair' | 'makeup';
type ScreenMode = 'library' | 'detail' | 'editor';

export default function HairAndMakeUpScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    headshotImageUrl,
    activeHeadshotId,
    allHeadshots,
  } = useProfileImages({ userId: user?.id });
  const [activeTab, setActiveTab] = useState<TabId>('hair');
  const [selectedHair, setSelectedHair] = useState<string[]>([]);
  const [selectedMakeup, setSelectedMakeup] = useState<string[]>([]);
  const [selectedHairCategory, setSelectedHairCategory] = useState<string | null>(null);
  const [selectedMakeupCategory, setSelectedMakeupCategory] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [variations, setVariations] = useState<HeadshotGenerationVariation[]>([]);
  const [variationUrls, setVariationUrls] = useState<Map<string, string | null>>(new Map());
  const [selectedVariationIds, setSelectedVariationIds] = useState<string[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [policyMessage, setPolicyMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [screenMode, setScreenMode] = useState<ScreenMode>('library');
  const [selectedHeadshotId, setSelectedHeadshotId] = useState<string | null>(null);
  const [selectedHeadshotUrl, setSelectedHeadshotUrl] = useState<string | null>(null);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [baselineInput, setBaselineInput] = useState({
    hairPresetIds: [] as string[],
    makeupPresetIds: [] as string[],
    customDescription: '',
  });

  const presets = useMemo<PresetCategory[]>(
    () => (activeTab === 'hair' ? hairPresets : makeupPresets),
    [activeTab]
  );

  const activeCategoryId =
    activeTab === 'hair' ? selectedHairCategory : selectedMakeupCategory;
  const setActiveCategoryId =
    activeTab === 'hair' ? setSelectedHairCategory : setSelectedMakeupCategory;

  const activeCategory = useMemo(() => {
    if (presets.length === 0) return null;
    const found = presets.find((category) => category.id === activeCategoryId);
    return found || presets[0];
  }, [presets, activeCategoryId]);

  const selectedIds = activeTab === 'hair' ? selectedHair : selectedMakeup;
  const setSelectedIds = activeTab === 'hair' ? setSelectedHair : setSelectedMakeup;

  const toggleSelection = (optionId: string) => {
    setSelectedIds((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
    );
  };

  const handleInfoPress = (option: PresetOption) => {
    Alert.alert(option.title, option.description);
  };

  const loadVariations = async (currentSessionId: string | null) => {
    if (!currentSessionId) {
      setVariations([]);
      setVariationUrls(new Map());
      return;
    }
    setLoadingHistory(true);
    const data = await listHeadshotGenerationVariations(currentSessionId);
    setVariations(data);

    const imageIds = data.map((item) => item.image_id).filter(Boolean) as string[];
    if (imageIds.length === 0) {
      setVariationUrls(new Map());
      setLoadingHistory(false);
      return;
    }

    const { data: images } = await supabase
      .from('images')
      .select('id, storage_bucket, storage_key')
      .in('id', imageIds);

    const urlMap = new Map<string, string | null>();
    images?.forEach((image) => {
      urlMap.set(image.id, getPublicImageUrl(image));
    });
    setVariationUrls(urlMap);
    setLoadingHistory(false);
  };

  const baseHeadshotId = selectedHeadshotId || activeHeadshotId || null;
  const baseHeadshotUrl = selectedHeadshotUrl || headshotImageUrl || null;

  const loadSession = async () => {
    if (!user?.id || !baseHeadshotId) {
      setSessionId(null);
      setVariations([]);
      setVariationUrls(new Map());
      setSelectedHair([]);
      setSelectedMakeup([]);
      setCustomDescription('');
      setBaselineInput({
        hairPresetIds: [],
        makeupPresetIds: [],
        customDescription: '',
      });
      setSelectedVariationIds([]);
      return;
    }
    const session = await getLatestHeadshotGenerationSession(user.id, baseHeadshotId);
    if (session) {
      setSessionId(session.id);
      const input = session.input_json || {};
      const hairPresetIds = input.hairPresetIds || [];
      const makeupPresetIds = input.makeupPresetIds || [];
      const custom = input.customDescription || '';
      setSelectedHair(hairPresetIds);
      setSelectedMakeup(makeupPresetIds);
      setCustomDescription(custom);
      setBaselineInput({
        hairPresetIds,
        makeupPresetIds,
        customDescription: custom,
      });
      await loadVariations(session.id);
    } else {
      setSessionId(null);
      setSelectedHair([]);
      setSelectedMakeup([]);
      setCustomDescription('');
      setBaselineInput({
        hairPresetIds: [],
        makeupPresetIds: [],
        customDescription: '',
      });
      setVariations([]);
      setVariationUrls(new Map());
      setSelectedVariationIds([]);
    }
  };

  React.useEffect(() => {
    loadSession();
  }, [user?.id, baseHeadshotId]);

  const handleGenerateVariation = async () => {
    if (!user?.id) return;
    if (!baseHeadshotId) {
      Alert.alert('Headshot Required', 'Generate a headshot before creating variations.');
      return;
    }

    const inputSnapshot = {
      hairPresetIds: selectedHair,
      makeupPresetIds: selectedMakeup,
      customDescription,
    };
    const promptText = buildHairMakeupPrompt(inputSnapshot);

    if (!promptText.trim()) {
      Alert.alert('Add Details', 'Select a preset or add a custom description.');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const session = await createHeadshotGenerationSession(
          user.id,
          baseHeadshotId,
          inputSnapshot
        );
        if (!session) {
          throw new Error('Failed to create session');
        }
        activeSessionId = session.id;
        setSessionId(session.id);
      } else {
        await updateHeadshotGenerationSession(activeSessionId, inputSnapshot);
      }

      const variation = await createHeadshotGenerationVariation({
        session_id: activeSessionId,
        user_id: user.id,
        status: 'pending',
        prompt_text: promptText,
        input_snapshot_json: inputSnapshot,
      });

      if (!variation) {
        throw new Error('Failed to create variation');
      }

      setVariations((prev) => [variation, ...prev]);

      const { data: job, error: jobError } = await triggerHeadshotGenerateWithPrompt(
        user.id,
        baseHeadshotId,
        promptText,
        { outputFolder: 'hair_makeup_variations', skipUserSettingsUpdate: true }
      );

      if (!job || jobError) {
        await updateHeadshotGenerationVariation(variation.id, { status: 'failed' });
        throw jobError || new Error('Failed to create headshot job');
      }

      await updateHeadshotGenerationVariation(variation.id, { ai_job_id: job.id });
      await triggerAIJobExecution(job.id);

      const { data: completedJob } = await waitForAIJobCompletion(
        job.id,
        30,
        2000,
        '[HairMakeup]'
      );

      if (!completedJob || completedJob.status === 'failed') {
        const failureMessage = completedJob?.error || 'Generation failed';
        if (isGeminiPolicyBlockError(failureMessage)) {
          setPolicyMessage(
            'Gemini could not generate this headshot because it conflicts with safety policy. No credits were charged.'
          );
          setPolicyModalVisible(true);
          await updateHeadshotGenerationVariation(variation.id, { status: 'failed' });
          return;
        }
        await updateHeadshotGenerationVariation(variation.id, { status: 'failed' });
        throw new Error(failureMessage);
      }

      const generatedImageId =
        completedJob.result?.image_id || completedJob.result?.generated_image_id;

      await updateHeadshotGenerationVariation(variation.id, {
        status: 'complete',
        image_id: generatedImageId || null,
      });

      await loadVariations(activeSessionId);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate variation');
    } finally {
      setGenerating(false);
    }
  };

  const toggleVariationSelection = (variationId: string) => {
    setSelectedVariationIds((prev) =>
      prev.includes(variationId)
        ? prev.filter((id) => id !== variationId)
        : [...prev, variationId]
    );
  };

  const handleSaveSelected = async () => {
    if (selectedVariationIds.length === 0) return;
    await Promise.all(
      selectedVariationIds.map((id) =>
        updateHeadshotGenerationVariation(id, { is_saved: true })
      )
    );
    setSelectedVariationIds([]);
    await loadVariations(sessionId);
  };

  const isDirty = useMemo(() => {
    const sortIds = (ids: string[]) => [...ids].sort().join(',');
    return (
      sortIds(selectedHair) !== sortIds(baselineInput.hairPresetIds) ||
      sortIds(selectedMakeup) !== sortIds(baselineInput.makeupPresetIds) ||
      (customDescription || '') !== (baselineInput.customDescription || '')
    );
  }, [selectedHair, selectedMakeup, customDescription, baselineInput]);

  const handleOpenHeadshotDetail = (id: string, url: string | null) => {
    setSelectedHeadshotId(id);
    setSelectedHeadshotUrl(url);
    setScreenMode('detail');
  };

  const handleStartNewLook = () => {
    if (!selectedHeadshotId) return;
    setScreenMode('editor');
  };

  const handleEditHeadshot = () => {
    if (!selectedHeadshotId) return;
    setScreenMode('editor');
  };

  const renderHeadshotGridItem = ({ item }: { item: { id: string; url: string | null } }) => (
    <TouchableOpacity
      style={styles.headshotGridItem}
      onPress={() => handleOpenHeadshotDetail(item.id, item.url)}
      activeOpacity={0.85}
    >
      {item.url ? (
        <ExpoImage source={{ uri: item.url }} style={styles.headshotGridImage} contentFit="cover" />
      ) : (
        <View style={styles.headshotGridPlaceholder}>
          <Ionicons name="image-outline" size={24} color={colors.textTertiary} />
        </View>
      )}
    </TouchableOpacity>
  );

  if (screenMode === 'library') {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Hair & Make-Up" showBack />
        <View style={styles.libraryContainer}>
          <TouchableOpacity
            style={styles.newHeadshotButton}
            onPress={() => router.push('/headshot/new' as any)}
          >
            <Ionicons name="camera-outline" size={20} color={colors.textLight} />
            <Text style={styles.newHeadshotButtonText}>Create New Headshot</Text>
          </TouchableOpacity>

          <FlatList
            data={allHeadshots}
            keyExtractor={(item) => item.id}
            numColumns={3}
            columnWrapperStyle={styles.headshotGridRow}
            contentContainerStyle={styles.headshotGrid}
            renderItem={renderHeadshotGridItem}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (screenMode === 'detail') {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Headshot"
          showBack
          onBack={() => setScreenMode('library')}
        />
        <View style={styles.detailContainer}>
          <View style={styles.detailImageWrap}>
            {selectedHeadshotUrl ? (
              <ExpoImage source={{ uri: selectedHeadshotUrl }} style={styles.detailImage} contentFit="cover" />
            ) : (
              <View style={styles.detailImagePlaceholder}>
                <Ionicons name="image-outline" size={32} color={colors.textTertiary} />
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.detailActionButton} onPress={handleEditHeadshot}>
            <Ionicons name="create-outline" size={20} color={colors.textLight} />
            <Text style={styles.detailActionButtonText}>Edit This Headshot</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.detailSecondaryButton} onPress={handleStartNewLook}>
            <Ionicons name="sparkles-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.detailSecondaryButtonText}>
              Create New Look From This Headshot
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        showBack
        onBack={() => setScreenMode('detail')}
        leftContent={<Text style={styles.headerTitle}>Hair & Make-Up</Text>}
        rightContent={
          isDirty ? (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.infoIconButton}
                onPress={() => setInfoModalVisible(true)}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.headerGenerateButton,
                  (!isDirty || generating) && styles.headerGenerateButtonDisabled,
                ]}
                onPress={handleGenerateVariation}
                disabled={!isDirty || generating}
              >
                {generating ? (
                  <ActivityIndicator color={colors.textLight} />
                ) : (
                  <Ionicons name="sparkles-outline" size={18} color={colors.textLight} />
                )}
                <Text style={styles.headerGenerateButtonText}>Generate</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Variations</Text>
          {loadingHistory ? (
            <View style={styles.historyLoading}>
              <ActivityIndicator color={colors.textSecondary} />
              <Text style={styles.historyLoadingText}>Loading variations...</Text>
            </View>
          ) : variations.length === 0 ? (
            <Text style={styles.historyEmptyText}>No variations yet.</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.variationRow}
            >
              {variations.map((variation) => {
                const isSelected = selectedVariationIds.includes(variation.id);
                const imageUrl =
                  variation.image_id ? variationUrls.get(variation.image_id) : null;
                return (
                  <TouchableOpacity
                    key={variation.id}
                    style={[
                      styles.variationCard,
                      isSelected && styles.variationCardSelected,
                    ]}
                    onPress={() => toggleVariationSelection(variation.id)}
                    activeOpacity={0.85}
                  >
                    {variation.status !== 'complete' ? (
                      <View style={styles.variationPending}>
                        <ActivityIndicator color={colors.textSecondary} />
                        <Text style={styles.variationStatusText}>
                          {variation.status === 'failed' ? 'Failed' : 'Generating'}
                        </Text>
                      </View>
                    ) : imageUrl ? (
                      <ExpoImage
                        source={{ uri: imageUrl }}
                        style={styles.variationImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.variationPending}>
                        <Text style={styles.variationStatusText}>Unavailable</Text>
                      </View>
                    )}
                    {variation.is_saved && (
                      <View style={styles.savedBadge}>
                        <Ionicons name="bookmark" size={14} color={colors.textLight} />
                        <Text style={styles.savedBadgeText}>Saved</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {selectedVariationIds.length > 0 && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveSelected}
            >
              <Ionicons name="bookmark-outline" size={18} color={colors.textLight} />
              <Text style={styles.saveButtonText}>
                Save Selected as Headshots ({selectedVariationIds.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.previewFrame}>
            {baseHeadshotUrl ? (
              <ExpoImage
                source={{ uri: baseHeadshotUrl }}
                style={styles.previewImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.previewPlaceholder}>
                <Ionicons name="person-circle-outline" size={72} color={colors.gray400} />
                <Text style={styles.previewPlaceholderText}>
                  Add a headshot to preview
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'hair' && styles.tabActive]}
            onPress={() => setActiveTab('hair')}
          >
            <Ionicons
              name="cut-outline"
              size={20}
              color={activeTab === 'hair' ? colors.textPrimary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'hair' && styles.tabTextActive]}>
              Hair
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'makeup' && styles.tabActive]}
            onPress={() => setActiveTab('makeup')}
          >
            <Ionicons
              name="color-palette-outline"
              size={20}
              color={activeTab === 'makeup' ? colors.textPrimary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'makeup' && styles.tabTextActive]}>
              Make-Up
            </Text>
          </TouchableOpacity>
        </View>

        {presets.length > 0 && (
          <View style={styles.categoryPills}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryPillsRow}>
                {presets.map((category) => (
                  <PillButton
                    key={category.id}
                    label={category.title}
                    selected={activeCategory?.id === category.id}
                    onPress={() => setActiveCategoryId(category.id)}
                    size="medium"
                    variant="default"
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {activeCategory && (
          <View style={styles.categoryCard}>
            {activeCategory.sections.map((section) => (
              <View key={section.id} style={styles.sectionBlock}>
                {activeCategory.sections.length > 1 && (
                  <Text style={styles.sectionLabel}>{section.title}</Text>
                )}
                <View style={styles.pillRow}>
                  {section.options.map((option) => {
                    const isSelected = selectedIds.includes(option.id);
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[styles.pill, isSelected && styles.pillSelected]}
                        onPress={() => toggleSelection(option.id)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            isSelected && styles.pillTextSelected,
                          ]}
                        >
                          {option.title}
                        </Text>
                        <TouchableOpacity
                          style={styles.infoButton}
                          onPress={(event) => {
                            event.stopPropagation?.();
                            handleInfoPress(option);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name="information-circle-outline"
                            size={16}
                            color={isSelected ? colors.textLight : colors.textSecondary}
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.customSection}>
          <Text style={styles.sectionTitle}>Custom Description</Text>
          <Text style={styles.customHint}>
            Add any extra details to combine with presets (optional).
          </Text>
          <TextInput
            style={styles.customInput}
            placeholder="e.g., soft glam with glossy lips, warm brown smoky eye"
            placeholderTextColor={colors.textTertiary}
            multiline
            value={customDescription}
            onChangeText={setCustomDescription}
          />
        </View>

        
      </ScrollView>

      <PolicyBlockModal
        visible={policyModalVisible}
        message={policyMessage}
        onClose={() => setPolicyModalVisible(false)}
      />

      <ErrorModal
        visible={!!error && !generating}
        message={error || undefined}
        onClose={() => setError(null)}
      />

      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalCard}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>How It Works</Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoModalText}>
              Choose presets below to build your hair and make-up direction.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.massive,
    gap: spacing.lg,
  },
  previewCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: 0,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  previewFrame: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    aspectRatio: 3 / 4,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  previewPlaceholderText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoIconButton: {
    padding: spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.textPrimary,
  },
  tabText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  categoryPills: {
    paddingVertical: spacing.xs,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    gap: spacing.md,
  },
  categoryTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  sectionBlock: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: colors.textLight,
    fontWeight: typography.fontWeight.semibold,
  },
  infoButton: {
    paddingLeft: spacing.xs,
  },
  libraryContainer: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  newHeadshotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  newHeadshotButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  headshotGrid: {
    gap: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  headshotGridRow: {
    justifyContent: 'space-between',
  },
  headshotGridItem: {
    width: '32%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  headshotGridImage: {
    width: '100%',
    height: '100%',
  },
  headshotGridPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContainer: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  detailImageWrap: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
  },
  detailImage: {
    width: '100%',
    height: 320,
  },
  detailImagePlaceholder: {
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  detailActionButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  detailSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  detailSecondaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  customSection: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  customHint: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  customInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  headerGenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  headerGenerateButtonDisabled: {
    opacity: 0.6,
  },
  headerGenerateButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  infoModalCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.md,
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoModalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  infoModalText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  historySection: {
    gap: spacing.md,
  },
  historyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyLoadingText: {
    color: colors.textSecondary,
  },
  historyEmptyText: {
    color: colors.textSecondary,
  },
  variationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  variationCard: {
    width: 130,
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  variationCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  variationImage: {
    width: '100%',
    height: '100%',
  },
  variationPending: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  variationStatusText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  savedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  savedBadgeText: {
    color: colors.textLight,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.black,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  saveButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
