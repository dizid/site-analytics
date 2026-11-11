---
title: "Comparing Traffic Across Sites in GA4: Which Metrics to Use"
date: 2026-11-13
author: "StatPilot"
description: "How to compare traffic across several sites in GA4: users vs sessions, engagement rate vs bounce rate, key events, and the settings that skew comparisons."
tags: ["ga4", "analytics", "metrics", "engagement rate", "multi-property"]
slug: "compare-traffic-across-sites-ga4"
---

# Comparing Traffic Across Sites in GA4: Which Metrics to Use

With several sites, you will want their numbers side by side. Every GA4 property uses the same metric names, so the numbers look comparable. Often they are not: each property counts on its own, and settings differ per site. Below: Google's definitions, which metrics compare well, and what to check first.

## The short answer

- Compare rates and trends, not raw totals, when sites differ a lot in size.
- Engagement rate and bounce rate are one number seen from two sides. Together they make 100%.
- Never add up users across properties. One person who visits two of your sites counts twice.
- Check the date range, reporting time zone, engaged-session timer, data filters and consent setup of each property.
- Key events only compare well if every site marks the same action.

## What each metric measures

Short versions of Google's definitions, from Analytics Help and the Data API docs. The last column is practical guidance, not Google's.

| Metric | What it measures | Good for comparing sites? |
|---|---|---|
| Active users | Unique users who engaged with the site in the date range | Yes, per site and as a trend. Never summed. |
| Total users | Unique users who triggered any event in the date range | Same as active users |
| New users | Unique users who logged first_visit (web) or first_open (app) | Yes, as a trend |
| Sessions | Sessions that began on the site | Yes, for size and growth |
| Engaged sessions | Sessions longer than 10 seconds, with a key event, or with 2 or more page or screen views | Better as a rate |
| Engagement rate | Engaged sessions divided by sessions | Yes, if the engaged-session timer matches |
| Bounce rate | Sessions that were not engaged, divided by sessions | Yes, but it is 100% minus engagement rate |
| Average engagement time | Total engagement time divided by active users | With care: content type matters |
| Views | Web pages or app screens users saw, repeats included | Better per session than as a total |
| Key events | Times users triggered a key event | Only if sites mark the same actions |

## Users vs sessions

Google describes a session as "a period during which a user is engaged with your website or app." User metrics count unique users, and one user can have many sessions. On a website, someone becomes an active user with an engaged session, or when Analytics collects the first_visit event or the engagement_time_msec parameter. Total users is broader: anyone who triggered any event. Pick one, usually Active users, and use it for every site.

### Why you can't add up users

Each property counts its own users. A person who reads your blog and later visits your shop shows up in both properties. Add the two numbers and that person counts twice.

Google's fix is a roll-up property, which "deduplicates users from source properties when users appear with the same reporting identity," such as the same user ID or the same signed-in Google account. Roll-up properties are available only to Google Analytics 360 accounts. Without one, report users per site, and label any total as a sum of per-site users, not a count of people. Sessions, views and key events each happen on one site, so their sums are fair totals of activity.

## Engagement rate vs bounce rate

GA4 calls a session engaged when it lasts longer than 10 seconds, has a key event, or has 2 or more page or screen views. Engagement rate is the percentage of sessions that were engaged. Bounce rate is the percentage that were not. In Google's words: "The bounce rate is the opposite of the engagement rate." A 62% engagement rate means a 38% bounce rate. Show one, not both.

The 10 seconds is only a default. In each web stream's Google tag settings, under **Adjust session timeout**, you can change the timer for engaged sessions. If one site uses 10 seconds and another 30, the second looks less engaged for the same behavior. Check this setting on every property before comparing engagement rates.

## A worked example (illustrative)

These numbers are made up to show the arithmetic.

- **Site A:** 2,000 sessions, 1,200 engaged. 1,200 ÷ 2,000 = 60% engagement rate, so a 40% bounce rate.
- **Site B:** 300 sessions, 210 engaged. 210 ÷ 300 = 70% engagement rate, so a 30% bounce rate.

Site A has about 6.7 times the sessions (2,000 ÷ 300). Site B keeps a larger share of its visitors engaged. Both are true, and they answer different questions.

