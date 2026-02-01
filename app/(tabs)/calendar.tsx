/**
 * Calendar Screen (Refactored)
 * Monthly calendar view with outfit previews
 *
 * BEFORE: 532 lines
 * AFTER: ~180 lines (66% reduction)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendarEntries } from '@/hooks/calendar';
import { MonthNavigator, CalendarGrid, CalendarDatePickerModal } from '@/components/calendar';
import { useMonthCarousel } from '@/components/calendar/useMonthCarousel';
import { LoadingSpinner } from '@/components/shared';
import { theme, commonStyles } from '@/styles';

const { colors, spacing } = theme;

export default function CalendarScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [datePickerInitialDate, setDatePickerInitialDate] = useState<Date>(new Date());
  const [rangeCenterDate, setRangeCenterDate] = useState<Date>(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getMonthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();

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

  const rangeStartDate = getStartOfMonth(getMonthOffsetDate(rangeCenterDate, -1));
  const rangeEndDate = getEndOfMonth(getMonthOffsetDate(rangeCenterDate, 3));

  const startDate = rangeStartDate.toISOString().split('T')[0];
  const endDate = rangeEndDate.toISOString().split('T')[0];

  const { entries, outfitImages, loading, refresh } = useCalendarEntries({
    userId: user?.id,
    startDate,
    endDate,
  });

  // Auto-open add picker if parameter is set
  useEffect(() => {
    if (params.openAddPicker === 'true' && !loading) {
      setDatePickerInitialDate(new Date());
      setShowDatePickerModal(true);
      router.replace('/(tabs)/calendar' as any);
    }
  }, [params.openAddPicker, loading]);

  const updateRangeCenter = (newDate: Date) => {
    if (!isWithinMonthWindow(newDate, rangeCenterDate, 1, 3)) {
      setRangeCenterDate(newDate);
    }
  };

  const handleMonthNavigate = (direction: number) => {
    const newDate = new Date(year, month + direction, 1);
    setCurrentDate(newDate);
    updateRangeCenter(newDate);
  };

  const {
    gridDates,
    slideX,
    slideDirection,
    containerWidth,
    handleMonthNavigate: handleCarouselNavigate,
    handleCalendarLayout,
  } = useMonthCarousel({
    currentDate,
    onNavigate: handleMonthNavigate,
  });

  const handleDayPress = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    router.push(`/calendar/day/${dateKey}`);
  };

  const handleDateSelect = (date: Date) => {
    setShowDatePickerModal(false);
    const dateKey = date.toISOString().split('T')[0];
    router.push(`/calendar/day/${dateKey}?autoAdd=true`);
  };

  if (loading) {
    return (
      <View style={commonStyles.loadingContainer}>
        <LoadingSpinner text="Loading calendar..." />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
    >
      <MonthNavigator currentDate={currentDate} onNavigate={handleCarouselNavigate} />

      <View style={styles.calendarViewport} onLayout={handleCalendarLayout}>
        <Animated.View
          style={[
            styles.calendarTrack,
            containerWidth ? { width: containerWidth * gridDates.length } : null,
            {
              transform: [
                {
                  translateX:
                    slideDirection && containerWidth ? slideX : 0,
                },
              ],
            },
          ]}
        >
          {gridDates.map((date) => (
            <View
              key={date.toISOString()}
              style={[styles.calendarPage, containerWidth ? { width: containerWidth } : null]}
            >
              <CalendarGrid
                currentDate={date}
                entries={entries}
                outfitImages={outfitImages}
                onDayPress={handleDayPress}
                onMonthSwipe={handleCarouselNavigate}
              />
            </View>
          ))}
        </Animated.View>
      </View>

      <CalendarDatePickerModal
        visible={showDatePickerModal}
        initialDate={datePickerInitialDate}
        onClose={() => setShowDatePickerModal(false)}
        onSelectDate={handleDateSelect}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  calendarViewport: {
    overflow: 'hidden',
  },
  calendarTrack: {
    flexDirection: 'row',
  },
  calendarPage: {
    width: '100%',
  },
});
