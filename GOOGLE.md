# Get Google OAuth Verified (Exit Testing Mode)

## Context

StatPilot's OAuth consent screen is in **External, Testing mode** (GCP project `statpilot-mom-ga4`, project number `329396622222` — migrated here 2026-08-15 after the original `fluid-b6251` project was permanently deleted; see `CLAUDE.md` → GCP Setup). This limits sign-in to manually added test users (max 100). To let any Google user sign in and see their own GA4 data, the app needs to pass Google's OAuth verification review.

Note: the OAuth client in this project is **shared with other Dizid apps** (googlesearchconsole.netlify.app, local dev tools). Publishing/verifying it affects all of them, not just StatPilot — worth confirming the shared branding (app name, logo, privacy/terms links) still makes sense for every app using this client before submitting for verification.

**No auth migration needed.** The current system (custom Google OAuth + JWT + Netlify Blobs) is already the simplest correct solution for this use case. Firebase can't provide the `analytics.readonly` scope or refresh tokens needed for GA4 API access.

## What You Already Have

- [x] Privacy policy at `https://statpilot.mom/privacy` — comprehensive, GDPR-aware, mentions Google API Services User Data Policy
- [x] Terms of service at `https://statpilot.mom/terms` — includes Limited Use compliance (Section 5)
- [x] Production domain with HTTPS: `statpilot.mom`
- [x] Landing page explaining what the app does
- [x] Read-only data access only (`analytics.readonly`)
- [x] No data sharing with third parties
- [x] User can revoke access via Google Account
- [x] Proper CSRF protection (httpOnly state cookie)

## What Google Requires for Sensitive Scope Verification

The `analytics.readonly` scope is classified as **sensitive** (not restricted), so:
- No third-party security assessment (CASA) needed
- Google's internal team reviews your submission
- Typical review time: **3–6 weeks**

## Step-by-Step Verification Process

### Step 1: Verify Domain Ownership

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property → `statpilot.mom`
3. Verify via DNS TXT record (recommended):
   - Add a TXT record to `statpilot.mom` with the value Google provides
   - Wait for propagation (minutes to hours)
4. Once verified, go to GCP Console → **APIs & Services → OAuth consent screen**
5. Under "Authorized domains", add `statpilot.mom`

### Step 2: Complete OAuth Consent Screen Fields

GCP Console → APIs & Services → OAuth consent screen → Edit:

| Field | Value |
|-------|-------|
| App name | StatPilot |
| User support email | hello@dizid.com |
| App logo | Upload StatPilot logo (square, < 1MB) |
| Application home page | `https://statpilot.mom` |
| Privacy policy link | `https://statpilot.mom/privacy` |
| Terms of service link | `https://statpilot.mom/terms` |
| Authorized domains | `statpilot.mom` |
| Developer contact email | hello@dizid.com |

### Step 3: Record YouTube Demo Video

Google requires an **unlisted** YouTube video showing the OAuth flow. Record 1–3 minutes showing:

1. Open `https://statpilot.mom` in a browser
2. Click "Sign in with Google"
3. Google consent screen appears — show the scopes being requested
4. Grant consent
5. Dashboard loads with the user's GA4 properties and data
6. Show the user avatar/menu → click Logout
7. Briefly navigate to `/privacy` to show the policy is accessible

Upload as **unlisted** on YouTube. Copy the URL for the submission form.

### Step 4: Write Scope Justifications

Google asks why each scope is needed. Use these:

| Scope | Justification |
|-------|---------------|
| `openid` | Required to identify the authenticated user and establish a session. |
| `email` | Used to display the user's email in the dashboard header and to enforce an optional email allowlist for access control. |
| `profile` | Used to display the user's name and profile picture in the dashboard header. |
| `analytics.readonly` | StatPilot is a read-only GA4 analytics dashboard. This scope is used to auto-discover the user's GA4 properties and fetch their metrics (sessions, pageviews, bounce rate, traffic sources) to display in a unified dashboard. No data is modified, shared with third parties, or used for advertising. |

### Step 5: Submit for Verification

1. GCP Console → OAuth consent screen → click **"Publish App"**
2. Fill in the verification form:
   - Paste the YouTube video URL
   - Enter scope justifications from Step 4
   - Confirm compliance with Google API Services User Data Policy
3. Submit

### Step 6: Respond to Google Follow-ups

Google may ask clarification questions. Common ones:
- "How is user data stored?" → Point to Privacy Policy Section 4 (server-side Netlify Blobs, encrypted at rest)
- "Do you share data with third parties?" → No, explained in Privacy Policy Section 6
- "How can users delete their data?" → Logout deletes server-side tokens; users can also revoke via Google Account

## No Code Changes Required

Your app already meets all Google's technical requirements. The privacy policy, terms, and landing page are comprehensive. The only actions are in the GCP Console and recording the demo video.

## After Approval

Once verified:
1. The "This app isn't verified" warning disappears for all users
2. Any Google user can sign in (still subject to `ALLOWED_EMAILS` if set)
3. You can remove the test users list from GCP Console
4. If you later add new sensitive/restricted scopes, you'll need re-verification
