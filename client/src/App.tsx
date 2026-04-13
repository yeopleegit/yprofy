import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FolderOpen, Settings, Plus, Menu, X, Moon, Sun, LogOut, GripVertical } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './api/client'
import DashboardPage from './pages/DashboardPage'
import CategoryPage from './pages/CategoryPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useState, useEffect } from 'react'
import SessionFormModal from './components/sessions/SessionFormModal'

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return [dark, () => setDark(d => !d)] as const
}

function AppLayout() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [sessionSkillId, setSessionSkillId] = useState<number | undefined>()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, toggleDark] = useDarkMode()

  const queryClient = useQueryClient()
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  })

  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before')

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => api.reorderCategories(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['categories'] })
      const prev = queryClient.getQueryData<any[]>(['categories'])
      if (prev) {
        const map = new Map(prev.map((c) => [c.id, c]))
        const next = ids.map((id) => map.get(id)).filter(Boolean)
        queryClient.setQueryData(['categories'], next)
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['categories'], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const handleCategoryDrop = (targetId: number, position: 'before' | 'after') => {
    const resetDrag = () => {
      setDraggedId(null)
      setDragOverId(null)
    }
    if (draggedId == null || draggedId === targetId) {
      resetDrag()
      return
    }
    const current = categories.map((c: any) => c.id as number)
    const from = current.indexOf(draggedId)
    const targetIdx = current.indexOf(targetId)
    if (from < 0 || targetIdx < 0) {
      resetDrag()
      return
    }
    const next = [...current]
    next.splice(from, 1)
    let to = targetIdx
    if (from < targetIdx) to -= 1
    if (position === 'after') to += 1
    if (to === from) {
      resetDrag()
      return
    }
    next.splice(to, 0, draggedId)
    reorderMutation.mutate(next)
    resetDrag()
  }

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const openSessionModal = (skillId?: number) => {
    setSessionSkillId(skillId)
    setSessionModalOpen(true)
  }

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: '대시보드' },
    { path: '/settings', icon: Settings, label: '설정' },
  ]

  const avatarUrl = user?.user_metadata?.avatar_url
  const displayName = user?.user_metadata?.full_name || user?.email || ''

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">YProfy</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">기량 유지 트래커</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDark}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            title={dark ? '라이트 모드' : '다크 모드'}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}

        {categories.length > 0 && (
          <>
            <div className="pt-4 pb-2 px-3">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                카테고리
              </span>
            </div>
            {categories.map((cat: any) => {
              const active = location.pathname === `/categories/${cat.id}`
              const isDragging = draggedId === cat.id
              const isDragOver = dragOverId === cat.id && draggedId !== cat.id
              return (
                <div
                  key={cat.id}
                  onDragOver={(e) => {
                    if (draggedId == null) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    const rect = e.currentTarget.getBoundingClientRect()
                    const pos: 'before' | 'after' =
                      e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
                    if (dragOverId !== cat.id) setDragOverId(cat.id)
                    if (dropPosition !== pos) setDropPosition(pos)
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return
                    if (dragOverId === cat.id) setDragOverId(null)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleCategoryDrop(cat.id, dropPosition)
                  }}
                  className={`relative flex items-center gap-1 rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  } ${isDragging ? 'opacity-40' : ''}`}
                >
                  {isDragOver && (
                    <div
                      className={`pointer-events-none absolute left-1 right-1 h-0.5 rounded-full bg-blue-500 dark:bg-blue-400 ${
                        dropPosition === 'before' ? '-top-0.5' : '-bottom-0.5'
                      }`}
                    />
                  )}
                  <span
                    draggable
                    onDragStart={(e) => {
                      setDraggedId(cat.id)
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', String(cat.id))
                    }}
                    onDragEnd={() => {
                      setDraggedId(null)
                      setDragOverId(null)
                    }}
                    className="pl-2 pr-1 py-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    title="드래그하여 순서 변경"
                    aria-label="순서 변경 핸들"
                  >
                    <GripVertical size={14} />
                  </span>
                  <Link
                    to={`/categories/${cat.id}`}
                    draggable={false}
                    className="flex-1 flex items-center gap-2 pr-3 py-2 text-sm min-w-0"
                  >
                    <FolderOpen size={16} />
                    <span className="truncate">{cat.icon} {cat.name}</span>
                  </Link>
                </div>
              )
            })}
          </>
        )}
      </nav>

      <div className="p-3 space-y-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => openSessionModal()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          연습 기록
        </button>

        <div className="flex items-center gap-2 px-2 py-1.5">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600" />
          )}
          <span className="flex-1 text-xs text-gray-600 dark:text-gray-400 truncate">{displayName}</span>
          <button
            onClick={signOut}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="로그아웃"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <Menu size={24} className="text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">YProfy</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDark}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => openSessionModal()}
            className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <Routes>
          <Route path="/" element={<DashboardPage onLogSession={openSessionModal} />} />
          <Route path="/categories/:id" element={<CategoryPage onLogSession={openSessionModal} />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      {sessionModalOpen && (
        <SessionFormModal
          skillId={sessionSkillId}
          onClose={() => setSessionModalOpen(false)}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  )
}

export default App
