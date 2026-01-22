import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  getSlotPresets,
  getCalendarEntriesForDate,
  getCalendarEntries,
  createCalendarEntry,
  CalendarEntry,
  CalendarSlotPreset,
} from '@/lib/calendar';
import { getUserOutfits } from '@/lib/outfits';
import { supabase } from '@/lib/supabase';

export default function CalendarScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slotPresets, setSlotPresets] = useState<CalendarSlotPreset[]>([]);
  const [entries, setEntries] = useState<Map<string, CalendarEntry[]>>(new Map());
  const [outfitImages, setOutfitImages] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [selectedDateForEntry, setSelectedDateForEntry] = useState<Date>(new Date());
  const [shouldAutoOpenAdd, setShouldAutoOpenAdd] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [modalCurrentDate, setModalCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const modalYear = modalCurrentDate.getFullYear();
  const modalMonth = modalCurrentDate.getMonth();

  useEffect(() => {
    if (user && !isInitializing) {
      initialize();
    }
  }, [user, year, month]);

  // Check for openAddPicker parameter and auto-open the date picker modal
  useEffect(() => {
    if (params.openAddPicker === 'true' && !loading) {
      setModalCurrentDate(new Date()); // Reset modal to current month
      setShowDatePickerModal(true);
      // Clear the parameter by navigating without it
      router.replace('/(tabs)/calendar' as any);
    }
  }, [params.openAddPicker, loading]);


  const initialize = async () => {
    if (!user || isInitializing) return;

    setIsInitializing(true);
    setLoading(true);

    // Load slot presets and month entries in parallel
    const [presetsResult] = await Promise.all([
      getSlotPresets(user.id),
      loadMonthEntries()
    ]);
    
    if (presetsResult.data) {
      setSlotPresets(presetsResult.data);
    }

    setLoading(false);
    setIsInitializing(false);
  };

  const loadMonthEntries = async () => {
    if (!user) return;

    // Get all dates in current month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = lastDay.toISOString().split('T')[0];
    
    // Batch load all entries for the entire month in one query
    const { data: monthEntries } = await getCalendarEntries(user.id, startDate, endDate);
    
    // Group entries by date
    const entriesMap = new Map<string, CalendarEntry[]>();
    if (monthEntries) {
      monthEntries.forEach((entry) => {
        const date = entry.calendar_day?.date || (entry as any).calendar_days?.date;
        if (date) {
          const existing = entriesMap.get(date) || [];
          existing.push(entry);
          entriesMap.set(date, existing);
        }
      });
    }
    
    setEntries(entriesMap);
    
    // Load outfit images for entries with outfits
    await loadOutfitImages(monthEntries || []);
  };

  const loadOutfitImages = async (entries: CalendarEntry[]) => {
    const imagesMap = new Map<string, string | null>();
    
    // Get unique outfit IDs
    const outfitIds = [...new Set(entries.filter(e => e.outfit_id).map(e => e.outfit_id!))];
    
    // Load cover images for all outfits in parallel
    const outfitPromises = outfitIds.map(outfitId =>
      supabase
        .from('outfits')
        .select('id, cover_image_id, cover_image:images!cover_image_id(storage_key, storage_bucket)')
        .eq('id', outfitId)
        .single()
    );
    
    const outfitResults = await Promise.all(outfitPromises);
    
    for (const { data: outfit } of outfitResults) {
      if (outfit?.cover_image?.storage_key) {
        const storageBucket = (outfit.cover_image as any).storage_bucket || 'media';
        const { data: urlData } = supabase.storage
          .from(storageBucket)
          .getPublicUrl((outfit.cover_image as any).storage_key);
        
        if (urlData?.publicUrl) {
          imagesMap.set(outfit.id, urlData.publicUrl);
        }
      }
    }
    
    setOutfitImages(imagesMap);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMonthEntries();
    setRefreshing(false);
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(year, month + direction, 1);
    setCurrentDate(newDate);
  };

  const navigateModalMonth = (direction: number) => {
    const newDate = new Date(modalYear, modalMonth + direction, 1);
    setModalCurrentDate(newDate);
  };

  const getModalDaysInMonth = (): Date[] => {
    const firstDay = new Date(modalYear, modalMonth, 1);
    const lastDay = new Date(modalYear, modalMonth + 1, 0);
    const days: Date[] = [];

    // Add padding days from previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(modalYear, modalMonth, -i);
      days.push(date);
    }

    // Add days in current month
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    // Add padding days from next month to fill week
    const endPadding = 6 - lastDay.getDay();
    for (let i = 1; i <= endPadding; i++) {
      const date = new Date(modalYear, modalMonth + 1, i);
      days.push(date);
    }

    return days;
  };

  const isModalCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === modalMonth && date.getFullYear() === modalYear;
  };

  const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatDayLabel = (date: Date): string => {
    return date.getDate().toString();
  };

  const getDaysInMonth = (): Date[] => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Add padding days from previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(date);
    }

    // Add days in current month
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    // Add padding days from next month to fill week
    const endPadding = 6 - lastDay.getDay();
    for (let i = 1; i <= endPadding; i++) {
      const date = new Date(year, month + 1, i);
      days.push(date);
    }

    return days;
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === month && date.getFullYear() === year;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getDayEntries = (date: Date): CalendarEntry[] => {
    const dateKey = formatDateKey(date);
    return entries.get(dateKey) || [];
  };

  const handleDayPress = (date: Date) => {
    const dateKey = formatDateKey(date);
    router.push(`/calendar/day/${dateKey}`);
  };

  const handleDateSelect = (date: Date) => {
    setShowDatePickerModal(false);
    const dateKey = formatDateKey(date);
    // Pass autoAdd parameter to automatically open the add entry modal
    router.push(`/calendar/day/${dateKey}?autoAdd=true`);
  };

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

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = getDaysInMonth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" style={styles.loader} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Month Navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {monthNames[month]} {year}
        </Text>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Week Days Header */}
      <View style={styles.weekDaysRow}>
        {weekDays.map((day) => (
          <View key={day} style={styles.weekDay}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {days.map((date, index) => {
          const dateKey = formatDateKey(date);
          const dayEntries = getDayEntries(date);
          const inCurrentMonth = isCurrentMonth(date);
          const today = isToday(date);

          const outfitEntries = dayEntries.filter(e => e.outfit_id);
          const firstEntry = outfitEntries[0];
          const imageUrl = firstEntry?.outfit_id ? outfitImages.get(firstEntry.outfit_id) : null;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                !inCurrentMonth && styles.dayCellOtherMonth,
                today && styles.dayCellToday,
              ]}
              onPress={() => handleDayPress(date)}
            >
              <Text
                style={[
                  styles.dayNumber,
                  !inCurrentMonth && styles.dayNumberOtherMonth,
                  today && styles.dayNumberToday,
                ]}
              >
                {formatDayLabel(date)}
              </Text>
              
              {/* Render outfit image */}
              {outfitEntries.length > 0 && (
                <View style={styles.outfitImagesContainer}>
                  {imageUrl ? (
                    <ExpoImage
                      source={{ uri: imageUrl }}
                      style={styles.outfitImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.outfitImagePlaceholder} />
                  )}
                  
                  {/* More indicator */}
                  {outfitEntries.length > 1 && (
                    <View style={styles.moreIndicator}>
                      <Text style={styles.moreIndicatorText}>+{outfitEntries.length - 1}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

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
              {/* Mini Calendar for Date Selection */}
              <View style={styles.miniCalendar}>
                {/* Month Navigation in Modal */}
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
                          {formatDayLabel(date)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
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
    backgroundColor: '#fff',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  navButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 22,
    color: '#000',
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 120,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 4,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  dayCellOtherMonth: {
    backgroundColor: '#f9f9f9',
  },
  dayCellToday: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
    borderWidth: 2,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  dayNumberOtherMonth: {
    color: '#999',
  },
  dayNumberToday: {
    fontWeight: 'bold',
    color: '#ff9800',
  },
  outfitImagesContainer: {
    flex: 1,
    width: '100%',
    marginTop: 2,
    position: 'relative',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  outfitImage: {
    width: '100%',
    height: '100%',
  },
  outfitImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  moreIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  moreIndicatorText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 28,
    color: '#666',
  },
  modalBody: {
    padding: 20,
  },
  miniCalendar: {
    width: '100%',
  },
  miniMonthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  miniNavButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniNavButtonText: {
    fontSize: 22,
    color: '#000',
    fontWeight: 'bold',
  },
  miniMonthTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  miniWeekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  miniWeekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  miniWeekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  miniCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  miniDayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniDayCellOtherMonth: {
    backgroundColor: '#f9f9f9',
  },
  miniDayCellToday: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
    borderWidth: 2,
  },
  miniDayNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  miniDayNumberOtherMonth: {
    color: '#999',
  },
  miniDayNumberToday: {
    fontWeight: 'bold',
    color: '#ff9800',
  },
});