import type { TrainingProgramType } from '../../shared/hooks/useTrainingPrograms'

export const PROGRAM_TYPE_OPTIONS: { value: TrainingProgramType; label: string }[] = [
  { value: 'course', label: 'វគ្គសិក្សា' },
  { value: 'event', label: 'ព្រឹត្តិការណ៍' },
  { value: 'workshop', label: 'សិទ្ធិបណ្តុះបណ្តាល' },
]

export function programTypeLabel(type: TrainingProgramType): string {
  return PROGRAM_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
}

export function toIsoOrNull(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function fromIsoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
