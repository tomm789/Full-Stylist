/**
 * PrivacySettingsSection Component
 * Privacy-related settings section for account settings
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UserSettings } from '@/lib/settings';

interface PrivacySettingsSectionProps {
  settings: UserSettings;
  saving: boolean;
  onUpdateSetting: <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => Promise<void>;
}

export function PrivacySettingsSection({
  settings,
  saving,
  onUpdateSetting,
}: PrivacySettingsSectionProps) {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Privacy</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[
              styles.radioOption,
              settings.account_privacy === 'public' && styles.radioSelected,
            ]}
            onPress={() => onUpdateSetting('account_privacy', 'public')}
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
            onPress={() => onUpdateSetting('account_privacy', 'private')}
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
            onPress={() => onUpdateSetting('search_visibility', 'visible')}
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
            onPress={() => onUpdateSetting('search_visibility', 'hidden')}
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
              onPress={() => onUpdateSetting('default_visibility', visibility as any)}
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
            onUpdateSetting('allow_external_sharing', !settings.allow_external_sharing)
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
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
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
});
