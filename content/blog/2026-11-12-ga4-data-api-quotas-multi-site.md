---
title: "GA4 Data API Quotas: Tokens and Limits for Multi-Site Dashboards"
date: 2026-11-12
author: "StatPilot"
description: "GA4 Data API quotas explained: tokens per property per day and hour, the 14,000 per-project limit, RESOURCE_EXHAUSTED errors, and how to stay inside."
tags: ["ga4", "data-api", "quotas", "multi-property", "developers"]
slug: "ga4-data-api-quotas-multi-site"
---

# GA4 Data API Quotas: Tokens and Limits for Multi-Site Dashboards

If you build or use a dashboard over many GA4 properties, every number on screen comes from the Google Analytics Data API, and every request spends quota. For most multi-site setups the limits are generous. The catch is in the details: quotas are counted per property, one bucket is per app, and a tool serving many users can hit a limit a single user never would.

## The short answer

- Quotas are counted per property, in tokens. A standard property gets 200,000 core tokens per day and 40,000 per hour. Analytics 360 gets ten times that.
- One app (one Google Cloud project) can use at most 14,000 tokens per hour on a standard property.
- Most requests cost 10 tokens or fewer. More rows, dimensions, filters, longer date ranges, high-cardinality dimensions and busy properties cost more.
- Add `"returnPropertyQuota": true` to a request to see what it cost and what is left.
- When any bucket reaches zero, requests to that property fail with `429 RESOURCE_EXHAUSTED` until it refills.
- Cache results, ask only for what you show, and do not refresh faster than GA4 updates its data.

## The limits: standard vs. Analytics 360

Core quota covers the main reporting methods, including runReport, runPivotReport and batchRunReports. runRealtimeReport and runFunnelReport use separate Realtime and Funnel quotas. Each request draws from one category only. The core limits:

| Core quota | Standard property | Analytics 360 property |
|---|---|---|
| Tokens per property per day | 200,000 | 2,000,000 |
| Tokens per property per hour | 40,000 | 400,000 |
| Tokens per project per property per hour | 14,000 | 140,000 |
| Concurrent requests per property | 10 | 50 |
| Server errors per project per property per hour | 10 | 50 |

Realtime and Funnel have their own buckets of the same sizes. Separately, properties get 120 potentially thresholded requests per hour. Those are requests that use userAgeBracket, userGender, brandingInterest, audienceId or audienceName.

Three rules make the table easier to read:

- **One charge, three buckets.** Each request's tokens come off the daily, the hourly and the per-project hourly bucket at the same time.
- **The property buckets are shared.** Every Cloud project that queries a property counts against that property's limits. The per-project bucket is 35% of the hourly one, so no single app can use up a property's whole hourly bucket.
- **Refresh times.** Daily quotas refresh at midnight Pacific Standard Time. Hourly quotas refresh within an hour, but not necessarily on the hour.

Google lists upgrading to Analytics 360 as one way to get higher API limits. For what 360 involves, see [GA4 roll-up properties without 360](/blog/ga4-roll-up-properties-without-360/).

## What a request costs

The exact token cost is set when the request runs, so it is hard to predict. Google says most requests charge 10 or fewer tokens, and lists what raises the cost:

- More rows
- More dimensions and metrics
- Complex filters
- Longer date ranges
- High-cardinality dimensions, such as pagePath or custom dimensions
- More events in the property: the same query can cost more on a busier site

To see the real number, add `returnPropertyQuota` to the request body:

```json
{
  "dateRanges": [{ "startDate": "7daysAgo", "endDate": "yesterday" }],
  "dimensions": [{ "name": "country" }],
  "metrics": [{ "name": "activeUsers" }],
  "returnPropertyQuota": true
}
```

It works in runReport, batchRunReports, the two pivot methods, runRealtimeReport and runFunnelReport. The response then includes a `propertyQuota` object with `consumed` and `remaining` for each bucket, such as tokensPerHour and tokensPerProjectPerHour. In Google's example response, this 7-day report of active users by country consumed 1 token.

## Worked sums

These are assumptions, not measurements. Swap in the `consumed` numbers from your own responses.

**One owner, hourly refresh.** Assume a dashboard sends 6 requests per site at about 10 tokens each.

- Per refresh: 6 × 10 = 60 tokens per property.
- Refreshed hourly: 60 tokens per hour per property, against 14,000 for your project and 40,000 for the property.
- Per day: 60 × 24 = 1,440 tokens, under 1% of 200,000.

**Thirty sites.** Quotas are per property, so 30 sites do not share one pool. Each property still sees 60 tokens per refresh. What can add up is concurrency: 6 parallel requests to one property fit under 10, but 12 would not.

