import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSegments, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { isUserProfileComplete } from '@/lib/user';
import { View, ActivityIndicator, Text } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles } from '@/styles/screens/index-screen.styles';

export default function Index() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session, loading, verifyOtp } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const params = useLocalSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [processingToken, setProcessingToken] = useState(false);

  // Handle magic link and email confirmation tokens from URL
  useEffect(() => {
    const processToken = async () => {
      // Check for token in URL parameters (query params)
      const token = params.token as string | undefined;
      const type = params.type as string | undefined;
      
      // Check window.location.hash for Supabase redirect format
      // Supabase redirects with: #access_token=...&refresh_token=...&type=magiclink
      let hashAccessToken: string | null = null;
      let hashType: string | null = null;
      
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        hashAccessToken = hashParams.get('access_token');
        hashType = hashParams.get('type');
        
        // If we have access_token in hash, Supabase client will auto-process it
        // We just need to trigger getSession() to let it process
        if (hashAccessToken && hashType) {
                    if (__DEV__) {
            console.log('[Index] Supabase redirect detected in URL hash, type:', hashType);
          }
          setProcessingToken(true);
          
          try {
            // Supabase automatically processes access_token from hash when getSession() is called
            // Import supabase directly to call getSession
            const { supabase } = await import('@/lib/supabase');
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.error('[Index] Error getting session from hash:', sessionError);
              setError(sessionError.message || 'Failed to process magic link');
            } else if (sessionData.session) {
                            if (__DEV__) {
                console.log('[Index] Session created from magic link redirect');
              }
              // Clear URL hash
              window.history.replaceState({}, '', window.location.pathname);
              // Session will trigger auth state change, navigation happens in next effect
            } else {
                            if (__DEV__) {
                console.log('[Index] No session found after processing hash');
              }
            }
          } catch (err: any) {
            console.error('[Index] Exception processing hash:', err);
            setError(err.message || 'Failed to process magic link');
          } finally {
            setProcessingToken(false);
          }
          return;
        }
      }
      
      // Handle token_hash format (for email confirmation or explicit token verification)
      const finalToken = token;
      const finalType = type as 'magiclink' | 'email' | null;
      
      if (finalToken && finalType && (finalType === 'magiclink' || finalType === 'email')) {
                if (__DEV__) {
          console.log('[Index] Token detected in URL params, type:', finalType);
        }
        setProcessingToken(true);
        
        try {
          const { error: verifyError, session: verifiedSession } = await verifyOtp(finalToken, finalType);
          
          if (verifyError) {
            console.error('[Index] Token verification error:', verifyError);
            setError(verifyError.message || 'Failed to verify token');
            // Clear URL parameters
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, '', window.location.pathname);
            }
          } else if (verifiedSession) {
                        if (__DEV__) {
              console.log('[Index] Token verified successfully, session created');
            }
            // Clear URL parameters
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, '', window.location.pathname);
            }
            // Session will be updated via auth state change, navigation will happen in next effect
          } else {
                        if (__DEV__) {
              console.log('[Index] Token verified but no session returned');
            }
          }
        } catch (err: any) {
          console.error('[Index] Exception processing token:', err);
          setError(err.message || 'Failed to process token');
        } finally {
          setProcessingToken(false);
        }
      }
    };
    
    // Only process tokens if not loading and not already processing
    if (!loading && !processingToken) {
      processToken();
    }
  }, [params, loading, processingToken, verifyOtp]);

  useEffect(() => {
    if (loading || processingToken) {
            if (__DEV__) {
        console.log('[Index] Auth still loading or processing token...');
      }
      return;
    }

    const checkProfile = async () => {
      try {
        
                if (__DEV__) {
          console.log('[Index] Checking authentication state...');
        }
        
        if (!session) {
                    if (__DEV__) {
            console.log('[Index] No session found, redirecting to login');
          }
          // Not authenticated - redirect to auth
          router.replace('/auth/login');
          return;
        }

                if (__DEV__) {
          console.log('[Index] Session found, checking profile for user:', session.user.id);
        }

        // Check if profile is complete
        const profileComplete = await isUserProfileComplete(session.user.id);
        
                if (__DEV__) {
          console.log('[Index] Profile complete check result:', profileComplete);
        }
        
        if (!profileComplete) {
                    if (__DEV__) {
            console.log('[Index] Profile incomplete, redirecting to onboarding');
          }
          // Profile incomplete - redirect to onboarding
          router.replace('/onboarding');
          return;
        }

                if (__DEV__) {
          console.log('[Index] Profile complete, redirecting to main app');
        }
        // Profile complete - redirect to main app
        router.replace('/(tabs)/wardrobe');
        
      } catch (error: any) {
        console.error('[Index] Error checking profile:', error);
        setError(error.message || 'Failed to check user profile');
        
        // If there's an error, still try to navigate to onboarding
        // as the user might just need to complete their profile
                if (__DEV__) {
          console.log('[Index] Error occurred, redirecting to onboarding as fallback');
        }
        try {
          router.replace('/onboarding');
        } catch (navError) {
          console.error('[Index] Navigation error:', navError);
        }
      }
    };

    checkProfile();
  }, [session, loading, processingToken]);

  // Show loading while checking auth or processing token
  if (loading || processingToken) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        {processingToken && (
          <Text style={styles.loadingText}>Verifying magic link...</Text>
        )}
      </View>
    );
  }

  // Show error if profile check failed
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.errorSubtext}>Redirecting to onboarding...</Text>
      </View>
    );
  }

  return null;
}