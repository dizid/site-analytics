<script setup lang="ts">
/**
 * DeltaBadge.vue
 * Small colored "+12%" / "−3.5 pts" indicator comparing to the previous period.
 * Renders nothing when there is no meaningful comparison.
 */

import { computed } from 'vue'
import { computeDelta, formatDelta, type DeltaMode } from '../lib/compare'

const props = withDefaults(defineProps<{
  current: number
  /** Previous period value; null/undefined hides the badge. */
  previous?: number | null
  mode?: DeltaMode
  /** True when lower is better (e.g. bounce rate) — flips the colors. */
  invert?: boolean
}>(), {
  previous: null,
  mode: 'percent',
  invert: false,
})

const delta = computed<number | null>(() =>
  props.previous === null || props.previous === undefined
    ? null
    : computeDelta(props.current, props.previous, props.mode),
)

const label = computed(() => (delta.value === null ? '' : formatDelta(delta.value, props.mode)))

const colorClass = computed(() => {
  if (delta.value === null || label.value.startsWith('0')) return 'text-text-muted'
  const isGood = (delta.value > 0) !== props.invert
  return isGood ? 'text-success' : 'text-danger'
})
</script>

<template>
  <span
    v-if="delta !== null"
    :class="['text-[11px] font-semibold tabular-nums whitespace-nowrap', colorClass]"
    :title="'vs previous period'"
  >
    {{ label }}
  </span>
</template>
