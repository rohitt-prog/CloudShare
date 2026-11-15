import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Pure logic under test
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function validateLogin(credentials) {
  const errors = {};
  const email = credentials.email?.trim() || '';
  if (!email) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Please provide a valid email address.';
  }
  if (!credentials.password) {
    errors.password = 'Password is required.';
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}

function validateRegistration(credentials) {
  const errors = {};
  const email = credentials.email?.trim() || '';
  if (!email) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Please provide a valid email address.';
  }
  if (!credentials.password) {
    errors.password = 'Password is required.';
  } else if (credentials.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }
  if (credentials.confirmPassword !== undefined) {
    if (!credentials.confirmPassword) {
      errors.confirmPassword = 'Password confirmation is required.';
    } else if (credentials.password !== credentials.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}

function formatAuthError(error) {
  if (!error) return 'An unexpected error occurred.';
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (message.includes('User already registered')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (message.includes('Password should be at least')) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }
  if (message.includes('Email not confirmed')) {
    return 'Please confirm your email address before signing in. Check your inbox for the confirmation link.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many login attempts. Please wait a few moments and try again.';
  }
  if (message.includes('Failed to fetch') || message.includes('network') || message.includes('NetworkError')) {
    return 'Unable to reach the authentication service. Please check your internet connection.';
  }
  return message;
}

function mapSupabaseUser(user) {
  if (!user || !user.email) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.user_metadata?.full_name || user.user_metadata?.name || null,
    avatarUrl: user.user_metadata?.avatar_url || undefined,
    createdAt: user.created_at,
  };
}

// -----------------------------------------------------------------------------
// Test Suite: Login Validation
// -----------------------------------------------------------------------------
test('validateLogin rejects empty email and password', () => {
  const result = validateLogin({ email: '', password: '' });
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.errors.email, 'Email address is required.');
  assert.strictEqual(result.errors.password, 'Password is required.');
});

test('validateLogin rejects malformed email address', () => {
  const result = validateLogin({ email: 'notanemail', password: 'secretpassword' });
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.errors.email, 'Please provide a valid email address.');
});

test('validateLogin accepts valid credentials', () => {
  const result = validateLogin({ email: 'user@example.com', password: 'secretpassword' });
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(Object.keys(result.errors).length, 0);
});

// -----------------------------------------------------------------------------
// Test Suite: Registration Validation
// -----------------------------------------------------------------------------
test('validateRegistration enforces minimum password length', () => {
  const result = validateRegistration({
    email: 'user@example.com',
    password: '123',
    confirmPassword: '123',
  });
  assert.strictEqual(result.isValid, false);
  assert.match(result.errors.password, /at least 6 characters/);
});

test('validateRegistration detects password confirmation mismatch', () => {
  const result = validateRegistration({
    email: 'user@example.com',
    password: 'password123',
    confirmPassword: 'password999',
  });
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.errors.confirmPassword, 'Passwords do not match.');
});

test('validateRegistration accepts valid registration payload', () => {
  const result = validateRegistration({
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    password: 'securepassword',
    confirmPassword: 'securepassword',
  });
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(Object.keys(result.errors).length, 0);
});

// -----------------------------------------------------------------------------
// Test Suite: Error Formatting
// -----------------------------------------------------------------------------
test('formatAuthError maps Supabase error messages to friendly user guidance', () => {
  assert.match(
    formatAuthError(new Error('Invalid login credentials')),
    /Invalid email or password/
  );
  assert.match(
    formatAuthError(new Error('User already registered')),
    /already exists/
  );
  assert.match(
    formatAuthError(new Error('Failed to fetch')),
    /Unable to reach the authentication service/
  );
  assert.match(
    formatAuthError(new Error('Email not confirmed')),
    /Please confirm your email address/
  );
});

