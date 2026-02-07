import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Modal,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAISettings, AIModelSettingKey, AIModelLockKey } from '@/hooks/profile';
import { Header, HeaderIconButton } from '@/components/shared/layout';
import PrimaryButton from '@/components/shared/buttons/PrimaryButton';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles';

const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';
const DEFAULT_BODY_MODEL = 'gemini-3-pro-image';

const MODEL_CATALOG = [
  {
    id: 'gemini-2.5-flash-image',
    name: 'Nano Banana / Standard',
    family: 'Gemini Multimodal Family (Nano Banana)',
    summary: 'Conversational image generation and editing.',
    price: 'Price: $0.039 per image',
    description:
      'A fast, cost-efficient multimodal model for conversational image generation, edits, and character consistency.',
  },
  {
    id: 'gemini-3-pro-image',
    name: 'Nano Banana Pro / Stable',
    family: 'Gemini Multimodal Family (Nano Banana)',
    summary: 'Stable pro-quality multimodal imaging.',
    price: 'Price: $0.134 per image',
    description:
      'Stable, high-quality multimodal image model with strong composition and consistency.',
  },
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Latest Experimental',
    family: 'Gemini Multimodal Family (Nano Banana)',
    summary: 'Experimental features and newest capabilities.',
    price: 'Price: $0.100 per image (Discounted for testing)',
    description:
      'Preview model with the latest experimental features. Best for testing new capabilities.',
  },
  {
    id: 'gemini-3-pro-image-001',
    name: 'Versioned Snapshot',
    family: 'Gemini Multimodal Family (Nano Banana)',
    summary: 'Fixed versioned snapshot.',
    price: 'Price: $0.134 per image',
    description:
      'Versioned snapshot for reproducible outputs. Use for stable production behavior.',
  },
  {
    id: 'imagen-4.0-fast',
    name: 'Imagen 4 Fast',
    family: 'Imagen Family (Specialized Diffusion)',
    summary: 'Optimized for speed and lower cost.',
    price: 'Price: $0.03 per image',
    description:
      'High-fidelity text-to-image diffusion model optimized for speed and cost.',
  },
  {
    id: 'imagen-4.0-generate',
    name: 'Imagen 4 Standard',
    family: 'Imagen Family (Specialized Diffusion)',
    summary: 'Standard high-quality production model.',
    price: 'Price: $0.05 per image',
    description:
      'Balanced quality and speed for production-grade text-to-image generation.',
  },
  {
    id: 'imagen-4.0-ultra',
    name: 'Imagen 4 Ultra',
    family: 'Imagen Family (Specialized Diffusion)',
    summary: 'Highest resolution and photorealism.',
    price: 'Price: $0.06 per image',
    description:
      'Maximum fidelity and photorealism for premium outputs.',
  },
  {
    id: 'imagen-4.0-edit-001',
    name: 'Imagen 4 Edit',
    family: 'Imagen Family (Specialized Diffusion)',
    summary: 'Mask-based inpainting/outpainting.',
    price: 'Price: $0.03 per edit (Inpainting/Outpainting)',
    description:
      'Specialized for inpainting/outpainting and mask-based edits.',
  },
  {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash (Vision)',
    family: 'Gemini Vision Family (Analysis)',
    summary: 'Fast, low-cost vision/OCR.',
    price: 'Input: $0.30 / Output: $2.50 per 1M tokens',
    description:
      'Optimized for fast image analysis, OCR, and attribute extraction.',
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro (Vision)',
    family: 'Gemini Vision Family (Analysis)',
    summary: 'High-reasoning multimodal analysis.',
    price: 'Input: $1.25 / Output: $10.00 per 1M tokens',
    description:
      'Higher reasoning for complex image analysis and extraction tasks.',
  },
  {
    id: 'veo-3.1-generate-001',
    name: 'Veo 3.1 Standard',
    family: 'Video Generation Family',
    summary: 'Standard video generation.',
    price: 'Price: $0.30 per 5-second clip (1080p)',
    description:
      'Generates motion and cinematic video clips from prompts.',
  },
  {
    id: 'veo-3.1-pro-001',
    name: 'Veo 3.1 Pro',
    family: 'Video Generation Family',
    summary: 'Extended duration and higher fidelity.',
    price: 'Price: $0.80 per 5-second clip (4K)',
    description:
      'Higher fidelity, longer duration video generation.',
  },
];

const MODEL_KEYS: AIModelSettingKey[] = [
  'ai_model_outfit_render',
  'ai_model_outfit_mannequin',
  'ai_model_wardrobe_item_generate',
  'ai_model_wardrobe_item_render',
  'ai_model_product_shot',
  'ai_model_headshot_generate',
  'ai_model_body_shot_generate',
  'ai_model_auto_tag',
  'ai_model_style_advice',
];

