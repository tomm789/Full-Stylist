/**
 * HeadshotSelectorModal
 * Full-screen modal for selecting a headshot, handling body shot sync,
 * and optionally capturing a new mirror selfie.
 * Views: grid → detail (checking/activated/needs_body_shot) → camera → generating
 */

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Text,
} from 'react-native';
import { showErrorToast } from '@/utils/toast';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { GridView } from './headshot-selector/GridView';
import { DetailView } from './headshot-selector/DetailView';
import { CameraView } from './headshot-selector/CameraView';
import { GeneratingView } from './headshot-selector/GeneratingView';
import { createStyles, type Headshot } from './headshot-selector/styles';

// ── State machine ─────────────────────────────────────────────────────────────

type ModalScreen =
  | { screen: 'grid' }
  | { screen: 'detail'; status: 'checking' | 'activated' | 'needs_body_shot' }
  | { screen: 'camera'; preview: string | null }
  | { screen: 'generating' };

// ── Props ─────────────────────────────────────────────────────────────────────

interface HeadshotSelectorModalProps {
  visible: boolean;
  userId: string;
  currentHeadshotId: string | null;
  currentBodyShotId: string | null;
  headshots: Headshot[];
  onClose: () => void;
  onCheckHeadshot: (headshotId: string) => Promise<'activated' | 'needs_body_shot' | 'error'>;
  onGenerateBodyShot: (headshotId: string, mirrorSelfieImageId: string) => void;
  onSkipBodyShot: (headshotId: string, onActivated: () => void, onGenerating: () => void) => void;
  onNewHeadshot?: () => void;
  loading?: boolean;
}

// ── Upload helper ─────────────────────────────────────────────────────────────

