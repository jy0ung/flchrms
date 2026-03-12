import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { untypedRpc } from '@/integrations/supabase/untyped-client';
import { AppRole, Profile } from '@/types/hrms';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { toast } from 'sonner';
import { signOutLocalSession } from '@/lib/auth-signout';
import { withAuthReadRetry } from '@/lib/auth-bootstrap';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BLOCKED_ACCOUNT_STATUSES = new Set<Profile['status']>(['inactive', 'terminated']);

function normalizeLoginIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  const isEmail = trimmed.includes('@');

  return {
    value: isEmail ? trimmed : trimmed.toLowerCase(),
    isEmail,
  };
}

function isBlockedAccountStatus(status: string | null | undefined): status is Extract<Profile['status'], 'inactive' | 'terminated'> {
  return !!status && BLOCKED_ACCOUNT_STATUSES.has(status as Profile['status']);
}

async function resolveLoginEmail(identifier: string) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

  if (supabaseUrl && publishableKey) {
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/resolve_login_email`, {
        method: 'POST',
        headers: {
          apikey: publishableKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ _identifier: identifier }),
      });

      if (response.ok) {
        const data = await response.json();
        return { email: typeof data === 'string' ? data : null, error: null };
      }

      console.error('Error resolving login email via direct RPC fetch:', response.status, await response.text());
    } catch (error) {
      console.error('Error resolving login email via direct RPC fetch:', error);
    }
  }

  // Fallback for environments where the standard client RPC path works.
  const { data, error } = await untypedRpc('resolve_login_email', {
    _identifier: identifier,
  });

  return { email: (typeof data === 'string' ? data : null), error };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resetAuthState = useCallback(() => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  }, []);

  const getProfileStatus = async (userId: string) => {
    try {
      const data = await withAuthReadRetry(async () => {
        const { data: statusData, error } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', userId)
          .single();

        if (error) throw error;
        return statusData;
      });

      return {
        status: data?.status as string | null | undefined,
        error: null,
      };
    } catch (error) {
      return {
        status: null,
        error,
      };
    }
  };

  const fetchProfile = async (userId: string): Promise<boolean> => {
    try {
      const profileData = await withAuthReadRetry(async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        return data;
      });

      if (isBlockedAccountStatus(profileData.status)) {
        // Safety net for restored sessions after HR/Admin changes account status.
        await signOutLocalSession();
        resetAuthState();
        return false;
      }

      setProfile(profileData as Profile);

      const roleData = await withAuthReadRetry(async () => {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();

        if (error) throw error;
        return data;
      });

      setRole(roleData.role as AppRole);
      return true;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      setProfile(null);
      setRole(null);
      return false;
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Track whether the initial getSession has resolved to avoid
    // duplicate fetchProfile calls from the auth state listener.
    let initialSessionResolved = false;

    const hydrateAuthState = async (session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setIsLoading(true);
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setRole(null);
      }
      setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Only hydrate from the listener once the initial getSession has completed
        // to prevent races between initialization and auth event callbacks.
        if (!initialSessionResolved) return;
        void hydrateAuthState(session);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await hydrateAuthState(session);
      initialSessionResolved = true;
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = useCallback(async (identifier: string, password: string) => {
    const normalizedIdentifier = normalizeLoginIdentifier(identifier);

    if (!normalizedIdentifier.value) {
      return { error: new Error('Email, username, or employee ID is required') };
    }

    let emailToUse: string = normalizedIdentifier.value;

    if (!normalizedIdentifier.isEmail) {
      const { email: resolvedEmail, error: resolveError } = await resolveLoginEmail(normalizedIdentifier.value);

      if (resolveError) {
        console.error('Error resolving login email:', resolveError);
        return { error: new Error('Unable to sign in at the moment') };
      }

      if (!resolvedEmail) {
        return { error: new Error('Invalid login credentials') };
      }

      emailToUse = resolvedEmail;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    if (error) {
      return { error: error as Error | null };
    }

    if (data.user) {
      const { status, error: statusError } = await getProfileStatus(data.user.id);

      if (statusError) {
        console.error('Error checking account status after sign-in:', statusError);
        await signOutLocalSession();
        resetAuthState();
        return { error: new Error('Unable to sign in at the moment') };
      }

      if (isBlockedAccountStatus(status)) {
        await signOutLocalSession();
        resetAuthState();
        return { error: new Error('This account is inactive. Please contact HR/Admin.') };
      }
    }

    return { error: null };
  }, [resetAuthState]);

  const signUp = useCallback(async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    await signOutLocalSession();
    resetAuthState();
  }, [resetAuthState]);

  const handleIdleTimeout = useCallback(async () => {
    if (user) {
      toast.info('You have been signed out due to inactivity.');
      await signOut();
    }
  }, [user, signOut]);

  // Auto sign-out after 30 minutes of inactivity
  useIdleTimeout(handleIdleTimeout, 30 * 60 * 1000, !!user);

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    profile,
    role,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }), [user, session, profile, role, isLoading, signIn, signUp, signOut, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
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
