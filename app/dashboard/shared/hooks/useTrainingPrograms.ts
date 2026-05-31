import { useCallback } from 'react'
import useSWR from 'swr'
import { notify } from '@/lib/utils/notify'
import { apiFetch } from '../api'
import { fetcher, swrConfig } from '../swr-config'

export type TrainingProgramType = 'course' | 'event' | 'workshop'

export interface TrainingProgram {
  id: string
  title: string
  program_type: TrainingProgramType
  description: string | null
  cover_url: string | null
  event_start_at: string | null
  event_end_at: string | null
  location: string | null
  instructor: string | null
  highlights: string[]
  cta_label: string | null
  cta_url: string | null
  is_published: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

interface TrainingProgramsResponse {
  data: TrainingProgram[]
}

export type TrainingProgramInput = Partial<
  Omit<TrainingProgram, 'id' | 'created_at' | 'updated_at'>
>

interface UseTrainingProgramsReturn {
  programs: TrainingProgram[]
  isLoading: boolean
  error: string | null
  createProgram: (data: TrainingProgramInput) => Promise<boolean>
  updateProgram: (id: string, data: TrainingProgramInput) => Promise<boolean>
  deleteProgram: (id: string) => Promise<boolean>
  refetch: () => void
}

export function useTrainingPrograms(): UseTrainingProgramsReturn {
  const { data, error, isLoading, mutate } = useSWR<TrainingProgramsResponse>(
    '/api/training-programs',
    fetcher,
    {
      ...swrConfig,
      dedupingInterval: 2 * 60 * 1000,
    }
  )

  const programs = data?.data || []

  const createProgram = useCallback(
    async (programData: TrainingProgramInput): Promise<boolean> => {
      try {
        const response = await apiFetch('/api/training-programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(programData),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create training program')
        }

        notify.success('វគ្គបណ្តុះបណ្តាលត្រូវបានបង្កើតដោយជោគជ័យ!')
        mutate()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'បង្កើតវគ្គមិនជោគជ័យ។'
        console.error('Error creating training program:', err)
        notify.error(message)
        return false
      }
    },
    [mutate]
  )

  const updateProgram = useCallback(
    async (id: string, programData: TrainingProgramInput): Promise<boolean> => {
      try {
        const response = await apiFetch(`/api/training-programs?id=${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(programData),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update training program')
        }

        notify.success('វគ្គបណ្តុះបណ្តាលត្រូវបានធ្វើបច្ចុប្បន្នភាពដោយជោគជ័យ!')
        mutate()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'ធ្វើបច្ចុប្បន្នភាពវគ្គមិនជោគជ័យ។'
        console.error('Error updating training program:', err)
        notify.error(message)
        return false
      }
    },
    [mutate]
  )

  const deleteProgram = useCallback(
    async (programId: string): Promise<boolean> => {
      const previousData = data

      mutate(
        (current) => {
          if (!current) return current
          return {
            ...current,
            data: current.data.filter((p) => p.id !== programId),
          }
        },
        { revalidate: false }
      )

      try {
        const response = await apiFetch(`/api/training-programs?id=${programId}`, {
          method: 'DELETE',
        })

        const result = await response.json()

        if (!response.ok) {
          mutate(previousData, { revalidate: false })
          throw new Error(result.error || 'Failed to delete training program')
        }

        notify.success('វគ្គបណ្តុះបណ្តាលត្រូវបានលុបដោយជោគជ័យ!')
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'លុបវគ្គមិនជោគជ័យ។'
        console.error('Error deleting training program:', err)
        notify.error(message)
        return false
      }
    },
    [data, mutate]
  )

  const refetch = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    programs,
    isLoading: isLoading && !data,
    error: error?.message || null,
    createProgram,
    updateProgram,
    deleteProgram,
    refetch,
  }
}
