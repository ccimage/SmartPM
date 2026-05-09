import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Project } from '@/api/project'
import type { Workspace } from '@/api/workspace'

export const useAppStore = defineStore('app', () => {
  const currentWorkspace = ref<Workspace | null>(null)
  const currentProject = ref<Project | null>(null)

  function setCurrentWorkspace(workspace: Workspace | null) {
    currentWorkspace.value = workspace

    if (!workspace) {
      currentProject.value = null
    }
  }

  function setCurrentProject(project: Project | null) {
    currentProject.value = project
  }

  return {
    currentWorkspace,
    currentProject,
    setCurrentWorkspace,
    setCurrentProject,
  }
})
