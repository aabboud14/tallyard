// Signing out from the shell: to a plain sign-in page, never back to the page left behind.
import { useNavigate } from 'react-router'
import { signOut } from '../store'
import { toast } from '../ui'
import { noteSignOut } from './next'

export function useSignOut(): () => void {
  const navigate = useNavigate()
  return () => {
    noteSignOut()
    signOut()
    navigate('/signin', { replace: true })
    toast('You are signed out')
  }
}
