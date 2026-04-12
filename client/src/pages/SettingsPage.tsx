import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2, Check, X, Download, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import ConfirmDialog from '../components/shared/ConfirmDialog'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newIcon, setNewIcon] = useState('')
  const [newDecay, setNewDecay] = useState('14')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState({ name: '', description: '', icon: '', decay_days: 14 })
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
  const [importConfirm, setImportConfirm] = useState<any>(null)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  })

  const createMutation = useMutation({
    mutationFn: () => api.createCategory({
      name: newName,
      description: newDesc || undefined,
      icon: newIcon || undefined,
      decay_days: Number(newDecay) || 14,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setNewName(''); setNewDesc(''); setNewIcon(''); setNewDecay('14')
      toast.success('카테고리를 생성했습니다')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (id: number) => api.updateCategory(id, editData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setEditingId(null)
      toast.success('카테고리를 수정했습니다')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setDeleteTarget(null)
      toast.success('카테고리를 삭제했습니다')
    },
  })

  const importMutation = useMutation({
    mutationFn: (data: any) => api.importData(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries()
      setImportConfirm(null)
      toast.success(`가져오기 완료: 카테고리 ${result.counts.categories}개, 스킬 ${result.counts.skills}개, 세션 ${result.counts.sessions}개`)
    },
    onError: (err: any) => {
      toast.error(err.message || '가져오기에 실패했습니다')
    },
  })

  const startEdit = (cat: any) => {
    setEditingId(cat.id)
    setEditData({ name: cat.name, description: cat.description || '', icon: cat.icon || '', decay_days: cat.decay_days })
  }

  const handleExport = async () => {
    try {
      const data = await api.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const now = new Date()
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      a.download = `yprofy-backup-${dateStr}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('데이터를 내보냈습니다')
    } catch {
      toast.error('내보내기에 실패했습니다')
    }
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!data?.data?.categories) {
          toast.error('올바르지 않은 백업 파일 형식입니다')
          return
        }
        setImportConfirm(data)
      } catch {
        toast.error('파일을 읽을 수 없습니다')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const inputClass = 'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
  const inputClassSm = 'border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">설정</h1>

      {/* Create Category */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">새 카테고리</h2>
        <form
          onSubmit={e => { e.preventDefault(); if (newName.trim()) createMutation.mutate() }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="이름 *" className={inputClass} required />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="설명" className={inputClass} />
          <input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="아이콘 (이모지)" className={inputClass} />
          <div className="flex gap-2">
            <input type="number" value={newDecay} onChange={e => setNewDecay(e.target.value)} placeholder="감소 기준일" min="1" max="365" className={`flex-1 ${inputClass}`} />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus size={16} /> 생성
            </button>
          </div>
        </form>
      </div>

      {/* Categories List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">카테고리</h2>
        </div>
        {categories.length === 0 ? (
          <p className="p-4 text-sm text-gray-400 dark:text-gray-500">카테고리가 없습니다</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {categories.map((cat: any) => (
              <div key={cat.id} className="px-4 py-3">
                {editingId === cat.id ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className={inputClassSm} />
                    <input value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} className={inputClassSm} placeholder="설명" />
                    <input value={editData.icon} onChange={e => setEditData({ ...editData, icon: e.target.value })} className={inputClassSm} placeholder="아이콘" />
                    <div className="flex gap-2">
                      <input type="number" value={editData.decay_days} onChange={e => setEditData({ ...editData, decay_days: Number(e.target.value) })} className={`flex-1 ${inputClassSm}`} min="1" />
                      <button onClick={() => updateMutation.mutate(cat.id)} className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{cat.icon} {cat.name}</span>
                      {cat.description && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">- {cat.description}</span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">({cat.decay_days}일 감소)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: cat.id, name: cat.name })}
                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Export/Import */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">데이터 관리</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <Download size={16} /> JSON 내보내기
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
          >
            <Upload size={16} /> JSON 가져오기
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          가져오기 시 기존 데이터가 모두 대체됩니다. 먼저 내보내기로 백업하세요.
        </p>
      </div>

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="카테고리 삭제"
          message={`"${deleteTarget.name}"과(와) 하위 아이템, 스킬, 연습 기록이 모두 영구 삭제됩니다. 되돌릴 수 없습니다.`}
          confirmLabel="삭제"
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Import Confirm Dialog */}
      {importConfirm && (
        <ConfirmDialog
          title="데이터 가져오기"
          message={`기존 데이터가 모두 가져온 파일로 대체됩니다 (카테고리 ${importConfirm.data.categories.length}개, 스킬 ${importConfirm.data.skills.length}개, 세션 ${importConfirm.data.sessions.length}개). 되돌릴 수 없습니다.`}
          confirmLabel="가져오기"
          onConfirm={() => importMutation.mutate(importConfirm)}
          onCancel={() => setImportConfirm(null)}
        />
      )}
    </div>
  )
}
