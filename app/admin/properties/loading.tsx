function AdminSidebarSkeleton() {
  return (
    <aside className="w-64 shrink-0 border-r flex flex-col"
      style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)', minHeight: '100vh' }}>
      <div className="p-6 border-b" style={{ borderColor: 'rgba(196,98,45,0.1)' }}>
        <div className="skeleton h-5 w-32 mb-1.5" />
        <div className="skeleton h-3 w-20" />
      </div>
      <nav className="p-4 flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-10 w-full rounded-xl" />
        ))}
      </nav>
    </aside>
  )
}

export default function PropertiesLoading() {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebarSkeleton />
      <main className="flex-1 p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="skeleton h-7 w-36" />
            <div className="skeleton h-3 w-20" />
          </div>
          <div className="skeleton h-10 w-32 rounded-xl" />
        </div>
        {/* Toolbar */}
        <div className="flex gap-3">
          <div className="skeleton h-10 flex-1 rounded-xl" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-20 rounded-xl" />
          ))}
        </div>
        {/* Table */}
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
          <div className="skeleton h-10 w-full rounded-none" style={{ borderRadius: 0 }} />
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-48" />
                  <div className="skeleton h-3 w-32" />
                </div>
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-6 w-16 rounded-full" />
                <div className="skeleton h-6 w-12 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
