'use client'
import { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export type Column<T> = {
  key: string
  label: string
  sortable?: boolean
  headerAlign?: 'left' | 'center' | 'right'
  cellAlign?: 'left' | 'center' | 'right'
  render: (row: T) => ReactNode
  skeleton?: ReactNode
}

export type AdminTableProps<T> = {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string
  loading?: boolean
  skeletonRows?: number
  sortKey?: string | null
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  renderActions?: (row: T) => ReactNode
  actionsSkeleton?: ReactNode
  page?: number
  perPage?: number
  total?: number
  onPageChange?: (page: number) => void
  headerVariant?: 'terracotta' | 'cream'
  minWidth?: number
  className?: string
}

const alignToTextClass = (a: 'left' | 'center' | 'right') =>
  a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left'

export default function AdminTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  skeletonRows = 6,
  sortKey,
  sortDir = 'asc',
  onSort,
  renderActions,
  actionsSkeleton,
  page,
  perPage,
  total,
  onPageChange,
  headerVariant = 'terracotta',
  minWidth,
  className = '',
}: AdminTableProps<T>) {
  const isTerracotta = headerVariant === 'terracotta'
  const headerBg = isTerracotta ? 'var(--terracotta)' : 'var(--cream)'
  const headerColor = isTerracotta ? '#fff' : 'var(--text-light)'
  const headerBorder = isTerracotta
    ? '2px solid rgba(196,98,45,0.12)'
    : '1px solid rgba(196,98,45,0.08)'
  const headerTextClass = isTerracotta
    ? 'text-xs font-semibold uppercase tracking-wider'
    : 'text-xs font-medium'

  const showPagination = !!(
    page && perPage && total !== undefined && onPageChange && total > perPage
  )
  const totalPages = showPagination ? Math.max(1, Math.ceil(total! / perPage!)) : 1
  const startIdx = page && perPage ? (page - 1) * perPage + 1 : 0
  const endIdx = page && perPage && total !== undefined ? Math.min(page * perPage, total) : 0

  return (
    <div
      className={`rounded-2xl border overflow-hidden ${className}`}
      style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full" style={minWidth ? { minWidth } : undefined}>
          <thead>
            <tr style={{ borderBottom: headerBorder, background: headerBg }}>
              {columns.map(col => {
                const align = col.headerAlign ?? 'left'
                const isSortable = !!(col.sortable && onSort)
                const isActive = sortKey === col.key
                return (
                  <th
                    key={col.key}
                    className={`${alignToTextClass(align)} px-5 py-3.5 ${headerTextClass} ${
                      isSortable ? 'select-none transition-colors' : ''
                    }`}
                    style={{ color: headerColor, cursor: isSortable ? 'pointer' : undefined }}
                    onClick={isSortable ? () => onSort!(col.key) : undefined}
                  >
                    {isSortable ? (
                      <span
                        className={`inline-flex items-center gap-1.5 ${
                          align === 'center' ? 'justify-center' : ''
                        }`}
                      >
                        {col.label}
                        {isActive ? (
                          sortDir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                        ) : (
                          <ArrowUpDown size={13} className="opacity-50" />
                        )}
                      </span>
                    ) : (
                      col.label
                    )}
                  </th>
                )
              })}
              {renderActions && <th className="px-5 py-3.5" style={{ background: headerBg }} />}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="border-b" style={{ borderColor: 'rgba(196,98,45,0.06)' }}>
                  {columns.map(col => (
                    <td key={col.key} className="px-5 py-4">
                      {col.skeleton ?? <div className="skeleton h-4 w-24" />}
                    </td>
                  ))}
                  {renderActions && (
                    <td className="px-5 py-4">
                      {actionsSkeleton ?? (
                        <div className="flex gap-2">
                          <div className="skeleton h-7 w-7 rounded-lg" />
                          <div className="skeleton h-7 w-7 rounded-lg" />
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              data.map(row => (
                <tr
                  key={rowKey(row)}
                  className="border-b transition-colors"
                  style={{ borderColor: 'rgba(196,98,45,0.06)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,240,232,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {columns.map(col => {
                    const align = col.cellAlign ?? 'left'
                    return (
                      <td key={col.key} className={`px-5 py-4 ${alignToTextClass(align)}`}>
                        {col.render(row)}
                      </td>
                    )
                  })}
                  {renderActions && (
                    <td className="px-5 py-4">
                      <div className="flex gap-2">{renderActions(row)}</div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showPagination && (
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: '1px solid rgba(196,98,45,0.08)' }}
        >
          <p className="text-xs" style={{ color: 'var(--text-light)' }}>
            แสดง {startIdx}–{endIdx} จาก {total} รายการ
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange!(Math.max(1, page! - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border transition-colors disabled:opacity-30"
              style={{
                borderColor: 'rgba(196,98,45,0.15)',
                color: 'var(--text-mid)',
                background: 'white',
              }}
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => onPageChange!(p)}
                className="w-9 h-9 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: p === page ? 'var(--terracotta)' : 'white',
                  color: p === page ? 'white' : 'var(--text-mid)',
                  border: p === page ? 'none' : '1px solid rgba(196,98,45,0.15)',
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => onPageChange!(Math.min(totalPages, page! + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border transition-colors disabled:opacity-30"
              style={{
                borderColor: 'rgba(196,98,45,0.15)',
                color: 'var(--text-mid)',
                background: 'white',
              }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
