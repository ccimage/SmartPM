<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createProject, listProjects, type Project } from '@/api/project'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const projects = ref<Project[]>([])
const projectName = ref('')
const projectDescription = ref('')
const isLoading = ref(false)
const isCreating = ref(false)
const errorMessage = ref('')

const workspaceId = computed(() => {
  const id = route.params.id ?? route.params.workspaceId
  return typeof id === 'string' ? id : ''
})

const canCreate = computed(() => workspaceId.value !== '' && projectName.value.trim().length > 0)

async function loadProjects() {
  if (!workspaceId.value) {
    projects.value = []
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await listProjects(workspaceId.value)
    projects.value = response.data
  } catch {
    errorMessage.value = 'Unable to load projects.'
  } finally {
    isLoading.value = false
  }
}

async function handleCreateProject() {
  if (!canCreate.value || isCreating.value) {
    return
  }

  isCreating.value = true
  errorMessage.value = ''

  try {
    const description = projectDescription.value.trim()
    const response = await createProject(workspaceId.value, {
      name: projectName.value.trim(),
      ...(description ? { description } : {}),
    })
    projects.value = [response.data, ...projects.value]
    projectName.value = ''
    projectDescription.value = ''
  } catch {
    errorMessage.value = 'Unable to create project.'
  } finally {
    isCreating.value = false
  }
}

function openProject(project: Project) {
  appStore.setCurrentProject(project)
  router.push(`/workspaces/${workspaceId.value}/projects/${project.id}`)
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

onMounted(loadProjects)
watch(workspaceId, loadProjects)
</script>

<template>
  <section class="page-section">
    <div class="section-header">
      <div>
        <h2>Projects</h2>
        <p>{{ projects.length }} project{{ projects.length === 1 ? '' : 's' }}</p>
      </div>
    </div>

    <form class="create-form" @submit.prevent="handleCreateProject">
      <input v-model="projectName" type="text" placeholder="Project name" />
      <input v-model="projectDescription" type="text" placeholder="Description" />
      <button type="submit" :disabled="!canCreate || isCreating">
        {{ isCreating ? 'Creating...' : 'Create project' }}
      </button>
    </form>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p v-else-if="isLoading" class="muted">Loading projects...</p>

    <vxe-table v-else :data="projects" border round>
      <vxe-column field="name" title="Name" min-width="180">
        <template #default="{ row }">
          <button type="button" class="link-button" @click="openProject(row)">
            {{ row.name }}
          </button>
        </template>
      </vxe-column>
      <vxe-column field="description" title="Description" min-width="240">
        <template #default="{ row }">
          {{ row.description || '-' }}
        </template>
      </vxe-column>
      <vxe-column field="memberCount" title="Members" width="120">
        <template #default="{ row }">
          {{ row.memberCount ?? '-' }}
        </template>
      </vxe-column>
      <vxe-column field="createdAt" title="Created" width="190">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </vxe-column>
    </vxe-table>
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
  display: grid;
  max-width: 820px;
  grid-template-columns: minmax(180px, 1fr) minmax(220px, 1.5fr) auto;
  gap: 10px;
}

input {
  min-width: 0;
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

.link-button {
  border: 0;
  background: transparent;
  color: #4338ca;
  padding: 0;
  text-align: left;
}

.error-message {
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  padding: 10px 12px;
}

.muted {
  color: #6b7280;
}

@media (max-width: 780px) {
  .create-form {
    grid-template-columns: 1fr;
  }
}
</style>
