import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  breadcrumbs?: { label: string; href?: string }[]
}

export default function PageHeader({ title, description, action, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-4">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex mb-0" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="inline-flex items-center">
                {index > 0 && (
                  <svg className="w-4 h-4 text-slate-400 mx-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <span className={`text-sm ${index === breadcrumbs.length - 1 ? 'text-slate-700 font-medium' : 'text-slate-500 hover:text-slate-700'}`}>
                  {crumb.label}
                </span>
              </li>
            ))}
          </ol>
        </nav>
      )}
      
      <div className="flex justify-between items-start">        
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}


