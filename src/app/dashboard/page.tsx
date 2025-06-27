"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { 
  Plus, 
  Save, 
  Download, 
  Upload, 
  Settings, 
  Trash2, 
  Star, 
  ArrowRight, 
  MoreHorizontal,
  Map,
  Users,
  Zap,
  Shield,
  Sparkles,
  CheckCircle,
  LogOut,
  User,
  Edit,
  ChevronDown
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

// Import the existing journey mapping functionality
// This will be the same as the current page.tsx but wrapped in authentication

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const { currentProject, projects, createProject, loadProject, loadProjectData, saveProject } = useProject()
  
  // All the existing state and functionality from the main page
  const [steps, setSteps] = useState<JourneyStep[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [editingStep, setEditingStep] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [stepToDelete, setStepToDelete] = useState<string | null>(null)
  const [showConnectionDialog, setShowConnectionDialog] = useState(false)
  const [connectionFrom, setConnectionFrom] = useState<string | null>(null)
  
  // New state for drag-to-connect functionality
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [dragConnection, setDragConnection] = useState({ x: 0, y: 0 })
  const [hoveredStep, setHoveredStep] = useState<string | null>(null)

  // New state for inline editing
  const [inlineEditing, setInlineEditing] = useState<string | null>(null)
  const [inlineEditType, setInlineEditType] = useState<'title' | 'description' | null>(null)
  const [inlineEditValue, setInlineEditValue] = useState("")
  const [isExporting, setIsExporting] = useState(false)

  // New state for resizing functionality
  const [isResizing, setIsResizing] = useState(false)
  const [resizingStep, setResizingStep] = useState<string | null>(null)
  const [resizeHandle, setResizeHandle] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })

  // New state for AI generation
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiPrompt, setAIPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAIError] = useState("")

  // New state for legend visibility
  const [showLegend, setShowLegend] = useState(false)

  // New state for connection hover tracking
  const [hoveredConnections, setHoveredConnections] = useState<Set<string>>(new Set())
  const [hoverTimeouts, setHoverTimeouts] = useState<Record<string, NodeJS.Timeout>>({})

  // New state for micro-interactions and animations
  const [animatingSteps, setAnimatingSteps] = useState<Set<string>>(new Set())
  const [deletingSteps, setDeletingSteps] = useState<Set<string>>(new Set())
  const [connectingSteps, setConnectingSteps] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [errorFields, setErrorFields] = useState<Set<string>>(new Set())

  // Canvas navigation state
  const [canvasTransform, setCanvasTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [showGrid, setShowGrid] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [alignmentGuides, setAlignmentGuides] = useState<{ x?: number, y?: number }>({})
  const [isClient, setIsClient] = useState(false)

  // Project management state
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  const [showProjectSelector, setShowProjectSelector] = useState(false)

  // Viewport and coordinate system utilities
  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const stepRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const inlineEditInputRef = useRef<HTMLInputElement>(null)
  const inlineEditTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load project data when currentProject changes
  useEffect(() => {
    const loadCurrentProjectData = async () => {
      if (currentProject) {
        const projectData = await loadProjectData(currentProject.id)
        if (projectData) {
          setSteps(projectData.steps)
          setConnections(projectData.connections)
          toast.success(`Loaded project: ${currentProject.title}`)
        }
      }
    }

    loadCurrentProjectData()
  }, [currentProject, loadProjectData])

  // Generate unique ID
  const generateId = () => uuidv4()

  // Connection hover management functions
  const setConnectionHovered = useCallback((connectionId: string, isHovered: boolean) => {
    if (isHovered) {
      // Clear any existing timeout for this connection
      const existingTimeout = hoverTimeouts[connectionId]
      if (existingTimeout) {
        clearTimeout(existingTimeout)
        setHoverTimeouts(prev => {
          const newMap = { ...prev }
          delete newMap[connectionId]
          return newMap
        })
      }
      
      // Set hovered state immediately
      setHoveredConnections(prev => new Set(prev).add(connectionId))
    } else {
      // Set a timeout to clear the hover state after a shorter delay
      const timeout = setTimeout(() => {
        setHoveredConnections(prev => {
          const newSet = new Set(prev)
          newSet.delete(connectionId)
          return newSet
        })
        setHoverTimeouts(prev => {
          const newMap = { ...prev }
          delete newMap[connectionId]
          return newMap
        })
      }, 50) // Reduced from 100ms to 50ms for better responsiveness
      
      setHoverTimeouts(prev => ({ ...prev, [connectionId]: timeout }))
    }
  }, [hoverTimeouts])

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - canvasTransform.x) / canvasTransform.scale,
      y: (screenY - canvasTransform.y) / canvasTransform.scale
    }
  }, [canvasTransform])

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = useCallback((canvasX: number, canvasY: number) => {
    return {
      x: canvasX * canvasTransform.scale + canvasTransform.x,
      y: canvasY * canvasTransform.scale + canvasTransform.y
    }
  }, [canvasTransform])

  // Add a step to the canvas
  const addStep = useCallback(() => {
    // Position new step relative to current view center
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight - 64 // Account for header
    const centerX = (-canvasTransform.x + viewportWidth / 2) / canvasTransform.scale
    const centerY = (-canvasTransform.y + viewportHeight / 2) / canvasTransform.scale
    
    const newStep: JourneyStep = {
      id: generateId(),
      title: "New Step",
      description: "Describe this step...",
      x: centerX + (Math.random() - 0.5) * 200,
      y: centerY + (Math.random() - 0.5) * 200,
      width: 280,
      height: 160,
      highlighted: false,
      stepType: 'action',
      stepColor: '#10b981',
      customColorOverride: false
    }
    setSteps(prev => [...prev, newStep])
    toast.success("Step added!")
  }, [canvasTransform])

  // Handle step dragging
  const handleMouseDown = useCallback((e: React.MouseEvent, stepId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const step = steps.find(s => s.id === stepId)
    if (!step) return
    
    setSelectedStep(stepId)
    setIsDragging(true)
    
    // Convert screen coordinates to canvas coordinates for accurate dragging
    const canvasCoords = screenToCanvas(e.clientX, e.clientY)
    setDragOffset({
      x: canvasCoords.x - step.x,
      y: canvasCoords.y - step.y
    })
  }, [steps, screenToCanvas])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !selectedStep) return

    // Convert screen coordinates to canvas coordinates
    const canvasCoords = screenToCanvas(e.clientX, e.clientY)
    const newX = canvasCoords.x - dragOffset.x
    const newY = canvasCoords.y - dragOffset.y

    setSteps(prev => prev.map(step =>
      step.id === selectedStep
        ? { ...step, x: newX, y: newY }
        : step
    ))
  }, [isDragging, selectedStep, dragOffset, screenToCanvas])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setSelectedStep(null)
  }, [])

  // Handle inline editing
  const handleDoubleClick = useCallback((step: JourneyStep, field: 'title' | 'description') => {
    setInlineEditing(step.id)
    setInlineEditType(field)
    setInlineEditValue(field === 'title' ? step.title : step.description)
    
    // Focus the input after a short delay
    setTimeout(() => {
      if (field === 'title' && inlineEditInputRef.current) {
        inlineEditInputRef.current.focus()
        inlineEditInputRef.current.select()
      } else if (field === 'description' && inlineEditTextareaRef.current) {
        inlineEditTextareaRef.current.focus()
        inlineEditTextareaRef.current.select()
      }
    }, 100)
  }, [])

  const saveInlineEdit = useCallback(() => {
    if (!inlineEditing || !inlineEditType) return

    setSteps(prev => prev.map(step =>
      step.id === inlineEditing
        ? {
            ...step,
            [inlineEditType === 'title' ? 'title' : 'description']: inlineEditValue
          }
        : step
    ))

    setInlineEditing(null)
    setInlineEditType(null)
    setInlineEditValue("")
  }, [inlineEditing, inlineEditType, inlineEditValue])

  const handleInlineEditKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveInlineEdit()
    } else if (e.key === 'Escape') {
      setInlineEditing(null)
      setInlineEditType(null)
      setInlineEditValue("")
    }
  }, [saveInlineEdit])

  // Connection functions
  const startDragConnect = useCallback((e: React.MouseEvent, fromId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsConnecting(true)
    setConnectingFrom(fromId)
    
    if (canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const mouseX = e.clientX - canvasRect.left
      const mouseY = e.clientY - canvasRect.top
      
      setDragConnection({ x: mouseX, y: mouseY })
    }
  }, [])

  const handleConnectionMouseMove = useCallback((e: MouseEvent) => {
    if (!isConnecting || !canvasRef.current) return

    // Convert screen coordinates to canvas coordinates
    const canvasCoords = screenToCanvas(e.clientX, e.clientY)
    setDragConnection({ x: canvasCoords.x, y: canvasCoords.y })

    const hoveredStepId = Object.keys(stepRefs.current).find(stepId => {
      const stepEl = stepRefs.current[stepId]
      if (!stepEl) return false
      
      const rect = stepEl.getBoundingClientRect()
      return e.clientX >= rect.left && e.clientX <= rect.right &&
             e.clientY >= rect.top && e.clientY <= rect.bottom
    })

    setHoveredStep(hoveredStepId || null)
  }, [isConnecting, screenToCanvas])

  const handleConnectionMouseUp = useCallback((e: MouseEvent) => {
    if (!isConnecting || !connectingFrom) return

    const droppedStepId = Object.keys(stepRefs.current).find(stepId => {
      const stepEl = stepRefs.current[stepId]
      if (!stepEl) return false
      
      const rect = stepEl.getBoundingClientRect()
      return e.clientX >= rect.left && e.clientX <= rect.right &&
             e.clientY >= rect.top && e.clientY <= rect.bottom
    })

    if (droppedStepId && droppedStepId !== connectingFrom) {
      const isDuplicate = connections.some(conn => 
        conn.fromId === connectingFrom && conn.toId === droppedStepId
      )

      if (!isDuplicate) {
        const newConnection: Connection = {
          id: generateId(),
          fromId: connectingFrom,
          toId: droppedStepId,
        }
        setConnections(prev => [...prev, newConnection])
        toast.success("Connection created!")
      }
    }

    setIsConnecting(false)
    setConnectingFrom(null)
    setHoveredStep(null)
  }, [isConnecting, connectingFrom, connections])

  const getConnectionPath = useCallback((fromId: string, toId: string) => {
    const fromStep = steps.find(s => s.id === fromId)
    const toStep = steps.find(s => s.id === toId)
    
    if (!fromStep || !toStep) return ""

    const fromX = fromStep.x + fromStep.width / 2
    const fromY = fromStep.y + fromStep.height / 2
    const toX = toStep.x + toStep.width / 2
    const toY = toStep.y + toStep.height / 2

    const dx = toX - fromX
    const dy = toY - fromY
    const controlX = fromX + dx * 0.5
    const controlY = fromY + dy * 0.5

    return `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`
  }, [steps])

  const getDragConnectionStart = useCallback(() => {
    if (!connectingFrom) return { x: 0, y: 0 }
    
    const fromStep = steps.find(s => s.id === connectingFrom)
    if (!fromStep) return { x: 0, y: 0 }
    
    return {
      x: fromStep.x + fromStep.width / 2,
      y: fromStep.y + fromStep.height / 2
    }
  }, [connectingFrom, steps])

  // Delete step function
  const deleteStep = useCallback((stepId: string) => {
    setSteps(prev => prev.filter(step => step.id !== stepId))
    setConnections(prev => prev.filter(conn => conn.fromId !== stepId && conn.toId !== stepId))
    setShowDeleteDialog(false)
    setStepToDelete(null)
    toast.success("Step deleted successfully")
  }, [])

  // Toggle step highlight
  const toggleStepHighlight = useCallback((stepId: string) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, highlighted: !step.highlighted } : step
    ))
  }, [])

  // Event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  useEffect(() => {
    if (isConnecting) {
      document.addEventListener('mousemove', handleConnectionMouseMove)
      document.addEventListener('mouseup', handleConnectionMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleConnectionMouseMove)
        document.removeEventListener('mouseup', handleConnectionMouseUp)
      }
    }
  }, [isConnecting, handleConnectionMouseMove, handleConnectionMouseUp])

  // Save project handler
  const handleSaveProject = async () => {
    if (!currentProject) {
      toast.error('No project loaded!')
      return
    }
    setIsSaving(true)
    try {
      await saveProject({ steps, connections })
      toast.success('Project saved!')
    } catch (err) {
      toast.error('Failed to save project')
    } finally {
      setIsSaving(false)
    }
  }

  // Export as SVG
  const exportAsSVG = useCallback(() => {
    if (!canvasRef.current) return
    setIsExporting(true)
    try {
      const canvasRect = canvasRef.current.getBoundingClientRect()
      // Use light theme colors for now
      const colors = {
        background: '#f8fafc',
        card: '#ffffff',
        cardBorder: '#e2e8f0',
        text: '#1e293b',
        textMuted: '#64748b',
        connection: '#64748b',
        arrow: '#64748b'
      }
      const svgContent = `
        <svg width="${canvasRect.width}" height="${canvasRect.height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="${colors.arrow}" />
            </marker>
          </defs>
          <rect width="100%" height="100%" fill="${colors.background}" />
          ${connections.map(connection => {
            const path = getConnectionPath(connection.fromId, connection.toId)
            const isHovered = hoveredConnections.has(connection.id)
            
            // Calculate midpoint for delete button in screen coordinates
            const fromStep = steps.find(s => s.id === connection.fromId)
            const toStep = steps.find(s => s.id === connection.toId)
            const midX = fromStep && toStep ? (fromStep.x + fromStep.width/2 + toStep.x + toStep.width/2) / 2 : 0
            const midY = fromStep && toStep ? (fromStep.y + fromStep.height/2 + toStep.y + toStep.height/2) / 2 : 0
            
            // Convert canvas coordinates to screen coordinates for proper positioning
            const screenMidX = midX * canvasTransform.scale + canvasTransform.x
            const screenMidY = midY * canvasTransform.scale + canvasTransform.y
            
            // Convert connection path to screen coordinates
            const fromX = fromStep ? (fromStep.x + fromStep.width/2) * canvasTransform.scale + canvasTransform.x : 0
            const fromY = fromStep ? (fromStep.y + fromStep.height/2) * canvasTransform.scale + canvasTransform.y : 0
            const toX = toStep ? (toStep.x + toStep.width/2) * canvasTransform.scale + canvasTransform.x : 0
            const toY = toStep ? (toStep.y + toStep.height/2) * canvasTransform.scale + canvasTransform.y : 0
            
            const dx = toX - fromX
            const dy = toY - fromY
            const controlX = fromX + dx * 0.5
            const controlY = fromY + dy * 0.5
            const screenPath = `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`
            
            return `<path d="${screenPath}" stroke="${isHovered ? '#8b5cf6' : '#64748b'}`
          }).join('')}
          ${steps.map(step => `
            <g transform="translate(${step.x}, ${step.y})">
              <rect width="${step.width}" height="${step.height}" rx="8" fill="${colors.card}" stroke="${colors.cardBorder}" stroke-width="1" />
              <text x="16" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="${colors.text}">
                ${step.title}
              </text>
              <text x="16" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="${colors.textMuted}">
                ${step.description}
              </text>
            </g>
          `).join('')}
        </svg>
      `
      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `customer-journey-map-${new Date().toISOString().split('T')[0]}.svg`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting SVG:', error)
      toast.error('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }, [steps, connections])

  // Export as CSV
  const exportAsCSV = useCallback(() => {
    if (steps.length === 0) {
      toast.error('No steps to export.')
      return
    }
    setIsExporting(true)
    try {
      const csvContent = [
        'Step Number,Title,Description',
        ...steps.map((step, index) => {
          const stepNumber = index + 1
          const escapedTitle = `"${step.title.replace(/"/g, '""')}"`
          const escapedDescription = `"${step.description.replace(/"/g, '""')}"`
          return `${stepNumber},${escapedTitle},${escapedDescription}`
        })
      ].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `customer-journey-steps-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      toast.error('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }, [steps])

  // Handler to create a new project
  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) {
      toast.error('Project title is required')
      return
    }
    try {
      console.log('Creating project with:', { title: newProjectTitle, description: newProjectDescription })
      const project = await createProject(newProjectTitle, newProjectDescription)
      if (project) {
        // Clear the canvas for the new project
        setSteps([])
        setConnections([])
        setSelectedStep(null)
        setEditingStep(null)
        setShowProjectSelector(false)
        setNewProjectTitle("")
        setNewProjectDescription("")
        toast.success('Project created!')
        await loadProject(project.id)
      } else {
        toast.error('Failed to create project - no project returned')
      }
    } catch (err) {
      console.error('Error creating project:', err)
      toast.error(`Failed to create project: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // Handler to select a project
  const handleSelectProject = (projectId: string) => {
    loadProject(projectId)
    setShowProjectSelector(false)
  }

  // Generate journey with AI
  const generateJourneyWithAI = useCallback(async () => {
    if (!aiPrompt.trim()) {
      setAIError("Please enter a description of the customer journey.")
      return
    }

    setIsGenerating(true)
    setAIError("")

    try {
      const response = await fetch('/api/generate-journey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate journey')
      }

      const data = await response.json()
      
      if (data.error) {
        setAIError(data.error)
        return
      }

      // Process AI response and add to canvas
      const newSteps: JourneyStep[] = []
      const idMap: Record<string, string> = {}
      
      // Calculate viewport-friendly layout
      const stepWidth = 280
      const stepHeight = 160
      const horizontalSpacing = 320 // stepWidth + 40px gap
      const verticalSpacing = 200   // stepHeight + 40px gap
      const maxStepsPerRow = 3 // Limit steps per row to keep within viewport
      
      // Position steps relative to current view center
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight - 64 // Account for header
      const centerX = (-canvasTransform.x + viewportWidth / 2) / canvasTransform.scale
      const centerY = (-canvasTransform.y + viewportHeight / 2) / canvasTransform.scale
      
      const startX = centerX - (Math.min(data.steps.length, maxStepsPerRow) * horizontalSpacing) / 2
      const startY = centerY - (Math.ceil(data.steps.length / maxStepsPerRow) * verticalSpacing) / 2
      
      data.steps.forEach((aiStep: any, index: number) => {
        const newId = generateId()
        idMap[aiStep.tempId] = newId
        
        // Calculate grid position
        const row = Math.floor(index / maxStepsPerRow)
        const col = index % maxStepsPerRow
        
        newSteps.push({
          id: newId,
          title: aiStep.title,
          description: aiStep.description,
          x: startX + (col * horizontalSpacing),
          y: startY + (row * verticalSpacing),
          width: stepWidth,
          height: stepHeight,
          highlighted: false,
          stepType: aiStep.stepType || 'action',
          stepColor: aiStep.stepColor || '#10b981',
          customColorOverride: false
        })
      })

      // Create new connections from AI response
      const newConnections: Connection[] = []
      
      // Create connections between consecutive steps (flow from one to the next)
      for (let i = 0; i < newSteps.length - 1; i++) {
        newConnections.push({
          id: generateId(),
          fromId: newSteps[i].id,
          toId: newSteps[i + 1].id,
        })
      }
      
      // Also create connections from AI response if provided
      if (data.connections) {
        data.connections.forEach((aiConn: any) => {
          const fromId = idMap[aiConn.fromTempId]
          const toId = idMap[aiConn.toTempId]
          if (fromId && toId) {
            // Check if this connection already exists
            const exists = newConnections.some(conn => 
              (conn.fromId === fromId && conn.toId === toId) ||
              (conn.fromId === toId && conn.toId === fromId)
            )
            if (!exists) {
              newConnections.push({
                id: generateId(),
                fromId: fromId,
                toId: toId,
              })
            }
          }
        })
      }

      // Add new steps and connections to canvas
      setSteps(prev => [...prev, ...newSteps])
      setConnections(prev => [...prev, ...newConnections])
      
      // Close modal and reset
      setShowAIModal(false)
      setAIPrompt("")
      toast.success('AI journey generated successfully!')
      
    } catch (error) {
      console.error('Error generating journey:', error)
      setAIError('Failed to generate journey. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [aiPrompt, generateId])

  // Step types and colors
  const STEP_TYPES = {
    ACTION: { id: 'action', label: 'Action', color: '#10b981', icon: '⚡' },
    INPUT: { id: 'input', label: 'Input', color: '#3b82f6', icon: '📝' },
    OUTPUT: { id: 'output', label: 'Output', color: '#f59e0b', icon: '📤' },
    DECISION: { id: 'decision', label: 'Decision', color: '#ef4444', icon: '❓' },
    FEEDBACK: { id: 'feedback', label: 'Feedback', color: '#8b5cf6', icon: '💬' },
    INFORMATION: { id: 'information', label: 'Information', color: '#6b7280', icon: '📖' },
    SUPPORT: { id: 'support', label: 'Support', color: '#06b6d4', icon: '🆘' },
    MILESTONE: { id: 'milestone', label: 'Milestone', color: '#84cc16', icon: '🎯' },
    INTERNAL: { id: 'internal', label: 'Internal', color: '#64748b', icon: '⚙️' }
  }

  // Start resizing
  const startResize = useCallback((e: React.MouseEvent, stepId: string, handle: 'se' | 'sw' | 'ne' | 'nw') => {
    e.preventDefault()
    e.stopPropagation()
    
    const step = steps.find(s => s.id === stepId)
    if (!step) return

    setIsResizing(true)
    setResizingStep(stepId)
    setResizeHandle(handle)
    setResizeStart({
      x: step.x,
      y: step.y,
      width: step.width,
      height: step.height
    })
  }, [steps])

  // Handle resize mouse move
  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizingStep || !resizeHandle || !canvasRef.current) return

    const canvasRect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - canvasRect.left
    const mouseY = e.clientY - canvasRect.top

    setSteps(prev => prev.map(step => {
      if (step.id !== resizingStep) return step

      let newX = step.x
      let newY = step.y
      let newWidth = step.width
      let newHeight = step.height

      const minWidth = 240
      const minHeight = 120

      switch (resizeHandle) {
        case 'se': // bottom-right
          newWidth = Math.max(minWidth, mouseX - step.x)
          newHeight = Math.max(minHeight, mouseY - step.y)
          break
        case 'sw': // bottom-left
          newWidth = Math.max(minWidth, resizeStart.x + resizeStart.width - mouseX)
          newHeight = Math.max(minHeight, mouseY - step.y)
          newX = mouseX
          break
        case 'ne': // top-right
          newWidth = Math.max(minWidth, mouseX - step.x)
          newHeight = Math.max(minHeight, resizeStart.y + resizeStart.height - mouseY)
          newY = mouseY
          break
        case 'nw': // top-left
          newWidth = Math.max(minWidth, resizeStart.x + resizeStart.width - mouseX)
          newHeight = Math.max(minHeight, resizeStart.y + resizeStart.height - mouseY)
          newX = mouseX
          newY = mouseY
          break
      }

      return { ...step, x: newX, y: newY, width: newWidth, height: newHeight }
    }))
  }, [isResizing, resizingStep, resizeHandle, resizeStart])

  // Handle resize mouse up
  const handleResizeMouseUp = useCallback(() => {
    setIsResizing(false)
    setResizingStep(null)
    setResizeHandle(null)
  }, [])

  // Change step type
  const changeStepType = useCallback((stepId: string, stepType: string) => {
    const stepTypeData = Object.values(STEP_TYPES).find(type => type.id === stepType)
    if (!stepTypeData) return

    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { 
            ...step, 
            stepType: stepTypeData.id,
            stepColor: stepTypeData.color,
            customColorOverride: false
          }
        : step
    ))
  }, [])

  // Add resize event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove)
      document.addEventListener('mouseup', handleResizeMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleResizeMouseMove)
        document.removeEventListener('mouseup', handleResizeMouseUp)
      }
    }
  }, [isResizing, handleResizeMouseMove, handleResizeMouseUp])

  // Delete connection
  const deleteConnection = useCallback(async (connectionId: string) => {
    console.log('Attempting to delete connection:', connectionId)
    console.log('Current connections before deletion (local state):', connections)

    // Store current state for potential rollback if DB operation fails
    const originalConnections = connections
    
    // OPTIMISTIC UI UPDATE: Immediately remove from UI for instant feedback
    setConnections(prevConnections => prevConnections.filter(c => c.id !== connectionId))
    setConnectionHovered(connectionId, false) // Hide delete button immediately

    // Show a "deleting" toast
    toast.info('Deleting connection...', {
      description: 'Removing connection from your project...',
      duration: 3000, // Short duration, will be replaced by success/error
    })

    try {
      // 1. Call Supabase to delete the connection from the database
      const { error } = await supabase
        .from('connections') // Matches your table name
        .delete()
        .eq('id', connectionId) // Ensure 'id' matches your primary key column name in DB

      if (error) {
        console.error('Error deleting connection from Supabase:', error)
        
        // ROLLBACK: Revert optimistic UI update if database operation fails
        setConnections(originalConnections) 
        
        // Show error toast
        toast.error('Error deleting connection', {
          description: error.message || "Failed to remove connection from the database.",
          duration: 5000,
        })
      } else {
        console.log('Connection successfully deleted from Supabase:', connectionId)
        // Show success toast
        toast.success('Connection deleted', {
          description: "The connection has been successfully removed.",
          duration: 3000,
        })
      }
    } catch (err) {
      console.error('An unexpected error occurred during connection deletion:', err)
      
      // ROLLBACK: Revert optimistic UI update for unexpected errors
      setConnections(originalConnections)
      
      // Show generic error toast
      toast.error('An unexpected error occurred', {
        description: "Please try again. Check your browser console for details.",
        duration: 5000,
      })
    }
  }, [connections, setConnections, setConnectionHovered])

  // Canvas panning functions
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start panning if clicking on the canvas background (not on steps or connections)
    if (e.target === e.currentTarget) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({
        x: e.clientX - canvasTransform.x,
        y: e.clientY - canvasTransform.y
      })
    }
  }, [canvasTransform])

  const handleCanvasMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning) return

    const newX = e.clientX - panStart.x
    const newY = e.clientY - panStart.y

    setCanvasTransform(prev => ({
      ...prev,
      x: newX,
      y: newY
    }))
  }, [isPanning, panStart])

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Add panning event listeners
  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handleCanvasMouseMove)
      document.addEventListener('mouseup', handleCanvasMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleCanvasMouseMove)
        document.removeEventListener('mouseup', handleCanvasMouseUp)
      }
    }
  }, [isPanning, handleCanvasMouseMove, handleCanvasMouseUp])

  // Reset canvas view
  const resetCanvasView = useCallback(() => {
    setCanvasTransform({ x: 0, y: 0, scale: 1 })
    toast.success('View reset to center')
  }, [])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header with controls */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              {/* JourneyFlow Logo */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Map className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  JourneyFlow
                </span>
              </div>
              {isConnecting && (
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-md text-sm">
                  <ArrowRight className="h-4 w-4" />
                  <span>Drag to connect steps</span>
                </div>
              )}
              {isPanning && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-600 rounded-md text-sm">
                  <Map className="h-4 w-4" />
                  <span>Panning canvas</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={exportAsSVG} 
                disabled={isExporting}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export SVG'}
              </Button>
              <Button 
                onClick={exportAsCSV} 
                disabled={isExporting}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
              <Button 
                onClick={handleSaveProject}
                disabled={isSaving}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button onClick={() => setShowProjectSelector(true)} variant="outline" className="flex items-center gap-2"><Map className="h-4 w-4" />Projects</Button>
              <Button 
                onClick={() => setShowAIModal(true)}
                disabled={isGenerating}
                variant="gradient"
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </Button>
              <Button onClick={addStep} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Step
              </Button>
            </div>
          </div>
        </header>

        {/* Main canvas area */}
        <main className="flex-1 relative overflow-hidden">
          {/* Floating buttons at top of viewport */}
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            <Button 
              onClick={() => setShowLegend(v => !v)}
              variant="outline"
              size="sm"
              className="bg-background/80 backdrop-blur border-border/50 hover:bg-background/90"
            >
              <Map className="h-4 w-4 mr-1" />
              Legend
            </Button>
            <Button 
              onClick={resetCanvasView} 
              variant="outline"
              size="sm"
              className="bg-background/80 backdrop-blur border-border/50 hover:bg-background/90"
              title="Reset canvas view"
            >
              <Map className="h-4 w-4 mr-1" />
              Reset View
            </Button>
          </div>
          
          <div 
            ref={canvasRef}
            className="w-full h-[calc(100vh-64px)] relative bg-muted/20"
            style={{ 
              cursor: isDragging ? 'grabbing' : 
                      isConnecting ? 'crosshair' : 
                      isPanning ? 'grabbing' : 'grab',
              transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
              transformOrigin: '0 0'
            }}
            onMouseDown={handleCanvasMouseDown}
          >
            {/* SVG overlay for connections */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ 
                zIndex: 1
              }}
            >
              {connections.map(connection => {
                const path = getConnectionPath(connection.fromId, connection.toId)
                const isHovered = hoveredConnections.has(connection.id)
                
                // Calculate midpoint for delete button in screen coordinates
                const fromStep = steps.find(s => s.id === connection.fromId)
                const toStep = steps.find(s => s.id === connection.toId)
                const midX = fromStep && toStep ? (fromStep.x + fromStep.width/2 + toStep.x + toStep.width/2) / 2 : 0
                const midY = fromStep && toStep ? (fromStep.y + fromStep.height/2 + toStep.y + toStep.height/2) / 2 : 0
                
                // Convert canvas coordinates to screen coordinates for proper positioning
                const screenMidX = midX * canvasTransform.scale + canvasTransform.x
                const screenMidY = midY * canvasTransform.scale + canvasTransform.y
                
                // Convert connection path to screen coordinates
                const fromX = fromStep ? (fromStep.x + fromStep.width/2) * canvasTransform.scale + canvasTransform.x : 0
                const fromY = fromStep ? (fromStep.y + fromStep.height/2) * canvasTransform.scale + canvasTransform.y : 0
                const toX = toStep ? (toStep.x + toStep.width/2) * canvasTransform.scale + canvasTransform.x : 0
                const toY = toStep ? (toStep.y + toStep.height/2) * canvasTransform.scale + canvasTransform.y : 0
                
                const dx = toX - fromX
                const dy = toY - fromY
                const controlX = fromX + dx * 0.5
                const controlY = fromY + dy * 0.5
                const screenPath = `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`
                
                return (
                  <g key={connection.id}>
                    {/* Invisible wider stroke for better hover detection */}
                    <path
                      d={screenPath}
                      stroke="transparent"
                      strokeWidth="40"
                      fill="none"
                      className="cursor-pointer pointer-events-auto"
                      onMouseEnter={() => setConnectionHovered(connection.id, true)}
                      onMouseLeave={() => setConnectionHovered(connection.id, false)}
                    />
                    
                    {/* Visible connection path with better styling */}
                    <path
                      d={screenPath}
                      stroke={isHovered ? '#8b5cf6' : '#64748b'}
                      strokeWidth={isHovered ? '3' : '2'}
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      style={{ 
                        transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
                        filter: isHovered ? 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.3))' : 'none'
                      }}
                    />
                    
                    {/* Subtle hover indicator */}
                    {isHovered && (
                      <circle
                        cx={screenMidX}
                        cy={screenMidY}
                        r="4"
                        fill="#8b5cf6"
                        className="pointer-events-none"
                        style={{
                          filter: 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.5))'
                        }}
                      />
                    )}
                    
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 10 3.5, 0 7"
                          fill={isHovered ? '#8b5cf6' : '#64748b'}
                        />
                      </marker>
                    </defs>
                  </g>
                )
              })}

              {/* Drag connection line */}
              {isConnecting && connectingFrom && (
                <g>
                  <path
                    d={`M ${getDragConnectionStart().x} ${getDragConnectionStart().y} L ${dragConnection.x} ${dragConnection.y}`}
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeDasharray="8,4"
                    fill="none"
                    markerEnd="url(#arrowhead-drag)"
                    style={{ pointerEvents: 'none' }}
                  />
                  <defs>
                    <marker
                      id="arrowhead-drag"
                      markerWidth="12"
                      markerHeight="8"
                      refX="10"
                      refY="4"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 12 4, 0 8"
                        fill="#3b82f6"
                      />
                    </marker>
                  </defs>
                </g>
              )}
            </svg>

            {/* Delete buttons as separate HTML elements */}
            {connections.map(connection => {
              const isHovered = hoveredConnections.has(connection.id)
              if (!isHovered) return null
              
              // Calculate midpoint for delete button in screen coordinates
              const fromStep = steps.find(s => s.id === connection.fromId)
              const toStep = steps.find(s => s.id === connection.toId)
              const midX = fromStep && toStep ? (fromStep.x + fromStep.width/2 + toStep.x + toStep.width/2) / 2 : 0
              const midY = fromStep && toStep ? (fromStep.y + fromStep.height/2 + toStep.y + toStep.height/2) / 2 : 0
              
              // Convert canvas coordinates to screen coordinates for proper positioning
              const screenMidX = midX * canvasTransform.scale + canvasTransform.x
              const screenMidY = midY * canvasTransform.scale + canvasTransform.y
              
              return (
                <div
                  key={`delete-${connection.id}`}
                  className="absolute cursor-pointer z-50"
                  style={{
                    left: screenMidX - 20,
                    top: screenMidY - 20,
                    width: 40,
                    height: 40,
                  }}
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Delete button clicked for connection:', connection.id)
                    await deleteConnection(connection.id)
                  }}
                >
                  <div className="w-full h-full bg-red-500 border-2 border-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors">
                    <span className="text-white font-bold text-lg">×</span>
                  </div>
                  <div className="absolute left-10 top-2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    Delete
                  </div>
                </div>
              )
            })}

            {/* Journey step cards */}
            {steps.map((step, index) => {
              const stepType = step.stepType ? getStepTypeById(step.stepType) : STEP_TYPES.ACTION
              const stepColor = step.stepColor || (stepType || STEP_TYPES.ACTION).color
              
              return (
                <div
                  key={step.id}
                  ref={(el) => { stepRefs.current[step.id] = el }}
                  className={`absolute cursor-grab active:cursor-grabbing transition-all duration-200 ${
                    selectedStep === step.id ? 'shadow-lg ring-2 ring-primary' : 'shadow-md'
                  } ${hoveredStep === step.id && isConnecting ? 'ring-2 ring-primary ring-opacity-50 scale-105' : ''}`}
                  style={{
                    left: step.x,
                    top: step.y,
                    zIndex: selectedStep === step.id ? 10 : 2,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, step.id)}
                  onDoubleClick={(e) => {
                    e.preventDefault()
                    handleDoubleClick(step, 'title')
                  }}
                >
                  <Card className={`relative transition-all duration-200 overflow-hidden hover-lift ${
                    step.highlighted 
                      ? 'bg-green-500/10 backdrop-blur-lg border-green-500/30 shadow-lg' 
                      : 'bg-card/50 backdrop-blur-lg border-border/30 hover:border-border/60'
                  }`} style={{ width: step.width, height: step.height }}>
                    {/* Colored left border indicating step type */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                      style={{ backgroundColor: stepColor }}
                    />
                    
                    {/* Step number - top left */}
                    <div className="absolute top-2 left-2 z-10">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </div>
                    </div>

                    {/* Step type selector - top right */}
                    <div className="absolute top-2 right-2 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs whitespace-nowrap"
                            style={{ 
                              backgroundColor: `${step.stepColor || STEP_TYPES.ACTION.color}20`,
                              color: step.stepColor || STEP_TYPES.ACTION.color,
                              border: `1px solid ${step.stepColor || STEP_TYPES.ACTION.color}40`
                            }}
                          >
                            <span className="mr-1">
                              {Object.values(STEP_TYPES).find(t => t.id === step.stepType)?.icon || STEP_TYPES.ACTION.icon}
                            </span>
                            <span className="font-medium">
                              {Object.values(STEP_TYPES).find(t => t.id === step.stepType)?.label || STEP_TYPES.ACTION.label}
                            </span>
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {Object.values(STEP_TYPES).map((type) => (
                            <DropdownMenuItem 
                              key={type.id}
                              onClick={() => changeStepType(step.id, type.id)}
                              className="flex items-center gap-2"
                            >
                              <span>{type.icon}</span>
                              <span>{type.label}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <CardHeader className="pb-2 pt-8 px-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle 
                          className="text-sm font-medium truncate cursor-text flex-1 min-w-0"
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            handleDoubleClick(step, 'title')
                          }}
                          title="Double-click to edit"
                        >
                          {inlineEditing === step.id && inlineEditType === 'title' ? (
                            <input
                              ref={inlineEditInputRef}
                              value={inlineEditValue}
                              onChange={(e) => setInlineEditValue(e.target.value)}
                              onKeyDown={handleInlineEditKeyPress}
                              onBlur={saveInlineEdit}
                              className="w-full bg-transparent border-none outline-none text-sm font-medium"
                              autoFocus
                            />
                          ) : (
                            step.title
                          )}
                        </CardTitle>
                        
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-5 w-5 p-0 transition-colors ${
                              step.highlighted 
                                ? 'text-yellow-500 hover:text-yellow-400' 
                                : 'text-muted-foreground hover:text-yellow-500'
                            }`}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              toggleStepHighlight(step.id)
                            }}
                            title={step.highlighted ? "Remove highlight" : "Highlight step"}
                          >
                            <Star className={`h-3 w-3 ${step.highlighted ? 'fill-current' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                            onMouseDown={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              startDragConnect(e, step.id)
                            }}
                            title="Drag to connect"
                          >
                            <ArrowRight className="h-2.5 w-2.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-destructive hover:bg-destructive/10"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              setStepToDelete(step.id)
                              setShowDeleteDialog(true)
                            }}
                            title="Delete step"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 px-3 pb-3">
                      <div 
                        className="text-sm text-muted-foreground cursor-text min-h-[60px] max-h-[80px] overflow-y-auto"
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          handleDoubleClick(step, 'description')
                        }}
                        title="Double-click to edit"
                      >
                        {inlineEditing === step.id && inlineEditType === 'description' ? (
                          <textarea
                            ref={inlineEditTextareaRef}
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onKeyDown={handleInlineEditKeyPress}
                            onBlur={saveInlineEdit}
                            className="w-full bg-transparent border-none outline-none text-sm resize-none"
                            rows={3}
                            autoFocus
                          />
                        ) : (
                          step.description
                        )}
                      </div>
                    </CardContent>

                    {/* Resize handle - bottom right only */}
                    <div 
                      className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize opacity-30 hover:opacity-60 transition-opacity"
                      onMouseDown={(e) => startResize(e, step.id, 'se')}
                      title="Drag to resize"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-muted-foreground">
                        <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z"/>
                      </svg>
                    </div>
                  </Card>
                </div>
              )
            })}

            {/* Connection indicator */}
            {isConnecting && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-md text-sm">
                <ArrowRight className="h-4 w-4" />
                <span>Drag to connect steps</span>
              </div>
            )}
          </div>
        </main>

        {/* Delete confirmation dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Step</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this step? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => stepToDelete && deleteStep(stepToDelete)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Project selector dialog */}
        <Dialog open={showProjectSelector} onOpenChange={setShowProjectSelector}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select or Create Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {projects.map((project: any) => (
                <Button key={project.id} variant={currentProject?.id === project.id ? 'default' : 'outline'} className="w-full justify-start" onClick={() => handleSelectProject(project.id)}>
                  <Map className="h-4 w-4 mr-2" />
                  {project.title}
                </Button>
              ))}
            </div>
            <div className="pt-4 border-t mt-4">
              <div className="mb-2 font-medium">Create New Project</div>
              <Input value={newProjectTitle} onChange={e => setNewProjectTitle(e.target.value)} placeholder="Project Title" className="mb-2" />
              <Input value={newProjectDescription} onChange={e => setNewProjectDescription(e.target.value)} placeholder="Project Description" className="mb-2" />
              <Button onClick={handleCreateProject} className="w-full">Create Project</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Generation Modal */}
        <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Generate Journey with AI
              </DialogTitle>
              <DialogDescription>
                Describe your customer journey and AI will generate a complete journey map with steps and connections.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Journey Description</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAIPrompt(e.target.value)}
                  placeholder="Describe the customer journey you want to create. For example: 'A customer journey for an e-commerce website from discovery to purchase'"
                  className="w-full min-h-[120px] p-3 border rounded-md bg-background text-foreground resize-none"
                  disabled={isGenerating}
                />
              </div>
              
              {aiError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                  {aiError}
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                💡 Tip: Be specific about the customer's goals, pain points, and the steps they take. The more detail you provide, the better the AI-generated journey will be.
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowAIModal(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button 
                onClick={generateJourneyWithAI}
                disabled={isGenerating || !aiPrompt.trim()}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Journey
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Legend */}
        {showLegend && (
          <div className="absolute top-4 right-4 bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg z-20">
            <h3 className="font-semibold mb-3">Step Types</h3>
            <div className="space-y-2">
              {Object.values(STEP_TYPES).map((type) => (
                <div key={type.id} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="text-sm">{type.icon} {type.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

// Import the types and constants from the original file
interface JourneyStep {
  id: string
  title: string
  description: string
  x: number
  y: number
  width: number
  height: number
  highlighted?: boolean
  stepType?: string
  stepColor?: string
  customColorOverride?: boolean
}

interface Connection {
  id: string
  fromId: string
  toId: string
}

export const STEP_TYPES = {
  ACTION: {
    id: 'action',
    label: 'Action',
    icon: '⚡',
    color: '#10b981'
  },
  DECISION: {
    id: 'decision',
    label: 'Decision',
    icon: '❓',
    color: '#f59e0b'
  },
  WAIT: {
    id: 'wait',
    label: 'Wait',
    icon: '⏱️',
    color: '#6b7280'
  },
  EMAIL: {
    id: 'email',
    label: 'Email',
    icon: '📧',
    color: '#3b82f6'
  },
  SMS: {
    id: 'sms',
    label: 'SMS',
    icon: '📱',
    color: '#8b5cf6'
  },
  WEBHOOK: {
    id: 'webhook',
    label: 'Webhook',
    icon: '🔗',
    color: '#ef4444'
  }
} as const

export const getStepTypeById = (id: string) => {
  return Object.values(STEP_TYPES).find(type => type.id === id)
}

export const getStepTypeByLabel = (label: string) => {
  return Object.values(STEP_TYPES).find(type => type.label === label)
} 