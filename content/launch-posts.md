# StatPilot Launch Posts

Ready-to-post copy for all channels. Generated: 2026-02-18.

---

## Show HN

**Title (63 chars):** Show HN: StatPilot – See all your GA4 properties on one dashboard

**Body:**

I manage around a dozen websites. Some are client projects, some are side projects, some are just things I launched and forgot about. Google Analytics 4 has no multi-property overview. You pick one property from a dropdown and that is it. Checking all your sites means switching tabs and trying to remember numbers.

I built StatPilot to fix this for myself and figured others have the same problem.

How it works: you sign in with Google OAuth. The app calls the GA4 Management API, discovers every property your account has access to, and renders the dashboard. No per-site configuration. No connection steps. If you add a new site to GA4, it shows up automatically on your next visit.

The stack: Vue 3 + TypeScript on the frontend, Netlify Functions on the backend, GA4 REST Data API (deliberately no gRPC SDK — keeping the Netlify deploy bundle under the 50MB limit). LocalStorage cache with a 6-hour TTL so repeat visits are instant. Hand-rolled SVG sparklines, no chart library dependency.

Dashboard shows sessions, users, pageviews, bounce rate, and a trend sparkline per property. 7-day / 30-day / 90-day date range switcher. Sortable table view for when you have a lot of properties.

Pricing: free for 3 properties, $19/month for 15, $49/month for unlimited.

Live at: https://statpilot.mom

Looking for beta testers, particularly anyone managing 10+ properties. Happy to add any metrics you need. What would make this actually useful for your workflow?

---

## Reddit r/webdev

**Title:** I got tired of tab-switching in GA4 so I built a multi-property dashboard that auto-discovers your properties via OAuth

**Body:**

The problem: GA4 has no "all properties" overview. If you manage 10+ websites you are constantly switching between properties and losing context.

[screenshot: dashboard showing 12 GA4 properties side by side with sessions, users, pageviews, bounce rate, and sparkline trends]

I built StatPilot. Sign in with Google, it calls the GA4 Management API, discovers all your properties automatically, and renders the dashboard. Zero per-site setup.

The interesting technical bit: I avoided the gRPC SDK entirely and hit the GA4 REST Data API directly. The gRPC approach would have ballooned the Netlify Functions bundle past the 50MB limit. REST + google-auth-library keeps things lean. Reports for all properties are batched in groups of 10 so you are not firing 15 sequential requests.

Stack: Vue 3 + TypeScript, Vite 7, Tailwind CSS 4, Netlify Functions (.mts), GA4 REST API. LocalStorage cache with 6h TTL — subsequent visits load instantly without an API call.

Free for 3 properties. $19/month for 15. $49/month for unlimited.

https://statpilot.mom

Happy to answer questions about the GA4 API side — there are some non-obvious quirks with the service account auth flow worth documenting.

---

## Reddit r/SideProject

**Title:** I built the GA4 dashboard I always wanted: sign in with Google, see all your properties instantly, no setup

**Body:**

I was tired of it. Every morning I open GA4 to check my sites and spend five minutes just navigating between properties. Click dropdown, select site, check numbers, click dropdown again. GA4 has been out for years and Google has never added a portfolio view.

So I built one. StatPilot. You click "Sign in with Google," it discovers all your GA4 properties automatically using the Management API, and shows them all on one dark-mode dashboard. Sessions, users, pageviews, bounce rate, sparkline trends. Took me about two weeks of evenings to get to something I was actually happy with.

The thing I am most proud of is the zero-setup experience. Every other multi-property tool I tried required connecting each property manually. When you have 15 sites that gets old fast. With StatPilot if you add a new site to GA4 it just appears on your dashboard the next time you load it.

It is live now. Free for up to 3 properties, $19/month after that.

https://statpilot.mom

Would genuinely love feedback from anyone else managing a portfolio of sites. What metrics are you checking every day that are not on here?

---

## IndieHackers "I Built This"

**Title:** I built StatPilot — a GA4 dashboard for people managing multiple websites — because GA4's tab-switching was killing my morning routine

**Body:**

