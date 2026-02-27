import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'PASSWORD_EXPIRED'
  | 'ACCOUNT_DISABLED'
  | 'TOO_MANY_ATTEMPTS'
  | 'NETWORK_ERROR';

export interface LoginFormPayload {
  identifier: string;
  password: string;
}

export interface LoginFormSubmitResult {
  error: Error | null;
}

interface LoginFormErrorModel {
  code: AuthErrorCode;
  message: string;
  fieldTargets: Array<'identifier' | 'password'>;
}

export interface LoginFormProps {
  onSubmit: (payload: LoginFormPayload) => Promise<LoginFormSubmitResult>;
  onForgotPassword?: () => void;
  disabled?: boolean;
}

function toLowerMessage(error: unknown) {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === 'string') return error.toLowerCase();
  return '';
}

function mapAuthError(error: Error): LoginFormErrorModel {
  const message = toLowerMessage(error);

  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('unable to reach') ||
    message.includes('failed to fetch')
  ) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Unable to reach authentication service.',
      fieldTargets: [],
    };
  }

  if (message.includes('too many') || message.includes('rate limit') || message.includes('too frequent')) {
    return {
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Too many sign-in attempts. Please wait and try again.',
      fieldTargets: [],
    };
  }

  if (message.includes('locked')) {
    return {
      code: 'ACCOUNT_LOCKED',
      message: 'Your account is temporarily locked. Please contact HR/Admin.',
      fieldTargets: [],
    };
  }

  if (message.includes('expired')) {
    return {
      code: 'PASSWORD_EXPIRED',
      message: 'Your password has expired. Reset your password to continue.',
      fieldTargets: ['password'],
    };
  }

  if (message.includes('inactive') || message.includes('disabled') || message.includes('terminated')) {
    return {
      code: 'ACCOUNT_DISABLED',
      message: 'Your account is disabled. Please contact HR/Admin.',
      fieldTargets: [],
    };
  }

  return {
    code: 'INVALID_CREDENTIALS',
    message: 'Unable to sign in with provided credentials.',
    fieldTargets: ['identifier', 'password'],
  };
}

export function LoginForm({ onSubmit, onForgotPassword, disabled = false }: LoginFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [errorModel, setErrorModel] = useState<LoginFormErrorModel | null>(null);

  const isDisabled = disabled || isSubmitting;

  const clearError = () => {
    if (errorModel) setErrorModel(null);
  };

  const fieldErrorSet = useMemo(() => new Set(errorModel?.fieldTargets ?? []), [errorModel]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDisabled) return;

    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier || !password) {
      setErrorModel({
        code: 'INVALID_CREDENTIALS',
        message: 'Email, username/employee ID, and password are required.',
        fieldTargets: [
          ...(!normalizedIdentifier ? (['identifier'] as const) : []),
          ...(!password ? (['password'] as const) : []),
        ],
      });
      return;
    }

    setIsSubmitting(true);
    setErrorModel(null);

    try {
      const result = await onSubmit({
        identifier: normalizedIdentifier,
        password,
      });

      if (result.error) {
        setErrorModel(mapAuthError(result.error));
      }
    } catch (error) {
      const networkError =
        error instanceof Error
          ? error
          : new Error('Unable to reach authentication service.');
      setErrorModel(mapAuthError(networkError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordKeyEvent = (event: KeyboardEvent<HTMLInputElement>) => {
    const capsLock = event.getModifierState?.('CapsLock') ?? false;
    setCapsLockOn(capsLock);

    if (event.key === 'Enter' && !isDisabled) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const identifierHintId = 'signin-identifier-hint';
  const identifierErrorId = 'signin-identifier-error';
  const passwordHintId = 'signin-password-hint';
  const passwordCapsId = 'signin-password-caps';
  const passwordErrorId = 'signin-password-error';
  const formErrorId = 'signin-form-error';

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {errorModel ? (
        <div
          id={formErrorId}
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-3 text-sm text-destructive"
        >
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4" aria-hidden="true" />
            <div>
              <p className="font-medium">Sign-in error</p>
              <p>{errorModel.message}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2.5">
        <Label htmlFor="signin-identifier">Email, Username, or Employee ID</Label>
        <Input
          id="signin-identifier"
          name="identifier"
          type="text"
          value={identifier}
          onChange={(event) => {
            setIdentifier(event.target.value);
            clearError();
          }}
          placeholder="you@company.com, username, or EMP-001"
          autoComplete="username"
          required
          aria-invalid={fieldErrorSet.has('identifier')}
          aria-describedby={cn(
            identifierHintId,
            fieldErrorSet.has('identifier') && identifierErrorId,
            errorModel && !fieldErrorSet.size && formErrorId,
          )}
          className={cn('h-11 rounded-xl', fieldErrorSet.has('identifier') && 'border-destructive/70 focus-visible:ring-destructive')}
        />
        <p id={identifierHintId} className="text-xs text-muted-foreground">
          Use your account email, username alias, or employee ID.
        </p>
        {fieldErrorSet.has('identifier') ? (
          <p id={identifierErrorId} className="text-xs text-destructive">Check your sign-in identifier.</p>
        ) : null}
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Password</Label>
          <Button
            type="button"
            variant="link"
            className="h-auto px-0 text-xs font-semibold"
            onClick={onForgotPassword}
          >
            Forgot password?
          </Button>
        </div>

        <div className="relative">
          <Input
            id="signin-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearError();
            }}
            onKeyDown={handlePasswordKeyEvent}
            onKeyUp={handlePasswordKeyEvent}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            aria-invalid={fieldErrorSet.has('password')}
            aria-describedby={cn(
              passwordHintId,
              capsLockOn && passwordCapsId,
              fieldErrorSet.has('password') && passwordErrorId,
              errorModel && !fieldErrorSet.size && formErrorId,
            )}
            className={cn('h-11 rounded-xl pr-11', fieldErrorSet.has('password') && 'border-destructive/70 focus-visible:ring-destructive')}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>

        <p id={passwordHintId} className="text-xs text-muted-foreground">
          Passwords are case sensitive.
        </p>
        {capsLockOn ? (
          <p id={passwordCapsId} className="text-xs text-warning">
            Caps Lock is on.
          </p>
        ) : null}
        {fieldErrorSet.has('password') ? (
          <p id={passwordErrorId} className="text-xs text-destructive">Check your password.</p>
        ) : null}
      </div>

      <Button type="submit" className="h-11 w-full rounded-xl" disabled={isDisabled}>
        <Loader2 className={cn('mr-2 h-4 w-4', isSubmitting ? 'animate-spin opacity-100' : 'opacity-0')} aria-hidden="true" />
        {isSubmitting ? 'Signing in…' : 'Sign In'}
      </Button>

      <p className="pt-1 text-center text-[11px] text-muted-foreground">
        All access is logged and monitored.
      </p>
    </form>
  );
}

export { mapAuthError };
