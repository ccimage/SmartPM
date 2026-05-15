<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { listTaskActivities, type ActivityLog } from '@/api/activity'
import { createComment, deleteComment, listComments, updateComment, type Comment } from '@/api/comment'
import RichTextEditor from '@/components/common/RichTextEditor.vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  taskId: string
}>()

const authStore = useAuthStore()

const activeTab = ref<'comments' | 'activities'>('comments')
const comments = ref<Comment[]>([])
const activities = ref<ActivityLog[]>([])
const isLoadingComments = ref(false)
const isLoadingActivities = ref(false)
const isSubmitting = ref(false)
const editingCommentId = ref<string | null>(null)
const newCommentContent = ref('')
const editCommentContent = ref('')
const commentErrorMessage = ref('')
const activityErrorMessage = ref('')

const avatarColors = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2']

const statusLabels: Record<string, string> = {
  todo: '待处理',
  in_progress: '进行中',
  done: '已完成',
}

const currentUserId = computed(() => authStore.user?.id ?? null)

function hashName(name: string) {
  let hash = 0

  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  return Math.abs(hash)
}

function getAvatarColor(name: string) {
  return avatarColors[hashName(name || 'User') % avatarColors.length]
}

function getInitials(name: string) {
  const trimmed = name.trim()

  if (!trimmed) {
    return 'U'
  }

  const parts = trimmed.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return trimmed.slice(0, 2).toUpperCase()
}

