import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { GenerationThumbnailStrip } from '@/components/shared';
import type { ThumbnailItem } from '@/components/shared';
import { useThemeColors } from '@/contexts/ThemeContext';
import { theme } from '@/styles';

interface SessionPreviewStripProps {
  previewImageUrl: string | null;
  previewOutfitId: string | null;
  thumbnailItems: ThumbnailItem[];
  canNavigateBack: boolean;
  canNavigateForward: boolean;
  onThumbnailSelect: (id: string) => void;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onSaveVariation: (id: string) => void;
  onViewOutfit: (outfitId: string) => void;
  onClose: () => void;
  bottomOffset: number;
  panelCollapsedHeight: number;
}

export default function SessionPreviewStrip({
  previewImageUrl,
  previewOutfitId,
  thumbnailItems,
  canNavigateBack,
  canNavigateForward,
  onThumbnailSelect,
  onNavigateBack,
  onNavigateForward,
  onSaveVariation,
  onViewOutfit,
  onClose,
  bottomOffset,
  panelCollapsedHeight,
}: SessionPreviewStripProps) {
  const colors = useThemeColors();

  return (
    <View
      style={{
        position: 'absolute',
        bottom: bottomOffset + panelCollapsedHeight + theme.spacing.sm,
        left: 0,
        right: 0,
        backgroundColor: colors.background,
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.sm,
        zIndex: 14,
      }}
    >
      {previewImageUrl && (
        <TouchableOpacity
          style={{
            width: '100%',
            height: 200,
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: theme.spacing.sm,
            backgroundColor: colors.backgroundSecondary,
          }}
          onPress={() => previewOutfitId && onViewOutfit(previewOutfitId)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: previewImageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
          />
        </TouchableOpacity>
      )}

      <GenerationThumbnailStrip
        items={thumbnailItems}
        onSelect={onThumbnailSelect}
        canNavigateBack={canNavigateBack}
        canNavigateForward={canNavigateForward}
        onNavigateBack={onNavigateBack}
        onNavigateForward={onNavigateForward}
        onSavePress={onSaveVariation}
        showSaveIndicator
      />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: theme.spacing.md,
          paddingBottom: theme.spacing.xs,
        }}
      >
        {previewOutfitId && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
            }}
            onPress={() => onViewOutfit(previewOutfitId)}
          >
            <Ionicons name="eye-outline" size={16} color={colors.textPrimary} />
            <Text style={{ color: colors.textPrimary, fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold }}>
              View
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 8,
          }}
          onPress={onClose}
        >
          <Ionicons name="checkmark" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold }}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
