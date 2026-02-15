/**
 * CalendarEntryFlowContext
 * Global date selector flow for creating calendar entries.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { CalendarDatePickerModal } from '@/components/calendar';

type CalendarEntryFlowContextType = {
  openDateSelector: (initialDate?: Date) => void;
  closeDateSelector: () => void;
};

const CalendarEntryFlowContext = createContext<CalendarEntryFlowContextType>({
  openDateSelector: () => {},
  closeDateSelector: () => {},
});

export function CalendarEntryFlowProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [initialDate, setInitialDate] = useState<Date>(new Date());

  const openDateSelector = useCallback((date?: Date) => {
    setInitialDate(date ?? new Date());
    setVisible(true);
  }, []);

  const closeDateSelector = useCallback(() => {
    setVisible(false);
  }, []);

  const handleSelectDate = useCallback(
    (date: Date) => {
      setVisible(false);
      const dateKey = date.toISOString().split('T')[0];
      router.push(`/calendar/entry/${dateKey}` as any);
    },
    [router]
  );

  const value = useMemo(
    () => ({
      openDateSelector,
      closeDateSelector,
    }),
    [openDateSelector, closeDateSelector]
  );

  return (
    <CalendarEntryFlowContext.Provider value={value}>
      {children}
      <CalendarDatePickerModal
        visible={visible}
        initialDate={initialDate}
        onClose={closeDateSelector}
        onSelectDate={handleSelectDate}
      />
    </CalendarEntryFlowContext.Provider>
  );
}

export function useCalendarEntryFlow() {
  return useContext(CalendarEntryFlowContext);
}
