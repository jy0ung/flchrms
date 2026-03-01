import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, Profile } from '@/types/hrms';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { toast } from 'sonner';

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
  const { data, error } = await supabase.rpc('resolve_login_email', {
    _identifier: identifier,
  });

  return { email: data ?? null, error };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resetAuthState = () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const getProfileStatus = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', userId)
      .single();

    return {
      status: data?.status as string | null | undefined,
      error,
    };
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      if (isBlockedAccountStatus(profileData.status)) {
        // Safety net for restored sessions after HR/Admin changes account status.
        await supabase.auth.signOut();
        resetAuthState();
        return;
      }

      setProfile(profileData as Profile);

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        console.error('Error fetching role:', roleError);
        return;
      }

      setRole(roleData.role as AppRole);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Track whether the initial getSession has resolved to avoid
    // duplicate fetchProfile calls from the auth state listener.
    let initialSessionResolved = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Only fetch profile from the listener once the initial
          // getSession has completed — otherwise both paths race.
          if (initialSessionResolved) {
            fetchProfile(session.user.id);
          }
        } else {
          setProfile(null);
          setRole(null);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
      initialSessionResolved = true;
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (identifier: string, password: string) => {
    const normalizedIdentifier = normalizeLoginIdentifier(identifier);

    if (!normalizedIdentifier.value) {
      return { error: new Error('Email, username, or employee ID is required') };
    }

    let emailToUse = normalizedIdentifier.value;

    if (!normalizedIdentifier.isEmail) {
      // Transitional approach: resolve identifier to email in a definer RPC.
      // A future edge function login endpoint can avoid returning the email to the client entirely.
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
        await supabase.auth.signOut();
        resetAuthState();
        return { error: new Error('Unable to sign in at the moment') };
      }

      if (isBlockedAccountStatus(status)) {
        await supabase.auth.signOut();
        resetAuthState();
        return { error: new Error('This account is inactive. Please contact HR/Admin.') };
      }
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
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
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    resetAuthState();
  };

  const handleIdleTimeout = useCallback(async () => {
    if (user) {
      toast.info('You have been signed out due to inactivity.');
      await signOut();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto sign-out after 30 minutes of inactivity
  useIdleTimeout(handleIdleTimeout, 30 * 60 * 1000, !!user);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
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