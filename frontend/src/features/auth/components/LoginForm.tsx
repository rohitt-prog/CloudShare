import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { validateLogin } from '@/features/auth/services/auth.service';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export interface LoginFormProps {
  onNavigateToRegister?: () => void;
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onNavigateToRegister, onSuccess }) => {
  const { signIn, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    clearError();
    const validation = validateLogin({ email, password });
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const result = await signIn({ email, password });
      if (result.success) {
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {authError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-fadeIn motion-reduce:animate-none"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
          <span className="leading-relaxed">{authError}</span>
        </div>
      )}

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
        placeholder="••••••••"
        autoComplete="current-password"
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
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95 transition-all duration-150 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
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
            <span>Signing in...</span>
          </span>
        ) : (
          'Sign in'
        )}
      </Button>

      {onNavigateToRegister && (
        <p className="text-center text-xs text-muted-foreground pt-2">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="font-semibold text-primary hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1 transition-colors"
          >
            Create an account
          </button>
        </p>
      )}
    </form>
  );
};
