<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  createTask,
  deleteTask,
  getTask,
  listTags,
  listTasks,
  setTaskTags,
  updateTask,
  type Tag,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type UpdateTaskPayload,
} from '@/api/task'
import { getProject } from '@/api/project'
import { useAppStore } from '@/stores/app'
import RichTextEditor from '@/components/common/RichTextEditor.vue'
import TaskCommentPanel from '@/components/task/TaskCommentPanel.vue'
import TaskFieldRow from '@/components/task/TaskFieldRow.vue'
import TagSelector from '@/components/task/TagSelector.vue'

interface ColumnDefinition {
  status: TaskStatus
  label: string
}

const route = useRoute()
const appStore = useAppStore()

const columns: ColumnDefinition[] = [
  { status: 'todo', label: 'Todo' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
]

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}

const statusLabels: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
}

const statusOptions = [
  { label: 'Todo', value: 'todo' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Done', value: 'done' },
]

const priorityOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Normal', value: 'normal' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
]

const tasks = ref<Task[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const draggedTaskId = ref<string | null>(null)
const activeAddStatus = ref<TaskStatus | null>(null)
const newTaskTitle = ref('')
const creatingStatus = ref<TaskStatus | null>(null)
const selectedTask = ref<Task | null>(null)
const errorMessage = ref('')
const addErrorMessage = ref('')
const drawerErrorMessage = ref('')
const projectTags = ref<Tag[]>([])
const detailTagIds = ref<string[]>([])

const detailForm = reactive({
  title: '',
  status: 'todo' as TaskStatus,
  priority: 'normal' as TaskPriority,
  description: '',
  dueDate: undefined as Date | undefined,
})

const projectId = computed(() => {
  const id = route.params.projectId
  return typeof id === 'string' ? id : ''
})

const workspaceId = computed(() => {
  const id = route.params.workspaceId
  return typeof id === 'string' ? id : ''
})

const groupedTasks = computed<Record<TaskStatus, Task[]>>(() => {
  return columns.reduce(
    (groups, column) => {
      groups[column.status] = tasks.value.filter((task) => task.status === column.status)
      return groups
    },
    { todo: [], in_progress: [], done: [] } as Record<TaskStatus, Task[]>,
  )
})

const selectedTaskId = computed(() => selectedTask.value?.id ?? null)

async function loadProjectContext() {
  if (!projectId.value) {
    appStore.setCurrentProject(null)
    return
  }

  if (appStore.currentProject?.id === projectId.value) {
    return
  }

  try {
    const response = await getProject(projectId.value)
    appStore.setCurrentProject(response.data)
  } catch {
    appStore.setCurrentProject(null)
  }
}

async function loadTasks() {
  if (!projectId.value) {
    tasks.value = []
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await listTasks(projectId.value)
    tasks.value = response.data.data
  } catch {
    errorMessage.value = 'Unable to load tasks.'
  } finally {
    isLoading.value = false
  }
}

async function loadTags() {
  if (!projectId.value) {
    projectTags.value = []
    return
  }

  try {
    const response = await listTags(projectId.value)
    projectTags.value = response.data
  } catch {
    projectTags.value = []
  }
}

function taskCount(status: TaskStatus) {
  return groupedTasks.value[status].length
}

function startAdding(status: TaskStatus) {
  activeAddStatus.value = status
  newTaskTitle.value = ''
  addErrorMessage.value = ''
}

function cancelAdding() {
  activeAddStatus.value = null
  newTaskTitle.value = ''
  addErrorMessage.value = ''
}

async function submitNewTask(status: TaskStatus) {
  const title = newTaskTitle.value.trim()

  if (!title || creatingStatus.value) {
    return
  }

  creatingStatus.value = status
  addErrorMessage.value = ''

  try {
    const response = await createTask(projectId.value, {
      title,
      status,
      priority: 'normal',
    })
    tasks.value = [...tasks.value, response.data]
    cancelAdding()
  } catch {
    addErrorMessage.value = 'Unable to create task.'
  } finally {
    creatingStatus.value = null
  }
}

async function openTask(task: Task) {
  selectedTask.value = task
  drawerErrorMessage.value = ''
  // 列表数据不含 description 和 tags，需单独拉取完整数据
  detailForm.title = task.title
  detailForm.status = task.status
  detailForm.priority = task.priority
  detailForm.description = ''
  detailForm.dueDate = task.dueDate ? new Date(task.dueDate): undefined
  detailTagIds.value = []

  try {
    const response = await getTask(task.id)
    const full = response.data
    selectedTask.value = full
    detailForm.description = full.description ?? ''
    detailTagIds.value = full.tags?.map((tag) => tag.id) ?? []
  } catch {
    drawerErrorMessage.value = 'Unable to load task details.'
  }
}

function closeTask() {
  selectedTask.value = null
  drawerErrorMessage.value = ''
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && selectedTask.value) {
    closeTask()
  }
}

