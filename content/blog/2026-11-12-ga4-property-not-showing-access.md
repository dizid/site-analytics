---
title: "GA4 Property Not Showing? How to Check and Fix Access"
date: 2026-11-12
author: "StatPilot"
description: "A GA4 property missing from your property picker or dashboard is usually an access issue. How GA4 roles work, the common causes, and how to fix each one."
tags: ["ga4", "analytics", "access management", "user roles", "troubleshooting"]
slug: "ga4-property-not-showing-access"
---

# GA4 Property Not Showing? How to Check and Fix Access

You open GA4, a report tool or a dashboard, and one of your sites is not in the list. The site has a tag and data is coming in, but the property is nowhere to be found. Most of the time, the cause is access: the Google account you signed in with has no role on that property, or you are looking in the wrong place. Below: how GA4 access works, the common causes with a fix for each, and a checklist.

## The short answer

- **You only see what your Google account can access.** Google Analytics shows the accounts and properties your email address is associated with.
- **The level matters.** A role at the account level applies to every property in that account. A role at the property level applies to that property only.
- **Viewer is enough to read data.** Viewer can see settings and data. Analyst, Marketer, Editor and Administrator all include the Viewer permissions.
- **Check the signed-in account.** With several Google accounts in one browser, it is easy to use the wrong one.
- **Universal Analytics is gone.** Properties with IDs like UA-000000-1 shut down in July 2024.
- **Only an Administrator can add you.** Ask whoever manages the account.

## How GA4 access works

Google Analytics has three levels: an optional organization, then accounts, then properties. An account is "a collection of properties whose data is owned by a single legal entity." A property represents a website and/or an app.

Users can be assigned at each level, and Google's hierarchy page spells out what you see:

- When you sign in, you have access to all the accounts and properties your email address is associated with.
- With permissions at the account level, you see all the properties in that account.
- With permissions for only some properties, you see only those properties.

Roles flow down. A role at the account level gives you the same role on every property in that account. If you hold roles at several levels, the most permissive one applies. An Administrator can give you more permissions at the property level than at the account level, but not fewer.

The roles, from Google's access management page:

| Role | What it allows |
|---|---|
| Administrator | Full control of Analytics. Can manage users and assign any role or data restriction. Includes Editor. |
| Editor | Full control of settings at the property level. Cannot manage users, but can view users across a property. Includes Analyst. |
| Marketer | Create, edit and delete audiences, events and key events. Import key events into Google Ads. Edit attribution-model settings. Includes Analyst. |
| Analyst | Share created explorations with other users of the property. Includes Viewer. |
| Viewer | See settings and data, change which data appears in reports, see shared assets in the interface or the APIs, and manage their own explorations. |
| None | No role for this resource. The user may have a role for another resource. |

An Administrator can also add two data restrictions: **No Cost Metrics** and **No Revenue Metrics**. They do not hide a property, they hide numbers. Restricted values show as 0 in reports, and Google enforces restrictions in the interface and in the matching API calls. If revenue reads 0 for you but not for a colleague, check for a restriction.

### Which role does a tool need?

A read-only tool works with the access of the Google account you sign in with. The Admin API method for listing properties, accountSummaries.list, "returns summaries of all accounts accessible by the caller" and accepts the read-only analytics.readonly scope. Viewer can see settings and data, and can see shared assets in the interface or the APIs. Google's own Data Studio connector, which reads GA4 through the Data API, needs at least Read & Analyze, the old name for Viewer ([Connect to Google Analytics](https://docs.cloud.google.com/data-studio/connect-to-google-analytics)). So Viewer is enough for a tool that only reads reports.

StatPilot works this way: after one Google sign-in, it finds every GA4 property that account can access, with read-only access. If a site is missing there, that Google account usually lacks access to it, and the fixes below apply. For other tools, see [GA4 multi-property dashboards compared](/blog/ga4-multi-property-dashboard-comparison-2026/).

## Common reasons a property is missing

### 1. You are signed in with another Google account

Google lets you sign in to several accounts at once and switch between them. Analytics users are identified by Google email addresses, either Gmail or Google Workspace. If a client added you@youragency.com and your browser is on your personal Gmail, the property will not show.

**Check and fix:** select your profile image or initial at the top right and look at the active account. Switch to the account the property was shared with. In a third-party tool, sign out and sign back in with that account.

