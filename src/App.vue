<script setup lang="ts">
import { watch } from 'vue'
import { useAuth } from './composables/useAuth'
import { useAnalyticsData } from './composables/useAnalyticsData'
import PasswordGate from './components/PasswordGate.vue'
import DashboardHeader from './components/DashboardHeader.vue'
import SiteCard from './components/SiteCard.vue'
import SiteTable from './components/SiteTable.vue'
import LoadingSkeleton from './components/LoadingSkeleton.vue'
import ErrorBanner from './components/ErrorBanner.vue'

const { isAuthenticated, logout } = useAuth()
const {
  sortedProperties,
  isLoading,
  error,
  lastFetchedAt,
  viewMode,
  sortColumn,
  sortDirection,
  successCount,
  errorCount,
  totalSessions,
  fetchReport,
  setViewMode,
  setSortColumn,
  refresh,
} = useAnalyticsData()

// Fetch initial data when authenticated
watch(isAuthenticated, (auth) => {
  if (auth) fetchReport()
}, { immediate: true })
</script>

<template>
  <PasswordGate v-if="!isAuthenticated" />

  <div v-else class="min-h-screen">
    <DashboardHeader
      :last-fetched-at="lastFetchedAt"
      :view-mode="viewMode"
      :is-loading="isLoading"
      @refresh="refresh"
      @toggle-view="setViewMode(viewMode === 'cards' ? 'table' : 'cards')"
      @logout="logout"
    />

    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <!-- Summary stats -->
      <div v-if="!isLoading && successCount > 0" class="mb-6 flex flex-wrap gap-4 text-sm text-text-secondary">
        <span>{{ successCount }} sites loaded</span>
        <span v-if="errorCount > 0" class="text-danger">{{ errorCount }} failed</span>
        <span>{{ totalSessions.toLocaleString() }} total sessions</span>
      </div>

      <!-- Global error -->
      <ErrorBanner
        v-if="error && sortedProperties.length === 0"
        :message="error"
        @retry="refresh"
      />

      <!-- Loading skeletons -->
      <div v-if="isLoading && sortedProperties.length === 0" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <LoadingSkeleton v-for="i in 6" :key="i" />
      </div>

      <!-- Card view -->
      <div v-else-if="viewMode === 'cards'" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SiteCard
          v-for="property in sortedProperties"
          :key="property.propertyId"
          :property="property"
        />
      </div>

      <!-- Table view -->
      <SiteTable
        v-else
        :properties="sortedProperties"
        :sort-column="sortColumn"
        :sort-direction="sortDirection"
        @sort="setSortColumn"
      />
    </main>
  </div>
</template>
