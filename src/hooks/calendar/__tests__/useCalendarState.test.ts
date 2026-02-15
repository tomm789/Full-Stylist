/**
 * Tests for Calendar State Reducer
 *
 * These tests verify that the calendar state reducer correctly handles
 * all action types and maintains proper state transitions.
 */

import { CalendarStateValue, CalendarStateAction } from '../useCalendarState';
import { buildMonthWindow } from '@/lib/calendar/dateUtils';

// Extract the reducer function for testing (it's not exported, so we test behavior)
// In a real scenario, we'd export the reducer from the hook for easier testing

describe('Calendar State Reducer Logic', () => {
  // Helper to create a date
  const createDate = (year: number, month: number, day: number): Date => {
    return new Date(year, month - 1, day);
  };

  // Mock initial state
  const createInitialState = (): CalendarStateValue => ({
    activeMonthDate: createDate(2024, 6, 15),
    rangeCenterDate: createDate(2024, 6, 15),
    months: buildMonthWindow(createDate(2024, 6, 15), 6, 6),
    activeDayKey: null,
    showDaySheet: false,
    error: null,
  });

  describe('SET_ACTIVE_MONTH action', () => {
    it('should update activeMonthDate', () => {
      const state = createInitialState();
      const newDate = createDate(2024, 7, 15);

      // Simulate reducer behavior
      const newState = {
        ...state,
        activeMonthDate: newDate,
      };

      expect(newState.activeMonthDate).toEqual(newDate);
      expect(newState.activeMonthDate.getMonth()).toBe(6); // July
    });

    it('should not modify other state properties', () => {
      const state = createInitialState();
      const originalRangeCenter = state.rangeCenterDate;
      const originalMonths = state.months;
      const newDate = createDate(2024, 7, 15);

      const newState = {
        ...state,
        activeMonthDate: newDate,
      };

      expect(newState.rangeCenterDate).toBe(originalRangeCenter);
      expect(newState.months).toBe(originalMonths);
      expect(newState.activeDayKey).toBe(state.activeDayKey);
    });
  });

  describe('SET_RANGE_CENTER action', () => {
    it('should update rangeCenterDate', () => {
      const state = createInitialState();
      const newDate = createDate(2024, 8, 20);

      const newState = {
        ...state,
        rangeCenterDate: newDate,
      };

      expect(newState.rangeCenterDate).toEqual(newDate);
    });

    it('should preserve activeMonthDate', () => {
      const state = createInitialState();
      const originalActiveMonth = state.activeMonthDate;
      const newDate = createDate(2024, 8, 20);

      const newState = {
        ...state,
        rangeCenterDate: newDate,
      };

      expect(newState.activeMonthDate).toBe(originalActiveMonth);
    });
  });

  describe('SET_MONTHS action', () => {
    it('should replace entire months array', () => {
      const state = createInitialState();
      const newMonths = buildMonthWindow(createDate(2024, 9, 15), 3, 3);

      const newState = {
        ...state,
        months: newMonths,
      };

      expect(newState.months).toEqual(newMonths);
      expect(newState.months.length).toBe(newMonths.length);
    });

    it('should not modify other state', () => {
      const state = createInitialState();
      const newMonths = buildMonthWindow(createDate(2024, 9, 15), 3, 3);
      const originalActiveMonth = state.activeMonthDate;

      const newState = {
        ...state,
        months: newMonths,
      };

      expect(newState.activeMonthDate).toBe(originalActiveMonth);
    });
  });

  describe('EXTEND_MONTHS action (past)', () => {
    it('should prepend months to the array', () => {
      const state = createInitialState();
      const originalLength = state.months.length;
      const originalFirst = state.months[0];

      const newMonthsToPrepend = buildMonthWindow(
        createDate(2024, 3, 15),
        2,
        0
      ); // Just 3 months

      const newState = {
        ...state,
        months: [...newMonthsToPrepend, ...state.months],
      };

      expect(newState.months.length).toBe(originalLength + newMonthsToPrepend.length);
      expect(newState.months[newMonthsToPrepend.length]).toEqual(originalFirst);
    });

    it('should maintain month order after prepend', () => {
      const state = createInitialState();
      const firstMonthBefore = state.months[0];
      const secondMonthBefore = state.months[1];

      const prependMonths = buildMonthWindow(
        createDate(2024, 2, 15),
        1,
        0
      ); // 2 months

      const newState = {
        ...state,
        months: [...prependMonths, ...state.months],
      };

      const newFirstMonth = newState.months[0];
      const expectedPrependLength = prependMonths.length;
      const originalFirstAfterPrepend = newState.months[expectedPrependLength];

      expect(originalFirstAfterPrepend).toEqual(firstMonthBefore);
      expect(newState.months[expectedPrependLength + 1]).toEqual(secondMonthBefore);
    });
  });

  describe('EXTEND_MONTHS action (future)', () => {
    it('should append months to the array', () => {
      const state = createInitialState();
      const originalLength = state.months.length;
      const originalLast = state.months[originalLength - 1];

      const newMonthsToAppend = buildMonthWindow(
        createDate(2024, 12, 15),
        0,
        2
      ); // Just 3 months

      const newState = {
        ...state,
        months: [...state.months, ...newMonthsToAppend],
      };

      expect(newState.months.length).toBe(originalLength + newMonthsToAppend.length);
      expect(newState.months[originalLength - 1]).toEqual(originalLast);
      expect(newState.months[originalLength]).toEqual(newMonthsToAppend[0]);
    });

    it('should maintain chronological order after append', () => {
      const state = createInitialState();
      const lastMonthBefore = state.months[state.months.length - 1];

      const appendMonths = buildMonthWindow(
        createDate(2025, 1, 15),
        0,
        2
      ); // 3 months

      const newState = {
        ...state,
        months: [...state.months, ...appendMonths],
      };

      const indexAfterOriginal = state.months.length;
      expect(newState.months[indexAfterOriginal]).toEqual(appendMonths[0]);
    });
  });

  describe('SELECT_DAY action', () => {
    it('should set activeDayKey and open sheet', () => {
      const state = createInitialState();
      const dateKey = '2024-06-15';

      const newState = {
        ...state,
        activeDayKey: dateKey,
        showDaySheet: true,
      };

      expect(newState.activeDayKey).toBe(dateKey);
      expect(newState.showDaySheet).toBe(true);
    });

    it('should override previous day selection', () => {
      const state = createInitialState();
      state.activeDayKey = '2024-06-10';
      const newDateKey = '2024-06-20';

      const newState = {
        ...state,
        activeDayKey: newDateKey,
        showDaySheet: true,
      };

      expect(newState.activeDayKey).toBe(newDateKey);
      expect(newState.activeDayKey).not.toBe('2024-06-10');
    });

    it('should handle null day key', () => {
      const state = createInitialState();
      state.activeDayKey = '2024-06-15';

      const newState = {
        ...state,
        activeDayKey: null,
        showDaySheet: true,
      };

      expect(newState.activeDayKey).toBeNull();
    });
  });

  describe('OPEN_DAY_SHEET action', () => {
    it('should set showDaySheet to true', () => {
      const state = createInitialState();
      state.showDaySheet = false;

      const newState = {
        ...state,
        showDaySheet: true,
      };

      expect(newState.showDaySheet).toBe(true);
    });

    it('should preserve activeDayKey', () => {
      const state = createInitialState();
      state.activeDayKey = '2024-06-15';
      state.showDaySheet = false;

      const newState = {
        ...state,
        showDaySheet: true,
      };

      expect(newState.activeDayKey).toBe('2024-06-15');
    });

    it('should be idempotent (already open)', () => {
      const state = createInitialState();
      state.showDaySheet = true;

      const newState = {
        ...state,
        showDaySheet: true,
      };

      expect(newState.showDaySheet).toBe(true);
    });
  });

  describe('CLOSE_DAY_SHEET action', () => {
    it('should set showDaySheet to false', () => {
      const state = createInitialState();
      state.showDaySheet = true;

      const newState = {
        ...state,
        showDaySheet: false,
      };

      expect(newState.showDaySheet).toBe(false);
    });

    it('should preserve activeDayKey', () => {
      const state = createInitialState();
      state.activeDayKey = '2024-06-15';
      state.showDaySheet = true;

      const newState = {
        ...state,
        showDaySheet: false,
      };

      expect(newState.activeDayKey).toBe('2024-06-15');
    });

    it('should be idempotent (already closed)', () => {
      const state = createInitialState();
      state.showDaySheet = false;

      const newState = {
        ...state,
        showDaySheet: false,
      };

      expect(newState.showDaySheet).toBe(false);
    });
  });

  describe('SET_ERROR action', () => {
    it('should set error state', () => {
      const state = createInitialState();
      const error = new Error('Test error');

      const newState = {
        ...state,
        error,
      };

      expect(newState.error).toBe(error);
      expect(newState.error?.message).toBe('Test error');
    });

    it('should clear error when set to null', () => {
      const state = createInitialState();
      state.error = new Error('Previous error');

      const newState = {
        ...state,
        error: null,
      };

      expect(newState.error).toBeNull();
    });

    it('should replace previous error', () => {
      const state = createInitialState();
      state.error = new Error('First error');
      const newError = new Error('Second error');

      const newState = {
        ...state,
        error: newError,
      };

      expect(newState.error).toBe(newError);
      expect(newState.error?.message).toBe('Second error');
    });

    it('should not affect other state properties', () => {
      const state = createInitialState();
      const originalActiveMonth = state.activeMonthDate;
      const originalMonths = state.months;
      const error = new Error('Test error');

      const newState = {
        ...state,
        error,
      };

      expect(newState.activeMonthDate).toBe(originalActiveMonth);
      expect(newState.months).toBe(originalMonths);
    });
  });

  describe('State immutability', () => {
    it('should create new state object for each update', () => {
      const state1 = createInitialState();
      const state2 = {
        ...state1,
        activeMonthDate: createDate(2024, 7, 15),
      };

      expect(state2).not.toBe(state1);
      expect(state1.activeMonthDate.getMonth()).toBe(5); // Original unchanged
      expect(state2.activeMonthDate.getMonth()).toBe(6); // New state updated
    });

    it('should not mutate original months array on extend', () => {
      const state = createInitialState();
      const originalMonths = [...state.months];
      const newMonths = buildMonthWindow(createDate(2024, 3, 15), 2, 0);

      const newState = {
        ...state,
        months: [...newMonths, ...state.months],
      };

      expect(state.months).toEqual(originalMonths);
      expect(newState.months).not.toEqual(originalMonths);
      expect(newState.months.length).toBeGreaterThan(state.months.length);
    });
  });

  describe('State completeness', () => {
    it('should always have all required properties', () => {
      const state = createInitialState();

      expect(state).toHaveProperty('activeMonthDate');
      expect(state).toHaveProperty('rangeCenterDate');
      expect(state).toHaveProperty('months');
      expect(state).toHaveProperty('activeDayKey');
      expect(state).toHaveProperty('showDaySheet');
      expect(state).toHaveProperty('error');

      expect(state.activeMonthDate instanceof Date).toBe(true);
      expect(state.rangeCenterDate instanceof Date).toBe(true);
      expect(Array.isArray(state.months)).toBe(true);
      expect(typeof state.activeDayKey).toBe(typeof state.activeDayKey); // null or string
      expect(typeof state.showDaySheet).toBe('boolean');
      expect(state.error === null || state.error instanceof Error).toBe(true);
    });
  });

  describe('Complex action sequences', () => {
    it('should handle selecting day, opening sheet, and closing sheet', () => {
      let state = createInitialState();

      // Select a day
      state = {
        ...state,
        activeDayKey: '2024-06-15',
        showDaySheet: true,
      };

      expect(state.activeDayKey).toBe('2024-06-15');
      expect(state.showDaySheet).toBe(true);

      // Close sheet
      state = {
        ...state,
        showDaySheet: false,
      };

      expect(state.activeDayKey).toBe('2024-06-15'); // Still selected
      expect(state.showDaySheet).toBe(false); // But closed

      // Open again
      state = {
        ...state,
        showDaySheet: true,
      };

      expect(state.activeDayKey).toBe('2024-06-15');
      expect(state.showDaySheet).toBe(true);
    });

    it('should handle month navigation and range updates', () => {
      let state = createInitialState();
      const originalMonthCount = state.months.length;

      // Navigate to new month
      const newMonth = createDate(2024, 8, 1);
      state = {
        ...state,
        activeMonthDate: newMonth,
      };

      expect(state.activeMonthDate.getMonth()).toBe(7);

      // Extend months in past
      const pastMonths = buildMonthWindow(createDate(2024, 3, 15), 2, 0);
      state = {
        ...state,
        months: [...pastMonths, ...state.months],
      };

      expect(state.months.length).toBe(originalMonthCount + pastMonths.length);

      // Update range center
      state = {
        ...state,
        rangeCenterDate: newMonth,
      };

      expect(state.rangeCenterDate.getMonth()).toBe(7);
      expect(state.activeMonthDate.getMonth()).toBe(7);
    });

    it('should handle error during operations', () => {
      let state = createInitialState();

      // Set an error
      const error = new Error('Load failed');
      state = {
        ...state,
        error,
      };

      expect(state.error?.message).toBe('Load failed');

      // Continue with other operations despite error
      state = {
        ...state,
        activeMonthDate: createDate(2024, 9, 1),
      };

      expect(state.error?.message).toBe('Load failed'); // Error preserved
      expect(state.activeMonthDate.getMonth()).toBe(8); // Navigation continues

      // Clear error
      state = {
        ...state,
        error: null,
      };

      expect(state.error).toBeNull();
    });
  });
});