- **Small sites swing more.** Site B's 70% rests on 300 sessions. With 30 fewer engaged sessions it would read 60% (180 ÷ 300). Look at several weeks before calling a winner.
- **Don't average rates.** The average of 60% and 70% is 65%. The real combined rate is (1,200 + 210) ÷ (2,000 + 300) = 1,410 ÷ 2,300 = 61.3%. Add up engaged sessions and sessions first, then divide.

## Check these settings before you compare

**1. Date range and time zone.** Each property has a reporting time zone. Google's example: a visit on Tuesday in the visitor's time zone, when it is still Monday in yours, is recorded as Monday. In the Data API, relative dates like "yesterday" are inferred from each property's reporting time zone. Sites on Los Angeles and Amsterdam time cut their days at different moments, so compare weeks or months, not single days. A time zone change only affects data going forward and can cause a flat spot or a spike.

**2. Bots and internal traffic.** GA4 excludes known bots and spiders automatically. You cannot turn that off or see how much was excluded. Data filters for your own visits are set per property. An internal traffic filter excludes IP addresses or ranges, and a developer traffic filter excludes debug mode activity. Filters do not affect historical data, and their effect is permanent. If your team is filtered out on five sites but not on a sixth, the sixth looks busier.

**3. Consent setup.** In basic consent mode, Google tags are blocked until the visitor grants consent. In advanced mode, tags send cookieless pings when consent is declined, and behavioral modeling can fill the gaps. Modeled data shows only with the Blended reporting identity, and only for properties that meet Google's eligibility criteria, such as at least 1,000 events per day with analytics_storage='denied' for at least 7 days. So a site with modeling and a site on basic mode do not measure declined visitors the same way.

**4. Key events.** A key event is "an event that measures an action that's particularly important to the success of your business." These used to be called conversions. Google now uses "conversion" for actions that measure ad campaigns. Each property picks its own key events, and marking one affects reports from that moment on, not past data. Compare key event rates only for the same action, such as a contact form submit, and only from the date every site marked it.

## Putting it together

Compare each site with its own past first, then compare sites on rates. Seeing all sites on one screen helps. StatPilot, for example, finds every GA4 property your Google account can access after one sign-in and shows them together. A shared screen does not fix mismatched settings, so the checks above still apply. For other tools, see [GA4 multi-property dashboards compared](/blog/ga4-multi-property-dashboard-comparison-2026/). Pulling these metrics for many sites through the API? Read [GA4 Data API quotas for multi-site dashboards](/blog/ga4-data-api-quotas-multi-site/). And if one metric shows different values in two reports, see [why GA4 numbers differ between reports](/blog/ga4-numbers-differ-thresholds-other-row/).

## Sources

- [Engagement rate and bounce rate](https://support.google.com/analytics/answer/12195621) (Analytics Help)
- [Understand user metrics](https://support.google.com/analytics/answer/12253918) (Analytics Help)
- [Analytics dimensions and metrics](https://support.google.com/analytics/answer/9143382) (Analytics Help)
- [About key events](https://support.google.com/analytics/answer/9267568) (Analytics Help)
- [Conversions vs. key events in Google Analytics](https://support.google.com/analytics/answer/13965727) (Analytics Help)
- [Configure your Google tag settings](https://support.google.com/analytics/answer/12131703) (Analytics Help)
- [Set up Analytics for a website and/or app](https://support.google.com/analytics/answer/9304153) (Analytics Help)
- [Data filters](https://support.google.com/analytics/answer/10108813) (Analytics Help)
- [Known bot-traffic exclusion](https://support.google.com/analytics/answer/9888366) (Analytics Help)
- [Consent mode on websites and mobile apps](https://support.google.com/analytics/answer/9976101) (Analytics Help)
- [Behavioral modeling for consent mode](https://support.google.com/analytics/answer/11161109) (Analytics Help)
- [About roll-up properties](https://support.google.com/analytics/answer/11526039) (Analytics Help)
- [API Dimensions & Metrics](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema) (Google Analytics Data API)
- [DateRange](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/DateRange) (Google Analytics Data API)

StatPilot is in early access: sign-in is open to invited testers for now, free for up to 3 properties. Want an invite? Email [hello@dizid.com](mailto:hello@dizid.com?subject=StatPilot%20early%20access). More about the dashboard: [statpilot.mom](https://statpilot.mom)
