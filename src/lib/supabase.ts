import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client (for use in components)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (for use in API routes)
export const createServerClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Database types (you'll define these later)
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          created_at: string
          updated_at: string
          is_public: boolean
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          created_at?: string
          updated_at?: string
          is_public?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          created_at?: string
          updated_at?: string
          is_public?: boolean
        }
      }
      journey_steps: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string
          x: number
          y: number
          width: number
          height: number
          step_type: string | null
          step_color: string | null
          custom_color_override: boolean
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description: string
          x: number
          y: number
          width: number
          height: number
          step_type?: string | null
          step_color?: string | null
          custom_color_override?: boolean
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string
          x?: number
          y?: number
          width?: number
          height?: number
          step_type?: string | null
          step_color?: string | null
          custom_color_override?: boolean
          order_index?: number
          created_at?: string
        }
      }
      connections: {
        Row: {
          id: string
          project_id: string
          from_step_id: string
          to_step_id: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          from_step_id: string
          to_step_id: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          from_step_id?: string
          to_step_id?: string
          created_at?: string
        }
      }
    }
  }
}

// Typed Supabase client
export const typedSupabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey) 