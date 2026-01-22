import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any; user: User | null; session: Session | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  verifyOtp: (token: string, type: 'magiclink' | 'email') => Promise<{ error: any; session: Session | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Initializing auth context...');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[AuthContext] Error getting initial session:', error);
      } else {
        console.log('[AuthContext] Initial session:', session ? 'Found' : 'Not found');
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('[AuthContext] Exception getting initial session:', error);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:44',message:'onAuthStateChange fired',data:{event,hasSession:!!session,userId:session?.user?.id||'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log('[AuthContext] Auth state changed:', event, session ? 'Session found' : 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:48',message:'State updated after auth change',data:{event,hasSession:!!session},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    });

    return () => {
      console.log('[AuthContext] Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password?: string) => {
    try {
      if (password) {
        // Password sign in
        console.log('[AuthContext] Attempting password sign in for:', email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error('[AuthContext] Password sign in error:', error);
        } else {
          console.log('[AuthContext] Password sign in successful');
        }
        
        return { error };
      } else {
        // Magic link sign in
        console.log('[AuthContext] Attempting magic link sign in for:', email);
        const { data, error } = await supabase.auth.signInWithOtp({
          email,
        });
        
        if (error) {
          console.error('[AuthContext] Magic link sign in error:', error);
        } else {
          console.log('[AuthContext] Magic link sent successfully');
        }
        
        return { error };
      }
    } catch (error: any) {
      console.error('[AuthContext] Exception during sign in:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Attempting sign up for:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('[AuthContext] Sign up error:', error);
        return { error, user: null, session: null };
      } else {
        console.log('[AuthContext] Sign up successful');
        console.log('[AuthContext] Sign up response - User:', data.user ? 'Present' : 'Not present');
        console.log('[AuthContext] Sign up response - Session:', data.session ? 'Present (auto signed in)' : 'Not present (email confirmation required)');
        
        // Return user and session data
        return { 
          error: null, 
          user: data.user ?? null, 
          session: data.session ?? null 
        };
      }
    } catch (error: any) {
      console.error('[AuthContext] Exception during sign up:', error);
      return { error, user: null, session: null };
    }
  };

  const signOut = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:124',message:'signOut called',data:{sessionBefore:session?session.user.id:'null',userBefore:user?user.id:'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      console.log('[AuthContext] Signing out...');
      const { error } = await supabase.auth.signOut();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:127',message:'signOut API call completed',data:{error:error?error.message:'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (error) {
        console.error('[AuthContext] Sign out error:', error);
      } else {
        console.log('[AuthContext] Sign out successful');
      }
    } catch (error: any) {
      console.error('[AuthContext] Exception during sign out:', error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:134',message:'signOut exception',data:{error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('[AuthContext] Resetting password for:', email);
      const { data, error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        console.error('[AuthContext] Reset password error:', error);
      } else {
        console.log('[AuthContext] Password reset email sent successfully');
      }
      
      return { error };
    } catch (error: any) {
      console.error('[AuthContext] Exception during password reset:', error);
      return { error };
    }
  };

  const verifyOtp = async (token: string, type: 'magiclink' | 'email') => {
    try {
      console.log('[AuthContext] Verifying OTP token, type:', type);
      
      // Supabase magic links and email confirmations use token_hash
      // The token from URL might be the access_token from hash, or a token_hash
      // Try verifyOtp first with token_hash
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type === 'magiclink' ? 'magiclink' : 'email',
      });
      
      if (error) {
        console.error('[AuthContext] OTP verification error:', error);
        // If verifyOtp fails, Supabase might have already processed the hash automatically
        // Try getting the session - it might already be set
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          console.log('[AuthContext] Session found after failed verifyOtp (likely auto-processed)');
          return { error: null, session: sessionData.session };
        }
        return { error, session: null };
      } else {
        console.log('[AuthContext] OTP verification successful');
        console.log('[AuthContext] Session:', data.session ? 'Present' : 'Not present');
        return { error: null, session: data.session ?? null };
      }
    } catch (error: any) {
      console.error('[AuthContext] Exception during OTP verification:', error);
      // Try getting session in case it was auto-processed
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          console.log('[AuthContext] Session found after exception (likely auto-processed)');
          return { error: null, session: sessionData.session };
        }
      } catch (sessionError) {
        console.error('[AuthContext] Error getting session after exception:', sessionError);
      }
      return { error, session: null };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        verifyOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}