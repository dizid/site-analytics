# StatPilot — Beta Onboarding Email Sequence

5-email sequence. Sent over 21 days from signup. Tone: founder-to-founder, direct, warm.
Sender name: Marc (StatPilot). Reply-to: marc@statpilot.io

---

## Email 1 — Day 0 (Welcome)

**Subject:** You're in — here's what StatPilot discovered

**Preview text:** [X] properties found. No setup required.

---

Hey [First Name],

You're in.

StatPilot just connected to your Google account and found [X] GA4 properties. They're all on your dashboard right now — sessions, users, bounce rate, and trend sparklines for each one.

No tagging. No setup. No copy-pasting property IDs.

A couple of things worth knowing as you get started:

**Card view vs table view.** If you're managing a handful of sites, the card view gives you a nice visual overview. If you're managing 10+, flip to table view — it's denser and faster to scan. The toggle is in the top right.

**Date ranges.** The default is 7 days. You can switch to 30 or 90 days with one click. I find 30-day is the most useful for spotting trends without noise.

**Cache.** StatPilot caches your data for 6 hours so the dashboard loads instantly on repeat visits. Hit refresh if you want live data.

That's it. Nothing else to configure.

One ask: if something feels off, confusing, or missing — just reply to this email. I read every response myself. StatPilot is in active development and your first impressions genuinely shape what I build next.

— Marc

P.S. If StatPilot found fewer properties than you expected, check that your Google account has Viewer access on those GA4 properties. That's the only permission it needs.

**[Open My Dashboard]**

---

## Email 2 — Day 3 (Engagement)

**Subject:** One question about your morning routine

**Preview text:** What do you check first?

---

Hey [First Name],

Quick question — when you open StatPilot in the morning, what's the first thing you look at?

- Total sessions across all your sites?
- Bounce rate on a specific property?
- Whether a particular site spiked or dropped overnight?
- Traffic sources?

I'm asking because I'm about to start building the next feature, and I want to base it on what people actually use — not what I assume they care about.

Just hit reply and tell me. One sentence is enough. "I always look at X first" is perfect.

If there's something you wish the dashboard showed that it doesn't, that's even more useful to hear.

— Marc

**[Open StatPilot]**

---

## Email 3 — Day 7 (Feature)

**Subject:** New: [feature placeholder]

**Preview text:** Just shipped — here's what changed.

---

Hey [First Name],

Just shipped an update worth knowing about: [Feature name and one-line description].

[Two to three sentences describing what the feature does, the problem it solves, and how to find it in the dashboard. Be specific — "click the X button in the top right" is better than "look in the settings area."]

[If there's a screenshot or GIF, reference it here: "Screenshot below shows what this looks like."]

This came directly from feedback in the first week of beta. A few people asked for [problem this solves], and this is how I addressed it.

StatPilot ships updates fast. If you have a specific request, reply to this email — the stuff I hear from actual users moves to the top of the list.

Have you tried [existing feature worth highlighting]? It's been the most-used thing so far by a wide margin. If you haven't explored it yet, worth 30 seconds of your time.

— Marc

**[Open StatPilot]**

---

## Email 4 — Day 14 (Feedback)

**Subject:** How many sites are you managing?

**Preview text:** Helps me figure out where the free tier limit should be.

---

Hey [First Name],

Genuine question: how many websites are you actively managing right now?

Just reply with a number. That's it.

I'm trying to figure out where to set the property limits for StatPilot's pricing tiers, and I want the decision to be based on what real users actually have — not what I guess. The data I've collected so far is all over the place, which tells me I need to ask directly.

If you're at 3 or fewer: the free tier will always work for you.
If you're at 4-15: that's the Builder range I'm designing around.
If you're managing 15+: that's the Studio tier, and I want to make sure it's worth it for you specifically.

No sales pitch here. I'm not going to follow up this email with a "buy now" push. I just genuinely want to know how many sites people are actually juggling before I finalize what each tier includes.

Reply with your number. And if you want to add any context — what kind of sites, how often you check stats — I'm interested in that too.

— Marc

**[Open StatPilot]**

---

## Email 5 — Day 21 (Conversion)

**Subject:** StatPilot pricing is live — beta users get 30% off

**Preview text:** Code BETA30 — expires in 7 days.

---

Hey [First Name],

StatPilot pricing is live.

Before I get into the details: thank you for being here during beta. The feedback from this group shaped a lot of what StatPilot is now. That's not something I say to everyone — you actually were part of building this.

Here are the tiers:

**Solo — Free**
Up to 3 GA4 properties. Full dashboard features. No credit card.

**Builder — $19/month**
Up to 15 properties. Everything in Solo. Built for people running a real portfolio of sites.

**Studio — $49/month**
Unlimited properties. Everything in Builder. For when 15 isn't enough.

---

Because you've been testing StatPilot since the beginning, you get 30% off your first 3 months on any paid plan.

Use code **BETA30** at checkout.

This code expires in 7 days — February 25th. After that, it's gone.

If you're managing more than 3 sites and you want to keep seeing all of them on one dashboard, this is the moment to lock in the discount.

**[Upgrade Now — Use Code BETA30]**

Questions before upgrading? Just reply. I'll answer directly.

— Marc

P.S. The free tier stays free permanently. If 3 properties is enough for you, you don't need to do anything.

---

## Sequence Notes

| # | Trigger | Subject | Primary Goal |
|---|---------|---------|--------------|
| 1 | Signup | You're in — here's what StatPilot discovered | Activate + set expectations |
| 2 | Day 3 | One question about your morning routine | Engagement + product research |
| 3 | Day 7 | New: [feature placeholder] | Trust + momentum |
| 4 | Day 14 | How many sites are you managing? | Segmentation + rapport |
| 5 | Day 21 | StatPilot pricing is live — beta users get 30% off | Conversion |

**Recommended ESP fields to personalize:**
- `[First Name]` — subscriber first name
- `[X]` in Email 1 — property count from onboarding API response

**Deliverability notes:**
- Plain text or minimal HTML preferred for Email 2 and 4 (conversational, no images)
- Email 5 can be more designed — it's a product announcement
- From address: marc@statpilot.io (personal, not noreply@)
