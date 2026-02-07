import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius } from '@/styles';

export function AppearanceSection() {
  const { isDark, toggleTheme, colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Appearance
      </Text>
      <TouchableOpacity
        style={[styles.toggleRow, { borderColor: colors.border }]}
        onPress={toggleTheme}
        activeOpacity={0.7}
      >
        <View style={styles.labelRow}>
          <Ionicons
            name={isDark ? 'moon' : 'sunny'}
            size={20}
            color={isDark ? colors.primary : colors.warning}
          />
          <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
            Dark Mode
          </Text>
        </View>
        <View
          style={[
            styles.toggle,
            { backgroundColor: isDark ? colors.primary : colors.border },
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              { backgroundColor: isDark ? '#000' : '#fff' },
              isDark && styles.toggleThumbActive,
            ]}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleLabel: {
    fontSize: typography.fontSize.base,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    padding: 2,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
});
