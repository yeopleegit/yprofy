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
      <div className="px-5 pt-6 pb-5 flex items-center justify-between">
        <div>
          <h1 className="text-base font-medium tracking-[0.28em] text-carbon dark:text-canvas">
            YPROFY
          </h1>
          <p className="text-xs text-pewter dark:text-silver mt-2 tracking-wide">
            기량 유지 트래커
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDark}
            className="p-1.5 rounded-[4px] text-pewter hover:text-carbon dark:text-silver dark:hover:text-canvas"
            title={dark ? '라이트 모드' : '다크 모드'}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-[4px] text-pewter hover:text-carbon dark:text-silver dark:hover:text-canvas"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2 rounded-[4px] text-sm font-medium ${
                active
                  ? 'bg-ash text-carbon dark:bg-surface-dark-alt dark:text-canvas'
                  : 'text-graphite hover:bg-ash dark:text-pale dark:hover:bg-surface-dark-alt'
              }`}
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </Link>
          )
        })}

        {categories.length > 0 && (
          <>
            <div className="pt-6 pb-2 px-3">
              <span className="text-[11px] font-medium text-silver dark:text-pewter tracking-[0.18em] uppercase">
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
                  className={`relative flex items-center gap-1 rounded-[4px] ${
                    active
                      ? 'bg-ash text-carbon dark:bg-surface-dark-alt dark:text-canvas'
                      : 'text-graphite hover:bg-ash dark:text-pale dark:hover:bg-surface-dark-alt'
                  } ${isDragging ? 'opacity-40' : ''}`}
                >
                  {isDragOver && (
                    <div
                      className={`pointer-events-none absolute left-1 right-1 h-px bg-electric ${
                        dropPosition === 'before' ? '-top-px' : '-bottom-px'
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
                    className="pl-2 pr-1 py-2 cursor-grab active:cursor-grabbing text-pale hover:text-pewter dark:text-pewter dark:hover:text-pale"
                    title="드래그하여 순서 변경"
                    aria-label="순서 변경 핸들"
                  >
                    <GripVertical size={14} strokeWidth={1.5} />
                  </span>
                  <Link
                    to={`/categories/${cat.id}`}
                    draggable={false}
                    className="flex-1 flex items-center gap-2 pr-3 py-2 text-sm min-w-0"
                  >
                    <FolderOpen size={14} strokeWidth={1.75} />
                    <span className="truncate">{cat.icon} {cat.name}</span>
                  </Link>
                </div>
              )
            })}
          </>
        )}
      </nav>

      <div className="px-5 pb-5 pt-4 space-y-3 border-t border-cloud dark:border-surface-dark-alt">
        <button
          onClick={() => openSessionModal()}
          className="w-full flex items-center justify-center gap-2 h-10 px-4 bg-carbon text-canvas dark:bg-canvas dark:text-carbon rounded-[4px] text-sm font-medium hover:bg-graphite dark:hover:bg-pale"
        >
          <Plus size={16} strokeWidth={2} />
          연습 기록
        </button>

        <div className="flex items-center gap-2 pt-2">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-cloud dark:bg-surface-dark-alt" />
          )}
          <span className="flex-1 text-xs text-pewter dark:text-silver truncate">{displayName}</span>
          <button
            onClick={signOut}
            className="p-1 rounded-[4px] text-pewter hover:text-carbon dark:text-silver dark:hover:text-canvas"
            title="로그아웃"
          >
            <LogOut size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-canvas dark:bg-carbon">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-canvas dark:bg-carbon px-5 h-14 flex items-center justify-between border-b border-cloud dark:border-surface-dark-alt">
        <button onClick={() => setSidebarOpen(true)} className="p-1 rounded-[4px] text-carbon dark:text-canvas">
          <Menu size={22} strokeWidth={1.75} />
        </button>
        <h1 className="text-sm font-medium tracking-[0.28em] text-carbon dark:text-canvas">YPROFY</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDark}
            className="p-1 rounded-[4px] text-pewter dark:text-silver"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => openSessionModal()}
            className="p-1 rounded-[4px] text-electric"
          >
            <Plus size={22} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(128,128,128,0.65)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-canvas dark:bg-carbon flex flex-col
        border-r border-cloud dark:border-surface-dark-alt
        transition-transform duration-300
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