### 2. You have property-level access only

If someone added you to one property, you see that property and nothing else in the account, while a colleague with account-level access sees all of them.

**Check and fix:** ask an Administrator at which level they added you. For all sites in one account, ask for a role at the account level.

### 3. The account is in a different organization

In the GA4 account and property picker, you select the organization first. Accounts that do not belong to an organization are listed under **All accounts**. Inside one organization, accounts from another one are not in the list.

**Check and fix:** select the property name in GA4. In the drop-down, pick the right collection of accounts. Then choose the account in the **Analytics Accounts** column and the property in the **Properties & Apps** column.

### 4. The client created it and never added you

A property in a client's account stays invisible to you until an Administrator adds your Google email address. Only Administrators can add users, and only email addresses registered as Google accounts can be added.

**Check and fix:** send the client the exact email address, the role (Viewer if you only read data), and the level (account or property). If nobody at the client has Administrator access anymore, Google has a recovery process: the owner proves ownership of the sites, for example with an analytics.txt file on the domain, then fills out Google's contact form.

### 5. It was a Universal Analytics property

Universal Analytics tracking codes start with "UA-", such as UA-000000-1. Standard UA properties stopped processing data on July 1, 2023. Starting the week of July 1, 2024, access to UA data, the UA interface and the API ended. Since then, accounts show only GA4 properties. API requests for UA properties fail, so API-based tools cannot show UA data either.

**Check and fix:** look for the GA4 property instead. Its property ID is numeric: in Admin, select the property, then Property Settings. From March 2023, Google auto-created GA4 properties for active standard UA properties unless the owner opted out.

If the property does show up but its numbers do not load, read [GA4 Data API quotas for multi-site dashboards](/blog/ga4-data-api-quotas-multi-site/) next.

## How to grant access

An Administrator gives a role at the account level, which covers every property in that account, like this:

1. In Admin, under Account, click **Account access management**.
2. Click **+**, then **Add users**.
3. Enter the email address for the person's Google Account or Google Workspace account.
4. Select the role and any data restrictions.
5. Click **Add**.

For one property only, use **Property access management** under Property. You need the Administrator role at the level where you add the user.

## Troubleshooting checklist

1. Which Google account is active, in GA4 and in the tool?
2. Was the property shared with that exact email address?
3. At which level? Property-level access shows only that property.
4. In the GA4 picker, are you in the right organization, or under All accounts?
5. Does the ID start with UA-? Find the GA4 property and its numeric ID.
6. Property visible, but revenue or cost reads 0? Check for data restrictions.
7. Nobody has Administrator access? Use Google's ownership recovery process.

## Sources

- [Access and data-restriction management](https://support.google.com/analytics/answer/9305587) (Analytics Help)
- [Add, edit, and delete Analytics users and user groups](https://support.google.com/analytics/answer/9305788) (Analytics Help)
- [Google Analytics hierarchy](https://support.google.com/analytics/answer/9303323) (Analytics Help)
- [Google Analytics account structure](https://support.google.com/analytics/answer/9679158) (Analytics Help)
- [Navigate to your account and property](https://support.google.com/analytics/answer/12813202) (Analytics Help)
- [Switch between accounts and properties](https://support.google.com/analytics/answer/10253796) (Analytics Help)
- [No one has administrative access](https://support.google.com/analytics/answer/15191460) (Analytics Help)
- [Google Analytics 4 has replaced Universal Analytics](https://support.google.com/analytics/answer/11583528) (Analytics Help)
- [Sign in to multiple accounts at once](https://support.google.com/accounts/answer/1721977) (Google Account Help)
- [accountSummaries.list](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accountSummaries/list) (Google Analytics Admin API)
- [Property ID](https://developers.google.com/analytics/devguides/reporting/data/v1/property-id) (Google Analytics Data API)
- [Data Studio: Connect to Google Analytics](https://docs.cloud.google.com/data-studio/connect-to-google-analytics)

StatPilot is in early access: sign-in is open to invited testers for now, free for up to 3 properties. Want an invite? Email [hello@dizid.com](mailto:hello@dizid.com?subject=StatPilot%20early%20access). More about the dashboard: [statpilot.mom](https://statpilot.mom)
