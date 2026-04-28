import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
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
  '#3E6AE1', '#059669', '#D97706', '#DC2626', '#7C3AED',
  '#0891B2', '#DB2777', '#65A30D', '#4F46E5', '#EA580C',
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
    const orderedCats: { id: number; name: string }[] = []
    for (const cat of categories) {
      if (catMap.has(cat.id)) orderedCats.push({ id: cat.id, name: cat.name })
    }
    for (const [id, name] of catMap.entries()) {
      if (!orderedCats.find((c) => c.id === id)) orderedCats.push({ id, name })
    }
    return { chartData: sortedDates, chartCategories: orderedCats }
  }, [frequency, categories])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric" />
      </div>
    )
  }

  const statCards = [
    { label: '카테고리', value: stats?.totalCategories ?? 0 },
    { label: '스킬', value: stats?.totalSkills ?? 0 },
    { label: '총 연습 횟수', value: stats?.totalSessions ?? 0 },
    { label: '이번 주 연습', value: stats?.sessionsThisWeek ?? 0 },
  ]

  return (
    <div className="px-6 lg:px-12 max-w-[1280px] mx-auto divide-y divide-cloud dark:divide-surface-dark-alt [&>*]:py-10">
      {/* Header */}
      <div>
        <p className="text-xs font-medium text-silver tracking-[0.2em] uppercase mb-3">Overview</p>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <h1 className="text-4xl font-medium text-carbon dark:text-canvas">대시보드</h1>
          <button
            onClick={() => onLogSession()}
            className="h-10 px-6 min-w-[160px] bg-carbon text-canvas dark:bg-canvas dark:text-carbon rounded-[4px] text-sm font-medium hover:bg-graphite dark:hover:bg-pale"
          >
            연습 기록
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-0 lg:divide-x lg:divide-cloud lg:dark:divide-surface-dark-alt">
        {statCards.map(({ label, value }, idx) => (
          <div key={label} className={`${idx === 0 ? 'lg:pl-0' : 'lg:pl-6'} lg:pr-6`}>
            <p className="text-xs font-medium text-pewter dark:text-silver tracking-[0.16em] uppercase mb-3">{label}</p>
            <p className="text-3xl font-medium text-carbon dark:text-canvas tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Most Stale Skill */}
      {stats?.mostStaleSkill && stats.mostStaleSkill.daysSince > 0 && (
        <div className="bg-ash dark:bg-surface-dark px-6 py-5 rounded-[4px]">
          <p className="text-[11px] font-medium text-pewter dark:text-silver tracking-[0.18em] uppercase mb-2">가장 오래된 스킬</p>
          <p className="text-sm text-carbon dark:text-canvas">
            <span className="font-medium">{stats.mostStaleSkill.name}</span>
            <span className="text-pewter dark:text-silver"> · {stats.mostStaleSkill.itemName} · {stats.mostStaleSkill.categoryName}</span>
          </p>
          <p className="text-sm text-graphite dark:text-pale mt-1">
            {stats.mostStaleSkill.daysSince >= 0
              ? `${stats.mostStaleSkill.daysSince}일 동안 연습하지 않았습니다`
              : '아직 연습한 적이 없습니다'}
          </p>
        </div>
      )}

      {/* Frequency Chart */}
      {frequencyChartData.length > 0 && (
        <div>
          <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
            <div>
              <p className="text-xs font-medium text-silver tracking-[0.2em] uppercase mb-2">Activity</p>
              <h2 className="text-xl font-medium text-carbon dark:text-canvas">연습 빈도 — 최근 {period}일</h2>
            </div>
            <div className="inline-flex text-xs">
              {FREQUENCY_PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`h-8 px-4 font-medium rounded-[4px] ${
                    period === p
                      ? 'bg-carbon text-canvas dark:bg-canvas dark:text-carbon'
                      : 'text-pewter dark:text-silver hover:text-carbon dark:hover:text-canvas'
                  }`}
                >
                  {p}일
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={frequencyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="currentColor" className="text-cloud dark:text-surface-dark-alt" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'currentColor' }}
                tickFormatter={(d: string) => d.slice(5)}
                axisLine={false}
                tickLine={false}
                className="text-pewter dark:text-silver"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                axisLine={false}
                tickLine={false}
                className="text-pewter dark:text-silver"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg)',
                  border: '1px solid var(--tooltip-border)',
                  borderRadius: '4px',
                  color: 'var(--tooltip-text)',
                  fontSize: 12,
                }}
                cursor={{ fill: 'rgba(62,106,225,0.06)' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} iconType="circle" iconSize={8} />
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

      {/* Categories with Skills */}
      {(() => {
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
            <div className="py-24 text-center">
              <p className="text-xs font-medium text-silver tracking-[0.2em] uppercase mb-3">Empty</p>
              <h3 className="text-2xl font-medium text-carbon dark:text-canvas mb-3">카테고리가 없습니다</h3>
              <p className="text-sm text-pewter dark:text-silver">
                설정에서 카테고리를 만들고, 아이템과 스킬을 추가하세요.
              </p>
            </div>
          );
        }

        if (filtered.length === 0) {
          return (
            <div className="py-24 text-center">
              <p className="text-xs font-medium text-silver tracking-[0.2em] uppercase mb-3">All clear</p>
              <h3 className="text-2xl font-medium text-carbon dark:text-canvas mb-3">모든 스킬이 양호합니다</h3>
              <p className="text-sm text-pewter dark:text-silver">
                주의나 감소 상태인 스킬이 없습니다. 잘하고 있어요.
              </p>
            </div>
          );
        }

        return (
          <div>
            <p className="text-xs font-medium text-silver tracking-[0.2em] uppercase mb-6">Attention</p>
            <div className="space-y-10">
              {filtered.map((cat: any) => {
                const isHidden = hiddenIds.has(cat.id)
                return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between pb-3 mb-5 border-b border-cloud dark:border-surface-dark-alt">
                    <h3 className="text-lg font-medium text-carbon dark:text-canvas">
                      {cat.icon} {cat.name}
                    </h3>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!isHidden}
                      aria-label={`${cat.name} 카테고리 ${isHidden ? '펼치기' : '접기'}`}
                      onClick={() => toggleCategory(cat.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full ${
                        isHidden ? 'bg-pale dark:bg-pewter' : 'bg-electric'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isHidden ? 'translate-x-0.5' : 'translate-x-[18px]'
                        }`}
                      />
                    </button>
                  </div>
                  {!isHidden && (
                  <div className="space-y-6">
                    {cat.items.map((item: any) => (
                      <div key={item.id}>
                        <h4 className="text-xs font-medium text-pewter dark:text-silver tracking-[0.16em] uppercase mb-3">
                          {item.icon ? `${item.icon} ` : ''}{item.name}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {item.skills.map((skill: any) => (
                            <button
                              key={skill.id}
                              onClick={() => onLogSession(skill.id)}
                              className="flex items-center gap-3 px-4 h-10 rounded-[4px] bg-ash dark:bg-surface-dark hover:bg-cloud dark:hover:bg-surface-dark-alt text-sm"
                            >
                              <span className="text-carbon dark:text-canvas font-medium">{skill.name}</span>
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
          </div>
        );
      })()}
    </div>
  )
}
