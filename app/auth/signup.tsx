import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { showErrorToast } from '@/utils/toast';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { KeyboardAwareScreen } from '@/components/shared/layout';
import { styles } from './signup.styles';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasJustSignedUp, setHasJustSignedUp] = useState(false);
  const { signUp, signOut, session, user } = useAuth();
  const router = useRouter();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignUp = async () => {
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail) {
      showErrorToast('Please enter your email');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      showErrorToast('Please enter a valid email address');
      return;
    }

    if (!password.trim()) {
      showErrorToast('Please enter a password');
      return;
    }

    if (password.length < 6) {
      showErrorToast('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      showErrorToast('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error, user: signUpUser, session: signUpSession } = await signUp(trimmedEmail, password);

      if (error) {
        // If signup fails, make sure we don't have a partial session
        // Sign out any existing session to prevent navigation issues
        if (session) {
          await signOut();
        }
        showErrorToast(error.message || 'Failed to sign up');
        setLoading(false);
        return;
      }

      // Check if user was automatically signed in (email confirmation disabled)
      if (signUpSession && signUpUser) {
                if (__DEV__) {
          console.log('[SignUp] User automatically signed in, navigating to onboarding');
        }
        // Set flag so useEffect knows we just signed up
        setHasJustSignedUp(true);
        // Clear form
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        // Navigation will be handled by index.tsx when it detects the session
        // But we can navigate directly here
        router.replace('/onboarding');
      } else {
        // Email confirmation required
                if (__DEV__) {
          console.log('[SignUp] Email confirmation required');
        }
        Alert.alert(
          'Check your email',
          'We sent you a confirmation email. Please verify your email to continue.',
          [
            {
              text: 'Go to Login',
              onPress: () => {
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                router.replace('/auth/login');
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('[SignUp] Unexpected error:', error);
      showErrorToast(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Listen for auth state changes after signup (for email confirmation flow)
  // Only navigate if we just signed up, not if there's an existing session from a previous invalid signup
  useEffect(() => {
    if (hasJustSignedUp && session && user) {
            if (__DEV__) {
        console.log('[SignUp] Session detected after signup, navigating to onboarding');
      }
      // User confirmed email or was auto-signed in
      setHasJustSignedUp(false); // Reset flag
      router.replace('/onboarding');
    }
  }, [hasJustSignedUp, session, user, router]);

  const navigateToLogin = () => {
    router.push('/auth/login');
  };

  return (
    <KeyboardAwareScreen
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      dismissOnTap
    >
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to get started</Text>

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

          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={navigateToLogin} disabled={loading}>
            <Text style={styles.linkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScreen>
  );
}
