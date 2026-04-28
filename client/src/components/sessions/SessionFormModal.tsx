import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import Modal from '../shared/Modal'

interface Props {
  skillId?: number
  onClose: () => void
}

export default function SessionFormModal({ skillId: initialSkillId, onClose }: Props) {
  const queryClient = useQueryClient()
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>('')
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('')
  const [selectedSkillId, setSelectedSkillId] = useState<number | ''>(initialSkillId ?? '')
  const [practicedAt, setPracticedAt] = useState(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const mi = String(now.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d}T${hh}:${mi}`
  })
  const [duration, setDuration] = useState('')
  const [rating, setRating] = useState<number>(0)
  const [notes, setNotes] = useState('')

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
  })

  const categories = dashboard?.categories ?? []

  const selectedCategory = useMemo(
    () => categories.find((c: any) => c.id === selectedCategoryId),
    [categories, selectedCategoryId]
  )
  const items = selectedCategory?.items ?? []

  const selectedItem = useMemo(
    () => items.find((i: any) => i.id === selectedItemId),
    [items, selectedItemId]
  )
  const skills = selectedItem?.skills ?? []

  useEffect(() => {
    if (!initialSkillId || !dashboard?.categories) return
    for (const cat of dashboard.categories) {
      for (const item of cat.items) {
        for (const skill of item.skills) {
          if (skill.id === initialSkillId) {
            setSelectedCategoryId(cat.id)
            setSelectedItemId(item.id)
            setSelectedSkillId(skill.id)
            return
          }
        }
      }
    }
  }, [initialSkillId, dashboard])

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedSkillId) throw new Error('스킬을 선택하세요')
      return api.createSession(Number(selectedSkillId), {
        practiced_at: practicedAt,
        duration_minutes: duration ? Number(duration) : undefined,
        rating: rating || undefined,
        notes: notes || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['category'] })
      toast.success('연습을 기록했습니다')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.message || '기록에 실패했습니다')
    },
  })

  const labelClass = 'block text-xs font-medium text-pewter dark:text-silver mb-2 tracking-wide'
  const inputClass = 'w-full h-10 px-3 text-sm bg-canvas dark:bg-surface-dark-alt text-carbon dark:text-canvas border border-pale dark:border-surface-dark-alt rounded-[4px] focus:outline-none focus:border-electric focus:ring-2 focus:ring-electric/20'
  const textareaClass = 'w-full px-3 py-2 text-sm bg-canvas dark:bg-surface-dark-alt text-carbon dark:text-canvas border border-pale dark:border-surface-dark-alt rounded-[4px] focus:outline-none focus:border-electric focus:ring-2 focus:ring-electric/20 resize-none'

  return (
    <Modal title="연습 기록" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-5">
        <div>
          <label className={labelClass}>카테고리</label>
          <select
            value={selectedCategoryId}
            onChange={e => {
              const v = e.target.value ? Number(e.target.value) : ''
              setSelectedCategoryId(v)
              setSelectedItemId('')
              setSelectedSkillId('')
            }}
            className={inputClass}
            required
          >
            <option value="">카테고리를 선택하세요...</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>아이템</label>
          <select
            value={selectedItemId}
            onChange={e => {
              const v = e.target.value ? Number(e.target.value) : ''
              setSelectedItemId(v)
              setSelectedSkillId('')
            }}
            className={inputClass}
            required
            disabled={!selectedCategoryId}
          >
            <option value="">
              {selectedCategoryId ? '아이템을 선택하세요...' : '카테고리를 먼저 선택하세요'}
            </option>
            {items.map((i: any) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>스킬</label>
          <select
            value={selectedSkillId}
            onChange={e => setSelectedSkillId(e.target.value ? Number(e.target.value) : '')}
            className={inputClass}
            required
            disabled={!selectedItemId}
          >
            <option value="">
              {selectedItemId ? '스킬을 선택하세요...' : '아이템을 먼저 선택하세요'}
            </option>
            {skills.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>연습 일시</label>
          <input type="datetime-local" value={practicedAt} onChange={e => setPracticedAt(e.target.value)} className={inputClass} required />
        </div>

        <div>
          <label className={labelClass}>연습 시간 (분)</label>
          <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="선택 사항" min="1" max="1440" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>평점</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(rating === n ? 0 : n)}
                className="p-1"
              >
                <Star
                  size={22}
                  strokeWidth={1.5}
                  className={n <= rating ? 'fill-carbon text-carbon dark:fill-canvas dark:text-canvas' : 'text-pale dark:text-pewter'}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>메모</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="선택 사항..."
            rows={3}
            className={textareaClass}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-6 min-w-[120px] text-sm font-medium text-graphite dark:text-pale bg-canvas dark:bg-surface-dark-alt border border-pale dark:border-surface-dark-alt rounded-[4px] hover:bg-ash dark:hover:bg-surface-dark"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="h-10 px-6 min-w-[120px] text-sm font-medium text-canvas dark:text-carbon bg-carbon dark:bg-canvas rounded-[4px] hover:bg-graphite dark:hover:bg-pale disabled:opacity-50"
          >
            {mutation.isPending ? '저장 중...' : '기록하기'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
