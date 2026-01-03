interface LoadingSkeletonProps {
  rows?: number
  columns?: number
  type?: 'table' | 'card' | 'stats'
}

export default function LoadingSkeleton({ rows = 5, columns = 4, type = 'table' }: LoadingSkeletonProps) {
  if (type === 'stats') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
                <div className="h-8 bg-slate-200 rounded w-16"></div>
              </div>
              <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'card') {
    return (
      <div className="space-y-4">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  // Table skeleton
  return (
    <div className="overflow-x-auto">
      <div className="animate-pulse">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <div className="flex gap-4">
            {[...Array(columns)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-200 rounded flex-1"></div>
            ))}
          </div>
        </div>
        {/* Rows */}
        {[...Array(rows)].map((_, rowIndex) => (
          <div key={rowIndex} className="border-b border-slate-200 px-6 py-4">
            <div className="flex gap-4">
              {[...Array(columns)].map((_, colIndex) => (
                <div key={colIndex} className="h-4 bg-slate-200 rounded flex-1"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