function updateTaskInList(task: Task) {
  tasks.value = tasks.value.map((item) => (item.id === task.id ? task : item))

  if (selectedTask.value?.id === task.id) {
    selectedTask.value = task
  }
}

async function handleTagsUpdate(tagIds: string[]) {
  if (!selectedTask.value) {
    return
  }

  const taskId = selectedTask.value.id
  detailTagIds.value = tagIds
  const selectedTags = projectTags.value.filter((tag) => tagIds.includes(tag.id))
  const taskWithTags = { ...selectedTask.value, tags: selectedTags }
  updateTaskInList(taskWithTags)

  try {
    const response = await setTaskTags(taskId, tagIds)
    updateTaskInList(response.data)
    detailTagIds.value = response.data.tags?.map((tag) => tag.id) ?? tagIds

    const knownTagIds = new Set(projectTags.value.map((tag) => tag.id))
    const missingTags = response.data.tags?.filter((tag) => !knownTagIds.has(tag.id)) ?? []
    if (missingTags.length > 0) {
      projectTags.value = [...projectTags.value, ...missingTags]
    }
  } catch {
    drawerErrorMessage.value = 'Unable to update task tags.'
  }
}

async function saveTask() {
  if (!selectedTask.value || isSaving.value) {
    return
  }

  const payload: UpdateTaskPayload = {
    title: detailForm.title.trim(),
    status: detailForm.status,
    priority: detailForm.priority,
    description: detailForm.description.trim(),
    dueDate: detailForm.dueDate?.toLocaleString() || undefined,
  }

  if (!payload.title) {
    drawerErrorMessage.value = 'Task title is required.'
    return
  }

  isSaving.value = true
  drawerErrorMessage.value = ''

  try {
    const response = await updateTask(selectedTask.value.id, payload)
    updateTaskInList(response.data)
  } catch {
    drawerErrorMessage.value = 'Unable to save task.'
  } finally {
    isSaving.value = false
  }
}

async function removeTask() {
  if (!selectedTask.value || isDeleting.value) {
    return
  }

  const shouldDelete = window.confirm('Delete this task?')

  if (!shouldDelete) {
    return
  }

  isDeleting.value = true
  drawerErrorMessage.value = ''

  try {
    await deleteTask(selectedTask.value.id)
    tasks.value = tasks.value.filter((task) => task.id !== selectedTask.value?.id)
    closeTask()
  } catch {
    drawerErrorMessage.value = 'Unable to delete task.'
  } finally {
    isDeleting.value = false
  }
}

