---
title: "GA4 Account vs Property vs Data Stream: Find Every Property"
date: 2026-11-03
author: Marc
description: "How GA4 accounts, properties and data streams fit together, how to list every property you can access, and why one may be missing from your list."
tags: ["ga4", "accounts", "properties", "data-streams", "admin-api"]
slug: "ga4-account-property-data-stream-find-all-properties"
---

# GA4 Account vs Property vs Data Stream: Find Every Property

A GA4 account holds properties, and a property holds data streams. To find every property you have, open the menu in the top-left corner of Analytics and look through each account. If a property is missing, the cause is almost always access: you are signed in with the wrong Google account, or nobody gave you permission on that property.

## The hierarchy in plain words

GA4 has three levels. Google's help pages describe them like this.

### Account

An account is a collection of properties whose data is owned by a single legal entity. It is the top level. Most small site owners have one or two accounts. Google suggests creating separate accounts only when data must be owned by distinct legal entities.

### Property

A property sits inside an account and represents one user base. Data you want to analyze together, such as one product or one brand, belongs in one property. Reports, audiences and settings all live at the property level. This is why GA4 shows one property at a time.

### Data stream

A data stream lives inside a property. It is the source of data from a website or an app. Each stream carries data from one website or app. Google recommends keeping it simple: one web stream, plus one iOS and one Android stream if you have apps. An app stream can only be linked to one GA4 property.

So the picture is:

- Account
  - Property A
    - Web data stream
    - iOS app stream
  - Property B
    - Web data stream

If you run five separate websites, the clean setup is five properties, each with one web stream. If you put five sites into one property as five streams, you can no longer see them separately in the standard reports without filtering.

## How to list your properties in the GA4 interface

1. Open Google Analytics and click the menu in the top-left corner.
2. If your account is part of an organization, select the organization first. If not, choose **All accounts**.
3. Under **Analytics Accounts**, pick an account.
4. Under **Properties & Apps**, you see the properties in that account that you have permission to open.
5. Repeat for each account.

The menu shows only what you are allowed to see. That explains most "missing property" questions.

## How to list them with the Admin API

If you have many accounts, clicking through is slow. The Google Analytics Admin API has a call named `accountSummaries.list`:

```
GET https://analyticsadmin.googleapis.com/v1beta/accountSummaries
```

It needs the `analytics.readonly` scope (or `analytics.edit`). Google's documentation describes the result as summaries of all accounts the caller can access, each with its child properties. For each property you get its resource name, display name, property type and whether you can edit it.

Results are paged. The default is 50 per page and the maximum is 200, so if you have a lot of accounts, follow the `nextPageToken` until it is empty. Tools that discover properties automatically use this call.

## Why a property seems to be missing

### You are signed in with a different Google account

This is the most common reason. Access belongs to a Google account. If a client added your work address and you are signed in with your personal Gmail, the property will not show up. Check the avatar in the top-right corner, and switch accounts.

The same applies to any tool that signs in with Google. It sees the properties of the account you sign in with, not the properties of your other accounts. Sign in once per Google account.

### Access was given only at property level

Users can be added at the account level or the property level. An account-level user can open every property in the account. A property-level user can open only that one. If someone gave you access to a single property, you will see that property and nothing else in the account.

Permissions also expand as you go down the hierarchy. You cannot give someone fewer permissions on a property than they have at account level. If you are an Editor on the account, you are an Editor on every property in it.

### The property is in another organization

The top-left menu asks you to select an organization first. A property in a different organization will not show up under the one you picked. Go back and select the other one, or choose **All accounts** if you have no organization.

### Your access was removed or never accepted

Someone with the Administrator role at the right level has to add you. Deleting a user also needs the Administrator role at the account level. If a property used to be there and is gone, ask the account owner whether your access was removed.

### The list is longer than one page

If you use the API and see fewer properties than you expect, check that you followed `nextPageToken`. The first page holds 50 entries by default.

### The property is a different type

Only Universal Analytics properties had a **Views** column. GA4 properties have no views. If you are searching for an old Universal Analytics property, it will not appear in a GA4 list the same way.

## A quick checklist

1. Which Google account am I signed in with?
2. Did I select the right organization, or **All accounts**?
3. Was I given access at account level or only property level?
4. If I use the API, did I read every page of results?
5. Can the account owner confirm my email address is listed under access management?

## One more option

If you want all your properties on one screen once you have sorted out access, a dashboard can do that. StatPilot signs in with Google, calls the same account summaries endpoint, and lists every property that account can access. It is read-only. It shows sessions, users, pageviews and bounce rate per property, with a change versus the previous period. It is free for your 3 busiest sites, and a one-time payment of $19 covers all your sites.

[Try StatPilot free](https://statpilot.mom)
