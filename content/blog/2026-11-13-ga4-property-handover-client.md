---
title: "Handing a GA4 Property to a Client (or Taking One Over)"
date: 2026-11-13
author: "StatPilot"
description: "Who should own a client's GA4 property, and how to hand it over: move the property, share access, or make the client an Administrator. What moves along, what blocks a move, and how to step back."
tags: ["ga4", "analytics", "agencies", "access management", "client handover"]
slug: "ga4-property-handover-client"
---

# Handing a GA4 Property to a Client (or Taking One Over)

You built a client's site and set up Google Analytics in your own account, because that was quickest. Now the project ends, the client wants their data, or a new agency takes over. Or you are the new agency and the old one still holds the keys. This guide covers who should own a GA4 property, the three ways to hand one over, what moves along, what blocks a move, and how to step back cleanly.

## The short answer

- **The client should own the account.** Google describes an Analytics account as a collection of properties "whose data is owned by a single legal entity", and recommends one account per company.
- **Best at the start:** the client creates the account, then adds you as a user. Nothing has to move later.
- **Already in your account?** Move the property into the client's account. Data, settings, data streams and the measurement ID move along, so the site doesn't need new tags.
- **Moving needs Administrator and Editor roles on both accounts.** In practice the client adds you to their account first.
- **Afterwards,** the client's Administrator decides who keeps access. You can stay on as a Viewer or be removed.

## Who should own a GA4 property?

GA4 has three levels: an optional organization, then accounts, then properties. A property represents one website and/or app. Google's account-structure page describes an account as a collection of properties whose data "is owned by a single legal entity" and gives the general recommendation of "one account per company and one property per brand or business unit."

For a freelancer or agency, that points one way: a client's property belongs in an account that the client controls. Your own account is the right home for your own sites, not for someone else's data. It also protects you: if the relationship ends badly, nobody can claim you are holding their data hostage.

GA4 has no separate "owner" role. Control comes from the **Administrator** role, which Google describes as "full control of Analytics". Only an Administrator can add or remove users and assign roles.

## The three ways to hand over a property

### 1. The client owns the account, you get access (best)

The client (or you, sitting next to them) creates the Analytics account with the client's Google account and creates the property inside it. Then the client adds you:

1. In Admin, under Account or Property, open **Access management**.
2. Click **+**, then **Add users**.
3. Enter the email address of your Google account. Google only allows addresses that are registered as a Google account or Google Workspace account.
4. Pick a role, add data restrictions if needed, and click **Add**.

Access at the **account** level covers every property in that account; access at the **property** level covers that property only. For build and setup work you need **Editor** ("full control of settings at the property level"). For reporting only, **Viewer** is enough: it "can see settings and data". If you'll add other people yourself, you need Administrator.

When the project ends there is nothing to move. The client lowers or removes your role.

### 2. Move the property into the client's account

If the property already lives in your account, GA4 can move it to another account. In Admin, under Property, open **Property details** and choose **Move property**, pick the destination account, choose how permissions should work, then confirm and save.

What Google says moves with the property:

- The tag ID (for example `G-123ABC`). The site keeps sending data to the same ID, so you don't touch the site's code.
- Property settings and data streams.
- Reporting data. It is "moved (not copied)", so it no longer sits in your account afterwards.
- Linked products such as Google Ads and integrations such as BigQuery stay linked.

What stays behind: the property's change history from before the move stays in the source account. Changes made after the move show up in the destination account.

You choose one of two permission options:

- **Keep existing property permissions:** the people who had access to the property keep it, and it doesn't inherit the destination account's users.
- **Replace with the destination account's permissions:** the property's own permissions are replaced, and it inherits the permissions of the client's account.

**Who can do it:** Google's move page says you need "the Administrator and Editor roles for both the source and destination accounts." So the usual order is: the client adds your Google account as Administrator on their account, you do the move, then the client removes or lowers your role.

**What blocks a move,** per Google:

- The two accounts belong to different Google Marketing Platform organizations, or the destination has an organization and the source doesn't.
- It's a 360 property whose account link to the organization isn't verified.
- You don't have Administrator and Editor roles on the destination account.
- The property is linked to Google Ad Manager.
- Unsampled reports are still processing for the property.
- The destination account already has the maximum number of properties.
- Subproperties and roll-up properties have their own rules: a property with subproperties can't move until they're removed, and a subproperty can't be moved at all.

### 3. Make the client an Administrator in your account (weakest)

You can add the client's Google account as Administrator on the property, or on your whole account. They get full control, but the data still sits in an account you own, and account-level access would also show them your other clients. Use it as a stopgap only, with property-level access, and plan a move.

## Stepping back after the handover

Once the property sits in the client's account, the client's Administrator manages access:

- **Keep you on** for ongoing work: Viewer for reporting, Editor if you still change settings.
- **Remove you** in Access management when the work is done.

One rule to know: the last user with the Administrator role can't delete themselves. Make sure the client has Administrator access before you try to remove your own.

If your old account has no properties left after the move, you can delete it; Google notes that an empty account still counts against the maximum number of Analytics accounts you can have.

## Taking over a property from someone else

If you are the new agency, ask the client for access to their account, not for a login to the old agency's account. Two common situations:

- **The client's account, old agency still on it:** the client's Administrator adds you and removes the old agency. Ask for the change history (Admin, under Property: Property change history; it needs the Editor role) to see what was set up and when.
- **The property sits in the old agency's account:** ask them to move it into an account the client owns (option 2 above). The client needs to add the old agency's Google account to their account first so the move can happen.
- **Nobody with Administrator access can be reached:** Google has an ownership recovery process; see [GA4 property not showing? How to check and fix access](/blog/ga4-property-not-showing-access/), which also covers properties that seem to be missing.

## If you look after many client sites

A clean handover doesn't have to cost you the overview. If the client keeps you on as a Viewer, the property still shows up in tools that read every property your Google account can access. [StatPilot](https://statpilot.mom) works that way: it lists the GA4 properties your Google account can read, from any account, on one screen, so client properties in client-owned accounts sit next to your own sites. When a client removes your access, that site simply drops off your list.

## Checklist

1. Is the property in an account owned by the client's business?
2. If not: has the client added your Google account as Administrator on their account?
3. Did you pick the right permission option (keep or replace) before moving?
4. Any blockers: Google Ad Manager link, unsampled reports, subproperties, organization mismatch?
5. After the move: does the client have Administrator access?
6. Has your role been lowered to what the ongoing work needs, or removed?
7. Is your old account empty, and do you want to delete it?

## Sources

- [Move a property](https://support.google.com/analytics/answer/9305872) (Analytics Help)
- [Google Analytics account structure](https://support.google.com/analytics/answer/9679158) (Analytics Help)
- [Google Analytics hierarchy](https://support.google.com/analytics/answer/9303323) (Analytics Help)
- [Access and data-restriction management](https://support.google.com/analytics/answer/9305587) (Analytics Help)
- [Add, edit, and delete Analytics users and user groups](https://support.google.com/analytics/answer/9305788) (Analytics Help)
- [View the history of account/property changes](https://support.google.com/analytics/answer/9305465) (Analytics Help)

StatPilot is in early access: sign-in is open to invited testers for now, free for up to 3 properties. Want an invite? Email [hello@dizid.com](mailto:hello@dizid.com?subject=StatPilot%20early%20access). More about the dashboard: [statpilot.mom](https://statpilot.mom)
