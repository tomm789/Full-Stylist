/**
 * AddToHomeScreenBanner Component
 * iOS "Add to Home Screen" banner component
 */

import React, { useState } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAddToHomeScreenDetection } from '@/hooks';
import { AddToHomeScreenInstructionsModal } from './AddToHomeScreenInstructionsModal';

interface AddToHomeScreenBannerProps {
  visible?: boolean;
}

export function AddToHomeScreenBanner({ visible }: AddToHomeScreenBannerProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const { showBanner, handleDismiss } = useAddToHomeScreenDetection({ visible });

  const handleBannerPress = () => {
    setShowInstructions(true);
  };

  if (!showBanner) {
    return null;
  }

  // Web-only styles (React Native Web compatible)
  const webStyles: any = Platform.OS === 'web'
    ? {
        container: {
          position: 'fixed' as const,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#1e1f26',
          borderTop: '1px solid #333',
          padding: '20px 20px',
          paddingBottom: `calc(20px + env(safe-area-inset-bottom))`,
          minHeight: '64px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'space-between' as const,
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
          borderRadius: '16px 16px 0 0',
        },
        text: {
          color: '#ffffff',
          fontSize: '15px',
          flex: 1,
          marginRight: '16px',
          lineHeight: '22px',
          fontWeight: '500' as const,
        },
        dismissButtonContainer: {
          minWidth: '44px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          borderRadius: '22px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        },
        dismissText: {
          color: '#ffffff',
          fontSize: '24px',
          fontWeight: '300' as const,
          lineHeight: 1,
        },
      }
    : {};

  return (
    <>
      <View style={[styles.container, webStyles.container as any]}>
        <TouchableOpacity
          style={styles.bannerContent}
          onPress={handleBannerPress}
          activeOpacity={0.8}
        >
          <Text style={[styles.text, webStyles.text as any]}>
            Tap <Text style={styles.shareIcon}>📤</Text> Share → Add to Home Screen
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDismiss}
          style={[styles.dismissButton, webStyles.dismissButtonContainer as any]}
          activeOpacity={0.7}
        >
          <Text style={[styles.dismissText, webStyles.dismissText as any]}>×</Text>
        </TouchableOpacity>
      </View>

      <AddToHomeScreenInstructionsModal
        visible={showInstructions}
        onClose={() => setShowInstructions(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e1f26',
    padding: 20,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerContent: {
    flex: 1,
    marginRight: 16,
    justifyContent: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  shareIcon: {
    fontSize: 18,
  },
  dismissButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dismissText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 1,
  },
});
