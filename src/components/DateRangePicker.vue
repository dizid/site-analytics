<script setup lang="ts">
/**
 * DateRangePicker.vue
 * Full-width pill bar date range selector: 7d / 30d / 90d.
 * Fully compatible with v-model via modelValue / update:modelValue.
 */

import type { DateRange } from '../types/analytics'

const props = defineProps<{
  modelValue: DateRange
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DateRange]
}>()

/** All available range options with display labels. */
const options: { value: DateRange; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
]

function select(range: DateRange): void {
  if (range !== props.modelValue) {
    emit('update:modelValue', range)
  }
}
</script>

<template>
  <div class="flex gap-1 bg-surface-card/60 border border-border p-1 rounded-xl" role="group" aria-label="Date range">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :class="[
        'flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer',
        modelValue === option.value
          ? 'bg-accent text-white shadow-sm'
          : 'text-text-muted hover:text-text-secondary',
      ]"
      :aria-pressed="modelValue === option.value"
      @click="select(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
