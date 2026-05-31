'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { PageHeader } from '../../../../components/layout'
import TrainingProgramForm, {
  type TrainingProgramFormState,
} from '../../_components/TrainingProgramForm'
import { fromIsoToLocalInput } from '../../_components/trainingProgramUtils'
import { apiFetch } from '../../../shared/api'
import {
  useTrainingPrograms,
  type TrainingProgram,
  type TrainingProgramInput,
} from '../../../shared/hooks/useTrainingPrograms'

function toFormState(program: TrainingProgram): TrainingProgramFormState {
  const highlights =
    Array.isArray(program.highlights) && program.highlights.length > 0
      ? program.highlights
      : ['']

  return {
    title: program.title,
    program_type: program.program_type,
    description: program.description ?? '',
    event_start_at: fromIsoToLocalInput(program.event_start_at),
    event_end_at: fromIsoToLocalInput(program.event_end_at),
    location: program.location ?? '',
    instructor: program.instructor ?? '',
    highlights,
    cta_label: program.cta_label ?? 'សួរព័ត៌មាន',
    cta_url: program.cta_url ?? '/contact',
    is_published: program.is_published,
    sort_order: program.sort_order ?? 0,
  }
}

export default function EditTrainingProgramPage() {
  const router = useRouter()
  const params = useParams()
  const programId = typeof params.id === 'string' ? params.id : ''
  const { updateProgram } = useTrainingPrograms()
  const [program, setProgram] = useState<TrainingProgram | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!programId) {
      setIsLoading(false)
      router.push('/dashboard/training-programs')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const response = await apiFetch(`/api/training-programs?id=${programId}`)
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch training program')
        }
        if (!cancelled) setProgram(result.data as TrainingProgram)
      } catch {
        if (!cancelled) router.push('/dashboard/training-programs')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [programId, router])

  const handleSubmit = async (payload: TrainingProgramInput) => {
    setIsSaving(true)
    try {
      const ok = await updateProgram(programId, payload)
      if (ok) router.push('/dashboard/training-programs')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !program) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="កែប្រែវគ្គបណ្តុះបណ្តាល"
        showBackButton
        backHref="/dashboard/training-programs"
      />

      <div className="max-w-4xl mx-auto mt-6">
        <TrainingProgramForm
          initial={toFormState(program)}
          existingCoverUrl={program.cover_url}
          isSaving={isSaving}
          submitLabel="រក្សាទុក"
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dashboard/training-programs')}
        />
      </div>
    </>
  )
}
