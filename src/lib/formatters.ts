import { differenceInMonths, parseISO } from 'date-fns'

export function formatPlantAge(date: string | null): string | null {
  if (!date) return null
  const totalMonths = differenceInMonths(new Date(), parseISO(date))
  if (totalMonths < 1) return 'Less than 1 month'
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`
  if (months === 0) return `${years} yr${years !== 1 ? 's' : ''}`
  return `${years} yr${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`
}

export function formatTenure(date: string | null): string | null {
  if (!date) return null
  const totalMonths = differenceInMonths(new Date(), parseISO(date))
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years === 0) return `${months} month${months !== 1 ? 's' : ''} with us`
  if (months === 0) return `${years} yr${years !== 1 ? 's' : ''} with us`
  return `${years} yr${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''} with us`
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function splitPipe(value: string | null): string[] {
  if (!value) return []
  return value.split('|').map(s => s.trim()).filter(Boolean)
}
