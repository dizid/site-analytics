---
title: "Multiple GA4 Properties in Looker Studio (Now Data Studio)"
date: 2026-11-11
author: "StatPilot"
description: "How to put several GA4 properties in one Looker Studio report: data sources, blends, a site label, date controls, and how to avoid GA4 quota errors."
tags: ["ga4", "looker-studio", "data-studio", "multi-property", "quotas"]
slug: "ga4-multiple-properties-looker-studio"
---

# Multiple GA4 Properties in Looker Studio (Now Data Studio)

GA4 shows one property at a time. If you run five sites, or manage fifteen for clients, the usual free workaround is a Looker Studio report that pulls each property in as its own data source.

A naming note: in April 2026, Google renamed Looker Studio back to its original name, Data Studio. It now lives at datastudio.google.com, and old lookerstudio.google.com links redirect. The button names below follow Google's current help pages.

## The short answer

- Add each GA4 property as its own data source. One property per data source.
- For a quick overview, give each property its own scorecard or table and put one date range control on the page.
- For one combined chart, blend the properties. A blend holds up to five data sources.
- To get a "site" column, union the properties in a blend and add a text field with the site name to each table.
- Every chart spends GA4 Data API quota, so big reports hit quota errors. Fewer charts and owner's credentials help.

## Step by step: several properties in one report

1. **Create one data source per property.** On the Data Studio home page, click **Create**, then **Data source**. Pick the **Google Analytics** connector, authorize if asked, then select the account and the property. Click **CONNECT**. Repeat for every site. Data sources made this way are reusable across reports.
2. **Create the report.** Click **Create**, then **Report**. In the **Add data to report** menu, open the **My data sources** tab, pick your first property and click **Add**.
3. **Add the other properties.** While editing the report, click **Add data** in the toolbar and add the rest from **My data sources**.
4. **Build one block per property.** Add a scorecard or a small table for each site and set its data source to that site's property.
5. **Add one date range control.** In the toolbar, select **Add a control**, then the date range control, and place it on the page. It governs every chart on the page, even charts from different data sources.

This layout needs no blending. The downside: no total, and no way to sort sites against each other in one table.

If one site at a time is enough, add a **data control** instead. It lets a viewer switch the report between the Google Analytics properties they can access. It does not work in embedded reports.

## Blending several properties into one chart

A blend combines tables from different data sources into one source for a chart. Google's limits:

- **Up to five data sources** (tables) per blend.
- **Five join operators plus union:** inner, left outer, right outer, full outer and cross join. Union stacks rows instead of adding columns.
- **No mixing:** a blend uses all joins or all unions.
- **Equality only:** join conditions can only match Field A = Field B.
- **One report only:** a blend is embedded in the report where you made it. You cannot share it across reports.

To start a blend, select a chart and, in the properties panel under **Data source**, click **+BLEND DATA**. Or open **Resource > Manage blended data** and click **Add blend**.

### Pattern 1: one line per site (join on Date)

Put each property in its own table with **Date** as the dimension and one metric, such as Sessions. Join the tables on Date with a **Full outer** join, so a day with no data on one site still shows up. When fields share a name, Data Studio shows the table name next to the field, so name each table after its site. A time series chart can then draw one line per site.

### Pattern 2: one row per site (union with a site label)

1. In each table, add the same fields in the same order, for example Date and Sessions.
2. In each table, click **Add dimension**, then **Create field**, and give it a formula that is just the site name in quotes, such as `"shop.example.com"`. Use the same field name, like Site, in every table. Text values in formulas must be quoted.
3. Click the merge configuration box between two tables, select **Union**, check that every field is paired with its match, and click **Save**.
4. Build a table chart with Site as the dimension and Sessions as the metric.

The label also protects your data: a union removes duplicate rows, so two sites with the same date and session count would otherwise collapse into one row.

One caveat: metrics become plain numbers inside a blend and are re-aggregated when a chart drops a dimension like Date. Summing daily users counts a returning user once per day, so prefer totals of additive metrics like sessions.

## Quotas and "too many requests" errors

Reports that use GA4 data are subject to the GA4 Data API quotas. Every chart not served from memory spends tokens. Most requests cost 10 tokens or fewer. Cost rises with more rows, dimensions and metrics, complex filters, longer date ranges, high-cardinality dimensions like page path, and busier properties.

