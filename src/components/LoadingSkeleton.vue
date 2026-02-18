<script setup lang="ts">
/**
 * LoadingSkeleton.vue
 * Pulse skeleton card that mirrors the layout of SiteCard.
 * No props — one-size-fits-all placeholder during data loading.
 */
</script>

<template>
  <!-- Glass morphism container matching SiteCard dimensions -->
  <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
    <div class="animate-pulse">

      <!-- Header: property name placeholder -->
      <div class="h-4 bg-white/10 rounded-md w-3/5 mb-4" />

      <!-- Stats grid: 2 columns x 3 rows of stat badge placeholders -->
      <div class="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
        <!-- 6 stat badge stubs -->
        <div v-for="i in 6" :key="i" class="flex flex-col gap-1">
          <!-- Label placeholder -->
          <div class="h-2.5 bg-white/10 rounded w-2/3" />
          <!-- Value placeholder -->
          <div class="h-5 bg-white/10 rounded w-4/5" />
        </div>
      </div>

      <!-- Sparkline area placeholder -->
      <div class="h-8 bg-white/10 rounded-lg w-full mb-3" />

      <!-- Traffic source badges row -->
      <div class="flex gap-2">
        <div
          v-for="i in 3"
          :key="i"
          class="h-5 bg-white/10 rounded-full"
          :class="i === 1 ? 'w-16' : i === 2 ? 'w-12' : 'w-10'"
        />
      </div>

    </div>
  </div>
</template>
