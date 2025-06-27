"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

interface Project {
  id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
  is_public: boolean
}

interface JourneyStep {
  id: string
  title: string
  description: string
  x: number
  y: number
  width: number
  height: number
  stepType: string
  stepColor: string
  customColorOverride: boolean
  highlighted: boolean
}

interface Connection {
  id: string
  fromId: string
  toId: string
}

interface ProjectContextType {
  currentProject: Project | null
  projects: Project[]
  loading: boolean
  createProject: (title: string, description?: string) => Promise<Project | null>
  loadProject: (projectId: string) => Promise<void>
  loadProjectData: (projectId: string) => Promise<{ steps: JourneyStep[], connections: Connection[] } | undefined>
  saveProject: (projectData: { steps: JourneyStep[], connections: Connection[] }) => Promise<void>
  loadProjects: () => Promise<void>
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)

  // Load user's projects
  const loadProjects = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Create new project
  const createProject = useCallback(async (title: string, description?: string): Promise<Project | null> => {
    if (!user) {
      console.error('No user found when creating project')
      return null
    }

    console.log('Creating project for user:', user.id)
    console.log('User object:', user)

    try {
      const projectData = {
        title,
        description,
        user_id: user.id,
        is_public: false
      }
      
      console.log('Sending project data to Supabase:', projectData)

      const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single()

      console.log('Supabase response - data:', data)
      console.log('Supabase response - error:', error)

      if (error) {
        console.error('Supabase error creating project:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          fullError: error
        })
        throw error
      }

      const newProject = data
      console.log('Project created successfully:', newProject)
      setProjects(prev => [newProject, ...prev])
      setCurrentProject(newProject)
      toast.success('Project created successfully!')
      return newProject
    } catch (error) {
      console.error('Error creating project:', {
        error,
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : 'Not an Error instance',
        errorStack: error instanceof Error ? error.stack : 'No stack trace'
      })
      toast.error(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return null
    }
  }, [user])

  // Load specific project
  const loadProject = useCallback(async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error
      setCurrentProject(data)
    } catch (error) {
      console.error('Error loading project:', error)
      toast.error('Failed to load project')
    }
  }, [])

  // Load project data (steps and connections)
  const loadProjectData = useCallback(async (projectId: string) => {
    try {
      // Load steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('journey_steps')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true })

      if (stepsError) {
        console.error('Error loading steps:', stepsError)
        return
      }

      // Load connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('*')
        .eq('project_id', projectId)

      if (connectionsError) {
        console.error('Error loading connections:', connectionsError)
        return
      }

      // Convert database format to app format
      const steps = (stepsData || []).map(step => ({
        id: step.id,
        title: step.title,
        description: step.description,
        x: step.x,
        y: step.y,
        width: step.width,
        height: step.height,
        stepType: step.step_type,
        stepColor: step.step_color,
        customColorOverride: step.custom_color_override,
        highlighted: false
      }))

      const connections = (connectionsData || []).map(conn => ({
        id: conn.id,
        fromId: conn.from_step_id,
        toId: conn.to_step_id
      }))

      return { steps, connections }
    } catch (error) {
      console.error('Error loading project data:', error)
      return { steps: [], connections: [] }
    }
  }, [])

  // Save project data (steps and connections)
  const saveProject = useCallback(async (projectData: { steps: JourneyStep[], connections: Connection[] }) => {
    if (!currentProject || !user) return

    try {
      const { steps, connections } = projectData

      // Clear existing data first
      if (steps && steps.length > 0) {
        // Delete existing steps for this project
        const { error: deleteStepsError } = await supabase
          .from('journey_steps')
          .delete()
          .eq('project_id', currentProject.id)

        if (deleteStepsError) {
          console.error('Error deleting existing steps:', deleteStepsError)
        }
      }

      if (connections && connections.length > 0) {
        // Delete existing connections for this project
        const { error: deleteConnectionsError } = await supabase
          .from('connections')
          .delete()
          .eq('project_id', currentProject.id)

        if (deleteConnectionsError) {
          console.error('Error deleting existing connections:', deleteConnectionsError)
        }
      }

      // Save steps
      if (steps && steps.length > 0) {
        const stepsToSave = steps.map((step: JourneyStep, index: number) => ({
          id: step.id || uuidv4(),
          project_id: currentProject.id,
          title: step.title,
          description: step.description,
          x: Math.round(step.x),
          y: Math.round(step.y),
          width: Math.round(step.width),
          height: Math.round(step.height),
          step_type: step.stepType || null,
          step_color: step.stepColor || null,
          custom_color_override: step.customColorOverride || false,
          order_index: index
        }))

        const { error: stepsError } = await supabase
          .from('journey_steps')
          .insert(stepsToSave)

        if (stepsError) {
          console.error('Error saving steps:', stepsError)
          throw new Error(`Failed to save steps: ${stepsError.message}`)
        }
      }

      // Save connections
      if (connections && connections.length > 0) {
        const connectionsToSave = connections.map((connection: Connection) => ({
          id: connection.id || uuidv4(),
          project_id: currentProject.id,
          from_step_id: connection.fromId,
          to_step_id: connection.toId
        }))

        const { error: connectionsError } = await supabase
          .from('connections')
          .insert(connectionsToSave)

        if (connectionsError) {
          console.error('Error saving connections:', connectionsError)
          throw new Error(`Failed to save connections: ${connectionsError.message}`)
        }
      }

      // Update project timestamp
      const { error: updateError } = await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentProject.id)

      if (updateError) {
        console.error('Error updating project timestamp:', updateError)
      }

      toast.success('Project saved successfully!')
    } catch (error) {
      console.error('Error saving project:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save project')
    }
  }, [currentProject, user])

  // Update project metadata
  const updateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)

      if (error) throw error

      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p))
      if (currentProject?.id === projectId) {
        setCurrentProject(prev => prev ? { ...prev, ...updates } : null)
      }
    } catch (error) {
      console.error('Error updating project:', error)
      toast.error('Failed to update project')
    }
  }, [currentProject])

  // Delete project
  const deleteProject = useCallback(async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error

      setProjects(prev => prev.filter(p => p.id !== projectId))
      if (currentProject?.id === projectId) {
        setCurrentProject(null)
      }
      toast.success('Project deleted successfully!')
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error('Failed to delete project')
    }
  }, [currentProject])

  // Load projects when user changes
  useEffect(() => {
    if (user) {
      loadProjects()
    } else {
      setProjects([])
      setCurrentProject(null)
    }
  }, [user, loadProjects])

  const value = {
    currentProject,
    projects,
    loading,
    createProject,
    loadProject,
    loadProjectData,
    saveProject,
    loadProjects,
    updateProject,
    deleteProject,
  }

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
} 