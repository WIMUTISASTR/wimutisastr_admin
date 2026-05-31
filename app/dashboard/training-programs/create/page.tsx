'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '../../../components/layout'
import TrainingProgramForm, {
  type TrainingProgramFormState,
} from '../_components/TrainingProgramForm'
import { useTrainingPrograms, type TrainingProgramInput } from '../../shared/hooks/useTrainingPrograms'

const defaultForm: TrainingProgramFormState = {
  title: '',
  program_type: 'course',
  description: '',
  event_start_at: '',
  event_end_at: '',
  location: '',
  instructor: '',
  highlights: [''],
  cta_label: 'សួរព័ត៌មាន',
  cta_url: '/contact',
  is_published: false,
  sort_order: 0,
}

export default function CreateTrainingProgramPage() {
  const router = useRouter()
  const { createProgram } = useTrainingPrograms()
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (payload: TrainingProgramInput) => {
    setIsSaving(true)
    try {
      const ok = await createProgram(payload)
      if (ok) router.push('/dashboard/training-programs')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="បង្កើតវគ្គបណ្តុះបណ្តាល"
        showBackButton
        backHref="/dashboard/training-programs"
      />

      <div className="max-w-4xl mx-auto mt-6">
        <TrainingProgramForm
          initial={defaultForm}
          isSaving={isSaving}
          submitLabel="បង្កើតវគ្គ"
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dashboard/training-programs')}
        />
      </div>
    </>
  )
}
