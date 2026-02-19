<script setup lang="ts">
/**
 * Sparkline.vue
 * Pure SVG trend line component. No external dependencies.
 * Renders a polyline + filled area under it for a given data series.
 */

import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    data: number[]
    color?: string
    width?: number
    height?: number
  }>(),
  {
    color: '#2d8cf0',
    width: 120,
    height: 32,
  }
)

// Padding inside the viewBox so strokes aren't clipped at the edges
const PADDING = 2

/**
 * Map a value from the data domain [min, max] to SVG Y coordinate.
 * SVG Y-axis is inverted: 0 is top, height is bottom.
 */
function scaleY(value: number, min: number, max: number, h: number): number {
  const range = max - min
  if (range === 0) return h / 2 // Flat line — center vertically
  return PADDING + (1 - (value - min) / range) * (h - PADDING * 2)
}

/**
 * Map an index to SVG X coordinate across the full width.
 */
function scaleX(index: number, total: number, w: number): number {
  if (total === 1) return w / 2
  return PADDING + (index / (total - 1)) * (w - PADDING * 2)
}

/**
 * Compute all derived geometry from props.data.
 * Returns null when there is nothing to draw.
 */
const geometry = computed(() => {
  const { data, width: w, height: h } = props

  if (!data || data.length === 0) return null

  const min = Math.min(...data)
  const max = Math.max(...data)

  // Single point — render a centered dot
  if (data.length === 1) {
    return {
      type: 'dot' as const,
      cx: w / 2,
      cy: h / 2,
      r: 2.5,
    }
  }

  // Build polyline points string
  const points = data
    .map((value, i) => {
      const x = scaleX(i, data.length, w)
      const y = scaleY(value, min, max, h)
      return `${x},${y}`
    })
    .join(' ')

  // Build filled area polygon: polyline points + bottom-right + bottom-left
  const firstX = scaleX(0, data.length, w)
  const lastX = scaleX(data.length - 1, data.length, w)
  const bottom = h  // extend to full viewBox height for clean area fill
  const areaPoints = `${points} ${lastX},${bottom} ${firstX},${bottom}`

  return {
    type: 'line' as const,
    points,
    areaPoints,
  }
})


</script>

<template>
  <!-- Nothing to render -->
  <svg
    v-if="geometry"
    :viewBox="`0 0 ${width} ${height}`"
    :width="width"
    :height="height"
    preserveAspectRatio="none"
    class="w-full h-full"
    aria-hidden="true"
  >
    <!-- Single point dot -->
    <circle
      v-if="geometry.type === 'dot'"
      :cx="geometry.cx"
      :cy="geometry.cy"
      :r="geometry.r"
      :fill="color"
    />

    <!-- Multi-point: filled area + line -->
    <template v-else>
      <!-- Filled area under the line with low opacity -->
      <polygon
        :points="geometry.areaPoints"
        :fill="color"
        fill-opacity="0.08"
      />
      <!-- The trend line itself -->
      <polyline
        :points="geometry.points"
        :stroke="color"
        stroke-width="2"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </template>
  </svg>

  <!-- Empty state: render nothing (parent controls dimensions) -->
  <svg
    v-else
    :viewBox="`0 0 ${width} ${height}`"
    :width="width"
    :height="height"
    preserveAspectRatio="none"
    class="w-full h-full"
    aria-hidden="true"
  />
</template>
