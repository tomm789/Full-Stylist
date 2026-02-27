"use strict";

// Barrel re-export — all existing require("../utils") destructuring continues working.
// Individual modules can be required directly from lib/ for explicit dependencies.

const timing = require("./lib/timing");
const storage = require("./lib/storage");
const gemini = require("./lib/gemini");
const imageComposition = require("./lib/imageComposition");
const imageOptimization = require("./lib/imageOptimization");

module.exports = {
  createTimingTracker: timing.createTimingTracker,
  createPerformanceTracker: timing.createPerformanceTracker,
  downloadImageFromStorage: storage.downloadImageFromStorage,
  uploadImageToStorage: storage.uploadImageToStorage,
  callGeminiAPI: gemini.callGeminiAPI,
  resolveModelFromSettings: gemini.resolveModelFromSettings,
  getGeminiApiVersion: gemini.getGeminiApiVersion,
  DEFAULT_IMAGE_MODEL: gemini.DEFAULT_IMAGE_MODEL,
  DEFAULT_BODY_MODEL: gemini.DEFAULT_BODY_MODEL,
  compositeOutfitGrid: imageComposition.compositeOutfitGrid,
  composeHeadshotWithMask: imageComposition.composeHeadshotWithMask,
  optimizeGeminiInput: imageOptimization.optimizeGeminiInput,
  optimizeGeminiOutput: imageOptimization.optimizeGeminiOutput,
};
