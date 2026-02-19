<script setup lang="ts">
/**
 * DashboardHeader.vue
 * Sticky top bar with title, last-updated timestamp, view toggle,
 * date range picker, refresh button, and user avatar + logout.
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ViewMode, DateRange, UserInfo } from '../types/analytics'
import DateRangePicker from './DateRangePicker.vue'
import { useDateRange } from '../composables/useDateRange'

const props = defineProps<{
  lastFetchedAt: string | null
  viewMode: ViewMode
  isLoading: boolean
  /** Authenticated user info — null only before auth resolves (shouldn't happen here) */
  user: UserInfo | null
  /** Number of successfully loaded properties */
  successCount?: number
}>()

const emit = defineEmits<{
  refresh: []
  toggleView: []
  logout: []
}>()

const { dateRange, setDateRange } = useDateRange()

// ---------------------------------------------------------------------------
// Timestamp formatting
// ---------------------------------------------------------------------------

// Reactive clock that ticks every 30s so relative timestamps stay fresh
const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval>
onMounted(() => { clockTimer = setInterval(() => { now.value = new Date() }, 30_000) })
onUnmounted(() => clearInterval(clockTimer))

/**
 * Returns a human-readable "last updated" string.
 * - Within 1 hour: relative ("2 min ago")
 * - Beyond 1 hour: absolute ("2:34 PM")
 */
const lastUpdatedLabel = computed<string>(() => {
  if (!props.lastFetchedAt) return ''

  const fetchedDate = new Date(props.lastFetchedAt)
  const diffMs = now.value.getTime() - fetchedDate.getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)

  if (diffMs < 60_000) {
    return 'Just now'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`
  }

  // More than an hour: show absolute time
  return fetchedDate.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
})

// ---------------------------------------------------------------------------
// User avatar fallback
// ---------------------------------------------------------------------------

/** Show the first letter of name or email if the profile image fails to load. */
const avatarFallback = computed<string>(() => {
  if (!props.user) return '?'
  const src = props.user.name || props.user.email
  return src.charAt(0).toUpperCase()
})

const avatarError = ref(false)

function onAvatarError(): void {
  avatarError.value = true
}

// ---------------------------------------------------------------------------
// Date range v-model bridge for DateRangePicker
// ---------------------------------------------------------------------------

/** Computed ref that bridges the singleton useDateRange with the picker's v-model. */
const selectedRange = computed<DateRange>({
  get: () => dateRange.value,
  set: (value: DateRange) => setDateRange(value),
})
</script>

<template>
  <!-- Sticky top bar -->
  <header class="sticky top-0 z-20 bg-surface/80 backdrop-blur-xl px-5 pb-4 pt-4">
    <div class="flex items-center justify-between">

      <!-- Left: title + subtitle -->
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Properties
        </h1>
        <p class="text-sm text-text-secondary font-medium">
          <template v-if="successCount !== undefined && successCount > 0">
            {{ successCount }} connected site{{ successCount === 1 ? '' : 's' }}
          </template>
          <template v-else-if="isLoading">
            Loading...
          </template>
          <template v-else>
            No sites connected
          </template>
        </p>
      </div>

      <!-- Right: controls -->
      <div class="flex items-center gap-3">

        <!-- View toggle: cards <-> table -->
        <button
          type="button"
          class="w-10 h-10 flex items-center justify-center rounded-full bg-surface-card text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          :aria-label="viewMode === 'cards' ? 'Switch to table view' : 'Switch to card view'"
          @click="emit('toggleView')"
        >
          <!-- Cards icon -->
          <svg
            v-if="viewMode === 'cards'"
            class="w-[18px] h-[18px]"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5" />
            <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5" />
            <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5" />
            <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5" />
          </svg>
          <!-- Table icon -->
          <svg
            v-else
            class="w-[18px] h-[18px]"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path d="M1 4h14M1 8h14M1 12h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path d="M5 2v12M11 2v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>

        <!-- Refresh button — icon spins when loading -->
        <button
          type="button"
          :disabled="isLoading"
          class="w-10 h-10 flex items-center justify-center rounded-full bg-surface-card text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Refresh data"
          @click="emit('refresh')"
        >
          <svg
            :class="['w-[18px] h-[18px] transition-transform', isLoading ? 'animate-spin' : '']"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.8 0 3.4.87 4.4 2.2"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path
              d="M12.5 2v3h-3"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <!-- User avatar + logout -->
        <button
          v-if="user"
          type="button"
          class="w-10 h-10 rounded-full overflow-hidden cursor-pointer"
          :title="`Signed in as ${user.email} — click to sign out`"
          @click="emit('logout')"
        >
          <img
            v-if="user.picture && !avatarError"
            :src="user.picture"
            :alt="user.name"
            referrerpolicy="no-referrer"
            class="w-full h-full object-cover"
            @error="onAvatarError"
          />
          <!-- Fallback: coloured circle with first letter -->
          <span
            v-else
            class="w-full h-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent text-sm font-semibold"
            aria-hidden="true"
          >
            {{ avatarFallback }}
          </span>
        </button>

        <!-- Fallback logout (no user info loaded) -->
        <button
          v-else
          type="button"
          class="w-10 h-10 flex items-center justify-center rounded-full bg-surface-card text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          @click="emit('logout')"
        >
          <svg class="w-[18px] h-[18px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 2H12.5C13.3 2 14 2.7 14 3.5V12.5C14 13.3 13.3 14 12.5 14H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path d="M6 8H1M1 8L3.5 5.5M1 8L3.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

      </div>
    </div>

    <!-- Last updated + date range row -->
    <div class="flex items-center justify-between mt-4">
      <p
        v-if="lastUpdatedLabel"
        class="text-xs text-text-muted"
      >
        Updated {{ lastUpdatedLabel }}
      </p>
      <div v-else />
      <DateRangePicker v-model="selectedRange" />
    </div>
  </header>
</template>
