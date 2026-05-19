import { ReactNode } from 'react'
import LoadingSkeleton from '../feedback/LoadingSkeleton'
import { EmptyState } from '../ui'

interface Column<T extends Record<string, unknown>> {
  header: string
  accessor: keyof T | string
  render?: (value: T[keyof T] | unknown, row: T) => ReactNode
  width?: string
}

type RowWithOptionalId = { id?: string | number }

interface DataTableProps<T extends RowWithOptionalId> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  emptyMessage?: string
  emptyDescription?: string
  emptyIcon?: ReactNode
  onRowClick?: (row: T) => void
  striped?: boolean
  hoverable?: boolean
}

export default function DataTable<T extends RowWithOptionalId>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data available',
  emptyDescription,
  emptyIcon,
  onRowClick,
  striped = false,
  hoverable = true,
}: DataTableProps<T>) {
  if (isLoading) {
    return <LoadingSkeleton rows={5} columns={columns.length} type="table" />
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={
          emptyIcon || (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          )
        }
        title={emptyMessage}
        description={emptyDescription}
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr className="bg-navy-50/80">
              {columns.map((column, index) => (
                <th
                  key={index}
                  style={{ width: column.width }}
                  scope="col"
                  className="px-5 py-3.5 text-left text-xs font-semibold text-navy-800 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, rowIndex) => (
              <tr
                key={row.id ?? rowIndex}
                className={`
                  transition-colors duration-150
                  ${striped && rowIndex % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}
                  ${hoverable ? 'hover:bg-slate-50' : ''}
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-5 py-4 text-sm text-slate-800">
                    {column.render
                      ? column.render(row[column.accessor as keyof T], row)
                      : (row[column.accessor as keyof T] as ReactNode) || (
                          <span className="text-slate-400">—</span>
                        )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