const GENERATION_SETTINGS: Array<{
  key: AIModelSettingKey;
  lockKey: AIModelLockKey;
  label: string;
  description: string;
  defaultModel: string;
}> = [
  {
    key: 'ai_model_outfit_render',
    lockKey: 'ai_model_lock_outfit_render',
    label: 'Outfit Render',
    description: 'Final outfit render on your body.',
    defaultModel: DEFAULT_IMAGE_MODEL,
  },
  {
    key: 'ai_model_outfit_mannequin',
    lockKey: 'ai_model_lock_outfit_mannequin',
    label: 'Outfit Mannequin',
    description: 'Intermediate mannequin render for larger outfits.',
    defaultModel: DEFAULT_IMAGE_MODEL,
  },
  {
    key: 'ai_model_wardrobe_item_generate',
    lockKey: 'ai_model_lock_wardrobe_item_generate',
    label: 'Wardrobe Item Generate',
    description: 'Generate product shots for wardrobe items.',
    defaultModel: DEFAULT_IMAGE_MODEL,
  },
  {
    key: 'ai_model_wardrobe_item_render',
    lockKey: 'ai_model_lock_wardrobe_item_render',
    label: 'Wardrobe Item Render',
    description: 'Render product shots from item images.',
    defaultModel: DEFAULT_IMAGE_MODEL,
  },
  {
    key: 'ai_model_product_shot',
    lockKey: 'ai_model_lock_product_shot',
    label: 'Product Shot',
    description: 'Product photography outputs for items.',
    defaultModel: DEFAULT_IMAGE_MODEL,
  },
  {
    key: 'ai_model_headshot_generate',
    lockKey: 'ai_model_lock_headshot_generate',
    label: 'Headshot Generate',
    description: 'Headshot creation from selfie.',
    defaultModel: DEFAULT_IMAGE_MODEL,
  },
  {
    key: 'ai_model_body_shot_generate',
    lockKey: 'ai_model_lock_body_shot_generate',
    label: 'Body Shot Generate',
    description: 'Studio body shot compositing.',
    defaultModel: DEFAULT_BODY_MODEL,
  },
  {
    key: 'ai_model_auto_tag',
    lockKey: 'ai_model_lock_auto_tag',
    label: 'Auto Tag / Analysis',
    description: 'Analyze items for attributes and tags.',
    defaultModel: DEFAULT_IMAGE_MODEL,
  },
  {
    key: 'ai_model_style_advice',
    lockKey: 'ai_model_lock_style_advice',
    label: 'Style Advice',
    description: 'Text-based styling advice and suggestions.',
    defaultModel: DEFAULT_IMAGE_MODEL,
  },
];

