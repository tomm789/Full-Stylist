/**
 * BodyShotSection Component
 * Body shot generation section for profile images
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { ProfileImageGallery } from './ProfileImageGallery';

interface ProfileImage {
  id: string;
  url: string;
  created_at: string;
}

interface BodyShotSectionProps {
  bodyShotImageUrl: string | null;
  uploadedUri: string | null;
  generating: boolean;
  hasActiveHeadshot: boolean;
  allBodyShots: ProfileImage[];
  activeBodyShotId: string | null;
  onUploadBodyPhoto: () => Promise<void>;
  onGenerateBodyShot: () => Promise<void>;
  onClearImage: () => void;
  onSelectImage: (imageId: string) => Promise<void>;
}

export function BodyShotSection({
  bodyShotImageUrl,
  uploadedUri,
  generating,
  hasActiveHeadshot,
  allBodyShots,
  activeBodyShotId,
  onUploadBodyPhoto,
  onGenerateBodyShot,
  onClearImage,
  onSelectImage,
}: BodyShotSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Studio Model</Text>
      <Text style={styles.hint}>
        Upload a full-body photo to create your studio model for outfit rendering
      </Text>

      {bodyShotImageUrl && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Active Studio Model</Text>
          <ExpoImage
            source={{ uri: bodyShotImageUrl }}
            style={styles.imagePreview}
            contentFit="cover"
          />
        </View>
      )}

      {uploadedUri ? (
        <View style={styles.uploadedPreview}>
          <ExpoImage
            source={{ uri: uploadedUri }}
            style={styles.uploadedImage}
            contentFit="cover"
          />
          <TouchableOpacity
            style={styles.generateButton}
            onPress={onGenerateBodyShot}
            disabled={generating || !hasActiveHeadshot}
          >
            {generating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.generateButtonText}>Generate Studio Model</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClearImage}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={onUploadBodyPhoto}
          disabled={generating || !hasActiveHeadshot}
        >
          <Text style={styles.uploadButtonText}>
            {bodyShotImageUrl
              ? 'Upload New Body Photo'
              : 'Upload Body Photo & Generate'}
          </Text>
        </TouchableOpacity>
      )}

      {!hasActiveHeadshot && (
        <Text style={styles.warningText}>
          Generate a headshot first to create your studio model
        </Text>
      )}

      {allBodyShots.length > 0 && (
        <ProfileImageGallery
          title={`All Generated Studio Models (${allBodyShots.length})`}
          images={allBodyShots}
          activeImageId={activeBodyShotId}
          onSelectImage={onSelectImage}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  previewContainer: {
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  uploadedPreview: {
    marginBottom: 16,
  },
  uploadedImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 14,
    color: '#ff9500',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
