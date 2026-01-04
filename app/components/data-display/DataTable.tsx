import { ReactNode } from 'react'
import LoadingSkeleton from '../feedback/LoadingSkeleton'
import { EmptyState } from '../ui'

interface Column {
  header: string
  accessor: string
  render?: (value: any, row: any) => ReactNode
  width?: string
}

interface DataTableProps {
  columns: Column[]
  data: any[]
  isLoading?: boolean
  emptyMessage?: string
  emptyDescription?: string
  emptyIcon?: ReactNode
  onRowClick?: (row: any) => void
  striped?: boolean
  hoverable?: boolean
}

export default function DataTable({ 
  columns, 
  data, 
  isLoading = false, 
  emptyMessage = 'No data available',
  emptyDescription,
  emptyIcon,
  onRowClick,
  striped = false,
  hoverable = true
}: DataTableProps) {
  if (isLoading) {
    return <LoadingSkeleton rows={5} columns={columns.length} type="table" />
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon || (
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
        title={emptyMessage}
        description={emptyDescription}
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  style={{ width: column.width }}
                  className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {data.map((row, rowIndex) => (
              <tr 
                key={row.id || rowIndex} 
                className={`
                  transition-colors
                  ${striped && rowIndex % 2 === 1 ? 'bg-slate-50' : 'bg-white'}
                  ${hoverable ? 'hover:bg-slate-100' : ''}
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 text-sm text-slate-900">
                    {column.render
                      ? column.render(row[column.accessor], row)
                      : row[column.accessor] || <span className="text-slate-400">-</span>}
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

