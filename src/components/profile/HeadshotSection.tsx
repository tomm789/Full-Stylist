/**
 * HeadshotSection Component
 * Headshot generation section for profile images
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
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

interface HeadshotSectionProps {
  hairStyle: string;
  makeupStyle: string;
  onHairStyleChange: (style: string) => void;
  onMakeupStyleChange: (style: string) => void;
  headshotImageUrl: string | null;
  uploadedUri: string | null;
  generating: boolean;
  allHeadshots: ProfileImage[];
  activeHeadshotId: string | null;
  onUploadSelfie: () => Promise<void>;
  onGenerateHeadshot: () => Promise<void>;
  onClearImage: () => void;
  onSelectImage: (imageId: string) => Promise<void>;
}

export function HeadshotSection({
  hairStyle,
  makeupStyle,
  onHairStyleChange,
  onMakeupStyleChange,
  headshotImageUrl,
  uploadedUri,
  generating,
  allHeadshots,
  activeHeadshotId,
  onUploadSelfie,
  onGenerateHeadshot,
  onClearImage,
  onSelectImage,
}: HeadshotSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Professional Headshot</Text>
      <Text style={styles.hint}>
        Upload a selfie and customize your hairstyle and makeup
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Hairstyle</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Shoulder-length wavy hair, Short pixie cut"
          value={hairStyle}
          onChangeText={onHairStyleChange}
          editable={!generating}
        />
        <Text style={styles.inputHint}>
          Describe your desired hairstyle or leave blank to keep original
        </Text>

        <Text style={styles.label}>Makeup Style</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Natural look, Bold red lips, Smokey eye"
          value={makeupStyle}
          onChangeText={onMakeupStyleChange}
          editable={!generating}
        />
        <Text style={styles.inputHint}>
          Describe your desired makeup or leave blank for natural look
        </Text>
      </View>

      {headshotImageUrl && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Active Headshot</Text>
          <ExpoImage
            source={{ uri: headshotImageUrl }}
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
            onPress={onGenerateHeadshot}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.generateButtonText}>Generate Headshot</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClearImage}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={onUploadSelfie}
          disabled={generating}
        >
          <Text style={styles.uploadButtonText}>
            {headshotImageUrl ? 'Upload New Selfie' : 'Upload Selfie & Generate'}
          </Text>
        </TouchableOpacity>
      )}

      {allHeadshots.length > 0 && (
        <ProfileImageGallery
          title={`All Generated Headshots (${allHeadshots.length})`}
          images={allHeadshots}
          activeImageId={activeHeadshotId}
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
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
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
});
