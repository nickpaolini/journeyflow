"use client"

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'

export default function UserMenu() {
  const { user, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsSigningOut(false)
    }
  }

  if (!user) return null

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <User className="h-4 w-4" />
        <span>{user.email}</span>
      </div>
      <Button
        onClick={handleSignOut}
        size="sm"
        variant="outline"
        disabled={isSigningOut}
        className="border-border/40 text-foreground hover:bg-muted/50 transition-all duration-200 active:scale-95"
      >
        {isSigningOut ? (
          <>
            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Signing out...
          </>
        ) : (
          <>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </>
        )}
      </Button>
    </div>
  )
} 