import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Modal,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAISettings, AIModelSettingKey } from '@/hooks/profile';
import { Header, HeaderIconButton } from '@/components/shared/layout';
import PrimaryButton from '@/components/shared/buttons/PrimaryButton';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles } from './_ai-settings.styles';
import {
  MODEL_CATALOG,
  MODEL_KEYS,
  GENERATION_SETTINGS,
} from '@/constants/aiModels';

export default function AISettingsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