I manage around 12 websites. Some are client projects. Some are my own products. A few are things I launched and have mostly forgotten about but still want to keep an eye on.

Every morning I would open Google Analytics, pick the first site from the dropdown, note the numbers, switch to the next site, try to remember the previous numbers, switch again. GA4 has been the default analytics product for a few years now and it still has no portfolio view. You cannot see all your properties at once. That is a deliberate choice by Google — roll-up properties exist but they are a GA4 360 feature at $50,000/year.

So about three weeks ago I started building StatPilot.

The core idea is ruthless simplicity. You sign in with Google OAuth. The app calls the GA4 Management API and discovers every property your Google account has access to. No manual connection per property. No configuration. You go from "I just clicked sign in" to "I can see all 12 of my sites" in a few seconds.

The dashboard shows sessions, users, pageviews, and bounce rate for each property, with a sparkline trend so you can tell at a glance if something is moving in the right direction. 7-day, 30-day, and 90-day date ranges. A sortable table view for when you have a lot of properties and want to rank them.

I built it on Vue 3, Netlify Functions, and the GA4 REST API (deliberately not the gRPC SDK, which would have blown past Netlify's 50MB function bundle limit). No chart library — hand-rolled SVG sparklines. No database — LocalStorage with a 6-hour TTL so repeat visits are instant.

**Current status:** Live and working. I have been using it myself for about two weeks. It is the first thing I open in the morning.

**Pricing:** Free for 3 properties. $19/month for up to 15. $49/month for unlimited. Honestly not sure if those are the right numbers — I would rather underprice and talk to early users than optimize prematurely.

**What I am not sure about:** Whether the dashboard-first approach is right, or if people actually want email digests. Whether the sparklines are sufficient or if people want more detailed charts. Whether $19/month is too high or too low for the target audience.

If you manage multiple websites and have five minutes, I would genuinely appreciate your feedback on what is missing or what could be better.

https://statpilot.mom

---

## Twitter/X Thread

**Tweet 1 (Hook):**
GA4 has no multi-property overview.

If you run 10 websites, you switch between 10 tabs. Every single morning.

I fixed this. Thread.
<!-- 134 chars -->

---

**Tweet 2 (Solution):**
StatPilot: sign in with Google, see all your GA4 properties on one dashboard.

[screenshot: dashboard with 12 properties]

Sessions. Users. Pageviews. Bounce rate. Sparkline trends. All sites, one screen.

statpilot.mom
<!-- 222 chars -->

---

**Tweet 3 (Zero-setup angle):**
The thing that makes it different: zero setup per site.

Every other multi-property dashboard I tried required connecting each property manually. 10 sites = 10 setup flows.

StatPilot auto-discovers your properties via Google OAuth. Add a new site to GA4 and it appears automatically.
<!-- 280 chars -->

---

**Tweet 4 (Pricing comparison):**
The pricing landscape for GA4 multi-property dashboards:

AgencyAnalytics: $59/mo for 5 sites
Databox: $159/mo for 3 data sources
DashThis: $49/mo for 3 dashboards
AnalyticsPortfolio: $49/mo for 40 sites

StatPilot:
- Free: 3 properties
- $19/mo: 15 properties
- $49/mo: unlimited
<!-- 280 chars -->

---

**Tweet 5 (Technical decision):**
A few technical choices I made building this:

- No gRPC SDK. Pure REST to the GA4 Data API. Keeps the Netlify Functions bundle under 50MB.
- No chart library. Hand-rolled SVG sparklines.
- No database. LocalStorage with a 6h TTL. Repeat visits load instantly.

Vue 3 + TypeScript + Vite 7.
<!-- 279 chars -->

---

**Tweet 6 (Ask):**
Looking for beta testers, specifically people managing 5+ websites.

What metrics do you check every day that are not on here?

What would make you actually open this instead of GA4?

DM me or drop a comment.
<!-- 206 chars -->

---

**Tweet 7 (Link):**
StatPilot is live now.

Free for up to 3 properties. No credit card. Just sign in with Google.

If you run multiple websites, it takes about 10 seconds to see if this is useful for you.

statpilot.mom
<!-- 219 chars -->
