/**
 * AIModelSection Component
 * AI model selection section for account settings
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Switch } from 'react-native';

interface AIModelSectionProps {
  aiModelPreference: string;
  saving: boolean;
  onModelSelection: (model: string) => Promise<void>;
  includeHeadshot: boolean;
  onHeadshotToggle: (enabled: boolean, password: string) => Promise<void>;
}

export function AIModelSection({
  aiModelPreference,
  saving,
  onModelSelection,
  includeHeadshot,
  onHeadshotToggle,
}: AIModelSectionProps) {
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');

  const handleTogglePress = () => {
    if (!includeHeadshot) {
      // Enabling - require password
      setShowPasswordInput(true);
    } else {
      // Disabling - also require password
      setShowPasswordInput(true);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      return;
    }
    const newValue = !includeHeadshot;
    await onHeadshotToggle(newValue, password);
    setPassword('');
    setShowPasswordInput(false);
  };

  const handlePasswordCancel = () => {
    setPassword('');
    setShowPasswordInput(false);
  };

  return (
    <View style={styles.section}>
      {/* Headshot Toggle - Above AI Model Selection */}
      <View style={styles.headshotToggleSection}>
        <View style={styles.headshotToggleHeader}>
          <View style={styles.headshotToggleLabelContainer}>
            <Text style={styles.headshotToggleTitle}>Include Headshot in Generation</Text>
            <View style={styles.betaBadge}>
              <Text style={styles.betaBadgeText}>Beta</Text>
            </View>
          </View>
          <Switch
            value={includeHeadshot}
            onValueChange={handleTogglePress}
            disabled={saving || showPasswordInput}
          />
        </View>
        <Text style={styles.hint}>
          When enabled, your headshot will be included in outfit generation. Password required to change.
        </Text>

        {showPasswordInput && (
          <View style={styles.passwordContainer}>
            <Text style={styles.passwordLabel}>Enter Password</Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.passwordButtons}>
              <TouchableOpacity
                style={[styles.passwordButton, styles.passwordButtonCancel]}
                onPress={handlePasswordCancel}
                disabled={saving}
              >
                <Text style={[styles.passwordButtonText, styles.passwordButtonCancelText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.passwordButton, styles.passwordButtonConfirm]}
                onPress={handlePasswordSubmit}
                disabled={saving || !password.trim()}
              >
                <Text style={[styles.passwordButtonText, styles.passwordButtonConfirmText]}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

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
          onPress={() => onModelSelection('gemini-2.5-flash-image')}
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
          onPress={() => onModelSelection('gemini-3-pro-image-preview')}
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
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
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
  headshotToggleSection: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headshotToggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headshotToggleLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  headshotToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  betaBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  betaBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  passwordContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  passwordButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  passwordButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  passwordButtonCancel: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  passwordButtonConfirm: {
    backgroundColor: '#000',
  },
  passwordButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  passwordButtonCancelText: {
    color: '#333',
  },
  passwordButtonConfirmText: {
    color: '#fff',
  },
});
