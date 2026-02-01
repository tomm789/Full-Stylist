/**
 * New Bodyshot Screen (Refactored)
 * Generate full-body studio model photo from photo + headshot
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useNewBodyshot } from '@/hooks/profile';
import PolicyBlockModal from '@/components/PolicyBlockModal';
import { Header, HeaderActionButton } from '@/components/shared/layout';
import { theme } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

export default function NewBodyshotScreen() {
  const router = useRouter();
  const {
    headshots,
    loadingHeadshots,
    selectedHeadshotId,
    setSelectedHeadshotId,
    generating,
    loadingMessage,
    uploadedUri,
    policyModalVisible,
    policyMessage,
    pickImage,
    clearImage,
    closePolicyModal,
    handleGenerate,
  } = useNewBodyshot();

  return (
    <>
      <SafeAreaView style={styles.container}>
        <Header
          title="New Bodyshot"
          leftContent={
            <HeaderActionButton
              label="Cancel"
              onPress={() => router.back()}
              variant="secondary"
            />
          }
        />

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
          {/* Step 1: Select Headshot */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Select a Headshot</Text>
            <Text style={styles.hint}>
              Choose a headshot to use for your bodyshot generation
            </Text>

            {loadingHeadshots ? (
              <ActivityIndicator style={styles.loader} />
            ) : headshots.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="image-outline" size={48} color={colors.gray400} />
                <Text style={styles.emptyStateText}>No headshots available</Text>
                <TouchableOpacity
                  style={styles.createHeadshotButton}
                  onPress={() => router.push('/headshot/new' as any)}
                >
                  <Text style={styles.createHeadshotButtonText}>Create Headshot</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={headshots}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.headshotOption,
                      selectedHeadshotId === item.id && styles.headshotOptionSelected,
                    ]}
                    onPress={() => setSelectedHeadshotId(item.id)}
                  >
                    <ExpoImage
                      source={{ uri: item.url }}
                      style={styles.headshotImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    {selectedHeadshotId === item.id && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.headshotList}
              />
            )}
          </View>

          {/* Step 2: Upload Photo */}
          {selectedHeadshotId && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Upload Body Photo</Text>
              <Text style={styles.hint}>
                Upload a full-body photo to combine with your headshot
              </Text>

              {!uploadedUri ? (
                <>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => pickImage(true)}
                  >
                    <Ionicons name="camera-outline" size={32} color={colors.primary} />
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>Take Photo</Text>
                      <Text style={styles.optionSubtext}>Use your camera</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={colors.gray400} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => pickImage(false)}
                  >
                    <Ionicons name="images-outline" size={32} color={colors.primary} />
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>Upload Photo</Text>
                      <Text style={styles.optionSubtext}>Choose from library</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={colors.gray400} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.imagePreviewContainer}>
                    <ExpoImage
                      source={{ uri: uploadedUri }}
                      style={styles.imagePreview}
                      contentFit="cover"
                    />
                  </View>

                  <TouchableOpacity style={styles.retakeButton} onPress={clearImage}>
                    <Ionicons name="camera-reverse-outline" size={20} color={colors.primary} />
                    <Text style={styles.retakeButtonText}>Retake Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.generateButton,
                      generating && styles.generateButtonDisabled,
                    ]}
                    onPress={async () => {
                      await handleGenerate();
                    }}
                    disabled={generating}
                  >
                    <Ionicons name="sparkles-outline" size={20} color={colors.textLight} />
                    <Text style={styles.generateButtonText}>Generate Bodyshot</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Loading Overlay */}
      <Modal visible={generating} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingTitle}>Generating Bodyshot</Text>
            <Text style={styles.loadingMessage}>{loadingMessage}</Text>
          </View>
        </View>
      </Modal>

      {/* Policy Block Modal */}
      <PolicyBlockModal
        visible={policyModalVisible}
        message={policyMessage}
        onClose={closePolicyModal}
      />
    </>
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
  },
  section: {
    marginBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  hint: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.huge,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  createHeadshotButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  createHeadshotButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  headshotList: {
    paddingVertical: spacing.sm,
  },
  headshotOption: {
    marginRight: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.transparent,
  },
  headshotOptionSelected: {
    borderColor: colors.primary,
  },
  headshotImage: {
    width: 120,
    height: 160,
    backgroundColor: colors.backgroundTertiary,
  },
  selectedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  optionSubtext: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  imagePreviewContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.backgroundTertiary,
    marginBottom: spacing.lg,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  retakeButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xxxl,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '80%',
  },
  loadingTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  loadingMessage: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.normal,
  },
});
