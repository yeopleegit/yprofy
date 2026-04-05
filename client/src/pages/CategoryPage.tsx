import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import StatusBadge from '../components/shared/StatusBadge'
import ConfirmDialog from '../components/shared/ConfirmDialog'

interface Props {
  onLogSession: (skillId?: number) => void
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

  const { data: category, isLoading } = useQuery({
    queryKey: ['category', id],
    queryFn: () => api.getCategory(Number(id)),
    enabled: !!id,
  })

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['category', id] })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const addItemMutation = useMutation({
    mutationFn: () => api.createItem(Number(id), { name: newItemName }),
    onSuccess: () => { invalidateAll(); setNewItemName(''); toast.success('Item added!') },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => api.deleteItem(itemId),
    onSuccess: () => { invalidateAll(); setDeleteItemTarget(null); toast.success('Item deleted') },
  })

  const addSkillMutation = useMutation({
    mutationFn: ({ itemId, name }: { itemId: number; name: string }) =>
      api.createSkill(itemId, { name }),
    onSuccess: () => { invalidateAll(); setNewSkillName(''); setAddingSkillTo(null); toast.success('Skill added!') },
  })

  const deleteSkillMutation = useMutation({
    mutationFn: (skillId: number) => api.deleteSkill(skillId),
    onSuccess: () => { invalidateAll(); setDeleteSkillTarget(null); toast.success('Skill deleted') },
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!category) return <div className="p-6 text-gray-500">Category not found</div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {category.icon} {category.name}
        </h1>
        {category.description && (
          <p className="text-sm text-gray-500 mt-1">{category.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Decay threshold: {category.decay_days} days
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
          placeholder="Add new item (e.g., F-16, Piano Sonata No.1)..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!newItemName.trim()}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={16} /> Add Item
        </button>
      </form>

      {/* Items list */}
      {category.items?.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No items yet. Add one above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {category.items?.map((item: any) => {
            const expanded = expandedItems.has(item.id)
            return (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleItem(item.id)}
                >
                  <div className="flex items-center gap-2">
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <span className="text-xs text-gray-400">
                      {item.skills?.length ?? 0} skills
                    </span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteItemTarget({ id: item.id, name: item.name }) }}
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {expanded && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                    {item.skills?.map((skill: any) => {
                      const status = getSkillStatus(skill.id)
                      return (
                        <div key={skill.id} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-700">{skill.name}</span>
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
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                            >
                              Log
                            </button>
                            <button
                              onClick={() => setDeleteSkillTarget({ id: skill.id, name: skill.name })}
                              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
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
                          placeholder="Skill name (e.g., Takeoff, Landing)..."
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button type="submit" className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAddingSkillTo(null); setNewSkillName('') }}
                          className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setAddingSkillTo(item.id)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 pt-1"
                      >
                        <Plus size={14} /> Add Skill
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
          title="Delete Item"
          message={`"${deleteItemTarget.name}" and all its skills and session records will be permanently deleted.`}
          onConfirm={() => deleteItemMutation.mutate(deleteItemTarget.id)}
          onCancel={() => setDeleteItemTarget(null)}
        />
      )}

      {/* Delete Skill Confirm */}
      {deleteSkillTarget && (
        <ConfirmDialog
          title="Delete Skill"
          message={`"${deleteSkillTarget.name}" and all its session records will be permanently deleted.`}
          onConfirm={() => deleteSkillMutation.mutate(deleteSkillTarget.id)}
          onCancel={() => setDeleteSkillTarget(null)}
        />
      )}
    </div>
  )
}
