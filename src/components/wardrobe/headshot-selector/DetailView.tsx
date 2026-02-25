/**
 * DetailView — headshot detail screen showing check/activated/needs_body_shot states.
 */

import React, { useMemo } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles, type Headshot } from './styles';

type DetailViewProps = {
  headshot: Headshot;
  status: 'checking' | 'activated' | 'needs_body_shot';
  onYes: () => void;
  onSkip: () => void;
};

export function DetailView({ headshot, status, onYes, onSkip }: DetailViewProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.detailContainer}>
      <View style={styles.detailImageWrapper}>
        {headshot.url ? (
          <Image source={{ uri: headshot.url }} style={styles.detailImage} contentFit="cover" />
        ) : (
          <View style={[styles.detailImage, styles.detailImagePlaceholder]}>
            <Ionicons name="image-outline" size={64} color={colors.textTertiary} />
          </View>
        )}
      </View>

      <View style={styles.detailStatus}>
        {status === 'checking' && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.detailStatusSubtext}>Checking…</Text>
          </>
        )}

        {status === 'activated' && (
          <>
            <View style={styles.tickCircle}>
              <Ionicons name="checkmark" size={36} color={colors.white} />
            </View>
            <Text style={styles.detailStatusTitle}>Activated</Text>
            <Text style={styles.detailStatusSubtext}>
              Your headshot is ready for outfit generation
            </Text>
          </>
        )}

        {status === 'needs_body_shot' && (
          <>
            <Text style={styles.detailStatusTitle}>Take a new mirror selfie?</Text>
            <Text style={styles.detailStatusSubtext}>
              A full-body mirror selfie is needed to generate outfits with this headshot.
            </Text>
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={onYes}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonPrimaryText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={onSkip}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonSecondaryText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
