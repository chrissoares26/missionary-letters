# Epic 3: Missionaries Management (CRUD)

**Date:** 2026-03-04
**Status:** COMPLETE ✅
**Agent:** Claude Sonnet 4.5

## Overview

Implementing complete missionary lifecycle management for campaign targeting. This includes list view with filters, create/edit forms, and active state management rules.

## Goals

1. Enable users to view, filter, and sort missionaries
2. Provide forms for creating and editing missionary records
3. Implement active/inactive state logic based on mission end dates
4. Ensure all CRUD operations respect RLS policies

## Dependencies

- ✅ Epic 2: Supabase Data Layer complete
- ✅ Database migrations applied
- ✅ Seed data loaded

## Implementation Tasks

### 1. API Layer (`src/api/missionaries.ts`)
- [x] `getMissionaries()` - fetch all missionaries for current user
- [x] `getMissionaryById(id)` - fetch single missionary
- [x] `createMissionary(data)` - create new missionary
- [x] `updateMissionary(id, data)` - update existing missionary
- [x] `deleteMissionary(id)` - soft delete (set active = false)

### 2. Query Layer (`src/queries/missionaries.ts`)
- [x] `useMissionariesQuery()` - cached query with filters
- [x] `useMissionaryQuery(id)` - single missionary query
- [x] `useCreateMissionary()` - mutation for create
- [x] `useUpdateMissionary()` - mutation for update
- [x] `useDeleteMissionary()` - mutation for delete

### 3. UI Components
- [x] `MissionaryTable.vue` - list with filters (active/inactive toggle, search)
- [x] `MissionaryForm.vue` - create/edit form with validation
- [x] `MissionaryCard.vue` (optional) - card view for mobile (skipped - table handles mobile)

### 4. Page
- [x] `/missionaries` route implementation
- [x] Integration with components
- [x] State management for modal/drawer

### 5. Business Logic
- [x] Active state derivation rules
- [x] Mission end date validation
- [x] Email validation
- [x] Title validation (Elder/Sister)

### 6. Testing
- [x] Browser testing with agent-browser
- [x] Verify CRUD operations
- [x] Test filters and search
- [x] Test form validation

## Technical Notes

- Use Pinia Colada for data fetching/caching
- Follow RLS patterns (all queries scoped to `auth.uid()`)
- Default language: pt-BR
- Mobile-first design
- Use TailwindCSS v4 for styling

## Exit Criteria

- ✅ User can view list of missionaries with active/inactive filter
- ✅ User can create new missionary with all required fields
- ✅ User can edit existing missionary
- ✅ User can deactivate missionary (manual override)
- ✅ Active state reflects mission end date logic
- ✅ All CRUD operations tested in browser

## Status: COMPLETE ✅

**Completed:** 2026-03-04

## Next Steps

**Story 1.4: Authentication Pages** - ✅ COMPLETE

Implementation completed (2026-03-04):
- ✅ Created `useAuth` composable with full auth methods
- ✅ Added route guards with onboarding redirect logic
- ✅ Created UI components: `FormInput`, `FormButton`, `Toast`
- ✅ Created `/login` page with email/password authentication
- ✅ Created `/register` page with password strength indicator
- ✅ Created `/reset-password` page with dual modes (request/update)
- ✅ Added error handling utilities with pt-BR messages
- ✅ Removed dev auth helper from main.ts
- ✅ Updated router to use modern Vue Router 4 pattern (return values vs next())

**Browser Testing Results:**
- ✅ Login page renders with all fields and validation
- ✅ Register page renders with password strength indicator
- ✅ Route guards redirect unauthenticated users to /login
- ✅ Password visibility toggles working
- ✅ Form validation working client-side
- ⚠️ Supabase auth requires configuration (email confirmation needs to be disabled for MVP)
- ⚠️ Test user needs to be created in Supabase dashboard for E2E testing

**Files Created:**
- `src/composables/useAuth.ts` - Auth state and methods
- `src/composables/useToast.ts` - Toast notification manager
- `src/components/ui/FormInput.vue` - Reusable form input with validation
- `src/components/ui/FormButton.vue` - Button with loading state
- `src/components/ui/Toast.vue` - Toast notification component
- `src/pages/login.vue` - Login page
- `src/pages/register.vue` - Registration page
- `src/pages/reset-password.vue` - Password reset page
- `src/utils/authErrors.ts` - Error message mappingFiles Modified:**
- `src/router/index.ts` - Added route guards and auth routes
- `src/App.vue` - Added toast container
- `src/main.ts` - Removed dev auth helper