The limits for a standard (non-360) property:

| Quota | Standard property |
|---|---|
| Core tokens per property per day | 200,000 |
| Core tokens per property per hour | 40,000 |
| Core tokens per project per property per hour | 14,000 |
| Core concurrent requests per property | 10 |

Each request counts against both hourly limits. Daily quotas reset at midnight Pacific time, hourly ones within an hour. The per-property pools are shared by every tool that queries that property.

When a report runs out, charts show errors such as:

- "Exhausted concurrent requests quota. Please send fewer requests concurrently."
- "This property has issued too many requests in the last hour."
- "This property has issued too many requests in the last day."

**Find the expensive charts.** While editing, right-click the canvas and select **Google Analytics token usage**. You see tokens per chart, highest first. Right-click one chart for per-request detail, where a green checkmark means it loaded from memory for free.

**Reduce usage.** Google's own list:

- Switch data sources to owner's credentials, so viewers share cached results.
- Use one reusable data source per property instead of duplicates.
- Cut the number of charts on each page.
- Share with fewer people, or remove the report from busy embedded pages.
- Extract the data into a static snapshot. If you already hit the quota, you have to wait up to 24 hours for it to reset before you can run the extract.
- Export GA4 to BigQuery and connect to that, or upgrade to Analytics 360.

**Data freshness.** Data Studio keeps query results in memory until the freshness window expires. Google Analytics data sources default to 12 hours. With owner's credentials, all viewers share one freshness window. With viewer's credentials, each viewer has their own. A blend uses the shortest freshness of its sources. Manual **Refresh data** resets freshness, with a one-minute cooldown.

**Extracts.** An extracted data source holds a static copy of your chosen fields and date range, up to 100 MB and 750,000 rows. Turn on **Auto update** to refresh it on a schedule.

## When Looker Studio stops being worth it

For three to five sites, a hand-built report works well. Past that, the costs add up:

- **Every new site is manual.** Create a data source, add it to the report, add it to each blend, then copy and repoint its charts.
- **Five per blend.** Twelve sites means at least three separate blends.
- **Blends live in one report.** A second report means rebuilding them.
- **Quota per property.** More charts per site means more tokens, and Google's first fixes are fewer charts and fewer viewers.

If what you really want is a list of all your sites with their numbers, a purpose-built tool can be less work. StatPilot, for example, uses one Google sign-in, finds every GA4 property your account can access, and shows them on one screen. It is GA4 only, nothing else. For other tools, see [GA4 multi-property dashboards compared](/blog/ga4-multi-property-dashboard-comparison-2026/). For the roll-up property route, see [GA4 roll-up properties without 360](/blog/ga4-roll-up-properties-without-360/).

## Sources

- [Welcome to Data Studio (Looker Studio rename)](https://docs.cloud.google.com/data-studio/welcome)
- [Connect to Google Analytics](https://docs.cloud.google.com/data-studio/connect-to-google-analytics)
- [Add data to a report](https://docs.cloud.google.com/data-studio/add-data-to-a-report)
- [Date range control](https://docs.cloud.google.com/data-studio/date-range-control)
- [Data control](https://docs.cloud.google.com/data-studio/data-control)
- [How blends work in Data Studio](https://docs.cloud.google.com/data-studio/how-blends-work)
- [Create, edit, and manage blends](https://docs.cloud.google.com/data-studio/create-edit-and-manage-blends)
- [Blending tips and advanced concepts](https://docs.cloud.google.com/data-studio/blending-tips-and-advanced-concepts)
- [Literals](https://docs.cloud.google.com/data-studio/literals)
- [Troubleshoot errors in Data Studio (GA4 quotas)](https://docs.cloud.google.com/data-studio/troubleshooting-guide)
- [Manage data freshness](https://docs.cloud.google.com/data-studio/manage-data-freshness)
- [Extract data for faster performance](https://docs.cloud.google.com/data-studio/extract-data-for-faster-performance)
- [Data API limits and quotas (GA4)](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas)

StatPilot is in early access: sign-in is open to invited testers for now, free for up to 3 properties. Want an invite? Email [hello@dizid.com](mailto:hello@dizid.com?subject=StatPilot%20early%20access). More about the dashboard: [statpilot.mom](https://statpilot.mom)
