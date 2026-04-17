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

  // initialSkillId 가 주어지면 카테고리/아이템도 자동 선택
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

  const inputClass = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

  return (
    <Modal title="연습 기록" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
        {/* Category selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">카테고리</label>
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

        {/* Item selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">아이템</label>
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

        {/* Skill selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">스킬</label>
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

        {/* Date & time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">연습 일시</label>
          <input type="datetime-local" value={practicedAt} onChange={e => setPracticedAt(e.target.value)} className={inputClass} required />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">연습 시간 (분)</label>
          <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="선택 사항" min="1" max="1440" className={inputClass} />
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">평점</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(rating === n ? 0 : n)}
                className="p-1"
              >
                <Star
                  size={24}
                  className={n <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">메모</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="선택 사항..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? '저장 중...' : '기록하기'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
