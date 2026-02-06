'use client'

export default function PageSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-2" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
      </div>
      
      {/* Content skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {/* Table header */}
        <div className="flex gap-4 mb-6">
          <div className="h-10 bg-slate-200 rounded flex-1" />
          <div className="h-10 bg-slate-200 rounded w-32" />
        </div>
        
        {/* Table rows */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-12 bg-slate-200 rounded flex-1" />
              <div className="h-12 bg-slate-200 rounded w-24" />
              <div className="h-12 bg-slate-200 rounded w-24" />
              <div className="h-12 bg-slate-200 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
