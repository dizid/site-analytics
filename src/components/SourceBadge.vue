<script setup lang="ts">
/**
 * SourceBadge.vue
 * Tiny "GA4" / "Cloudflare" label, shown once Cloudflare sites are in the list.
 */

import { computed } from 'vue'
import type { DataSource } from '../types/analytics'

const props = defineProps<{
  /** Missing = GA4 */
  source?: DataSource
}>()

const isCloudflare = computed(() => props.source === 'cloudflare')
</script>

<template>
  <span
    :class="[
      'inline-flex items-center shrink-0 rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wider leading-tight',
      isCloudflare ? 'bg-orange-500/10 text-orange-400' : 'bg-accent/10 text-accent',
    ]"
  >
    {{ isCloudflare ? 'Cloudflare' : 'GA4' }}
  </span>
</template>
