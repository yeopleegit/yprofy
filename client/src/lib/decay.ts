export type DecayStatus = 'fresh' | 'warming' | 'stale';

export function getDecayStatus(daysSince: number | null, decayDays: number): DecayStatus {
  if (daysSince === null) return 'stale';
  if (daysSince <= decayDays * 0.5) return 'fresh';
  if (daysSince <= decayDays) return 'warming';
  return 'stale';
}

export const statusColors: Record<DecayStatus, { text: string; dot: string }> = {
  fresh:   { text: 'text-graphite dark:text-pale',  dot: 'bg-[#12B76A]' },
  warming: { text: 'text-graphite dark:text-pale',  dot: 'bg-[#F59E0B]' },
  stale:   { text: 'text-graphite dark:text-pale',  dot: 'bg-[#E11D48]' },
};

export const statusLabels: Record<DecayStatus, string> = {
  fresh: '양호',
  warming: '주의',
  stale: '감소',
};
