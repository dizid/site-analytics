<script setup lang="ts">
import { formatNumber, formatBounceRate, formatDuration } from '../lib/formatters'

defineProps<{
  totalSessions: number
  totalUsers: number
  avgBounceRate: number
  avgDuration: number
  isLoading: boolean
}>()
</script>

<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
    <!-- Total Sessions -->
    <div class="bg-surface-card p-3 rounded-lg border border-border border-l-2 border-l-accent">
      <p class="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Total Sessions</p>
      <h3 v-if="!isLoading" class="text-xl font-bold tabular-nums">{{ formatNumber(totalSessions) }}</h3>
      <div v-else class="h-7 w-16 bg-white/[0.06] rounded animate-pulse"></div>
    </div>

    <!-- Total Users -->
    <div class="bg-surface-card p-3 rounded-lg border border-border border-l-2 border-l-cyan-400">
      <p class="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Total Users</p>
      <h3 v-if="!isLoading" class="text-xl font-bold tabular-nums">{{ formatNumber(totalUsers) }}</h3>
      <div v-else class="h-7 w-16 bg-white/[0.06] rounded animate-pulse"></div>
    </div>

    <!-- Avg Bounce Rate -->
    <div class="bg-surface-card p-3 rounded-lg border border-border border-l-2 border-l-amber-400">
      <p class="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Bounce Rate</p>
      <h3 v-if="!isLoading" class="text-xl font-bold tabular-nums">{{ formatBounceRate(avgBounceRate) }}</h3>
      <div v-else class="h-7 w-16 bg-white/[0.06] rounded animate-pulse"></div>
    </div>

    <!-- Avg Duration -->
    <div class="bg-surface-card p-3 rounded-lg border border-border border-l-2 border-l-emerald-400">
      <p class="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Avg Session</p>
      <h3 v-if="!isLoading" class="text-xl font-bold tabular-nums">{{ formatDuration(avgDuration) }}</h3>
      <div v-else class="h-7 w-16 bg-white/[0.06] rounded animate-pulse"></div>
    </div>
  </div>
</template>
