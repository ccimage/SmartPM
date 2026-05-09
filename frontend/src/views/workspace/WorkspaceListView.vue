<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createWorkspace, listWorkspaces, type Workspace } from '@/api/workspace'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const router = useRouter()

const workspaces = ref<Workspace[]>([])
const workspaceName = ref('')
const isLoading = ref(false)
const isCreating = ref(false)
const errorMessage = ref('')

const canCreate = computed(() => workspaceName.value.trim().length > 0)

async function loadWorkspaces() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await listWorkspaces()
    workspaces.value = response.data
  } catch {
    errorMessage.value = 'Unable to load workspaces.'
  } finally {
    isLoading.value = false
  }
}

async function handleCreateWorkspace() {
  if (!canCreate.value || isCreating.value) {
    return
  }

  isCreating.value = true
  errorMessage.value = ''

  try {
    const response = await createWorkspace({ name: workspaceName.value.trim() })
    workspaces.value = [response.data, ...workspaces.value]
    workspaceName.value = ''
  } catch {
    errorMessage.value = 'Unable to create workspace.'
  } finally {
    isCreating.value = false
  }
}

function openWorkspace(workspace: Workspace) {
  appStore.setCurrentWorkspace(workspace)
  router.push(`/workspaces/${workspace.id}`)
}

onMounted(loadWorkspaces)
</script>

<template>
  <section class="page-section">
    <div class="section-header">
      <div>
        <h2>Workspaces</h2>
        <p>{{ workspaces.length }} workspace{{ workspaces.length === 1 ? '' : 's' }}</p>
      </div>
    </div>

    <form class="create-form" @submit.prevent="handleCreateWorkspace">
      <input v-model="workspaceName" type="text" placeholder="Workspace name" />
      <button type="submit" :disabled="!canCreate || isCreating">
        {{ isCreating ? 'Creating...' : 'Create workspace' }}
      </button>
    </form>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p v-else-if="isLoading" class="muted">Loading workspaces...</p>

    <div v-else class="workspace-grid">
      <button
        v-for="workspace in workspaces"
        :key="workspace.id"
        type="button"
        class="workspace-card"
        @click="openWorkspace(workspace)"
      >
        <span>{{ workspace.name }}</span>
        <small>Owner {{ workspace.ownerId }}</small>
      </button>

      <p v-if="workspaces.length === 0" class="empty-state">No workspaces yet.</p>
    </div>
  </section>
</template>

<style scoped>
.page-section {
  display: grid;
  gap: 18px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

h2 {
  margin: 0;
  color: #111827;
  font-size: 24px;
}

p {
  margin: 4px 0 0;
  color: #6b7280;
}

.create-form {
  display: flex;
  gap: 10px;
  max-width: 560px;
}

input {
  min-width: 0;
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 12px;
}

button {
  border-radius: 8px;
  font-weight: 700;
}

.create-form button {
  border: 0;
  background: #4f46e5;
  color: #ffffff;
  padding: 10px 14px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.workspace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.workspace-card {
  display: grid;
  gap: 8px;
  min-height: 112px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  padding: 18px;
  text-align: left;
}

.workspace-card:hover {
  border-color: #818cf8;
}

.workspace-card span {
  color: #111827;
  font-size: 17px;
}

.workspace-card small {
  overflow: hidden;
  color: #6b7280;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-message {
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  padding: 10px 12px;
}

.muted,
.empty-state {
  color: #6b7280;
}

@media (max-width: 620px) {
  .create-form {
    flex-direction: column;
  }
}
</style>
