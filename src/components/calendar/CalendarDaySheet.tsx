/**
 * CalendarDaySheet Component
 * Slide-up day view that can expand to full screen.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useDayEntries, useSlotPresets, useUserOutfits } from '@/hooks/calendar';
import { EntryCard } from '@/components/calendar';
import { LoadingSpinner } from '@/components/shared';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface CalendarDaySheetProps {
  visible: boolean;
  dateKey: string | null;
  userId?: string;
  onClose: () => void;
  onChangeDate?: (dateKey: string) => void;
}

export default function CalendarDaySheet({
  visible,
  dateKey,
  userId,
  onClose,
  onChangeDate,
}: CalendarDaySheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const sheetHeight = useRef(new Animated.Value(SCREEN_HEIGHT * 0.82)).current;
  const scrollOffsetRef = useRef(0);

  const { entries, loading, updateEntry, deleteEntry, reorderEntries } = useDayEntries({
    userId,
    date: dateKey ?? undefined,
  });
  const { presets } = useSlotPresets({ userId });
  const { outfits, outfitImages } = useUserOutfits({ userId });

  const formattedDate = useMemo(() => {
    if (!dateKey) return '';
    const date = new Date(dateKey);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [dateKey]);

  useEffect(() => {
    if (!visible) return;
    setExpanded(false);
    Animated.timing(sheetHeight, {
      toValue: SCREEN_HEIGHT * 0.82,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [visible, sheetHeight]);

  const expandSheet = () => {
    if (expanded) return;
    setExpanded(true);
    Animated.timing(sheetHeight, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

  const collapseToSheet = () => {
    if (!expanded) return;
    setExpanded(false);
    Animated.timing(sheetHeight, {
      toValue: SCREEN_HEIGHT * 0.82,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

  const panGesture = Gesture.Pan()
    .activeOffsetY([-5, 5])
    .failOffsetX([-12, 12])
    .onEnd((e) => {
      if (!expanded && e.translationY < -40) {
        expandSheet();
      } else if (expanded && e.translationY > 40 && scrollOffsetRef.current <= 0) {
        collapseToSheet();
      }
    });

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  };

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (expanded && offsetY <= -24) {
      collapseToSheet();
    }
  };

  const handleNavigateDay = (direction: 'prev' | 'next') => {
    if (!dateKey) return;
    const current = new Date(dateKey);
    const delta = direction === 'prev' ? -1 : 1;
    current.setDate(current.getDate() + delta);
    const nextKey = current.toISOString().split('T')[0];
    onChangeDate?.(nextKey);
  };

  if (!dateKey) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={[styles.overlay, expanded && styles.overlayExpanded]}
        onPress={expanded ? undefined : onClose}
      >
        <Pressable onPress={() => {}}>
          <Animated.View style={[styles.sheet, { height: sheetHeight }, expanded && styles.sheetExpanded]}>
            <GestureDetector gesture={panGesture}>
              <View style={styles.dragHandleWrap}>
                <View style={styles.dragHandle} />
              </View>
            </GestureDetector>

            <View style={[styles.header, expanded && styles.headerExpanded]}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={onClose}
                accessibilityLabel="Back"
              >
                <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle}>{formattedDate}</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => handleNavigateDay('prev')}
                >
                  <Text style={styles.navButtonText}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => handleNavigateDay('next')}
                >
                  <Text style={styles.navButtonText}>›</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <View style={styles.loading}>
                <LoadingSpinner text="Loading day..." />
              </View>
            ) : (
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                onScroll={handleScroll}
                onScrollEndDrag={handleScrollEndDrag}
                scrollEventThrottle={16}
                bounces
                alwaysBounceVertical
              >
                {entries.length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>No entries for this day</Text>
                  </View>
                ) : (
                  <View style={styles.entries}>
                    {entries.map((entry, index) => (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        slotPresets={presets}
                        outfits={outfits}
                        outfitImages={outfitImages}
                        canMoveUp={index > 0}
                        canMoveDown={index < entries.length - 1}
                        onMoveUp={() => {
                          if (index > 0) {
                            reorderEntries(index, index - 1);
                          }
                        }}
                        onMoveDown={() => {
                          if (index < entries.length - 1) {
                            reorderEntries(index, index + 1);
                          }
                        }}
                        onEdit={() => router.push(`/calendar/entry/${dateKey}?entryId=${entry.id}` as any)}
                        onDelete={() => {
                          Alert.alert('Delete entry?', 'This cannot be undone.', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(entry.id) },
                          ]);
                        }}
                        onViewOutfit={(outfitId) => router.push(`/outfits/${outfitId}/view`)}
                        onStatusChange={(status) => updateEntry(entry.id, { status })}
                      />
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => router.push(`/calendar/entry/${dateKey}` as any)}
                >
                  <Text style={styles.addButtonText}>+ Add Entry</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: 'flex-end',
  },
  overlayExpanded: {
    backgroundColor: 'transparent',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  sheetExpanded: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerExpanded: {
    paddingTop: spacing.md,
  },
  headerButton: {
    padding: spacing.xs,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: 'bold',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  entries: {
    gap: spacing.sm + spacing.xs / 2,
    marginBottom: spacing.lg + spacing.md,
  },
  empty: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  addButton: {
    backgroundColor: colors.black,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl + spacing.lg,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
