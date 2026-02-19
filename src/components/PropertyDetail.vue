<script setup lang="ts">
/**
 * PropertyDetail.vue
 * Master-detail view for a single GA4 property.
 * Shows overview metrics (from property) plus detailed breakdowns
 * (pages, devices, countries) fetched on demand.
 */

import { computed, type DeepReadonly } from 'vue'
import type { PropertyResult, PropertyDetail } from '../types/analytics'
import StatBadge from './StatBadge.vue'
import Sparkline from './Sparkline.vue'
import { formatNumber, formatBounceRate, formatDuration } from '../lib/formatters'

const props = defineProps<{
  property: DeepReadonly<PropertyResult> | PropertyResult
  detail: DeepReadonly<PropertyDetail> | PropertyDetail | null
  isLoading: boolean
  error: string | null
}>()

const emit = defineEmits<{ back: [] }>()

/** Sessions trend values from daily metrics. */
const trendData = computed<number[]>(() => {
  if (!props.property.metrics?.trend) return []
  return props.property.metrics.trend.map((d) => d.sessions)
})

/** Top 5 traffic sources. */
const topSources = computed(() =>
  props.property.sources.slice(0, 5)
)

/** Total sessions across all devices for percentage calculation. */
const totalDeviceSessions = computed((): number => {
  if (!props.detail?.devices) return 0
  let total = 0
  for (const d of props.detail.devices) total += d.sessions
  return total
})

/** Device color mapping. */
const deviceColors: Record<string, string> = {
  desktop: 'bg-blue-400',
  mobile: 'bg-green-400',
  tablet: 'bg-purple-400',
}

function getDeviceColor(device: string): string {
  return deviceColors[device.toLowerCase()] ?? 'bg-white/20'
}

function getDevicePercentage(sessions: number): number {
  if (totalDeviceSessions.value === 0) return 0
  return (sessions / totalDeviceSessions.value) * 100
}
</script>

