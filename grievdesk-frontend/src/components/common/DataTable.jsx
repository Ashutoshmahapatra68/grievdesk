import React, { useState } from 'react'
import { Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'

export function DataTable({
  columns,
  data = [],
  loading = false,
  searchPlaceholder = 'Search records…',
  searchField,
  onRowClick,
  filterComponent,
  pageSize = 10,
  emptyMessage = 'No records found.',
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Client-side search if searchField provided or across all string fields
  const filteredData = data.filter((item) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()

    if (searchField && item[searchField]) {
      return String(item[searchField]).toLowerCase().includes(term)
    }

    return Object.values(item).some(
      (val) => typeof val === 'string' && val.toLowerCase().includes(term)
    )
  })

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const currentData = filteredData.slice(startIndex, startIndex + pageSize)

  return (
    <div className="bg-card border border-border/80 rounded-2xl shadow-card overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-border rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-muted-foreground"
          />
        </div>
        {filterComponent && (
          <div className="flex items-center gap-2">
            {filterComponent}
          </div>
        )}
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`px-4 py-3.5 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-4 py-4">
                      <div className="h-4 bg-slate-200/70 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : currentData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 text-slate-300" />
                    <p className="font-medium text-slate-600">{emptyMessage}</p>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="text-xs text-blue-600 hover:underline mt-1"
                      >
                        Clear search filter
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              currentData.map((row, rIdx) => (
                <tr
                  key={row.id || rIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/40'
                  }`}
                >
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className={`px-4 py-3.5 text-slate-700 ${col.className || ''}`}>
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && filteredData.length > 0 && (
        <div className="px-4 py-3 border-t border-border bg-slate-50/40 flex items-center justify-between text-xs text-muted-foreground">
          <p>
            Showing <span className="font-medium text-slate-700">{startIndex + 1}</span> to{' '}
            <span className="font-medium text-slate-700">
              {Math.min(startIndex + pageSize, filteredData.length)}
            </span>{' '}
            of <span className="font-medium text-slate-700">{filteredData.length}</span> records
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-border bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-border bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
