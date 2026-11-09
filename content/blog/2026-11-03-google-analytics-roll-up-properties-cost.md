---
title: "Google Analytics Roll-Up Properties: Cost and Alternatives"
date: 2026-11-03
author: Marc
description: "Roll-up properties need Analytics 360. What that means for cost, what they can and can't do, and cheaper ways to get a cross-site overview."
tags: ["ga4", "analytics-360", "roll-up-properties", "pricing", "multi-property"]
slug: "google-analytics-roll-up-properties-cost"
---

# Google Analytics Roll-Up Properties: Cost and Alternatives

Roll-up properties are the official way to see several GA4 properties in one place. They are also a paid enterprise feature. Google says they are available only to Analytics 360 accounts, and I could not find a public price on Google's own pages. Third-party sources put Analytics 360 at around $50,000 a year. If you run a handful of sites, you almost certainly do not need one.

## What a roll-up property is

Google defines a roll-up property as a property that contains data from two or more properties. It does not collect data itself. It pulls from source properties and shows the combined result in one set of reports.

Some facts from Google's help pages:

- A roll-up can have up to 200 source properties.
- Sources can be standard 360 properties or subproperties. A roll-up cannot be a source for another roll-up.
- It cannot include a subproperty and that subproperty's source property at the same time.
- It has no data streams of its own, so you cannot add data collection to it.
- Users who share the same reporting identity across sources are counted once.
- Data accumulates only from the date you add each source. Older data does not appear for the new source.
- Users and permissions are not inherited. You set up access on the roll-up separately.

That last point matters. Someone who can see all ten of your sources still sees nothing in the roll-up until you give them access to it.

## What it costs

Here is what I could verify and what I could not.

**Verified:** Roll-up properties require an Analytics 360 account that is linked to a Google Marketing Platform organization with an active order. Only 360 properties can be sources.

**Not verified:** a price. Google does not seem to publish one. Third-party sources, mostly agencies and resellers, say Analytics 360 starts at around $50,000 per year. One UK source gives a figure of about £30,000 per year for the entry tier. Treat these as rough guides. Real prices are negotiated through Google or a certified reseller, and they depend on how many events you send.

Google's help page for subproperties says the cost of events in a subproperty is half the cost of events in the source property, per the terms of your 360 contract. Sources disagree on how roll-up events are billed. Your contract is what counts.

In short: the price is custom, it is high, and the roll-up is only part of what you would be paying for.

## Do you need one?

You might, if:

- You are a large organization with many brands or regions.
- You already pay for Analytics 360 for other reasons.
- You need one deduplicated user count across properties.

You probably do not need one if:

- You run a handful of sites or products.
- You mainly want to check traffic trends across them.
- You are an agency that looks at client sites one by one.

Most people who search for roll-up properties are in the second group. They want to stop switching tabs. That does not take a five-figure contract.

## Cheaper ways to get a cross-site overview

### The property switcher

Free, and you already have it. Open the menu in the top-left corner, choose the account and then the property. It shows one property at a time, so it only works for a few sites.

### Looker Studio

Free. You add each GA4 property as a data source and build a report. A blend can combine up to five data sources, and a blend only exists inside the report where you created it. You maintain the report yourself, and a new site does not appear until you add it. Be careful when summing user counts across properties, because the same person visiting two of your sites is counted twice.

### The GA4 APIs

Free to use if you can write code. The Admin API lists the accounts and properties you can access, and the Data API gives you the numbers. You build the page and handle sign-in and quotas yourself.

### A dashboard tool

Several paid tools connect to GA4 and show multiple properties. Most make you connect each property one at a time. StatPilot is my own entry in this group. You sign in with Google and it finds every GA4 property your account can access. It shows sessions, users, pageviews, bounce rate and the change versus the previous period for each one. It is read-only and GA4 only.

Its pricing is simple. It is free for your 3 busiest sites with every feature. A one-time payment of $19 covers all your sites, with no subscription and a 30-day refund.

## What you give up

A cheaper overview is not the same thing as a roll-up. Be clear on the differences.

- **No combined user count.** A roll-up counts a person once across sources. A dashboard shows each site's numbers side by side, but it does not deduplicate people between sites.
- **No combined reports inside GA4.** A roll-up gives you the full GA4 interface on the combined data. A dashboard gives you a summary and a per-site drill-down.
- **No extra data collection.** Neither approach changes what each site collects.

If you need a single deduplicated audience, you need 360. If you need to know which of your sites grew this week, you do not.

## The short version

Roll-up properties are for large organizations on an Analytics 360 contract. For everyone else, the property switcher, a Looker Studio report, the API or a dashboard tool will cover the job at a fraction of the cost.

[Try StatPilot free](https://statpilot.mom)
