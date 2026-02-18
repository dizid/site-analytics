# Replace Password Auth with Google Sign-In

## Context

The dashboard is deployed to `statpilot.mom` but the password auth returns 500 because env vars aren't set in Netlify dashboard yet. Instead of fixing the password approach, we're replacing it with Google Sign-In for multi-user support.

**Current:** Shared password → `x-dashboard-password` header → constant-time compare
**New:** Google Sign-In button → ID token → `Authorization: Bearer <token>` → server-side JWT verification against email allowlist

No new npm dependencies — `google-auth-library` (already installed) has `OAuth2Client.verifyIdToken()`.

## Manual Pre-step: Create OAuth Client ID

In GCP project `fluid-b6251`:
1. APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID
2. Type: Web application, Name: `Site Analytics Dashboard`
3. Authorized JavaScript origins: `http://localhost:5173`, `http://localhost:5176`, `https://statpilot.mom`
4. Copy the Client ID

## File Changes

| File | Action | What |
|------|--------|------|
| `.env` + `.env.example` | Modify | Remove `DASHBOARD_PASSWORD`, add `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID`, `ALLOWED_EMAILS` |
| `index.html` | Modify | Add GIS `<script src="https://accounts.google.com/gsi/client">` |
| `src/env.d.ts` | Create | TypeScript declarations for `ImportMetaEnv` + `google.accounts.id` types |
| `src/types/analytics.ts` | Modify | Add `GoogleUser` interface |
| `netlify/functions/lib/auth.ts` | Rewrite | Replace `constantTimeCompare` + password `validateAuth` with `verifyGoogleToken()` using `OAuth2Client.verifyIdToken()`. Keep `getAccessToken()` unchanged. `validateAuth` becomes **async** |
| `netlify/functions/auth.mts` | Rewrite | Accept `POST { idToken }`, verify token, check email allowlist, return `{ success, user }` |
| `netlify/functions/analytics.mts` | Modify | `validateAuth(request)` → `await validateAuth(request)` (one word) |
| `netlify/functions/properties.mts` | Modify | Same `await` addition |
| `src/lib/api.ts` | Rewrite | `x-dashboard-password` → `Authorization: Bearer <token>`. `login()` → `verifyToken()` |
| `src/composables/useAuth.ts` | Rewrite | `login(password)` → `handleGoogleSignIn(idToken)`. Expose `user` ref. Session restore from sessionStorage |
| `src/components/GoogleSignIn.vue` | Create | Glass card with GIS `renderButton()`. Replaces PasswordGate |
| `src/components/PasswordGate.vue` | Delete | Replaced by GoogleSignIn.vue |
| `src/components/DashboardHeader.vue` | Modify | Add `user` prop, show avatar + email + logout |
| `src/App.vue` | Modify | Import GoogleSignIn, pass `user` to header |

## Implementation Order

1. **GCP**: Create OAuth Client ID (manual)
2. **Env vars**: Update `.env` and `.env.example`
3. **Types**: Create `src/env.d.ts`, add `GoogleUser` to `analytics.ts`
4. **Backend**: Rewrite `lib/auth.ts` → `auth.mts` → add `await` in `analytics.mts` + `properties.mts`
5. **Frontend API**: Rewrite `api.ts` (Bearer token)
6. **Auth composable**: Rewrite `useAuth.ts` (Google Sign-In flow)
7. **Components**: Create `GoogleSignIn.vue`, delete `PasswordGate.vue`, update `DashboardHeader.vue` + `App.vue`
8. **HTML**: Add GIS script to `index.html`
9. **Test**: `npm run dev`, verify full sign-in flow

## Key Design Decisions

- **Traditional GIS button** (not One Tap) — predictable, no FedCM issues
- **`VITE_GOOGLE_CLIENT_ID`** exposes client ID to frontend build (client IDs are public by design)
- **`ALLOWED_EMAILS`** env var — comma-separated email allowlist. Empty = allow all Google accounts
- **Token expiration** — existing 401 handler in `apiFetch` already clears session + reloads → user sees sign-in button again
- **sessionStorage** — per-tab, more secure than localStorage. New tab = re-sign-in
- **`verifyToken` POST to `/api/auth`** — server-side verification before trusting the frontend credential

## Env Vars (New)

```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
ALLOWED_EMAILS=glaswerk@gmail.com
GA_CLIENT_EMAIL=analytics-dashboard@fluid-b6251.iam.gserviceaccount.com
GA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GA_PROPERTY_IDS=properties/151000761,...
GA_PROPERTY_NAMES=FUN33,...
```

## Verification

1. `npm run dev` starts without errors
2. Google Sign-In button renders in glass card
3. Clicking it opens Google account picker
4. After sign-in, server verifies token + email is in allowlist
5. Dashboard loads with user avatar + email in header
6. All 17 properties show metrics
7. Logout clears session + revokes Google session
8. Unauthorized email gets "not authorized" error message
