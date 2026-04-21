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

  const labelClass = 'block text-xs font-medium text-pewter dark:text-silver mb-2 tracking-wide'
  const inputClass = 'w-full h-10 px-3 text-sm bg-canvas dark:bg-surface-dark-alt text-carbon dark:text-canvas border border-pale dark:border-surface-dark-alt rounded-[4px] focus:outline-none focus:border-electric focus:ring-2 focus:ring-electric/20'
  const inputClassSm = 'w-full h-9 px-2 text-sm bg-canvas dark:bg-surface-dark-alt text-carbon dark:text-canvas border border-pale dark:border-surface-dark-alt rounded-[4px] focus:outline-none focus:border-electric'

  return (
    <div className="px-6 lg:px-12 max-w-[1280px] mx-auto">
      <div className="divide-y divide-cloud dark:divide-surface-dark-alt [&>*]:py-10">
      <div>
        <p className="text-xs font-medium text-silver tracking-[0.2em] uppercase mb-3">Preferences</p>
        <h1 className="text-4xl font-medium text-carbon dark:text-canvas">설정</h1>
      </div>

      {/* Create Category */}
      <section>
        <h2 className="text-xs font-medium text-silver tracking-[0.2em] uppercase mb-5">새 카테고리</h2>
        <form
          onSubmit={e => { e.preventDefault(); if (newName.trim()) createMutation.mutate() }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div>
            <label className={labelClass}>이름</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="카테고리 이름" className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>설명</label>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="선택 사항" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>아이콘 (이모지)</label>
            <input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="예: ✈️" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>감소 기준일</label>
            <div className="flex gap-3">
              <input type="number" value={newDecay} onChange={e => setNewDecay(e.target.value)} placeholder="일" min="1" max="365" className={`flex-1 ${inputClass}`} />
              <button
                type="submit"
                disabled={!newName.trim()}
                className="h-10 px-6 min-w-[120px] flex items-center justify-center gap-2 bg-electric text-white rounded-[4px] text-sm font-medium hover:bg-electric-hover disabled:opacity-40"
              >
                <Plus size={16} strokeWidth={2} /> 생성
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Categories List */}
      <section>
        <h2 className="text-xs font-medium text-silver tracking-[0.2em] uppercase mb-5">카테고리</h2>
        {categories.length === 0 ? (
          <p className="py-10 text-sm text-pewter dark:text-silver text-center">카테고리가 없습니다</p>
        ) : (
          <div className="divide-y divide-cloud dark:divide-surface-dark-alt">
            {categories.map((cat: any) => (
              <div key={cat.id} className="py-4">
                {editingId === cat.id ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className={inputClassSm} />
                    <input value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} className={inputClassSm} placeholder="설명" />
                    <input value={editData.icon} onChange={e => setEditData({ ...editData, icon: e.target.value })} className={inputClassSm} placeholder="아이콘" />
                    <div className="flex gap-2">
                      <input type="number" value={editData.decay_days} onChange={e => setEditData({ ...editData, decay_days: Number(e.target.value) })} className={`flex-1 ${inputClassSm}`} min="1" />
                      <button onClick={() => updateMutation.mutate(cat.id)} className="h-9 w-9 flex items-center justify-center rounded-[4px] text-electric hover:bg-ash dark:hover:bg-surface-dark">
                        <Check size={16} strokeWidth={1.75} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="h-9 w-9 flex items-center justify-center rounded-[4px] text-pewter hover:bg-ash dark:hover:bg-surface-dark">
                        <X size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-base font-medium text-carbon dark:text-canvas">{cat.icon} {cat.name}</span>
                      {cat.description && (
                        <span className="text-sm text-pewter dark:text-silver ml-3">— {cat.description}</span>
                      )}
                      <span className="text-xs text-silver ml-3">({cat.decay_days}일 감소)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-1.5 rounded-[4px] text-pewter hover:text-carbon dark:text-silver dark:hover:text-canvas"
                      >
                        <Edit2 size={14} strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: cat.id, name: cat.name })}
                        className="p-1.5 rounded-[4px] text-pewter hover:text-carbon dark:text-silver dark:hover:text-canvas"
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Data Export/Import */}
      <section>
        <h2 className="text-xs font-medium text-silver tracking-[0.2em] uppercase mb-5">데이터 관리</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="h-10 px-6 min-w-[160px] flex items-center justify-center gap-2 bg-electric text-white rounded-[4px] text-sm font-medium hover:bg-electric-hover"
          >
            <Download size={16} strokeWidth={2} /> JSON 내보내기
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-10 px-6 min-w-[160px] flex items-center justify-center gap-2 text-graphite dark:text-pale bg-canvas dark:bg-surface-dark-alt border border-pale dark:border-surface-dark-alt rounded-[4px] text-sm font-medium hover:bg-ash dark:hover:bg-surface-dark"
          >
            <Upload size={16} strokeWidth={2} /> JSON 가져오기
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
        <p className="text-xs text-silver mt-4">
          가져오기 시 기존 데이터가 모두 대체됩니다. 먼저 내보내기로 백업하세요.
        </p>
      </section>
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
