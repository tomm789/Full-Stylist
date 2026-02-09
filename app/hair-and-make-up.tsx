/**
 * Hair & Make-Up Screen
 * Orchestrates three screen modes: library, detail, and editor.
 * All state and business logic lives in useHairAndMakeup hook.
 */

import React from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { Header } from '@/components/shared/layout';
import PostGrid, { postGridStyles } from '@/components/social/PostGrid';
import PolicyBlockModal from '@/components/PolicyBlockModal';
import ErrorModal from '@/components/ErrorModal';
import VariationsSection from '@/components/headshot/VariationsSection';
import HeadshotPreview from '@/components/headshot/HeadshotPreview';
import PresetEditor from '@/components/headshot/PresetEditor';
import { useHairAndMakeup } from '@/hooks/headshot';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import { theme } from '@/styles';

const { spacing, borderRadius, typography, shadows } = theme;

export default function HairAndMakeUpScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const state = useHairAndMakeup();

  // ── Library screen ──
  if (state.screenMode === 'library') {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Hair & Make-Up" showBack />
        <View style={styles.libraryContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => state.router.push('/headshot/new' as any)}
          >
            <Ionicons name="camera-outline" size={20} color={colors.textLight} />
            <Text style={styles.actionButtonText}>Create New Headshot</Text>
          </TouchableOpacity>

          <PostGrid
            data={state.allHeadshots}
            keyExtractor={(item) => item.id}
            renderItem={({ item }: { item: { id: string; url: string | null } }) => (
              <TouchableOpacity
                style={postGridStyles.gridItem}
                onPress={() => state.handleOpenHeadshotDetail(item.id, item.url)}
                activeOpacity={0.85}
              >
                {item.url ? (
                  <ExpoImage
                    source={{ uri: item.url }}
                    style={postGridStyles.gridImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.gridPlaceholder}>
                    <Ionicons name="image-outline" size={24} color={colors.textTertiary} />
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Detail screen ──
  if (state.screenMode === 'detail') {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Headshot"
          showBack
          onBack={() => state.setScreenMode('library')}
        />
        <View style={styles.detailContainer}>
          <View style={styles.detailImageWrap}>
            {state.selectedHeadshotUrl ? (
              <ExpoImage
                source={{ uri: state.selectedHeadshotUrl }}
                style={styles.detailImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.detailImagePlaceholder}>
                <Ionicons name="image-outline" size={32} color={colors.textTertiary} />
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={state.handleEditHeadshot}>
            <Ionicons name="create-outline" size={20} color={colors.textLight} />
            <Text style={styles.actionButtonText}>Edit This Headshot</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={state.handleEditHeadshot}>
            <Ionicons name="sparkles-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.secondaryButtonText}>
              Create New Look From This Headshot
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Editor screen ──
  return (
    <SafeAreaView style={styles.container}>
      <Header
        showBack
        onBack={() => state.setScreenMode('detail')}
        title="Hair & Make-Up"
        rightContent={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.infoIconButton}
              onPress={() => state.setInfoModalVisible(true)}
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
                (!state.isDirty || state.generating) && styles.headerGenerateButtonDisabled,
              ]}
              onPress={state.handleGenerateVariation}
              disabled={!state.isDirty || state.generating}
            >
              {state.generating ? (
                <ActivityIndicator color={colors.textLight} />
              ) : (
                <Ionicons name="sparkles-outline" size={18} color={colors.textLight} />
              )}
              <Text style={styles.headerGenerateButtonText}>Generate</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <VariationsSection
          variations={state.variations}
          variationUrls={state.variationUrls}
          selectedVariationIds={state.selectedVariationIds}
          loadingHistory={state.loadingHistory}
          onToggleSelection={state.toggleVariationSelection}
          onSaveSelected={state.handleSaveSelected}
        />

        <HeadshotPreview imageUrl={state.baseHeadshotUrl} />

        <PresetEditor
          activeTab={state.activeTab}
          onTabChange={state.setActiveTab}
          presets={state.presets}
          activeCategory={state.activeCategory}
          activeCategoryId={state.activeCategoryId}
          onCategoryChange={state.setActiveCategoryId}
          selectedIds={state.selectedIds}
          onToggleSelection={state.toggleSelection}
          onInfoPress={state.handleInfoPress}
          customDescription={state.customDescription}
          onCustomDescriptionChange={state.setCustomDescription}
        />
      </ScrollView>

      <PolicyBlockModal
        visible={state.policyModalVisible}
        message={state.policyMessage}
        onClose={() => state.setPolicyModalVisible(false)}
      />

      <ErrorModal
        visible={!!state.error && !state.generating}
        message={state.error || undefined}
        onClose={() => state.setError(null)}
      />

      <Modal
        visible={state.infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => state.setInfoModalVisible(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalCard}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>How It Works</Text>
              <TouchableOpacity onPress={() => state.setInfoModalVisible(false)}>
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.massive,
      gap: spacing.lg,
    },

    // Library
    libraryContainer: {
      flex: 1,
      padding: spacing.lg,
      gap: spacing.lg,
    },
    gridPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Detail
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

    // Shared buttons
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
    },
    actionButtonText: {
      color: colors.textLight,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
    },
    secondaryButton: {
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
    secondaryButtonText: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
    },

    // Editor header
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    infoIconButton: {
      padding: spacing.xs,
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

    // Info modal
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
  });
