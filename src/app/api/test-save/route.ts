import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    
    console.log('Test save request body:', body)
    
    const { steps, connections, projectId } = body
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // First, ensure the project exists
    const { data: existingProject, error: projectCheckError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (projectCheckError && projectCheckError.code !== 'PGRST116') {
      console.error('Error checking project:', projectCheckError)
      return NextResponse.json({ 
        error: 'Failed to check project', 
        details: projectCheckError.message 
      }, { status: 500 })
    }

    // If project doesn't exist, create it
    if (!existingProject) {
      const { error: createProjectError } = await supabase
        .from('projects')
        .insert({
          id: projectId,
          title: 'Test Project',
          description: 'Auto-created test project',
          user_id: '135dc32f-f223-48f0-a3a6-dad1448cbec6' // Use the provided valid UUID
        })

      if (createProjectError) {
        console.error('Error creating project:', createProjectError)
        return NextResponse.json({ 
          error: 'Failed to create project', 
          details: createProjectError.message 
        }, { status: 500 })
      }
    }

    // Test saving steps
    if (steps && steps.length > 0) {
      const stepsToSave = steps.map((step: any, index: number) => ({
        id: step.id || uuidv4(),
        project_id: projectId,
        title: step.title,
        description: step.description,
        x: Math.round(step.x),
        y: Math.round(step.y),
        width: Math.round(step.width),
        height: Math.round(step.height),
        step_type: step.stepType || 'action',
        step_color: step.stepColor || '#10b981',
        custom_color_override: step.customColorOverride || false,
        order_index: index
      }))

      console.log('Steps to save:', stepsToSave)

      const { error: stepsError } = await supabase
        .from('journey_steps')
        .insert(stepsToSave)

      if (stepsError) {
        console.error('Error saving steps:', stepsError)
        return NextResponse.json({ 
          error: 'Failed to save steps', 
          details: stepsError.message 
        }, { status: 500 })
      }
    }

    // Test saving connections
    if (connections && connections.length > 0) {
      const connectionsToSave = connections.map((connection: any) => ({
        id: connection.id || uuidv4(),
        project_id: projectId,
        from_step_id: connection.fromId,
        to_step_id: connection.toId
      }))

      console.log('Connections to save:', connectionsToSave)

      const { error: connectionsError } = await supabase
        .from('connections')
        .insert(connectionsToSave)

      if (connectionsError) {
        console.error('Error saving connections:', connectionsError)
        return NextResponse.json({ 
          error: 'Failed to save connections', 
          details: connectionsError.message 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test save completed successfully',
      savedSteps: steps?.length || 0,
      savedConnections: connections?.length || 0
    })

  } catch (error) {
    console.error('Test save error:', error)
    return NextResponse.json({ 
      error: 'Test save failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 