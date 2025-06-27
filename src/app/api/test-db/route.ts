import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // Test connection by checking if tables exist
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('count')
      .limit(1)
    
    if (projectsError) {
      console.error('Projects table error:', projectsError)
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: projectsError.message 
      }, { status: 500 })
    }

    const { data: steps, error: stepsError } = await supabase
      .from('journey_steps')
      .select('count')
      .limit(1)
    
    if (stepsError) {
      console.error('Journey steps table error:', stepsError)
      return NextResponse.json({ 
        error: 'Journey steps table not found', 
        details: stepsError.message 
      }, { status: 500 })
    }

    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('count')
      .limit(1)
    
    if (connectionsError) {
      console.error('Connections table error:', connectionsError)
      return NextResponse.json({ 
        error: 'Connections table not found', 
        details: connectionsError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'All tables exist and are accessible',
      tables: {
        projects: 'OK',
        journey_steps: 'OK', 
        connections: 'OK'
      }
    })

  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({ 
      error: 'Database test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 