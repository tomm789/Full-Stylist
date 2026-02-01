/**
 * Headshot Detail Screen (Refactored)
 * Edit, regenerate, duplicate, or delete headshot
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { useHeadshotDetailActions } from '@/hooks/profile';
import { getRecentHeadshotJobForImage, getAIJobNoStore } from '@/lib/ai-jobs';
import { checkFeedbackExistsForJob } from '@/lib/ai-feedback';
import PolicyBlockModal from '@/components/PolicyBlockModal';
import { AIGenerationFeedback } from '@/components/ai';
import {
  DropdownMenuModal,
  DropdownMenuItem,
  dropdownMenuStyles,
} from '@/components/shared/modals';
import { Header, HeaderActionButton, HeaderIconButton } from '@/components/shared/layout';

export default function HeadshotDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id: headshotId, perfStartTime, perfApiResponseTime } = useLocalSearchParams();

  const {
    // Image data
    headshot,
    loading,
    duplicating,
    deleting,

    // Form state
    hairStyle,
    makeupStyle,
    setHairStyle,
    setMakeupStyle,

    // Actions
    regenerating,
    loadingMessage,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleRegenerate,
    handleDuplicate,
    handleDelete,
    setAsActive,

    // Policy blocking
    policyModalVisible,
    policyMessage,
    localPolicyVisible,
    localPolicyMessage,
    closePolicyModal,
    setLocalPolicyVisible,
  } = useHeadshotDetailActions({
    headshotId: headshotId as string,
    userId: user?.id,
  });

  const [showMenu, setShowMenu] = useState(false);
  const closeMenu = () => setShowMenu(false);

  const [lastSucceededJobId, setLastSucceededJobId] = useState<string | null>(null);
  const [lastSucceededJobFeedbackAt, setLastSucceededJobFeedbackAt] = useState<string | null>(null);
  const [feedbackSubmittedForJobId, setFeedbackSubmittedForJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !headshot?.id) return;
    getRecentHeadshotJobForImage(user.id, headshot.id).then(({ data: job }) => {
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
  }, [user?.id, headshot?.id]);

  const showFeedbackOverlay = !!(headshot && lastSucceededJobId);
  const feedbackGiven =
    !!lastSucceededJobFeedbackAt || feedbackSubmittedForJobId === lastSucceededJobId;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Headshot"
          leftContent={
            <HeaderActionButton
              label="Back"
              onPress={() => router.back()}
            />
          }
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!headshot) {
    return null;
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <Header
          title="Edit Headshot"
          leftContent={
            <HeaderActionButton
              label="Back"
              onPress={() => router.back()}
            />
          }
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
            iconColor="#34c759"
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
              source={{ uri: headshot.url }}
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
                  console.log('\n╔════════════════════════════════════════════════════════╗');
                  console.log('║         AI IMAGE GENERATION PERFORMANCE BREAKDOWN      ║');
                  console.log('╠════════════════════════════════════════════════════════╣');
                  console.log(`║ Total User Wait:        ${totalUserWait.toFixed(2).padStart(10)} ms ║`);
                  console.log(`║ Backend Processing:     ${backendProcessing.toFixed(2).padStart(10)} ms ║`);
                  console.log(`║ Transfer & Render:      ${transferAndRender.toFixed(2).padStart(10)} ms ║`);
                  console.log('╚════════════════════════════════════════════════════════╝');
                  console.log(`\n[PERF] Transfer & Render is the bottleneck: ${transferAndRender.toFixed(2)}ms\n`);
                } else {
                  console.log('[PERF] Image loaded at:', renderCompleteTime);
                }
              }}
            />
            {showFeedbackOverlay && lastSucceededJobId && (
              <AIGenerationFeedback
                jobId={lastSucceededJobId}
                jobType="headshot_generate"
                onClose={(id) => id != null && setFeedbackSubmittedForJobId(id)}
                compact={feedbackGiven}
              />
            )}
          </View>

          <View style={styles.refineSection}>
            <Text style={styles.sectionTitle}>Refine Your Headshot</Text>
            <Text style={styles.hint}>
              Adjust the prompts and regenerate with the same photo
            </Text>

            <Text style={styles.label}>Hairstyle</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Shoulder-length wavy hair, Short pixie cut"
              value={hairStyle}
              onChangeText={setHairStyle}
              editable={!regenerating}
              multiline
            />
            <Text style={styles.inputHint}>
              Describe your desired hairstyle or leave blank to keep original
            </Text>

            <Text style={styles.label}>Makeup Style</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Natural look, Bold red lips, Smokey eye"
              value={makeupStyle}
              onChangeText={setMakeupStyle}
              editable={!regenerating}
              multiline
            />
            <Text style={styles.inputHint}>
              Describe your desired makeup or leave blank for natural look
            </Text>
          </View>

          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={setAsActive}
            >
              <Ionicons name="checkmark-circle-outline" size={24} color="#34c759" />
              <Text style={styles.actionButtonText}>Set as Active</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, duplicating && styles.actionButtonDisabled]}
              onPress={handleDuplicate}
              disabled={duplicating}
            >
              {duplicating ? (
                <ActivityIndicator color="#007AFF" size="small" />
              ) : (
                <Ionicons name="copy-outline" size={24} color="#007AFF" />
              )}
              <Text style={styles.actionButtonText}>Duplicate</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.generateButton,
              (regenerating || !headshot.originalSelfieId) &&
                styles.generateButtonDisabled,
            ]}
            onPress={handleRegenerate}
            disabled={regenerating || !headshot.originalSelfieId}
          >
            <Ionicons name="sparkles-outline" size={20} color="#fff" />
            <Text style={styles.generateButtonText}>
              {regenerating ? loadingMessage : 'Regenerate'}
            </Text>
          </TouchableOpacity>

          {!headshot.originalSelfieId && (
            <Text style={styles.warningText}>
              Original photo not found. Regeneration unavailable, but you can still
              duplicate this headshot.
            </Text>
          )}
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
            <Text style={styles.deleteModalTitle}>Delete Headshot</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this headshot? This action cannot be
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
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Policy Block Modal */}
      <PolicyBlockModal
        visible={policyModalVisible || localPolicyVisible}
        message={policyMessage || localPolicyMessage}
        onClose={() => {
          closePolicyModal();
          setLocalPolicyVisible(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  refineSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 14,
    color: '#ff9500',
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    marginTop: 16,
  },
  deleteModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  confirmDeleteButton: {
    backgroundColor: '#ff3b30',
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionsSection: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
