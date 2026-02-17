/**
 * HeadshotSelectorModal Component
 * Full-screen modal for selecting headshot with custom header
 * Shows grid of available headshots with active state styling
 * Supports multiple action buttons: Save, Save as Draft, Clear, Close
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import { PrimaryButton, DropdownMenuModal, DropdownMenuItem } from '@/components/shared';

const { spacing, borderRadius, typography, shadows } = theme;

interface Headshot {
  id: string;
  url: string | null;
}

interface HeadshotSelectorModalProps {
  visible: boolean;
  currentHeadshotId: string | null;
  headshots: Headshot[];
  onClose: () => void;
  onSave: (headshotId: string) => Promise<void>;
  onSaveAsDraft?: (headshotId: string) => Promise<void>;
  onClearSelection?: () => Promise<void>;
  loading?: boolean;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      height: 56,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      flex: 1,
    },
    backButton: {
      padding: spacing.xs,
    },
    headerTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
    },
    headerRight: {
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    menuButton: {
      padding: spacing.xs,
      justifyContent: 'center',
      alignItems: 'center',
    },
    gridContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    columnWrapper: {
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    gridItem: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      backgroundColor: colors.backgroundSecondary,
      ...shadows.sm,
    },
    gridImage: {
      width: '100%',
      height: '100%',
    },
    gridImagePlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundTertiary,
    },
    checkmarkBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.md,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default function HeadshotSelectorModal({
  visible,
  currentHeadshotId,
  headshots,
  onClose,
  onSave,
  onSaveAsDraft,
  onClearSelection,
  loading = false,
}: HeadshotSelectorModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [selectedHeadshotId, setSelectedHeadshotId] = useState<string | null>(
    currentHeadshotId
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Update selectedHeadshotId when modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedHeadshotId(currentHeadshotId);
    }
  }, [visible, currentHeadshotId]);

  const handleSave = useCallback(async () => {
    if (!selectedHeadshotId || selectedHeadshotId === currentHeadshotId) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(selectedHeadshotId);
      setIsSaving(false);
      onClose();
    } catch (error) {
      console.error('Failed to save headshot:', error);
      setIsSaving(false);
    }
  }, [selectedHeadshotId, currentHeadshotId, onSave, onClose]);

  const handleSaveAsDraft = useCallback(async () => {
    if (!selectedHeadshotId || !onSaveAsDraft) {
      return;
    }

    setShowActionMenu(false);
    setIsSaving(true);
    try {
      await onSaveAsDraft(selectedHeadshotId);
      setIsSaving(false);
    } catch (error) {
      console.error('Failed to save headshot as draft:', error);
      setIsSaving(false);
    }
  }, [selectedHeadshotId, onSaveAsDraft]);

  const handleClearSelection = useCallback(async () => {
    if (!onClearSelection) {
      return;
    }

    setShowActionMenu(false);
    setIsSaving(true);
    try {
      await onClearSelection();
      setSelectedHeadshotId(null);
      setIsSaving(false);
    } catch (error) {
      console.error('Failed to clear selection:', error);
      setIsSaving(false);
    }
  }, [onClearSelection]);

  const handleClose = useCallback(() => {
    setShowActionMenu(false);
    onClose();
  }, [onClose]);

  const hasSelection = selectedHeadshotId && selectedHeadshotId !== currentHeadshotId;
  const canSaveAsDraft = selectedHeadshotId !== null;
  const hasMultipleActions = Boolean(onSaveAsDraft) || Boolean(onClearSelection);

  const renderGridItem = useCallback(
    ({ item }: { item: Headshot }) => {
      const isActive = selectedHeadshotId === item.id;

      return (
        <TouchableOpacity
          style={styles.gridItem}
          onPress={() => setSelectedHeadshotId(item.id)}
          activeOpacity={0.85}
        >
          {item.url ? (
            <Image
              source={{ uri: item.url }}
              style={styles.gridImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.gridImagePlaceholder}>
              <Ionicons
                name="image-outline"
                size={32}
                color={colors.textTertiary}
              />
            </View>
          )}

          {isActive && (
            <View style={styles.checkmarkBadge}>
              <Ionicons name="checkmark" size={16} color={colors.white} />
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [selectedHeadshotId, colors, styles]
  );

  const keyExtractor = useCallback((item: Headshot) => item.id, []);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onClose}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Select Headshot</Text>
          </View>

          <View style={styles.headerRight}>
            {hasMultipleActions && (canSaveAsDraft || hasSelection) ? (
              // Show dropdown menu for multiple actions
              <>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => setShowActionMenu(true)}
                  disabled={isSaving || loading}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>

                <DropdownMenuModal
                  visible={showActionMenu}
                  onClose={() => setShowActionMenu(false)}
                  topOffset={60}
                  align="right"
                >
                  {hasSelection && (
                    <>
                      <DropdownMenuItem
                        label="Save"
                        icon="checkmark-done-outline"
                        onPress={handleSave}
                        disabled={isSaving || loading}
                      />
                      <View style={{ height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.xs }} />
                    </>
                  )}

                  {onSaveAsDraft && canSaveAsDraft && (
                    <DropdownMenuItem
                      label="Save as Draft"
                      icon="bookmark-outline"
                      onPress={handleSaveAsDraft}
                      disabled={isSaving || loading}
                    />
                  )}

                  {onClearSelection && (
                    <DropdownMenuItem
                      label="Clear Selection"
                      icon="close-circle-outline"
                      onPress={handleClearSelection}
                      disabled={isSaving || loading}
                      danger
                    />
                  )}

                  <View style={{ height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.xs }} />

                  <DropdownMenuItem
                    label="Close"
                    icon="chevron-back-outline"
                    onPress={handleClose}
                  />
                </DropdownMenuModal>
              </>
            ) : hasSelection ? (
              // Show simple Save button if no multiple actions
              <PrimaryButton
                title="Save"
                onPress={handleSave}
                disabled={isSaving || loading}
                size="small"
                loading={isSaving}
              />
            ) : null}
          </View>
        </View>

        {/* Grid */}
        <FlatList
          data={headshots}
          renderItem={renderGridItem}
          keyExtractor={keyExtractor}
          numColumns={3}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.gridContent}
          scrollEnabled={true}
        />

        {(isSaving || loading) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
