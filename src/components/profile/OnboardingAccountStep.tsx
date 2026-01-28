/**
 * OnboardingAccountStep Component
 * Account setup step in onboarding
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

interface OnboardingAccountStepProps {
  handle: string;
  displayName: string;
  accountPrivacy: 'public' | 'private';
  searchVisibility: 'visible' | 'hidden';
  loading: boolean;
  onHandleChange: (handle: string) => void;
  onDisplayNameChange: (displayName: string) => void;
  onAccountPrivacyChange: (privacy: 'public' | 'private') => void;
  onSearchVisibilityChange: (visibility: 'visible' | 'hidden') => void;
  onComplete: () => void;
}

export function OnboardingAccountStep({
  handle,
  displayName,
  accountPrivacy,
  searchVisibility,
  loading,
  onHandleChange,
  onDisplayNameChange,
  onAccountPrivacyChange,
  onSearchVisibilityChange,
  onComplete,
}: OnboardingAccountStepProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Account</Text>
      <Text style={styles.subtitle}>
        Set up your profile to get started
      </Text>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Handle *</Text>
          <TextInput
            style={styles.input}
            value={handle}
            onChangeText={onHandleChange}
            placeholder="@username"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            3-20 characters, letters, numbers, and underscores only
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Display Name *</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={onDisplayNameChange}
            placeholder="Your name"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Account Privacy</Text>
          <View style={styles.options}>
            <TouchableOpacity
              style={[
                styles.option,
                accountPrivacy === 'public' && styles.optionSelected,
              ]}
              onPress={() => onAccountPrivacyChange('public')}
            >
              <Text
                style={[
                  styles.optionText,
                  accountPrivacy === 'public' && styles.optionTextSelected,
                ]}
              >
                Public
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.option,
                accountPrivacy === 'private' && styles.optionSelected,
              ]}
              onPress={() => onAccountPrivacyChange('private')}
            >
              <Text
                style={[
                  styles.optionText,
                  accountPrivacy === 'private' && styles.optionTextSelected,
                ]}
              >
                Private
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Search Visibility</Text>
          <View style={styles.options}>
            <TouchableOpacity
              style={[
                styles.option,
                searchVisibility === 'visible' && styles.optionSelected,
              ]}
              onPress={() => onSearchVisibilityChange('visible')}
            >
              <Text
                style={[
                  styles.optionText,
                  searchVisibility === 'visible' && styles.optionTextSelected,
                ]}
              >
                Visible
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.option,
                searchVisibility === 'hidden' && styles.optionSelected,
              ]}
              onPress={() => onSearchVisibilityChange('hidden')}
            >
              <Text
                style={[
                  styles.optionText,
                  searchVisibility === 'hidden' && styles.optionTextSelected,
                ]}
              >
                Hidden
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onComplete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  form: {
    gap: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  hint: {
    fontSize: 12,
    color: '#999',
  },
  options: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  optionText: {
    fontSize: 16,
    color: '#666',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
