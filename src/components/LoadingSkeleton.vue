<script setup lang="ts">
/**
 * LoadingSkeleton.vue
 * Pulse skeleton card matching the new SiteCard layout:
 * icon placeholder + text lines + 2-col metric placeholders.
 */
</script>

<template>
  <!-- Solid dark card matching SiteCard shape -->
  <div class="bg-surface-card rounded-2xl border border-border p-5">
    <div class="animate-pulse">

      <!-- Top: icon + name area -->
      <div class="flex justify-between items-start mb-4">
        <div class="flex items-center gap-3">
          <!-- Icon placeholder -->
          <div class="w-10 h-10 rounded-xl bg-white/[0.06]" />
          <div>
            <!-- Property name placeholder -->
            <div class="h-4 bg-white/[0.06] rounded-md w-32 mb-1.5" />
            <!-- Domain placeholder -->
            <div class="h-2.5 bg-white/[0.06] rounded w-20" />
          </div>
        </div>
        <!-- Sparkline placeholder -->
        <div class="w-12 h-6 bg-white/[0.06] rounded" />
      </div>

      <!-- Bottom: 2-col metric placeholders -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white/[0.03] p-3 rounded-xl">
          <div class="h-2.5 bg-white/[0.06] rounded w-16 mb-2" />
          <div class="h-5 bg-white/[0.06] rounded w-12" />
        </div>
        <div class="bg-white/[0.03] p-3 rounded-xl">
          <div class="h-2.5 bg-white/[0.06] rounded w-14 mb-2" />
          <div class="h-5 bg-white/[0.06] rounded w-10" />
        </div>
      </div>

    </div>
  </div>
</template>
