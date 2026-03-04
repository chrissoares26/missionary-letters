# Authentication Pages Design
**Story:** 1.4 - Authentication Pages
**Date:** 2026-03-04
**Status:** Approved

## Overview

Implement complete authentication flow with Supabase Auth including login, registration, password reset, route guards, session management, and onboarding checks. Remove dev auth helper and transition to production-ready authentication.

## Design Decisions

### User Management
- **Open registration** - Anyone can create an account
- **Per-user data isolation** - RLS policies already support multi-user via `auth.uid()`
- **Email verification** - Disabled for MVP (auto-login after signup)
- **Session expiry** - 30 days (personal productivity app pattern)

### Onboarding Flow
- New users must import 10-30 historical emails for style training
- Check `style_emails` count after authentication
- If count < 10: redirect to `/style-library` with empty state
- If count >= 10: allow full app access
- Users can revisit `/style-library` anytime

### Route Protection
- **Public routes:** `/login`, `/register`, `/reset-password`
- **Protected routes:** All other routes
- **Already authenticated:** Redirect to dashboard or onboarding based on style email count

### Password Reset
- "Forgot password?" link on login page
- Email with magic link (Supabase `resetPasswordForEmail`)
- Redirect to `/reset-password?token=...` for password update
- Custom SMTP already configured in Supabase

### Error Handling
- **Inline validation:** Form field errors below inputs
- **Toast notifications:** Auth errors (wrong password, network issues)
- **Portuguese (pt-BR):** All UI text and error messages

## Architecture

### 1. Auth Composable (`src/composables/useAuth.ts`)

**State:**
```typescript
const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)
const isAuthenticated = computed(() => !!session.value)
```

**Methods:**
- `signUp(email, password)` - Create account, auto-login
- `signIn(email, password)` - Login with credentials
- `signOut()` - Clear session, redirect to `/login`
- `resetPassword(email)` - Send password reset email
- `updatePassword(newPassword)` - Update password from reset token
- `checkOnboarding()` - Query style_emails count, return boolean

**Initialization:**
- `supabase.auth.getSession()` on mount to restore session
- `onAuthStateChange()` subscription for real-time updates across tabs
- Set `loading = false` once session loaded

### 2. Route Guards (`src/router/index.ts`)

**Navigation Guard:**
```typescript
router.beforeEach(async (to, from, next) => {
  const { isAuthenticated, loading, checkOnboarding } = useAuth()

  // Wait for auth initialization
  if (loading.value) await until(() => !loading.value)

  const publicRoutes = ['/login', '/register', '/reset-password']
  const isPublicRoute = publicRoutes.includes(to.path)

  // Not authenticated → redirect to login
  if (!isAuthenticated.value && !isPublicRoute) {
    return next('/login')
  }

  // Authenticated on auth page → redirect to app
  if (isAuthenticated.value && isPublicRoute) {
    const needsOnboarding = await checkOnboarding()
    return next(needsOnboarding ? '/style-library' : '/')
  }

  // Check onboarding only after login/register
  if (isAuthenticated.value && (from.path === '/login' || from.path === '/register')) {
    const needsOnboarding = await checkOnboarding()
    if (needsOnboarding && to.path !== '/style-library') {
      return next('/style-library')
    }
  }

  next()
})
```

**Onboarding Check:**
- Query: `SELECT COUNT(*) FROM style_emails WHERE owner_id = auth.uid()`
- Cache result in composable to avoid repeated queries
- Clear cache on sign-out
- Return `true` if count < 10

### 3. Authentication Pages

#### Login Page (`src/pages/login.vue`)

**Layout:**
- Centered card, mobile-first
- App logo/title
- Email input (required, email validation)
- Password input (required, show/hide toggle)
- "Esqueci minha senha" link → `/reset-password`
- "Entrar" button (primary)
- "Não tem uma conta? Cadastre-se" → `/register`

**Validation:**
- Email: required, valid format
- Password: required, min 6 characters
- Client-side validation before submit

**Error Handling:**
- Inline field errors
- Toast for auth errors (wrong credentials, network issues)

#### Register Page (`src/pages/register.vue`)

**Layout:**
- Similar to login
- Email input
- Password input (min 8 chars, strength indicator)
- Confirm password input (must match)
- "Criar Conta" button
- "Já tem uma conta? Entrar" → `/login`

**Validation:**
- Email: required, valid format
- Password: required, min 8 chars
- Confirm password: must match password
- Check "User already registered" error from Supabase

**Post-Registration:**
- Auto-login after successful registration
- Route guard handles onboarding redirect

#### Reset Password Page (`src/pages/reset-password.vue`)

**Mode A - Request Reset (no token):**
- Email input
- "Enviar Link de Redefinição" button
- Success: "Verifique seu e-mail para instruções"

**Mode B - Update Password (token in URL):**
- New password input
- Confirm password input
- "Atualizar Senha" button
- Success → redirect to `/login` with success toast

**Token Handling:**
- Check URL params for `token` on mount
- Invalid/expired token → error message
- Supabase automatically validates token

### 4. UI Components

#### `src/components/ui/FormInput.vue`
- Props: `modelValue`, `type`, `label`, `error`, `placeholder`, `required`
- Emits: `update:modelValue`
- Shows error message below input
- Accessible: label association, aria-invalid

