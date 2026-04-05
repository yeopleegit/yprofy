import { useQuery } from '@tanstack/react-query'
import { Activity, Target, Calendar, AlertTriangle, Plus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../api/client'
import StatusBadge from '../components/shared/StatusBadge'

interface Props {
  onLogSession: (skillId?: number) => void
}

export default function DashboardPage({ onLogSession }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
  })

  const { data: frequency = [] } = useQuery({
    queryKey: ['frequency'],
    queryFn: () => api.getFrequency({ period: 30 }),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const stats = data?.stats
  const categories = data?.categories ?? []

  const statCards = [
    { label: 'Categories', value: stats?.totalCategories ?? 0, icon: Target, color: 'text-blue-600 bg-blue-50' },
    { label: 'Skills', value: stats?.totalSkills ?? 0, icon: Activity, color: 'text-green-600 bg-green-50' },
    { label: 'Total Sessions', value: stats?.totalSessions ?? 0, icon: Calendar, color: 'text-purple-600 bg-purple-50' },
    { label: 'This Week', value: stats?.sessionsThisWeek ?? 0, icon: Calendar, color: 'text-orange-600 bg-orange-50' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={() => onLogSession()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} /> Log Session
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Most Stale Skill Warning */}
      {stats?.mostStaleSkill && stats.mostStaleSkill.daysSince > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{stats.mostStaleSkill.name}</strong> ({stats.mostStaleSkill.itemName} - {stats.mostStaleSkill.categoryName})
            {stats.mostStaleSkill.daysSince >= 0
              ? ` hasn't been practiced in ${stats.mostStaleSkill.daysSince} days`
              : ' has never been practiced'}
          </p>
        </div>
      )}

      {/* Frequency Chart */}
      {frequency.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Practice Frequency (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={frequency}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Categories with Skills */}
      {categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Target size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Go to Settings to create your first category, then add items and skills.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat: any) => (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">
                  {cat.icon} {cat.name}
                </h3>
              </div>
              {cat.items.length === 0 ? (
                <p className="p-4 text-sm text-gray-400">No items yet</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {cat.items.map((item: any) => (
                    <div key={item.id} className="p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">{item.name}</h4>
                      {item.skills.length === 0 ? (
                        <p className="text-xs text-gray-400">No skills yet</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {item.skills.map((skill: any) => (
                            <button
                              key={skill.id}
                              onClick={() => onLogSession(skill.id)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm"
                            >
                              <span className="text-gray-700">{skill.name}</span>
                              <StatusBadge
                                status={skill.status}
                                daysSince={skill.daysSinceLastPractice}
                                decayDays={skill.decayDays}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
