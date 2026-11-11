---
title: "GA4 Roll-Up Properties: How to Combine Properties Without 360"
date: 2026-11-11
author: "StatPilot"
description: "GA4 roll-up properties combine several properties, but only on Analytics 360. How they work, what they need, and your options without 360."
tags: ["ga4", "analytics", "roll-up property", "multi-property", "analytics 360"]
slug: "ga4-roll-up-properties-without-360"
---

# GA4 Roll-Up Properties: How to Combine Properties Without 360

If you run several websites, you have probably looked for one GA4 report that covers all of them. In a standard GA4 property, the reports cover that property. To check the next site, you open the property picker, choose another property, and start reading again.

Google does have a feature that combines properties: the roll-up property. The catch is that it is part of Google Analytics 360, the paid enterprise edition. This post explains what roll-up properties and subproperties are, what they require, and what you can do instead if you are not on 360.

## The short answer

- **Roll-up properties** combine data from several GA4 properties into one property. They are available only to Analytics 360 accounts, and only 360 properties can be sources.
- **Subproperties** do the opposite: they show a filtered part of one property. Also 360 only.
- **Without 360**, you have four realistic options: switch between properties in GA4, build one Data Studio (formerly Looker Studio) report, write a script against the Google Analytics Data API, or use a multi-property dashboard tool.
- For 3 to 30 sites, the choice comes down to how much setup you want to do and how often you check your numbers.

## What roll-up properties and subproperties are

A roll-up property holds no data of its own. It combines data from its source properties and reports it as a single data set. Google's example is a company with separate properties for several brands that wants one aggregate look at how those brands perform ([About roll-up properties](https://support.google.com/analytics/answer/11526039)).

A few details from Google's help pages:

- Data from a source starts accumulating in the roll-up on the date that source is added. Set it up before you need the history.
- A roll-up cannot have events of its own, so you cannot add data streams to it.
- Users with the same reporting identity across sources (for example, the same user ID) are counted once in user metrics like Active users.
- Custom dimensions and metrics are not inherited from the sources. You recreate them in the roll-up.

