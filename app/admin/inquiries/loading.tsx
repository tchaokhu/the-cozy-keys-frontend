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

export default function InquiriesLoading() {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebarSkeleton />
      <main className="flex-1 p-8 space-y-6">
        <div className="skeleton h-7 w-36" />
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-24 rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-5 flex gap-4"
              style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
              <div className="skeleton h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-3 w-64" />
                <div className="skeleton h-3 w-48" />
              </div>
              <div className="skeleton h-6 w-20 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
