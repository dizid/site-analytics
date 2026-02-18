# StatPilot — Pricing Page Copy

Production-ready copy for the pricing page. Tone: direct, founder-to-founder, no fluff.

---

## Page Header

**Headline:** Simple pricing. No per-property fees.

**Subheadline:** One flat rate gets you everything. Pick the tier that fits how many sites you manage.

---

## Annual Toggle Copy

**Monthly / Annual toggle label:**
- Left: Monthly
- Right: Annual (Save 20%)

**Annual nudge text (shown below toggle when monthly is selected):**
Switch to annual and save 20%. Billed once per year, cancel anytime.

---

## Pricing Tiers

### Solo — Free

**Price:** $0 / forever

**Tagline:** For developers who manage a few sites and want a clean way to see them all.

**Description:**
You have three sites — maybe a SaaS project, a side hustle, and a portfolio. You don't want to open three GA4 tabs every morning. Solo is for you.

Connect your Google account and StatPilot auto-discovers your properties. Sessions, users, pageviews, bounce rate, and trend lines — all on one dark-mode dashboard. No setup, no tagging, no configuration.

Three properties. Full features. No credit card required.

**What's included:**
- Up to 3 GA4 properties
- Sessions, users, pageviews, bounce rate
- 7-day, 30-day, and 90-day date ranges
- Sparkline trend charts
- Card view and table view
- Traffic source breakdown
- 6-hour data cache
- Google SSO — no separate login

**Limitation to know:** When you add a fourth property to your GA4 account, it won't appear on the dashboard until you upgrade. No existing data is deleted.

**CTA:** Start free — no card needed

---

### Builder — $19 / month

**Annual price:** $15.20 / month, billed $182/year — save $45.60

**Tagline:** For indie hackers and developers running a real portfolio of sites.

**Description:**
You've got sites you launched, sites for clients, experiments, and a few that actually make money. Keeping tabs on all of them in GA4 is a daily chore.

Builder gives you up to 15 properties on the same dashboard — same zero-setup, same clean dark UI. You open one tab in the morning and you know where everything stands.

The upgrade from Solo isn't about features. It's about capacity. You get everything Solo has, for up to 15 properties instead of 3.

**What's included:**
- Up to 15 GA4 properties
- Everything in Solo
- Priority support (response within 24 hours)
- Early access to new features

**Who upgrades to Builder:** Developers who've shipped more than a few projects and want one dashboard that covers them all. Freelancers tracking their own sites alongside a handful of client properties. Bootstrappers with multiple revenue streams.

**CTA:** Start Builder

---

### Studio — $49 / month

**Annual price:** $39.20 / month, billed $470/year — save $118

**Tagline:** For agencies and power users managing 15+ properties without a ceiling.

**Description:**
You manage a lot of sites. Maybe you're a one-person agency with a roster of clients, or a developer who's shipped a dozen products. Fifteen properties isn't enough, and you don't want to think about hitting a limit.

Studio is unlimited. Connect every GA4 property your Google account can see — StatPilot shows them all.

You also get a denser table view optimized for large property counts, priority support with faster turnaround, and access to features I build specifically for high-volume users.

If you're questioning whether you need Studio, you probably don't yet. Builder is the right call until you're bumping against 15 properties regularly.

**What's included:**
- Unlimited GA4 properties
- Everything in Builder
- High-density table view optimized for 15+ properties
- Priority support (response within 12 hours)
- Input on the roadmap — I check in with Studio users before shipping major changes

**Who upgrades to Studio:** Agencies tracking client sites. Developers with an extensive project portfolio. Anyone who's looked at the Builder limit and thought "not enough."

**CTA:** Start Studio

---

## Annual Pricing Summary Table

| Tier | Monthly | Annual (per month) | Annual total | Savings |
|------|---------|-------------------|--------------|---------|
| Solo | Free | Free | Free | — |
| Builder | $19/mo | $15.20/mo | $182/yr | Save $45.60 |
| Studio | $49/mo | $39.20/mo | $470/yr | Save $118 |

**Annual callout copy (displayed on page):**

Builder annual: $182/year — that's $45.60 back in your pocket versus paying monthly.

Studio annual: $470/year — save $118 compared to month-to-month.

Pay once, forget it for a year. Both plans renew automatically. Cancel before renewal and you won't be charged again.

---

## FAQ

### What happens when I hit my property limit?

You'll see a notice on the dashboard saying you've reached your plan's limit. Existing properties keep showing up normally — nothing breaks, nothing disappears. Any properties over the limit simply won't appear until you upgrade.

You can upgrade in two clicks from the dashboard. Your data is never hidden or deleted.

---

