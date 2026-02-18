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
  <header class="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-white/10">
    <div class="px-4 py-3 flex flex-wrap items-center justify-between gap-3">

      <!-- Left: title + last updated -->
      <div class="flex flex-col min-w-0">
        <h1 class="text-xl font-bold text-text-primary leading-none">
          Site Analytics
        </h1>
        <p
          v-if="lastUpdatedLabel"
          class="text-xs text-text-muted mt-0.5 leading-none"
        >
          Updated {{ lastUpdatedLabel }}
        </p>
      </div>

      <!-- Right: controls -->
      <div class="flex items-center gap-2 flex-wrap">

        <!-- Date range picker -->
        <DateRangePicker v-model="selectedRange" />

        <!-- View toggle: cards <-> table -->
        <button
          type="button"
          class="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          :aria-label="viewMode === 'cards' ? 'Switch to table view' : 'Switch to card view'"
          @click="emit('toggleView')"
        >
          <!-- Cards icon -->
          <svg
            v-if="viewMode === 'cards'"
            class="w-4 h-4"
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
            class="w-4 h-4"
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
          class="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-2 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Refresh data"
          @click="emit('refresh')"
        >
          <svg
            :class="['w-4 h-4 transition-transform', isLoading ? 'animate-spin' : '']"
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
          class="flex items-center gap-2 text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
          :title="`Signed in as ${user.email} — click to sign out`"
          @click="emit('logout')"
        >
          <!-- Profile picture — falls back to initial letter if image 404s -->
          <span class="relative w-6 h-6 shrink-0">
            <img
              v-if="user.picture && !avatarError"
              :src="user.picture"
              :alt="user.name"
              referrerpolicy="no-referrer"
              class="w-6 h-6 rounded-full object-cover"
              @error="onAvatarError"
            />
            <!-- Fallback: coloured circle with first letter -->
            <span
              v-else
              class="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent text-xs font-semibold"
              aria-hidden="true"
            >
              {{ avatarFallback }}
            </span>
          </span>

          <!-- Name (hidden on very small screens to save space) -->
          <span class="hidden sm:inline truncate max-w-[120px]">{{ user.name || user.email }}</span>
          <span class="text-text-muted">·</span>
          <span>Sign out</span>
        </button>

        <!-- Fallback logout (no user info loaded) -->
        <button
          v-else
          type="button"
          class="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
          @click="emit('logout')"
        >
          Sign out
        </button>

      </div>
    </div>
  </header>
</template>
