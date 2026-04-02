import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useTenantSettingsContext } from '@/contexts/TenantSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModalScaffold } from '@/components/system';
import { AuthCard, type AuthFlowStage } from '@/components/auth/AuthCard';
import { LoginForm, type LoginFormPayload, type LoginFormSubmitResult } from '@/components/auth/LoginForm';
import { resolvePostAuthTarget } from '@/lib/auth-redirect';
import { signOutLocalSession } from '@/lib/auth-signout';

function hasRecoveryParams() {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hash.includes('type=recovery') ||
    new URLSearchParams(window.location.search).get('type') === 'recovery'
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user } = useAuth();
  const { settings } = useTenantSettingsContext();
  const postAuthTarget = resolvePostAuthTarget({
    state: location.state,
    search: location.search,
  });

  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);

  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isResetRequestLoading, setIsResetRequestLoading] = useState(false);

  const [isRecoveryMode, setIsRecoveryMode] = useState(hasRecoveryParams);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingRecoveryPassword, setIsUpdatingRecoveryPassword] = useState(false);

  const [recoveryError, setRecoveryError] = useState('');
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (user && !isRecoveryMode) {
    return <Navigate to={postAuthTarget} replace />;
  }

  const handleCredentialsSubmit = async (
    payload: LoginFormPayload,
  ): Promise<LoginFormSubmitResult> => {
    try {
      const { error } = await signIn(payload.identifier, payload.password);

      if (!error) {
        toast.success('Welcome back!');
        navigate(postAuthTarget, { replace: true });
      }

      return { error };
    } catch (error) {
      console.error('Unhandled sign-in error:', error);
      return {
        error:
          error instanceof Error
            ? error
            : new Error('Unable to reach authentication service.'),
      };
    }
  };

  const handlePasswordResetRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const email = forgotEmail.trim();
    if (!email || !email.includes('@')) {
      setResetError('Please enter a valid email address.');
      return;
    }
    setResetError('');

    setIsResetRequestLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(
        'If the account exists, a password reset link has been sent to the email address.',
      );
      setForgotPasswordOpen(false);
      setForgotEmail('');
    }
    setIsResetRequestLoading(false);
  };

  const clearRecoveryState = () => {
    setIsRecoveryMode(false);
    setNewPassword('');
    setConfirmNewPassword('');
    setShowRecoveryPassword(false);
    window.history.replaceState({}, document.title, '/auth');
  };

  const handleRecoveryPasswordUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      setRecoveryError('Password must be at least 8 characters with uppercase, lowercase, number, and special character.');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      setRecoveryError('Password must contain uppercase, lowercase, number, and special character.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setRecoveryError('Passwords do not match.');
      return;
    }

    setRecoveryError('');
    setIsUpdatingRecoveryPassword(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast.error(error.message);
      setIsUpdatingRecoveryPassword(false);
      return;
    }

    toast.success('Password updated successfully. Please sign in again.');
    await signOutLocalSession();
    clearRecoveryState();
    setIsUpdatingRecoveryPassword(false);
  };

  const stage: AuthFlowStage = isRecoveryMode ? 'recovery' : 'credentials';

  return (
    <>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.08),_transparent_36%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.35))] px-4 py-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-16 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute bottom-16 left-10 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="relative w-full max-w-[27rem]">
          <AuthCard
            stage={stage}
            className="w-full rounded-[2rem] px-1 py-2 md:px-2"
          >
              {settings.maintenanceMode ? (
                <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-800">
                  System maintenance is active. Only admin accounts can sign in until the maintenance window ends.
                </div>
              ) : null}
              {isRecoveryMode ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
                    <p className="font-medium">Choose a new password</p>
                    <p className="text-sm text-muted-foreground">
                      Update it now, then sign in again.
                    </p>
                  </div>

                  <form onSubmit={handleRecoveryPasswordUpdate} className="space-y-4">
                    {recoveryError ? (
                      <p className="text-sm text-destructive">{recoveryError}</p>
                    ) : null}
                    <div className="space-y-2">
                      <Label htmlFor="recovery-password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="recovery-password"
                          type={showRecoveryPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => { setNewPassword(e.target.value); setRecoveryError(''); }}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          minLength={8}
                          required
                          className="h-12 rounded-2xl border-border/70 bg-background px-4 pr-12 shadow-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-xl text-muted-foreground"
                          onClick={() => setShowRecoveryPassword((value) => !value)}
                          aria-label={showRecoveryPassword ? 'Hide password' : 'Show password'}
                          aria-pressed={showRecoveryPassword}
                        >
                          {showRecoveryPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recovery-password-confirm">Confirm New Password</Label>
                      <Input
                        id="recovery-password-confirm"
                        type={showRecoveryPassword ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        className="h-12 rounded-2xl border-border/70 bg-background px-4 shadow-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="submit"
                        className="h-12 w-full rounded-2xl shadow-sm"
                        disabled={isUpdatingRecoveryPassword}
                      >
                        {isUpdatingRecoveryPassword ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Update Password
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 w-full rounded-2xl"
                        onClick={async () => {
                          await signOutLocalSession();
                          clearRecoveryState();
                        }}
                        disabled={isUpdatingRecoveryPassword}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="w-full">
                  <LoginForm
                    onSubmit={handleCredentialsSubmit}
                    onForgotPassword={() => setForgotPasswordOpen(true)}
                  />
                </div>
              )}
          </AuthCard>
        </div>
      </div>

      <ModalScaffold
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
        title="Reset Password"
        description="Enter your email to receive a reset link."
        maxWidth="md"
        body={(
          <form
            onSubmit={handlePasswordResetRequest}
            className="space-y-4"
            id="forgot-password-form"
          >
            {resetError ? (
              <p className="text-sm text-destructive">{resetError}</p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => { setForgotEmail(e.target.value); setResetError(''); }}
                placeholder="you@company.com"
                autoComplete="email"
                required
                className="h-12 rounded-2xl"
              />
            </div>
          </form>
        )}
        footer={(
          <>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => setForgotPasswordOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="forgot-password-form"
              className="rounded-2xl"
              disabled={isResetRequestLoading}
            >
              {isResetRequestLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send Reset Link
            </Button>
          </>
        )}
      />
    </>
  );
}
