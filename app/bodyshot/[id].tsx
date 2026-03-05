/**
 * Bodyshot Detail Screen (Refactored)
 * View, duplicate, or delete bodyshot
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useImageEdit } from '@/hooks/profile';
import { getRecentBodyshotJobForImage, getAIJobNoStore } from '@/lib/ai-jobs';
import { checkFeedbackExistsForJob } from '@/lib/ai-feedback';
import { AIGenerationFeedback } from '@/components/ai';
import {
  DropdownMenuModal,
  DropdownMenuItem,
  dropdownMenuStyles,
} from '@/components/shared/modals';
import { Header, HeaderIconButton } from '@/components/shared/layout';
import { createStyles } from '@/styles/screens/bodyshot-detail.styles';

export default function BodyshotDetailScreen() {
  const { user } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { id: bodyshotId, perfStartTime, perfApiResponseTime } = useLocalSearchParams();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const closeMenu = () => setShowMenu(false);

  const [lastSucceededJobId, setLastSucceededJobId] = useState<string | null>(null);
  const [lastSucceededJobFeedbackAt, setLastSucceededJobFeedbackAt] = useState<string | null>(null);
  const [feedbackSubmittedForJobId, setFeedbackSubmittedForJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !bodyshotId) return;
    getRecentBodyshotJobForImage(user.id, bodyshotId as string).then(({ data: job }) => {
      if (job) {
        const jobId = job.id;
        setLastSucceededJobId(jobId);
        const feedbackAt = (job as { feedback_at?: string | null }).feedback_at ?? null;
        setLastSucceededJobFeedbackAt(feedbackAt);
        if (feedbackAt == null) {
          getAIJobNoStore(jobId).then(({ data: refetched }) => {
            const refetchedAt = (refetched as { feedback_at?: string | null })?.feedback_at ?? null;
            if (refetchedAt != null) {
              setLastSucceededJobFeedbackAt(refetchedAt);
            } else {
              checkFeedbackExistsForJob(jobId).then(({ exists, created_at }) => {
                if (exists) {
                  setLastSucceededJobFeedbackAt(created_at ?? new Date().toISOString());
                }
              });
            }
          });
        }
      }
    });
  }, [user?.id, bodyshotId]);

  // Use the image edit hook for bodyshots
  const {
    image: bodyshot,
    loading,
    duplicating,
    deleting,
    duplicate,
    deleteImage: deleteBodyshot,
    setAsActive,
  } = useImageEdit({
    imageId: bodyshotId as string,
    userId: user?.id,
    imageType: 'bodyshot',
  });

  const showFeedbackOverlay = !!(bodyshot && lastSucceededJobId);
  const feedbackGiven =
    !!lastSucceededJobFeedbackAt || feedbackSubmittedForJobId === lastSucceededJobId;

  const handleDuplicate = async () => {
    const newId = await duplicate();
    if (newId) {
      router.replace(`/bodyshot/${newId}` as any);
    }
  };

  const handleDelete = async () => {
    const success = await deleteBodyshot();
    if (success) {
      setShowDeleteConfirm(false);
      router.back();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Bodyshot"
          leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!bodyshot) {
    return null;
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <Header
          title="Bodyshot"
          leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
          rightContent={
            <HeaderIconButton
              icon="ellipsis-vertical"
              onPress={() => setShowMenu(true)}
              accessibilityLabel="Open menu"
            />
          }
        />

        <DropdownMenuModal
          visible={showMenu}
          onClose={closeMenu}
          topOffset={100}
          align="right"
        >
          <DropdownMenuItem
            label="Set as active"
            icon="checkmark-circle-outline"
            onPress={() => {
              closeMenu();
              setAsActive();
            }}
            iconColor={colors.success}
          />
          <View style={dropdownMenuStyles.menuDivider} />
          <DropdownMenuItem
            label="Duplicate"
            icon="copy-outline"
            onPress={() => {
              closeMenu();
              handleDuplicate();
            }}
            disabled={duplicating}
          />
          <View style={dropdownMenuStyles.menuDivider} />
          <DropdownMenuItem
            label="Delete"
            icon="trash-outline"
            onPress={() => {
              closeMenu();
              setShowDeleteConfirm(true);
            }}
            danger
          />
        </DropdownMenuModal>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
          <View style={styles.imageContainer}>
            <ExpoImage
              source={{ uri: bodyshot.url }}
              style={styles.image}
              contentFit="cover"
              cachePolicy="memory-disk"
              onLoad={() => {
                // Performance tracking: Image load complete
                const renderCompleteTime = performance.now();
                
                // Parse timing data from route params if available
                if (perfStartTime && perfApiResponseTime) {
                  const startTime = parseFloat(perfStartTime as string);
                  const apiResponseTime = parseFloat(perfApiResponseTime as string);
                  
                  const totalUserWait = renderCompleteTime - startTime;
                  const backendProcessing = apiResponseTime - startTime;
                  const transferAndRender = renderCompleteTime - apiResponseTime;
                  
                  // Log performance breakdown table
                                    if (__DEV__) {
                    console.log('\n╔════════════════════════════════════════════════════════╗');
                    console.log('║         AI IMAGE GENERATION PERFORMANCE BREAKDOWN      ║');
                    console.log('╠════════════════════════════════════════════════════════╣');
                    console.log(`║ Total User Wait:        ${totalUserWait.toFixed(2).padStart(10)} ms ║`);
                    console.log(`║ Backend Processing:     ${backendProcessing.toFixed(2).padStart(10)} ms ║`);
                    console.log(`║ Transfer & Render:      ${transferAndRender.toFixed(2).padStart(10)} ms ║`);
                    console.log('╚════════════════════════════════════════════════════════╝');
                    console.log(`\n[PERF] Transfer & Render is the bottleneck: ${transferAndRender.toFixed(2)}ms\n`);
                  }
                } else {
                                    if (__DEV__) {
                    console.log('[PERF] Image loaded at:', renderCompleteTime);
                  }
                }
              }}
            />
            {showFeedbackOverlay && lastSucceededJobId && (
              <AIGenerationFeedback
                jobId={lastSucceededJobId}
                jobType="body_shot_generate"
                onClose={(id) => id != null && setFeedbackSubmittedForJobId(id)}
                compact={feedbackGiven}
              />
            )}
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>About Bodyshots</Text>
            <Text style={styles.infoText}>
              Bodyshots combine your headshot with a full-body photo to create professional
              studio-quality model photos. You can duplicate this bodyshot to create
              variations.
            </Text>
          </View>

          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={[styles.actionButton, duplicating && styles.actionButtonDisabled]}
              onPress={handleDuplicate}
              disabled={duplicating}
            >
              {duplicating ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Ionicons name="copy-outline" size={24} color={colors.primary} />
              )}
              <Text style={styles.actionButtonText}>Duplicate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={setAsActive}
            >
              <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
              <Text style={styles.actionButtonText}>Set as Active</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.deleteModalContainer}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Bodyshot</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this bodyshot? This action cannot be
              undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmDeleteButton]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={colors.textLight} size="small" />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

