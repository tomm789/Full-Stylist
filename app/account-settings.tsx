import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSettings, updateUserSettings, UserSettings } from '@/lib/settings';

export default function AccountSettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiModelPreference, setAiModelPreference] = useState<string>('gemini-2.5-flash-image');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    
    // Load settings
    const { data: settingsData, error: settingsError } = await getUserSettings(user.id);
    if (settingsError) {
      console.log('[AccountSettings] Settings not found, user may need to complete onboarding');
      setSettings(null);
    } else {
      setSettings(settingsData);
      if (settingsData) {
        setAiModelPreference(settingsData.ai_model_preference || 'gemini-2.5-flash-image');
      }
    }
    
    setLoading(false);
  };

  const handleUpdateSetting = async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    if (!user || !settings) return;

    setSaving(true);
    
    try {
      const { error } = await updateUserSettings(user.id, { [key]: value });

      if (error) {
        Alert.alert('Error', 'Failed to update setting');
      } else {
        setSettings({ ...settings, [key]: value });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleModelSelection = async (model: string) => {
    if (!user || !settings) return;

    const { error: updateError } = await updateUserSettings(user.id, {
      ai_model_preference: model,
    } as any);
    
    if (updateError) {
      Alert.alert('Error', 'Failed to update model preference');
      return;
    }

    setAiModelPreference(model);
    await loadData();
  };

  const handleSignOut = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'account-settings.tsx:91',message:'Account settings logout clicked',data:{platform:Platform.OS},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // On web, use window.confirm instead of Alert.alert since Alert callbacks don't work on web
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      
      if (confirmed) {
        try {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'account-settings.tsx:98',message:'Web signOut called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          await signOut();
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'account-settings.tsx:99',message:'Web signOut completed, navigating to index',data:{target:'/'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          router.replace('/');
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'account-settings.tsx:100',message:'Web router.replace to index called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
        } catch (error: any) {
          Alert.alert('Error', 'Failed to sign out. Please try again.');
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'account-settings.tsx:102',message:'Web signOut error',data:{error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
        }
      }
    } else {
      // Native platforms - use Alert.alert
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { 
          text: 'Cancel', 
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'account-settings.tsx:116',message:'Native signOut called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              await signOut();
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'account-settings.tsx:117',message:'Native signOut completed, navigating to index',data:{target:'/'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              router.replace('/');
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'account-settings.tsx:118',message:'Native router.replace to index called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
            } catch (error: any) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'account-settings.tsx:120',message:'Native signOut error',data:{error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
            }
          },
        },
      ]);
    }
  };

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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Privacy</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioOption,
                settings.account_privacy === 'public' && styles.radioSelected,
              ]}
              onPress={() => handleUpdateSetting('account_privacy', 'public')}
              disabled={saving}
            >
              <Text
                style={[
                  styles.radioText,
                  settings.account_privacy === 'public' && styles.radioTextSelected,
                ]}
              >
                Public
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.radioOption,
                settings.account_privacy === 'private' && styles.radioSelected,
              ]}
              onPress={() => handleUpdateSetting('account_privacy', 'private')}
              disabled={saving}
            >
              <Text
                style={[
                  styles.radioText,
                  settings.account_privacy === 'private' && styles.radioTextSelected,
                ]}
              >
                Private
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search Visibility</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioOption,
                settings.search_visibility === 'visible' && styles.radioSelected,
              ]}
              onPress={() => handleUpdateSetting('search_visibility', 'visible')}
              disabled={saving}
            >
              <Text
                style={[
                  styles.radioText,
                  settings.search_visibility === 'visible' && styles.radioTextSelected,
                ]}
              >
                Visible
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.radioOption,
                settings.search_visibility === 'hidden' && styles.radioSelected,
              ]}
              onPress={() => handleUpdateSetting('search_visibility', 'hidden')}
              disabled={saving}
            >
              <Text
                style={[
                  styles.radioText,
                  settings.search_visibility === 'hidden' && styles.radioTextSelected,
                ]}
              >
                Hidden
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default Visibility</Text>
          <View style={styles.optionsList}>
            {['public', 'followers', 'private_link', 'private'].map((visibility) => (
              <TouchableOpacity
                key={visibility}
                style={[
                  styles.option,
                  settings.default_visibility === visibility && styles.optionSelected,
                ]}
                onPress={() =>
                  handleUpdateSetting('default_visibility', visibility as any)
                }
                disabled={saving}
              >
                <Text
                  style={[
                    styles.optionText,
                    settings.default_visibility === visibility && styles.optionTextSelected,
                  ]}
                >
                  {visibility.charAt(0).toUpperCase() + visibility.slice(1).replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>External Sharing</Text>
          <TouchableOpacity
            style={styles.toggleContainer}
            onPress={() =>
              handleUpdateSetting('allow_external_sharing', !settings.allow_external_sharing)
            }
            disabled={saving}
          >
            <Text style={styles.toggleLabel}>Allow external sharing</Text>
            <View
              style={[
                styles.toggle,
                settings.allow_external_sharing && styles.toggleActive,
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  settings.allow_external_sharing && styles.toggleThumbActive,
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Model Selection</Text>
          <Text style={styles.hint}>
            Choose the AI model for outfit generation. Advanced models require a password.
          </Text>
          
          <View style={styles.optionsList}>
            <TouchableOpacity
              style={[
                styles.option,
                aiModelPreference === 'gemini-2.5-flash-image' && styles.optionSelected,
              ]}
              onPress={() => handleModelSelection('gemini-2.5-flash-image')}
              disabled={saving}
            >
              <Text
                style={[
                  styles.optionText,
                  aiModelPreference === 'gemini-2.5-flash-image' && styles.optionTextSelected,
                ]}
              >
                Standard (gemini-2.5-flash-image)
              </Text>
              <Text style={styles.optionSubtext}>Up to 2 items, always available</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.option,
                aiModelPreference === 'gemini-3-pro-image-preview' && styles.optionSelected,
              ]}
              onPress={() => handleModelSelection('gemini-3-pro-image-preview')}
              disabled={saving}
            >
              <Text
                style={[
                  styles.optionText,
                  aiModelPreference === 'gemini-3-pro-image-preview' && styles.optionTextSelected,
                ]}
              >
                Pro (gemini-3-pro-image-preview)
              </Text>
              <Text style={styles.optionSubtext}>Up to 7 items, password required</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
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
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#000',
    backgroundColor: '#000',
  },
  radioText: {
    fontSize: 14,
    color: '#666',
  },
  radioTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  optionsList: {
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  optionSelected: {
    borderColor: '#000',
    backgroundColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  optionSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#000',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#000',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  signOutButton: {
    marginTop: 40,
    padding: 16,
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
