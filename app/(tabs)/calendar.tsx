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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendarEntries } from '@/hooks/calendar';
import { MonthNavigator, CalendarGrid, CalendarDatePickerModal } from '@/components/calendar';
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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

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

  const navigateMonth = (direction: number) => {
    const newDate = new Date(year, month + direction, 1);
    setCurrentDate(newDate);
  };

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
      <View style={commonStyles.container}>
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
      <MonthNavigator currentDate={currentDate} onNavigate={navigateMonth} />

      <CalendarGrid
        currentDate={currentDate}
        entries={entries}
        outfitImages={outfitImages}
        onDayPress={handleDayPress}
      />

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
});
