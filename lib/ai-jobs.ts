import { supabase } from './supabase';
import { SUPABASE_CONFIG } from './supabase';

const activePollingJobs = new Set<string>();
const failureCountByJob = new Map<string, number>();
const CIRCUIT_BREAKER_THRESHOLD = 5;

export interface AIJob {
  id: string;
  owner_user_id: string;
  job_type: 'auto_tag' | 'product_shot' | 'headshot_generate' | 'body_shot_generate' | 'outfit_suggest' | 'reference_match' | 'outfit_render' | 'lookbook_generate';
  input: any;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create an AI job (client creates, server processes)
 */
export async function createAIJob(
  userId: string,
  jobType: 'auto_tag' | 'product_shot' | 'headshot_generate' | 'body_shot_generate' | 'outfit_suggest' | 'reference_match' | 'outfit_render' | 'lookbook_generate',
  input: any
): Promise<{
  data: AIJob | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from('ai_jobs')
    .insert({
      owner_user_id: userId,
      job_type: jobType,
      input,
      status: 'queued',
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Get AI job by ID
 */
export async function getAIJob(jobId: string): Promise<{
  data: AIJob | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from('ai_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  return { data, error };
}

/**
 * Poll AI job status
 */
export async function pollAIJob(
  jobId: string,
  maxAttempts: number = SUPABASE_CONFIG.DEV_MODE ? 30 : 60,
  initialIntervalMs: number = 2000
): Promise<{
  data: AIJob | null;
  error: any;
}> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:pollAIJob',message:'pollAIJob entry',data:{jobId,maxAttempts,alreadyPolling:activePollingJobs.has(jobId),failureCount:failureCountByJob.get(jobId)||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H4'})}).catch(()=>{});
  // #endregion
  if (activePollingJobs.has(jobId)) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:pollAIJob',message:'skip: already polled',data:{jobId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    return { data: null, error: new Error('Job already being polled') };
  }

  const failureCount = failureCountByJob.get(jobId) || 0;
  if (failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:pollAIJob',message:'skip: circuit breaker',data:{jobId,failureCount},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    return { data: null, error: new Error('Circuit breaker open: too many failures') };
  }

  activePollingJobs.add(jobId);

  try {
    let intervalMs = initialIntervalMs;
    const maxIntervalMs = 10000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:pollAIJob',message:'before getAIJob',data:{jobId,attempt,maxAttempts},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      const { data, error } = await getAIJob(jobId);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:pollAIJob',message:'after getAIJob',data:{jobId,attempt,status:data?.status||'null',hasError:!!error,errorMsg:error?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion

      if (error) {
        failureCountByJob.set(jobId, failureCount + 1);
        return { data: null, error };
      }

      if (!data) {
        failureCountByJob.set(jobId, failureCount + 1);
        return { data: null, error: new Error('Job not found') };
      }

      if (data.status === 'succeeded') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:pollAIJob',message:'job succeeded',data:{jobId,attempt,status:data.status,result:data.result?JSON.stringify(data.result).substring(0,100):'null'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        failureCountByJob.delete(jobId);
        return { data, error: null };
      }

      if (data.status === 'failed') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:pollAIJob',message:'job failed',data:{jobId,attempt,status:data.status,error:data.error||'null'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        failureCountByJob.set(jobId, failureCount + 1);
        return { data, error: null };
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:pollAIJob',message:'job still in progress',data:{jobId,attempt,maxAttempts,status:data.status,intervalMs,willContinue:attempt<maxAttempts-1},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3'})}).catch(()=>{});
      // #endregion

      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        intervalMs = Math.min(intervalMs * 2, maxIntervalMs);
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:pollAIJob',message:'pollAIJob exit timeout',data:{jobId,maxAttempts},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    return { data: null, error: new Error('Polling timeout') };
  } finally {
    activePollingJobs.delete(jobId);
  }
}

/**
 * Trigger auto_tag job for wardrobe item
 * This creates the job and optionally triggers the Netlify function
 */
export async function triggerAutoTag(
  userId: string,
  wardrobeItemId: string,
  imageIds: string[],
  category: string | null,
  subcategory?: string | null
): Promise<{
  data: AIJob | null;
  error: any;
}> {
  // Create the AI job
  const { data: job, error } = await createAIJob(userId, 'auto_tag', {
    wardrobe_item_id: wardrobeItemId,
    image_ids: imageIds,
    category: category || null,
    subcategory: subcategory || null,
  });

  if (error || !job) {
    return { data: null, error };
  }

  // Trigger Netlify function to process the job
  // In production, this would call the Netlify function endpoint
  // For now, we'll just create the job and the server will poll/process it
  // You may want to set up a webhook or server-side job processor

  return { data: job, error: null };
}

/**
 * Apply auto_tag results to wardrobe item
 * Called after AI job completes successfully
 */
