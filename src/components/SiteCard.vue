<script setup lang="ts">
/**
 * SiteCard.vue
 * Property card with colored icon, name, mini sparkline, and 2-col metrics grid.
 * Matches DESIGN.md screen 4 pattern.
 */

import { computed } from 'vue'
import type { PropertyResult } from '../types/analytics'
import { formatNumber } from '../lib/formatters'
import Sparkline from './Sparkline.vue'

const props = defineProps<{
  property: PropertyResult
  index?: number
}>()

const emit = defineEmits<{
  select: [property: PropertyResult]
}>()

// ---------------------------------------------------------------------------
// Icon color cycling
// ---------------------------------------------------------------------------

const iconColors = ['blue', 'purple', 'emerald', 'orange', 'rose', 'cyan']
const defaultColor = { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6' }

const colorMap = new Map<string, { bg: string; text: string }>([
  ['blue', defaultColor],
  ['purple', { bg: 'rgba(168,85,247,0.1)', text: '#a855f7' }],
  ['emerald', { bg: 'rgba(16,185,129,0.1)', text: '#10b981' }],
  ['orange', { bg: 'rgba(249,115,22,0.1)', text: '#f97316' }],
  ['rose', { bg: 'rgba(244,63,94,0.1)', text: '#f43f5e' }],
  ['cyan', { bg: 'rgba(6,182,212,0.1)', text: '#06b6d4' }],
])

const iconStyle = computed(() => {
  const key = iconColors[(props.index ?? 0) % iconColors.length] ?? 'blue'
  const colors = colorMap.get(key) ?? defaultColor
  return {
    backgroundColor: colors.bg,
    color: colors.text,
  }
})

// ---------------------------------------------------------------------------
// Derived data
// ---------------------------------------------------------------------------

/** Sessions trend values extracted from the daily metrics array. */
const trendData = computed<number[]>(() => {
  if (!props.property.metrics?.trend) return []
  return props.property.metrics.trend.map((d) => d.sessions)
})

/** True when the property has a hard error and no metric data. */
const hasError = computed(() => Boolean(props.property.error))
</script>

<template>
  <!-- Solid dark card -->
  <div
    :class="[
      'bg-surface-card p-5 rounded-2xl shadow-sm border border-border transition-colors',
      hasError
        ? 'opacity-60'
        : 'hover:bg-surface-card-hover hover:border-border-hover cursor-pointer',
    ]"
    @click="property.metrics && emit('select', property)"
  >
    <!-- Top: icon + name + sparkline -->
    <div class="flex justify-between items-start mb-4">
      <div class="flex items-center gap-3 min-w-0">
        <!-- Colored icon -->
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          :style="iconStyle"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>
        <div class="min-w-0">
          <h2 class="font-bold text-[15px] leading-tight truncate">{{ property.displayName }}</h2>
          <p class="text-[11px] text-text-muted uppercase font-bold tracking-wider truncate">
            {{ property.websiteUrl || property.propertyId }}
          </p>
        </div>
      </div>
      <!-- Mini sparkline (top-right) -->
      <div v-if="!hasError && property.metrics" class="w-12 h-6 shrink-0 ml-3">
        <Sparkline :data="trendData" color="#137fec" :width="48" :height="24" />
      </div>
    </div>

    <!-- Error state -->
    <template v-if="hasError || !property.metrics">
      <p class="text-xs text-danger leading-snug">
        {{ property.error ?? 'Failed to load metrics' }}
      </p>
    </template>

    <!-- Bottom: 2-col metrics -->
    <template v-else>
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white/[0.03] p-3 rounded-xl">
          <p class="text-[10px] text-text-secondary font-bold uppercase mb-1">Total Users</p>
          <span class="text-lg font-bold">{{ formatNumber(property.metrics.activeUsers) }}</span>
        </div>
        <div class="bg-white/[0.03] p-3 rounded-xl">
          <p class="text-[10px] text-text-secondary font-bold uppercase mb-1">Sessions</p>
          <span class="text-lg font-bold">{{ formatNumber(property.metrics.sessions) }}</span>
        </div>
      </div>
    </template>
  </div>
</template>