A subproperty works the other way around. It takes one source property and holds a subset of its data, for example one region of a brand. Google describes subproperties as a way to control which users can see which data, and to filter which events from the source property they hold ([About subproperties](https://support.google.com/analytics/answer/11525732)). They do not solve the "all my sites on one screen" problem by themselves.

## Who can use them, and what they cost

Both features need an Analytics 360 account linked to a Google Marketing Platform organization with an active 360 order. Here is how they compare, based on Google's help pages for [roll-ups](https://support.google.com/analytics/answer/11539651) and [subproperties](https://support.google.com/analytics/answer/11526072):

| | Roll-up property | Subproperty |
|---|---|---|
| Sources | 360 properties only, up to 200 | One 360 source, up to 400 subproperties per source |
| Data billing | Events cost half of what they cost in each source | Events cost half of the source; filtered-out events are not charged |
| Who can create | Administrator | Editor or Administrator |
| Own data streams | No | No |

Two points matter most for a small team.

First, every source must itself be a 360 property. A roll-up of ten sites means ten 360 properties, plus the extra cost of the roll-up data on top. Google's [account structure guide](https://support.google.com/analytics/answer/9679158) says both roll-ups and subproperties "incur an additional cost for 360 customers."

Second, there is no public price to budget against. Google's [Analytics 360 page](https://marketingplatform.google.com/about/analytics-360/) lists no price and points you to "Talk to Sales." Google's help page on [360 for GA4 properties](https://support.google.com/analytics/answer/11202874) also covers 360 bought through a Google Sales Partner. In practice, you ask Google sales or a partner for a quote.

For most developers, founders and small agencies, that rules roll-ups out. So what are the alternatives?

## Your options without 360

### 1. Switch between properties in GA4

Google's help describes the path: select the property name, choose the account, then choose the property ([Navigate to your account and property](https://support.google.com/analytics/answer/12813202)).

It costs nothing and needs no setup. With 2 or 3 sites, this is fine. With 15, it is a lot of clicking, and comparing sites means remembering numbers or copying them into a spreadsheet.

### 2. One Data Studio report that pulls several properties

Google renamed Looker Studio back to Data Studio in April 2026. Old links redirect and existing reports keep working. Google describes it as a no-cost tool ([Welcome to Data Studio](https://docs.cloud.google.com/data-studio/welcome)).

When you create a Google Analytics data source, you select one account and one property ([Connect to Google Analytics](https://docs.cloud.google.com/data-studio/connect-to-google-analytics)). So with ten sites you create ten data sources, then place charts from each on one page. You can also [blend up to five data sources](https://docs.cloud.google.com/data-studio/how-blends-work) into one chart. Blends live inside the report where you created them.

The limit to know about: reports that use GA4 data are subject to GA4 Data API quotas. Over the limit, charts show errors like "This property has issued too many requests in the last hour." Google's [troubleshooting guide](https://docs.cloud.google.com/data-studio/troubleshooting-guide) suggests switching to owner's credentials, merging duplicate data sources, using fewer charts, sharing the report with fewer people, extracting data, exporting to BigQuery, or upgrading to Analytics 360.

For a step-by-step walkthrough, see [all your GA4 properties in one Looker Studio report](/blog/ga4-multiple-properties-looker-studio/).

### 3. A script against the Google Analytics Data API

If you write code, you can build your own summary. The Admin API's [accountSummaries.list](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accountSummaries/list) method returns summaries of all accounts the caller can access, including their properties. You then run one report per property. Batching does not help across sites: [batchRunReports](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/batchRunReports) requires all reports in a batch to be for the same property.

Quotas are counted per property. For a standard (non-360) property, the core limits are ([Data API limits and quotas](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas)):

| Core quota | Standard property |
|---|---|
| Tokens per property per day | 200,000 |
| Tokens per property per hour | 40,000 |
| Tokens per project per property per hour | 14,000 |
| Concurrent requests per property | 10 |

Google says most requests charge 10 or fewer tokens. If any bucket reaches zero, further requests to that property return a `429 RESOURCE_EXHAUSTED` error. A few summary requests per site per day stay far below these limits. The real cost is your time: OAuth, code, hosting and upkeep.

### 4. A multi-property dashboard tool

Third-party tools connect to your Google account and show several properties side by side. They differ a lot in price and setup: some make you connect each property by hand, others find them for you. For a side-by-side look, see [GA4 multi-property dashboards compared](/blog/ga4-multi-property-dashboard-comparison-2026/).

StatPilot is one of them. You sign in with Google once, it finds every GA4 property that account can access, and shows them all on one screen. It is GA4 only: no Ads, Facebook or Stripe data. It is in early access, so sign-in is open to invited testers for now.

## Comparison

| Option | Setup effort | Cost | Main limits |
|---|---|---|---|
| Roll-up property | Admin setup in a 360 account | 360 contract, plus roll-up data billed at half the source event cost | Sources must be 360; max 200; data starts on the date each source is added |
| Switch properties in GA4 | None | Free | One property at a time |
| Data Studio report | One data source per property, then build charts | No-cost tool | GA4 Data API quotas; blends max 5 sources |
| Data API script | Write code, handle auth, host it | Your time and hosting | Per-property quotas; batches are single-property |
| Dashboard tool | Sign in; per-property setup varies by tool | Varies by tool | Depends on the tool |

## Which one to pick

- **2 or 3 sites, checked now and then:** switch properties in GA4.
- **A shareable report with custom charts, for a client or a team:** Data Studio. Use owner's credentials and keep the chart count down.
- **Numbers inside your own app, spreadsheet or chat:** a Data API script.
- **5 to 30 sites and a quick daily glance, without building anything:** a multi-property dashboard tool.
- **Already on 360 and need deduplicated users across sites:** a roll-up property. When you add up users from separate properties, a person who visits two sites counts twice. A roll-up counts users with the same reporting identity once.

## Sources

- [About roll-up properties](https://support.google.com/analytics/answer/11526039) (Analytics Help)
- [Create and edit roll-up properties](https://support.google.com/analytics/answer/11539651) (Analytics Help)
- [About subproperties](https://support.google.com/analytics/answer/11525732) (Analytics Help)
- [Create and edit subproperties](https://support.google.com/analytics/answer/11526072) (Analytics Help)
- [Google Analytics account structure](https://support.google.com/analytics/answer/9679158) (Analytics Help)
- [Google Analytics 360 (Google Analytics 4 properties)](https://support.google.com/analytics/answer/11202874) (Analytics Help)
- [Google Analytics 360](https://marketingplatform.google.com/about/analytics-360/) (Google Marketing Platform)
- [Navigate to your account and property](https://support.google.com/analytics/answer/12813202) (Analytics Help)
- [Welcome to Data Studio](https://docs.cloud.google.com/data-studio/welcome) (Google Cloud Documentation)
- [Connect to Google Analytics](https://docs.cloud.google.com/data-studio/connect-to-google-analytics) (Data Studio docs)
- [How blends work in Data Studio](https://docs.cloud.google.com/data-studio/how-blends-work) (Data Studio docs)
- [Troubleshoot errors in Data Studio](https://docs.cloud.google.com/data-studio/troubleshooting-guide) (Data Studio docs)
- [Data API limits and quotas](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas) (Google for Developers)
- [accountSummaries.list](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accountSummaries/list) (Google Analytics Admin API)
- [properties.batchRunReports](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/batchRunReports) (Google Analytics Data API)

StatPilot is in early access: sign-in is open to invited testers for now, free for up to 3 properties. Want an invite? Email [hello@dizid.com](mailto:hello@dizid.com?subject=StatPilot%20early%20access). More about the dashboard: [statpilot.mom](https://statpilot.mom)
