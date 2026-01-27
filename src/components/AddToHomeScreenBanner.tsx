import React, { useState, useEffect } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';

const DISMISSAL_KEY = 'pwa_ios_banner_dismissed';
const DISMISSAL_TTL_DAYS = 30;

interface AddToHomeScreenBannerProps {
  // Optional: allow parent to control visibility
  visible?: boolean;
}

/**
 * iOS "Add to Home Screen" banner component
 * 
 * Shows instructions for adding the app to home screen on iOS Safari.
 * Only displays when:
 * - User is on iOS Safari (not Chrome/Firefox iOS)
 * - App is NOT in standalone mode (not installed)
 * - User has not dismissed it recently (30-day TTL)
 */
export function AddToHomeScreenBanner({ visible }: AddToHomeScreenBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Only run on web
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    // Check if parent explicitly controls visibility
    if (visible !== undefined) {
      setShowBanner(visible);
      return;
    }

    // Check if already dismissed
    const dismissedUntil = localStorage.getItem(DISMISSAL_KEY);
    if (dismissedUntil) {
      const dismissedUntilDate = new Date(dismissedUntil);
      if (dismissedUntilDate > new Date()) {
        // Still within dismissal period
        return;
      } else {
        // Dismissal expired, remove it
        localStorage.removeItem(DISMISSAL_KEY);
      }
    }

    // Detect iOS
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!isIOS) {
      return;
    }

    // Detect Safari (not Chrome/Firefox on iOS)
    const isSafari = 
      /Safari/i.test(navigator.userAgent) &&
      !/CriOS/i.test(navigator.userAgent) && // Chrome iOS
      !/FxiOS/i.test(navigator.userAgent);   // Firefox iOS

    if (!isSafari) {
      return;
    }

    // Detect standalone mode (app is installed)
    const isStandalone = 
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      ((window.navigator as any).standalone === true);

    if (isStandalone) {
      return;
    }

    // All conditions met, show banner
    setShowBanner(true);
  }, [visible]);

  const handleDismiss = () => {
    // Store dismissal with 30-day TTL
    const dismissedUntil = new Date();
    dismissedUntil.setDate(dismissedUntil.getDate() + DISMISSAL_TTL_DAYS);
    localStorage.setItem(DISMISSAL_KEY, dismissedUntil.toISOString());
    setShowBanner(false);
  };

  const handleBannerPress = () => {
    // Show instruction dialog when banner body is tapped
    // Note: iOS does NOT allow programmatic PWA installation.
    // We can only instruct users to use Safari's Share menu manually.
    setShowInstructions(true);
  };

  if (!showBanner) {
    return null;
  }

  // Web-only styles (React Native Web compatible)
  const webStyles = Platform.OS === 'web' ? {
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
    dismissButtonHover: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    dismissText: {
      color: '#ffffff',
      fontSize: '24px',
      fontWeight: '300' as const,
      lineHeight: 1,
    },
    modalOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end' as const,
      zIndex: 10000,
    },
    modalContent: {
      backgroundColor: '#ffffff',
      borderTopLeftRadius: '20px',
      borderTopRightRadius: '20px',
      maxHeight: '80vh',
      paddingBottom: `calc(20px + env(safe-area-inset-bottom))`,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
    },
    modalTitle: {
      fontSize: '22px',
      fontWeight: '700' as const,
      color: '#000000',
    },
    stepNumber: {
      width: '32px',
      height: '32px',
      borderRadius: '16px',
      backgroundColor: '#007AFF',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: '12px',
    },
    stepText: {
      fontSize: '16px',
      color: '#000000',
      lineHeight: '24px',
      flex: 1,
    },
    noteText: {
      fontSize: '14px',
      color: '#666666',
      lineHeight: '20px',
      fontStyle: 'italic' as const,
    },
    modalFooter: {
      paddingTop: '16px',
      paddingBottom: '20px',
      paddingHorizontal: '20px',
      borderTopWidth: '1px',
      borderTopColor: '#e0e0e0',
    },
    gotItButton: {
      backgroundColor: '#007AFF',
      borderRadius: '12px',
      paddingVertical: '14px',
      paddingHorizontal: '24px',
      alignItems: 'center' as const,
    },
    gotItButtonText: {
      color: '#ffffff',
      fontSize: '16px',
      fontWeight: '600' as const,
    },
  } : {};

  return (
    <>
      <View style={[styles.container, webStyles.container]}>
        <TouchableOpacity 
          style={styles.bannerContent}
          onPress={handleBannerPress}
          activeOpacity={0.8}
        >
          <Text style={[styles.text, webStyles.text]}>
            Tap <Text style={styles.shareIcon}>📤</Text> Share → Add to Home Screen
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={handleDismiss} 
          style={[styles.dismissButton, webStyles.dismissButtonContainer]}
          activeOpacity={0.7}
        >
          <Text style={[styles.dismissText, webStyles.dismissText]}>×</Text>
        </TouchableOpacity>
      </View>

      {/* Instruction Modal - Bottom Sheet Style */}
      <Modal
        visible={showInstructions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInstructions(false)}
      >
        <View style={[styles.modalOverlay, webStyles.modalOverlay]}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowInstructions(false)}
          />
          <View style={[styles.modalContent, webStyles.modalContent]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, webStyles.modalTitle]}>Add to Home Screen</Text>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.instructionsContainer}>
                <View style={styles.stepContainer}>
                  <View style={[styles.stepNumber, webStyles.stepNumber]}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={[styles.stepText, webStyles.stepText]}>
                    Tap the <Text style={styles.boldText}>Share icon</Text> (square with arrow) in Safari's toolbar at the bottom
                  </Text>
                </View>

                <View style={styles.stepContainer}>
                  <View style={[styles.stepNumber, webStyles.stepNumber]}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={[styles.stepText, webStyles.stepText]}>
                    Scroll down in the share menu and tap <Text style={styles.boldText}>"Add to Home Screen"</Text>
                  </Text>
                </View>

                <View style={styles.stepContainer}>
                  <View style={[styles.stepNumber, webStyles.stepNumber]}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={[styles.stepText, webStyles.stepText]}>
                    Tap <Text style={styles.boldText}>"Add"</Text> in the top right corner
                  </Text>
                </View>

                <View style={styles.noteContainer}>
                  <Text style={[styles.noteText, webStyles.noteText]}>
                    This installs the app like a native app on your home screen. You can launch it anytime without opening Safari.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, webStyles.modalFooter]}>
              <TouchableOpacity 
                style={[styles.gotItButton, webStyles.gotItButton]}
                onPress={() => setShowInstructions(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.gotItButtonText, webStyles.gotItButtonText]}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  instructionsContainer: {
    paddingVertical: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
    flex: 1,
  },
  boldText: {
    fontWeight: '600',
  },
  noteContainer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  noteText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  modalFooter: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  gotItButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  gotItButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
