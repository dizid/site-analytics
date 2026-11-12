---
title: "Exclude Internal Traffic in GA4 and Check It Works"
date: 2026-11-14
author: "StatPilot"
description: "How to exclude internal traffic in GA4: define the IP rule, create the data filter, test it first, and repeat it on every property you run."
tags: ["ga4", "analytics", "internal traffic", "data filters", "multi-property"]
slug: "ga4-exclude-internal-traffic-check"
---

# Exclude Internal Traffic in GA4 and Check It Works

Your own visits to your own sites count in GA4 unless you filter them out. The setup has two parts, and the first lives on each web data stream. With ten sites, you do it ten times. Below: both parts, how to test before going live, and how to repeat the work on many properties.

## The short answer

- Part 1: define your internal traffic as a rule on the web data stream. It adds a `traffic_type` value to matching events. The default value is `internal`.
- Part 2: create an Internal Traffic data filter on the property. Start it in **Testing**, check it, then set it to **Active**.
- Filters are not retroactive. Google says they apply "from the point of creation forward" and "do not affect historical data."
- Excluded events are permanent. Google says an excluded event is "never processed and will never be available in Google Analytics or BigQuery."
- You can create up to 10 data filters per property.
- Plan to repeat the steps per property. Google's pages show no bulk option.

## Part 1: define internal traffic

You need the Editor role on the property. Google's [Filter out internal traffic](https://support.google.com/analytics/answer/10104470) page gives these steps:

1. In **Admin**, under **Data collection and modification**, open **Data streams**.
2. Click a web data stream, then **Configure tag settings**.
3. Click **Show more**, then **Define internal traffic**, then **Create**.
4. Enter a name for the rule.
5. Enter a `traffic_type` value. "internal" is the default, but you can enter another value, such as a location name.
6. Under IP address, choose a match type and enter the value.
7. Optionally click **Add condition**. Conditions are OR conditions, not AND.
8. Click **Create**.

The match types are:

- IP address equals (for example 172.16.1.1)
- IP address begins with (10.0.)
- IP address ends with (.255)
- IP address contains (.0.0.)
- IP address is in range, which needs CIDR notation (10.0.0.0/8)
- IP address matches regular expression

You can enter IPv4 or IPv6 addresses. Google says "CIDR-notation syntax is the same for IPv6 addresses," though its examples use IPv4.

One limit: you can't filter out internal traffic from app users. This works for web traffic only.

## Part 2: create the data filter

The rule defines what counts as internal. The filter does the excluding. Google's steps:

1. In **Admin**, under **Data collection and modification**, click **Data filters**.
2. Click **Create Filter** and choose **Internal Traffic**.
3. Enter a name. It must be unique in the property, start with a letter, use only letters, numbers, underscores and spaces, and be at most 40 characters.
4. Choose **Exclude**.
5. Choose a filter state.
6. Click **Create**.

The three states:

| State | What happens |
|---|---|
| Testing | Matching data is labeled with the "Test data filter name" dimension, so you can validate the filter. |
| Active | The filter is applied to incoming data. The changes are permanent. |
| Inactive | Analytics isn't evaluating the filter. |

Start with Testing.

## Check it in Testing first

A data filter can take 24 to 36 hours to apply, so don't judge it after five minutes. Then, as Google describes, build a free-form exploration:

- Technique: Free form
- Rows: Test data filter name and Event name
- Values: Event count
- Filter: Test data filter name contains the name of your filter

Now visit the site from an address that your rule covers. If events show up under the filter's name, the rule and the filter work together. If you see nothing after 36 hours, check the rule: the IP value, the match type, and which web data stream it sits on.

Set the filter to Active only when the test shows what you expect. If you only want to hide data from some reports, Google points to report filters instead, which don't remove anything.

## Developer traffic

If you or your developers work with debug mode, there is a second filter type. Google's [Filter out developer traffic](https://support.google.com/analytics/answer/13296662) page says it lets developers keep using DebugView while their activity stays out of your reports. You create it in the same place: **Data filters**, **Create Filter**, **Developer Traffic**. It has the same three states and the same 10-filter limit.

If more than one filter is active, Google's [Data filters](https://support.google.com/analytics/answer/13296761) page says active "Include only" filters are applied first as a group, then active "Exclude" filters in sequence.

## Doing this on many properties

The rule sits on a web data stream and the filter on a property, so each property needs both. Google's pages describe no way to copy them to other properties. So use a routine:

1. Write down your office and home IPs, or ranges in CIDR notation, once.
2. Use the same `traffic_type` value and the same filter name on every property. Then a Testing check looks the same everywhere.
3. Per property: define the rule on the web data stream, create the filter in Testing, note the date.
4. Come back after 36 hours, run the exploration, then set the filter to Active.
5. Keep a list of properties with the status of each: no rule, Testing, Active.

Remember the limit of 10 data filters per property. Internal and developer filters use two of them, and the hostname filter is a third type.

StatPilot reads your GA4 properties with the read-only scope. It shows the numbers side by side, but it can't change these settings for you. For the choice between one property and many, see [cross-domain vs separate properties](/blog/ga4-cross-domain-vs-separate-properties/); for other reasons totals don't match, see [why GA4 numbers differ between reports](/blog/ga4-numbers-differ-thresholds-other-row/).

## Checklist

1. Editor role on the property.
2. Web data stream, Configure tag settings, Define internal traffic: name, `traffic_type`, IP match type.
3. Admin, Data filters, Create Filter, Internal Traffic, Exclude, state Testing.
4. Wait 24 to 36 hours. Check with the free-form exploration.
5. Set to Active only when the test is right. It is permanent for new data.
6. Old data stays as it is.
7. Repeat on each property. Track which ones are done.

## Sources

- [Filter out internal traffic](https://support.google.com/analytics/answer/10104470) (Analytics Help)
- [Filter out developer traffic](https://support.google.com/analytics/answer/13296662) (Analytics Help)
- [Data filters](https://support.google.com/analytics/answer/13296761) (Analytics Help)

StatPilot is in early access: sign-in is open to invited testers for now, free for up to 3 properties. Want an invite? Email [hello@dizid.com](mailto:hello@dizid.com?subject=StatPilot%20early%20access). More about the dashboard: [statpilot.mom](https://statpilot.mom)