**Files Deleted:**
- `src/utils/dev-auth.ts` - Dev auth helper removed

**Supabase Configuration Needed:**
1. Disable email confirmation in Supabase Auth settings for MVP
2. Create test user in Supabase dashboard for testing
3. Optional: Configure custom SMTP for password reset emails

Then proceed to **Epic 4: Style Library and RAG Preparation**

---

### Update - 2026-03-04 (~3:30 PM)

**Summary**: Epic 3 complete - Full missionaries CRUD implementation with filters, forms, and design system integration

**Git Changes**:
- Modified:
  - `.claude/sessions/.current-session`
  - `documentation/implementation_plan.md` (marked Epics 2-3 complete, added Story 1.4 for auth)
  - `src/main.ts` (added dev auth helper import)
  - `src/pages/missionaries.vue` (complete page implementation)
  - `src/styles/tokens.css` (added Tailwind v4 theme)
- Added:
  - `.claude/sessions/2026-03-03-1430-epic-2-data-layer.md`
  - `.claude/sessions/2026-03-04-epic-3-missionaries-crud.md`
  - `documentation/missionary_auto_deactivation_spec.md`
  - `src/api/missionaries.ts` (CRUD API layer)
  - `src/queries/missionaries.ts` (Pinia Colada queries)
  - `src/types/database.ts` (database types)
  - `src/types/missionary.ts` (form types)
  - `src/components/features/missionaries/MissionaryTable.vue`
  - `src/components/features/missionaries/MissionaryForm.vue`
  - `src/utils/dev-auth.ts` (temporary dev helper)
  - `supabase/` (migrations, seed data, functions)
- Current branch: main (commit: e7b62fe)

**Todo Progress**: 8/8 completed ✅
- ✓ Create session file for Epic 3
- ✓ Implement missionaries API layer
- ✓ Create missionaries query composables
- ✓ Build MissionaryTable component with list/filters
- ✓ Build MissionaryForm component for create/edit
- ✓ Implement missionaries page (/missionaries route)
- ✓ Add active state business logic and validation
- ✓ Test missionary CRUD with browser agent

**Key Achievements**:
1. **Database Layer (Epic 2)**:
   - Created all 8 tables via Supabase MCP
   - Applied RLS policies on all tables
   - Created seed data (10 missionaries, 3 campaigns)
   - Documented auto-deactivation specification

2. **Missionaries CRUD (Epic 3)**:
   - Complete API layer with filters and soft delete
   - Pinia Colada integration for caching
   - MissionaryTable: search, filters, status badges
   - MissionaryForm: validation, Elder/Sister toggle
   - Modal workflow with mobile-first design
   - Active state derivation from mission end dates
   - Visual warning for missions ending within 30 days
   - All UI in Brazilian Portuguese (pt-BR)

3. **Design System**:
   - Tailwind v4 theme configuration
   - Design system colors (linen, stone, ink, forest, sunrise, etc.)
   - Typography tokens and spacing scale

**Issues Resolved**:
- Fixed TypeScript errors in query status checks (pending vs loading)
- Added dev auth helper for testing (to be removed in Story 1.4)
- Configured Tailwind v4 theme for design system colors

**Next Actions**:
- Complete Story 1.4: Authentication Pages (login/register)
- Remove dev auth helper
- Add route guards
- Then proceed to Epic 4: Style Library and RAG Preparation

---

## Session End Summary

**Session Duration:** ~2-3 hours (2026-03-04, afternoon)
**Final Status:** ✅ **COMPLETE** - Story 1.4: Authentication Pages

### Git Summary

**Total Changes:**
- **Modified Files:** 6
- **Added Files:** 23+ (new directories and files)
- **Deleted Files:** 1 (`src/utils/dev-auth.ts`)
- **Commits Made:** 0 (changes staged but not committed)

**Modified Files:**
1. `.claude/sessions/.current-session` - Session tracking
2. `documentation/implementation_plan.md` - Marked Story 1.4 complete
3. `src/App.vue` - Added toast container
4. `src/pages/missionaries.vue` - (from previous session)
5. `src/router/index.ts` - Added auth routes and route guards
6. `src/styles/tokens.css` - (from previous session)

