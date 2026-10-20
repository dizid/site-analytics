<script setup lang="ts">
/**
 * CloudflareKPIs.vue
 * Portfolio totals for the Cloudflare Web Analytics sites — a separate row
 * below the GA4 KPIs, never mixed with them. Cloudflare visits are shown as
 * sessions, like everywhere else in the dashboard.
 */

import type { PeriodTotals } from '../types/analytics'
import { formatNumber } from '../lib/formatters'
import DeltaBadge from './DeltaBadge.vue'

defineProps<{
  totals: PeriodTotals
  /** Previous-period totals; null hides the deltas. */
  previous?: PeriodTotals | null
}>()
</script>

<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
    <!-- Total Sessions (Cloudflare visits) -->
    <div class="bg-surface-card p-3 rounded-lg border border-border border-l-2 border-l-orange-400">
      <p class="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Total Sessions</p>
      <div class="flex items-baseline gap-2">
        <h3 class="text-xl font-bold tabular-nums">{{ formatNumber(totals.sessions) }}</h3>
        <DeltaBadge :current="totals.sessions" :previous="previous?.sessions" />
      </div>
    </div>

    <!-- Total Pageviews -->
    <div class="bg-surface-card p-3 rounded-lg border border-border border-l-2 border-l-orange-400">
      <p class="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Total Pageviews</p>
      <div class="flex items-baseline gap-2">
        <h3 class="text-xl font-bold tabular-nums">{{ formatNumber(totals.screenPageViews) }}</h3>
        <DeltaBadge :current="totals.screenPageViews" :previous="previous?.screenPageViews" />
      </div>
    </div>
  </div>
</template>