**Heavier requests.** Assume each request costs 50 tokens because it pulls pagePath over 90 days. Per refresh: 6 × 50 = 300 tokens. Refreshed hourly, that is still 300 of 14,000.

**Many users, one property, one tool.** This is where the 14,000 limit matters. Assume a tool (one Cloud project) serves 20 people watching the same client property, with no shared cache, and each reloads every 5 minutes.

- Per person: 12 loads × 60 tokens = 720 tokens per hour.
- Twenty people: 20 × 720 = 14,400 tokens per hour. That is over 14,000, so the tool gets 429 errors for that property before the hour is out, even though the property's 40,000 bucket still has room.
- Put differently: 14,000 ÷ 60 = about 233 uncached loads per property per hour.
- With one shared cache refreshed hourly: 60 tokens per hour, however many people look.

**The daily ceiling.** A project that used its full 14,000 every hour would empty a standard property's daily 200,000 in about 14 hours (200,000 ÷ 14,000 = 14.3).

## When you run out

If any bucket reaches 0, further requests to that property return HTTP 429 with status `RESOURCE_EXHAUSTED`. Google's error table adds that you may be exceeding per-project or per-property limits. Requests keep failing until the bucket refills: within the hour for hourly buckets, at midnight Pacific for the daily one.

What to do:

- **Show cached numbers** instead of an error, and pause background jobs.
- **Retry with truncated exponential backoff and a retry cap.** Google recommends the same for 500 and 503 errors.
- **Never retry in a tight loop.** Server errors (500 and 503) have their own bucket: 10 per project per property per hour on a standard property. Use it up and all requests from your project to that property are blocked.

A `403 PERMISSION_DENIED` is a different problem: the signed-in user has no access to that property. See [why a GA4 property doesn't show up](/blog/ga4-property-not-showing-access/).

Data Studio (formerly Looker Studio) reports on GA4 data are subject to the same Data API quotas and show errors such as "This property has issued too many requests in the last hour." For report fixes, see [several GA4 properties in one Data Studio report](/blog/ga4-multiple-properties-looker-studio/).

## Staying inside the limits

1. **Cache results.** Store each response and serve it again until a refresh is worth it. StatPilot, for example, caches analytics data in the browser, so revisiting its one-screen view of your properties does not re-query GA4. If one tool serves many users, cache per property, not per user.
2. **Refresh at the speed GA4 updates.** For a standard property, Google lists intraday data at a typical 2 to 6 hours and daily data at 12 hours. Processing can take 24 to 48 hours. Polling every few minutes mostly buys the same numbers again. For live numbers, runRealtimeReport has its own quota.
3. **Ask only for what you show.** Request only the dimensions and metrics on screen. Set `limit` to the rows you display: without it, runReport returns up to 10,000 rows. Use short date ranges, and keep high-cardinality dimensions like pagePath and fullPageUrl out of frequent queries.
4. **Keep fewer requests in flight.** Combine metrics that share the same dimensions and date range into one request. Queue requests per property so no more than 10 run at once. Google does not say whether one combined request costs less than two narrow ones, so compare `consumed`.
5. **Use batches for round trips, not tokens.** batchRunReports takes up to 5 reports, all for the same property. Each report still counts on its own toward tokens and concurrent requests. Thirty sites still means at least 30 batches.
6. **Watch what is left.** Read `tokensPerProjectPerHour.remaining` and `tokensPerHour.remaining` in each response, and slow down below a safety margin you choose.
7. **Keep thresholded dimensions out of polling.** Requests with age, gender, interest or audience dimensions share a limit of 120 per property per hour.

## Sources

- [Data API limits and quotas](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas) (Google for Developers)
- [PropertyQuota](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/PropertyQuota) (Google Analytics Data API)
- [properties.runReport](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport) (Google Analytics Data API)
- [properties.batchRunReports](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/batchRunReports) (Google Analytics Data API)
- [Error responses](https://developers.google.com/analytics/devguides/reporting/data/v1/errors) (Google Analytics Data API)
- [Data freshness](https://support.google.com/analytics/answer/11198161) (Analytics Help)
- [Troubleshoot errors in Data Studio](https://docs.cloud.google.com/data-studio/troubleshooting-guide) (Data Studio docs)
- [Welcome to Data Studio](https://docs.cloud.google.com/data-studio/welcome) (Google Cloud Documentation)

StatPilot is in early access: sign-in is open to invited testers for now, free for up to 3 properties. Want an invite? Email [hello@dizid.com](mailto:hello@dizid.com?subject=StatPilot%20early%20access). More about the dashboard: [statpilot.mom](https://statpilot.mom)
