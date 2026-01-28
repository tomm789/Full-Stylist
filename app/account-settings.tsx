import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAccountSettings } from '@/hooks/profile';
import {
  AIModelSection,
  AccountDangerZone,
  PrivacySettingsSection,
} from '@/components/profile';

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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Settings</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // If settings don't exist, user hasn't completed onboarding
  if (!settings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Settings</Text>
          <View style={styles.backButton} />
        </View>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={styles.backButton} />
      </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
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
