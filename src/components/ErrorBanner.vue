<script setup lang="ts">
/**
 * ErrorBanner.vue
 * Red-tinted glass error card with retry and dismiss actions.
 * Parent controls visibility — dismiss emits an event for parent to handle.
 */

defineProps<{
  message: string
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div
    class="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-start gap-3"
    role="alert"
  >
    <!-- Error icon -->
    <svg
      class="w-5 h-5 text-danger flex-shrink-0 mt-0.5"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fill-rule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
        clip-rule="evenodd"
      />
    </svg>

    <!-- Message -->
    <p class="flex-1 text-sm text-text-primary leading-snug">
      {{ message }}
    </p>

    <!-- Actions -->
    <div class="flex items-center gap-2 flex-shrink-0">
      <!-- Retry button -->
      <button
        type="button"
        class="text-xs text-danger hover:text-red-300 font-medium transition-colors cursor-pointer"
        @click="emit('retry')"
      >
        Try Again
      </button>
    </div>
  </div>
</template>
