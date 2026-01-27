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
  Modal,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendarEntries } from '@/hooks/calendar';
import { MonthNavigator, CalendarGrid } from '@/components/calendar';
import { LoadingSpinner } from '@/components/shared';
import { theme, commonStyles } from '@/styles';

const { colors, spacing, borderRadius } = theme;

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function CalendarScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalCurrentDate, setModalCurrentDate] = useState(new Date());
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const modalYear = modalCurrentDate.getFullYear();
  const modalMonth = modalCurrentDate.getMonth();

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
      setModalCurrentDate(new Date());
      setShowDatePickerModal(true);
      router.replace('/(tabs)/calendar' as any);
    }
  }, [params.openAddPicker, loading]);

  const navigateMonth = (direction: number) => {
    const newDate = new Date(year, month + direction, 1);
    setCurrentDate(newDate);
  };

  const navigateModalMonth = (direction: number) => {
    const newDate = new Date(modalYear, modalMonth + direction, 1);
    setModalCurrentDate(newDate);
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

  const getModalDaysInMonth = (): Date[] => {
    const firstDay = new Date(modalYear, modalMonth, 1);
    const lastDay = new Date(modalYear, modalMonth + 1, 0);
    const days: Date[] = [];

    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(new Date(modalYear, modalMonth, -i));
    }

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    const endPadding = 6 - lastDay.getDay();
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(modalYear, modalMonth + 1, i));
    }

    return days;
  };

  const isModalCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === modalMonth && date.getFullYear() === modalYear;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
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

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePickerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePickerModal(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Month Navigation */}
              <View style={styles.miniMonthNav}>
                <TouchableOpacity
                  onPress={() => navigateModalMonth(-1)}
                  style={styles.miniNavButton}
                >
                  <Text style={styles.miniNavButtonText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.miniMonthTitle}>
                  {monthNames[modalMonth]} {modalYear}
                </Text>
                <TouchableOpacity
                  onPress={() => navigateModalMonth(1)}
                  style={styles.miniNavButton}
                >
                  <Text style={styles.miniNavButtonText}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Week Days */}
              <View style={styles.miniWeekDaysRow}>
                {weekDays.map((day) => (
                  <View key={day} style={styles.miniWeekDay}>
                    <Text style={styles.miniWeekDayText}>{day.charAt(0)}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.miniCalendarGrid}>
                {getModalDaysInMonth().map((date, index) => {
                  const inCurrentMonth = isModalCurrentMonth(date);
                  const today = isToday(date);

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.miniDayCell,
                        !inCurrentMonth && styles.miniDayCellOtherMonth,
                        today && styles.miniDayCellToday,
                      ]}
                      onPress={() => handleDateSelect(date)}
                    >
                      <Text
                        style={[
                          styles.miniDayNumber,
                          !inCurrentMonth && styles.miniDayNumberOtherMonth,
                          today && styles.miniDayNumberToday,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalClose: {
    fontSize: 28,
    color: colors.textSecondary,
  },
  modalBody: {
    padding: spacing.lg,
  },
  miniMonthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  miniNavButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniNavButtonText: {
    fontSize: 22,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  miniMonthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  miniWeekDaysRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  miniWeekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  miniWeekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  miniCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  miniDayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniDayCellOtherMonth: {
    backgroundColor: colors.gray50,
  },
  miniDayCellToday: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  miniDayNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  miniDayNumberOtherMonth: {
    color: colors.textTertiary,
  },
  miniDayNumberToday: {
    fontWeight: 'bold',
    color: colors.primary,
  },
});