function formatRelativeTime(dateStr: string): string {
  const timestamp = new Date(dateStr).getTime()

  if (Number.isNaN(timestamp)) {
    return ''
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))

  if (diffSeconds < 60) {
    return '刚刚'
  }

  const diffMinutes = Math.floor(diffSeconds / 60)

  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours}小时前`
  }

  const diffDays = Math.floor(diffHours / 24)

  if (diffDays < 30) {
    return `${diffDays}天前`
  }

  return new Date(dateStr).toLocaleDateString()
}

function isOwnComment(comment: Comment) {
  return Boolean(currentUserId.value && comment.author.id === currentUserId.value)
}

function isEmptyHtml(html: string): boolean {
  return !html || html.replace(/<[^>]*>/g, '').trim() === ''
}

function getStatusLabel(status: unknown) {
  return typeof status === 'string' ? (statusLabels[status] ?? status) : ''
}

function getActivityDescription(activity: ActivityLog) {
  switch (activity.action) {
    case 'task.created':
      return '创建了任务'
    case 'task.status_changed': {
      const before = getStatusLabel(activity.extra?.before?.status)
      const after = getStatusLabel(activity.extra?.after?.status)
      return `将状态从 ${before || '-'} 改为 ${after || '-'}`
    }
    case 'task.updated':
      return '更新了任务'
    case 'comment.added':
      return '添加了评论'
    case 'comment.deleted':
      return '删除了评论'
    default:
      return activity.action
  }
}

async function loadComments() {
  if (!props.taskId) {
    comments.value = []
    return
  }

  isLoadingComments.value = true
  commentErrorMessage.value = ''

  try {
    const response = await listComments(props.taskId)
    comments.value = response.data
  } catch {
    commentErrorMessage.value = '评论加载失败'
    comments.value = []
  } finally {
    isLoadingComments.value = false
  }
}

async function loadActivities() {
  if (!props.taskId) {
    activities.value = []
    return
  }

  isLoadingActivities.value = true
  activityErrorMessage.value = ''

  try {
    const response = await listTaskActivities(props.taskId)
    activities.value = response.data
  } catch {
    activityErrorMessage.value = '动态加载失败'
    activities.value = []
  } finally {
    isLoadingActivities.value = false
  }
}

async function submitComment() {
  const content = newCommentContent.value.trim()

  if (isEmptyHtml(content) || isSubmitting.value) {
    return
  }

  isSubmitting.value = true
  commentErrorMessage.value = ''

  try {
    const comment = await createComment(props.taskId, content)
    comments.value = [comment, ...comments.value]
    newCommentContent.value = ''

    if (activeTab.value === 'activities') {
      await loadActivities()
    }
  } catch {
    commentErrorMessage.value = '评论发送失败'
  } finally {
    isSubmitting.value = false
  }
}

function startEditing(comment: Comment) {
  editingCommentId.value = comment.id
  editCommentContent.value = comment.content
}

function cancelEditing() {
  editingCommentId.value = null
  editCommentContent.value = ''
}

async function saveEdit(comment: Comment) {
  const content = editCommentContent.value.trim()

  if (isEmptyHtml(content)) {
    return
  }

  try {
    const updated = await updateComment(comment.id, content)
    comments.value = comments.value.map((item) =>
      item.id === comment.id ? { ...item, content: updated.content, updatedAt: updated.updatedAt } : item,
    )
    cancelEditing()
  } catch {
    commentErrorMessage.value = '评论更新失败'
  }
}

async function removeComment(comment: Comment) {
  const shouldDelete = window.confirm('确定删除这条评论？')

  if (!shouldDelete) {
    return
  }

  try {
    await deleteComment(comment.id)
    comments.value = comments.value.filter((item) => item.id !== comment.id)
  } catch {
    commentErrorMessage.value = '评论删除失败'
  }
}

function switchTab(tab: 'comments' | 'activities') {
  activeTab.value = tab

  if (tab === 'activities' && activities.value.length === 0 && !isLoadingActivities.value) {
    void loadActivities()
  }
}

onMounted(async () => {
  await loadComments()
})

watch(
  () => props.taskId,
  async () => {
    cancelEditing()
    newCommentContent.value = ''
    activities.value = []
    await loadComments()

    if (activeTab.value === 'activities') {
      await loadActivities()
    }
  },
)
</script>

<template>
  <section class="task-comment-panel">
    <div class="panel-tabs" role="tablist" aria-label="任务评论和动态">
      <button
        type="button"
        class="tab-button"
        :class="{ active: activeTab === 'comments' }"
        role="tab"
        :aria-selected="activeTab === 'comments'"
        @click="switchTab('comments')"
      >
        评论
      </button>
      <button
        type="button"
        class="tab-button"
        :class="{ active: activeTab === 'activities' }"
        role="tab"
        :aria-selected="activeTab === 'activities'"
        @click="switchTab('activities')"
      >
        动态
      </button>
    </div>

    <div v-if="activeTab === 'comments'" class="tab-content">
      <p v-if="isLoadingComments" class="muted-state">评论加载中...</p>
      <p v-else-if="comments.length === 0" class="muted-state">暂无评论</p>

      <div v-else class="comment-list">
        <article v-for="comment in comments" :key="comment.id" class="comment-item">
          <div
            class="avatar"
            :style="{ background: getAvatarColor(comment.author.name) }"
            aria-hidden="true"
          >
            {{ getInitials(comment.author.name) }}
          </div>

          <div class="comment-body">
            <div class="comment-header">
              <span class="author-name">{{ comment.author.name }}</span>
              <span class="relative-time">{{ formatRelativeTime(comment.createdAt) }}</span>
              <div v-if="isOwnComment(comment)" class="comment-actions">
                <button type="button" class="icon-button" aria-label="编辑评论" @click="startEditing(comment)">
                  <i class="pi pi-pencil" />
                </button>
                <button type="button" class="icon-button danger" aria-label="删除评论" @click="removeComment(comment)">
                  <i class="pi pi-trash" />
                </button>
              </div>
            </div>

            <div v-if="editingCommentId === comment.id" class="edit-box">
              <RichTextEditor v-model="editCommentContent" toolbar-preset="minimal" />
              <div class="edit-actions">
                <Button label="保存" size="small" :disabled="isEmptyHtml(editCommentContent)" @click="saveEdit(comment)" />
                <button type="button" class="text-button" @click="cancelEditing">取消</button>
              </div>
            </div>

            <div v-else class="comment-content-editor">
              <RichTextEditor :model-value="comment.content" :readonly="true" />
            </div>
          </div>
        </article>
      </div>

      <p v-if="commentErrorMessage" class="inline-error">{{ commentErrorMessage }}</p>

      <div class="composer">
        <RichTextEditor
          v-model="newCommentContent"
          placeholder="添加评论..."
          toolbar-preset="minimal"
        />
        <div class="composer-actions">
          <Button
            label="发送"
            size="small"
            :disabled="isSubmitting || isEmptyHtml(newCommentContent)"
            @click="submitComment"
            class="primary-button"
          />
        </div>
      </div>
    </div>

    <div v-else class="tab-content">
      <p v-if="isLoadingActivities" class="muted-state">动态加载中...</p>
      <p v-else-if="activities.length === 0" class="muted-state">暂无动态</p>

      <div v-else class="activity-list">
        <article v-for="activity in activities" :key="activity.id" class="activity-item">
          <div
            class="avatar"
            :style="{ background: getAvatarColor(activity.user.name) }"
            aria-hidden="true"
          >
            {{ getInitials(activity.user.name) }}
          </div>
          <div class="activity-body">
            <p>
              <span class="author-name">{{ activity.user.name }}</span>
              <span class="activity-description"> {{ getActivityDescription(activity) }}</span>
            </p>
            <span class="relative-time">{{ formatRelativeTime(activity.createdAt) }}</span>
          </div>
        </article>
      </div>

      <p v-if="activityErrorMessage" class="inline-error">{{ activityErrorMessage }}</p>
    </div>
  </section>
</template>

<style scoped>
.task-comment-panel {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.panel-tabs {
  display: flex;
  gap: 18px;
  border-bottom: 1px solid var(--color-border-default);
}

.tab-button {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 700;
  padding: 0 0 8px;
}

.tab-button.active {
  border-bottom-color: var(--color-primary);
  color: var(--color-primary);
}

.tab-content {
  display: grid;
  gap: 12px;
}

.comment-list,
.activity-list {
  display: grid;
  gap: 12px;
}

.comment-item,
.activity-item {
  display: flex;
  gap: 10px;
  min-width: 0;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
}

.comment-body,
.activity-body {
  min-width: 0;
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
}

.author-name {
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 700;
}

.relative-time {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.comment-actions {
  display: flex;
  gap: 2px;
  margin-left: auto;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.comment-item:hover .comment-actions,
.comment-actions:focus-within {
  opacity: 1;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.icon-button:hover {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.icon-button.danger:hover {
  background: rgba(254, 226, 226, 0.9);
  color: rgb(185 28 28);
}

.comment-content-editor {
  margin: 3px 0 0;
  color: var(--color-text-primary);
  font-size: 14px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.comment-content-editor :deep(.rich-text-editor) {
  border: none;
  background: transparent;
}

.comment-content-editor :deep(.ql-container) {
  border: none;
  min-height: unset;
}

.comment-content-editor :deep(.ql-editor) {
  min-height: unset;
  padding: 0;
}

.composer,
.edit-box {
  display: grid;
  gap: 8px;
}

.composer-actions,
.edit-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.text-button {
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 700;
  padding: 6px 8px;
}

.text-button:hover {
  color: var(--color-primary);
}

.activity-body p {
  margin: 0 0 3px;
  color: var(--color-text-primary);
  font-size: 14px;
  line-height: 1.45;
}

.activity-description {
  color: var(--color-text-primary);
}

.muted-state {
  margin: 0;
  border: 1px dashed var(--color-border-default);
  border-radius: 8px;
  color: var(--color-text-secondary);
  font-size: 13px;
  padding: 14px;
  text-align: center;
}

.inline-error {
  margin: 0;
  border-radius: 8px;
  background: rgba(254, 242, 242, 0.96);
  color: rgb(185 28 28);
  font-size: 13px;
  padding: 8px 10px;
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
</style>