function handleDragStart(task: Task, event: DragEvent) {
  draggedTaskId.value = task.id
  event.dataTransfer?.setData('text/plain', task.id)
  event.dataTransfer?.setData('application/x-task-id', task.id)

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function handleDragEnd() {
  draggedTaskId.value = null
}

async function handleDrop(status: TaskStatus, event: DragEvent) {
  event.preventDefault()

  const taskId =
    event.dataTransfer?.getData('application/x-task-id') ||
    event.dataTransfer?.getData('text/plain') ||
    draggedTaskId.value
  const task = tasks.value.find((item) => item.id === taskId)

  if (!task || task.status === status) {
    draggedTaskId.value = null
    return
  }

  const previousStatus = task.status
  tasks.value = tasks.value.map((item) => (item.id === task.id ? { ...item, status } : item))

  try {
    const response = await updateTask(task.id, { status })
    updateTaskInList(response.data)
  } catch {
    tasks.value = tasks.value.map((item) =>
      item.id === task.id ? { ...item, status: previousStatus } : item,
    )
    errorMessage.value = 'Unable to update task status.'
  } finally {
    draggedTaskId.value = null
  }
}

function allowDrop(event: DragEvent) {
  event.preventDefault()

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function isOverdue(dueDate?: string | null) {
  if (!dueDate) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  return due < today
}

function formatDueDate(dueDate?: string | null) {
  if (!dueDate) {
    return ''
  }

  return new Date(dueDate).toLocaleDateString()
}

onMounted(async () => {
  window.addEventListener('keydown', handleGlobalKeydown)
  await Promise.all([loadProjectContext(), loadTasks(), loadTags()])
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})

watch(projectId, async () => {
  closeTask()
  cancelAdding()
  await Promise.all([loadProjectContext(), loadTasks(), loadTags()])
})

watch(workspaceId, () => {
  if (workspaceId.value && appStore.currentWorkspace?.id !== workspaceId.value) {
    appStore.setCurrentWorkspace(null)
  }
})
</script>

<template>
  <section class="board-page">
    <div class="board-toolbar">
      <div>
        <h2>{{ appStore.currentProject?.name ?? 'Task Board' }}</h2>
        <p>{{ tasks.length }} task{{ tasks.length === 1 ? '' : 's' }}</p>
      </div>
    </div>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p v-if="isLoading" class="loading-state">Loading tasks...</p>

    <div v-else class="board-grid">
      <section
        v-for="column in columns"
        :key="column.status"
        class="board-column"
        @dragover="allowDrop"
        @drop="handleDrop(column.status, $event)"
      >
        <header class="column-header">
          <h3>{{ column.label }}</h3>
          <span class="count-badge">{{ taskCount(column.status) }}</span>
        </header>

        <div class="task-list">
          <button
            v-for="task in groupedTasks[column.status]"
            :key="task.id"
            type="button"
            class="task-card"
            :class="{ dragging: draggedTaskId === task.id, selected: selectedTaskId === task.id }"
            draggable="true"
            @click="openTask(task)"
            @dragstart="handleDragStart(task, $event)"
            @dragend="handleDragEnd"
          >
            <span class="task-title">{{ task.title }}</span>

            <span class="task-meta">
              <span class="priority-badge" :class="`priority-${task.priority}`">
                <span class="priority-dot" aria-hidden="true"></span>
                {{ priorityLabels[task.priority] }}
              </span>
            </span>

            <div v-if="task.tags?.length" class="card-tags">
              <span
                v-for="tag in task.tags"
                :key="tag.id"
                class="tag-capsule"
                :style="{
                  background: (tag.color ?? '#64748b') + '18',
                  color: tag.color ?? '#64748b',
                }"
              >
                {{ tag.name }}
              </span>
            </div>

            <span v-if="task.assignee" class="card-line">{{ task.assignee.name }}</span>
            <span
              v-if="task.dueDate"
              class="card-line due-date"
              :class="{ overdue: isOverdue(task.dueDate) }"
            >
              {{ formatDueDate(task.dueDate) }}
            </span>
          </button>

          <div v-if="taskCount(column.status) === 0" class="empty-column">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect
                x="4"
                y="8"
                width="24"
                height="18"
                rx="3"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path d="M4 13h24" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M10 18h12M10 22h8"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            <span>No tasks yet</span>
          </div>
        </div>

        <form
          v-if="activeAddStatus === column.status"
          class="add-task-form"
          @submit.prevent="submitNewTask(column.status)"
        >
          <input
            v-model="newTaskTitle"
            type="text"
            placeholder="Task title"
            autofocus
            @keydown.escape.prevent="cancelAdding"
          />
          <div class="add-actions">
            <button type="submit" :disabled="creatingStatus === column.status || !newTaskTitle.trim()">
              {{ creatingStatus === column.status ? 'Adding...' : 'Add' }}
            </button>
            <button class="ghost-button" type="button" @click="cancelAdding">Cancel</button>
          </div>
          <p v-if="addErrorMessage" class="form-error">{{ addErrorMessage }}</p>
        </form>

        <button
          v-else
          type="button"
          class="add-task-button"
          @click="startAdding(column.status)"
        >
          Add task
        </button>
      </section>
    </div>

    <div v-if="selectedTask" class="drawer-backdrop">
      <aside class="task-drawer" aria-label="Task details">
        <header class="drawer-header">
          <div>
            <p class="drawer-eyebrow">看板: {{ statusLabels[selectedTask.status] }}</p>
          </div>
	          <div class="close-button-container">
	              <Button
	                icon="pi pi-times"
	                text
	                rounded
	                aria-label="Close task details"
	                class="close-button"
	                @click="closeTask"
	              />
	          </div>
        </header>
        <InputText v-model="detailForm.title" class="title-input" fluid />
        <div class="drawer-fields">
          <TaskFieldRow icon="circle-half-stroke" label="状态">
            <Select
              v-model="detailForm.status"
              :options="statusOptions"
              option-label="label"
              option-value="value"
            />
          </TaskFieldRow>

          <TaskFieldRow icon="flag" label="优先级">
            <Select
              v-model="detailForm.priority"
              :options="priorityOptions"
              option-label="label"
              option-value="value"
            />
          </TaskFieldRow>

          <TaskFieldRow icon="calendar" label="截止日期">
            <DatePicker v-model="detailForm.dueDate" date-format="yy-mm-dd" show-icon fluid />
          </TaskFieldRow>

          <TaskFieldRow icon="tag" label="标签">
            <TagSelector
              v-model="detailTagIds"
              :project-id="projectId"
              @update:model-value="handleTagsUpdate"
            />
          </TaskFieldRow>

          <TaskFieldRow icon="align-left" label="描述">
            <RichTextEditor v-model="detailForm.description" placeholder="Add details" />
          </TaskFieldRow>
        </div>

        <TaskCommentPanel v-if="selectedTask" :task-id="selectedTask.id" class="drawer-comment-panel" />

        <p v-if="drawerErrorMessage" class="form-error">{{ drawerErrorMessage }}</p>

        <footer class="drawer-actions">
          <Button
            :label="isSaving ? '保存中...' : '保存'"
            :disabled="isSaving"
            class="primary-button"
            @click="saveTask"
          />
          <Button
            :label="isDeleting ? '删除中...' : '删除'"
            severity="danger"
            outlined
            :disabled="isDeleting"
            class="danger-button"
            @click="removeTask"
          />
        </footer>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.board-page {
  display: grid;
  gap: 18px;
  min-height: calc(100vh - 132px);
}

.board-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

h2,
h3,
p {
  margin: 0;
}

h2 {
  color: var(--color-text-primary);
  font-size: 24px;
}

.board-toolbar p {
  margin-top: 4px;
  color: var(--color-text-secondary);
}

.board-grid {
  display: grid;
  align-items: start;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.board-column {
  display: flex;
  min-height: 560px;
  max-height: calc(100vh - 190px);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(12px);
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px 16px 0 0;
  background: transparent;
  padding: 16px 16px 12px;
}

h3 {
  color: var(--color-text-primary);
  font-size: 15px;
}

.count-badge {
  min-width: 26px;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  padding: 6px 8px;
  text-align: center;
}

.task-list {
  display: grid;
  align-content: start;
  flex: 1;
  gap: 10px;
  overflow-y: auto;
  padding: 12px;
}

.task-card {
  display: grid;
  gap: 8px;
  width: 100%;
  border: 1px solid var(--color-border-default);
  border-radius: 14px;
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  padding: 12px;
  text-align: left;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    opacity 0.15s ease;
}

.task-card:hover,
.task-card.selected {
  border-color: var(--color-primary);
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.1);
}

.task-card.dragging {
  opacity: 0.55;
}

.task-title {
  color: var(--color-text-primary);
  font-weight: 700;
  overflow-wrap: anywhere;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.priority-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.priority-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: rgb(156 163 175);
}

.priority-low .priority-dot {
  background: rgb(156 163 175);
}

.priority-normal .priority-dot {
  background: rgb(37 99 235);
}

.priority-high .priority-dot {
  background: rgb(249 115 22);
}

.priority-urgent .priority-dot {
  background: rgb(220 38 38);
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-capsule {
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
}

.card-line {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.due-date.overdue {
  color: rgb(185 28 28);
  font-weight: 700;
}

.empty-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 12px;
  color: var(--color-text-secondary);
  font-size: 13px;
  opacity: 0.7;
}

.add-task-form {
  display: grid;
  gap: 10px;
  border-top: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  padding: 12px;
}

.add-task-form input {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--color-border-default);
  border-radius: 10px;
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  padding: 10px 12px;
}

.add-actions {
  display: flex;
  gap: 8px;
}

.add-task-button {
  width: calc(100% - 24px);
  margin: 0 12px 12px;
  border: 1px dashed var(--color-primary);
  border-radius: 10px;
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
  font-weight: 700;
  padding: 10px 12px;
  transition:
    border-color 150ms ease,
    background 150ms ease,
    color 150ms ease;
}

.add-task-button:hover:not(:disabled) {
  border-color: var(--color-primary-hover);
  background: color-mix(in srgb, var(--color-primary) 14%, var(--color-bg-panel));
  color: var(--color-primary);
}

.add-actions button {
  border: 0;
  border-radius: 8px;
  background: var(--color-primary);
  color: #ffffff;
  font-weight: 700;
  padding: 10px 14px;
  transition:
    background 150ms ease,
    border-color 150ms ease,
    color 150ms ease;
}

.add-actions button:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.ghost-button {
  border: 1px solid var(--color-border-default) !important;
  background: var(--color-bg-panel) !important;
  color: var(--color-text-secondary) !important;
}

.ghost-button:hover:not(:disabled) {
  border-color: var(--color-primary) !important;
  background: var(--color-primary-soft) !important;
  color: var(--color-primary-text) !important;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.loading-state,
.error-message,
.form-error {
  border-radius: 8px;
  padding: 10px 12px;
}

.loading-state {
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
}

.error-message,
.form-error {
  background: rgba(254, 242, 242, 0.96);
  color: rgb(185 28 28);
}

.form-error {
  font-size: 13px;
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgb(17 24 39 / 48%);
  backdrop-filter: blur(4px);
}

.task-drawer {
  display: flex;
  width: min(900px, 100%);
  max-height: calc(100vh - 48px);
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-default);
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.22);
  padding: 24px;
}

