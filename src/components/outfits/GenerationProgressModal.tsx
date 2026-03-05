/**
 * GenerationProgressModal Component
 * Modal showing outfit generation progress with item checking and analysis
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import { GENERATION_MESSAGES } from '@/constants/generationMessages';

const { spacing, borderRadius, typography, opacity: themeOpacity } = theme;

// Component-specific dimensional constants
const ITEM_ICON_WIDTH = 26;
const MESSAGE_CARD_MIN_HEIGHT = 88;
const MODAL_BODY_MAX_HEIGHT = Math.min(400, Dimensions.get('window').height * 0.4);
const SPACING_SM_PLUS = spacing.sm + spacing.xs / 2; // 10px — used for consistent inner padding

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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
            <Text style={[styles.title, { marginTop: spacing.lg }]}>Generating…</Text>
          </View>
        </View>
      </Modal>
    );
  }

  const revealedItems = items.slice(0, revealedItemsCount + 1);

  const MSG = GENERATION_MESSAGES.outfitModal;
  const modalTitle =
    phase === 'items'
      ? MSG.itemsTitle
      : phase === 'analysis'
        ? MSG.analysisTitle
        : MSG.finalizingTitle;

  const modalSubtitle =
    phase === 'items'
      ? MSG.itemsSubtitle
      : phase === 'analysis'
        ? MSG.analysisSubtitle
        : MSG.finalizingSubtitle;

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
            <Ionicons name="sparkles" size={ITEM_ICON_WIDTH} color={colors.success} />
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
                            ? MSG.finishingLabel
                            : MSG.stylistLabel}
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
                          ? MSG.pullingOverview
                          : MSG.reviewingPieces}
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
              {MSG.footer}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    padding: spacing.lg + spacing.md,
    alignItems: 'stretch',
    width: '90%',
  },
  bodyScroll: {
    width: '100%',
  },
  bodyScrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginTop: SPACING_SM_PLUS,
    marginBottom: SPACING_SM_PLUS,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.snug,
  },
  body: {
    width: '100%',
  },
  section: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING_SM_PLUS,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  sectionMeta: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
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
    borderRadius: SPACING_SM_PLUS,
  },
  itemRowComplete: {
    opacity: themeOpacity.subtle,
  },
  itemIcon: {
    width: ITEM_ICON_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING_SM_PLUS,
  },
  itemText: {
    flexShrink: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  itemTextComplete: {
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  messageCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: SPACING_SM_PLUS,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: MESSAGE_CARD_MIN_HEIGHT,
    justifyContent: 'center',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  messageLabel: {
    marginLeft: SPACING_SM_PLUS,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
  },
  messageBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inlineSpinner: {
    marginRight: spacing.sm,
    marginTop: spacing.xs / 2,
  },
  messageText: {
    flexShrink: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    lineHeight: typography.lineHeight.normal,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING_SM_PLUS,
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
    marginTop: spacing.xs / 2,
  },
  footerText: {
    marginLeft: spacing.sm,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
