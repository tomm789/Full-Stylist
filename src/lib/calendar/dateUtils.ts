/**
 * Calendar Date Utilities
 * Centralized date handling functions for calendar operations
 * Uses local date operations (not UTC) to avoid timezone issues
 */

import { startOfMonth, endOfMonth, addMonths, differenceInDays } from 'date-fns';

/**
 * Get a numeric index for a month (year * 12 + month)
 * Useful for comparing months across years
 */
export function getMonthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

/**
 * Get the difference in months between two dates
 */
export function getMonthDifference(from: Date, to: Date): number {
  return getMonthIndex(to) - getMonthIndex(from);
}

/**
 * Get the day index (number of days) between startDate and targetDate
 * Uses local date operations to avoid timezone conversion issues
 */
export function getDayIndex(startDate: Date, targetDate: Date): number {
  // Create normalized dates at midnight local time
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  // Calculate difference in days
  const diffTime = target.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Get a date by adding dayIndex days to startDate
 * Validates that index is within reasonable bounds (-100000 to +100000 days ≈ 273 years)
 */
export function getDateAtIndex(startDate: Date, index: number): Date | null {
  // Validate index is a finite number
  if (!Number.isFinite(index)) {
    console.warn(`[Calendar] Invalid index: ${index}, must be a finite number`);
    return null;
  }

  // Clamp index to reasonable bounds (-100000 to +100000 days ≈ ±273 years)
  // This prevents creating dates in year 9999 or similar edge cases
  const MAX_INDEX = 100000;
  const clampedIndex = Math.max(-MAX_INDEX, Math.min(MAX_INDEX, index));

  if (Math.abs(clampedIndex) !== Math.abs(index)) {
    console.warn(
      `[Calendar] Index ${index} clamped to ${clampedIndex} (max ±${MAX_INDEX} days)`
    );
  }

  const date = new Date(startDate);
  date.setDate(date.getDate() + clampedIndex);
  return date;
}

/**
 * Build a window of months centered around a given date
 * Example: buildMonthWindow(today, 6, 6) returns 13 months
 */
export function buildMonthWindow(center: Date, pastMonths: number, futureMonths: number): Date[] {
  const months: Date[] = [];
  for (let i = -pastMonths; i <= futureMonths; i++) {
    months.push(startOfMonth(addMonths(center, i)));
  }
  return months;
}

/**
 * Get start of month (1st day at midnight)
 */
export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get end of month (last day at midnight)
 */
export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Get a month with offset applied (e.g., offset +1 = next month)
 */
export function getMonthOffsetDate(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

/**
 * Convert date to month key string (YYYY-MM format)
 */
export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Parse month key string (YYYY-MM format) back to Date
 */
export function parseMonthKey(key: string): Date {
  const [year, month] = key.split('-').map((value) => parseInt(value, 10));
  return new Date(year, month - 1, 1);
}

/**
 * Check if a date falls within a month window
 */
export function isWithinMonthWindow(
  date: Date,
  center: Date,
  pastMonths: number,
  futureMonths: number
): boolean {
  const diff = getMonthIndex(date) - getMonthIndex(center);
  return diff >= -pastMonths && diff <= futureMonths;
}

/**
 * Get row index from day index (for calendar grid layout with 7 columns)
 */
export function getRowIndex(dayIndex: number): number {
  return Math.floor(dayIndex / 7);
}

/**
 * Get row offset (pixel position) from day index
 * Assumes ROW_HEIGHT = 120px (can be parameterized if needed)
 */
export function getRowOffset(dayIndex: number, rowHeight: number = 120): number {
  return getRowIndex(dayIndex) * rowHeight;
}
