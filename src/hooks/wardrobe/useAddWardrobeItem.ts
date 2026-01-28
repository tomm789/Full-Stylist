/**
 * useAddWardrobeItem Hook
 * Form state and handlers for adding a new wardrobe item
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { useWardrobe } from './useWardrobe';
import { useAIJobPolling } from '@/hooks/ai';
import { createWardrobeItem } from '@/lib/wardrobe';
import { triggerBatchJob, triggerAIJobExecution } from '@/lib/ai-jobs';

interface SelectedImage {
  uri: string;
  type: string;
  name: string;
}

interface UseAddWardrobeItemReturn {
  // Images
  selectedImages: SelectedImage[];
  setSelectedImages: (images: SelectedImage[]) => void;
  handleTakePhoto: () => Promise<void>;
  handleUploadPhoto: () => Promise<void>;
  removeImage: (index: number) => void;

  // Cropper
  cropperVisible: boolean;
  cropperImageUri: string | null;
  handleCropperCancel: () => void;
  handleCropperDone: (blob: Blob, fileName: string) => void;

  // Submission
  loading: boolean;
  generatingAI: boolean;
  analysisStep: string;
  aiError: string | null;
  handleSubmit: () => Promise<void>;

  // Wardrobe
  wardrobeId: string | null;
  wardrobeLoading: boolean;
}

export function useAddWardrobeItem(): UseAddWardrobeItemReturn {
  const router = useRouter();
  const { user } = useAuth();
  const { wardrobeId, loading: wardrobeLoading } = useWardrobe(user?.id);

  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Cropper state
  const [cropperVisible, setCropperVisible] = useState(false);
  const [cropperImageUri, setCropperImageUri] = useState<string | null>(null);

  // Poll AI job for completion
  console.log('[useAddWardrobeItem] useAIJobPolling hook render:', {
    aiJobId,
    generatingAI,
    enabled: !!aiJobId && generatingAI,
  });
  
  const { job: aiJob } = useAIJobPolling({
    jobId: aiJobId,
    enabled: !!aiJobId && generatingAI,
    onComplete: (job) => {
      console.log('[useAddWardrobeItem] onComplete callback triggered:', {
        jobId: job.id,
        jobType: job.job_type,
        status: job.status,
        hasResult: !!job.result,
      });
      if (job.status === 'succeeded' && pendingItemId) {
        // Handle batch job results
        if (job.job_type === 'batch') {
          // Extract product_shot result from batch job
          const batchResult = job.result;
          const productShotResult = batchResult?.product_shot;
          const autoTagResult = batchResult?.auto_tag;
          
          // Log for debugging
          console.log('[BatchJob] Job completed:', {
            hasProductShot: !!productShotResult,
            hasAutoTag: !!autoTagResult,
            productShotResult,
            autoTagResult,
            fullResult: batchResult,
          });
          
          // Check if product_shot succeeded
          // Success is indicated by having image_id and storage_key, or by not having an error field
          const productShotSucceeded = productShotResult && 
            !productShotResult.error && 
            (productShotResult.image_id || productShotResult.storage_key);
          
          if (productShotSucceeded) {
            // Product shot succeeded - update UI immediately
            setAnalysisStep('Product shot generated successfully');
            // The backend has already applied the product shot to the database,
            // so we just need to redirect to see it
            setTimeout(() => {
              setGeneratingAI(false);
              // Use replace with refresh param to force reload of the item page
              router.replace(`/wardrobe/item/${pendingItemId}?refresh=${Date.now()}`);
            }, 800);
          } else if (productShotResult?.error) {
            // Product shot failed
            setAiError(`Product shot generation failed: ${productShotResult.error}`);
            setGeneratingAI(false);
          } else {
            // No product shot result or unexpected structure
            console.warn('[BatchJob] No valid product_shot result found in batch job', {
              batchResult,
              productShotResult,
            });
            // Still redirect - the item detail page will handle refreshing
            setTimeout(() => {
              setGeneratingAI(false);
              router.replace(`/wardrobe/item/${pendingItemId}`);
            }, 800);
          }
        } else {
          // Handle non-batch jobs (legacy support)
          setTimeout(() => {
            setGeneratingAI(false);
            router.replace(`/wardrobe/item/${pendingItemId}`);
          }, 800);
        }
      } else if (job.status === 'failed') {
        // Check if it's a batch job with partial results
        if (job.job_type === 'batch' && job.result) {
          const batchResult = job.result;
          const productShotResult = batchResult?.product_shot;
          
          // Even if the overall job failed, check if product_shot succeeded
          if (productShotResult && !productShotResult.error) {
            console.log('[BatchJob] Job marked as failed but product_shot succeeded');
            setAnalysisStep('Product shot generated (some tasks may have failed)');
            setTimeout(() => {
              setGeneratingAI(false);
              router.replace(`/wardrobe/item/${pendingItemId}`);
            }, 800);
          } else {
            setAiError('Sorry, the item failed to add to your wardrobe.');
          }
        } else {
          setAiError('Sorry, the item failed to add to your wardrobe.');
        }
      }
    },
    onError: () => {
      setAiError('Sorry, the item failed to add to your wardrobe.');
    },
  });

  // Update analysis step based on AI job progress
  useEffect(() => {
    if (!aiJob || !generatingAI) return;

    if (aiJob.status === 'running') {
      setAnalysisStep('Analyzing your image...');
    } else if (aiJob.status === 'succeeded') {
      setAnalysisStep('Adding item to your wardrobe');
    }
  }, [aiJob, generatingAI]);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera permissions');
      return;
    }

    const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes,
      allowsEditing: false, // We'll handle cropping in our cropper
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Show cropper modal on web, or directly add on native
      if (Platform.OS === 'web') {
        setCropperImageUri(result.assets[0].uri);
        setCropperVisible(true);
      } else {
        // On native, add directly (cropper not available)
        const newImage = {
          uri: result.assets[0].uri,
          type: result.assets[0].type || 'image/jpeg',
          name: result.assets[0].fileName || `photo-${Date.now()}.jpg`,
        };
        setSelectedImages((prev) => [...prev, newImage]);
      }
    }
  }, []);

  const handleUploadPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions');
      return;
    }

    const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsMultipleSelection: Platform.OS !== 'web', // Single selection on web to show cropper
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      if (Platform.OS === 'web' && result.assets.length > 0) {
        // On web, show cropper for first image
        // For multiple images, we'd need to queue them, but for now handle one at a time
        setCropperImageUri(result.assets[0].uri);
        setCropperVisible(true);
      } else {
        // On native or if multiple selection, add directly
        const newImages = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `image-${Date.now()}.jpg`,
        }));
        setSelectedImages((prev) => [...prev, ...newImages]);
      }
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCropperCancel = useCallback(() => {
    setCropperVisible(false);
    setCropperImageUri(null);
  }, []);

  const handleCropperDone = useCallback((blob: Blob, fileName: string) => {
    // Convert blob to data URI for React Native compatibility
    if (Platform.OS === 'web') {
      // On web, create object URL from blob
      const objectUrl = URL.createObjectURL(blob);
      const newImage: SelectedImage = {
        uri: objectUrl,
        type: 'image/jpeg',
        name: fileName,
      };
      setSelectedImages((prev) => [...prev, newImage]);
    } else {
      // On native, convert blob to data URI
      blob.arrayBuffer().then((buffer) => {
        const bytes = new Uint8Array(buffer);
        const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
        const base64 = btoa(binary);
        const dataUri = `data:image/jpeg;base64,${base64}`;
        const newImage: SelectedImage = {
          uri: dataUri,
          type: 'image/jpeg',
          name: fileName,
        };
        setSelectedImages((prev) => [...prev, newImage]);
      });
    }
    
    setCropperVisible(false);
    setCropperImageUri(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user || !wardrobeId) {
      Alert.alert('Error', 'Please sign in to add items');
      return;
    }

    if (selectedImages.length === 0) {
      Alert.alert('Error', 'Please select at least one image');
      return;
    }

    setLoading(true);
    setAiError(null);

    try {
      // Create item with placeholder title
      const { data, error } = await createWardrobeItem(
        user.id,
        wardrobeId,
        {
          title: 'New Item',
          description: undefined,
          category_id: undefined,
          subcategory_id: undefined,
          visibility_override: 'inherit',
        },
        selectedImages
      );

      if (error) {
        Alert.alert('Error', error.message || 'Failed to create item');
        setLoading(false);
        return;
      }

      if (data?.item && data?.images && data.images.length > 0) {
        const itemId = data.item.id;
        const imageIds = data.images.map((img: any) => img.image_id);

        setPendingItemId(itemId);
        setGeneratingAI(true);
        setAnalysisStep('Preparing item...');

        // Trigger batch job (product_shot + auto_tag) - single request, shared image download
        console.log('[useAddWardrobeItem] Creating batch job...', {
          userId: user.id,
          imageId: imageIds[0],
          itemId,
          imageIds,
        });
        
        const { data: batchJob, error: batchError } = await triggerBatchJob(
          user.id,
          imageIds[0],
          itemId,
          imageIds
        );

        if (batchError || !batchJob) {
          console.error('[useAddWardrobeItem] Batch job creation failed:', batchError);
          throw new Error(batchError?.message || 'Failed to create batch job');
        }

        console.log('[useAddWardrobeItem] Batch Job Started:', batchJob.id, {
          jobId: batchJob.id,
          jobType: batchJob.job_type,
          status: batchJob.status,
          input: batchJob.input,
        });

        // Set the job ID for polling
        console.log('[useAddWardrobeItem] Setting aiJobId state to:', batchJob.id);
        setAiJobId(batchJob.id);
        
        // Log current state values for debugging
        console.log('[useAddWardrobeItem] State after setAiJobId:', {
          aiJobId: batchJob.id, // This will be the new value
          generatingAI,
          pendingItemId: itemId,
        });

        // Trigger job execution
        console.log('[useAddWardrobeItem] Triggering job execution for:', batchJob.id);
        const { error: execError } = await triggerAIJobExecution(batchJob.id);
        
        if (execError) {
          console.warn('[useAddWardrobeItem] Job trigger returned error (may still work):', execError);
          // Continue anyway - job might still be triggered
        } else {
          console.log('[useAddWardrobeItem] Job execution triggered successfully');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [user, wardrobeId, selectedImages, router]);

  return {
    // Images
    selectedImages,
    setSelectedImages,
    handleTakePhoto,
    handleUploadPhoto,
    removeImage,

    // Cropper
    cropperVisible,
    cropperImageUri,
    handleCropperCancel,
    handleCropperDone,

    // Submission
    loading,
    generatingAI,
    analysisStep,
    aiError,
    handleSubmit,

    // Wardrobe
    wardrobeId,
    wardrobeLoading,
  };
}
