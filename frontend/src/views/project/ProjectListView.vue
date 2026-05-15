<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import { createProject, deleteProject, listProjects, updateProject, type Project } from '@/api/project'
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
const isSubmitting = ref(false)
const loadErrorMessage = ref('')
const dialogErrorMessage = ref('')
const viewMode = useLocalStorage<'grid' | 'list'>('project-view-mode', 'grid')
const isProjectDialogOpen = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingProjectId = ref('')

const workspaceId = computed(() => {
  const id = route.params.id ?? route.params.workspaceId
  return typeof id === 'string' ? id : ''
})

const canSubmit = computed(() => workspaceId.value !== '' && projectName.value.trim().length > 0)
const isEditing = computed(() => dialogMode.value === 'edit')
const dialogTitle = computed(() => (isEditing.value ? '编辑项目' : '创建项目'))
const submitLabel = computed(() => {
  if (isSubmitting.value) {
    return isEditing.value ? '保存中...' : '创建中...'
  }
  return isEditing.value ? '保存修改' : '创建项目'
})

function resetProjectForm() {
  projectName.value = ''
  projectDescription.value = ''
  projectIcon.value = 'code'
  projectColor.value = '#4f46e5'
  editingProjectId.value = ''
}

function openCreateDialog() {
  dialogMode.value = 'create'
  dialogErrorMessage.value = ''
  resetProjectForm()
  isProjectDialogOpen.value = true
}

function openEditDialog(project: Project) {
  dialogMode.value = 'edit'
  editingProjectId.value = project.id
  projectName.value = project.name
  projectDescription.value = project.description ?? ''
  projectIcon.value = project.icon
  projectColor.value = project.color
  dialogErrorMessage.value = ''
  isProjectDialogOpen.value = true
}

function closeProjectDialog() {
  isProjectDialogOpen.value = false
  dialogErrorMessage.value = ''
  resetProjectForm()
}

async function loadProjects() {
  if (!workspaceId.value) {
    projects.value = []
    return
  }

  isLoading.value = true
  loadErrorMessage.value = ''

  try {
    const response = await listProjects(workspaceId.value)
    projects.value = response.data
  } catch {
    loadErrorMessage.value = 'Unable to load projects.'
  } finally {
    isLoading.value = false
  }
}

async function handleSubmitProject() {
  if (!canSubmit.value || isSubmitting.value) {
    return
  }

  isSubmitting.value = true
  dialogErrorMessage.value = ''

  const description = projectDescription.value.trim()

  try {
    if (isEditing.value) {
      const response = await updateProject(editingProjectId.value, {
        name: projectName.value.trim(),
        icon: projectIcon.value,
        color: projectColor.value,
        description: description || null,
      })
      handleProjectUpdated(response.data)
      if (appStore.currentProject?.id === response.data.id) {
        appStore.setCurrentProject(response.data)
      }
    } else {
      const response = await createProject(workspaceId.value, {
        name: projectName.value.trim(),
        icon: projectIcon.value,
        color: projectColor.value,
        ...(description ? { description } : {}),
      })
      projects.value = [response.data, ...projects.value]
    }
    closeProjectDialog()
  } catch {
    dialogErrorMessage.value = isEditing.value
      ? 'Unable to update project.'
      : 'Unable to create project.'
  } finally {
    isSubmitting.value = false
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
  if (appStore.currentProject?.id === id) {
    appStore.setCurrentProject(null)
  }
}

async function handleDeleteProject(id: string) {
  try {
    await deleteProject(id)
    handleProjectDeleted(id)
  } catch {
    loadErrorMessage.value = 'Unable to delete project.'
  }
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

      <div class="header-actions">
        <Button type="button" label="创建项目" icon="fa-solid fa-plus" @click="openCreateDialog" />

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
    </div>

    <p v-if="loadErrorMessage" class="error-message">{{ loadErrorMessage }}</p>
    <p v-else-if="isLoading" class="muted">加载中...</p>

    <div v-else-if="viewMode === 'grid'" class="project-grid">
      <ProjectCard
        v-for="project in projects"
        :key="project.id"
        :project="project"
        @click="openProject(project)"
        @updated="handleProjectUpdated"
        @deleted="handleProjectDeleted(project.id)"
        @edit="openEditDialog"
      />
      <button
        type="button"
        class="new-project-card"
        @click="openCreateDialog"
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
          <button type="button" class="list-action-btn" @click="openEditDialog(project)">
            <i class="fa-solid fa-pen" />
            <span>编辑</span>
          </button>
          <button type="button" class="list-action-btn danger" @click="handleDeleteProject(project.id)">
            <i class="fa-solid fa-trash" />
            <span>删除</span>
          </button>
          <button type="button" class="list-action-btn" @click="openProject(project)">
            <i class="fa-solid fa-arrow-right" />
            <span>进入</span>
          </button>
        </div>
      </div>
    </div>

    <Dialog
      v-model:visible="isProjectDialogOpen"
      modal
      :header="dialogTitle"
      :style="{ width: 'min(92vw, 640px)' }"
      class="project-dialog"
      @hide="closeProjectDialog"
    >
      <form class="project-dialog-form" @submit.prevent="handleSubmitProject">
        <label class="field-block">
          <span class="field-label">项目名称</span>
          <InputText v-model="projectName" placeholder="输入项目名称" fluid autofocus />
        </label>

        <label class="field-block">
          <span class="field-label">项目样式</span>
          <ProjectStylePicker
            :icon="projectIcon"
            :color="projectColor"
            @update:icon="projectIcon = $event"
            @update:color="projectColor = $event"
          />
        </label>

        <label class="field-block">
          <span class="field-label">项目描述</span>
          <textarea
            v-model="projectDescription"
            class="project-description-input"
            placeholder="输入项目描述"
            rows="4"
          />
        </label>

        <p v-if="dialogErrorMessage" class="error-message dialog-error">{{ dialogErrorMessage }}</p>

        <div class="dialog-actions">
          <Button type="button" label="取消" severity="secondary" text @click="closeProjectDialog" />
          <Button type="submit" :label="submitLabel" :disabled="!canSubmit || isSubmitting" />
        </div>
      </form>
    </Dialog>
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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
  min-height: 30px;
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  padding: 0 10px;
  white-space: nowrap;
}

.list-action-btn:hover {
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
  border-color: var(--color-primary);
}

.list-action-btn.danger:hover {
  background: color-mix(in srgb, #ef4444 12%, var(--color-bg-panel));
  border-color: #ef4444;
  color: #b91c1c;
}

.project-dialog-form {
  display: grid;
  gap: 16px;
}

.field-block {
  display: grid;
  gap: 8px;
}

.field-label {
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 600;
}

.project-description-input {
  width: 100%;
  resize: vertical;
  border: 1px solid var(--color-border-default);
  border-radius: 12px;
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font: inherit;
  line-height: 1.5;
  padding: 12px 14px;
}

.project-description-input:focus {
  outline: 1px solid var(--color-primary);
  outline-offset: 0;
}

.dialog-error {
  margin: 0;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 780px) {
  .section-header {
    flex-direction: column;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .list-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .list-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
