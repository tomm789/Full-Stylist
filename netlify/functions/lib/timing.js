"use strict";

/**
 * Creates a detailed timing tracker for step-by-step performance analysis.
 * Tracks storage downloads, base64 conversions, and API calls separately.
 * 
 * @returns {object} Timing tracker object with methods to record timing
 */
function createTimingTracker() {
  const tracker = {
    storageDownloadTime: 0,
    base64ConversionTime: 0,
    apiCallTime: 0,
    jobStartTime: null,
    batchAIGenerationTime: null, // For batch jobs: actual parallel execution time
    
    /**
     * Start tracking a job
     */
    startJob() {
      this.jobStartTime = performance.now();
    },
    
    /**
     * Add storage download time
     */
    addStorageDownload(durationMs) {
      this.storageDownloadTime += durationMs;
    },
    
    /**
     * Add base64 conversion time
     */
    addBase64Conversion(durationMs) {
      this.base64ConversionTime += durationMs;
    },
    
    /**
     * Add API call time
     */
    addApiCall(durationMs) {
      this.apiCallTime += durationMs;
    },
    
    /**
     * Set batch AI generation time (for parallel execution)
     * This overrides the accumulated apiCallTime for batch jobs
     */
    setBatchAIGenerationTime(durationMs) {
      this.batchAIGenerationTime = durationMs;
    },
    
    /**
     * Get total job time
     */
    getTotalTime() {
      if (!this.jobStartTime) return 0;
      return performance.now() - this.jobStartTime;
    },
    
    /**
     * Get setup time (download + conversion)
     */
    getSetupTime() {
      return this.storageDownloadTime + this.base64ConversionTime;
    },
    
    /**
     * Get AI generation time (batch time if set, otherwise accumulated)
     */
    getAIGenerationTime() {
      return this.batchAIGenerationTime !== null ? this.batchAIGenerationTime : this.apiCallTime;
    },
    
    /**
     * Format duration in seconds
     */
    formatSeconds(ms) {
      return (ms / 1000).toFixed(2);
    },
    
    /**
     * Log timing breakdown
     */
    logBreakdown(jobType) {
      const total = this.getTotalTime();
      const setup = this.getSetupTime();
      const aiGen = this.getAIGenerationTime();
      
      console.log(
        `[TIMING_BREAKDOWN] Job: ${jobType} | ` +
        `Setup: ${this.formatSeconds(setup)}s | ` +
        `AI Generation: ${this.formatSeconds(aiGen)}s | ` +
        `Total: ${this.formatSeconds(total)}s`
      );
    }
  };
  
  return tracker;
}

/**
 * Creates a performance tracker for comparing text vs image generation.
 * Generates a unique request ID and tracks timing for each generation type.
 * 
 * @returns {object} Performance tracker object with methods to record timing
 */
function createPerformanceTracker() {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const tracker = {
    requestId,
    textGenStart: null,
    textGenEnd: null,
    imageGenStart: null,
    imageGenEnd: null,
    imageCount: 0,
    
    /**
     * Record the start of text generation
     */
    startTextGen(imageCount) {
      this.textGenStart = Date.now();
      this.imageCount = imageCount || this.imageCount;
    },
    
    /**
     * Record the end of text generation
     */
    endTextGen() {
      this.textGenEnd = Date.now();
    },
    
    /**
     * Record the start of image generation
     */
    startImageGen(imageCount) {
      this.imageGenStart = Date.now();
      this.imageCount = imageCount || this.imageCount;
    },
    
    /**
     * Record the end of image generation
     */
    endImageGen() {
      this.imageGenEnd = Date.now();
    },
    
    /**
     * Get text generation duration in milliseconds
     */
    getTextDuration() {
      if (!this.textGenStart || !this.textGenEnd) return null;
      return this.textGenEnd - this.textGenStart;
    },
    
    /**
     * Get image generation duration in milliseconds
     */
    getImageDuration() {
      if (!this.imageGenStart || !this.imageGenEnd) return null;
      return this.imageGenEnd - this.imageGenStart;
    },
    
    /**
     * Log the performance comparison
     */
    logComparison() {
      const textTime = this.getTextDuration();
      const imageTime = this.getImageDuration();
      
      if (textTime === null && imageTime === null) {
        // No generation calls recorded
        return;
      }
      
      const textTimeStr = textTime !== null ? `${textTime}ms` : 'N/A';
      const imageTimeStr = imageTime !== null ? `${imageTime}ms` : 'N/A';
      
      let deltaStr = 'N/A';
      if (textTime !== null && imageTime !== null) {
        const delta = imageTime - textTime;
        deltaStr = `${delta >= 0 ? '+' : ''}${delta}ms`;
      }
      
      console.log(
        `[PERF_COMPARE] ReqID: ${this.requestId} | ` +
        `Inputs: ${this.imageCount} img | ` +
        `TextGen: ${textTimeStr} | ` +
        `ImageGen: ${imageTimeStr} | ` +
        `Delta: ${deltaStr}`
      );
    }
  };
  
  return tracker;
}

module.exports = {
  createTimingTracker,
  createPerformanceTracker,
};
