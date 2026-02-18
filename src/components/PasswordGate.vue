<script setup lang="ts">
/**
 * PasswordGate.vue
 * Full-screen glass card login screen.
 * Delegates all auth state and logic to the useAuth composable.
 */

import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { login, error, isLoading } = useAuth()

/** Local reactive password field value. */
const password = ref('')

async function handleSubmit(): Promise<void> {
  const trimmed = password.value.trim()
  if (!trimmed || isLoading.value) return
  await login(trimmed)
}
</script>

<template>
  <!-- Full-screen centering wrapper -->
  <div class="min-h-screen flex items-center justify-center px-4">
    <!-- Glass morphism card -->
    <div class="w-full max-w-sm bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">

      <!-- Title -->
      <h1 class="text-xl font-bold text-text-primary mb-1">
        Site Analytics
      </h1>

      <!-- Subtitle -->
      <p class="text-sm text-text-secondary mb-6">
        Enter password to continue
      </p>

      <!-- Login form -->
      <form @submit.prevent="handleSubmit" novalidate>
        <!-- Password input -->
        <div class="mb-4">
          <label for="password-input" class="sr-only">Password</label>
          <input
            id="password-input"
            v-model="password"
            type="password"
            placeholder="Password"
            autocomplete="current-password"
            :disabled="isLoading"
            class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-colors disabled:opacity-50"
          />
        </div>

        <!-- Error message -->
        <p
          v-if="error"
          class="text-danger text-xs mb-4 leading-snug"
          role="alert"
        >
          {{ error }}
        </p>

        <!-- Submit button -->
        <button
          type="submit"
          :disabled="isLoading || !password.trim()"
          class="w-full bg-accent hover:bg-accent-hover text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {{ isLoading ? 'Verifying...' : 'Continue' }}
        </button>
      </form>

    </div>
  </div>
</template>
