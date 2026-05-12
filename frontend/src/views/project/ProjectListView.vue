<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createProject, listProjects, type Project } from '@/api/project'
import ProjectStylePicker from '@/components/project/ProjectStylePicker.vue'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const projects = ref<Project[]>([])
const projectName = ref('')
const projectDescription = ref('')
const projectIcon = ref('code')
const projectColor = ref('#4f46e5')
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
      icon: projectIcon.value,
      color: projectColor.value,
      ...(description ? { description } : {}),
    })
    projects.value = [response.data, ...projects.value]
    projectName.value = ''
    projectDescription.value = ''
    projectIcon.value = 'code'
    projectColor.value = '#4f46e5'
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
      <ProjectStylePicker
        :icon="projectIcon"
        :color="projectColor"
        @update:icon="projectIcon = $event"
        @update:color="projectColor = $event"
      />
      <button type="submit" :disabled="!canCreate || isCreating">
        {{ isCreating ? 'Creating...' : 'Create project' }}
      </button>
      <input
        v-model="projectDescription"
        class="description-input"
        type="text"
        placeholder="Description"
      />
    </form>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p v-else-if="isLoading" class="muted">Loading projects...</p>

    <vxe-table v-else :data="projects" border round>
      <vxe-column field="name" title="Name" min-width="180">
        <template #default="{ row }">
          <button type="button" class="link-button" @click="openProject(row)">
            <i :class="'fa-solid fa-' + row.icon" :style="{ color: row.color, marginRight: '8px' }" />
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
  color: var(--color-text-primary);
  font-size: 24px;
}

p {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
}

.create-form {
  display: grid;
  max-width: 820px;
  grid-template-columns: 1fr auto auto;
  align-items: start;
  gap: 10px;
}

input {
  min-width: 0;
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--color-text-primary);
  background: var(--color-bg-panel);
}

button {
  border-radius: 8px;
  font-weight: 700;
}

.create-form button {
  border: 0;
  background: var(--color-primary);
  color: var(--color-bg-panel);
  padding: 10px 14px;
}

.description-input {
  grid-column: 1 / -1;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.link-button {
  border: 0;
  background: transparent;
  color: var(--color-primary-text);
  padding: 0;
  text-align: left;
  display: inline-flex;
  align-items: center;
}

.error-message {
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-primary-soft) 35%, var(--color-bg-panel));
  color: var(--color-text-primary);
  padding: 10px 12px;
}

.muted {
  color: var(--color-text-secondary);
}

@media (max-width: 780px) {
  .create-form {
    grid-template-columns: 1fr;
  }
}
</style>
