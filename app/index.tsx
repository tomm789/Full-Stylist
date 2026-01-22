import { useEffect, useState } from 'react';
import { useRouter, useSegments, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { isUserProfileComplete } from '@/lib/user';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

export default function Index() {
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
          console.log('[Index] Supabase redirect detected in URL hash, type:', hashType);
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
              console.log('[Index] Session created from magic link redirect');
              // Clear URL hash
              window.history.replaceState({}, '', window.location.pathname);
              // Session will trigger auth state change, navigation happens in next effect
            } else {
              console.log('[Index] No session found after processing hash');
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
        console.log('[Index] Token detected in URL params, type:', finalType);
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
            console.log('[Index] Token verified successfully, session created');
            // Clear URL parameters
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, '', window.location.pathname);
            }
            // Session will be updated via auth state change, navigation will happen in next effect
          } else {
            console.log('[Index] Token verified but no session returned');
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:108',message:'Index useEffect triggered',data:{loading,processingToken,hasSession:!!session,userId:session?.user?.id||'null',segments:segments.join('/')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    if (loading || processingToken) {
      console.log('[Index] Auth still loading or processing token...');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:113',message:'Index skipping check - still loading',data:{loading,processingToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      return;
    }

    const checkProfile = async () => {
      try {
        
        console.log('[Index] Checking authentication state...');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:120',message:'Index checkProfile started',data:{hasSession:!!session,userId:session?.user?.id||'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        
        if (!session) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:124',message:'No session detected, redirecting to login',data:{currentSegments:segments.join('/')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
          // #endregion
          console.log('[Index] No session found, redirecting to login');
          // Not authenticated - redirect to auth
          router.replace('/auth/login');
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:130',message:'Index router.replace called',data:{target:'/auth/login'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
          // #endregion
          return;
        }

        console.log('[Index] Session found, checking profile for user:', session.user.id);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:136',message:'Index session found, checking profile',data:{userId:session.user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion

        // Check if profile is complete
        const profileComplete = await isUserProfileComplete(session.user.id);
        
        console.log('[Index] Profile complete check result:', profileComplete);
        
        if (!profileComplete) {
          console.log('[Index] Profile incomplete, redirecting to onboarding');
          // Profile incomplete - redirect to onboarding
          router.replace('/onboarding');
          return;
        }

        console.log('[Index] Profile complete, redirecting to main app');
        // Profile complete - redirect to main app
        router.replace('/(tabs)/wardrobe');
        
      } catch (error: any) {
        console.error('[Index] Error checking profile:', error);
        setError(error.message || 'Failed to check user profile');
        
        // If there's an error, still try to navigate to onboarding
        // as the user might just need to complete their profile
        console.log('[Index] Error occurred, redirecting to onboarding as fallback');
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff0000',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});