.drawer-header {
  position: sticky;
  top: -24px;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  margin: -24px -24px 0;
  padding: 24px 24px 12px;
  background: var(--color-bg-panel);
  border-bottom: 1px solid var(--color-border-default);
}

.drawer-eyebrow {
  margin-bottom: 8px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.title-input {
  font-size: 20px;
  font-weight: 800;
  width: 100%;
}

.drawer-fields {
  display: grid;
  gap: 14px;
}

.drawer-comment-panel {
  margin-top: 16px;
  border-top: 1px solid var(--color-border-default);
  padding-top: 16px;
}

.drawer-actions {
  display: flex;
  gap: 10px;
  margin-top: auto;
  padding-top: 8px;
}

.primary-button {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #ffffff;
  box-shadow: none;
}

.primary-button:hover:not(:disabled){
  border-color: var(--color-primary-hover);
  background: var(--color-primary-hover);
}

.danger-button {
  border-color: var(--color-primary);
  background: transparent;
  color: var(--color-primary);
}

.danger-button:hover:not(:disabled) {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
}

.close-button{
  color: var(--color-primary);
}

.close-button:hover:not(:disabled) {
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
}

@media (max-width: 980px) {
  .board-grid {
    grid-template-columns: 1fr;
  }

  .board-column {
    min-height: 360px;
    max-height: none;
  }
}

@media (max-width: 620px) {
  .board-page {
    min-height: auto;
  }

  .drawer-backdrop {
    padding: 0;
    align-items: flex-end;
  }

  .task-drawer {
    width: 100%;
    max-height: 90vh;
    border-radius: 20px 20px 0 0;
  }

  .drawer-actions {
    flex-direction: column;
  }
}
.close-button-container {
  position: relative;
  right: -14px;
  top: -14px;
}
</style>