export default function AISettingsScreen() {
  const router = useRouter();
  const { settings, loading, saving, updateModel, updateLock, updateMany, lockedKeys } = useAISettings();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeKey, setActiveKey] = useState<AIModelSettingKey | 'all' | null>(null);
  const [infoModelId, setInfoModelId] = useState<string | null>(null);

  const groupedModels = useMemo(() => {
    const groups = new Map<string, typeof MODEL_CATALOG>();
    MODEL_CATALOG.forEach((model) => {
      if (!groups.has(model.family)) groups.set(model.family, []);
      groups.get(model.family)?.push(model);
    });
    return Array.from(groups.entries());
  }, []);

  const familyDescriptions = useMemo(
    () => ({
      'Gemini Multimodal Family (Nano Banana)':
        'Optimized for conversational editing and character consistency.',
      'Imagen Family (Specialized Diffusion)':
        'Optimized for high-fidelity "one-shot" generation.',
      'Gemini Vision Family (Analysis)':
        'Optimized for reading and reasoning. Prices are per 1M tokens.',
      'Video Generation Family':
        'Optimized for motion and cinematic clips.',
    }),
    []
  );

  const modelById = useMemo(() => {
    const map = new Map(MODEL_CATALOG.map((model) => [model.id, model]));
    return map;
  }, []);

  const handleOpenPicker = (key: AIModelSettingKey | 'all') => {
    setActiveKey(key);
    setPickerVisible(true);
  };

  const handleSelectModel = async (modelId: string) => {
    if (!activeKey) return;

    if (activeKey === 'all') {
      const updates: Record<string, string> = {};
      MODEL_KEYS.forEach((key) => {
        if (!lockedKeys.has(key)) {
          updates[key] = modelId;
        }
      });
      if (modelId === 'gemini-2.5-flash-image' || modelId === 'gemini-3-pro-image-preview') {
        updates.ai_model_preference = modelId;
      }
      if (Object.keys(updates).length > 0) {
        await updateMany(updates as any);
      }
    } else {
      if (activeKey === 'ai_model_auto_tag' || activeKey === 'ai_model_style_advice') {
        setPickerVisible(false);
        setActiveKey(null);
        return;
      }
      await updateModel(activeKey, modelId);
    }

    setPickerVisible(false);
    setActiveKey(null);
  };

  const infoModel = infoModelId ? modelById.get(infoModelId) : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="AI Settings"
          leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading AI settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!settings) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="AI Settings"
          leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Complete your profile to access AI settings.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="AI Settings"
        leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
      />

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Global Controls</Text>
          <Text style={styles.sectionHint}>
            Set all model selections at once. Locked generations stay unchanged.
          </Text>
          <PrimaryButton
            title="Set All Models"
            onPress={() => handleOpenPicker('all')}
            variant="outline"
            size="small"
            disabled={saving}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Generation Types</Text>
          <Text style={styles.sectionHint}>
            Customize each generation type individually or lock it from bulk changes.
          </Text>

          {GENERATION_SETTINGS.map((item) => {
            const modelValue =
              (settings[item.key] as string | null) || item.defaultModel;
            const locked = !!settings[item.lockKey];
            const isTextType =
              item.key === 'ai_model_auto_tag' || item.key === 'ai_model_style_advice';
            const lockDisabled = isTextType;
            const modelLabel = modelById.get(modelValue)?.name || modelValue;

            return (
              <View key={item.key} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleGroup}>
                    <Text style={styles.cardTitle}>{item.label}</Text>
                    <Text style={styles.cardDescription}>{item.description}</Text>
                  </View>
                  <View style={styles.lockRow}>
                    <Text style={styles.lockLabel}>Lock</Text>
                    <Switch
                      value={locked}
                      onValueChange={(value) => updateLock(item.lockKey, value)}
                      disabled={saving || lockDisabled}
                    />
                  </View>
                </View>

                <View style={styles.modelRow}>
                  <View style={styles.modelInfo}>
                    <Text style={styles.modelLabel}>{modelLabel}</Text>
                    <Text style={styles.modelId}>{modelValue}</Text>
                  </View>
                  <PrimaryButton
                    title="Change"
                    onPress={() => handleOpenPicker(item.key)}
                    variant="outline"
                    size="small"
                    disabled={saving || isTextType}
                  />
                </View>
                {isTextType && (
                  <Text style={styles.lockedHint}>
                    Text generation models are locked for now.
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Model Picker Modal */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeKey === 'all' ? 'Select Model for All' : 'Select Model'}
              </Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalList}>
              {groupedModels.map(([family, models]) => (
                <View key={family} style={styles.familySection}>
                  <Text style={styles.familyTitle}>{family}</Text>
                  {familyDescriptions[family] ? (
                    <Text style={styles.familySubtitle}>{familyDescriptions[family]}</Text>
                  ) : null}
                  {models.map((model) => (
                    <View key={model.id} style={styles.modelCard}>
                      <View style={styles.modelCardHeader}>
                        <Text style={styles.modelCardTitle}>{model.name}</Text>
                        <TouchableOpacity onPress={() => setInfoModelId(model.id)}>
                          <Ionicons
                            name="information-circle-outline"
                            size={20}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.modelCardId}>{model.id}</Text>
                      <Text style={styles.modelCardSummary}>{model.summary}</Text>
                      <PrimaryButton
                        title="Use This Model"
                        onPress={() => handleSelectModel(model.id)}
                        size="small"
                        variant="outline"
                        disabled={saving}
                        style={styles.modelSelectButton}
                      />
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Model Info Modal */}
      <Modal
        visible={!!infoModel}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setInfoModelId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{infoModel?.name}</Text>
              <TouchableOpacity onPress={() => setInfoModelId(null)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoFamily}>{infoModel?.family}</Text>
            <Text style={styles.infoModelId}>{infoModel?.id}</Text>
            {infoModel?.price ? (
              <Text style={styles.infoPrice}>{infoModel.price}</Text>
            ) : null}
            <Text style={styles.infoDescription}>{infoModel?.description}</Text>
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
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.massive,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionHint: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardTitleGroup: {
    flex: 1,
    marginRight: spacing.md,
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  cardDescription: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  lockRow: {
    alignItems: 'center',
  },
  lockLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  modelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  lockedHint: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  modelInfo: {
    flex: 1,
  },
  modelLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  modelId: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  infoModalContent: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  modalList: {
    paddingBottom: spacing.xl,
  },
  familySection: {
    marginBottom: spacing.lg,
  },
  familyTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  familySubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  modelCard: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  modelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelCardTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  modelCardId: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  modelCardSummary: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  modelSelectButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  infoFamily: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  infoModelId: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  infoPrice: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  infoDescription: {
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    lineHeight: typography.lineHeight.relaxed,
  },
});
