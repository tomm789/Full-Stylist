/**
 * New Bodyshot Screen (Refactored)
 * Generate full-body studio model photo from photo + headshot
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
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
import { Header, HeaderIconButton } from '@/components/shared/layout';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles } from './_new.styles';

export default function NewBodyshotScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
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
                initialNumToRender={8}
                maxToRenderPerBatch={4}
                windowSize={5}
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
