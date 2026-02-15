/**
 * Tests for Calendar Date Utilities
 *
 * These tests verify correct date calculations, timezone handling,
 * and boundary conditions for calendar operations.
 */

import {
  getMonthIndex,
  getMonthDifference,
  getDayIndex,
  getDateAtIndex,
  buildMonthWindow,
  getMonthKey,
  parseMonthKey,
  isWithinMonthWindow,
  getStartOfMonth,
  getEndOfMonth,
  getMonthOffsetDate,
  getRowOffset,
} from '../dateUtils';

describe('Calendar Date Utilities', () => {
  // Helper to create a date at midnight (local timezone)
  const createDate = (year: number, month: number, day: number): Date => {
    return new Date(year, month - 1, day);
  };

  describe('getMonthIndex', () => {
    it('should calculate correct month index for a given date', () => {
      const jan2024 = createDate(2024, 1, 15);
      const dec2024 = createDate(2024, 12, 15);

      expect(getMonthIndex(jan2024)).toBe(2024 * 12 + 0); // January = month 0
      expect(getMonthIndex(dec2024)).toBe(2024 * 12 + 11); // December = month 11
    });

    it('should handle dates across year boundaries', () => {
      const dec2023 = createDate(2023, 12, 1);
      const jan2024 = createDate(2024, 1, 1);

      expect(getMonthIndex(jan2024) - getMonthIndex(dec2023)).toBe(1);
    });
  });

  describe('getMonthDifference', () => {
    it('should calculate months between two dates', () => {
      const jan2024 = createDate(2024, 1, 15);
      const apr2024 = createDate(2024, 4, 15);

      expect(getMonthDifference(jan2024, apr2024)).toBe(3);
    });

    it('should handle negative differences (earlier to later)', () => {
      const apr2024 = createDate(2024, 4, 15);
      const jan2024 = createDate(2024, 1, 15);

      expect(getMonthDifference(apr2024, jan2024)).toBe(-3);
    });

    it('should be zero for same month', () => {
      const date1 = createDate(2024, 6, 1);
      const date2 = createDate(2024, 6, 30);

      expect(getMonthDifference(date1, date2)).toBe(0);
    });
  });

  describe('getDayIndex', () => {
    it('should calculate days between two dates', () => {
      const date1 = createDate(2024, 1, 1);
      const date2 = createDate(2024, 1, 10);

      expect(getDayIndex(date1, date2)).toBe(9);
    });

    it('should return 0 for same date', () => {
      const date = createDate(2024, 3, 15);

      expect(getDayIndex(date, date)).toBe(0);
    });

    it('should handle dates across month boundaries', () => {
      const jan31 = createDate(2024, 1, 31);
      const feb1 = createDate(2024, 2, 1);

      expect(getDayIndex(jan31, feb1)).toBe(1);
    });

    it('should handle dates across year boundaries', () => {
      const dec31 = createDate(2023, 12, 31);
      const jan1 = createDate(2024, 1, 1);

      expect(getDayIndex(dec31, jan1)).toBe(1);
    });

    it('should handle leap year correctly', () => {
      // 2024 is a leap year
      const feb28 = createDate(2024, 2, 28);
      const feb29 = createDate(2024, 2, 29);
      const mar1 = createDate(2024, 3, 1);

      expect(getDayIndex(feb28, feb29)).toBe(1);
      expect(getDayIndex(feb29, mar1)).toBe(1);
      expect(getDayIndex(feb28, mar1)).toBe(2);
    });
  });

  describe('getDateAtIndex', () => {
    it('should return the same date for index 0', () => {
      const date = createDate(2024, 1, 15);
      const result = getDateAtIndex(date, 0);

      expect(result.getDate()).toBe(date.getDate());
      expect(result.getMonth()).toBe(date.getMonth());
      expect(result.getFullYear()).toBe(date.getFullYear());
    });

    it('should add days correctly', () => {
      const date = createDate(2024, 1, 15);
      const result = getDateAtIndex(date, 10);

      expect(result.getDate()).toBe(25);
      expect(result.getMonth()).toBe(0); // January
    });

    it('should handle month transitions', () => {
      const date = createDate(2024, 1, 25);
      const result = getDateAtIndex(date, 10);

      expect(result.getDate()).toBe(4);
      expect(result.getMonth()).toBe(1); // February
    });

    it('should handle negative indices', () => {
      const date = createDate(2024, 2, 10);
      const result = getDateAtIndex(date, -5);

      expect(result.getDate()).toBe(5);
      expect(result.getMonth()).toBe(1); // February
    });
  });

  describe('buildMonthWindow', () => {
    it('should build correct month window', () => {
      const center = createDate(2024, 6, 15); // June 2024
      const window = buildMonthWindow(center, 2, 2);

      expect(window).toHaveLength(5); // 2 past + center + 2 future
      expect(window[0].getMonth()).toBe(3); // April
      expect(window[2].getMonth()).toBe(5); // June (center)
      expect(window[4].getMonth()).toBe(7); // August
    });

    it('should create window with all dates at month start', () => {
      const center = createDate(2024, 6, 15);
      const window = buildMonthWindow(center, 1, 1);

      window.forEach((date) => {
        expect(date.getDate()).toBe(1); // Should be first day of month
      });
    });

    it('should handle year transitions', () => {
      const center = createDate(2024, 1, 15); // January 2024
      const window = buildMonthWindow(center, 2, 2);

      expect(window[0].getMonth()).toBe(10); // November 2023
      expect(window[0].getFullYear()).toBe(2023);
      expect(window[4].getMonth()).toBe(2); // March 2024
      expect(window[4].getFullYear()).toBe(2024);
    });
  });

  describe('getMonthKey', () => {
    it('should format month key as YYYY-MM', () => {
      const date = createDate(2024, 6, 15);
      expect(getMonthKey(date)).toBe('2024-06');
    });

    it('should pad month with zero', () => {
      const date = createDate(2024, 1, 15);
      expect(getMonthKey(date)).toBe('2024-01');
    });

    it('should handle December correctly', () => {
      const date = createDate(2024, 12, 25);
      expect(getMonthKey(date)).toBe('2024-12');
    });
  });

  describe('parseMonthKey', () => {
    it('should parse month key back to date', () => {
      const key = '2024-06';
      const date = parseMonthKey(key);

      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(5); // June = month 5
      expect(date.getDate()).toBe(1); // First day of month
    });

    it('should handle January correctly', () => {
      const key = '2024-01';
      const date = parseMonthKey(key);

      expect(date.getMonth()).toBe(0);
    });

    it('should handle December correctly', () => {
      const key = '2024-12';
      const date = parseMonthKey(key);

      expect(date.getMonth()).toBe(11);
    });
  });

  describe('getMonthKey/parseMonthKey round-trip', () => {
    it('should maintain consistency through round-trip conversion', () => {
      const dates = [
        createDate(2023, 6, 15),
        createDate(2024, 1, 1),
        createDate(2024, 12, 31),
      ];

      dates.forEach((date) => {
        const key = getMonthKey(date);
        const parsed = parseMonthKey(key);

        expect(parsed.getFullYear()).toBe(date.getFullYear());
        expect(parsed.getMonth()).toBe(date.getMonth());
      });
    });
  });

  describe('isWithinMonthWindow', () => {
    it('should return true for dates within window', () => {
      const center = createDate(2024, 6, 15);
      const targetInWindow = createDate(2024, 5, 15);

      expect(isWithinMonthWindow(targetInWindow, center, 1, 2)).toBe(true);
    });

    it('should return false for dates outside window', () => {
      const center = createDate(2024, 6, 15);
      const targetOutside = createDate(2024, 3, 15);

      expect(isWithinMonthWindow(targetOutside, center, 1, 2)).toBe(false);
    });

    it('should return true for center month', () => {
      const center = createDate(2024, 6, 15);

      expect(isWithinMonthWindow(center, center, 1, 2)).toBe(true);
    });
  });

  describe('getRowOffset', () => {
    it('should calculate row offset from day index', () => {
      const index = 0;
      expect(getRowOffset(index)).toBe(0);
    });

    it('should handle multiple rows', () => {
      const index = 7; // Second row (0-6 is first row)
      expect(getRowOffset(index)).toBe(120); // ROW_HEIGHT = 120
    });

    it('should scale with number of days', () => {
      const index1 = 14; // Third row
      const index2 = 21; // Fourth row
      const offset1 = getRowOffset(index1);
      const offset2 = getRowOffset(index2);

      expect(offset2 - offset1).toBe(120); // ROW_HEIGHT
    });
  });

  describe('getStartOfMonth', () => {
    it('should return first day of month', () => {
      const date = createDate(2024, 6, 15);
      const start = getStartOfMonth(date);

      expect(start.getDate()).toBe(1);
      expect(start.getMonth()).toBe(5);
      expect(start.getFullYear()).toBe(2024);
    });

    it('should return same date if already on 1st', () => {
      const date = createDate(2024, 6, 1);
      const start = getStartOfMonth(date);

      expect(start.getDate()).toBe(1);
      expect(start.getMonth()).toBe(5);
    });
  });

  describe('getEndOfMonth', () => {
    it('should return last day of month for June (30 days)', () => {
      const date = createDate(2024, 6, 15);
      const end = getEndOfMonth(date);

      expect(end.getDate()).toBe(30);
      expect(end.getMonth()).toBe(5);
    });

    it('should return 31st for months with 31 days', () => {
      const date = createDate(2024, 1, 15);
      const end = getEndOfMonth(date);

      expect(end.getDate()).toBe(31);
    });

    it('should handle February leap year (29 days)', () => {
      const date = createDate(2024, 2, 15); // 2024 is leap year
      const end = getEndOfMonth(date);

      expect(end.getDate()).toBe(29);
    });

    it('should handle February non-leap year (28 days)', () => {
      const date = createDate(2023, 2, 15); // 2023 is not leap year
      const end = getEndOfMonth(date);

      expect(end.getDate()).toBe(28);
    });
  });

  describe('getMonthOffsetDate', () => {
    it('should add months correctly', () => {
      const date = createDate(2024, 6, 15);
      const result = getMonthOffsetDate(date, 3);

      expect(result.getMonth()).toBe(8); // September
      expect(result.getFullYear()).toBe(2024);
    });

    it('should subtract months correctly', () => {
      const date = createDate(2024, 6, 15);
      const result = getMonthOffsetDate(date, -3);

      expect(result.getMonth()).toBe(2); // March
      expect(result.getFullYear()).toBe(2024);
    });

    it('should handle year transitions forward', () => {
      const date = createDate(2024, 11, 15); // November
      const result = getMonthOffsetDate(date, 3);

      expect(result.getMonth()).toBe(1); // February
      expect(result.getFullYear()).toBe(2025);
    });

    it('should handle year transitions backward', () => {
      const date = createDate(2024, 2, 15); // February
      const result = getMonthOffsetDate(date, -3);

      expect(result.getMonth()).toBe(10); // November
      expect(result.getFullYear()).toBe(2023);
    });

    it('should return same date for offset 0', () => {
      const date = createDate(2024, 6, 15);
      const result = getMonthOffsetDate(date, 0);

      expect(result.getMonth()).toBe(5);
      expect(result.getFullYear()).toBe(2024);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle month-end edge case: Feb 29 in leap year', () => {
      const leapDate = createDate(2024, 2, 29);
      expect(leapDate.getDate()).toBe(29);

      // Adding one month to Feb 29 should give March 29, not 30 or 31
      const nextMonth = getMonthOffsetDate(leapDate, 1);
      expect(nextMonth.getMonth()).toBe(2); // March
      expect(nextMonth.getDate()).toBe(29);
    });

    it('should handle timezone-independent calculations', () => {
      // Create two dates with different time components
      const date1 = new Date(2024, 5, 15, 10, 30, 45);
      const date2 = new Date(2024, 5, 15, 22, 15, 30);

      // Should still be same day
      expect(getDayIndex(date1, date2)).toBe(0);
    });

    it('should maintain consistency for large month windows', () => {
      const center = createDate(2024, 6, 15);
      const window = buildMonthWindow(center, 12, 12); // 2 years of data

      expect(window).toHaveLength(25); // 12 + 1 + 12
      expect(window[0].getMonth()).toBe(5); // June 2023
      expect(window[0].getFullYear()).toBe(2023);
      expect(window[24].getMonth()).toBe(5); // June 2025
      expect(window[24].getFullYear()).toBe(2025);
    });
  });
});
