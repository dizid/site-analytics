<script setup lang="ts">
/**
 * LandingPage.vue
 * Marketing landing page shown to unauthenticated users.
 * Replaces LoginScreen.vue. CTA triggers Google OAuth via useAuth.login().
 */

import { useAuth } from '../composables/useAuth'

const { login, error } = useAuth()

const currentYear = new Date().getFullYear()

// Feature cards data
const features = [
  {
    title: 'Sign in. Done.',
    body: 'StatPilot uses the Google Analytics Admin API to auto-discover every property your account has access to. No property IDs to find. No CSV uploads. If you have GA4 access, it just appears.',
  },
  {
    title: 'Everything you care about. Nothing you don\'t.',
    body: 'Sessions, users, pageviews, bounce rate, average session duration — per property, per day. Sparkline trends. Traffic source breakdowns. Switch between 7, 30, or 90-day windows.',
  },
  {
    title: 'Dark mode. Mobile-first. Instant.',
    body: 'Intelligent caching means revisits load in under 2 seconds. Works beautifully on your phone. Built for checking your numbers at 7am before the day starts.',
  },
]

// Comparison table data
const competitors = [
  { name: 'StatPilot', price: 'Free', setup: '0 min', autoDiscovers: true, googleSignIn: true, highlight: true },
  { name: 'AgencyAnalytics', price: '$79/mo', setup: '30+ min', autoDiscovers: false, googleSignIn: false, highlight: false },
  { name: 'Databox', price: '$199/mo', setup: '60+ min', autoDiscovers: false, googleSignIn: false, highlight: false },
  { name: 'DashThis', price: '$119/mo', setup: '45+ min', autoDiscovers: false, googleSignIn: false, highlight: false },
]