export async function applyAutoTagResults(
  wardrobeItemId: string,
  result: {
    attributes: Array<{
      key: string;
      values: Array<{ value: string; confidence?: number }>;
    }>;
    suggested_title?: string;
    suggested_notes?: string;
  }
): Promise<{
  success: boolean;
  error: any;
}> {
  try {
    // Import here to avoid circular dependency
    const { createEntityAttributesFromAutoTag } = await import('./attributes');

    // Create entity attributes
    const { errors } = await createEntityAttributesFromAutoTag(
      'wardrobe_item',
      wardrobeItemId,
      result.attributes
    );

    if (errors.length > 0) {
      console.warn('Some attributes failed to create:', errors);
    }

    // Update wardrobe item with suggested fields if provided
    const updates: any = {};
    if (result.suggested_title) {
      updates.title = result.suggested_title;
    }
    if (result.suggested_notes) {
      updates.description = result.suggested_notes;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('wardrobe_items')
        .update(updates)
        .eq('id', wardrobeItemId);

      if (updateError) {
        return { success: false, error: updateError };
      }
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error };
  }
}

/**
 * Trigger product_shot job for wardrobe item
 */
export async function triggerProductShot(
  userId: string,
  imageId: string,
  wardrobeItemId: string
): Promise<{
  data: AIJob | null;
  error: any;
}> {
  return createAIJob(userId, 'product_shot', {
    image_id: imageId,
    wardrobe_item_id: wardrobeItemId
  });
}

/**
 * Trigger headshot_generate job from selfie
 */
export async function triggerHeadshotGenerate(
  userId: string,
  selfieImageId: string,
  hairStyle?: string,
  makeupStyle?: string
): Promise<{
  data: AIJob | null;
  error: any;
}> {
  return createAIJob(userId, 'headshot_generate', {
    selfie_image_id: selfieImageId,
    hair_style: hairStyle,
    makeup_style: makeupStyle
  });
}

/**
 * Trigger body_shot_generate job to create studio model
 * This combines the user's generated headshot with their body photo
 * @param headshotImageId Optional headshot to use. If not provided, uses active headshot from user_settings
 */
export async function triggerBodyShotGenerate(
  userId: string,
  bodyPhotoImageId: string,
  headshotImageId?: string
): Promise<{
  data: AIJob | null;
  error: any;
}> {
  const input: any = {
    body_photo_image_id: bodyPhotoImageId
  };
  
  // Include headshot_image_id if provided
  if (headshotImageId) {
    input.headshot_image_id = headshotImageId;
  }
  
  return createAIJob(userId, 'body_shot_generate', input);
}

/**
 * Get active product_shot job for a wardrobe item
 */
export async function getActiveProductShotJob(wardrobeItemId: string, userId: string): Promise<{
  data: AIJob | null;
  error: any;
}> {
  // Query for product_shot jobs - filter client-side since JSON field queries
  // may not work reliably with Supabase JS client
  const { data, error } = await supabase
    .from('ai_jobs')
    .select('*')
    .eq('job_type', 'product_shot')
    .in('status', ['queued', 'running'])
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10); // Get recent jobs and filter client-side

  if (error) {
    return { data: null, error };
  }

  if (!data || data.length === 0) {
    return { data: null, error: null };
  }

  // Filter by wardrobe_item_id from input JSON
  const matchingJob = data.find((job) => {
    try {
      const input = job.input as any;
      return input?.wardrobe_item_id === wardrobeItemId;
    } catch {
      return false;
    }
  });

  return { data: matchingJob || null, error: null };
}

/**
 * Get recently completed product_shot job for a wardrobe item (within last 60 seconds)
 * Useful when job completes very quickly before polling starts
 */
export async function getRecentProductShotJob(wardrobeItemId: string, userId: string): Promise<{
  data: AIJob | null;
  error: any;
}> {
  const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
  
  // Query for recently completed product_shot jobs
  const { data, error } = await supabase
    .from('ai_jobs')
    .select('*')
    .eq('job_type', 'product_shot')
    .in('status', ['succeeded', 'failed'])
    .eq('owner_user_id', userId)
    .gte('updated_at', sixtySecondsAgo)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    return { data: null, error };
  }

  if (!data || data.length === 0) {
    return { data: null, error: null };
  }

  // Filter by wardrobe_item_id from input JSON
  const matchingJob = data.find((job) => {
    try {
      const input = job.input as any;
      return input?.wardrobe_item_id === wardrobeItemId;
    } catch {
      return false;
    }
  });

  return { data: matchingJob || null, error: null };
}

/**
 * Get active outfit_render job for an outfit
 */
