<script setup lang="ts">
/**
 * SiteTable.vue
 * Cohesive table-style list view for all GA4 properties.
 * Sort props/emits retained for composable compatibility (sorting handled externally).
 */

import type { PropertyResult, SortColumn, SortDirection } from '../types/analytics'
import { formatNumber } from '../lib/formatters'
import Sparkline from './Sparkline.vue'

const props = defineProps<{
  properties: PropertyResult[]
  sortColumn: SortColumn
  sortDirection: SortDirection
}>()

const emit = defineEmits<{
  sort: [column: SortColumn]
  select: [property: PropertyResult]
}>()

function getTrendData(property: PropertyResult): number[] {
  if (!property.metrics?.trend) return []
  return property.metrics.trend.map((d) => d.sessions)
}
</script>

<template>
  <div class="bg-surface-card rounded-xl border border-border overflow-hidden">
    <div
      v-for="property in properties"
      :key="property.propertyId"
      :class="[
        'flex items-center justify-between py-3 px-4 border-b border-border last:border-b-0 transition-colors',
        property.metrics
          ? 'hover:bg-white/[0.02] cursor-pointer'
          : 'opacity-60',
      ]"
      @click="property.metrics && emit('select', property)"
    >
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <svg class="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>
        <div class="min-w-0">
          <h3 class="text-sm font-semibold truncate">{{ property.displayName }}</h3>
          <p class="text-[10px] text-text-muted uppercase tracking-wider truncate">
            {{ property.websiteUrl || property.propertyId }}
          </p>
        </div>
      </div>

      <!-- Error state -->
      <template v-if="property.error || !property.metrics">
        <p class="text-xs text-danger shrink-0 ml-3">
          {{ property.error ?? 'Failed to load' }}
        </p>
      </template>

      <!-- Metrics + sparkline -->
      <template v-else>
        <div class="flex items-center gap-4 shrink-0 ml-3">
          <div class="text-right hidden sm:block">
            <p class="text-sm font-bold tabular-nums">{{ formatNumber(property.metrics.activeUsers) }}</p>
            <p class="text-[10px] text-text-muted">users</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold tabular-nums">{{ formatNumber(property.metrics.sessions) }}</p>
            <p class="text-[10px] text-text-muted">sessions</p>
          </div>
          <div class="w-12 h-6">
            <Sparkline :data="getTrendData(property)" color="#2d8cf0" :width="48" :height="24" />
          </div>
        </div>
      </template>
    </div>

    <!-- Empty state -->
    <div v-if="properties.length === 0" class="text-center text-text-muted text-sm py-8">
      No properties to display
    </div>
  </div>
</template>