**New Directories:**
- `docs/plans/` - Authentication design document
- `src/api/` - API layer (missionaries.ts)
- `src/components/ui/` - Reusable UI components (FormInput, FormButton, Toast)
- `src/components/features/` - Feature-specific components (missionaries)
- `src/composables/` - Vue composables (useAuth, useToast)
- `src/pages/` - Auth pages (login, register, reset-password)
- `src/queries/` - Pinia Colada queries (missionaries.ts)
- `src/types/` - TypeScript types (database, missionary)
- `src/utils/` - Utilities (authErrors.ts)
- `supabase/` - Database migrations and seed data

**New Files (23 total):**

Auth System:
- `src/composables/useAuth.ts` - Authentication composable
- `src/composables/useToast.ts` - Toast notification manager
- `src/components/ui/FormInput.vue` - Form input with validation
- `src/components/ui/FormButton.vue` - Button with loading state
- `src/components/ui/Toast.vue` - Toast notification component
- `src/pages/login.vue` - Login page
- `src/pages/register.vue` - Registration page with password strength
- `src/pages/reset-password.vue` - Password reset (dual mode)
- `src/utils/authErrors.ts` - Error message mapping (pt-BR)

Missionaries CRUD (from previous session):
- `src/api/missionaries.ts` - CRUD API layer
- `src/queries/missionaries.ts` - Pinia Colada queries
- `src/types/database.ts` - Database types
- `src/types/missionary.ts` - Form types
- `src/components/features/missionaries/MissionaryTable.vue`
- `src/components/features/missionaries/MissionaryForm.vue`

Documentation:
- `docs/plans/2026-03-04-authentication-pages-design.md` - Auth design spec
- `documentation/missionary_auto_deactivation_spec.md` - Business logic spec
- `.claude/sessions/2026-03-03-1430-epic-2-data-layer.md` - Epic 2 session
- `.claude/sessions/2026-03-04-epic-3-missionaries-crud.md` - This session

**Deleted Files:**
- `src/utils/dev-auth.ts` - Dev auth helper (no longer needed)

**Final Git Status:**
```
Modified: 6 files
Untracked: 23+ new files
Ready for commit: All changes staged
```

### Todo Summary

**Total Tasks:** 11
**Completed:** 11/11 ✅
**Remaining:** 0

**Completed Tasks:**
1. ✅ Create useAuth composable with auth methods and state
2. ✅ Add route guards to router with onboarding checks
3. ✅ Create FormInput.vue UI component
4. ✅ Create FormButton.vue UI component
5. ✅ Create Toast.vue UI component
6. ✅ Create authErrors.ts utility with error mapping
7. ✅ Create login.vue page with form and validation
8. ✅ Create register.vue page with form and validation
9. ✅ Create reset-password.vue page with dual modes
10. ✅ Delete dev-auth.ts and remove from main.ts
11. ✅ Browser test authentication flows end-to-end

### Key Accomplishments

#### Story 1.4: Authentication Pages - COMPLETE ✅

**Authentication Infrastructure:**
- Built complete auth system with Supabase Auth
- Implemented `useAuth` composable with all auth methods:
  - `signUp()` - Create account with auto-login
  - `signIn()` - Login with email/password
  - `signOut()` - Clear session and redirect
  - `resetPassword()` - Send password reset email
  - `updatePassword()` - Update password from reset token
  - `checkOnboarding()` - Check style_emails count for onboarding
- Session state management with auto-initialization
- Onboarding cache to avoid repeated queries

**Route Guards:**
- Modern Vue Router 4 pattern (return values, not `next()` callback)
- Redirects unauthenticated users to `/login`
- Redirects authenticated users from auth pages to dashboard or onboarding
- Checks `style_emails` count: < 10 = onboarding required → `/style-library`
- Waits for auth initialization before running guards

**UI Components (pt-BR):**
- `FormInput.vue` - Reusable input with:
  - Email/password/text types
  - Password visibility toggle
  - Error display
  - Accessibility (aria-invalid, aria-describedby)
- `FormButton.vue` - Button with:
  - Loading spinner
  - Disabled states
  - Primary/secondary/danger variants
- `Toast.vue` - Notifications with:
  - Success/error/info types
  - Auto-dismiss (5 seconds)
  - Close button
  - Smooth animations

**Authentication Pages:**
- `/login` - Email/password with:
  - Client-side validation
  - "Esqueci minha senha" link
  - "Cadastre-se" registration link
  - Auto-redirect after successful login
