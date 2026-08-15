# TODO

## GCP Project Separation

Updated 2026-08-15: the original project `fluid-b6251` was permanently deleted by Google
(see `dev.md` → "OAuth client incident"). statpilot.mom now runs on GCP project
`statpilot-mom-ga4` instead, using an OAuth client ("StatPilot Web") shared with other
Dizid apps — at least `googlesearchconsole.netlify.app` plus a couple of local dev
redirect URIs (`localhost:5173`/`5174` at `/api/auth-callback`, from some other project).

**Problem still applies:** OAuth consent screen branding (app name, privacy policy URL,
logo) is per-project, not per-client. Every app sharing this client shows the same
"StatPilot" branding during Google sign-in — confusing for users of the other apps.

**Action:** either:
1. Create a separate GCP project + OAuth client for one of the apps, or
2. Use generic branding that works for all of them (e.g. "Dizid Apps" instead of "StatPilot")
