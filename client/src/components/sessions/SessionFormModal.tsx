import { useState } from 'react'
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
  const [selectedSkillId, setSelectedSkillId] = useState<number | ''>(initialSkillId ?? '')
  const [practicedAt, setPracticedAt] = useState(() => new Date().toISOString().split('T')[0])
  const [duration, setDuration] = useState('')
  const [rating, setRating] = useState<number>(0)
  const [notes, setNotes] = useState('')

  // Build a flat skill list from dashboard data
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
  })

  const skillOptions: { id: number; label: string }[] = []
  if (dashboard?.categories) {
    for (const cat of dashboard.categories) {
      for (const item of cat.items) {
        for (const skill of item.skills) {
          skillOptions.push({
            id: skill.id,
            label: `${cat.name} > ${item.name} > ${skill.name}`,
          })
        }
      }
    }
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedSkillId) throw new Error('Select a skill')
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
      toast.success('Session logged!')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to log session')
    },
  })

  return (
    <Modal title="Log Practice Session" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
        {/* Skill selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Skill</label>
          <select
            value={selectedSkillId}
            onChange={e => setSelectedSkillId(e.target.value ? Number(e.target.value) : '')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select a skill...</option>
            {skillOptions.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={practicedAt}
            onChange={e => setPracticedAt(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
          <input
            type="number"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder="Optional"
            min="1"
            max="1440"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
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
                  className={n <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : 'Log Session'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
