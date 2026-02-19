<script setup lang="ts">
/**
 * LoadingSkeleton.vue
 * Pulse skeleton card matching the SiteCard layout:
 * icon + name, full-width sparkline, 2x2 metric grid.
 */
</script>

<template>
  <div class="bg-surface-card rounded-2xl border border-border border-t-2 border-t-white/10 p-4">
    <div class="animate-pulse">

      <!-- Top: icon + name area -->
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-white/[0.06]" />
        <div>
          <div class="h-4 bg-white/[0.06] rounded-md w-32 mb-1.5" />
          <div class="h-2.5 bg-white/[0.06] rounded w-20" />
        </div>
      </div>

      <!-- Sparkline placeholder — full width -->
      <div class="h-10 w-full bg-white/[0.06] rounded mb-4" />

      <!-- 2x2 metric grid -->
      <div class="grid grid-cols-2 gap-2">
        <div class="bg-white/[0.03] p-2.5 rounded-lg">
          <div class="h-2.5 bg-white/[0.06] rounded w-12 mb-1.5" />
          <div class="h-5 bg-white/[0.06] rounded w-10" />
        </div>
        <div class="bg-white/[0.03] p-2.5 rounded-lg">
          <div class="h-2.5 bg-white/[0.06] rounded w-14 mb-1.5" />
          <div class="h-5 bg-white/[0.06] rounded w-12" />
        </div>
        <div class="bg-white/[0.03] p-2.5 rounded-lg">
          <div class="h-2.5 bg-white/[0.06] rounded w-16 mb-1.5" />
          <div class="h-5 bg-white/[0.06] rounded w-10" />
        </div>
        <div class="bg-white/[0.03] p-2.5 rounded-lg">
          <div class="h-2.5 bg-white/[0.06] rounded w-14 mb-1.5" />
          <div class="h-5 bg-white/[0.06] rounded w-12" />
        </div>
      </div>

    </div>
  </div>
</template>
