import { supabase } from '../supabase';
import { updateUserSettings } from '../settings';
import { getActiveJob, type AIJob } from './core';
import { triggerAIJobExecution } from './execution';
import { triggerBodyShotGenerate } from './types';

type SyncStatus =
  | 'no_active_body'
  | 'reused_existing'
  | 'already_generating'
  | 'generation_started'
  | 'error';

export interface SyncActiveHeadshotBodyshotResult {
  status: SyncStatus;
  imageId?: string;
  jobId?: string;
  sourceBodyImageId?: string;
  message?: string;
}

function getInputValue(job: AIJob, key: string): string | null {
  try {
    const input = job.input as Record<string, unknown> | undefined;
    const value = input?.[key];
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

function getResultImageId(job: AIJob): string | null {
  try {
    const result = job.result as Record<string, unknown> | undefined;
    const value =
      result?.image_id ??
      result?.generated_image_id ??
      result?.output_image_id;
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

async function findFirstReusableBodyshotForHeadshot(
  userId: string,
  headshotImageId: string,
  sourceBodyImageId: string
): Promise<{ imageId: string; jobId: string } | null> {
  const { data: jobs, error } = await supabase
    .from('ai_jobs')
    .select('id, input, result, created_at')
    .eq('job_type', 'body_shot_generate')
    .eq('owner_user_id', userId)
    .eq('status', 'succeeded')
    .order('created_at', { ascending: true })
    .limit(500);

  if (error || !jobs?.length) {
    return null;
  }

  const candidates = (jobs as AIJob[])
    .filter(
      (job) =>
        getInputValue(job, 'headshot_image_id') === headshotImageId &&
        getInputValue(job, 'body_photo_image_id') === sourceBodyImageId
    )
    .map((job) => {
      const imageId = getResultImageId(job);
      return imageId ? { imageId, jobId: job.id } : null;
    })
    .filter((item): item is { imageId: string; jobId: string } => item !== null);

  if (candidates.length === 0) {
    return null;
  }

  const uniqueImageIds = Array.from(new Set(candidates.map((item) => item.imageId)));
  const { data: existingImages } = await supabase
    .from('images')
    .select('id')
    .in('id', uniqueImageIds);
  const existingImageIds = new Set((existingImages || []).map((img: any) => img.id));

  return candidates.find((item) => existingImageIds.has(item.imageId)) || null;
}

export async function syncBodyshotAfterActiveHeadshotSet(
  userId: string,
  headshotImageId: string
): Promise<SyncActiveHeadshotBodyshotResult> {
  try {
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('body_shot_image_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (settingsError) {
      return {
        status: 'error',
        message: settingsError.message || 'Failed to load user settings',
      };
    }

    const activeBodyImageId = settings?.body_shot_image_id || null;
    if (!activeBodyImageId) {
      return { status: 'no_active_body' };
    }

    // Reuse the first generated bodyshot for this headshot when available.
    const reusable = await findFirstReusableBodyshotForHeadshot(
      userId,
      headshotImageId,
      activeBodyImageId
    );
    if (reusable) {
      if (activeBodyImageId !== reusable.imageId) {
        const { error: updateError } = await updateUserSettings(userId, {
          body_shot_image_id: reusable.imageId,
        });
        if (updateError) {
          return {
            status: 'error',
            message: updateError.message || 'Failed to set reused bodyshot',
          };
        }
      }

      return {
        status: 'reused_existing',
        imageId: reusable.imageId,
        jobId: reusable.jobId,
        sourceBodyImageId: activeBodyImageId,
      };
    }

    const { data: activePairJob, error: activeJobError } = await getActiveJob(
      userId,
      'body_shot_generate',
      (job) =>
        getInputValue(job, 'headshot_image_id') === headshotImageId &&
        getInputValue(job, 'body_photo_image_id') === activeBodyImageId
    );

    if (activeJobError) {
      return {
        status: 'error',
        message: activeJobError.message || 'Failed to check active bodyshot jobs',
      };
    }

    if (activePairJob) {
      return {
        status: 'already_generating',
        jobId: activePairJob.id,
        sourceBodyImageId: activeBodyImageId,
      };
    }

    const { data: job, error: createError } = await triggerBodyShotGenerate(
      userId,
      activeBodyImageId,
      headshotImageId
    );

    if (createError || !job) {
      return {
        status: 'error',
        message: createError?.message || 'Failed to create bodyshot generation job',
      };
    }

    const { error: triggerError } = await triggerAIJobExecution(job.id);
    if (triggerError) {
      return {
        status: 'error',
        message: triggerError.message || 'Failed to start bodyshot generation',
      };
    }

    return {
      status: 'generation_started',
      jobId: job.id,
      sourceBodyImageId: activeBodyImageId,
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error?.message || 'Unknown error while syncing bodyshot',
    };
  }
}
