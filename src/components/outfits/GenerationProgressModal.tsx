/**
 * GenerationProgressModal Component
 * Modal showing outfit generation progress with item checking and analysis
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;
const MODAL_MAX_HEIGHT = Math.min(640, Dimensions.get('window').height * 0.85);
const MODAL_BODY_MAX_HEIGHT = Math.min(400, Dimensions.get('window').height * 0.4);

interface GenerationItem {
  id: string;
  title: string;
  orderIndex: number;
}

interface GenerationMessage {
  id: string;
  kind: 'description' | 'contexts' | 'style' | 'versatility' | 'finalizing';
  text: string;
}

interface GenerationProgressModalProps {
  visible: boolean;
  items: GenerationItem[];
  revealedItemsCount: number;
  completedItemsCount: number;
  phase: 'items' | 'analysis' | 'finalizing';
  activeMessage: GenerationMessage | null;
  /** When true, show minimal static spinner only (no list/animations). Used for PERF_MODE. */
  perfMode?: boolean;
}

export default function GenerationProgressModal({
  visible,
  items,
  revealedItemsCount,
  completedItemsCount,
  phase,
  activeMessage,
  perfMode = false,
}: GenerationProgressModalProps) {
  if (perfMode) {
    return (
      <Modal
        transparent={false}
        visible={visible}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.title, { marginTop: 16 }]}>Generating…</Text>
          </View>
        </View>
      </Modal>
    );
  }

  const revealedItems = items.slice(0, revealedItemsCount + 1);
  
  const modalTitle =
    phase === 'items'
      ? 'Checking your pieces'
      : phase === 'analysis'
        ? 'Stylist notes incoming'
        : 'Finalising your outfit';
  
  const modalSubtitle =
    phase === 'items'
      ? 'Reviewing each item before building the full look.'
      : phase === 'analysis'
        ? "Here's where this outfit will shine the most."
        : "Polishing the render and preparing your reveal.";

  return (
    <Modal
      transparent={false}
      visible={visible}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="sparkles" size={26} color={colors.success} />
            <Text style={styles.title}>{modalTitle}</Text>
            <Text style={styles.subtitle}>{modalSubtitle}</Text>
          </View>

          {/* Body */}
          <ScrollView
            style={[styles.bodyScroll, { maxHeight: MODAL_BODY_MAX_HEIGHT }]}
            contentContainerStyle={styles.bodyScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.body}>
              {/* Items Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>Selected items</Text>
                  <Text style={styles.sectionMeta}>
                    {completedItemsCount + 1}/{items.length}
                  </Text>
                </View>
                <View style={styles.items}>
                  {revealedItems.map((item, index) => {
                    const isComplete = index <= completedItemsCount;
                    const isActive = index === revealedItemsCount && !isComplete;
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.itemRow,
                          isComplete && styles.itemRowComplete,
                        ]}
                      >
                        <View style={styles.itemIcon}>
                          {isComplete ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color={colors.success}
                            />
                          ) : (
                            <ActivityIndicator
                              size="small"
                              color={isActive ? colors.primary : colors.gray500}
                            />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.itemText,
                            isComplete && styles.itemTextComplete,
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Analysis Section */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Stylist overview</Text>
                <View style={styles.messageCard}>
                  {activeMessage ? (
                    <>
                      <View style={styles.messageHeader}>
                        <Ionicons
                          name="chatbubble-ellipses"
                          size={16}
                          color={colors.primary}
                        />
                        <Text style={styles.messageLabel}>
                          {activeMessage.kind === 'finalizing'
                            ? 'Finishing touches'
                            : 'Your stylist'}
                        </Text>
                      </View>
                      <View style={styles.messageBody}>
                        {activeMessage.kind === 'finalizing' && (
                          <ActivityIndicator
                            size="small"
                            color={colors.primary}
                            style={styles.inlineSpinner}
                          />
                        )}
                        <Text style={styles.messageText}>
                          {activeMessage.text}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.typingRow}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.typingText}>
                        {completedItemsCount >= items.length - 1
                          ? 'Pulling together your overview…'
                          : 'Reviewing each piece…'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.footerText}>
              Stay on this screen while we craft your look.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.lg + spacing.md,
    alignItems: 'stretch',
    width: '90%',
    maxWidth: 540,
    maxHeight: MODAL_MAX_HEIGHT,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)' }
      : {
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }),
  },
  bodyScroll: {
    width: '100%',
  },
  bodyScrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm + spacing.xs / 2,
    marginBottom: spacing.xs + spacing.xs / 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  body: {
    width: '100%',
  },
  section: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + spacing.xs / 2,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionMeta: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  items: {
    width: '100%',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs / 2,
    borderRadius: spacing.sm + spacing.xs / 2,
  },
  itemRowComplete: {
    opacity: 0.35,
  },
  itemIcon: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs + spacing.xs / 2,
  },
  itemText: {
    flexShrink: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  itemTextComplete: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  messageCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.sm + spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 88,
    justifyContent: 'center',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  messageLabel: {
    marginLeft: spacing.xs + spacing.xs / 2,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  messageBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inlineSpinner: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  messageText: {
    flexShrink: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + spacing.xs / 2,
  },
  typingText: {
    marginLeft: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  footerText: {
    marginLeft: spacing.sm,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
