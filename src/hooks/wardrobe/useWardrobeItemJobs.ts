import { useState, useEffect, useRef } from 'react';
import {
  triggerWardrobeItemGenerate,
  triggerAIJobExecution,
} from '@/lib/ai-jobs';
import { updateWardrobeItem } from '@/lib/wardrobe';
import { useWardrobeItemPolling } from './useWardrobeItemPolling';
import { setInitialItemData } from '@/lib/wardrobe/initialItemCache';
import { toDataUri } from '@/lib/images/dataUri';
import { logWardrobeAddTiming } from '@/lib/perf/wardrobeAddTiming';

interface UseWardrobeItemJobsProps {
  itemId: string | undefined;
  userId: string | undefined;
  data: {
    item: any;
    allImages: Array<{ id: string; image_id: string; type: string; image: any }>;
    displayImages: Array<{ id: string; image_id: string; type: string; image: any }>;
    refreshImages: () => Promise<void>;
    refreshAttributes: () => Promise<void>;
    loadItemData: () => Promise<void>;
  };
  periodic: {
    startPeriodicImageRefresh: () => void;
    stopPeriodicImageRefresh: () => void;
    startPeriodicAttributeRefresh: () => void;
  };
  cache: {
    setInitialImageDataUri: (value: string | null) => void;
    setInitialTitle: (value: string | null) => void;
    setInitialDescription: (value: string | null) => void;
    setJobSucceededAt: (value: number | null) => void;
    setLastSucceededJobId: (value: string | null) => void;
    setLastSucceededJobFeedbackAt: (value: string | null) => void;
    setLastSucceededJobType: (value: 'wardrobe_item_generate' | 'wardrobe_item_render' | null) => void;
  };
}

export interface WardrobeItemJobControls {
  setProductShotJobId: (jobId: string | null) => void;
  setAutoTagJobId: (jobId: string | null) => void;
  setBatchJobId: (jobId: string | null) => void;
  setRenderJobId: (jobId: string | null) => void;
  setGenerateJobId: (jobId: string | null) => void;
  setIsGeneratingProductShot: (value: boolean) => void;
  setGenerationFailed: (value: boolean) => void;
  stopAllPolling: () => void;
}

export interface WardrobeItemJobsState {
  productShotJobId: string | null;
  autoTagJobId: string | null;
  batchJobId: string | null;
  renderJobId: string | null;
  generateJobId: string | null;
  isGeneratingProductShot: boolean;
  generationFailed: boolean;
  retryGeneration: () => Promise<void>;
  controls: WardrobeItemJobControls;
}