#### `src/components/ui/FormButton.vue`
- Props: `loading`, `disabled`, `variant`
- Spinner when loading
- Disabled state styling

#### `src/components/ui/Toast.vue`
- Props: `message`, `type` (success/error/info)
- Auto-dismiss after 5 seconds
- Position: top-center
- Icon based on type

### 5. Error Handling

**Error Mapping (`src/utils/authErrors.ts`):**
```typescript
const authErrorMessages: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha inválidos',
  'User already registered': 'Este e-mail já está cadastrado',
  'Email not confirmed': 'Por favor, confirme seu e-mail',
  'Password should be at least 8 characters': 'A senha deve ter pelo menos 8 caracteres',
  // Network errors
  'Failed to fetch': 'Erro de conexão - tente novamente',
}

export function getAuthErrorMessage(error: AuthError): string {
  return authErrorMessages[error.message] || 'Erro ao autenticar - tente novamente'
}
```

**Field Validation (pt-BR):**
- "E-mail é obrigatório"
- "Formato de e-mail inválido"
- "Senha é obrigatória"
- "A senha deve ter pelo menos 8 caracteres"
- "As senhas não coincidem"

### 6. Dev Auth Cleanup

**Remove:**
1. Delete `src/utils/dev-auth.ts`
2. Remove lines 10-13 in `src/main.ts`:
   ```typescript
   if (import.meta.env.DEV) {
     import('./utils/dev-auth')
   }
   ```
3. Update session docs to remove `window.devAuth` references

**Testing Workflow:**
- Use real `/register` to create test accounts
- Use real `/login` for authentication
- Optional: seed test user in Supabase for local dev

## Implementation Tasks

### Phase 1: Auth Foundation
1. Create `src/composables/useAuth.ts` with all auth methods
2. Add route guards to `src/router/index.ts`
3. Implement `checkOnboarding()` with style_emails query

### Phase 2: UI Components
4. Create `src/components/ui/FormInput.vue`
5. Create `src/components/ui/FormButton.vue`
6. Create `src/components/ui/Toast.vue` (or integrate existing toast system)

### Phase 3: Pages
7. Create `src/pages/login.vue` with form and validation
8. Create `src/pages/register.vue` with form and validation
9. Create `src/pages/reset-password.vue` with dual modes

### Phase 4: Error Handling
10. Create `src/utils/authErrors.ts` with error mapping
11. Add toast integration to auth pages
12. Test all error scenarios

### Phase 5: Cleanup
13. Delete `src/utils/dev-auth.ts`
14. Remove dev-auth import from `src/main.ts`
15. Update router to add public routes (`/login`, `/register`, `/reset-password`)

### Phase 6: Testing
16. Browser test: register → onboarding → logout → login
17. Test: access protected route when logged out
18. Test: password reset flow
19. Test: session persistence across reloads
20. Test: multi-tab behavior

## Testing Checklist

### Auth Flow
- [ ] Register new user → auto-login → redirect to onboarding
- [ ] Login with valid credentials → redirect based on onboarding status
- [ ] Login with invalid credentials → error toast
- [ ] Logout → clear session → redirect to login
- [ ] Access protected route while logged out → redirect to login
- [ ] Access `/login` while logged in → redirect to dashboard or onboarding

### Onboarding
- [ ] New user with 0 style emails → forced to `/style-library`
- [ ] User with <10 style emails → still in onboarding
- [ ] User with >=10 style emails → full app access
- [ ] User can manually visit `/style-library` after onboarding

### Password Reset
- [ ] Request reset → email sent confirmation
- [ ] Click email link → opens `/reset-password` with token
- [ ] Update password → success → redirect to login
- [ ] Invalid/expired token → error message

### Browser Testing
- [ ] Use `agent-browser` for end-to-end flows
- [ ] Check console for errors
- [ ] Verify session persistence across page reloads
- [ ] Test multi-tab session sync

## Edge Cases

1. **User deletes all style emails** → next login forces onboarding again
2. **Token expired during reset** → clear error message
3. **Network error during login** → retry with toast message
4. **User navigates to `/style-library` manually** → allowed even after onboarding
5. **Multiple tabs open** → session sync via `onAuthStateChange`

## Documentation Updates

- Update `documentation/implementation_plan.md`:
  - Mark Story 1.4 as complete
  - Add onboarding redirect behavior to Epic 1 notes
- Update session file (`.claude/sessions/2026-03-04-epic-3-missionaries-crud.md`):
  - Remove `window.devAuth` references
  - Document new auth flow

## Success Criteria

- ✅ User can register with email/password
- ✅ User can sign in and session persists on reload (30 days)
- ✅ Protected routes redirect to login when unauthenticated
- ✅ Authenticated users redirect to dashboard or onboarding based on style email count
- ✅ Password reset flow works end-to-end
- ✅ Dev auth helper removed from production build
- ✅ All error messages in pt-BR
- ✅ No console errors during auth flows
- ✅ Multi-tab session sync works

## Security Considerations

- Supabase handles password hashing (bcrypt)
- RLS policies enforce owner_id = auth.uid() on all tables
- Session tokens stored in localStorage (Supabase default)
- HTTPS enforced for production
- CSRF protection via Supabase client
- No sensitive data in client-side code
- Password reset tokens expire after 1 hour (Supabase default)
