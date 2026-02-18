/**
 * useDateRange.ts
 * Reactive date range selection shared across the dashboard.
 * Module-level singleton — all components read from and write to the same ref.
 */

import { ref } from 'vue'
import type { Ref } from 'vue'
import type { DateRange } from '../types/analytics'

// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------

const dateRange: Ref<DateRange> = ref('7d')

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function setDateRange(range: DateRange): void {
  dateRange.value = range
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useDateRange() {
  return {
    dateRange,
    setDateRange,
  }
}
