import { statusColors, statusLabels, type DecayStatus } from '../../lib/decay'

interface Props {
  status: DecayStatus
  daysSince: number | null
  decayDays: number
}

export default function StatusBadge({ status, daysSince, decayDays }: Props) {
  const colors = statusColors[status]
  const label = statusLabels[status]

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${colors.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {label}
      {daysSince !== null ? (
        <span className="text-silver">({daysSince}/{decayDays}일)</span>
      ) : (
        <span className="text-silver">(미연습)</span>
      )}
    </span>
  )
}
