---
title: "GA4 Cross-Domain Measurement vs Separate Properties for Several Sites"
date: 2026-11-14
author: "StatPilot"
description: "Several sites in GA4: cross-domain measurement, one property per site, or several streams in one property. What each does to users, referrals and access."
tags: ["ga4", "analytics", "cross-domain", "data streams", "multi-property"]
slug: "ga4-cross-domain-vs-separate-properties"
---

# GA4 Cross-Domain Measurement vs Separate Properties for Several Sites

With more than one website, GA4 gives you three setups: one property with one web data stream and linked domains, one property per site, or several web streams in one property. Each one changes how users are counted, which visits show up as referrals, who sees what, and which limits you share. Below: what each setup does, a decision table, and common mistakes.

## The short answer

- **One visitor journey across domains** (say, a site plus a separate shop or booking domain): one property, one web data stream, [cross-domain measurement](https://support.google.com/analytics/answer/10071811). That is Google's own advice.
- **Separate sites with separate audiences**, such as different brands or clients: one property per site. Google's [account structure guide](https://support.google.com/analytics/answer/9679158) says "one property per brand or business unit."
- **Several web streams in one property**: the exception. Google recommends one web data stream per property in most cases.
- **Without cross-domain measurement**, one person on two root domains counts as two users and two sessions.
- **Access is set per account or property.** Inside one property, you can't limit someone to one site without 360 subproperties.

## The three setups

**1. One property, one web stream, cross-domain measurement.** Every domain uses the same Google tag. Google's requirement: "The tag on each page must use the same tag ID (i.e., the same "G-" ID) from the same web data stream." You then list the domains in that stream's tag settings.

**2. One property per site.** Each site has its own property, its own tag ID, its own reports, settings and user list.

**3. Several web streams in one property.** Each site gets its own web stream and tag ID, in one property. The [hierarchy page](https://support.google.com/analytics/answer/9303323) allows up to 50 data streams per property. The account structure guide calls 3 the best-practice maximum (one web, one iOS, one Android) and says "In most cases, you should use a single web data stream to measure the web user journey."

## Users and sessions

"When there is consent, Analytics uses first-party cookies to set IDs for each unique user and each unique session." Without cross-domain measurement, new cookies with new IDs are created for each domain a user visits. So one person visiting two root domains on the same device counts as "two users and two sessions instead of one user and one session."

With cross-domain measurement, the IDs travel in a URL parameter named `_gl` when the visitor moves between domains through a link or a form. Analytics then identifies one user and one session.

What this means per setup:

- **Cross-domain:** one person, one user, one session, as long as `_gl` arrives intact.
- **Separate properties:** the person counts once in each property. Add the totals and they count twice. See [why you can't add up users](/blog/compare-traffic-across-sites-ga4/).
- **Several streams:** different tag IDs, so cross-domain linking between them is not an option. The same person shows up as two users inside one property, which is easy to miss because the report shows a single total.

Cross-domain linking can break. Google lists the usual causes:

- A redirect, or a destination that doesn't accept arbitrary query parameters, can strip `_gl`. Configure the site to keep it.
- It relies on a click listener, so it doesn't work when JavaScript, not a direct user action, triggers the navigation.
- Scripts that stop event propagation can prevent the parameter from being added.

To test, click a link to another listed domain and check that the URL contains `_gl`.

## Referrals between your own sites

Per Google's [unwanted referrals page](https://support.google.com/analytics/answer/10327750), GA4 doesn't count a referral when the referring site matches the current page's domain or any of its subdomains, or when the visit comes from your cross-domain setup and the page has `_gl`. So with cross-domain, moving between your listed domains isn't a referral. With separate properties or several streams, a click from site A to site B shows up as a referral from site A. That can be useful: it tells you which of your sites sends visitors to the others.

To stop a domain from being reported as a referral, list it as an unwanted referral. Google's examples are a third-party payment processor and a password-recovery email sent from another domain. Analytics then adds `ignore_referrer=true` to matching events. The list lives per web stream: Admin, Data collection and modification, Data streams, pick the stream, Configure tag settings, Show all, List unwanted referrals. You need the Editor role or above, and the limit is 50 per data stream.

Two details. In Google's example, a visitor who first came from a domain you later exclude, then returns directly, is still credited to that domain (last non-direct click attribution). And self-referrals can appear between subdomains that use a different cookie domain, so check that all subdomains use the same one.

## Reporting

- **Cross-domain:** one set of reports. To split by site, use the [Hostname dimension](https://support.google.com/analytics/answer/9143382), "the subdomain and domain names of a URL that people visited on your website."
- **Separate properties:** clean reports per site, but no combined view in GA4. Roll-up properties need 360; see [GA4 roll-up properties without 360](/blog/ga4-roll-up-properties-without-360/).
- **Several streams:** one set of reports. Split with the Stream name dimension, "the name of the stream from which users activity originated."

Settings live at two levels. The cross-domain list, unwanted referrals and the [session timeout](https://support.google.com/analytics/answer/9191807) sit in each web stream's tag settings. Data retention is [set per property](https://support.google.com/analytics/answer/7667196): one setting covers every site in a combined property, while separate properties each need their own. More in [GA4 data retention settings](/blog/ga4-data-retention-settings/).

## Permissions

Google assigns roles at the account level or the property level, and "Parent roles are inherited by default (e.g., account > property)" ([access management](https://support.google.com/analytics/answer/9305587)). Anyone with access to a combined property sees all the sites in it.

To limit access inside one property, Google points to subproperties, which can govern "User access to data." But [subproperties are available only to Google Analytics 360 accounts](https://support.google.com/analytics/answer/11525732). On a standard property, a client who should see only their own site needs their own property. More in [GA4 property not showing?](/blog/ga4-property-not-showing-access/)

## Limits

| Limit | Value | Applies to |
|---|---|---|
| Properties per account | 2,000 | Account |
| Data streams per property | 50, of which up to 30 app streams | Property |
| Recommended streams per property | 3 (one web, one iOS, one Android) | Property |
| Cross-domain conditions | Up to 100 | Cross-domain setup |
| Unwanted referrals | 50 | Per data stream |
| Key events | 30 | Per property (standard) |
| Audiences | 100 | Per property (standard) |
| Custom dimensions | 50 event-scoped, 25 user-scoped | Per property (standard) |

Rows 1 and 2 are from the [hierarchy page](https://support.google.com/analytics/answer/9303323), row 3 from the account structure guide, rows 4 and 5 from the pages linked above. The last three are Google's [configuration limits](https://support.google.com/analytics/answer/12229528), which "apply on a per-property basis." In a combined property, all your sites share them.

## Decision table

| Your situation | Setup |
|---|---|
| One business or brand: sites you analyze together, or visitors who move between your domains (site, shop, checkout, booking) | One property, one web stream, cross-domain |
| Separate brands or businesses with their own audiences | One property per site |
| Client sites, where each client should only see their own | One property per site |
| Website plus iOS and Android apps for the same product | One property: one web stream plus one stream per app platform |

Google's best-practice use of several streams is one per platform. For websites, its account structure guide says: "Use one web data stream for multiple domains." Data you don't analyze together belongs in a separate property per logical user base.

## Common mistakes

1. **Listing domains while each has its own tag ID.** Cross-domain only works when every domain uses the same G- ID from the same web stream.
2. **Never checking `_gl`.** Redirects, JavaScript navigation and stopped event propagation break the link. Test after site changes.
3. **Excluding your own sites by reflex.** In separate properties, a referral from your other site is real information. Exclude a domain only when it shouldn't count as a traffic source, like a payment processor.
4. **Adding up users across properties.** The same person counts once per property. Report users per site.
5. **Putting client sites in one property.** You can't give one client access to only their site without 360.
6. **Forgetting property-level settings.** Each new property has its own, including data retention.

## Viewing separate properties together

If you choose one property per site, the cost is switching between properties to see everything. StatPilot finds every GA4 property your Google account can access after one sign-in and shows them side by side. For other options, see [GA4 multi-property dashboards compared](/blog/ga4-multi-property-dashboard-comparison-2026/).

## Sources

- [Set up cross-domain measurement](https://support.google.com/analytics/answer/10071811) (Analytics Help)
- [Identify unwanted referrals](https://support.google.com/analytics/answer/10327750) (Analytics Help)
- [Google Analytics account structure](https://support.google.com/analytics/answer/9679158) (Analytics Help)
- [Google Analytics hierarchy](https://support.google.com/analytics/answer/9303323) (Analytics Help)
- [About Analytics sessions](https://support.google.com/analytics/answer/9191807) (Analytics Help)
- [Analytics dimensions and metrics](https://support.google.com/analytics/answer/9143382) (Analytics Help)
- [Access and data-restriction management](https://support.google.com/analytics/answer/9305587) (Analytics Help)
- [About subproperties](https://support.google.com/analytics/answer/11525732) (Analytics Help)
- [Configuration limits](https://support.google.com/analytics/answer/12229528) (Analytics Help)
- [Data retention](https://support.google.com/analytics/answer/7667196) (Analytics Help)

StatPilot is in early access: sign-in is open to invited testers for now, free for up to 3 properties. Want an invite? Email [hello@dizid.com](mailto:hello@dizid.com?subject=StatPilot%20early%20access). More about the dashboard: [statpilot.mom](https://statpilot.mom)
