import Navbar from '@/components/layout/Navbar'

export default function PropertyDetailLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <Navbar />
      <div className="pt-16">

        {/* Breadcrumb */}
        <div className="px-6 lg:px-16 py-5" style={{ borderBottom: '1px solid rgba(196,98,45,0.1)' }}>
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <div className="skeleton h-3 w-12 rounded" />
            <div className="skeleton h-3 w-2 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-3 w-2 rounded" />
            <div className="skeleton h-3 w-36 rounded" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-16 py-12">

          {/* Back link */}
          <div className="skeleton h-3 w-40 rounded mb-8" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* LEFT — col-span-2 */}
            <div className="lg:col-span-2">

              {/* Main image */}
              <div className="mb-8">
                <div className="skeleton w-full rounded-2xl" style={{ height: 360 }} />
                {/* Thumbnail strip */}
                <div className="flex gap-2 mt-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton rounded-xl shrink-0" style={{ width: 80, height: 60 }} />
                  ))}
                </div>
              </div>

              {/* Title + price row */}
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="space-y-2">
                  <div className="skeleton h-5 w-24 rounded-full" />
                  <div className="skeleton h-8 w-72" />
                  <div className="skeleton h-3 w-48" />
                </div>
                <div className="space-y-1 text-right">
                  <div className="skeleton h-8 w-36" />
                  <div className="skeleton h-3 w-12 ml-auto" />
                </div>
              </div>

              {/* Key specs */}
              <div className="grid grid-cols-3 gap-4 p-5 rounded-2xl mb-8" style={{ background: 'var(--cream-dark)' }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="skeleton h-4 w-4 rounded" />
                    <div className="skeleton h-4 w-20" />
                    <div className="skeleton h-3 w-14" />
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="mb-8 space-y-2">
                <div className="skeleton h-5 w-24 mb-3" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-4/5" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-3/5" />
              </div>

              {/* Amenities */}
              <div>
                <div className="skeleton h-5 w-40 mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton h-4 rounded" style={{ width: `${60 + (i % 3) * 20}%` }} />
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — contact form */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl p-6 border" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.12)' }}>
                <div className="skeleton h-6 w-28 mb-2" />
                <div className="skeleton h-3 w-48 mb-6" />

                <div className="flex flex-col gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i}>
                      <div className="skeleton h-3 w-28 rounded mb-1.5" />
                      <div className="skeleton h-11 w-full rounded-xl" />
                    </div>
                  ))}
                  {/* Date */}
                  <div>
                    <div className="skeleton h-3 w-24 rounded mb-1.5" />
                    <div className="skeleton h-11 w-full rounded-xl" />
                  </div>
                  {/* Textarea */}
                  <div>
                    <div className="skeleton h-3 w-32 rounded mb-1.5" />
                    <div className="skeleton w-full rounded-xl" style={{ height: 84 }} />
                  </div>
                  {/* Submit */}
                  <div className="skeleton h-12 w-full rounded-xl" />
                  {/* Phone / LINE */}
                  <div className="flex gap-2 pt-2">
                    <div className="skeleton h-10 flex-1 rounded-xl" />
                    <div className="skeleton h-10 flex-1 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
