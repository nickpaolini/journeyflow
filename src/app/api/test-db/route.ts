import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // Test database connection
    const { data, error } = await supabase.from('projects').select('*').limit(1)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: 'Database connection successful',
      projectsCount: data?.length || 0
    })
  } catch (error) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
  }
} 