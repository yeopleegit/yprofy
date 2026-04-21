import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-carbon">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric" />
      </div>
    )
  }

  if (user) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas dark:bg-carbon px-6">
      <div className="max-w-sm w-full text-center">
        <p className="text-xs font-medium text-silver tracking-[0.28em] uppercase mb-4">Welcome</p>
        <h1 className="text-4xl font-medium tracking-[0.28em] text-carbon dark:text-canvas mb-3">
          YPROFY
        </h1>
        <p className="text-sm text-pewter dark:text-silver mb-12">
          기량 유지 트래커
        </p>

        <button
          onClick={signInWithGoogle}
          className="w-full h-11 flex items-center justify-center gap-3 bg-canvas dark:bg-surface-dark-alt border border-pale dark:border-surface-dark-alt rounded-[4px] text-sm font-medium text-graphite dark:text-pale hover:bg-ash dark:hover:bg-surface-dark"
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google로 로그인
        </button>
      </div>
    </div>
  )
}
