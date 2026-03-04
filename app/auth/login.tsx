import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { showErrorToast, showSuccessToast } from '@/utils/toast';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { KeyboardAwareScreen } from '@/components/shared/layout';
import { styles } from './login.styles';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSignIn = async () => {
    if (!email.trim()) {
      showErrorToast('Please enter your email');
      return;
    }

    if (!useMagicLink && !password.trim()) {
      showErrorToast('Please enter your password');
      return;
    }

    setLoading(true);
    console.log('[Login] Attempting sign in with email:', email, 'Magic link:', useMagicLink);

    try {
      const { error } = await signIn(email, useMagicLink ? undefined : password);

      if (error) {
        console.error('[Login] Sign in error:', error);
        const errorMessage = error.message || 'Failed to sign in';
        
        // Provide more helpful error messages
        let userMessage = errorMessage;
        if (errorMessage.includes('Invalid login credentials')) {
          userMessage = 'Invalid email or password. Please try again.';
        } else if (errorMessage.includes('Email not confirmed')) {
          userMessage = 'Please check your email and confirm your account before signing in.';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          userMessage = 'Network error. Please check your connection and try again.';
        }
        
        showErrorToast(userMessage);
      } else {
        console.log('[Login] Sign in successful');
        if (useMagicLink) {
          showSuccessToast('We sent you a magic link. Check your email to sign in.');
        } else {
          console.log('[Login] Password sign in successful, navigating to index for profile check');
          // Navigate to index route which will check profile and redirect appropriately
          router.replace('/');
        }
      }
    } catch (error: any) {
      console.error('[Login] Unexpected error during sign in:', error);
      const errorMessage = error?.message || error?.toString() || 'An unexpected error occurred';
      showErrorToast(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignUp = () => {
    router.push('/auth/signup');
  };

  return (
    <KeyboardAwareScreen
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      dismissOnTap
    >
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          {!useMagicLink && (
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {useMagicLink ? 'Send Magic Link' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setUseMagicLink(!useMagicLink)}
            disabled={loading}
          >
            <Text style={styles.linkText}>
              {useMagicLink
                ? 'Use password instead'
                : 'Use magic link instead'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={navigateToSignUp} disabled={loading}>
            <Text style={styles.linkText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScreen>
  );
}
