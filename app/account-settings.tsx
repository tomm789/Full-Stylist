import React from 'react';
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
} from '@/components/profile';
import { LoadingSpinner } from '@/components/shared';
import { Header, HeaderActionButton } from '@/components/shared/layout';

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
  } = useAccountSettings();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Account Settings"
          leftContent={
            <HeaderActionButton
              label="Back"
              onPress={() => router.back()}
            />
          }
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
          leftContent={
            <HeaderActionButton
              label="Back"
              onPress={() => router.back()}
            />
          }
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
        leftContent={
          <HeaderActionButton
            label="Back"
            onPress={() => router.back()}
          />
        }
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
        />

        <AccountDangerZone onSignOut={handleSignOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    padding: 20,
  },
  warningText: {
    fontSize: 14,
    color: '#ff9500',
    marginBottom: 16,
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
  },
});
