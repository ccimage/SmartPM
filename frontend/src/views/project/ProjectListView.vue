<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { createProject, listProjects, type Project } from '@/api/project'
import ProjectCard from '@/components/project/ProjectCard.vue'
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
const viewMode = useLocalStorage<'grid' | 'list'>('project-view-mode', 'grid')

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

function handleProjectUpdated(updated: Project) {
  const index = projects.value.findIndex((project) => project.id === updated.id)
  if (index !== -1) {
    projects.value[index] = updated
  }
}

function handleProjectDeleted(id: string) {
  projects.value = projects.value.filter((project) => project.id !== id)
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
        <h2>项目</h2>
        <p>{{ projects.length }} 个项目</p>
      </div>

      <div class="view-toggle">
        <button
          type="button"
          :class="['toggle-btn', { active: viewMode === 'grid' }]"
          title="大图模式"
          @click="viewMode = 'grid'"
        >
          <i class="fa-solid fa-grip" />
        </button>
        <button
          type="button"
          :class="['toggle-btn', { active: viewMode === 'list' }]"
          title="列表模式"
          @click="viewMode = 'list'"
        >
          <i class="fa-solid fa-list" />
        </button>
      </div>
    </div>

    <form class="create-form" @submit.prevent="handleCreateProject">
      <input v-model="projectName" type="text" placeholder="项目名称" />
      <ProjectStylePicker
        :icon="projectIcon"
        :color="projectColor"
        @update:icon="projectIcon = $event"
        @update:color="projectColor = $event"
      />
      <button type="submit" :disabled="!canCreate || isCreating">
        {{ isCreating ? '创建中...' : '创建项目' }}
      </button>
      <input
        v-model="projectDescription"
        class="description-input"
        type="text"
        placeholder="描述"
      />
    </form>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p v-else-if="isLoading" class="muted">加载中...</p>

    <div v-else-if="viewMode === 'grid'" class="project-grid">
      <ProjectCard
        v-for="project in projects"
        :key="project.id"
        :project="project"
        @click="openProject(project)"
        @updated="handleProjectUpdated"
        @deleted="handleProjectDeleted(project.id)"
      />
      <button
        type="button"
        class="new-project-card"
        @click="$el.closest('.page-section')?.querySelector('.create-form input')?.focus()"
      >
        <i class="fa-solid fa-plus" />
        <span>创建新项目</span>
      </button>
    </div>

    <div v-else class="project-list">
      <div
        v-for="project in projects"
        :key="project.id"
        class="list-row"
        :style="{ '--project-color': project.color }"
        @click="openProject(project)"
      >
        <div class="list-icon" :style="{ background: project.color + '18', color: project.color }">
          <i :class="'fa-solid fa-' + project.icon" />
        </div>
        <div class="list-info">
          <span class="list-name">{{ project.name }}</span>
          <span class="list-desc">{{ project.description || '' }}</span>
        </div>
        <span class="list-meta"><i class="fa-solid fa-users" /> {{ project.memberCount ?? 0 }}</span>
        <span class="list-meta">{{ formatDate(project.createdAt) }}</span>
        <div class="list-actions" @click.stop>
          <button type="button" class="list-action-btn" @click="openProject(project)">
            <i class="fa-solid fa-arrow-right" />
          </button>
        </div>
      </div>
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
  align-items: flex-start;
  justify-content: space-between;
}

.view-toggle {
  display: flex;
  gap: 4px;
  border: 1px solid var(--color-border-default);
  border-radius: 10px;
  padding: 3px;
  background: var(--color-bg-panel);
}

.toggle-btn {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition:
    background 150ms,
    color 150ms;
}

.toggle-btn.active {
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
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

.error-message {
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-primary-soft) 35%, var(--color-bg-panel));
  color: var(--color-text-primary);
  padding: 10px 12px;
}

.muted {
  color: var(--color-text-secondary);
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.new-project-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 180px;
  border: 2px dashed var(--color-border-default);
  border-radius: 20px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition:
    border-color 200ms,
    color 200ms;
}

.new-project-card:hover {
  border-color: var(--color-primary);
  color: var(--color-primary-text);
}

.new-project-card i {
  font-size: 24px;
}

.project-list {
  display: grid;
  gap: 6px;
}

.list-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border: 1px solid var(--color-border-default);
  border-radius: 14px;
  background: var(--color-bg-panel);
  cursor: pointer;
  transition:
    box-shadow 150ms,
    border-color 150ms;
}

.list-row:hover {
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08);
  border-color: var(--project-color);
}

.list-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.list-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.list-name {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: 14px;
}

.list-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-meta {
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 5px;
}

.list-actions {
  display: flex;
  gap: 6px;
}

.list-action-btn {
  width: 30px;
  height: 30px;
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.list-action-btn:hover {
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
  border-color: var(--color-primary);
}

@media (max-width: 780px) {
  .create-form {
    grid-template-columns: 1fr;
  }

  .list-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
