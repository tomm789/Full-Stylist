/**
 * Profile Images Screen (Refactored)
 * Manage headshots and body shots for profile
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  useProfileImages,
  useProfileImageGeneration,
} from '@/hooks/profile';
import { HeadshotSection, BodyShotSection } from '@/components/profile';

export default function ProfileImagesScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // Profile images data
  const {
    loading,
    headshotImageUrl,
    bodyShotImageUrl,
    allHeadshots,
    allBodyShots,
    activeHeadshotId,
    activeBodyShotId,
    refreshImages,
    setActiveHeadshot,
    setActiveBodyShot,
  } = useProfileImages({ userId: user?.id });

  // Image generation
  const {
    headshotHairStyle,
    headshotMakeupStyle,
    setHeadshotHairStyle,
    setHeadshotMakeupStyle,
    headshotGeneration,
    handleUploadSelfie,
    handleGenerateHeadshot,
    bodyShotGeneration,
    handleUploadBodyPhoto,
    handleGenerateBodyShot,
    isLoading,
    loadingMessage,
  } = useProfileImageGeneration();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profile Images</Text>
        </View>

        {/* Headshot Section */}
        <HeadshotSection
          hairStyle={headshotHairStyle}
          makeupStyle={headshotMakeupStyle}
          onHairStyleChange={setHeadshotHairStyle}
          onMakeupStyleChange={setHeadshotMakeupStyle}
          headshotImageUrl={headshotImageUrl}
          uploadedUri={headshotGeneration.uploadedUri}
          generating={headshotGeneration.generating}
          allHeadshots={allHeadshots}
          activeHeadshotId={activeHeadshotId}
          onUploadSelfie={handleUploadSelfie}
          onGenerateHeadshot={() =>
            handleGenerateHeadshot(user?.id || '', refreshImages)
          }
          onClearImage={headshotGeneration.clearImage}
          onSelectImage={setActiveHeadshot}
        />

        {/* Body Shot Section */}
        <BodyShotSection
          bodyShotImageUrl={bodyShotImageUrl}
          uploadedUri={bodyShotGeneration.uploadedUri}
          generating={bodyShotGeneration.generating}
          hasActiveHeadshot={!!activeHeadshotId}
          allBodyShots={allBodyShots}
          activeBodyShotId={activeBodyShotId}
          onUploadBodyPhoto={() => handleUploadBodyPhoto(!!activeHeadshotId)}
          onGenerateBodyShot={() =>
            handleGenerateBodyShot(
              user?.id || '',
              activeHeadshotId || '',
              refreshImages
            )
          }
          onClearImage={bodyShotGeneration.clearImage}
          onSelectImage={setActiveBodyShot}
        />
      </ScrollView>

      {/* Loading Overlay */}
      <Modal
        visible={isLoading}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.generatingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.generatingTitle}>
              {headshotGeneration.generating
                ? 'Generating Headshot'
                : 'Generating Studio Model'}
            </Text>
            {loadingMessage && (
              <Text style={styles.generatingMessage}>{loadingMessage}</Text>
            )}
          </View>
        </View>
      </Modal>
    </>
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
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
    marginTop: 20,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '80%',
  },
  generatingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  generatingMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
