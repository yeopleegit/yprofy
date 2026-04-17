import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
import { Activity, Target, Calendar, AlertTriangle, Plus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api } from '../api/client'
import StatusBadge from '../components/shared/StatusBadge'

interface Props {
  onLogSession: (skillId?: number) => void
}

const HIDDEN_CATEGORIES_KEY = 'dashboard_hidden_category_ids'
const FREQUENCY_PERIOD_KEY = 'dashboard_frequency_period'
const FREQUENCY_PERIODS = [7, 30, 90] as const
type FrequencyPeriod = (typeof FREQUENCY_PERIODS)[number]

function loadPeriod(): FrequencyPeriod {
  const raw = Number(localStorage.getItem(FREQUENCY_PERIOD_KEY))
  return (FREQUENCY_PERIODS as readonly number[]).includes(raw) ? (raw as FrequencyPeriod) : 30
}

const CATEGORY_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4',
]

function loadHiddenIds(): Set<number> {
  try {
    const raw = localStorage.getItem(HIDDEN_CATEGORIES_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr.filter((v) => typeof v === 'number') : [])
  } catch {
    return new Set()
  }
}

export default function DashboardPage({ onLogSession }: Props) {
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(() => loadHiddenIds())
  const [period, setPeriod] = useState<FrequencyPeriod>(() => loadPeriod())

  useEffect(() => {
    localStorage.setItem(HIDDEN_CATEGORIES_KEY, JSON.stringify(Array.from(hiddenIds)))
  }, [hiddenIds])

  useEffect(() => {
    localStorage.setItem(FREQUENCY_PERIOD_KEY, String(period))
  }, [period])

  const toggleCategory = (id: number) => {
    setHiddenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
  })

  const { data: frequency = [] } = useQuery({
    queryKey: ['frequency', period],
    queryFn: () => api.getFrequency({ period }),
  })

  const stats = data?.stats
  const categories = data?.categories ?? []

  // 빈도 데이터를 카테고리별로 누적 막대 차트에 맞게 피벗
  // (Hooks 규칙: 조건부 early return 이전에 호출되어야 함)
  const { chartData: frequencyChartData, chartCategories: frequencyChartCategories } = useMemo(() => {
    const dateMap = new Map<string, Record<string, any>>()
    const catMap = new Map<number, string>()
    for (const row of frequency as any[]) {
      if (row.category_id == null) continue
      if (!catMap.has(row.category_id)) catMap.set(row.category_id, row.category_name)
      let bucket = dateMap.get(row.date)
      if (!bucket) {
        bucket = { date: row.date }
        dateMap.set(row.date, bucket)
      }
      bucket[`cat_${row.category_id}`] = (bucket[`cat_${row.category_id}`] ?? 0) + Number(row.count)
    }
    const sortedDates = Array.from(dateMap.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    )
    // 카테고리 순서: 사이드바 sort_order 기준 (있는 것만)
    const orderedCats: { id: number; name: string }[] = []
    for (const cat of categories) {
      if (catMap.has(cat.id)) orderedCats.push({ id: cat.id, name: cat.name })
    }
    // categories에 없는 (삭제 등) 케이스도 끝에 추가
    for (const [id, name] of catMap.entries()) {
      if (!orderedCats.find((c) => c.id === id)) orderedCats.push({ id, name })
    }
    return { chartData: sortedDates, chartCategories: orderedCats }
  }, [frequency, categories])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const statCards = [
    { label: '카테고리', value: stats?.totalCategories ?? 0, icon: Target, color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30' },
    { label: '스킬', value: stats?.totalSkills ?? 0, icon: Activity, color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30' },
    { label: '총 연습 횟수', value: stats?.totalSessions ?? 0, icon: Calendar, color: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/30' },
    { label: '이번 주 연습', value: stats?.sessionsThisWeek ?? 0, icon: Calendar, color: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">대시보드</h1>
        <button
          onClick={() => onLogSession()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} /> 연습 기록
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Most Stale Skill Warning */}
      {stats?.mostStaleSkill && stats.mostStaleSkill.daysSince > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>{stats.mostStaleSkill.name}</strong> ({stats.mostStaleSkill.itemName} - {stats.mostStaleSkill.categoryName})
            {stats.mostStaleSkill.daysSince >= 0
              ? ` — ${stats.mostStaleSkill.daysSince}일 동안 연습하지 않았습니다`
              : ' — 아직 연습한 적이 없습니다'}
          </p>
        </div>
      )}

      {/* Frequency Chart */}
      {frequencyChartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">연습 빈도 (최근 {period}일)</h2>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
              {FREQUENCY_PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 font-medium transition-colors ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {p}일
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={frequencyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} stroke="currentColor" className="text-gray-500 dark:text-gray-400" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-500 dark:text-gray-400" />
              <Tooltip contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: '8px', color: 'var(--tooltip-text)' }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {frequencyChartCategories.map((cat, idx) => (
                <Bar
                  key={cat.id}
                  dataKey={`cat_${cat.id}`}
                  name={cat.name}
                  stackId="a"
                  fill={CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Categories with Skills — 주의/감소 상태만, 오래된 순 */}
      {(() => {
        // fresh 스킬 제외, 주의(warming)/감소(stale)만 필터링 후 오래된 순 정렬
        const filtered = categories
          .map((cat: any) => ({
            ...cat,
            items: cat.items
              .map((item: any) => ({
                ...item,
                skills: item.skills
                  .filter((s: any) => s.status !== 'fresh')
                  .sort((a: any, b: any) => {
                    const da = a.daysSinceLastPractice ?? Infinity;
                    const db = b.daysSinceLastPractice ?? Infinity;
                    return db - da;
                  }),
              }))
              .filter((item: any) => item.skills.length > 0),
          }))
          .filter((cat: any) => cat.items.length > 0);

        if (categories.length === 0) {
          return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Target size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">카테고리가 없습니다</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                설정에서 카테고리를 만들고, 아이템과 스킬을 추가하세요.
              </p>
            </div>
          );
        }

        if (filtered.length === 0) {
          return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Activity size={48} className="mx-auto text-green-400 dark:text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">모든 스킬이 양호합니다</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                주의나 감소 상태인 스킬이 없습니다. 잘하고 있어요!
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {filtered.map((cat: any) => {
              const isHidden = hiddenIds.has(cat.id)
              return (
              <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className={`px-4 py-3 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between ${isHidden ? '' : 'border-b border-gray-200 dark:border-gray-700'}`}>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {cat.icon} {cat.name}
                  </h3>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!isHidden}
                    aria-label={`${cat.name} 카테고리 ${isHidden ? '펼치기' : '접기'}`}
                    onClick={() => toggleCategory(cat.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      isHidden ? 'bg-gray-300 dark:bg-gray-600' : 'bg-blue-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        isHidden ? 'translate-x-0.5' : 'translate-x-[18px]'
                      }`}
                    />
                  </button>
                </div>
                {!isHidden && (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {cat.items.map((item: any) => (
                    <div key={item.id} className="p-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{item.icon ? `${item.icon} ` : ''}{item.name}</h4>
                      <div className="flex flex-wrap gap-2">
                        {item.skills.map((skill: any) => (
                          <button
                            key={skill.id}
                            onClick={() => onLogSession(skill.id)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm"
                          >
                            <span className="text-gray-700 dark:text-gray-300">{skill.name}</span>
                            <StatusBadge
                              status={skill.status}
                              daysSince={skill.daysSinceLastPractice}
                              decayDays={skill.decayDays}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
              )
            })}
          </div>
        );
      })()}
    </div>
  )
}
