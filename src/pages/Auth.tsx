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
import { Building2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
        <Card className="w-full max-w-md shadow-xl border-border/50">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">FLC-HRMS</CardTitle>
              <CardDescription>Fook Loi Group HR Management System</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isRecoveryMode ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4">
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
                    <Button type="submit" className="w-full" disabled={isUpdatingRecoveryPassword}>
                      {isUpdatingRecoveryPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
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
                          className="pr-10"
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
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Sign In
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" name="firstName" placeholder="John" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" name="lastName" placeholder="Doe" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" name="email" type="email" placeholder="you@company.com" required />
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
                          className="pr-10"
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
                    <Button type="submit" className="w-full" disabled={isLoading}>
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

      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent>
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
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setForgotPasswordOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isResetRequestLoading}>
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
