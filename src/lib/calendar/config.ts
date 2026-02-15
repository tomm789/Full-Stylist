/**
 * Calendar Configuration
 * Centralized constants for calendar behavior and dimensions
 *
 * Benefits:
 * - Single source of truth for layout and behavior values
 * - Easy to adjust behavior without touching component code
 * - Consistent values across all calendar components
 * - Type-safe access to configuration
 */

/**
 * Layout dimensions for the calendar grid
 */
export const CALENDAR_DIMENSIONS = {
  /** Height of each day row in the calendar grid (pixels) */
  ROW_HEIGHT: 120,

  /** Height of month pill indicator (pixels) */
  PILL_HEIGHT: 24,

  /** Padding inside each calendar cell (pixels) */
  CELL_PADDING: 4,

  /** Height of calendar week header (pixels) */
  WEEK_HEADER_HEIGHT: 40,
} as const;

/**
 * Month window management
 * Determines how many months to load before and after the current month
 */
export const CALENDAR_MONTH_WINDOW = {
  /** Number of months to load before the current month */
  PAST_MONTHS: 6,

  /** Number of months to load after the current month */
  FUTURE_MONTHS: 6,

  /** Number of months to extend when user scrolls near edges */
  EXTENSION_SIZE: 6,
} as const;

/**
 * Scroll behavior configuration
 */
export const CALENDAR_SCROLL = {
  /** Distance from edge (pixels) to trigger month extension */
  INFINITE_SCROLL_THRESHOLD: 400,

  /** Scroll event throttle rate (milliseconds) */
  EVENT_THROTTLE_MS: 16, // ~60fps

  /** Offset multiplier for scroll direction detection */
  DIRECTION_OFFSET_RATIO: 0.15,
} as const;

/**
 * Animation and visual behavior
 */
export const CALENDAR_ANIMATIONS = {
  /** Ratio of viewport height when pill animation should trigger */
  PILL_TRIGGER_RATIO: 0.3,

  /** Distance to slide pill off-screen (pixels) */
  PILL_SLIDE_DISTANCE: 120,

  /** Bounce animation duration (milliseconds) */
  BOUNCE_ANIMATION_DURATION: 150,

  /** Bounce animation distance (pixels) */
  BOUNCE_DISTANCE: 10,
} as const;

/**
 * Data fetching configuration
 */
export const CALENDAR_DATA = {
  /** Number of outfit images to load in parallel */
  IMAGE_BATCH_SIZE: 10,

  /** Timeout for outfit image loading (milliseconds) */
  OUTFIT_LOAD_TIMEOUT_MS: 5000,

  /** Maximum number of retries for failed loads */
  MAX_RETRY_ATTEMPTS: 3,

  /** Initial retry delay (milliseconds) - uses exponential backoff */
  INITIAL_RETRY_DELAY_MS: 100,
} as const;

/**
 * Type-safe export of all configuration
 */
export const CALENDAR_CONFIG = {
  ...CALENDAR_DIMENSIONS,
  ...CALENDAR_MONTH_WINDOW,
  ...CALENDAR_SCROLL,
  ...CALENDAR_ANIMATIONS,
  ...CALENDAR_DATA,
} as const;

// Type for accessing configuration values
export type CalendarConfig = typeof CALENDAR_CONFIG;
