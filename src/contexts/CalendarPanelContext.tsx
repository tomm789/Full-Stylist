/**
 * CalendarPanelContext
 * Shares the calendar slide-in panel open/close state with header components
 * so they can render a calendar icon that toggles the panel.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

interface CalendarPanelContextType {
  showCalendar: boolean;
  toggleCalendar: () => void;
  openCalendar: () => void;
  closeCalendar: () => void;
}

const CalendarPanelContext = createContext<CalendarPanelContextType>({
  showCalendar: false,
  toggleCalendar: () => {},
  openCalendar: () => {},
  closeCalendar: () => {},
});

export function CalendarPanelProvider({ children }: { children: React.ReactNode }) {
  const [showCalendar, setShowCalendar] = useState(false);

  const toggleCalendar = useCallback(() => {
    setShowCalendar((prev) => !prev);
  }, []);

  const openCalendar = useCallback(() => {
    setShowCalendar(true);
  }, []);

  const closeCalendar = useCallback(() => {
    setShowCalendar(false);
  }, []);

  return (
    <CalendarPanelContext.Provider value={{ showCalendar, toggleCalendar, openCalendar, closeCalendar }}>
      {children}
    </CalendarPanelContext.Provider>
  );
}

export function useCalendarPanel() {
  return useContext(CalendarPanelContext);
}