async function uploadMirrorSelfie(
  userId: string,
  uri: string
): Promise<{ imageId: string | null; error: string | null }> {
  try {
    const timestamp = Date.now();
    const filePath = `body_shots/${userId}/${timestamp}.jpg`;

    const response = await fetch(uri);
    const blob = await response.blob();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, blob, { contentType: 'image/jpeg', upsert: false });

    if (uploadError || !uploadData) {
      return { imageId: null, error: uploadError?.message || 'Upload failed' };
    }

    const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);

    const { data: imageRow, error: imageError } = await supabase
      .from('images')
      .insert({
        owner_user_id: userId,
        storage_path: filePath,
        url: publicUrlData.publicUrl,
        type: 'body_shot',
      })
      .select('id')
      .single();

    if (imageError || !imageRow) {
      return { imageId: null, error: imageError?.message || 'Failed to record image' };
    }

    return { imageId: imageRow.id, error: null };
  } catch (e: any) {
    return { imageId: null, error: e?.message || 'Unknown upload error' };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HeadshotSelectorModal({
  visible,
  userId,
  currentHeadshotId,
  currentBodyShotId,
  headshots,
  onClose,
  onCheckHeadshot,
  onGenerateBodyShot,
  onSkipBodyShot,
  onNewHeadshot,
  loading = false,
}: HeadshotSelectorModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [modalScreen, setModalScreen] = useState<ModalScreen>({ screen: 'grid' });
  const [selectedHeadshot, setSelectedHeadshot] = useState<Headshot | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset on close
  useEffect(() => {
    if (!visible) {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
      setModalScreen({ screen: 'grid' });
      setSelectedHeadshot(null);
      setIsUploading(false);
    }
  }, [visible]);

  // Auto-close 1200ms after activation
  useEffect(() => {
    if (modalScreen.screen === 'detail' && modalScreen.status === 'activated') {
      autoCloseTimer.current = setTimeout(onClose, 1200);
    }
    return () => {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    };
  }, [modalScreen, onClose]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleGridTap = useCallback(
    async (headshot: Headshot) => {
      setSelectedHeadshot(headshot);
      setModalScreen({ screen: 'detail', status: 'checking' });

      const result = await onCheckHeadshot(headshot.id);
      if (result === 'activated') {
        setModalScreen({ screen: 'detail', status: 'activated' });
      } else if (result === 'needs_body_shot') {
        setModalScreen({ screen: 'detail', status: 'needs_body_shot' });
      } else {
        setModalScreen({ screen: 'grid' });
      }
    },
    [onCheckHeadshot]
  );

  const handleYes = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showErrorToast('Camera access is required to take a mirror selfie. Please enable it in Settings.');
      return;
    }
    setModalScreen({ screen: 'camera', preview: null });
  }, []);

  const handleCameraCapture = useCallback(async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
      cameraType: ImagePicker.CameraType.back,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setModalScreen({ screen: 'camera', preview: result.assets[0].uri });
    }
  }, []);

  const handleCameraAccept = useCallback(async () => {
    if (modalScreen.screen !== 'camera' || !modalScreen.preview || !selectedHeadshot) return;
    const preview = modalScreen.preview;

    setIsUploading(true);
    const { imageId, error } = await uploadMirrorSelfie(userId, preview);
    setIsUploading(false);

    if (!imageId || error) {
      showErrorToast(error || 'Failed to upload your selfie. Please try again.');
      return;
    }

    onGenerateBodyShot(selectedHeadshot.id, imageId);
    setModalScreen({ screen: 'generating' });
  }, [modalScreen, selectedHeadshot, userId, onGenerateBodyShot]);

  const handleCameraUndo = useCallback(() => {
    setModalScreen({ screen: 'camera', preview: null });
  }, []);

  const handleSkip = useCallback(() => {
    if (!selectedHeadshot) return;
    onSkipBodyShot(
      selectedHeadshot.id,
      () => setModalScreen({ screen: 'detail', status: 'activated' }),
      () => setModalScreen({ screen: 'generating' })
    );
  }, [selectedHeadshot, onSkipBodyShot]);

  const handleBack = useCallback(() => {
    switch (modalScreen.screen) {
      case 'grid':
        onClose();
        break;
      case 'detail':
        setModalScreen({ screen: 'grid' });
        break;
      case 'camera':
        setModalScreen({ screen: 'detail', status: 'needs_body_shot' });
        break;
      case 'generating':
        onClose();
        break;
    }
  }, [modalScreen, onClose]);

  const getHeaderTitle = () => {
    switch (modalScreen.screen) {
      case 'grid': return 'Headshots';
      case 'detail': return 'Headshot';
      case 'camera': return 'Mirror Selfie';
      case 'generating': return 'Generating';
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={handleBack}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons
                name={modalScreen.screen === 'grid' ? 'close' : 'chevron-back'}
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          </View>

          <View style={styles.headerRight}>
            {modalScreen.screen === 'grid' && onNewHeadshot && (
              <TouchableOpacity
                style={styles.newHeadshotButton}
                onPress={onNewHeadshot}
                activeOpacity={0.7}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons name="add" size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
            {modalScreen.screen === 'detail' && modalScreen.status === 'activated' && (
              <TouchableOpacity
                style={styles.selectButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.selectButtonText}>Select Headshot</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sub-views */}
        {modalScreen.screen === 'grid' && (
          <GridView
            headshots={headshots}
            currentHeadshotId={currentHeadshotId}
            loading={loading}
            onSelect={handleGridTap}
          />
        )}

        {modalScreen.screen === 'detail' && selectedHeadshot && (
          <DetailView
            headshot={selectedHeadshot}
            status={modalScreen.status}
            onYes={handleYes}
            onSkip={handleSkip}
          />
        )}

        {modalScreen.screen === 'camera' && (
          <CameraView
            cameraUri={modalScreen.preview}
            isUploading={isUploading}
            onCapture={handleCameraCapture}
            onAccept={handleCameraAccept}
            onUndo={handleCameraUndo}
          />
        )}

        {modalScreen.screen === 'generating' && <GeneratingView onContinue={onClose} />}

        {/* Loading overlay (grid initial load) */}
        {loading && modalScreen.screen === 'grid' && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
