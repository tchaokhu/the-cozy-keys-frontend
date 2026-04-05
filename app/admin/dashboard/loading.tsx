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

export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebarSkeleton />
      <main className="flex-1 p-8 space-y-8">
        <div className="skeleton h-8 w-40" />
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-5 space-y-3"
              style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="skeleton h-7 w-16" />
              <div className="skeleton h-3 w-24" />
            </div>
          ))}
        </div>
        {/* Table */}
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
          <div className="p-6 border-b" style={{ borderColor: 'rgba(196,98,45,0.08)' }}>
            <div className="skeleton h-5 w-40" />
          </div>
          <div className="divide-y p-2 space-y-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="skeleton h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-32" />
                  <div className="skeleton h-3 w-48" />
                </div>
                <div className="skeleton h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
