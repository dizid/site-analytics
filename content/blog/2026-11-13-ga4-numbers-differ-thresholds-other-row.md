---
title: "GA4 Numbers Don't Match? Thresholds, (other) Row and Sampling"
date: 2026-11-13
author: "StatPilot"
description: "Why GA4 shows different numbers in reports, explorations, the Data API and Data Studio: thresholds, the (other) row, sampling, freshness and time zones."
tags: ["ga4", "data-api", "data quality", "sampling", "troubleshooting"]
slug: "ga4-numbers-differ-thresholds-other-row"
---

# GA4 Numbers Don't Match? Thresholds, (other) Row and Sampling

You check last week's users in a GA4 report, an exploration and Data Studio (formerly Looker Studio), and get three different numbers. Usually nothing is broken. Google documents the reasons, and calls differences between reports and explorations "expected." Below: each reason, how to spot it, and how to compare fairly.

## The short answer

- **Thresholds** withhold rows with demographic data or low user counts.
- **The (other) row** groups less common values once a table passes its row limit.
- **Sampling** estimates results from part of the data on big queries.
- **User and session counts are estimates**, in the interface and in the Data API.
- **Recent data is still moving** for 24 to 48 hours, and dates follow each property's time zone.
- **Reports and explorations differ by design.** Data Studio matches reports, not explorations.

## Data thresholds: rows withheld

Thresholds stop anyone viewing a report from inferring the identity or sensitive information of individual users "based on demographics, interests, or other signals present in the data." They are system defined. You can't adjust them. Google documents two cases:

- A report, exploration or API call includes demographic data, or audiences defined using demographic data.
- A report or exploration includes search query information, and a row doesn't have enough total users.

**How to tell.** The report's data quality indicator says Google Analytics "has applied thresholding to one or more cards in this report." In the Data API, `subjectToThresholding` is true in the response metadata. The report then only returns data that meets the minimum thresholds, though possibly nothing is missing.

**What helps.** Widen the date range. Data in a narrow range may be withheld when user or event counts are low.

**Reporting identity plays a part.** Blended uses User-ID, then device ID, then modeling. Observed drops modeling. Device based uses device ID only. Google notes that the full benefit of the first two needs user IDs and enough signed-in activity to obscure identities, and that as a consequence reports are subject to data thresholds. Switching does not change collection or processing, but two properties with different settings count users differently.

## The (other) row: rows condensed

The (other) row appears in a report, exploration or Data API response when a table has more rows than its row limit. GA4 keeps the most common values and condenses the rest. Google's example: if the table behind the Pages and screens report has a 100k row limit and the property has 150k unique pages, the last 50k rows become (other).

The usual cause is high cardinality, which Google defines as more than 500 unique values for a dimension in one day. Row limits are higher for Analytics 360 and for some reports. Secondary dimensions, filters and comparisons make (other) more likely.

- **Intraday data gets stricter limits.** Until daily data is ready, (other) is more likely if your property has high-cardinality dimensions.
- **A filter can hide the row, not the problem.** The data quality icon can warn about (other) when no (other) row is visible. In the Data API, `dataLossFromOtherRow` is set from the aggregated table behind the report, regardless of your filters and limits.

**What helps.** Use standard reports when you can: their aggregate tables make (other) less likely. Avoid high-cardinality dimensions unless you need them. Don't store a unique ID per user in a custom dimension. Use User-ID instead.

## Sampling: estimates from a subset

Sampling may happen when a report, exploration or request needs more events than your property's quota. GA4 then analyzes part of the data and scales it up. The limit for event-level queries is 10 million events for standard properties and up to 1 billion for Analytics 360, which starts at a default of 100 million events per query.

GA4 flags sampling in the interface and in the Data API. The data quality icon shows the share used, such as "This report is based on 8.88% of available data." In the Data API, `samplingMetadatas` appears only when results are sampled, one entry per date range. Divide `samplesReadCount` by `samplingSpaceSize` to get the share.

**What helps.** Shorten the date range. Google also warns that filtering large datasets by country may cause sampling, even in standard reports. Note the tension: a longer range helps with thresholds, a shorter one with sampling.

## User counts are approximations

GA4 estimates Active Users, Total Users and Sessions with the HyperLogLog++ (HLL++) algorithm, in the interface "as well as through the Data API." Discrepancies are usually below 1%, but can be higher when combining more than one HLL++ metric. Also check the metric name: in GA4, "Users" usually means Active Users, not Total Users.

Adding up rows is not a reliable total either: Data Studio's docs describe inflated session counts in some stacked bar charts, where session fragments get summed.

