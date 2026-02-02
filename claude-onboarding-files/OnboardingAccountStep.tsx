/**
 * OnboardingAccountStep Component (Improved)
 * Account setup step in onboarding - matches overall onboarding styling
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.stepIndicator}>Welcome</Text>
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>
            Set up your profile to get started with Full-Stylist
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Handle Field */}
          <View style={styles.field}>
            <Text style={styles.label}>Handle *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons 
                name="at" 
                size={20} 
                color="#999" 
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.input}
                value={handle}
                onChangeText={onHandleChange}
                placeholder="username"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
            <Text style={styles.hint}>
              3-20 characters, letters, numbers, and underscores only
            </Text>
          </View>

          {/* Display Name Field */}
          <View style={styles.field}>
            <Text style={styles.label}>Display Name *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons 
                name="person-outline" 
                size={20} 
                color="#999" 
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={onDisplayNameChange}
                placeholder="Your name"
                placeholderTextColor="#999"
                editable={!loading}
              />
            </View>
          </View>

          {/* Account Privacy */}
          <View style={styles.field}>
            <Text style={styles.label}>Account Privacy</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  styles.segmentLeft,
                  accountPrivacy === 'public' && styles.segmentSelected,
                ]}
                onPress={() => onAccountPrivacyChange('public')}
                disabled={loading}
              >
                <Ionicons 
                  name="globe-outline" 
                  size={18} 
                  color={accountPrivacy === 'public' ? '#fff' : '#666'} 
                />
                <Text
                  style={[
                    styles.segmentText,
                    accountPrivacy === 'public' && styles.segmentTextSelected,
                  ]}
                >
                  Public
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segment,
                  styles.segmentRight,
                  accountPrivacy === 'private' && styles.segmentSelected,
                ]}
                onPress={() => onAccountPrivacyChange('private')}
                disabled={loading}
              >
                <Ionicons 
                  name="lock-closed-outline" 
                  size={18} 
                  color={accountPrivacy === 'private' ? '#fff' : '#666'} 
                />
                <Text
                  style={[
                    styles.segmentText,
                    accountPrivacy === 'private' && styles.segmentTextSelected,
                  ]}
                >
                  Private
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              {accountPrivacy === 'public' 
                ? 'Anyone can view your wardrobe and outfits' 
                : 'Only approved followers can view your content'}
            </Text>
          </View>

          {/* Search Visibility */}
          <View style={styles.field}>
            <Text style={styles.label}>Search Visibility</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  styles.segmentLeft,
                  searchVisibility === 'visible' && styles.segmentSelected,
                ]}
                onPress={() => onSearchVisibilityChange('visible')}
                disabled={loading}
              >
                <Ionicons 
                  name="search-outline" 
                  size={18} 
                  color={searchVisibility === 'visible' ? '#fff' : '#666'} 
                />
                <Text
                  style={[
                    styles.segmentText,
                    searchVisibility === 'visible' && styles.segmentTextSelected,
                  ]}
                >
                  Visible
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segment,
                  styles.segmentRight,
                  searchVisibility === 'hidden' && styles.segmentSelected,
                ]}
                onPress={() => onSearchVisibilityChange('hidden')}
                disabled={loading}
              >
                <Ionicons 
                  name="eye-off-outline" 
                  size={18} 
                  color={searchVisibility === 'hidden' ? '#fff' : '#666'} 
                />
                <Text
                  style={[
                    styles.segmentText,
                    searchVisibility === 'hidden' && styles.segmentTextSelected,
                  ]}
                >
                  Hidden
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              {searchVisibility === 'visible' 
                ? 'Your profile will appear in search results' 
                : 'Others can only find you via direct link'}
            </Text>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, loading && styles.continueButtonDisabled]}
            onPress={onComplete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
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
  content: {
    padding: 20,
  },
  headerSection: {
    marginBottom: 32,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    lineHeight: 22,
  },
  formSection: {
    gap: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f9f9f9',
  },
  segmentLeft: {
    borderRightWidth: 0.5,
    borderRightColor: '#e0e0e0',
  },
  segmentRight: {
    borderLeftWidth: 0.5,
    borderLeftColor: '#e0e0e0',
  },
  segmentSelected: {
    backgroundColor: '#007AFF',
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  segmentTextSelected: {
    color: '#fff',
  },
  continueButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