export function useWardrobeItemJobs({
  itemId,
  userId,
  data,
  periodic,
  cache,
}: UseWardrobeItemJobsProps): WardrobeItemJobsState {
  const [isGeneratingProductShot, setIsGeneratingProductShot] = useState(false);
  const [productShotJobId, setProductShotJobId] = useState<string | null>(null);
  const [autoTagJobId, setAutoTagJobId] = useState<string | null>(null);
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [generateJobId, setGenerateJobId] = useState<string | null>(null);
  const [generationFailed, setGenerationFailed] = useState(false);

  const didLogGeneratedFieldsRef = useRef(false);

  const productShotPolling = useWardrobeItemPolling({
    jobId: productShotJobId,
    onComplete: async () => {
      setIsGeneratingProductShot(false);
      await data.refreshImages();
    },
    onError: () => {
      periodic.startPeriodicImageRefresh();
    },
    onTimeout: () => {
      periodic.startPeriodicImageRefresh();
    },
    timeout: 60000,
    interval: 2000,
    logPrefix: '[ProductShot]',
  });

  const autoTagPolling = useWardrobeItemPolling({
    jobId: autoTagJobId,
    onComplete: async () => {
      await data.refreshAttributes();
    },
    onError: () => {
      periodic.startPeriodicAttributeRefresh();
    },
    onTimeout: () => {
      periodic.startPeriodicAttributeRefresh();
    },
    timeout: 60000,
    interval: 2000,
    logPrefix: '[AutoTag]',
  });

  const batchJobPolling = useWardrobeItemPolling({
    jobId: batchJobId,
    onComplete: async () => {
      setIsGeneratingProductShot(false);
      await data.refreshImages();
      await data.refreshAttributes();
    },
    onError: () => {
      periodic.startPeriodicImageRefresh();
      periodic.startPeriodicAttributeRefresh();
    },
    onTimeout: () => {
      periodic.startPeriodicImageRefresh();
      periodic.startPeriodicAttributeRefresh();
    },
    timeout: 90000,
    interval: 2000,
    logPrefix: '[BatchJob]',
  });

  const renderJobPolling = useWardrobeItemPolling({
    jobId: renderJobId,
    onComplete: async (job) => {
      setIsGeneratingProductShot(false);
      if (job?.status === 'succeeded') {
        cache.setLastSucceededJobId(job.id);
        cache.setLastSucceededJobFeedbackAt(
          (job as { feedback_at?: string | null }).feedback_at ?? null
        );
        cache.setLastSucceededJobType('wardrobe_item_render');
      }
      await data.refreshImages();
    },
    onError: () => periodic.startPeriodicImageRefresh(),
    onTimeout: () => periodic.startPeriodicImageRefresh(),
    timeout: 60000,
    interval: 2000,
    logPrefix: '[WardrobeItemRender]',
  });

  const generateJobPolling = useWardrobeItemPolling({
    jobId: generateJobId,
    interval: 800,
    onJobUpdate: (job) => {
      logWardrobeAddTiming('job_status_transition', { status: job.status, jobId: job.id });
      const result = job.result as
        | {
            base64_result?: string;
            mime_type?: string;
            suggested_title?: string;
            suggested_notes?: string;
          }
        | undefined;

      if (result?.base64_result && itemId) {
        logWardrobeAddTiming('first_set_initialImageDataUri_from_base64', { jobId: job.id });
        cache.setInitialImageDataUri(toDataUri(result.base64_result, result.mime_type));
        cache.setJobSucceededAt(Date.now());

        if (result.suggested_title != null) cache.setInitialTitle(result.suggested_title);
        if (result.suggested_notes != null) cache.setInitialDescription(result.suggested_notes);

        if (
          (result.suggested_title != null || result.suggested_notes != null) &&
          !didLogGeneratedFieldsRef.current
        ) {
          didLogGeneratedFieldsRef.current = true;
          if (__DEV__) {
            console.log('[WardrobeItemGenerate] first time generated fields available', {
              jobId: job.id,
              itemId,
            });
          }
        }
      }
    },
    onComplete: async (job) => {
      setIsGeneratingProductShot(false);
      setGenerationFailed(false);

      if (job?.status === 'succeeded') {
        cache.setLastSucceededJobId(job.id);
        cache.setLastSucceededJobFeedbackAt(
          (job as { feedback_at?: string | null }).feedback_at ?? null
        );
        cache.setLastSucceededJobType('wardrobe_item_generate');
      }

      if (job?.status === 'succeeded' && job?.result && itemId && userId) {
        const result = job.result as {
          base64_result?: string;
          mime_type?: string;
          suggested_title?: string;
          suggested_notes?: string;
        };

        if (result.suggested_title != null) cache.setInitialTitle(result.suggested_title);
        if (result.suggested_notes != null) cache.setInitialDescription(result.suggested_notes);

        setInitialItemData(
          itemId,
          job.id,
          toDataUri(result.base64_result ?? '', result.mime_type),
          Date.now(),
          undefined,
          result.suggested_title,
          result.suggested_notes
        );

        const title = result.suggested_title ?? data.item?.title ?? '';
        const description = result.suggested_notes ?? data.item?.description ?? '';
        const { error: updateError } = await updateWardrobeItem(itemId, userId, {
          title,
          description,
        });

        if (updateError) {
          console.error('[WardrobeItemGenerate] updateWardrobeItem failed', updateError);
        } else if (__DEV__) {
          console.log('[WardrobeItemGenerate] item updated', { itemId, jobId: job.id });
        }

        await data.loadItemData();
        if (__DEV__) {
          console.log('[WardrobeItemGenerate] generation finished', { itemId, jobId: job.id });
        }
      }

      await data.refreshImages();
      logWardrobeAddTiming('refreshImages_completion', { itemId });
      await data.refreshAttributes();
    },
    onError: () => {
      setIsGeneratingProductShot(false);
      setGenerationFailed(true);
      if (__DEV__) {
        console.log('[WardrobeItemGenerate] generation failed', { itemId, jobId: generateJobId });
      }
      periodic.startPeriodicImageRefresh();
      periodic.startPeriodicAttributeRefresh();
    },
    onTimeout: () => {
      setIsGeneratingProductShot(false);
      setGenerationFailed(true);
      if (__DEV__) {
        console.log('[WardrobeItemGenerate] generation failed (timeout)', {
          itemId,
          jobId: generateJobId,
        });
      }
      periodic.startPeriodicImageRefresh();
      periodic.startPeriodicAttributeRefresh();
    },
    timeout: 90000,
    logPrefix: '[WardrobeItemGenerate]',
  });

  const productShotPollingRef = useRef(productShotPolling);
  const autoTagPollingRef = useRef(autoTagPolling);
  const batchJobPollingRef = useRef(batchJobPolling);
  const renderJobPollingRef = useRef(renderJobPolling);
  const generateJobPollingRef = useRef(generateJobPolling);

  productShotPollingRef.current = productShotPolling;
  autoTagPollingRef.current = autoTagPolling;
  batchJobPollingRef.current = batchJobPolling;
  renderJobPollingRef.current = renderJobPolling;
  generateJobPollingRef.current = generateJobPolling;

  const stopAllPolling = () => {
    productShotPollingRef.current.stopPolling();
    autoTagPollingRef.current.stopPolling();
    batchJobPollingRef.current.stopPolling();
    renderJobPollingRef.current.stopPolling();
    generateJobPollingRef.current.stopPolling();
  };

  const retryGeneration = async () => {
    if (!userId || !itemId) return;
    const sourceImageId = data.allImages?.[0]?.image_id;

    if (!sourceImageId) {
      if (__DEV__) {
        console.warn('[WardrobeItemGenerate] retry skipped: no source image', { itemId });
      }
      return;
    }

    setGenerationFailed(false);
    didLogGeneratedFieldsRef.current = false;

    const { data: generateJob, error: generateError } = await triggerWardrobeItemGenerate(
      userId,
      itemId,
      sourceImageId
    );

    if (generateError || !generateJob) {
      console.error('[WardrobeItemGenerate] retry job creation failed', generateError);
      setGenerationFailed(true);
      return;
    }

    if (__DEV__) {
      console.log('[WardrobeItemGenerate] jobId started (retry)', { itemId, jobId: generateJob.id });
    }
    setGenerateJobId(generateJob.id);
    setIsGeneratingProductShot(true);

    const { error: execError } = await triggerAIJobExecution(generateJob.id);
    if (execError && __DEV__) {
            if (__DEV__) {
        console.warn('[WardrobeItemGenerate] retry trigger error', execError);
      }
    }
  };

  useEffect(() => {
    if (productShotJobId) {
      productShotPollingRef.current.startPolling();
    } else {
      productShotPollingRef.current.stopPolling();
    }
    return () => productShotPollingRef.current.stopPolling();
  }, [productShotJobId]);

  useEffect(() => {
    if (autoTagJobId) {
      autoTagPollingRef.current.startPolling();
    } else {
      autoTagPollingRef.current.stopPolling();
    }
    return () => autoTagPollingRef.current.stopPolling();
  }, [autoTagJobId]);

  useEffect(() => {
    if (batchJobId) {
      batchJobPollingRef.current.startPolling();
    } else {
      batchJobPollingRef.current.stopPolling();
    }
    return () => batchJobPollingRef.current.stopPolling();
  }, [batchJobId]);

  useEffect(() => {
    if (renderJobId) {
      renderJobPollingRef.current.startPolling();
    } else {
      renderJobPollingRef.current.stopPolling();
    }
    return () => renderJobPollingRef.current.stopPolling();
  }, [renderJobId]);

  useEffect(() => {
    if (generateJobId) {
      generateJobPollingRef.current.startPolling();
    } else {
      generateJobPollingRef.current.stopPolling();
    }
    return () => generateJobPollingRef.current.stopPolling();
  }, [generateJobId]);

  useEffect(() => {
    const hasProductShot = data.displayImages.some((img) => img.type === 'product_shot');
    if (hasProductShot && isGeneratingProductShot) {
      setIsGeneratingProductShot(false);
      periodic.stopPeriodicImageRefresh();
    }
  }, [data.displayImages, isGeneratingProductShot]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    productShotJobId,
    autoTagJobId,
    batchJobId,
    renderJobId,
    generateJobId,
    isGeneratingProductShot,
    generationFailed,
    retryGeneration,
    controls: {
      setProductShotJobId,
      setAutoTagJobId,
      setBatchJobId,
      setRenderJobId,
      setGenerateJobId,
      setIsGeneratingProductShot,
      setGenerationFailed,
      stopAllPolling,
    },
  };
}
