<script setup lang="ts">
/**
 * StatBadge.vue
 * Compact single-metric display with optional trend indicator.
 */

defineProps<{
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
}>()
</script>

<template>
  <div class="flex flex-col gap-0.5 min-w-0">
    <!-- Label -->
    <span class="text-xs text-text-secondary truncate leading-none">
      {{ label }}
    </span>

    <!-- Value + trend indicator -->
    <div class="flex items-center gap-1">
      <span class="text-lg font-semibold text-text-primary leading-tight truncate">
        {{ value }}
      </span>

      <!-- Up trend: green arrow -->
      <svg
        v-if="trend === 'up'"
        role="img"
        class="w-3 h-3 text-success flex-shrink-0"
        viewBox="0 0 12 12"
        fill="none"
        aria-label="Trending up"
      >
        <path
          d="M6 9.5V2.5M6 2.5L2.5 6M6 2.5L9.5 6"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>

      <!-- Down trend: red arrow -->
      <svg
        v-else-if="trend === 'down'"
        role="img"
        class="w-3 h-3 text-danger flex-shrink-0"
        viewBox="0 0 12 12"
        fill="none"
        aria-label="Trending down"
      >
        <path
          d="M6 2.5V9.5M6 9.5L2.5 6M6 9.5L9.5 6"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  </div>
</template>