- `/register` - Registration with:
  - Password strength indicator (Fraca/Média/Forte)
  - Password confirmation
  - Visual strength bars
  - Auto-redirect after signup
- `/reset-password` - Dual mode:
  - Mode A: Request reset (email input)
  - Mode B: Update password (with token from email)
  - Success/error states
  - Redirect to login after update

**Error Handling:**
- Portuguese error messages throughout
- Supabase error mapping to user-friendly pt-BR
- Field validation errors (email format, password length, matching passwords)
- Toast notifications for auth errors

**Cleanup:**
- Removed `src/utils/dev-auth.ts` and import from `main.ts`
- Updated router to remove deprecated `next()` callback pattern
- Fixed Vue Router warnings

### Features Implemented

1. **Complete Authentication Flow**
   - User registration with email/password
   - User login with session persistence (30 days)
   - Password reset via email
   - Auto-redirect based on authentication state
   - Onboarding redirect for new users (<10 style emails)

2. **Session Management**
   - Auto-initialization on app load
   - `onAuthStateChange` subscription for real-time updates
   - Session persistence across page reloads
   - Multi-tab session sync

3. **Security Features**
   - RLS policies (all tables scoped to `auth.uid()`)
   - Password hashing (Supabase bcrypt)
   - Session tokens in localStorage
   - Protected routes with guards

4. **User Experience**
   - All UI in Brazilian Portuguese (pt-BR)
   - Mobile-first design
   - Password strength indicator
   - Real-time validation
   - Loading states
   - Error feedback via toasts

### Problems Encountered and Solutions

#### Problem 1: Supabase Email Confirmation Blocking Registration
**Issue:** Registration returned 500 error when trying to send confirmation email to `@chrissoares.dev` domain.

**Root Cause:** 
- Supabase uses Resend for emails
- Resend requires domain verification
- `chrissoares.dev` not verified in Resend

**Solution:**
- Disabled email confirmation in Supabase Auth settings (MVP approach)
- Switched to built-in email service (no custom SMTP needed)
- Users now auto-confirmed on registration

**Alternative Solutions Documented:**
- Add domain to Resend and verify DNS
- Use `@example.com` emails (works fine)
- Manually confirm users via SQL: `UPDATE auth.users SET email_confirmed_at = NOW()`

#### Problem 2: Route Guards Using Deprecated `next()` Callback
**Issue:** Vue Router warnings about deprecated `next()` callback pattern.

**Solution:**
- Refactored route guard to use modern Vue Router 4 pattern
- Return redirect path directly instead of calling `next(path)`
- Return `true` to allow navigation
- Fixed TypeScript unused variable warning

#### Problem 3: No Auto-Redirect After Login/Registration
**Issue:** After successful login/registration, page stayed on auth form instead of redirecting.

**Root Cause:** Route guard wasn't triggered by Supabase auth state change.

**Solution:**
- Added `router.push('/')` after successful `signIn()`/`signUp()`
- Route guard then handles redirection to onboarding or dashboard
- Ensures immediate user feedback

#### Problem 4: Auth State Initialization Timing
**Issue:** Route guard running before auth state loaded, causing flicker.

**Solution:**
- Added polling mechanism in route guard to wait for `loading.value` to become false
- Polls every 50ms until auth initialization complete
- Prevents premature redirects

### Breaking Changes

None - All changes are additive or improvements.

### Dependencies

**No new dependencies added** - used existing packages:
- `@supabase/supabase-js` (already installed)
- Vue 3, Vue Router, Pinia (already installed)

### Configuration Changes

#### Supabase Auth Settings (Manual)
1. **Email Confirmation:** Disabled (Supabase Dashboard → Authentication → Providers → Email)
2. **Custom SMTP:** Disabled (using built-in email service)
3. **Session Duration:** 30 days (default)

