import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { validateRegistration } from '@/features/auth/services/auth.service';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export interface RegisterFormProps {
  onNavigateToLogin?: () => void;
  onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onNavigateToLogin, onSuccess }) => {
  const { signUp, error: authError, clearError } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    clearError();
    setConfirmationNotice(null);

    const validation = validateRegistration({
      email,
      password,
      confirmPassword,
      fullName,
    });

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const result = await signUp({
        email,
        password,
        confirmPassword,
        fullName,
      });

      if (result.success) {
        if (result.requiresEmailConfirmation) {
          setConfirmationNotice(
            `Account created! A confirmation email has been sent to ${email}. Please check your inbox to activate your account.`
          );
        } else {
          onSuccess?.();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmationNotice) {
    return (
      <div className="space-y-4 py-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Check your email</h4>
              <p className="text-xs text-emerald-700 leading-relaxed">
                {confirmationNotice}
              </p>
            </div>
          </div>
        </div>

        {onNavigateToLogin && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onNavigateToLogin}
          >
            Return to Sign in
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {authError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <span className="leading-relaxed">{authError}</span>
        </div>
      )}

      <Input
        type="text"
        label="Full name (optional)"
        name="fullName"
        placeholder="Jane Doe"
        autoComplete="name"
        value={fullName}
        disabled={isSubmitting}
        onChange={(e) => setFullName(e.target.value)}
      />

      <Input
        type="email"
        label="Email address"
        name="email"
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        error={fieldErrors.email}
        disabled={isSubmitting}
        onChange={(e) => {
          setEmail(e.target.value);
          if (fieldErrors.email) {
            setFieldErrors((prev) => ({ ...prev, email: '' }));
          }
        }}
      />

      <Input
        type={showPassword ? 'text' : 'password'}
        label="Password"
        name="password"
        placeholder="At least 6 characters"
        autoComplete="new-password"
        value={password}
        error={fieldErrors.password}
        disabled={isSubmitting}
        onChange={(e) => {
          setPassword(e.target.value);
          if (fieldErrors.password) {
            setFieldErrors((prev) => ({ ...prev, password: '' }));
          }
        }}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-slate-400 hover:text-slate-600 focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />

      <Input
        type={showPassword ? 'text' : 'password'}
        label="Confirm password"
        name="confirmPassword"
        placeholder="Re-enter your password"
        autoComplete="new-password"
        value={confirmPassword}
        error={fieldErrors.confirmPassword}
        disabled={isSubmitting}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          if (fieldErrors.confirmPassword) {
            setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
          }
        }}
      />

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full mt-2"
        size="md"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Creating account...</span>
          </span>
        ) : (
          'Create account'
        )}
      </Button>

      {onNavigateToLogin && (
        <p className="text-center text-xs text-slate-500 pt-2">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="font-semibold text-sky-600 hover:text-sky-700 hover:underline focus:outline-none"
          >
            Sign in
          </button>
        </p>
      )}
    </form>
  );
};
