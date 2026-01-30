/**
 * CalendarDatePickerModal Component
 * Slide-up calendar modal for selecting a date
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '@/styles';

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

interface CalendarDatePickerModalProps {
  visible: boolean;
  initialDate?: Date;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
}

export default function CalendarDatePickerModal({
  visible,
  initialDate,
  onClose,
  onSelectDate,
}: CalendarDatePickerModalProps) {
  const [modalCurrentDate, setModalCurrentDate] = useState(initialDate ?? new Date());

  useEffect(() => {
    if (visible) {
      setModalCurrentDate(initialDate ?? new Date());
    }
  }, [initialDate, visible]);

  const modalYear = modalCurrentDate.getFullYear();
  const modalMonth = modalCurrentDate.getMonth();

  const modalDays = useMemo(() => {
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
  }, [modalMonth, modalYear]);

  const navigateModalMonth = (direction: number) => {
    const newDate = new Date(modalYear, modalMonth + direction, 1);
    setModalCurrentDate(newDate);
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
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

            <View style={styles.miniWeekDaysRow}>
              {weekDays.map((day) => (
                <View key={day} style={styles.miniWeekDay}>
                  <Text style={styles.miniWeekDayText}>{day.charAt(0)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.miniCalendarGrid}>
              {modalDays.map((date, index) => {
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
                    onPress={() => onSelectDate(date)}
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
  );
}

const styles = StyleSheet.create({
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
  },
  miniNavButton: {
    padding: spacing.sm,
  },
  miniNavButtonText: {
    fontSize: 24,
    color: colors.primary,
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
  },
  miniWeekDayText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  miniCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  miniDayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  miniDayCellOtherMonth: {
    opacity: 0.4,
  },
  miniDayCellToday: {
    backgroundColor: colors.primary,
  },
  miniDayNumber: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  miniDayNumberOtherMonth: {
    color: colors.textSecondary,
  },
  miniDayNumberToday: {
    color: colors.white,
    fontWeight: '600',
  },
});
