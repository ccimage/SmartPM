<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  createTask,
  deleteTask,
  listTasks,
  updateTask,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type UpdateTaskPayload,
} from '@/api/task'
import { getProject } from '@/api/project'
import { useAppStore } from '@/stores/app'
import RichTextEditor from '@/components/common/RichTextEditor.vue'

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

const detailForm = reactive({
  title: '',
  status: 'todo' as TaskStatus,
  priority: 'normal' as TaskPriority,
  description: '',
  dueDate: '',
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

function openTask(task: Task) {
  selectedTask.value = task
  drawerErrorMessage.value = ''
  detailForm.title = task.title
  detailForm.status = task.status
  detailForm.priority = task.priority
  detailForm.description = task.description ?? ''
  detailForm.dueDate = task.dueDate ? task.dueDate.slice(0, 10) : ''
}

function closeTask() {
  selectedTask.value = null
  drawerErrorMessage.value = ''
}

function updateTaskInList(task: Task) {
  tasks.value = tasks.value.map((item) => (item.id === task.id ? task : item))

  if (selectedTask.value?.id === task.id) {
    selectedTask.value = task
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
    dueDate: detailForm.dueDate || null,
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
  await Promise.all([loadProjectContext(), loadTasks()])
})

watch(projectId, async () => {
  closeTask()
  cancelAdding()
  await Promise.all([loadProjectContext(), loadTasks()])
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

    <div v-if="selectedTask" class="drawer-backdrop" @click.self="closeTask">
      <aside class="task-drawer" aria-label="Task details">
        <header class="drawer-header">
          <div>
            <p class="drawer-eyebrow">{{ statusLabels[selectedTask.status] }}</p>
            <input v-model="detailForm.title" class="title-input" type="text" />
          </div>
          <button class="close-button" type="button" aria-label="Close task details" @click="closeTask">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="drawer-fields">
          <label>
            <span>Status</span>
            <select v-model="detailForm.status">
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </label>

          <label>
            <span>Priority</span>
            <select v-model="detailForm.priority">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>

          <label>
            <span>Due date</span>
            <input v-model="detailForm.dueDate" type="date" />
          </label>

          <label class="description-field">
            <span>Description</span>
            <RichTextEditor v-model="detailForm.description" placeholder="Add details" />
          </label>
        </div>

        <p v-if="drawerErrorMessage" class="form-error">{{ drawerErrorMessage }}</p>

        <footer class="drawer-actions">
          <button class="primary-button" type="button" :disabled="isSaving" @click="saveTask">
            {{ isSaving ? 'Saving...' : 'Save' }}
          </button>
          <button class="danger-button" type="button" :disabled="isDeleting" @click="removeTask">
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
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

.add-task-form input,
.drawer-fields input,
.drawer-fields select,
.title-input {
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
}

.add-actions button,
.primary-button {
  border: 0;
  border-radius: 8px;
  background: var(--color-primary);
  color: var(--color-bg-panel);
  font-weight: 700;
  padding: 10px 14px;
}

.ghost-button {
  border: 1px solid var(--color-border-default) !important;
  background: var(--color-bg-panel) !important;
  color: var(--color-text-secondary) !important;
}

.danger-button {
  border: 1px solid rgba(220, 38, 38, 0.18);
  border-radius: 8px;
  background: rgba(254, 242, 242, 0.96);
  color: rgb(185 28 28);
  font-weight: 700;
  padding: 10px 14px;
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
  justify-content: flex-end;
  background: rgb(17 24 39 / 32%);
}

.task-drawer {
  display: flex;
  width: min(440px, 100vw);
  height: 100vh;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  background: var(--color-bg-panel);
  border-left: 1px solid var(--color-border-default);
  box-shadow: -20px 0 48px rgba(15, 23, 42, 0.14);
  padding: 22px;
}

.drawer-header {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
}

.drawer-eyebrow {
  margin-bottom: 8px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.title-input {
  border: none;
  border-bottom: 2px solid var(--color-border-default);
  border-radius: 0;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 20px;
  font-weight: 800;
  padding: 4px 0;
}

.title-input:focus {
  border-bottom-color: var(--color-primary);
  outline: none;
}

.close-button {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border-default);
  border-radius: 10px;
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  padding: 0;
}

.drawer-fields {
  display: grid;
  gap: 14px;
}

.drawer-fields label {
  display: grid;
  gap: 6px;
}

.drawer-fields span {
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.drawer-actions {
  display: flex;
  gap: 10px;
  margin-top: auto;
  padding-top: 8px;
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
    background: transparent;
  }

  .task-drawer {
    width: 100vw;
  }

  .drawer-actions {
    flex-direction: column;
  }
}
</style>
