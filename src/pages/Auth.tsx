import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModalScaffold } from '@/components/system';
import { AuthCard, type AuthFlowStage } from '@/components/auth/AuthCard';
import { LoginForm, type LoginFormPayload, type LoginFormSubmitResult } from '@/components/auth/LoginForm';

function hasRecoveryParams() {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hash.includes('type=recovery') ||
    new URLSearchParams(window.location.search).get('type') === 'recovery'
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();

  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);

  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isResetRequestLoading, setIsResetRequestLoading] = useState(false);

  const [isRecoveryMode, setIsRecoveryMode] = useState(hasRecoveryParams);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingRecoveryPassword, setIsUpdatingRecoveryPassword] = useState(false);

  const [isSignUpLoading, setIsSignUpLoading] = useState(false);
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
    return <Navigate to="/dashboard" replace />;
  }

  const handleCredentialsSubmit = async (
    payload: LoginFormPayload,
  ): Promise<LoginFormSubmitResult> => {
    try {
      const { error } = await signIn(payload.identifier, payload.password);

      if (!error) {
        toast.success('Welcome back!');
        navigate('/dashboard');
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

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSignUpLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const firstName = formData.get('firstName') as string;
      const lastName = formData.get('lastName') as string;

      const { error } = await signUp(email, password, firstName, lastName);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Account created successfully!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Unhandled sign-up error:', error);
      toast.error('Unable to create account at the moment. Please try again.');
    } finally {
      setIsSignUpLoading(false);
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
    await supabase.auth.signOut();
    clearRecoveryState();
    setIsUpdatingRecoveryPassword(false);
  };

  const stage: AuthFlowStage = isRecoveryMode ? 'recovery' : 'credentials';

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
          <AuthCard
            stage={stage}
            className="w-full max-w-md"
          >
              {isRecoveryMode ? (
                <div className="space-y-5">
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <p className="font-medium">Reset your password</p>
                    <p className="text-sm text-muted-foreground">
                      Enter a new password for your account. After updating, you will be signed out and can log in again.
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
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2"
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
                        
                      />
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="submit"
                        className="w-full"
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
                        className="w-full"
                        onClick={async () => {
                          await supabase.auth.signOut();
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
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="mb-4 grid w-full grid-cols-2">
                    <TabsTrigger value="signin" className="text-sm font-medium">
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="text-sm font-medium">
                      Sign Up
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin" className="mt-0">
                    <LoginForm
                      onSubmit={handleCredentialsSubmit}
                      onForgotPassword={() => setForgotPasswordOpen(true)}
                    />
                  </TabsContent>

                  <TabsContent value="signup" className="mt-0">
                    <form onSubmit={handleSignUp} className="space-y-5">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            name="firstName"
                            placeholder="John"
                            required
                            
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            name="lastName"
                            placeholder="Doe"
                            required
                            
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          name="email"
                          type="email"
                          placeholder="you@company.com"
                          autoComplete="email"
                          required
                          
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            name="password"
                            type={showSignUpPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            minLength={8}
                            autoComplete="new-password"
                            required
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2"
                            onClick={() => setShowSignUpPassword((value) => !value)}
                            aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                            aria-pressed={showSignUpPassword}
                          >
                            {showSignUpPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isSignUpLoading}
                      >
                        {isSignUpLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Create Account
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              )}
          </AuthCard>
      </div>

      <ModalScaffold
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
        title="Reset Password"
        description="Enter your account email. If it exists, we will send a password reset link."
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
              />
            </div>
          </form>
        )}
        footer={(
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setForgotPasswordOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="forgot-password-form"
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
