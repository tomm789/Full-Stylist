/**
 * FaceMenuModal
 * Dropdown menu for the active headshot: Set as Active, Share to Feed, Share, Delete.
 */

import React from 'react';
import { View } from 'react-native';

import {
  DropdownMenuModal,
  DropdownMenuItem,
  dropdownMenuStyles,
} from '@/components/shared';

type FaceMenuModalProps = {
  visible: boolean;
  onClose: () => void;
  onSetAsActiveHeadshot: () => Promise<void>;
  onOpenInMirror?: () => void;
  onEdit?: () => void;
  onShareToFeed: () => void;
  onShare: () => void;
  onDelete: () => void;
  canShare: boolean;
  showDeletePreview: boolean;
  previewImageId: string | null;
};

export default function FaceMenuModal({
  visible,
  onClose,
  onSetAsActiveHeadshot,
  onOpenInMirror,
  onEdit,
  onShareToFeed,
  onShare,
  onDelete,
  canShare,
  showDeletePreview,
  previewImageId,
}: FaceMenuModalProps) {
  return (
    <DropdownMenuModal
      visible={visible}
      onClose={onClose}
      topOffset={120}
      align="right"
    >
      <DropdownMenuItem
        label="Set as Active Headshot"
        icon="checkmark-circle-outline"
        onPress={async () => {
          onClose();
          await onSetAsActiveHeadshot();
        }}
        disabled={!previewImageId}
      />
      {onOpenInMirror && (
        <>
          <View style={dropdownMenuStyles.menuDivider} />
          <DropdownMenuItem
            label="Open in Mirror"
            icon="color-wand-outline"
            onPress={() => {
              onClose();
              onOpenInMirror();
            }}
          />
        </>
      )}
      {onEdit && (
        <>
          <View style={dropdownMenuStyles.menuDivider} />
          <DropdownMenuItem
            label="Edit"
            icon="create-outline"
            onPress={() => {
              onClose();
              onEdit();
            }}
          />
        </>
      )}
      <View style={dropdownMenuStyles.menuDivider} />
      <DropdownMenuItem
        label="Share to Feed"
        icon="share-social-outline"
        onPress={() => {
          onClose();
          onShareToFeed();
        }}
        disabled={!canShare}
      />
      <View style={dropdownMenuStyles.menuDivider} />
      <DropdownMenuItem
        label="Share"
        icon="share-outline"
        onPress={() => {
          onClose();
          onShare();
        }}
        disabled={!canShare}
      />
      <View style={dropdownMenuStyles.menuDivider} />
      <DropdownMenuItem
        label="Delete"
        icon="trash-outline"
        onPress={() => {
          onClose();
          onDelete();
        }}
        danger
        disabled={!showDeletePreview}
      />
    </DropdownMenuModal>
  );
}
