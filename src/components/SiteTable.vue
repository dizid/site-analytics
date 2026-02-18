<script setup lang="ts">
/**
 * SiteTable.vue
 * Dense, sortable table view for all GA4 properties.
 * Horizontally scrollable on mobile.
 */

import type { PropertyResult, SortColumn, SortDirection } from '../types/analytics'
import { formatNumber, formatBounceRate, formatDuration } from '../lib/formatters'
import Sparkline from './Sparkline.vue'

const props = defineProps<{
  properties: PropertyResult[]
  sortColumn: SortColumn
  sortDirection: SortDirection
}>()

const emit = defineEmits<{
  sort: [column: SortColumn]
}>()

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

interface Column {
  key: SortColumn
  label: string
  align?: 'right'
}

const columns: Column[] = [
  { key: 'name', label: 'Name' },
  { key: 'sessions', label: 'Sessions', align: 'right' },
  { key: 'activeUsers', label: 'Users', align: 'right' },
  { key: 'newUsers', label: 'New Users', align: 'right' },
  { key: 'screenPageViews', label: 'Pageviews', align: 'right' },
  { key: 'bounceRate', label: 'Bounce Rate', align: 'right' },
  { key: 'averageSessionDuration', label: 'Duration', align: 'right' },
]

function getTrendData(property: PropertyResult): number[] {
  if (!property.metrics?.trend) return []
  return property.metrics.trend.map((d) => d.sessions)
}

// ---------------------------------------------------------------------------
// Sort helpers
// ---------------------------------------------------------------------------

function handleSort(column: SortColumn): void {
  emit('sort', column)
}

/** Returns the aria-sort attribute value for a given column header. */
function ariaSort(column: SortColumn): 'ascending' | 'descending' | 'none' {
  if (props.sortColumn !== column) return 'none'
  return props.sortDirection === 'asc' ? 'ascending' : 'descending'
}
</script>

<template>
  <!-- Horizontal scroll wrapper for mobile -->
  <div class="overflow-x-auto">
    <!-- Glass morphism wrapper -->
    <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl min-w-[640px]">
      <table class="w-full text-sm border-collapse">

        <!-- Sticky header -->
        <thead>
          <tr class="border-b border-white/10">
            <th
              v-for="col in columns"
              :key="col.key"
              scope="col"
              :aria-sort="ariaSort(col.key)"
              :class="[
                'px-4 py-3 font-medium text-text-secondary whitespace-nowrap select-none cursor-pointer hover:text-text-primary transition-colors',
                col.align === 'right' ? 'text-right' : 'text-left',
              ]"
              @click="handleSort(col.key)"
            >
              <span class="inline-flex items-center gap-1" :class="col.align === 'right' ? 'justify-end' : ''">
                {{ col.label }}

                <!-- Sort direction indicator for active column -->
                <svg
                  v-if="sortColumn === col.key"
                  class="w-3 h-3 text-accent flex-shrink-0"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <!-- Ascending: arrow up -->
                  <path
                    v-if="sortDirection === 'asc'"
                    d="M6 9V3M6 3L3 6M6 3L9 6"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <!-- Descending: arrow down -->
                  <path
                    v-else
                    d="M6 3V9M6 9L3 6M6 9L9 6"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </th>

            <!-- Extra column for the inline sparkline -->
            <th scope="col" class="px-4 py-3 text-right font-medium text-text-secondary whitespace-nowrap">
              Trend
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(property, idx) in properties"
            :key="property.propertyId"
            :class="[
              'border-b border-white/5 transition-colors hover:bg-white/[0.04]',
              idx % 2 === 1 ? 'bg-white/[0.02]' : '',
            ]"
          >
            <!-- Error row: spans all metric columns -->
            <template v-if="property.error || !property.metrics">
              <td class="px-4 py-3 font-medium text-text-primary whitespace-nowrap">
                {{ property.displayName }}
              </td>
              <td :colspan="columns.length" class="px-4 py-3 text-xs text-danger">
                {{ property.error ?? 'Failed to load metrics' }}
              </td>
            </template>

            <!-- Normal data row -->
            <template v-else>
              <td class="px-4 py-3 font-medium text-text-primary whitespace-nowrap">
                {{ property.displayName }}
              </td>
              <td class="px-4 py-3 text-right text-text-primary tabular-nums">
                {{ formatNumber(property.metrics.sessions) }}
              </td>
              <td class="px-4 py-3 text-right text-text-primary tabular-nums">
                {{ formatNumber(property.metrics.activeUsers) }}
              </td>
              <td class="px-4 py-3 text-right text-text-primary tabular-nums">
                {{ formatNumber(property.metrics.newUsers) }}
              </td>
              <td class="px-4 py-3 text-right text-text-primary tabular-nums">
                {{ formatNumber(property.metrics.screenPageViews) }}
              </td>
              <td class="px-4 py-3 text-right text-text-primary tabular-nums">
                {{ formatBounceRate(property.metrics.bounceRate) }}
              </td>
              <td class="px-4 py-3 text-right text-text-primary tabular-nums">
                {{ formatDuration(property.metrics.averageSessionDuration) }}
              </td>
              <!-- Inline sparkline -->
              <td class="px-4 py-3">
                <div class="w-20 h-6 ml-auto">
                  <Sparkline :data="getTrendData(property)" color="#6366f1" :width="80" :height="24" />
                </div>
              </td>
            </template>
          </tr>

          <!-- Empty state -->
          <tr v-if="properties.length === 0">
            <td :colspan="columns.length + 1" class="px-4 py-8 text-center text-text-muted text-sm">
              No properties to display
            </td>
          </tr>
        </tbody>

      </table>
    </div>
  </div>
</template>
