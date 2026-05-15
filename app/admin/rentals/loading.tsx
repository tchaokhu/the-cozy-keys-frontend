function AdminSidebarSkeleton() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 border-r flex-col"
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

export default function RentalsLoading() {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebarSkeleton />
      <main className="flex-1 p-8 pt-20 md:pt-24 space-y-6">
        <div className="skeleton h-7 w-36" />
        <div className="flex gap-3">
          <div className="skeleton h-10 flex-1 max-w-md rounded-xl" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-24 rounded-xl" />
          ))}
        </div>
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-5 border-b" style={{ borderColor: 'rgba(196,98,45,0.06)' }}>
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-3 w-28" />
              </div>
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-6 w-20 rounded-full" />
              <div className="skeleton h-7 w-7" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
