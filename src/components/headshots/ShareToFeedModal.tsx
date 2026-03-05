/**
 * ShareToFeedModal
 * Bottom-sheet modal that lets the user add an optional caption before sharing
 * a headshot to their social feed.
 */

import React from 'react';
import { Modal, Text, TextInput, TouchableOpacity } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { theme } from '@/styles';

const { spacing, typography, borderRadius } = theme;

interface ShareToFeedModalProps {
  visible: boolean;
  onClose: () => void;
  onShare: (caption?: string) => Promise<void>;
}

export default function ShareToFeedModal({
  visible,
  onClose,
  onShare,
}: ShareToFeedModalProps) {
  const colors = useThemeColors();
  const [caption, setCaption] = React.useState('');
  const [sharing, setSharing] = React.useState(false);

  const handleShare = async () => {
    setSharing(true);
    await onShare(caption.trim() || undefined);
    setCaption('');
    setSharing(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: colors.overlayLight }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.background,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
            gap: spacing.md,
          }}
        >
          <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary }}>
            Share to Feed
          </Text>
          <TextInput
            placeholder="Add a caption (optional)"
            placeholderTextColor={colors.textTertiary}
            value={caption}
            onChangeText={setCaption}
            multiline
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              padding: spacing.sm,
              color: colors.textPrimary,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
          <TouchableOpacity
            onPress={handleShare}
            disabled={sharing}
            style={{
              backgroundColor: colors.primary,
              borderRadius: borderRadius.md,
              paddingVertical: spacing.sm + 2,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.textLight, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.base }}>
              {sharing ? 'Sharing...' : 'Share'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
