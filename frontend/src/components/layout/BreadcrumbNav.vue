<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const route = useRoute()

type BreadcrumbSegment = {
  label: string
  to: string
}

function getParamValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

const segments = computed<BreadcrumbSegment[]>(() => {
  const workspaceId = getParamValue(route.params.workspaceId ?? route.params.id)
  const projectId = getParamValue(route.params.projectId)
  const items: BreadcrumbSegment[] = [{ label: '工作区', to: '/workspaces' }]

  if (appStore.currentWorkspace && workspaceId) {
    items.push({
      label: appStore.currentWorkspace.name,
      to: `/workspaces/${workspaceId}`,
    })
  }

  if (appStore.currentProject && workspaceId && projectId) {
    items.push({
      label: appStore.currentProject.name,
      to: `/workspaces/${workspaceId}/projects/${projectId}`,
    })
  }

  return items
})
</script>

<template>
  <nav class="breadcrumb-nav" aria-label="Breadcrumb">
    <template v-for="(segment, index) in segments" :key="segment.to">
      <RouterLink
        class="breadcrumb-link"
        :class="{ 'is-current': index === segments.length - 1 }"
        :to="segment.to"
      >
        {{ segment.label }}
      </RouterLink>
      <span v-if="index < segments.length - 1" class="breadcrumb-divider">/</span>
    </template>
  </nav>
</template>

<style scoped>
.breadcrumb-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 14px;
  min-width: 0;
}

.breadcrumb-link {
  color: var(--color-text-secondary);
  text-decoration: none;
}

.breadcrumb-link.is-current {
  color: var(--color-text-primary);
  font-weight: 600;
}

.breadcrumb-divider {
  color: var(--color-text-secondary);
}
</style>
