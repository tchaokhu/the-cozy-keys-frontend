import Navbar from '@/components/layout/Navbar'

function CardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
      <div className="skeleton h-52 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="flex gap-3 pt-1">
          <div className="skeleton h-3 w-14" />
          <div className="skeleton h-3 w-14" />
          <div className="skeleton h-3 w-14" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="skeleton h-5 w-24" />
          <div className="skeleton h-8 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export default function ListingsLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <Navbar />
      <div className="pt-16">

        {/* Header section */}
        <div className="px-6 lg:px-16 py-16" style={{ background: 'var(--cream-dark)' }}>
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="skeleton h-3 w-24 rounded-full" />
            <div className="skeleton h-10 w-64" />
            <div className="skeleton h-3 w-20" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-16 py-10">

          {/* Search + filter bar */}
          <div className="flex gap-3 mb-8">
            <div className="skeleton h-12 flex-1 rounded-xl" />
            <div className="skeleton h-12 w-28 rounded-xl" />
          </div>

          {/* District pills */}
          <div className="flex gap-2 mb-8">
            {[80, 64, 72, 60].map((w, i) => (
              <div key={i} className="skeleton h-9 rounded-full" style={{ width: `${w}px` }} />
            ))}
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
