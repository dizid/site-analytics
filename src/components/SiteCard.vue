<script setup lang="ts">
/**
 * SiteCard.vue
 * Glass morphism card displaying all metrics for a single GA4 property.
 * Handles error state and null metrics gracefully.
 */

import { computed } from 'vue'
import type { PropertyResult } from '../types/analytics'
import { formatNumber, formatBounceRate, formatDuration } from '../lib/formatters'
import StatBadge from './StatBadge.vue'
import Sparkline from './Sparkline.vue'

const props = defineProps<{
  property: PropertyResult
}>()

// ---------------------------------------------------------------------------
// Derived data
// ---------------------------------------------------------------------------

/** Sessions trend values extracted from the daily metrics array. */
const trendData = computed<number[]>(() => {
  if (!props.property.metrics?.trend) return []
  return props.property.metrics.trend.map((d) => d.sessions)
})

/** Top 5 traffic sources to display as badges. */
const topSources = computed(() =>
  props.property.sources.slice(0, 5)
)

/** True when the property has a hard error and no metric data. */
const hasError = computed(() => Boolean(props.property.error))
</script>

<template>
  <!-- Glass morphism card -->
  <div
    :class="[
      'bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 transition-all',
      hasError
        ? 'opacity-60'
        : 'hover:bg-white/[0.08] hover:border-white/20',
    ]"
  >
    <!-- Property name header — clickable link if website URL available -->
    <h2 class="text-sm font-semibold text-text-primary truncate mb-3">
      <a
        v-if="property.websiteUrl"
        :href="property.websiteUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:text-accent transition-colors"
        :title="property.websiteUrl"
      >
        {{ property.displayName }}
        <svg class="inline w-3 h-3 ml-0.5 opacity-40" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3.5 1.5H10.5V8.5M10.5 1.5L1.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </a>
      <span v-else>{{ property.displayName }}</span>
    </h2>

    <!-- Error state: no metric data available -->
    <template v-if="hasError || !property.metrics">
      <p class="text-xs text-danger leading-snug">
        {{ property.error ?? 'Failed to load metrics' }}
      </p>
    </template>

    <!-- Metrics available -->
    <template v-else>
      <!-- Stats grid: 2 columns x 3 rows -->
      <div class="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
        <StatBadge
          label="Sessions"
          :value="formatNumber(property.metrics.sessions)"
        />
        <StatBadge
          label="Users"
          :value="formatNumber(property.metrics.activeUsers)"
        />
        <StatBadge
          label="New Users"
          :value="formatNumber(property.metrics.newUsers)"
        />
        <StatBadge
          label="Pageviews"
          :value="formatNumber(property.metrics.screenPageViews)"
        />
        <StatBadge
          label="Bounce Rate"
          :value="formatBounceRate(property.metrics.bounceRate)"
        />
        <StatBadge
          label="Avg Duration"
          :value="formatDuration(property.metrics.averageSessionDuration)"
        />
      </div>

      <!-- Sparkline: sessions trend over the selected date range -->
      <div class="h-8 w-full mb-3">
        <Sparkline :data="trendData" color="#6366f1" />
      </div>

      <!-- Traffic source badges -->
      <div v-if="topSources.length > 0" class="flex flex-wrap gap-1.5">
        <span
          v-for="source in topSources"
          :key="source.channel"
          class="bg-white/5 rounded-full px-2 py-0.5 text-xs text-text-secondary truncate max-w-[120px]"
        >
          {{ source.channel }}
        </span>
      </div>
    </template>
  </div>
</template>