#### Environment Variables
No changes - already configured:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_BEARER_TOKEN`

### Testing Performed

#### Browser Testing with `agent-browser`
1. ✅ Registration flow:
   - Created `newuser@example.com` successfully
   - Email auto-confirmed
   - User logged in automatically
   - Redirected to `/style-library` (onboarding)

2. ✅ Login flow:
   - Logged in with `newuser@example.com`
   - Session persisted
   - Redirected to onboarding

3. ✅ Route guards:
   - Unauthenticated → `/login` redirect works
   - Authenticated on `/login` → auto-redirect to `/style-library`
   - Protected routes accessible when authenticated

4. ✅ UI components:
   - Password visibility toggles working
   - Password strength indicator showing "Forte"
   - Form validation working
   - No console errors

### What Wasn't Completed

**All planned features completed!** 🎉

**Future Enhancements (out of MVP scope):**
- Email verification flow (if re-enabled)
- Social OAuth providers (Google, GitHub)
- Multi-factor authentication
- Password strength requirements enforcement
- Rate limiting on login attempts
- Account deletion flow
- Profile picture upload

### Deployment Steps Taken

**None** - Changes are ready for commit but not deployed.

**Next Deployment Steps:**
1. Review all changes: `git diff`
2. Stage changes: `git add .`
3. Commit: `git commit -m "feat: implement Story 1.4 authentication pages with Supabase Auth"`
4. Push to remote (if applicable)
5. Deploy frontend to production
6. Verify Supabase Auth settings in production dashboard

### Lessons Learned

1. **Supabase Email Configuration:**
   - Always disable email confirmation for MVP unless you have verified domain
   - Resend domain verification required for production email sending
   - `@example.com` emails work fine for testing

2. **Vue Router 4 Best Practices:**
   - Use return values instead of `next()` callback (modern pattern)
   - Return `true` to allow navigation, path string to redirect
   - Always wait for async operations in route guards

3. **Auth State Management:**
   - Auto-initialize auth on module load, not in component
   - Use `onAuthStateChange` for real-time session updates
   - Poll for auth initialization completion to avoid race conditions

4. **Password UX:**
   - Visual strength indicator greatly improves user experience
   - Show/hide password toggle is essential for mobile
   - Real-time validation prevents submission errors

5. **Error Handling:**
   - Always map technical errors to user-friendly messages
   - Use toast notifications for auth errors (not inline)
   - Provide clear next steps in error messages

### Tips for Future Developers

1. **Testing Authentication:**
   - Use `@example.com` emails for testing (no domain verification needed)
   - Create test users via Supabase Dashboard with "Auto Confirm User" checked
   - Clear localStorage to test unauthenticated state: `localStorage.clear()`

2. **Debugging Route Guards:**
   - Check auth state: `const { isAuthenticated, loading } = useAuth()`
   - Verify onboarding status: `checkOnboarding()`
   - Console log route guard decisions for debugging

3. **Customizing Auth Flow:**
   - Edit `src/composables/useAuth.ts` for auth methods
   - Edit `src/router/index.ts` for route protection logic
   - Edit `src/utils/authErrors.ts` for error messages

4. **Adding New Auth Pages:**
   - Follow pattern in `login.vue`, `register.vue`
   - Add route to `src/router/index.ts` public routes array
   - Use `FormInput`, `FormButton`, `Toast` components
   - Handle errors with `getAuthErrorMessage(error)`

5. **Supabase Auth Configuration:**
   - Dashboard: https://supabase.com/dashboard
   - Project: `hdovikqxamkfkzyitrrn`
   - Settings: Authentication → Providers → Email
   - Users: Authentication → Users (view/manage users)

6. **Common Issues:**
   - **"Invalid login credentials"**: Check password, ensure user exists and is confirmed
   - **500 on registration**: Check Supabase Auth logs, likely email sending issue
   - **No redirect after login**: Check browser console, verify `router.push('/')` called
   - **Infinite redirect loop**: Check route guard logic, ensure `loading` state resolves

### Next Steps

**Immediate (Commit Changes):**
1. Review all new files and changes
2. Commit authentication system to git
3. Update implementation plan if needed

**Next Epic: Epic 4 - Style Library and RAG Preparation**

Story 4.1: Style Email Ingestion Workflow
- Design `/style-library` page UI
- Implement email upload/import functionality
- Add embedding generation trigger (Supabase Edge Function)
- Validate 10-30 email requirement for onboarding
- Update onboarding check to allow access once threshold met

**Required Before Production:**
1. Configure Resend domain verification (for `@chrissoares.dev` emails)
2. Re-enable email confirmation if desired
3. Add rate limiting to auth endpoints
4. Set up monitoring for auth failures
5. Review RLS policies with security team
6. Test auth flow on staging environment

---

**Session Completed:** 2026-03-04 ~3:00 PM
**Status:** ✅ All Story 1.4 acceptance criteria met
**Ready for:** Epic 4 implementation

