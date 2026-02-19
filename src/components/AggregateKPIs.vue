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
  <div class="grid grid-cols-2 gap-3 mb-6">
    <!-- Total Sessions -->
    <div class="bg-surface-card p-4 rounded-xl border border-border">
      <p class="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Total Sessions</p>
      <h3 v-if="!isLoading" class="text-2xl font-bold">{{ formatNumber(totalSessions) }}</h3>
      <div v-else class="h-8 w-20 bg-white/[0.06] rounded animate-pulse"></div>
    </div>

    <!-- Total Users -->
    <div class="bg-surface-card p-4 rounded-xl border border-border">
      <p class="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Total Users</p>
      <h3 v-if="!isLoading" class="text-2xl font-bold">{{ formatNumber(totalUsers) }}</h3>
      <div v-else class="h-8 w-20 bg-white/[0.06] rounded animate-pulse"></div>
    </div>

    <!-- Avg Bounce Rate -->
    <div class="bg-surface-card p-4 rounded-xl border border-border">
      <p class="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Bounce Rate</p>
      <h3 v-if="!isLoading" class="text-2xl font-bold">{{ formatBounceRate(avgBounceRate) }}</h3>
      <div v-else class="h-8 w-20 bg-white/[0.06] rounded animate-pulse"></div>
    </div>

    <!-- Avg Duration -->
    <div class="bg-surface-card p-4 rounded-xl border border-border">
      <p class="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Avg Session</p>
      <h3 v-if="!isLoading" class="text-2xl font-bold">{{ formatDuration(avgDuration) }}</h3>
      <div v-else class="h-8 w-20 bg-white/[0.06] rounded animate-pulse"></div>
    </div>
  </div>
</template>
