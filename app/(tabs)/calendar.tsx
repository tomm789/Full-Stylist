/**
 * Calendar Screen (Refactored)
 * Monthly calendar view with outfit previews
 *
 * BEFORE: 532 lines
 * AFTER: ~180 lines (66% reduction)
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendarEntries } from '@/hooks/calendar';
import { MonthNavigator, CalendarDatePickerModal } from '@/components/calendar';
import CalendarWeekHeader from '@/components/calendar/CalendarWeekHeader';
import CalendarContinuousGrid from '@/components/calendar/CalendarContinuousGrid';
import { LoadingSpinner } from '@/components/shared';
import { theme, commonStyles } from '@/styles';

const { colors, spacing } = theme;

export default function CalendarScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [activeMonthDate, setActiveMonthDate] = useState<Date>(() => new Date());
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [datePickerInitialDate, setDatePickerInitialDate] = useState<Date>(new Date());
  const [rangeCenterDate, setRangeCenterDate] = useState<Date>(() => new Date());
  const [months, setMonths] = useState<Date[]>(() => {
    const today = new Date();
    return buildMonthWindow(today, 6, 6);
  });

  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollYRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const contentHeightRef = useRef(0);
  const pendingScrollKeyRef = useRef<string | null>(null);
  const isExtendingRef = useRef(false);
  const pendingPrependAdjustRef = useRef<{ prevHeight: number; scrollY: number } | null>(null);
  const suppressScrollUpdateRef = useRef(false);

  const year = activeMonthDate.getFullYear();
  const month = activeMonthDate.getMonth();

  const getMonthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();
  const getMonthKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  const isWithinMonthWindow = (
    date: Date,
    center: Date,
    pastMonths: number,
    futureMonths: number
  ) => {
    const diff = getMonthIndex(date) - getMonthIndex(center);
    return diff >= -pastMonths && diff <= futureMonths;
  };

  const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

  const getEndOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const getMonthOffsetDate = (date: Date, offset: number) =>
    new Date(date.getFullYear(), date.getMonth() + offset, 1);

  const rangeStartDate = getStartOfMonth(getMonthOffsetDate(rangeCenterDate, -2));
  const rangeEndDate = getEndOfMonth(getMonthOffsetDate(rangeCenterDate, 4));

  const startDate = rangeStartDate.toISOString().split('T')[0];
  const endDate = rangeEndDate.toISOString().split('T')[0];

  const { entries, outfitImages, loading } = useCalendarEntries({
    userId: user?.id,
    startDate,
    endDate,
  });

  const windowStartDate = useMemo(
    () => getStartOfMonth(months[0]),
    [months]
  );
  const windowEndDate = useMemo(
    () => getEndOfMonth(months[months.length - 1]),
    [months]
  );

  // Auto-open add picker if parameter is set
  useEffect(() => {
    if (params.openAddPicker === 'true' && !loading) {
      setDatePickerInitialDate(new Date());
      setShowDatePickerModal(true);
      router.replace('/(tabs)/calendar' as any);
    }
  }, [params.openAddPicker, loading]);

  const updateRangeCenter = (newDate: Date) => {
    if (!isWithinMonthWindow(newDate, rangeCenterDate, 2, 4)) {
      setRangeCenterDate(newDate);
    }
  };

  const ensureMonthsContain = (targetDate: Date) => {
    const targetIndex = getMonthIndex(targetDate);
    const first = months[0];
    const last = months[months.length - 1];
    const firstIndex = getMonthIndex(first);
    const lastIndex = getMonthIndex(last);

    if (targetIndex < firstIndex) {
      const diff = firstIndex - targetIndex;
      const additions: Date[] = [];
      for (let i = diff; i >= 1; i--) {
        additions.push(getMonthOffsetDate(first, -i));
      }
      isExtendingRef.current = true;
      setMonths([...additions, ...months]);
      return true;
    }

    if (targetIndex > lastIndex) {
      const diff = targetIndex - lastIndex;
      const additions: Date[] = [];
      for (let i = 1; i <= diff; i++) {
        additions.push(getMonthOffsetDate(last, i));
      }
      isExtendingRef.current = true;
      setMonths([...months, ...additions]);
      return true;
    }

    return false;
  };

  const extendMonths = (direction: 'past' | 'future') => {
    if (isExtendingRef.current) {
      return;
    }

    const count = 6;
    const first = months[0];
    const last = months[months.length - 1];

    isExtendingRef.current = true;

    if (direction === 'past') {
      const additions: Date[] = [];
      for (let i = count; i >= 1; i--) {
        additions.push(getMonthOffsetDate(first, -i));
      }
      pendingPrependAdjustRef.current = {
        prevHeight: contentHeightRef.current,
        scrollY: scrollYRef.current,
      };
      setMonths([...additions, ...months]);
      return;
    }

    const additions: Date[] = [];
    for (let i = 1; i <= count; i++) {
      additions.push(getMonthOffsetDate(last, i));
    }
    setMonths([...months, ...additions]);
  };

  const handleMonthNavigate = (direction: number) => {
    const targetDate = new Date(year, month + direction, 1);
    const targetKey = getMonthKey(targetDate);
    const didExtend = ensureMonthsContain(targetDate);

    suppressScrollUpdateRef.current = true;
    if (!didExtend) {
      const targetIndex = getDayIndex(windowStartDate, targetDate);
      const y = getRowOffset(targetIndex);
      scrollRef.current?.scrollTo({ y, animated: true });
      pendingScrollKeyRef.current = null;
    } else {
      pendingScrollKeyRef.current = targetKey;
    }

    setActiveMonthDate(targetDate);
    updateRangeCenter(targetDate);
  };

  const handleToday = () => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const targetKey = getMonthKey(targetDate);
    const didExtend = ensureMonthsContain(targetDate);

    suppressScrollUpdateRef.current = true;
    if (!didExtend) {
      const targetIndex = getDayIndex(windowStartDate, today);
      const y = getRowOffset(targetIndex);
      scrollRef.current?.scrollTo({ y, animated: true });
      pendingScrollKeyRef.current = null;
    } else {
      pendingScrollKeyRef.current = targetKey;
    }

    setActiveMonthDate(targetDate);
    updateRangeCenter(targetDate);
  };

  const updateActiveMonthFromScroll = () => {
    if (suppressScrollUpdateRef.current) {
      return;
    }
    const scrollY = scrollYRef.current;
    const rowHeight = 120;
    const rowIndex = Math.floor(scrollY / rowHeight);
    const dateIndex = rowIndex * 7;
    const dateAtTop = getDateAtIndex(windowStartDate, dateIndex);

    if (!dateAtTop) {
      return;
    }

    const nextActive = new Date(dateAtTop.getFullYear(), dateAtTop.getMonth(), 1);
    const currentKey = getMonthKey(activeMonthDate);
    const nextKey = getMonthKey(nextActive);

    if (currentKey !== nextKey) {
      setActiveMonthDate(nextActive);
      updateRangeCenter(nextActive);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    scrollYRef.current = contentOffset.y;

    updateActiveMonthFromScroll();

    const viewportHeight = viewportHeightRef.current;
    const contentHeight = contentHeightRef.current;
    const threshold = 400;

    if (contentOffset.y < threshold && !isExtendingRef.current) {
      pendingScrollKeyRef.current = getMonthKey(activeMonthDate);
      extendMonths('past');
    } else if (
      contentOffset.y + viewportHeight > contentHeight - threshold &&
      !isExtendingRef.current
    ) {
      extendMonths('future');
    }
  };

  const handleScrollEnd = () => {
    suppressScrollUpdateRef.current = false;
    updateActiveMonthFromScroll();
  };

  useEffect(() => {
    updateRangeCenter(activeMonthDate);
  }, [activeMonthDate]);

  useEffect(() => {
    if (pendingScrollKeyRef.current) {
      const targetDate = parseMonthKey(pendingScrollKeyRef.current);
      const targetIndex = getDayIndex(windowStartDate, targetDate);
      const y = getRowOffset(targetIndex);
      scrollRef.current?.scrollTo({ y, animated: false });
      pendingScrollKeyRef.current = null;
      isExtendingRef.current = false;
    }
  }, [months, windowStartDate]);

  const handleDayPress = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    router.push(`/calendar/day/${dateKey}`);
  };

  const handleDateSelect = (date: Date) => {
    setShowDatePickerModal(false);
    const dateKey = date.toISOString().split('T')[0];
    router.push(`/calendar/day/${dateKey}?autoAdd=true`);
  };

  if (loading && entries.size === 0) {
    return (
      <View style={commonStyles.loadingContainer}>
        <LoadingSpinner text="Loading calendar..." />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[
        '#002B73',
        colors.primaryLight,
        '#003B9E',
        '#6FB2FF',
        '#00205A',
      ]}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0.46, y: 0 }}
      end={{ x: 0.54, y: 1 }}
      style={styles.container}
    >
      <View style={styles.headerShell}>
        <MonthNavigator
          currentDate={activeMonthDate}
          onNavigate={handleMonthNavigate}
          onToday={handleToday}
        />
        <CalendarWeekHeader />
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false, listener: handleScroll }
        )}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        scrollEventThrottle={16}
        onLayout={(event) => {
          const height = event.nativeEvent.layout.height;
          viewportHeightRef.current = height;
          setViewportHeight(height);
        }}
        onContentSizeChange={(_, height) => {
          contentHeightRef.current = height;
          const pending = pendingPrependAdjustRef.current;
          if (pending && height > pending.prevHeight) {
            const delta = height - pending.prevHeight;
            scrollRef.current?.scrollTo({ y: pending.scrollY + delta, animated: false });
            pendingPrependAdjustRef.current = null;
            isExtendingRef.current = false;
          }
        }}
      >
        <CalendarContinuousGrid
          startDate={windowStartDate}
          endDate={windowEndDate}
          entries={entries}
          outfitImages={outfitImages}
          onDayPress={handleDayPress}
          scrollY={scrollY}
          viewportHeight={viewportHeight}
        />

        <CalendarDatePickerModal
          visible={showDatePickerModal}
          initialDate={datePickerInitialDate}
          onClose={() => setShowDatePickerModal(false)}
          onSelectDate={handleDateSelect}
        />
      </Animated.ScrollView>
    </LinearGradient>
  );
}

function buildMonthWindow(center: Date, pastMonths: number, futureMonths: number) {
  const start = new Date(center.getFullYear(), center.getMonth() - pastMonths, 1);
  const end = new Date(center.getFullYear(), center.getMonth() + futureMonths, 1);
  const months: Date[] = [];

  const cursor = new Date(start);
  while (cursor <= end) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function getDayIndex(startDate: Date, targetDate: Date) {
  const start = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const target = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  return Math.max(0, Math.floor((target - start) / 86400000));
}

function getDateAtIndex(startDate: Date, index: number) {
  if (index < 0) {
    return null;
  }
  const date = new Date(startDate);
  date.setDate(date.getDate() + index);
  return date;
}

function getRowOffset(dayIndex: number) {
  const rowHeight = 120;
  const rowIndex = Math.floor(dayIndex / 7);
  return rowIndex * rowHeight;
}

function parseMonthKey(key: string) {
  const [year, month] = key.split('-').map((value) => parseInt(value, 10));
  return new Date(year, month - 1, 1);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    backgroundColor: 'transparent',
  },
  headerShell: {
    backgroundColor: colors.white,
  },
});
