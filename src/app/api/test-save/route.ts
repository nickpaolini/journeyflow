import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

interface SaveRequest {
  projectId: string
  steps: Array<{
    id?: string
    title: string
    description: string
    x: number
    y: number
    width: number
    height: number
    stepType: string
    stepColor: string
    customColorOverride: boolean
  }>
  connections: Array<{
    id?: string
    fromId: string
    toId: string
  }>
}

interface StepData {
  id: string
  project_id: string
  title: string
  description: string
  x: number
  y: number
  width: number
  height: number
  step_type: string
  step_color: string
  custom_color_override: boolean
  order_index: number
}

interface ConnectionData {
  id: string
  project_id: string
  from_step_id: string
  to_step_id: string
}

export async function POST(request: Request) {
  try {
    const body: SaveRequest = await request.json()
    console.log('Test save request body:', body)

    const supabase = createServerClient()

    // Ensure project exists
    let projectId = body.projectId
    if (projectId === 'test-project') {
      // Create a test project if needed
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          id: '550e8400-e29b-41d4-a716-446655440000',
          user_id: '00000000-0000-0000-0000-000000000000',
          title: 'Test Project',
          description: 'Test project for development'
        })
        .select()
        .single()

      if (projectError) {
        console.error('Error creating project:', projectError)
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
      }
      projectId = project.id
    }

    // Prepare steps data
    const stepsToSave: StepData[] = body.steps.map((step, index) => ({
      id: step.id || uuidv4(),
      project_id: projectId,
      title: step.title,
      description: step.description,
      x: Math.round(step.x),
      y: Math.round(step.y),
      width: Math.round(step.width),
      height: Math.round(step.height),
      step_type: step.stepType,
      step_color: step.stepColor,
      custom_color_override: step.customColorOverride,
      order_index: index
    }))

    console.log('Steps to save:', stepsToSave)

    // Save steps
    const { error: stepsError } = await supabase
      .from('journey_steps')
      .upsert(stepsToSave, { onConflict: 'id' })

    if (stepsError) {
      console.error('Error saving steps:', stepsError)
      return NextResponse.json({ error: 'Failed to save steps' }, { status: 500 })
    }

    // Prepare connections data
    const connectionsToSave: ConnectionData[] = body.connections.map(connection => ({
      id: connection.id || uuidv4(),
      project_id: projectId,
      from_step_id: connection.fromId,
      to_step_id: connection.toId
    }))

    // Save connections
    if (connectionsToSave.length > 0) {
      const { error: connectionsError } = await supabase
        .from('connections')
        .upsert(connectionsToSave, { onConflict: 'id' })

      if (connectionsError) {
        console.error('Error saving connections:', connectionsError)
        return NextResponse.json({ error: 'Failed to save connections' }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Data saved successfully',
      projectId,
      stepsCount: stepsToSave.length,
      connectionsCount: connectionsToSave.length
    })

  } catch (error) {
    console.error('Error in test-save:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 