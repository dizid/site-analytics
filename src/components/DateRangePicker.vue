<script setup lang="ts">
/**
 * DateRangePicker.vue
 * Three-pill date range selector: 7d / 30d / 90d.
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
  <div class="flex items-center gap-1" role="group" aria-label="Date range">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :class="[
        'px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer',
        modelValue === option.value
          ? 'bg-accent text-white'
          : 'bg-white/5 text-text-secondary hover:bg-white/10',
      ]"
      :aria-pressed="modelValue === option.value"
      @click="select(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