// Pricing tiers
const plans = [
  {
    name: 'Solo',
    price: 'Free',
    period: '',
    badge: null,
    features: [
      'Up to 3 GA4 properties',
      '7-day date range',
      '6-hour data refresh',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Builder',
    price: '$19',
    period: '/mo',
    badge: 'Most Popular',
    features: [
      'Up to 15 GA4 properties',
      '7d / 30d / 90d ranges',
      '1-hour data refresh',
    ],
    cta: 'Start Free',
    highlighted: true,
  },
  {
    name: 'Studio',
    price: '$49',
    period: '/mo',
    badge: null,
    features: [
      'Unlimited GA4 properties',
      'All date ranges',
      '15-minute data refresh',
      'Priority support',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
]
</script>

<template>
  <div class="min-h-screen bg-surface text-text-primary antialiased">

    <!-- =====================================================================
         HERO SECTION
         ===================================================================== -->
    <section class="relative overflow-hidden px-4 pt-20 pb-24 sm:pt-28 sm:pb-32">

      <!-- Subtle radial glow behind hero content -->
      <div
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div
          class="h-[600px] w-[600px] rounded-full opacity-20"
          style="background: radial-gradient(circle, #2d8cf0 0%, transparent 70%)"
        />
      </div>

      <!-- Dot grid pattern — suggests data / analytics -->
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.04]"
        aria-hidden="true"
        style="background-image: radial-gradient(circle, #f8fafc 1px, transparent 1px); background-size: 28px 28px;"
      />

      <div class="relative mx-auto max-w-3xl text-center">

        <!-- Product name -->
        <p class="mb-4 text-sm font-semibold uppercase tracking-widest text-accent">
          StatPilot
        </p>

        <!-- Primary headline -->
        <h1 class="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
          Every GA4 property.<br />
          One dashboard.<br />
          <span class="text-accent">Two seconds.</span>
        </h1>

        <!-- Subheadline -->
        <p class="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-text-secondary sm:text-xl">
          Sign in with Google and StatPilot auto-discovers every Analytics property you have access to.
          No setup. No spreadsheets. No tab switching.
        </p>

        <!-- OAuth error — shown when returning from a failed auth attempt -->
        <div
          v-if="error"
          class="mx-auto mb-6 max-w-sm rounded-lg border border-border border-l-4 border-l-danger bg-surface-card p-3 text-sm text-danger"
          role="alert"
          aria-live="assertive"
        >
          {{ error }}
        </div>

        <!-- Google sign-in CTA -->
        <button
          type="button"
          class="inline-flex items-center justify-center gap-3 rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-gray-800 shadow-lg transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface cursor-pointer"
          aria-label="Sign in with Google — it's free"
          @click="login"
        >
          <!-- Official Google "G" logo -->
          <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google — it's free
        </button>

        <!-- Trust note below CTA -->
        <p class="mt-3 text-xs text-text-muted">
          Free for up to 3 properties. No credit card required.
        </p>

      </div>
    </section>

    <!-- =====================================================================
         FEATURES SECTION
         ===================================================================== -->
    <section class="px-4 py-20 sm:py-24" aria-labelledby="features-heading">
      <div class="mx-auto max-w-6xl">

        <div class="mb-12 text-center">
          <h2 id="features-heading" class="text-2xl font-bold text-text-primary sm:text-3xl">
            Built for people who run multiple sites
          </h2>
          <p class="mt-3 text-text-secondary">
            The analytics tool designed for the solo founder managing a portfolio, not an agency billing clients.
          </p>
        </div>

        <!-- 3-column card grid: 1 col mobile, 3 col desktop -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="rounded-2xl border border-border bg-surface-card p-7"
          >
            <h3 class="mb-3 text-base font-semibold text-text-primary">
              {{ feature.title }}
            </h3>
            <p class="text-sm leading-relaxed text-text-secondary">
              {{ feature.body }}
            </p>
          </div>
        </div>

      </div>
    </section>

    <!-- =====================================================================
         COMPARISON SECTION
         ===================================================================== -->
    <section class="px-4 py-20 sm:py-24" aria-labelledby="comparison-heading">
      <div class="mx-auto max-w-4xl">

        <div class="mb-12 text-center">
          <h2 id="comparison-heading" class="text-2xl font-bold text-text-primary sm:text-3xl">
            Made for founders, not agencies
          </h2>
          <p class="mt-3 text-text-secondary">
            The competition is built for teams billing clients. StatPilot is built for you.
          </p>
        </div>

        <!-- Scrollable on mobile -->
        <div class="overflow-x-auto rounded-2xl border border-border bg-surface-card">
          <table class="w-full min-w-[540px] border-collapse text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="px-5 py-4 text-left font-medium text-text-muted" scope="col">Feature</th>
                <th
                  v-for="col in competitors"
                  :key="col.name"
                  class="px-5 py-4 text-center font-semibold"
                  :class="col.highlight ? 'text-accent' : 'text-text-secondary'"
                  scope="col"
                >
                  {{ col.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- Price row -->
              <tr class="border-b border-border">
                <td class="px-5 py-3.5 text-text-muted">Price (10 sites)</td>
                <td
                  v-for="col in competitors"
                  :key="col.name + '-price'"
                  class="px-5 py-3.5 text-center font-medium"
                  :class="col.highlight ? 'text-accent' : 'text-text-primary'"
                >
                  {{ col.price }}
                </td>
              </tr>
              <!-- Setup time row -->
              <tr class="border-b border-border">
                <td class="px-5 py-3.5 text-text-muted">Setup time</td>
                <td
                  v-for="col in competitors"
                  :key="col.name + '-setup'"
                  class="px-5 py-3.5 text-center"
                  :class="col.highlight ? 'font-semibold text-accent' : 'text-text-secondary'"
                >
                  {{ col.setup }}
                </td>
              </tr>
              <!-- Auto-discovers row -->
              <tr class="border-b border-border">
                <td class="px-5 py-3.5 text-text-muted">Auto-discovers properties</td>
                <td
                  v-for="col in competitors"
                  :key="col.name + '-auto'"
                  class="px-5 py-3.5 text-center"
                >
                  <span
                    v-if="col.autoDiscovers"
                    class="font-bold text-success"
                    aria-label="Yes"
                  >Yes</span>
                  <span
                    v-else
                    class="text-text-muted"
                    aria-label="No"
                  >No</span>
                </td>
              </tr>
              <!-- Google sign-in row -->
              <tr>
                <td class="px-5 py-3.5 text-text-muted">Google sign-in</td>
                <td
                  v-for="col in competitors"
                  :key="col.name + '-signin'"
                  class="px-5 py-3.5 text-center"
                >
                  <span
                    v-if="col.googleSignIn"
                    class="font-bold text-success"
                    aria-label="Yes"
                  >Yes</span>
                  <span
                    v-else
                    class="text-text-muted"
                    aria-label="No"
                  >No</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </section>

    <!-- =====================================================================
         PRICING SECTION
         ===================================================================== -->
    <section class="px-4 py-20 sm:py-24" aria-labelledby="pricing-heading">
      <div class="mx-auto max-w-5xl">

        <div class="mb-12 text-center">
          <h2 id="pricing-heading" class="text-2xl font-bold text-text-primary sm:text-3xl">
            Simple pricing. Start free.
          </h2>
          <p class="mt-3 text-text-secondary">
            All plans start with a free trial. No credit card required.
          </p>
        </div>

        <!-- 3-column pricing grid: 1 col mobile, 3 col desktop -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="plan in plans"
            :key="plan.name"
            class="relative flex flex-col rounded-2xl border p-7"
            :class="plan.highlighted
              ? 'border-accent/50 bg-accent/10 ring-1 ring-accent/30'
              : 'border-border bg-surface-card'"
          >

            <!-- Badge -->
            <div
              v-if="plan.badge"
              class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-white"
            >
              {{ plan.badge }}
            </div>

            <!-- Plan name -->
            <p
              class="mb-1 text-sm font-semibold uppercase tracking-wide"
              :class="plan.highlighted ? 'text-accent' : 'text-text-muted'"
            >
              {{ plan.name }}
            </p>

            <!-- Price -->
            <div class="mb-6 flex items-baseline gap-1">
              <span class="text-4xl font-extrabold text-text-primary">{{ plan.price }}</span>
              <span v-if="plan.period" class="text-text-muted">{{ plan.period }}</span>
            </div>

            <!-- Feature list -->
            <ul class="mb-8 flex-1 space-y-2.5">
              <li
                v-for="item in plan.features"
                :key="item"
                class="flex items-start gap-2 text-sm text-text-secondary"
              >
                <!-- Check mark -->
                <svg
                  class="mt-0.5 h-4 w-4 shrink-0 text-success"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8l3.5 3.5L13 5"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                {{ item }}
              </li>
            </ul>

            <!-- CTA -->
            <button
              type="button"
              class="w-full rounded-xl py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface cursor-pointer"
              :class="plan.highlighted
                ? 'bg-accent text-white hover:bg-accent-hover'
                : 'border border-border bg-surface-card text-text-primary hover:bg-surface-card-hover'"
              :aria-label="`${plan.cta} — ${plan.name} plan`"
              @click="login"
            >
              {{ plan.cta }}
            </button>

          </div>
        </div>

      </div>
    </section>

    <!-- =====================================================================
         FOOTER
         ===================================================================== -->
    <footer class="border-t border-border px-4 py-8">
      <div class="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">

        <p class="text-xs text-text-muted">
          &copy; {{ currentYear }} StatPilot. All rights reserved.
        </p>

        <nav class="flex gap-5" aria-label="Footer navigation">
          <a
            href="#"
            class="text-xs text-text-muted transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
          >
            Privacy
          </a>
          <a
            href="#"
            class="text-xs text-text-muted transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
          >
            Terms
          </a>
          <a
            href="https://dizid.com"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-text-muted transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
          >
            Built by Dizid
          </a>
        </nav>

      </div>
    </footer>

  </div>
</template>
