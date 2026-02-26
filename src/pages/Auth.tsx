import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Building2, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Sparkles } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isResetRequestLoading, setIsResetRequestLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(hasRecoveryParams);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingRecoveryPassword, setIsUpdatingRecoveryPassword] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect if already logged in (except when handling password recovery link)
  if (user && !isRecoveryMode) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const identifier = formData.get('identifier') as string;
      const password = formData.get('password') as string;

      const { error } = await signIn(identifier, password);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Unhandled sign-in error:', error);
      toast.error('Unable to sign in at the moment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

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
      setIsLoading(false);
    }
  };

  const handlePasswordResetRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const email = forgotEmail.trim();
    if (!email || !email.includes('@')) {
      toast.error('Please enter the email address for the account.');
      return;
    }

    setIsResetRequestLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      // Keep this generic to avoid leaking whether the email exists.
      toast.success('If the account exists, a password reset link has been sent to the email address.');
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

  const handleRecoveryPasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match.');
      return;
    }

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

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background px-4 py-8 sm:py-10">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="hidden border-border/60 bg-gradient-to-br from-primary/10 via-background to-accent/10 shadow-sm lg:block">
            <CardContent className="p-7 xl:p-9">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Secure Workforce Operations
                </div>

                <div className="space-y-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground xl:text-4xl">FLC-HRMS</h1>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground xl:text-base">
                      Centralized HR management for leave workflows, payroll operations, employee records, and internal updates.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-xl border border-border/60 bg-background/70 p-4 backdrop-blur">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Role-based access controls</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Access is restricted by role, department, and workflow stage.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/70 p-4 backdrop-blur">
                    <div className="flex items-start gap-3">
                      <KeyRound className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Flexible sign-in</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Sign in using email, username, or employee ID.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full border-border/60 shadow-xl shadow-black/5">
            <CardHeader className="space-y-4 pb-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm lg:hidden">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">FLC-HRMS</CardTitle>
                <CardDescription className="mt-1">
                  Fook Loi Group HR Management System
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
            {isRecoveryMode ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <KeyRound className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">Reset your password</p>
                      <p className="text-sm text-muted-foreground">
                        Enter a new password for your account. After updating, you will be signed out and can log in again.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleRecoveryPasswordUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recovery-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="recovery-password"
                        type={showRecoveryPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        minLength={6}
                        required
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                        onClick={() => setShowRecoveryPassword((value) => !value)}
                        aria-label={showRecoveryPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRecoveryPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                      minLength={6}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="submit" className="h-10 w-full rounded-lg" disabled={isUpdatingRecoveryPassword}>
                      {isUpdatingRecoveryPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Update Password
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full rounded-lg"
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
                <TabsList className="mb-6 grid h-auto w-full grid-cols-2 rounded-xl bg-muted/60 p-1">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-0">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-identifier">Email, Username, or Employee ID</Label>
                      <Input
                        id="signin-identifier"
                        name="identifier"
                        type="text"
                        placeholder="you@company.com, username, or EMP-001"
                        autoComplete="username"
                        required
                        className="h-10 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password">Password</Label>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto px-0 text-xs"
                          onClick={() => setForgotPasswordOpen(true)}
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          name="password"
                          type={showSignInPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          required
                          className="h-10 rounded-lg pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                          onClick={() => setShowSignInPassword((value) => !value)}
                          aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                        >
                          {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Button type="submit" className="h-10 w-full rounded-lg" disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Sign In
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" name="firstName" placeholder="John" required className="h-10 rounded-lg" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" name="lastName" placeholder="Doe" required className="h-10 rounded-lg" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="you@company.com"
                        required
                        className="h-10 rounded-lg"
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
                          minLength={6}
                          autoComplete="new-password"
                          required
                          className="h-10 rounded-lg pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                          onClick={() => setShowSignUpPassword((value) => !value)}
                          aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                        >
                          {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Button type="submit" className="h-10 w-full rounded-lg" disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Create Account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your account email. If it exists, we will send a password reset link.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordResetRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
                className="h-10 rounded-lg"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-lg" onClick={() => setForgotPasswordOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-lg" disabled={isResetRequestLoading}>
                {isResetRequestLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send Reset Link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
