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
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
  TouchableOpacity,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendarEntryFlow } from '@/contexts/CalendarEntryFlowContext';
import { useCalendarEntries } from '@/hooks/calendar';
import {
  getMonthIndex,
  getMonthKey,
  isWithinMonthWindow,
  getStartOfMonth,
  getEndOfMonth,
  getMonthOffsetDate,
  getDayIndex,
  getDateAtIndex,
  parseMonthKey,
  buildMonthWindow,
  getRowOffset,
} from '@/lib/calendar/dateUtils';
import { CALENDAR_CONFIG } from '@/lib/calendar/config';
import { MonthNavigator } from '@/components/calendar';
import CalendarWeekHeader from '@/components/calendar/CalendarWeekHeader';
import CalendarContinuousGrid from '@/components/calendar/CalendarContinuousGrid';
import { HeaderActionIcons, LoadingSpinner } from '@/components/shared';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { createCommonStyles } from '@/styles/commonStyles';
import { createStyles } from './styles';

const { spacing } = theme;

export default function CalendarScreen() {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { openDateSelector } = useCalendarEntryFlow();
  const { unreadCount } = useNotifications();

  const [activeMonthDate, setActiveMonthDate] = useState<Date>(() => new Date());
  const [rangeCenterDate, setRangeCenterDate] = useState<Date>(() => new Date());
  const [error, setError] = useState<Error | null>(null);
  const [months, setMonths] = useState<Date[]>(() => {
    const today = new Date();
    return buildMonthWindow(today, CALENDAR_CONFIG.PAST_MONTHS, CALENDAR_CONFIG.FUTURE_MONTHS);
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
  const programmaticScrollInProgressRef = useRef(false);
  const hasScrolledToInitialMonthRef = useRef(false);

  const year = activeMonthDate.getFullYear();
  const month = activeMonthDate.getMonth();

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

  const scrollToTodayRow = (animated = false) => {
    const today = new Date();
    const targetIndex = getDayIndex(windowStartDate, today);
    const y = getRowOffset(targetIndex);
    scrollRef.current?.scrollTo({ y, animated });
    if (!animated) {
      scrollYRef.current = y;
      scrollY.setValue(y);
    }
  };

  // Debug logging (removed external telemetry - use console only)
  // const didLogInitialRef = useRef(false);
  // Telemetry disabled - was sending data to external endpoint

  // Auto-open add picker if parameter is set
  useEffect(() => {
    if (params.openAddPicker === 'true' && !loading) {
      openDateSelector(new Date());
      router.replace('/calendar' as any);
    }
  }, [params.openAddPicker, loading, openDateSelector, router]);

  const updateRangeCenter = (newDate: Date) => {
    if (!isWithinMonthWindow(newDate, rangeCenterDate, CALENDAR_CONFIG.PAST_MONTHS - 4, CALENDAR_CONFIG.FUTURE_MONTHS - 2)) {
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
    const targetIndex = getDayIndex(windowStartDate, targetDate);
    const y = getRowOffset(targetIndex);
    suppressScrollUpdateRef.current = true;
    programmaticScrollInProgressRef.current = true;
    if (!didExtend) {
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
    programmaticScrollInProgressRef.current = true;
    if (!didExtend) {
      scrollToTodayRow(true);
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
    const rowIndex = Math.floor(scrollY / CALENDAR_CONFIG.ROW_HEIGHT);
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

    if (programmaticScrollInProgressRef.current) {
      return;
    }
    const viewportHeight = viewportHeightRef.current;
    const contentHeight = contentHeightRef.current;

    if (contentOffset.y < CALENDAR_CONFIG.INFINITE_SCROLL_THRESHOLD && !isExtendingRef.current) {
      pendingScrollKeyRef.current = getMonthKey(activeMonthDate);
      extendMonths('past');
    } else if (
      contentOffset.y + viewportHeight > contentHeight - CALENDAR_CONFIG.INFINITE_SCROLL_THRESHOLD &&
      !isExtendingRef.current
    ) {
      extendMonths('future');
    }
  };

  const handleScrollEnd = () => {
    suppressScrollUpdateRef.current = false;
    programmaticScrollInProgressRef.current = false;
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
    router.push(`/calendar/day/${dateKey}` as any);
  };

  if (error) {
    return (
      <View style={commonStyles.loadingContainer}>
        <Text style={{ color: colors.error, marginBottom: spacing.md }}>
          {error.message || 'Failed to load calendar'}
        </Text>
        <TouchableOpacity
          onPress={() => setError(null)}
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: colors.white, fontWeight: '600' }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        <View style={[styles.topHeader, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Calendar</Text>
          <View style={styles.headerSpacer} />
          <HeaderActionIcons
            onAdd={() => {
              openDateSelector(new Date());
            }}
            onSearch={() => router.push('/search' as any)}
            onNotifications={() => router.push('/notifications' as any)}
            unreadCount={unreadCount}
          />
        </View>
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
        scrollEventThrottle={CALENDAR_CONFIG.EVENT_THROTTLE_MS}
        onLayout={(event) => {
          const height = event.nativeEvent.layout.height;
          viewportHeightRef.current = height;
          setViewportHeight(height);
        }}
        onContentSizeChange={(_, height) => {
          contentHeightRef.current = height;
          if (!hasScrolledToInitialMonthRef.current && height > 0) {
            hasScrolledToInitialMonthRef.current = true;
            programmaticScrollInProgressRef.current = true;
            const winStart = windowStartDate;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                const today = new Date();
                const targetIndex = getDayIndex(winStart, today);
                const y = getRowOffset(targetIndex);
                scrollRef.current?.scrollTo({ y, animated: false });
                scrollYRef.current = y;
                scrollY.setValue(y);
                setTimeout(() => {
                  programmaticScrollInProgressRef.current = false;
                }, 400);
              });
            });
          }
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
      </Animated.ScrollView>
    </LinearGradient>
  );
}
