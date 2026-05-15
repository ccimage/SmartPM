<script setup lang="ts">
import { ref, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { deleteProject, updateProject, type Project } from '@/api/project'
import ProjectStylePicker from '@/components/project/ProjectStylePicker.vue'

const props = defineProps<{
  project: Project
}>()

const emit = defineEmits<{
  click: []
  updated: [project: Project]
  deleted: []
  edit: [project: Project]
}>()

const moreRef = ref<HTMLElement | null>(null)
const showMore = ref(false)
const localIcon = ref(props.project.icon)
const localColor = ref(props.project.color)

watch(
  () => props.project,
  (project) => {
    localIcon.value = project.icon
    localColor.value = project.color
  },
)

onClickOutside(moreRef, () => {
  showMore.value = false
})

async function updateStyle(next: { icon?: string; color?: string }) {
  const icon = next.icon ?? localIcon.value
  const color = next.color ?? localColor.value

  await updateProject(props.project.id, { icon, color })

  localIcon.value = icon
  localColor.value = color
  emit('updated', { ...props.project, icon, color })
}

function handleIconUpdate(icon: string) {
  if (icon === localIcon.value) {
    return
  }

  void updateStyle({ icon })
}

function handleColorUpdate(color: string) {
  if (color === localColor.value) {
    return
  }

  void updateStyle({ color })
}

async function handleDelete() {
  await deleteProject(props.project.id)
  showMore.value = false
  emit('deleted')
}

function handleEdit() {
  showMore.value = false
  emit('edit', props.project)
}
</script>

<template>
  <article
    class="project-card"
    :style="{ '--project-color': localColor }"
    @click="emit('click')"
  >
    <div class="card-actions" @click.stop>
      <ProjectStylePicker
        class="card-style-picker"
        :icon="localIcon"
        :color="localColor"
        @update:icon="handleIconUpdate"
        @update:color="handleColorUpdate"
      />

      <div ref="moreRef" class="more-wrapper">
        <button
          type="button"
          class="action-button"
          aria-label="更多操作"
          @click="showMore = !showMore"
        >
          <i class="fa-solid fa-ellipsis" />
        </button>

        <Transition name="more-pop">
          <div v-if="showMore" class="more-menu">
            <button type="button" class="menu-item delete-item" @click="handleDelete">
              <i class="fa-solid fa-trash" />
              <span>删除</span>
            </button>
            <button type="button" class="menu-item edit-item" @click="handleEdit">
              <i class="fa-solid fa-pen" />
              <span>编辑</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <div class="top-area">
      <div class="icon-block" :style="{ background: localColor + '18', color: localColor }">
        <i :class="'fa-solid fa-' + localIcon" />
      </div>
    </div>

    <div class="bottom-area">
      <h3 class="project-name">{{ project.name }}</h3>
      <p class="project-description">{{ project.description || '' }}</p>
      <span class="member-count">
        <i class="fa-solid fa-users" />
        {{ project.memberCount ?? 0 }}
      </span>
    </div>
  </article>
</template>

<style scoped>
.project-card {
  position: relative;
  display: flex;
  min-height: 180px;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid var(--color-border-default);
  border-radius: 20px;
  background: var(--color-bg-panel);
  padding: 20px;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.project-card:hover {
  border-color: var(--project-color);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.1);
}

.card-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 150ms ease;
}

.project-card:hover .card-actions,
.card-actions:focus-within {
  opacity: 1;
}

.card-style-picker :deep(.style-trigger),
.action-button {
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  font-size: 13px;
  padding: 0;
  transition:
    background 150ms ease,
    border-color 150ms ease,
    color 150ms ease;
}

.card-style-picker :deep(.style-trigger:hover),
.action-button:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-soft) !important;
  color: var(--color-primary-text) !important;
}

.card-style-picker :deep(.picker-panel) {
  right: auto;
  left: auto;
  background: var(--color-bg-panel);
}

.more-wrapper {
  position: relative;
}

.more-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 200;
  min-width: 120px;
  border: 1px solid var(--color-border-default);
  border-radius: 12px;
  background: var(--color-bg-panel);
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.14);
  padding: 6px;
}

.menu-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 13px;
  line-height: 1;
  padding: 9px 10px;
  text-align: left;
  transition:
    background 150ms ease,
    color 150ms ease;
}

.delete-item:hover {
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
}

.edit-item:hover {
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
}

.top-area {
  display: flex;
  justify-content: center;
}

.icon-block {
  display: flex;
  width: 64px;
  height: 64px;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  font-size: 28px;
}

.bottom-area {
  display: grid;
  gap: 6px;
}

.project-name {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
}

.project-description {
  display: -webkit-box;
  min-height: 34px;
  margin: 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.member-count {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1;
}

.more-pop-enter-active,
.more-pop-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.more-pop-enter-from,
.more-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
