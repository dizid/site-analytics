<script setup lang="ts">
import { watch } from 'vue'
import { useAuth } from './composables/useAuth'
import { useAnalyticsData } from './composables/useAnalyticsData'
import LandingPage from './components/LandingPage.vue'
import DashboardHeader from './components/DashboardHeader.vue'
import SiteCard from './components/SiteCard.vue'
import SiteTable from './components/SiteTable.vue'
import PropertyDetail from './components/PropertyDetail.vue'
import LoadingSkeleton from './components/LoadingSkeleton.vue'
import ErrorBanner from './components/ErrorBanner.vue'
import AggregateKPIs from './components/AggregateKPIs.vue'
import AppFooter from './components/AppFooter.vue'

const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth()
const {
  sortedProperties,
  isLoading,
  isRefreshing,
  error,
  lastFetchedAt,
  viewMode,
  sortColumn,
  sortDirection,
  successCount,
  totalSessions,
  totalUsers,
  avgBounceRate,
  avgDuration,
  previousAggregate,
  selectedProperty,
  propertyDetail,
  isDetailLoading,
  detailError,
  fetchReport,
  setViewMode,
  setSortColumn,
  refresh,
  selectProperty,
  retryDetail,
  deselectProperty,
} = useAnalyticsData()

// Fetch initial data when authenticated
watch(isAuthenticated, (auth) => {
  if (auth) fetchReport()
}, { immediate: true })
</script>

<template>
  <!--
    Auth loading state: useAuth.ts starts with isLoading=true to prevent
    a flash of the login screen while it checks localStorage/hash on module load.
    Once resolved (synchronous), isLoading flips to false.
  -->
  <div v-if="authLoading" class="min-h-screen" aria-hidden="true" />

  <!-- Unauthenticated: show Google OAuth login screen -->
  <div v-else-if="!isAuthenticated" class="min-h-screen flex flex-col">
    <LandingPage class="flex-1" />
    <AppFooter />
  </div>

  <!-- Authenticated: show dashboard -->
  <div v-else class="min-h-screen">
    <DashboardHeader
      :last-fetched-at="lastFetchedAt"
      :view-mode="viewMode"
      :is-loading="isLoading || isRefreshing"
      :user="user"
      :success-count="successCount"
      :show-home="!!selectedProperty"
      @refresh="refresh"
      @toggle-view="setViewMode(viewMode === 'cards' ? 'table' : 'cards')"
      @logout="logout"
      @home="deselectProperty"
    />

    <main class="mx-auto max-w-7xl px-5 py-6 sm:px-6">

      <!-- Report error — shown in list AND detail view (a failed range switch
           or refresh there would otherwise leave old numbers with no warning) -->
      <ErrorBanner
        v-if="error"
        class="mb-4"
        :message="sortedProperties.length > 0 || selectedProperty
          ? `${error} — showing previously loaded data.`
          : error"
        @retry="refresh"
      />

      <!-- Detail view: single property breakdown -->
      <PropertyDetail
        v-if="selectedProperty"
        :property="selectedProperty"
        :detail="propertyDetail"
        :is-loading="isDetailLoading"
        :error="detailError"
        :overview-loading="isLoading"
        @back="deselectProperty"
        @retry="retryDetail"
      />

      <!-- List view: all properties -->
      <template v-else>
        <!-- Aggregate KPIs -->
        <AggregateKPIs
          :total-sessions="totalSessions"
          :total-users="totalUsers"
          :avg-bounce-rate="avgBounceRate"
          :avg-duration="avgDuration"
          :previous="previousAggregate"
          :is-loading="isLoading"
        />

        <!-- Loading skeletons -->
        <div v-if="isLoading && sortedProperties.length === 0" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LoadingSkeleton v-for="i in 6" :key="i" />
        </div>

        <!-- Card view -->
        <div v-else-if="viewMode === 'cards'" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SiteCard
            v-for="(property, i) in sortedProperties"
            :key="property.propertyId"
            :property="property"
            :index="i"
            @select="selectProperty"
          />
        </div>

        <!-- Table view -->
        <SiteTable
          v-else
          :properties="sortedProperties"
          :sort-column="sortColumn"
          :sort-direction="sortDirection"
          @sort="setSortColumn"
          @select="selectProperty"
        />
      </template>
    </main>

    <AppFooter />
  </div>
</template>
