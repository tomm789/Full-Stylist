import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAccountSettings } from '@/hooks/profile';
import {
  AIModelSection,
  AccountDangerZone,
  PrivacySettingsSection,
  DeactivateAccountModal,
  DeleteAccountModal,
} from '@/components/profile';
import { LoadingSpinner } from '@/components/shared';
import { Header, HeaderIconButton } from '@/components/shared/layout';
import { colors, spacing, borderRadius, typography } from '@/styles';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const {
    settings,
    loading,
    saving,
    aiModelPreference,
    includeHeadshotInGeneration,
    handleUpdateSetting,
    handleModelSelection,
    handleHeadshotToggle,
    handleSignOut,
    handleDeactivateAccount,
    handleDeleteAccount,
  } = useAccountSettings();

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Account Settings"
          leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
        />
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // If settings don't exist, user hasn't completed onboarding
  if (!settings) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Account Settings"
          leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
        />
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
          <Text style={styles.warningText}>
            Complete your profile to access account settings
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Account Settings"
        leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
      />

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
        <PrivacySettingsSection
          settings={settings}
          saving={saving}
          onUpdateSetting={handleUpdateSetting}
        />

        <AIModelSection
          aiModelPreference={aiModelPreference}
          saving={saving}
          onModelSelection={handleModelSelection}
          includeHeadshot={includeHeadshotInGeneration}
          onHeadshotToggle={handleHeadshotToggle}
          onOpenAISettings={() => router.push('/ai-settings' as any)}
        />

        <AccountDangerZone
          onSignOut={handleSignOut}
          onDeactivate={() => setShowDeactivateModal(true)}
          onDelete={() => setShowDeleteModal(true)}
        />
      </ScrollView>

      {/* Deactivate Account Modal */}
      <DeactivateAccountModal
        visible={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        onConfirm={handleDeactivateAccount}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.xl,
  },
  warningText: {
    fontSize: typography.fontSize.md,
    color: colors.warning,
    marginBottom: spacing.lg,
    textAlign: 'center',
    padding: spacing.md,
    backgroundColor: '#fff3e0',
    borderRadius: borderRadius.md,
  },
});
