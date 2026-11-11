---
title: "GA4 Data Retention Settings: 2 vs 14 Months and What They Affect"
date: 2026-11-14
author: "StatPilot"
description: "GA4 data retention: 2 or 14 months on standard properties, what it does and doesn't affect, reset on new activity, and how to check it on many properties."
tags: ["ga4", "analytics", "data retention", "admin api", "multi-property"]
slug: "ga4-data-retention-settings"
---

# GA4 Data Retention Settings: 2 vs 14 Months and What They Affect

GA4 deletes user-level and event-level data after a period you choose. Your standard reports keep their history, but explorations and funnel reports can only use data that is still there. The setting lives on each property, so with a property per site you have many settings to check (see [cross-domain vs separate properties](/blog/ga4-cross-domain-vs-separate-properties/)). Below: the options, what the setting does and doesn't touch, the reset switch, and how to check it across properties.

## The short answer

- By default, Google Analytics properties [retain 2 months of data](https://support.google.com/analytics/answer/7579450).
- Standard properties can keep user-level and event data for 2 or 14 months. Analytics 360 can keep event data for up to 50 months.
- The setting "only affects explorations and funnel reports." Standard aggregated reports are not affected.
- Raising it applies to data you have not deleted yet. Data that is already deleted stays gone, so set it right after you create a property.
- "Reset user data on new activity" restarts the clock for a user with each new event from that user.
- Check it in Admin per property, or for many properties at once with the Admin API.

## The options

Google's [Data retention](https://support.google.com/analytics/answer/7667196) page lists two settings, one for user-level data and one for "all other event data":

| Data | Standard property | Analytics 360 property |
|---|---|---|
| User-level data | 2 or 14 months | 2 or 14 months |
| All other event data | 2 or 14 months | 2, 14, 26, 38 or 50 months |

The 26, 38 and 50 month options are "360 only." The Admin API says the same: those durations are "Available to 360 properties only" and "Available for event data only" ([DataRetentionSettings](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/DataRetentionSettings)). Google's [360 overview](https://support.google.com/analytics/answer/11202874) sums it up as "Up to 14 months" for standard and "Up to 50 months" for 360. Right after the user-level options, Google adds: "This retention period also applies to key events data."

The retention period applies to user-level and event-level data associated with cookies, user identifiers such as User-ID, and advertising identifiers such as DoubleClick cookies, Android's Advertising ID and Apple's IDFA.

Some limits apply whatever you choose:

- "The two-month retention period is always applied to age, gender, and interest data regardless of your settings."
- Google signals data is kept for at most 26 months, "regardless of your settings."
- "Google Ads data in Google Analytics is limited to a rolling 36-month window."
- "Large and XL properties are limited to 2 months." When a standard property becomes Large, or a 360 property becomes XL, event-level retention drops to 2 months automatically, and older event-level data "is permanently deleted." Google emails all property administrators when a property is on pace to reach the limits, and again when it reaches them.

## What it affects, and what it doesn't

Google is direct about this: "The data retention setting only affects explorations and funnel reports." It also says the setting "does not affect standard aggregated reports (including primary and secondary dimensions)," even when you add comparisons.

So on a property with 2 months, last year's sessions still show in the standard reports. What you lose is the ability to build an exploration or a funnel on data older than the retention period. That is one of the reasons the same question can get different answers in reports and explorations; see [why GA4 numbers differ between reports](/blog/ga4-numbers-differ-thresholds-other-row/).

## Reset user data on new activity

Next to the period there is a switch called **Reset user data on new activity**:

- **On:** each new event from a user resets the retention period of that user identifier, "thus setting the expiration date to current time plus retention period."
- **Off:** "Data associated with the user identifier will be deleted automatically after the retention period."

Google notes that "The reset feature applies to only user-level data." With the switch on, the data of returning visitors lives as long as they keep coming back. With it off, every user identifier has a fixed end date. Which one fits your privacy policy is your call, not a technical one.

## Why set it right after you create a property

The timing rules, all from Google's Data retention page:

- "When data reaches the end of the retention period, it is deleted automatically on a monthly basis."
- If you increase the period, "the change is applied to data that you have already collected and that you have not already deleted."
- "If you reduce the retention period, then any affected data is deleted during the next monthly process."
- "Whenever you modify the retention period, Analytics waits 24 hours before implementing the change." Within those 24 hours you can revert, and your data is unaffected.

Put together: a property left on the 2-month default deletes user-level and event data older than that every month. Raising the setting later keeps what is still there, but it cannot bring back what was already deleted. To have 14 months of exploration history a year from now, choose 14 months today.

## How to set it

You need the Editor role on the property.

1. In Google Analytics, click **Admin**.
2. Make sure you are in the right account and property.
3. Under **Data collection and modification**, click **Data retention**. (Google's Data retention page still describes the older layout: the Property column, then Data Settings, then Data Retention.)
4. Pick the retention period.
5. Turn **Reset user data on new activity** on or off.
6. Click **Save**.

## Checking many properties

In the interface, you repeat the steps above for every property. With ten or fifty sites, the [Google Analytics Admin API](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties/getDataRetentionSettings) is faster:

1. **List your properties.** [accountSummaries.list](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accountSummaries/list) "Returns summaries of all accounts accessible by the caller," with their properties. It returns up to 200 accounts per page.
2. **Read each property's setting.** `properties.getDataRetentionSettings` "Returns the singleton data retention settings for this property":

```
GET https://analyticsadmin.googleapis.com/v1beta/properties/{property}/dataRetentionSettings
```

Both methods accept the read-only `analytics.readonly` scope. The response is a DataRetentionSettings resource with the fields `eventDataRetention`, `userDataRetention` and `resetUserDataOnNewActivity`. The durations come back as values like `TWO_MONTHS` or `FOURTEEN_MONTHS`. Any property that shows `TWO_MONTHS` is on the short setting.

3. **Fix what needs fixing.** [properties.updateDataRetentionSettings](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties/updateDataRetentionSettings) is a PATCH on the same resource. It needs the `analytics.edit` scope and an `updateMask` listing the fields to change. "Omitted fields will not be updated."

A tool that only reads data can't change this setting for you. StatPilot, for example, signs in with the read-only scope: it finds every GA4 property your Google account can access and shows their traffic side by side, but leaves settings like this one alone. For the API limits that apply when you read many properties, see [GA4 Data API quotas for multi-site dashboards](/blog/ga4-data-api-quotas-multi-site/).

## A note on BigQuery

If you want raw events under your own control, GA4 also offers [BigQuery Export](https://support.google.com/analytics/answer/9358801). "When you export data to BigQuery, you own that data." Standard properties have a daily export limit of 1 million events, and after you link a project, [data should start flowing within 24 hours](https://support.google.com/analytics/answer/9823238).

## Checklist

1. Right after creating a property: Admin, Data collection and modification, Data retention. Choose the longest period your privacy policy allows: 14 months on a standard property.
2. Decide on Reset user data on new activity.
3. Check again after 24 hours, when the change takes effect.
4. For existing properties, raise the setting now. The new period applies to data not yet deleted.
5. Before lowering it, remember that affected data is deleted in the next monthly run. You have 24 hours to revert.
6. Expect age, gender and interest data to last 2 months, and Google signals data at most 26 months, whatever you choose.
7. Watch for Google's emails about Large or XL properties: retention drops to 2 months.
8. With many properties, audit them with accountSummaries.list and getDataRetentionSettings.

## Sources

- [Data retention](https://support.google.com/analytics/answer/7667196) (Analytics Help)
- [Get started with Explorations](https://support.google.com/analytics/answer/7579450) (Analytics Help)
- [Google Analytics 360 (Google Analytics 4 properties)](https://support.google.com/analytics/answer/11202874) (Analytics Help)
- [BigQuery Export](https://support.google.com/analytics/answer/9358801) (Analytics Help)
- [Set up BigQuery Export](https://support.google.com/analytics/answer/9823238) (Analytics Help)
- [DataRetentionSettings](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/DataRetentionSettings) (Google Analytics Admin API)
- [properties.getDataRetentionSettings](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties/getDataRetentionSettings) (Google Analytics Admin API)
- [properties.updateDataRetentionSettings](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties/updateDataRetentionSettings) (Google Analytics Admin API)
- [accountSummaries.list](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accountSummaries/list) (Google Analytics Admin API)

StatPilot is in early access: sign-in is open to invited testers for now, free for up to 3 properties. Want an invite? Email [hello@dizid.com](mailto:hello@dizid.com?subject=StatPilot%20early%20access). More about the dashboard: [statpilot.mom](https://statpilot.mom)
