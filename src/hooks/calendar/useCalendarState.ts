/**
 * useCalendarState Hook
 * Manages calendar state with a reducer pattern
 *
 * Handles:
 * - Active month date
 * - Range center date (for data fetching window)
 * - Month window management
 * - Day sheet visibility and selection
 * - Error states
 */

import { useReducer, useCallback } from 'react';
import { buildMonthWindow } from '@/lib/calendar/dateUtils';

export interface CalendarStateValue {
  activeMonthDate: Date;
  rangeCenterDate: Date;
  months: Date[];
  activeDayKey: string | null;
  showDaySheet: boolean;
  error: Error | null;
}

export type CalendarStateAction =
  | { type: 'SET_ACTIVE_MONTH'; payload: Date }
  | { type: 'SET_RANGE_CENTER'; payload: Date }
  | { type: 'SET_MONTHS'; payload: Date[] }
  | { type: 'EXTEND_MONTHS'; payload: { direction: 'past' | 'future'; months: Date[] } }
  | { type: 'SELECT_DAY'; payload: string }
  | { type: 'OPEN_DAY_SHEET' }
  | { type: 'CLOSE_DAY_SHEET' }
  | { type: 'SET_ERROR'; payload: Error | null };

const initialState: CalendarStateValue = {
  activeMonthDate: new Date(),
  rangeCenterDate: new Date(),
  months: buildMonthWindow(new Date(), 6, 6),
  activeDayKey: null,
  showDaySheet: false,
  error: null,
};

function calendarStateReducer(
  state: CalendarStateValue,
  action: CalendarStateAction
): CalendarStateValue {
  switch (action.type) {
    case 'SET_ACTIVE_MONTH':
      return { ...state, activeMonthDate: action.payload };

    case 'SET_RANGE_CENTER':
      return { ...state, rangeCenterDate: action.payload };

    case 'SET_MONTHS':
      return { ...state, months: action.payload };

    case 'EXTEND_MONTHS':
      if (action.payload.direction === 'past') {
        return { ...state, months: [...action.payload.months, ...state.months] };
      } else {
        return { ...state, months: [...state.months, ...action.payload.months] };
      }

    case 'SELECT_DAY':
      return { ...state, activeDayKey: action.payload, showDaySheet: true };

    case 'OPEN_DAY_SHEET':
      return { ...state, showDaySheet: true };

    case 'CLOSE_DAY_SHEET':
      return { ...state, showDaySheet: false };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    default:
      return state;
  }
}

export interface CalendarStateActions {
  setActiveMonth: (date: Date) => void;
  setRangeCenter: (date: Date) => void;
  setMonths: (months: Date[]) => void;
  extendMonthsPast: (months: Date[]) => void;
  extendMonthsFuture: (months: Date[]) => void;
  selectDay: (dateKey: string) => void;
  openDaySheet: () => void;
  closeDaySheet: () => void;
  setError: (error: Error | null) => void;
}

export function useCalendarState(): [CalendarStateValue, CalendarStateActions] {
  const [state, dispatch] = useReducer(calendarStateReducer, initialState);

  const actions: CalendarStateActions = {
    setActiveMonth: useCallback((date: Date) => {
      dispatch({ type: 'SET_ACTIVE_MONTH', payload: date });
    }, []),

    setRangeCenter: useCallback((date: Date) => {
      dispatch({ type: 'SET_RANGE_CENTER', payload: date });
    }, []),

    setMonths: useCallback((months: Date[]) => {
      dispatch({ type: 'SET_MONTHS', payload: months });
    }, []),

    extendMonthsPast: useCallback((months: Date[]) => {
      dispatch({ type: 'EXTEND_MONTHS', payload: { direction: 'past', months } });
    }, []),

    extendMonthsFuture: useCallback((months: Date[]) => {
      dispatch({ type: 'EXTEND_MONTHS', payload: { direction: 'future', months } });
    }, []),

    selectDay: useCallback((dateKey: string) => {
      dispatch({ type: 'SELECT_DAY', payload: dateKey });
    }, []),

    openDaySheet: useCallback(() => {
      dispatch({ type: 'OPEN_DAY_SHEET' });
    }, []),

    closeDaySheet: useCallback(() => {
      dispatch({ type: 'CLOSE_DAY_SHEET' });
    }, []),

    setError: useCallback((error: Error | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    }, []),
  };

  return [state, actions];
}
