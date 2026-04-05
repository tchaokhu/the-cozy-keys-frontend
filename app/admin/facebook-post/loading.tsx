export default function FacebookPostLoading() {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      {/* Sidebar skeleton */}
      <aside className="w-64 shrink-0 border-r flex flex-col"
        style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)', minHeight: '100vh' }}>
        <div className="p-6 border-b" style={{ borderColor: 'rgba(196,98,45,0.1)' }}>
          <div className="skeleton h-5 w-32 mb-1.5" />
          <div className="skeleton h-3 w-20" />
        </div>
        <nav className="p-4 flex flex-col gap-1 flex-1">
          {[80, 100, 80, 108].map((w, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="skeleton w-4 h-4 rounded" />
              <div className="skeleton h-3 rounded" style={{ width: w }} />
            </div>
          ))}
        </nav>
      </aside>

      {/* Property list skeleton */}
      <div className="w-72 shrink-0 border-r flex flex-col"
        style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'rgba(196,98,45,0.08)' }}>
          <div className="skeleton h-5 w-24 mb-3" />
          <div className="skeleton h-9 w-full rounded-xl" />
        </div>
        <div className="p-2 flex flex-col gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-3 py-3 rounded-xl">
              <div className="skeleton h-4 w-4/5 mb-2" />
              <div className="flex justify-between">
                <div className="skeleton h-3 w-28" />
                <div className="skeleton h-5 w-14 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel skeleton */}
      <div className="flex-1 p-8">
        <div className="max-w-2xl">
          {/* Property summary */}
          <div className="rounded-2xl p-4 mb-6 flex items-center gap-4 border"
            style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}>
            <div className="skeleton w-14 h-14 rounded-xl shrink-0" />
            <div className="flex-1">
              <div className="skeleton h-4 w-48 mb-2" />
              <div className="skeleton h-3 w-64" />
            </div>
            <div className="skeleton h-5 w-20" />
          </div>

          {/* Form fields */}
          <div className="rounded-2xl border p-6 mb-6"
            style={{ background: 'white', borderColor: 'rgba(196,98,45,0.1)' }}>
            <div className="skeleton h-5 w-28 mb-5" />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <div className="skeleton h-3 w-32 mb-1.5" />
                <div className="skeleton h-10 w-full rounded-xl" />
              </div>
              <div className="col-span-2">
                <div className="skeleton h-3 w-32 mb-1.5" />
                <div className="skeleton h-10 w-full rounded-xl" />
              </div>
              {[1, 2, 3, 4].map(i => (
                <div key={i}>
                  <div className="skeleton h-3 w-28 mb-1.5" />
                  <div className="skeleton h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
            {[120, 96, 120].map((h, i) => (
              <div key={i} className="mb-4">
                <div className="skeleton h-3 w-36 mb-1.5" />
                <div className="skeleton w-full rounded-xl" style={{ height: h }} />
              </div>
            ))}
          </div>

          {/* Generate button */}
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