export async function getActiveOutfitRenderJob(outfitId: string, userId: string): Promise<{
  data: AIJob | null;
  error: any;
}> {
  // Query for outfit_render jobs - filter client-side since JSON field queries
  // may not work reliably with Supabase JS client
  const { data, error } = await supabase
    .from('ai_jobs')
    .select('*')
    .eq('job_type', 'outfit_render')
    .in('status', ['queued', 'running'])
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return { data: null, error };
  }

  if (!data || data.length === 0) {
    return { data: null, error: null };
  }

  // Filter by outfit_id from input JSON
  const matchingJob = data.find((job) => {
    try {
      const input = job.input as any;
      return input?.outfit_id === outfitId;
    } catch {
      return false;
    }
  });

  return { data: matchingJob || null, error: null };
}

/**
 * Get recently completed outfit_render job for an outfit (within last 60 seconds)
 * Useful when job completes very quickly before polling starts
 */
export async function getRecentOutfitRenderJob(outfitId: string, userId: string): Promise<{
  data: AIJob | null;
  error: any;
}> {
  const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
  
  // Query for recently completed outfit_render jobs
  const { data, error } = await supabase
    .from('ai_jobs')
    .select('*')
    .eq('job_type', 'outfit_render')
    .in('status', ['succeeded', 'failed'])
    .eq('owner_user_id', userId)
    .gte('updated_at', sixtySecondsAgo)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    return { data: null, error };
  }

  if (!data || data.length === 0) {
    return { data: null, error: null };
  }

  // Filter by outfit_id from input JSON
  const matchingJob = data.find((job) => {
    try {
      const input = job.input as any;
      return input?.outfit_id === outfitId;
    } catch {
      return false;
    }
  });

  return { data: matchingJob || null, error: null };
}

/**
 * Trigger AI job execution by calling Netlify function
 */
export async function triggerAIJobExecution(jobId: string): Promise<{ error: any }> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:triggerAIJobExecution',message:'trigger entry',data:{jobId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  try {
    // Get current session for auth token
    const { data: { session } } = await supabase.auth.getSession();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:triggerAIJobExecution',message:'after getSession',data:{jobId,hasSession:!!session},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    if (!session) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:triggerAIJobExecution',message:'no session, returning error',data:{jobId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      return { error: new Error('No active session') };
    }

    // Determine the Netlify function URL
    // In development, use the Netlify dev server URL; in production, use relative path
    const isDev = process.env.NODE_ENV === 'development' || __DEV__;
    let baseUrl = '';
    if (isDev) {
      // Allow environment variable to override for physical devices (set to network IP, e.g., http://192.168.1.100:8888)
      baseUrl = process.env.EXPO_PUBLIC_NETLIFY_DEV_URL || 'http://localhost:8888';
    } else {
      // In production, use relative URL or production domain
      baseUrl = process.env.EXPO_PUBLIC_NETLIFY_URL || '';
    }
    const functionUrl = `${baseUrl}/.netlify/functions/ai-job-runner`;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:triggerAIJobExecution',message:'URL resolution',data:{jobId,isDev,baseUrl,functionUrl,hasExpoPublicNetlifyUrl:!!process.env.EXPO_PUBLIC_NETLIFY_URL,hasExpoPublicNetlifyDevUrl:!!process.env.EXPO_PUBLIC_NETLIFY_DEV_URL,nodeEnv:process.env.NODE_ENV},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H3'})}).catch(()=>{});
    // #endregion

    // Call Netlify function to process the job (fire-and-forget with short timeout)
    // We don't wait for the response since outfit rendering can take 60+ seconds
    // Instead, we'll poll the job status separately
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:triggerAIJobExecution',message:'before fetch to function',data:{jobId,functionUrl},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H3'})}).catch(()=>{});
    // #endregion
    fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ job_id: jobId }),
      // @ts-ignore - React Native fetch doesn't support signal in the same way
      signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
    }).then(async (response) => {
      // #region agent log
      const responseText = await response.text().catch(() => 'could not read response');
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:triggerAIJobExecution',message:'fetch response received',data:{jobId,status:response.status,ok:response.ok,statusText:response.statusText,responseText:responseText.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H3'})}).catch(()=>{});
      // #endregion
      if (!response.ok) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:triggerAIJobExecution',message:'fetch response not ok',data:{jobId,status:response.status,statusText:response.statusText},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H3'})}).catch(()=>{});
        // #endregion
      }
      return response;
    }).catch((error) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:triggerAIJobExecution',message:'fetch error caught',data:{jobId,errorMsg:error?.message,errorName:error?.name,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H3'})}).catch(()=>{});
      // #endregion
      // Ignore timeout errors - the job will keep processing on the server
      // We'll check status via polling instead
      console.log('Function triggered (may have timed out, will poll for status):', error.message);
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:triggerAIJobExecution',message:'trigger returning',data:{jobId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    return { error: null };
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-jobs.ts:triggerAIJobExecution',message:'trigger catch',data:{jobId,errorMsg:error?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    return { error };
  }
}