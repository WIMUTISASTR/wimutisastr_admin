'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '../../components/layout'
import { Card, Badge, Button, UIIcons } from '../../components/ui'
import { DataTable } from '../../components/data-display'
import { DeleteConfirmationModal } from '../../components/feedback'
import {
  useTrainingPrograms,
  TrainingProgram,
} from '../shared/hooks/useTrainingPrograms'
import { programTypeLabel } from './_components/trainingProgramUtils'

function formatProgramDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('km-KH', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TrainingProgramsPage() {
  const router = useRouter()
  const { programs, isLoading, deleteProgram } = useTrainingPrograms()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [programToDelete, setProgramToDelete] = useState<{ id: string; title: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const columns = [
    {
      header: 'វគ្គ',
      accessor: 'title',
      width: '28%',
      render: (value: unknown, row: TrainingProgram) => (
        <div>
          <div className="font-bold text-slate-900">{typeof value === 'string' ? value : row.title}</div>
          <div className="text-sm text-slate-600 mt-1 line-clamp-2">
            {row.description || 'គ្មានការពិពណ៌នា'}
          </div>
        </div>
      ),
    },
    {
      header: 'ប្រភេទ',
      accessor: 'program_type',
      width: '14%',
      render: (value: unknown) => (
        <Badge variant="info" size="sm">
          {programTypeLabel(value as TrainingProgram['program_type'])}
        </Badge>
      ),
    },
    {
      header: 'កាលបរិច្ឆេទ',
      accessor: 'event_start_at',
      width: '16%',
      render: (value: unknown) => (
        <div className="text-slate-900 text-sm">
          {typeof value === 'string' ? formatProgramDate(value) : '—'}
        </div>
      ),
    },
    {
      header: 'ទីតាំង',
      accessor: 'location',
      width: '14%',
      render: (value: unknown) => (
        <div className="text-sm text-slate-600 truncate">
          {typeof value === 'string' && value.trim() ? value : '—'}
        </div>
      ),
    },
    {
      header: 'ស្ថានភាព',
      accessor: 'is_published',
      width: '10%',
      render: (value: unknown) => (
        <Badge variant={value ? 'success' : 'warning'} size="sm">
          {value ? 'បង្ហាញ' : 'ព្រាង'}
        </Badge>
      ),
    },
    {
      header: 'សកម្មភាព',
      accessor: 'id',
      width: '12%',
      render: (_value: unknown, row: TrainingProgram) => (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push(`/dashboard/training-programs/edit/${row.id}`)}
            variant="secondary"
            size="sm"
            className="transform-none"
            aria-label="កែប្រែវគ្គ"
          >
            <UIIcons.Edit className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => {
              setProgramToDelete({ id: row.id, title: row.title })
              setDeleteModalOpen(true)
            }}
            variant="danger"
            size="sm"
            className="transform-none"
            aria-label="លុបវគ្គ"
          >
            <UIIcons.Delete className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="វគ្គបណ្តុះបណ្តាល"
        action={
          <Button onClick={() => router.push('/dashboard/training-programs/create')} size="md">
            <UIIcons.Plus className="w-5 h-5" />
            វគ្គថ្មី
          </Button>
        }
      />

      <p className="mt-2 text-sm text-slate-600 max-w-2xl">
        គ្រប់គ្រងវគ្គសិក្សា ព្រឹត្តិការណ៍ និងសិទ្ធិបណ្តុះបណ្តាល ដែលបង្ហាញនៅទំព័រ{' '}
        <span className="font-medium text-slate-800">វគ្គបណ្តុះបណ្តាល</span> លើគេហទំព័រ។
      </p>

      <div className="mt-6">
        <Card padding="none">
          <DataTable<TrainingProgram>
            columns={columns}
            data={programs}
            isLoading={isLoading}
            emptyMessage="មិនទាន់មានវគ្គបណ្តុះបណ្តាល"
            emptyDescription="បង្កើតវគ្គដំបូង រួចបើក «បង្ហាញ» ដើម្បីឱ្យអ្នកទស្សនាឃើញ"
            emptyIcon={
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            }
          />
        </Card>
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        onConfirm={async () => {
          if (!programToDelete) return
          try {
            setIsDeleting(true)
            await deleteProgram(programToDelete.id)
            setDeleteModalOpen(false)
            setProgramToDelete(null)
          } finally {
            setIsDeleting(false)
          }
        }}
        title="លុបវគ្គបណ្តុះបណ្តាល"
        message="តើអ្នកប្រាកដថាចង់លុបវគ្គនេះទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។"
        itemName={programToDelete?.title}
        isLoading={isDeleting}
      />
    </>
  )
}
