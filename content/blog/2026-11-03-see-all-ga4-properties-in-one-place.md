---
title: "How to See All Your GA4 Properties in One Place"
date: 2026-11-03
author: Marc
description: "GA4 shows one property at a time. Six ways to get an overview of all your sites, from the built-in switcher to Looker Studio, with honest pros and cons."
tags: ["ga4", "analytics", "multi-property", "how-to", "looker-studio"]
slug: "see-all-ga4-properties-in-one-place"
---

# How to See All Your GA4 Properties in One Place

GA4 has no built-in page that shows all your properties side by side. Reports always belong to one property, so you switch between them. There are other ways to get a single overview, and they differ a lot in cost and effort. Here are six, with the good and the bad of each.

## 1. The GA4 property switcher

This is what everyone starts with. Open the menu in the top-left corner of the Analytics interface. If your account is not part of an organization, choose **All accounts**. Pick the account in the **Analytics Accounts** column, then pick the property in the **Properties & Apps** column. The reports for that property open.

**Pros:** Free. Nothing to set up. Shows only what you have permission to see.

**Cons:** One property at a time. To compare ten sites you open ten properties and remember the numbers. It works for two or three sites. After that it gets slow.

## 2. The Google Analytics mobile app

Google has an Analytics app for Android and iOS. It is handy for a quick look from your phone.

**Pros:** Free. Good for checking one site while away from your desk.

**Cons:** It follows the same model as the web interface. You look at one property, then switch to the next. It is not a portfolio view. Check the app's own menu for the current switching steps, because they change between versions.

## 3. Roll-up properties

A roll-up property combines data from several properties into one. Google describes it as a property that holds data from two or more properties. A roll-up can draw on up to 200 source properties.

**Pros:** It is the official answer to "one view of many sites". Users with the same reporting identity across sources are counted once, so the totals are not inflated.

**Cons:** Roll-up properties are available only to Analytics 360 accounts, and the source properties must be 360 properties too. Data starts accumulating from the day you add each source. Users and permissions do not carry over. For a small portfolio this is not a realistic option. I wrote a separate post on [what roll-up properties cost](/blog/google-analytics-roll-up-properties-cost/).

## 4. A Looker Studio report

Looker Studio is free and connects to GA4. You can add several GA4 properties as data sources and build one report from them.

**Pros:** Free. You decide exactly what the report shows. You can add other sources such as Search Console or Google Sheets.

**Cons:** You build and maintain it yourself. Each property is a separate data source that you add by hand, so a new site does not appear on its own. Blending has limits: a blend can combine up to five data sources, and blends only live inside the report where you made them. If you have 12 sites, you will need a different layout, such as separate pages or tables. Totals across sites also need care. Users are not additive between properties, so adding up the user counts of two sites can count the same person twice.

Looker Studio is a good choice if you like building reports and need a custom layout.

## 5. The GA4 API

Google offers a Data API for reports and an Admin API that lists your accounts and properties. The `accountSummaries` call returns the accounts you can access, with the properties under each one. You can then run a report for each property and put the results in a spreadsheet or your own page.

**Pros:** Complete control. Free to use. You can keep the data in whatever format you want.

**Cons:** You write and host the code, handle sign-in, and deal with the quotas. For a standard property, Google lists limits of 200,000 tokens per property per day, 40,000 per hour, and 10 concurrent requests. That is enough for a personal dashboard, but you need to plan for it. This route makes sense if you are a developer and want to own the result.

## 6. A dashboard like StatPilot

StatPilot is the tool I built, so take this with that in mind. You sign in with Google, and it finds every GA4 property your account can access. There is no per-site setup. For each property it shows sessions, users, new users, pageviews, bounce rate and average session duration for the last 7, 30 or 90 days. It shows the change versus the previous period, a sparkline, and the top traffic sources. You can switch between cards and a sortable table, and open any site for its top pages, devices and countries.

**Pros:** Fast to start. New properties show up on their own. It only asks for read-only access to Analytics.

**Cons:** It shows GA4 data only. It is not a report builder, so you cannot design your own layout or add data from other tools. It reads the properties of the one Google account you sign in with. The free plan covers your 3 busiest sites with every feature. A one-time payment of $19 covers all your sites.

## Which one should you pick?

- **Two or three sites:** the property switcher is fine.
- **You like building reports, and want other data sources too:** Looker Studio.
- **You are a developer and want to own the code:** the API.
- **A large company with a 360 contract:** roll-up properties.
- **Many sites, and you just want the numbers on one screen:** a dashboard such as StatPilot.

There is no single best answer. Think about how often you check your sites. If it is daily, the setup time of a custom report pays off less than a tool that needs none.

[Try StatPilot free](https://statpilot.mom)
