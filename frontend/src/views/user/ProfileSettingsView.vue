<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const user = computed(() => authStore.user)

function goBack() {
  router.back()
}
</script>

<template>
  <section class="settings-page">
    <div class="settings-header">
      <div>
        <h2>Profile</h2>
        <p>Review the current account information and continue to appearance settings.</p>
      </div>
      <button class="secondary-button" type="button" @click="goBack">Back</button>
    </div>

    <div class="settings-card">
      <div class="avatar">{{ user?.name?.slice(0, 1).toUpperCase() ?? 'U' }}</div>

      <div class="profile-grid">
        <div>
          <span class="label">Name</span>
          <strong>{{ user?.name ?? '-' }}</strong>
        </div>
        <div>
          <span class="label">Email</span>
          <strong>{{ user?.email ?? '-' }}</strong>
        </div>
      </div>

      <RouterLink class="primary-link" to="/settings/appearance">Open appearance settings</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.settings-page {
  display: grid;
  gap: 20px;
  max-width: 760px;
}

.settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.settings-header h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 24px;
}

.settings-header p {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
}

.settings-card {
  display: grid;
  gap: 20px;
  border: 1px solid var(--color-border-default);
  border-radius: 20px;
  background: var(--color-bg-panel);
  padding: 24px;
  box-shadow: 0 20px 44px rgba(15, 23, 42, 0.08);
}

.avatar {
  display: grid;
  width: 64px;
  height: 64px;
  place-items: center;
  border-radius: 20px;
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
  font-size: 28px;
  font-weight: 700;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.profile-grid div {
  display: grid;
  gap: 6px;
}

.label {
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
}

strong {
  color: var(--color-text-primary);
}

.primary-link,
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 700;
}

.primary-link {
  width: fit-content;
  background: var(--color-primary);
  color: #ffffff;
}

.secondary-button {
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
}

@media (max-width: 640px) {
  .settings-header {
    flex-direction: column;
  }

  .profile-grid {
    grid-template-columns: 1fr;
  }
}
</style>
