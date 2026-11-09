<script setup lang="ts">
/**
 * UpgradeCard.vue
 * Free plan: lists the sites that are hidden (name only) and links to the
 * one-time Stripe payment. Shown below the property list.
 */
import { computed } from 'vue'
import type { LockedProperty } from '../types/analytics'
import { FREE_PROPERTY_LIMIT, PRO_PRICE_LABEL, REFUND_DAYS } from '../lib/pricing'

const props = defineProps<{
  locked: readonly LockedProperty[]
  upgradeUrl: string | null
}>()

// Show a handful of names; the rest as "+N more"
const SHOWN_NAMES = 6
const shownNames = computed(() => props.locked.slice(0, SHOWN_NAMES))
const hiddenCount = computed(() => Math.max(0, props.locked.length - SHOWN_NAMES))
</script>

<template>
  <section
    class="bg-surface-card p-5 rounded-2xl border border-border border-t-2 border-t-accent"
    aria-labelledby="upgrade-heading"
  >
    <div class="flex items-start gap-3 mb-4">
      <!-- Lock icon -->
      <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-accent-glow text-accent">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <div class="min-w-0">
        <h2 id="upgrade-heading" class="font-bold text-sm leading-tight">
          {{ locked.length }} more {{ locked.length === 1 ? 'site' : 'sites' }} on your account
        </h2>
        <p class="text-xs text-text-secondary mt-1 leading-snug">
          The free plan shows your {{ FREE_PROPERTY_LIMIT }} busiest sites. See all of them on this page for a one-time {{ PRO_PRICE_LABEL }}.
        </p>
      </div>
    </div>

    <!-- The user's own hidden site names: no numbers -->
    <ul class="flex flex-wrap gap-2 mb-5" aria-label="Sites on the paid plan">
      <li
        v-for="site in shownNames"
        :key="site.displayName"
        class="text-xs text-text-muted bg-surface-elevated rounded-lg px-2.5 py-1 truncate max-w-full"
      >
        {{ site.displayName }}
      </li>
      <li v-if="hiddenCount > 0" class="text-xs text-text-muted px-1 py-1">+{{ hiddenCount }} more</li>
    </ul>

    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
      <a
        v-if="upgradeUrl"
        :href="upgradeUrl"
        class="inline-flex items-center justify-center rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-5 py-2.5 transition-colors"
      >
        See all my sites · {{ PRO_PRICE_LABEL }} once
      </a>
      <p class="text-[11px] text-text-muted leading-snug">
        One payment, no subscription. {{ REFUND_DAYS }}-day refund if it's not for you.
      </p>
    </div>
  </section>
</template>