### Can I change plans anytime?

Yes. Upgrade anytime and the new limit takes effect immediately. Downgrade at the end of your billing period — you keep the higher tier until the period ends.

If you're on annual billing and downgrade mid-year, I'll credit the unused months toward your next billing cycle. No fees for changing plans.

---

### What data does StatPilot access?

StatPilot uses Google OAuth with read-only Analytics access. Specifically, it requests the `analytics.readonly` scope — which means it can read your GA4 data but cannot modify anything, create events, or change your GA4 settings.

It also reads your Google account email to identify you. That's it. StatPilot does not access Google Drive, Gmail, Search Console, or any other Google product.

---

### Is my analytics data stored on your servers?

No. StatPilot fetches your data directly from the GA4 API and returns it to your browser. Nothing is stored in a database on my end.

Your dashboard does cache data in your browser's localStorage for 6 hours so repeat visits load instantly — but that data lives on your device, not my servers.

---

### Do I need to set up each property manually?

No. That's the main thing StatPilot does differently.

When you sign in with Google, StatPilot reads your GA4 account and discovers every property your account has access to. If you have Viewer permissions (or higher) on a GA4 property, it shows up automatically.

No property IDs to copy. No configuration screens. You sign in and your dashboard is ready.

---

### What happens if I cancel?

Your account drops to the free tier immediately (3 properties). You keep access to the dashboard — you just won't see properties beyond the first three.

Your Google connection stays active so you can upgrade again later without re-authenticating. No data is deleted.

If you're on annual billing and cancel before the year is up, you keep access through the end of your paid period. I don't offer prorated refunds on annual plans, but I'll work something out if your situation is unusual — just email me.

---

### Is there a free trial for paid plans?

The free tier is effectively a permanent trial. You get the full StatPilot experience — all features, all views — for up to 3 properties at no cost.

If you need more than 3 properties, there's no trial period for Builder or Studio. The pricing is low enough that the free tier should give you a clear enough sense of whether it's worth it.

If you upgrade and it's not right for you, email me within 14 days and I'll refund you. No questions.

---

### Does StatPilot work with Universal Analytics (UA)?

No. StatPilot works exclusively with GA4 properties. Universal Analytics was sunset by Google in July 2023, so if you're still on UA, you'll need to migrate to GA4 before StatPilot can show your data.

If you have a mix of GA4 and UA properties on your account, StatPilot will only display the GA4 ones.

---

### What about team or agency access?

Right now, StatPilot is single-user. You sign in with your Google account and see the properties that account can access.

For agencies: the cleanest setup is a shared Google account that has Viewer access to all client GA4 properties. One StatPilot login, all client properties visible.

Multi-user seat support is on the roadmap. If this is blocking you, email me — knowing how many people are waiting on it helps me prioritize it.

---

### How does billing work?

Billing is handled by Stripe. You enter your card details on Stripe's secure checkout page — StatPilot never sees your card number.

Monthly plans bill on the same date each month. Annual plans bill once per year on the anniversary of your upgrade.

You'll get an email receipt for every charge. You can cancel, update your card, or download invoices from the billing portal linked in your account settings.

---

## Comparison Table Copy

| Feature | Solo (Free) | Builder ($19/mo) | Studio ($49/mo) |
|---------|------------|-----------------|----------------|
| GA4 properties | 3 | 15 | Unlimited |
| Sessions, users, pageviews, bounce rate | Yes | Yes | Yes |
| 7d / 30d / 90d date ranges | Yes | Yes | Yes |
| Sparkline trend charts | Yes | Yes | Yes |
| Card view + table view | Yes | Yes | Yes |
| Traffic source breakdown | Yes | Yes | Yes |
| High-density table (15+ sites) | — | — | Yes |
| Priority support | — | 24h | 12h |
| Early feature access | — | Yes | Yes |
| Roadmap input | — | — | Yes |

---

## Social Proof / Trust Copy (below pricing tiers)

**Header:** Built by a solo developer. Priced for other solo developers.

**Body:**
StatPilot is a one-person project. I built it because I was tired of opening 12 GA4 tabs every morning to check on my sites.

The free tier is genuinely free — not a 14-day trial, not a "free with limits that make it unusable." Three properties, full features, no card required.

If you pay for Builder or Studio and it doesn't work for you, email me within 14 days and I'll refund you. No process, no form — just email marc@statpilot.io.

---

## Page Footer CTA Section

**Headline:** Start in 30 seconds.

**Subheadline:** Connect your Google account. StatPilot finds your properties automatically.

**CTA button:** Start free — no card needed

**Below button:** Builder and Studio start at $19/month. Upgrade anytime from your dashboard.
