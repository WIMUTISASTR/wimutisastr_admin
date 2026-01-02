'use client'

import { Book } from '../../shared/types'

interface BookDetailModalProps {
  book: Book | null
  isOpen: boolean
  onClose: () => void
  onEdit: (book: Book) => void
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export default function BookDetailModal({ book, isOpen, onClose, onEdit }: BookDetailModalProps) {
  if (!isOpen || !book) return null

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Book Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Cover Image */}
          {book.cover_url && (
            <div className="flex justify-center">
              <div className="w-48 h-64 rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg">
                <img
                  src={book.cover_url}
                  alt={`${book.title} cover`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Book Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Title</label>
              <p className="text-lg font-bold text-slate-800">{book.title}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Author</label>
              <p className="text-lg text-slate-800">{book.author}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Year</label>
              <p className="text-lg text-slate-800">{book.year}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Category</label>
              {book.category ? (
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                  {book.category.name}
                </span>
              ) : (
                <span className="text-gray-400 text-sm">No category</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">File Name</label>
              <p className="text-sm text-slate-700 break-all">{book.file_name}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">File Size</label>
              <p className="text-sm text-slate-700">{formatFileSize(book.file_size)}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Uploaded At</label>
              <p className="text-sm text-slate-700">
                {new Date(book.uploaded_at).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Book ID</label>
              <p className="text-xs text-gray-500 font-mono break-all">{book.id}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Description</label>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-slate-700 whitespace-pre-wrap">
                {book.description || 'No description available.'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <a
              href={book.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-center flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Book
            </a>
            <button
              onClick={() => {
                onClose()
                onEdit(book)
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Book
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