## Freshness: recent data is still moving

Data processing can take 24 to 48 hours, and reports may change during that time. A standard property typically gets intraday data in 2 to 6 hours and daily data in 12. Intraday data can have temporary gaps in source, medium and campaign. Some data can arrive late, potentially up to 7 days.

Reports and explorations don't update at the same moment. Google's typical timeline has the prior day ready in Explore around 11:30 am and in Reports around 3:30 pm, property time. Queries for the past 48 hours can show slightly different results.

## Time zones

Every property has a reporting time zone. If a visitor arrives on Tuesday in their time zone while it is Monday in yours, the visit is recorded as Monday. Changing the time zone only affects data going forward and can leave a flat spot or a spike.

In the Data API, `yesterday`, `today` and `NdaysAgo` are worked out in each property's reporting time zone, and the response returns that zone in `timeZone`. So "yesterday" for a site set to New York and one set to Tokyo covers two different windows. Keep that in mind when [comparing traffic across sites in GA4](/blog/compare-traffic-across-sites-ga4/).

## Reports vs explorations vs Data Studio

Some differences are by design. Explorations drop fields they don't support, use case-sensitive filters and turn report comparisons into segments. They only cover your data retention period (2 or 14 months for user-level data), while standard reports are not affected by retention. With behavioral modeling on, the two use different data sets, so modeled numbers can differ slightly.

Data Studio's GA4 connector works with the fields of the Data API, is subject to its quotas, and "will match the data, but not the explorations." For combining sites there, see [several GA4 properties in one Data Studio report](/blog/ga4-multiple-properties-looker-studio/).

The same applies to any dashboard built on the Data API. StatPilot reads GA4 through the Data API, so its numbers carry the same thresholds, (other) row and HLL++ estimates. Quotas are a separate topic: see [GA4 Data API quotas for multi-site dashboards](/blog/ga4-data-api-quotas-multi-site/).

## A checklist for comparing numbers

1. **Same metric.** Active Users and Total Users are different numbers.
2. **Same closed date range.** End it at least two days ago, never today.
3. **Same time zone**, or at least know each property's.
4. **Same surface.** Data Studio matches reports, not explorations.
5. **Check the flags.** The data quality icon, or `subjectToThresholding`, `dataLossFromOtherRow` and `samplingMetadatas` in API responses.
6. **Fewer dimensions.** Drop high-cardinality and secondary dimensions when you only need a total.
7. **Ask for the total.** Don't add up rows to build one.

## Sources

- [About data thresholds](https://support.google.com/analytics/answer/9383630) (Analytics Help)
- [Reporting identity](https://support.google.com/analytics/answer/10976610) (Analytics Help)
- [About the (other) row](https://support.google.com/analytics/answer/13331684) (Analytics Help)
- [Cardinality](https://support.google.com/analytics/answer/12226705) (Analytics Help)
- [About data sampling](https://support.google.com/analytics/answer/13331292) (Analytics Help)
- [Data quality](https://support.google.com/analytics/answer/12856703) (Analytics Help)
- [Data freshness](https://support.google.com/analytics/answer/11198161) (Analytics Help)
- [Data differences between reports and explorations](https://support.google.com/analytics/answer/9371379) (Analytics Help)
- [Reporting surfaces comparison](https://support.google.com/analytics/answer/13644080) (Analytics Help)
- [Data retention](https://support.google.com/analytics/answer/7667196) (Analytics Help)
- [Set up Analytics for a website and/or app](https://support.google.com/analytics/answer/14183469) (Analytics Help)
- [Unique count approximation in Google Analytics](https://developers.google.com/analytics/blog/2022/hll) (Google for Developers)
- [Bridge the gap between the Google Analytics UI and BigQuery export](https://developers.google.com/analytics/blog/2023/bigquery-vs-ui) (Google for Developers)
- [ResponseMetaData](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/ResponseMetaData) (Google Analytics Data API)
- [DateRange](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/DateRange) (Google Analytics Data API)
- [Connect to Google Analytics](https://docs.cloud.google.com/data-studio/connect-to-google-analytics) (Data Studio docs)
- [Welcome to Data Studio](https://docs.cloud.google.com/data-studio/welcome) (Google Cloud Documentation)

StatPilot is in early access: sign-in is open to invited testers for now, free for up to 3 properties. Want an invite? Email [hello@dizid.com](mailto:hello@dizid.com?subject=StatPilot%20early%20access). More about the dashboard: [statpilot.mom](https://statpilot.mom)
