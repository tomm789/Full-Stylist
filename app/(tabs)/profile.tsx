/**
 * Profile Screen (Refactored)
 * User profile with posts, headshots, and bodyshots tabs
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileData, useProfileEdit } from '@/hooks/profile';
import {
  ProfileHeader,
  ProfileTabs,
  EditProfileModal,
} from '@/components/profile';
import { LoadingSpinner } from '@/components/shared';

type TabType = 'headshots' | 'bodyshots';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string | string[] }>();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('headshots');
  const [showEditModal, setShowEditModal] = useState(false);
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);

  // Load profile data
  const {
    profile,
    headshotImages,
    bodyShotImages,
    loading,
    refresh,
  } = useProfileData({ userId: user?.id });

  // Profile editing
  const { savingProfile, saveProfile } = useProfileEdit({
      userId: user?.id,
      onSuccess: async () => {
        setShowEditModal(false);
        await refresh();
      },
    });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setHandle(profile.handle || '');
      setDisplayName(profile.display_name || '');
      setSelectedAvatarUrl(profile.avatar_url || profile.headshot_image_url || null);
    }
  }, [profile]);

  useEffect(() => {
    const headerTitle = profile?.handle || 'Profile';
    navigation.setOptions({ headerTitle });
  }, [navigation, profile?.handle]);

  useEffect(() => {
    const resolvedTab = Array.isArray(tab) ? tab[0] : tab;
    if (
      resolvedTab === 'headshots' ||
      resolvedTab === 'bodyshots'
    ) {
      setActiveTab(resolvedTab);
    }
  }, [tab]);

  // Note: Data loads automatically via useProfileData's useEffect
  // Removed useFocusEffect to prevent infinite refresh loop

  const handleSave = async () => {
    const success = await saveProfile(handle, displayName, selectedAvatarUrl);
    if (success) {
      // Modal closes automatically via onSuccess callback
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.warningText}>
          Complete your profile to access all features
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <ProfileHeader
          profile={profile}
          primaryStat={{ label: 'Posts', value: profile.stats?.posts || 0 }}
          isOwnProfile
          onFollowersPress={
            user?.id ? () => router.push(`/users/${user.id}/followers`) : undefined
          }
          onFollowingPress={
            user?.id ? () => router.push(`/users/${user.id}/following`) : undefined
          }
          onEditPress={() => {
            setSelectedAvatarUrl(profile.avatar_url || profile.headshot_image_url || null);
            setShowEditModal(true);
          }}
        />
      </View>

      {/* Tabs */}
      <ProfileTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        headshotImages={headshotImages}
        bodyShotImages={bodyShotImages}
        onHeadshotPress={(id) => router.push(`/headshot/${id}` as any)}
        onBodyShotPress={(id) => router.push(`/bodyshot/${id}` as any)}
        onNewHeadshot={() => router.push('/headshot/new' as any)}
        onNewBodyShot={() => router.push('/bodyshot/new' as any)}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        handle={handle}
        displayName={displayName}
        headshotUrl={profile.headshot_image_url}
        headshotOptions={headshotImages}
        selectedAvatarUrl={selectedAvatarUrl}
        onHandleChange={setHandle}
        onDisplayNameChange={setDisplayName}
        onSelectAvatar={setSelectedAvatarUrl}
        onClearAvatar={() => setSelectedAvatarUrl(null)}
        onCreateHeadshot={() => router.push('/headshot/new' as any)}
        onSave={handleSave}
        saving={savingProfile}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
    marginTop: 20,
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
  heroSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
});
