/**
 * LookbookQuickAddModal Component
 * Bottom sheet listing existing lookbooks + create-new option for quick tab pinning.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/components/shared';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

type LookbookItem = {
  id: string;
  title: string;
};

type LookbookQuickAddModalProps = {
  visible: boolean;
  onClose: () => void;
  lookbooks: LookbookItem[];
  loading: boolean;
  onSelectLookbook: (id: string, title: string) => void;
  onCreateNew: () => void;
};

export default function LookbookQuickAddModal({
  visible,
  onClose,
  lookbooks,
  loading,
  onSelectLookbook,
  onCreateNew,
}: LookbookQuickAddModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Add Lookbook Tab" maxHeight="60%">
      <TouchableOpacity
        style={styles.createRow}
        onPress={() => {
          onClose();
          onCreateNew();
        }}
      >
        <View style={styles.createIcon}>
          <Ionicons name="add-outline" size={20} color={colors.white} />
        </View>
        <Text style={styles.createText}>Create New Lookbook</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={lookbooks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.lookbookRow}
              onPress={() => {
                onClose();
                onSelectLookbook(item.id, item.title);
              }}
            >
              <Ionicons name="book-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.lookbookTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No lookbooks yet</Text>
            </View>
          }
        />
      )}
    </BottomSheet>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    createRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    createIcon: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.round,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    createText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.borderLight,
      marginVertical: spacing.sm,
    },
    lookbookRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      borderRadius: borderRadius.md,
    },
    lookbookTitle: {
      flex: 1,
      fontSize: typography.fontSize.base,
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.medium,
    },
    loadingContainer: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    emptyContainer: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
    },
  });