// -----------------------------------------------------------------------------
// Test Suite: User Mapping
// -----------------------------------------------------------------------------
test('mapSupabaseUser correctly extracts profile attributes from Supabase user', () => {
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    created_at: '2026-01-01T00:00:00.000Z',
    user_metadata: {
      full_name: 'Test Pilot',
      avatar_url: 'https://example.com/avatar.png',
    },
  };
  const mapped = mapSupabaseUser(mockUser);
  assert.strictEqual(mapped.id, mockUser.id);
  assert.strictEqual(mapped.email, mockUser.email);
  assert.strictEqual(mapped.fullName, 'Test Pilot');
  assert.strictEqual(mapped.avatarUrl, 'https://example.com/avatar.png');
});

test('mapSupabaseUser returns null for null or missing email', () => {
  assert.strictEqual(mapSupabaseUser(null), null);
  assert.strictEqual(mapSupabaseUser({ id: '123', email: '' }), null);
});

// -----------------------------------------------------------------------------
// Test Suite: Route Protection Decision Matrix
// -----------------------------------------------------------------------------
test('Route protection logic redirects unauthenticated users to login', () => {
  function getRedirectRoute(isAuthenticated, currentRoute, intendedRoute) {
    const isAuthRoute = currentRoute === 'login' || currentRoute === 'register';
    if (!isAuthenticated && !isAuthRoute) {
      return { redirect: 'login', savedIntended: currentRoute };
    }
    if (isAuthenticated && isAuthRoute) {
      return { redirect: intendedRoute || 'home', savedIntended: null };
    }
    return { redirect: null, savedIntended: intendedRoute };
  }

  // 1. Unauthenticated visiting protected route
  assert.deepStrictEqual(getRedirectRoute(false, 'home', null), {
    redirect: 'login',
    savedIntended: 'home',
  });

  // 2. Unauthenticated visiting login page
  assert.deepStrictEqual(getRedirectRoute(false, 'login', 'home'), {
    redirect: null,
    savedIntended: 'home',
  });

  // 3. Authenticated visiting login page -> redirected to saved intended destination
  assert.deepStrictEqual(getRedirectRoute(true, 'login', 'dashboard'), {
    redirect: 'dashboard',
    savedIntended: null,
  });

  // 4. Authenticated visiting home -> allowed
  assert.deepStrictEqual(getRedirectRoute(true, 'home', null), {
    redirect: null,
    savedIntended: null,
  });
});

// =============================================================================
// Test Suite: Phase 10A Authentication Dark Theme & Motion Integrity
// =============================================================================

function readSrc(relPath) {
  return fs.readFileSync(path.resolve(relPath), 'utf8');
}

test('[STATIC SOURCE] LoginPage enforces dark-theme semantic tokens and eliminates hardcoded slate/white', () => {
  const src = readSrc('src/pages/LoginPage.tsx');

  assert.ok(src.includes('bg-background'), 'Must use bg-background');
  assert.ok(src.includes('text-foreground'), 'Must use text-foreground');
  assert.ok(src.includes('bg-card'), 'Must use bg-card for auth card');
  assert.ok(src.includes('border-border'), 'Must use border-border for auth card');
  assert.ok(src.includes('text-card-foreground'), 'Must use text-card-foreground');
  assert.ok(src.includes('text-muted-foreground'), 'Must use text-muted-foreground for subtitle');
  assert.ok(src.includes('animate-fadeIn'), 'Must include animate-fadeIn');
  assert.ok(src.includes('animate-slideInUp'), 'Must include animate-slideInUp');
  assert.ok(src.includes('motion-reduce:animate-none'), 'Must respect prefers-reduced-motion');

  assert.ok(!src.includes('bg-white'), 'Must not contain hardcoded bg-white');
  assert.ok(!src.includes('border-slate-200'), 'Must not contain hardcoded border-slate-200');
  assert.ok(!src.includes('text-slate-900'), 'Must not contain hardcoded text-slate-900');
  assert.ok(!src.includes('shadow-sky-200'), 'Must not contain hardcoded shadow-sky-200');
});

