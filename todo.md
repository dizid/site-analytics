# TODO

## GCP Project Separation

GCP project `fluid-b6251` is shared between:
- **statpilot.mom** (this dashboard) — uses Google OAuth
- **fluid33.netlify.app** — also uses Google Sign-In (0 users currently)

**Problem:** OAuth consent screen branding (app name, privacy policy URL, logo) is per-project, not per-client. Both apps show the same branding during Google sign-in.

**Action:** Before fluid33 gets real users, either:
1. Create a separate GCP project for one of the apps, or
2. Use generic branding that works for both (e.g. "Dizid Apps" instead of "Site Analytics Dashboard")