<template>
  <div class="space-y-4">

    <!-- Header bar -->
    <div class="bg-surface-card border border-border rounded-2xl p-5">
      <div class="flex items-center gap-3">
        <!-- Back button -->
        <button
          class="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
          aria-label="Back to dashboard"
          @click="emit('back')"
        >
          <svg class="w-5 h-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <div class="min-w-0">
          <a
            v-if="property.websiteUrl"
            :href="property.websiteUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-lg font-semibold text-text-primary hover:text-text-primary transition-colors truncate flex items-center gap-1.5 group"
          >
            {{ property.displayName }}
            <svg class="w-3.5 h-3.5 text-text-muted group-hover:text-text-secondary flex-shrink-0 transition-colors" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3.5h-2.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <path d="M10 2.5h3.5v3.5M14 2l-5.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>
          <h2
            v-else
            class="text-lg font-semibold text-text-primary truncate"
          >
            {{ property.displayName }}
          </h2>
        </div>
      </div>
    </div>

    <!-- Overview metrics (always available from property.metrics) -->
    <template v-if="property.metrics">
      <div class="bg-surface-card border border-border rounded-2xl p-5">
        <!-- Stats grid: 2 columns x 3 rows -->
        <div class="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
          <StatBadge label="Sessions" :value="formatNumber(property.metrics.sessions)" />
          <StatBadge label="Users" :value="formatNumber(property.metrics.activeUsers)" />
          <StatBadge label="New Users" :value="formatNumber(property.metrics.newUsers)" />
          <StatBadge label="Pageviews" :value="formatNumber(property.metrics.screenPageViews)" />
          <StatBadge label="Bounce Rate" :value="formatBounceRate(property.metrics.bounceRate)" />
          <StatBadge label="Avg Duration" :value="formatDuration(property.metrics.averageSessionDuration)" />
        </div>

        <!-- Sparkline: sessions trend -->
        <div class="h-10 w-full mb-3">
          <Sparkline :data="trendData" color="#2d8cf0" />
        </div>

        <!-- Traffic source badges -->
        <div v-if="topSources.length > 0" class="flex flex-wrap gap-2">
          <span
            v-for="source in topSources"
            :key="source.channel"
            class="bg-surface-card-hover border border-border rounded-lg px-2.5 py-0.5 text-xs text-text-secondary truncate max-w-[160px]"
          >
            {{ source.channel }}
            <span class="text-text-muted tabular-nums ml-1">{{ formatNumber(source.sessions) }}</span>
          </span>
        </div>
      </div>
    </template>

    <!-- Detail sections: loading / error / data -->

    <!-- Loading skeleton for detail data -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="bg-surface-card border border-border rounded-2xl p-5">
        <div class="animate-pulse">
          <div class="h-3 bg-white/[0.06] rounded w-24 mb-4" />
          <div class="space-y-2">
            <div v-for="j in 4" :key="j" class="h-4 bg-white/[0.06] rounded" :class="j % 2 === 0 ? 'w-4/5' : 'w-full'" />
          </div>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-surface-card border border-border rounded-2xl p-5">
      <p class="text-sm text-danger mb-3">{{ error }}</p>
      <button
        class="text-xs text-accent hover:text-accent/80 transition-colors"
        @click="emit('back')"
      >
        Go back
      </button>
    </div>

    <!-- Detail data loaded -->
    <template v-else-if="detail">

      <!-- Top Pages -->
      <div class="bg-surface-card border border-border rounded-2xl p-5">
        <h3 class="text-xs font-semibold text-text-muted uppercase tracking-widest border-b border-border pb-2 mb-4">Top Pages</h3>

        <div v-if="detail.pages.length === 0" class="text-sm text-text-muted">No page data available</div>

        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left text-xs text-text-muted font-medium pb-2">Page Path</th>
              <th class="text-right text-xs text-text-muted font-medium pb-2">Views</th>
              <th class="text-right text-xs text-text-muted font-medium pb-2">Bounce Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="page in detail.pages.slice(0, 10)"
              :key="page.pagePath"
              class="border-b border-border last:border-b-0 even:bg-white/[0.015]"
            >
              <td class="py-2 pr-4 text-text-primary truncate max-w-[200px]" :title="page.pagePath">
                {{ page.pagePath }}
              </td>
              <td class="py-2 text-right text-text-primary tabular-nums">
                {{ formatNumber(page.pageviews) }}
              </td>
              <td class="py-2 text-right text-text-primary tabular-nums">
                {{ formatBounceRate(page.bounceRate) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Devices -->
      <div class="bg-surface-card border border-border rounded-2xl p-5">
        <h3 class="text-xs font-semibold text-text-muted uppercase tracking-widest border-b border-border pb-2 mb-4">Devices</h3>

        <div v-if="detail.devices.length === 0" class="text-sm text-text-muted">No device data available</div>

        <template v-else>
          <!-- Stacked bar -->
          <div class="flex h-2.5 rounded-lg overflow-hidden mb-3">
            <div
              v-for="device in detail.devices"
              :key="device.device"
              :class="getDeviceColor(device.device)"
              :style="{ width: getDevicePercentage(device.sessions) + '%' }"
            />
          </div>

          <!-- Device labels -->
          <div class="flex flex-wrap gap-4">
            <div v-for="device in detail.devices" :key="device.device" class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :class="getDeviceColor(device.device)" />
              <span class="text-sm text-text-primary capitalize">{{ device.device }}</span>
              <span class="text-sm text-text-muted tabular-nums">{{ formatNumber(device.sessions) }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- Top Countries -->
      <div class="bg-surface-card border border-border rounded-2xl p-5">
        <h3 class="text-xs font-semibold text-text-muted uppercase tracking-widest border-b border-border pb-2 mb-4">Top Countries</h3>

        <div v-if="detail.countries.length === 0" class="text-sm text-text-muted">No country data available</div>

        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left text-xs text-text-muted font-medium pb-2">Country</th>
              <th class="text-right text-xs text-text-muted font-medium pb-2">Sessions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="country in detail.countries.slice(0, 10)"
              :key="country.country"
              class="border-b border-border last:border-b-0 even:bg-white/[0.015]"
            >
              <td class="py-2 text-text-primary">{{ country.country }}</td>
              <td class="py-2 text-right text-text-primary tabular-nums">
                {{ formatNumber(country.sessions) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </template>

  </div>
</template>