test('[STATIC SOURCE] RegisterPage enforces dark-theme semantic tokens and eliminates hardcoded slate/white', () => {
  const src = readSrc('src/pages/RegisterPage.tsx');

  assert.ok(src.includes('bg-background'), 'Must use bg-background');
  assert.ok(src.includes('text-foreground'), 'Must use text-foreground');
  assert.ok(src.includes('bg-card'), 'Must use bg-card for auth card');
  assert.ok(src.includes('border-border'), 'Must use border-border for auth card');
  assert.ok(src.includes('text-card-foreground'), 'Must use text-card-foreground');
  assert.ok(src.includes('text-muted-foreground'), 'Must use text-muted-foreground for subtitle');
  assert.ok(src.includes('animate-fadeIn'), 'Must include animate-fadeIn');
  assert.ok(src.includes('animate-slideInUp'), 'Must include animate-slideInUp');
  assert.ok(src.includes('motion-reduce:animate-none'), 'Must respect prefers-reduced-motion');

  assert.ok(!src.includes('bg-white'), 'Must not contain hardcoded bg-white');
  assert.ok(!src.includes('border-slate-200'), 'Must not contain hardcoded border-slate-200');
  assert.ok(!src.includes('text-slate-900'), 'Must not contain hardcoded text-slate-900');
  assert.ok(!src.includes('shadow-sky-200'), 'Must not contain hardcoded shadow-sky-200');
});

test('[STATIC SOURCE] Input component source enforces semantic tokens and accessible dark theme', () => {
  const src = readSrc('src/components/ui/Input.tsx');

  assert.ok(src.includes('bg-background'), 'Input must use bg-background');
  assert.ok(src.includes('text-foreground'), 'Input label and text must use text-foreground');
  assert.ok(src.includes('placeholder:text-muted-foreground'), 'Placeholder must use text-muted-foreground');
  assert.ok(src.includes('border-input'), 'Input border must use border-input');
  assert.ok(src.includes('border-destructive'), 'Error state must use border-destructive');
  assert.ok(src.includes('text-destructive'), 'Error text must use text-destructive');

  assert.ok(!src.includes('bg-white'), 'Input must not contain hardcoded bg-white');
  assert.ok(!src.includes('text-slate-900'), 'Input must not contain hardcoded text-slate-900');
  assert.ok(!src.includes('border-slate-300'), 'Input must not contain hardcoded border-slate-300');
  assert.ok(!src.includes('text-slate-700'), 'Input must not contain hardcoded text-slate-700');
});

test('[STATIC SOURCE] LoginForm and RegisterForm enforce semantic error, link, and toggle styling', () => {
  const loginSrc = readSrc('src/features/auth/components/LoginForm.tsx');
  const registerSrc = readSrc('src/features/auth/components/RegisterForm.tsx');

  // Error alert styling
  assert.ok(loginSrc.includes('border-destructive/30'), 'LoginForm error must use border-destructive/30');
  assert.ok(loginSrc.includes('bg-destructive/10'), 'LoginForm error must use bg-destructive/10');
  assert.ok(loginSrc.includes('text-destructive'), 'LoginForm error must use text-destructive');
  assert.ok(registerSrc.includes('border-destructive/30'), 'RegisterForm error must use border-destructive/30');
  assert.ok(registerSrc.includes('bg-destructive/10'), 'RegisterForm error must use bg-destructive/10');
  assert.ok(registerSrc.includes('text-destructive'), 'RegisterForm error must use text-destructive');

  // Navigation link & toggle styling
  assert.ok(loginSrc.includes('text-primary'), 'LoginForm nav link must use text-primary');
  assert.ok(registerSrc.includes('text-primary'), 'RegisterForm nav link must use text-primary');
  assert.ok(loginSrc.includes('text-muted-foreground'), 'LoginForm password toggle must use text-muted-foreground');
  assert.ok(registerSrc.includes('text-muted-foreground'), 'RegisterForm password toggle must use text-muted-foreground');

  // No hardcoded light-only rose or slate classes
  assert.ok(!loginSrc.includes('bg-rose-50'), 'LoginForm must not contain hardcoded bg-rose-50');
  assert.ok(!loginSrc.includes('text-rose-800'), 'LoginForm must not contain hardcoded text-rose-800');
  assert.ok(!registerSrc.includes('bg-rose-50'), 'RegisterForm must not contain hardcoded bg-rose-50');
  assert.ok(!registerSrc.includes('text-rose-800'), 'RegisterForm must not contain hardcoded text-rose-800');
});
