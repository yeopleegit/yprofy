import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil, Copy, ScrollText, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import StatusBadge from '../components/shared/StatusBadge'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import Modal from '../components/shared/Modal'

interface Props {
  onLogSession: (skillId?: number) => void
}

interface EditItemData {
  id: number
  name: string
  description: string
  icon: string
}

interface EditSkillData {
  id: number
  name: string
  description: string
  decay_days: string
}

export default function CategoryPage({ onLogSession }: Props) {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const [newItemName, setNewItemName] = useState('')
  const [addingSkillTo, setAddingSkillTo] = useState<number | null>(null)
  const [newSkillName, setNewSkillName] = useState('')
  const [deleteItemTarget, setDeleteItemTarget] = useState<{ id: number; name: string } | null>(null)
  const [deleteSkillTarget, setDeleteSkillTarget] = useState<{ id: number; name: string } | null>(null)
  const [editItem, setEditItem] = useState<EditItemData | null>(null)
  const [editSkill, setEditSkill] = useState<EditSkillData | null>(null)
  const [logsItem, setLogsItem] = useState<{ id: number; name: string; icon?: string } | null>(null)
  const [showCategoryLogs, setShowCategoryLogs] = useState(false)

  const { data: category, isLoading } = useQuery({
    queryKey: ['category', id],
    queryFn: () => api.getCategory(Number(id)),
    enabled: !!id,
  })

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
  })

  const { data: itemSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['item-sessions', logsItem?.id],
    queryFn: () => api.getItemSessions(logsItem!.id),
    enabled: !!logsItem,
  })

  const { data: categorySessions, isLoading: categorySessionsLoading } = useQuery({
    queryKey: ['category-sessions', id],
    queryFn: () => api.getCategorySessions(Number(id)),
    enabled: !!id && showCategoryLogs,
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['category', id] })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const addItemMutation = useMutation({
    mutationFn: () => api.createItem(Number(id), { name: newItemName }),
    onSuccess: () => { invalidateAll(); setNewItemName(''); toast.success('아이템을 추가했습니다') },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => api.deleteItem(itemId),
    onSuccess: () => { invalidateAll(); setDeleteItemTarget(null); toast.success('아이템을 삭제했습니다') },
  })

  const addSkillMutation = useMutation({
    mutationFn: ({ itemId, name }: { itemId: number; name: string }) =>
      api.createSkill(itemId, { name }),
    onSuccess: () => { invalidateAll(); setNewSkillName(''); setAddingSkillTo(null); toast.success('스킬을 추가했습니다') },
  })

  const deleteSkillMutation = useMutation({
    mutationFn: (skillId: number) => api.deleteSkill(skillId),
    onSuccess: () => { invalidateAll(); setDeleteSkillTarget(null); toast.success('스킬을 삭제했습니다') },
  })

  const copyItemMutation = useMutation({
    mutationFn: (itemId: number) => api.copyItem(itemId),
    onSuccess: () => { invalidateAll(); toast.success('아이템을 복사했습니다') },
    onError: (err: any) => toast.error(err.message || '아이템 복사에 실패했습니다'),
  })

  const copySkillMutation = useMutation({
    mutationFn: (skillId: number) => api.copySkill(skillId),
    onSuccess: () => { invalidateAll(); toast.success('스킬을 복사했습니다') },
    onError: (err: any) => toast.error(err.message || '스킬 복사에 실패했습니다'),
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; name: string; description?: string | null; icon?: string }) =>
      api.updateItem(id, data),
    onSuccess: () => { invalidateAll(); setEditItem(null); toast.success('아이템을 수정했습니다') },
    onError: (err: any) => toast.error(err.message || '아이템 수정에 실패했습니다'),
  })

  const updateSkillMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; name: string; description?: string | null; decay_days?: number }) =>
      api.updateSkill(id, data),
    onSuccess: () => { invalidateAll(); setEditSkill(null); toast.success('스킬을 수정했습니다') },
    onError: (err: any) => toast.error(err.message || '스킬 수정에 실패했습니다'),
  })

  const toggleItem = (itemId: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      next.has(itemId) ? next.delete(itemId) : next.add(itemId)
      return next
    })
  }

  const getSkillStatus = (skillId: number) => {
    if (!dashboard?.categories) return null
    for (const cat of dashboard.categories) {
      for (const item of cat.items) {
        for (const skill of item.skills) {
          if (skill.id === skillId) return skill
        }
      }
    }
    return null
  }

  const inputClass = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!category) return <div className="p-6 text-gray-500 dark:text-gray-400">카테고리를 찾을 수 없습니다</div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {category.icon} {category.name}
          </h1>
          <button
            onClick={() => setShowCategoryLogs(true)}
            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="연습 로그 보기"
          >
            <ScrollText size={16} />
          </button>
        </div>
        {category.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{category.description}</p>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          감소 기준: {category.decay_days}일
        </p>
      </div>

      {/* Add Item */}
      <form
        onSubmit={e => { e.preventDefault(); if (newItemName.trim()) addItemMutation.mutate() }}
        className="flex gap-2"
      >
        <input
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          placeholder="새 아이템 추가 (예: F-16, 피아노 소나타 1번)..."
          className={`flex-1 ${inputClass}`}
        />
        <button
          type="submit"
          disabled={!newItemName.trim()}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={16} /> 추가
        </button>
      </form>

      {/* Items list */}
      {category.items?.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">아이템이 없습니다. 위에서 추가하세요!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {category.items?.map((item: any) => {
            const expanded = expandedItems.has(item.id)
            return (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() => toggleItem(item.id)}
                >
                  <div className="flex items-center gap-2">
                    {expanded ? <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" /> : <ChevronRight size={16} className="text-gray-500 dark:text-gray-400" />}
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{item.icon ? `${item.icon} ` : ''}{item.name}</h3>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {item.skills?.length ?? 0}개 스킬
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); setLogsItem({ id: item.id, name: item.name, icon: item.icon }) }}
                      className="p-1 rounded hover:bg-purple-50 dark:hover:bg-purple-900/30 text-gray-400 hover:text-purple-500"
                      title="연습 로그 보기"
                    >
                      <ScrollText size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); copyItemMutation.mutate(item.id) }}
                      className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-500"
                      title="아이템 복사"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setEditItem({ id: item.id, name: item.name, description: item.description ?? '', icon: item.icon ?? '' }) }}
                      className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-500"
                      title="아이템 수정"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteItemTarget({ id: item.id, name: item.name }) }}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
                      title="아이템 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-2">
                    {item.skills?.map((skill: any) => {
                      const status = getSkillStatus(skill.id)
                      return (
                        <div key={skill.id} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{skill.name}</span>
                            {status && (
                              <StatusBadge
                                status={status.status}
                                daysSince={status.daysSinceLastPractice}
                                decayDays={status.decayDays}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onLogSession(skill.id)}
                              className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50"
                            >
                              기록
                            </button>
                            <button
                              onClick={() => copySkillMutation.mutate(skill.id)}
                              className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-500"
                              title="스킬 복사"
                            >
                              <Copy size={12} />
                            </button>
                            <button
                              onClick={() => setEditSkill({ id: skill.id, name: skill.name, description: skill.description ?? '', decay_days: skill.decay_days?.toString() ?? '' })}
                              className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-500"
                              title="스킬 수정"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => setDeleteSkillTarget({ id: skill.id, name: skill.name })}
                              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
                              title="스킬 삭제"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {/* Add Skill */}
                    {addingSkillTo === item.id ? (
                      <form
                        onSubmit={e => {
                          e.preventDefault()
                          if (newSkillName.trim()) addSkillMutation.mutate({ itemId: item.id, name: newSkillName })
                        }}
                        className="flex gap-2 pt-2"
                      >
                        <input
                          value={newSkillName}
                          onChange={e => setNewSkillName(e.target.value)}
                          placeholder="스킬 이름 (예: Takeoff, Landing)..."
                          className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button type="submit" className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                          추가
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAddingSkillTo(null); setNewSkillName('') }}
                          className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          취소
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setAddingSkillTo(item.id)}
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 pt-1"
                      >
                        <Plus size={14} /> 스킬 추가
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Item Confirm */}
      {deleteItemTarget && (
        <ConfirmDialog
          title="아이템 삭제"
          message={`"${deleteItemTarget.name}"과(와) 하위 스킬, 연습 기록이 모두 영구 삭제됩니다.`}
          confirmLabel="삭제"
          onConfirm={() => deleteItemMutation.mutate(deleteItemTarget.id)}
          onCancel={() => setDeleteItemTarget(null)}
        />
      )}

      {/* Delete Skill Confirm */}
      {deleteSkillTarget && (
        <ConfirmDialog
          title="스킬 삭제"
          message={`"${deleteSkillTarget.name}"과(와) 모든 연습 기록이 영구 삭제됩니다.`}
          confirmLabel="삭제"
          onConfirm={() => deleteSkillMutation.mutate(deleteSkillTarget.id)}
          onCancel={() => setDeleteSkillTarget(null)}
        />
      )}

      {/* Edit Item Modal */}
      {editItem && (
        <Modal title="아이템 수정" onClose={() => setEditItem(null)}>
          <form
            onSubmit={e => {
              e.preventDefault()
              if (!editItem.name.trim()) return
              updateItemMutation.mutate({
                id: editItem.id,
                name: editItem.name.trim(),
                description: editItem.description.trim() || null,
                icon: editItem.icon.trim() || undefined,
              })
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이름</label>
              <input
                value={editItem.name}
                onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                className={inputClass}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">설명</label>
              <textarea
                value={editItem.description}
                onChange={e => setEditItem({ ...editItem, description: e.target.value })}
                placeholder="선택 사항..."
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">아이콘 (이모지)</label>
              <input
                value={editItem.icon}
                onChange={e => setEditItem({ ...editItem, icon: e.target.value })}
                placeholder="예: ✈️"
                className={inputClass}
                maxLength={10}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditItem(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                취소
              </button>
              <button type="submit" disabled={updateItemMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {updateItemMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Skill Modal */}
      {editSkill && (
        <Modal title="스킬 수정" onClose={() => setEditSkill(null)}>
          <form
            onSubmit={e => {
              e.preventDefault()
              if (!editSkill.name.trim()) return
              updateSkillMutation.mutate({
                id: editSkill.id,
                name: editSkill.name.trim(),
                description: editSkill.description.trim() || null,
                decay_days: editSkill.decay_days ? Number(editSkill.decay_days) : undefined,
              })
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이름</label>
              <input
                value={editSkill.name}
                onChange={e => setEditSkill({ ...editSkill, name: e.target.value })}
                className={inputClass}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">설명</label>
              <textarea
                value={editSkill.description}
                onChange={e => setEditSkill({ ...editSkill, description: e.target.value })}
                placeholder="선택 사항..."
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">감소 기준일 (개별 설정)</label>
              <input
                type="number"
                value={editSkill.decay_days}
                onChange={e => setEditSkill({ ...editSkill, decay_days: e.target.value })}
                placeholder={`카테고리 기본값: ${category?.decay_days ?? 30}일`}
                min="1"
                max="365"
                className={inputClass}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                비워두면 카테고리 기본값 ({category?.decay_days ?? 30}일) 을 사용합니다
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditSkill(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                취소
              </button>
              <button type="submit" disabled={updateSkillMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {updateSkillMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Item Sessions Log Modal */}
      {logsItem && (
        <Modal title={`${logsItem.icon ? `${logsItem.icon} ` : ''}${logsItem.name} · 연습 로그`} onClose={() => setLogsItem(null)}>
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : !itemSessions || itemSessions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
              아직 연습 기록이 없습니다
            </p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-gray-400 dark:text-gray-500">총 {itemSessions.length}건</p>
              {itemSessions.map((s: any) => (
                <div
                  key={s.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {s.skill_name ?? '(삭제된 스킬)'}
                      </span>
                      {s.duration_minutes != null && (
                        <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {s.duration_minutes}분
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatPracticedAt(s.practiced_at)}
                    </span>
                  </div>
                  {s.rating != null && (
                    <div className="flex items-center gap-0.5 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < s.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                        />
                      ))}
                    </div>
                  )}
                  {s.notes && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap">{s.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Category Sessions Log Modal */}
      {showCategoryLogs && category && (
        <Modal title={`${category.icon ? `${category.icon} ` : ''}${category.name} · 전체 연습 로그`} onClose={() => setShowCategoryLogs(false)}>
          {categorySessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : !categorySessions || categorySessions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
              아직 연습 기록이 없습니다
            </p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-gray-400 dark:text-gray-500">총 {categorySessions.length}건</p>
              {categorySessions.map((s: any) => (
                <div
                  key={s.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {s.skill_name ?? '(삭제된 스킬)'}
                      </span>
                      {s.duration_minutes != null && (
                        <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {s.duration_minutes}분
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatPracticedAt(s.practiced_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {s.item_icon ? `${s.item_icon} ` : ''}{s.item_name ?? '(삭제된 아이템)'}
                  </p>
                  {s.rating != null && (
                    <div className="flex items-center gap-0.5 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < s.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                        />
                      ))}
                    </div>
                  )}
                  {s.notes && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap">{s.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

function formatPracticedAt(value: string): string {
  if (!value) return ''
  const hasTime = value.includes('T')
  const d = new Date(hasTime ? value : `${value}T00:00:00`)
  if (isNaN(d.getTime())) return value
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  if (!hasTime) return `${y}-${m}-${day}`
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}
