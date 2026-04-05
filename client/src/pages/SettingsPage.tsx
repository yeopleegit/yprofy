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
      toast.success('Category created!')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (id: number) => api.updateCategory(id, editData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setEditingId(null)
      toast.success('Category updated!')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setDeleteTarget(null)
      toast.success('Category deleted')
    },
  })

  const importMutation = useMutation({
    mutationFn: (data: any) => api.importData(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries()
      setImportConfirm(null)
      toast.success(`Imported: ${result.counts.categories} categories, ${result.counts.skills} skills, ${result.counts.sessions} sessions`)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Import failed')
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
      a.download = `yproficiency-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported!')
    } catch {
      toast.error('Export failed')
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
          toast.error('Invalid backup file format')
          return
        }
        setImportConfirm(data)
      } catch {
        toast.error('Failed to parse file')
      }
    }
    reader.readAsText(file)
    // Reset input so the same file can be selected again
    e.target.value = ''
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Create Category */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">New Category</h2>
        <form
          onSubmit={e => { e.preventDefault(); if (newName.trim()) createMutation.mutate() }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Name *"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <input
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Description"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            value={newIcon}
            onChange={e => setNewIcon(e.target.value)}
            placeholder="Icon (emoji)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={newDecay}
              onChange={e => setNewDecay(e.target.value)}
              placeholder="Decay days"
              min="1"
              max="365"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus size={16} /> Create
            </button>
          </div>
        </form>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Categories</h2>
        </div>
        {categories.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">No categories yet</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {categories.map((cat: any) => (
              <div key={cat.id} className="px-4 py-3">
                {editingId === cat.id ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      value={editData.name}
                      onChange={e => setEditData({ ...editData, name: e.target.value })}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <input
                      value={editData.description}
                      onChange={e => setEditData({ ...editData, description: e.target.value })}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                      placeholder="Description"
                    />
                    <input
                      value={editData.icon}
                      onChange={e => setEditData({ ...editData, icon: e.target.value })}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                      placeholder="Icon"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={editData.decay_days}
                        onChange={e => setEditData({ ...editData, decay_days: Number(e.target.value) })}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                        min="1"
                      />
                      <button
                        onClick={() => updateMutation.mutate(cat.id)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{cat.icon} {cat.name}</span>
                      {cat.description && (
                        <span className="text-sm text-gray-500 ml-2">- {cat.description}</span>
                      )}
                      <span className="text-xs text-gray-400 ml-2">({cat.decay_days}d decay)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: cat.id, name: cat.name })}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
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
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Data Management</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <Download size={16} /> Export JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
          >
            <Upload size={16} /> Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Import will replace all existing data. Export first to create a backup.
        </p>
      </div>

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Category"
          message={`"${deleteTarget.name}" and all its items, skills, and session records will be permanently deleted. This cannot be undone.`}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Import Confirm Dialog */}
      {importConfirm && (
        <ConfirmDialog
          title="Import Data"
          message={`This will replace ALL existing data with the imported file (${importConfirm.data.categories.length} categories, ${importConfirm.data.skills.length} skills, ${importConfirm.data.sessions.length} sessions). This cannot be undone.`}
          confirmLabel="Import"
          onConfirm={() => importMutation.mutate(importConfirm)}
          onCancel={() => setImportConfirm(null)}
        />
      )}
    </div>
  )
}
