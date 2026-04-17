'use client'
import { useState, useEffect, useCallback, DragEvent } from 'react'
import { ChevronLeft, ChevronRight, Clock, Trash2, GripVertical, Facebook, Eye, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react'
import { getScheduledPosts, updateScheduledPost, deleteScheduledPost } from '@/lib/supabase'
import { fetchFacebookScheduledPosts, fetchFacebookPublishedPosts } from '@/app/admin/facebook-post/actions'
import type { ScheduledPost } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const MONTHS_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  planned: { label: 'วางแผน', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  scheduled: { label: 'ตั้งเวลาแล้ว', color: '#854F0B', bg: 'rgba(239,159,39,0.15)' },
  published: { label: 'โพสต์แล้ว', color: '#0F6E56', bg: 'rgba(135,168,120,0.15)' },
  failed: { label: 'ผิดพลาด', color: '#A32D2D', bg: 'rgba(226,75,74,0.15)' },
  fb_scheduled: { label: 'FB ตั้งเวลา', color: '#1877F2', bg: 'rgba(24,119,242,0.1)' },
  fb_published: { label: 'FB เผยแพร่แล้ว', color: '#42B72A', bg: 'rgba(66,183,42,0.1)' },
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isToday(year: number, month: number, day: number) {
  const t = new Date()
  return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day
}

function isPast(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dateStr) < today
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [fbErrors, setFbErrors] = useState<string[]>([])

  const fetchPosts = useCallback(async () => {
    try {
      // Build date range for published posts (current month ± buffer)
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0)
      const since = Math.floor(monthStart.getTime() / 1000).toString()
      const until = Math.floor(monthEnd.getTime() / 1000 + 86400).toString()

      // Fetch local DB, FB scheduled, and FB feed in parallel
      const [localPosts, fbScheduledResult, fbFeedResult] = await Promise.all([
        getScheduledPosts(),
        fetchFacebookScheduledPosts(),
        fetchFacebookPublishedPosts(since, until),
      ])

      // Collect any FB errors to display in UI
      const errors: string[] = []
      if (fbScheduledResult.error) errors.push(fbScheduledResult.error)
      if (fbFeedResult.error) errors.push(fbFeedResult.error)
      setFbErrors(errors)

      const fbScheduled = fbScheduledResult.posts
      const fbFeed = fbFeedResult.posts

      // Deduplicate: skip FB posts already tracked locally
      const localFbIds = new Set(localPosts.map(p => p.fb_post_id).filter(Boolean))

      const convertFbPost = (fb: typeof fbScheduled[0], status: ScheduledPost['status']): ScheduledPost => {
        // scheduled_publish_time from Graph API is a Unix timestamp (number)
        // created_time is an ISO 8601 string
        let postTime: Date
        if (fb.scheduled_publish_time) {
          const ts = typeof fb.scheduled_publish_time === 'number'
            ? fb.scheduled_publish_time
            : parseInt(fb.scheduled_publish_time, 10)
          postTime = !isNaN(ts) && ts > 1e9 ? new Date(ts * 1000) : new Date(fb.scheduled_publish_time)
        } else {
          postTime = new Date(fb.created_time || Date.now())
        }

        // Extract images from attachments
        const images: string[] = []
        if (fb.attachments?.data) {
          for (const att of fb.attachments.data) {
            if (att.media?.image?.src) images.push(att.media.image.src)
            if (att.subattachments?.data) {
              for (const sub of att.subattachments.data) {
                if (sub.media?.image?.src) images.push(sub.media.image.src)
              }
            }
          }
        }

        return {
          id: `fb_${fb.id}`,
          property_id: '',
          post_content_th: fb.message || '',
          post_content_en: '',
          scheduled_date: postTime.toISOString().split('T')[0],
          scheduled_time: postTime.toTimeString().slice(0, 5),
          images,
          status,
          fb_post_id: fb.id,
          created_at: fb.created_time || new Date().toISOString(),
        } as ScheduledPost
      }

      const scheduledIds = new Set(fbScheduled.map(fb => fb.id))

      const fbScheduledConverted = fbScheduled
        .filter(fb => !localFbIds.has(fb.id))
        .map(fb => convertFbPost(fb, 'fb_scheduled'))

      const fbPublishedConverted = fbFeed
        .filter(fb => !localFbIds.has(fb.id))
        .filter(fb => !scheduledIds.has(fb.id)) // skip duplicates with scheduled
        .map(fb => convertFbPost(fb, 'fb_published'))

      setPosts([...localPosts, ...fbScheduledConverted, ...fbPublishedConverted])
    } catch (e) {
      console.error('Failed to fetch scheduled posts:', e)
      setFbErrors([`เกิดข้อผิดพลาด: ${e instanceof Error ? e.message : String(e)}`])
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    setLoading(true)
    fetchPosts()
  }, [fetchPosts])

  // ── Navigation ──
  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()) }

  // ── Calendar grid ──
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const prevMonthDays = getDaysInMonth(year, month === 0 ? 11 : month - 1)

  // Build 6-row grid
  const cells: { day: number; currentMonth: boolean; dateStr: string }[] = []
  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    cells.push({ day: d, currentMonth: false, dateStr: formatDate(y, m, d) })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true, dateStr: formatDate(year, month, d) })
  }
  // Next month leading days
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    cells.push({ day: d, currentMonth: false, dateStr: formatDate(y, m, d) })
  }

  // Group posts by date
  const postsByDate: Record<string, ScheduledPost[]> = {}
  posts.forEach(p => {
    if (!postsByDate[p.scheduled_date]) postsByDate[p.scheduled_date] = []
    postsByDate[p.scheduled_date].push(p)
  })

  // ── Drag & Drop ──
  const handleDragStart = (e: DragEvent, postId: string) => {
    setDragId(postId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', postId)
  }

  const handleDragOver = (e: DragEvent, dateStr: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dropTarget !== dateStr) setDropTarget(dateStr)
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = async (e: DragEvent, dateStr: string) => {
    e.preventDefault()
    setDropTarget(null)
    const postId = dragId || e.dataTransfer.getData('text/plain')
    if (!postId) return
    setDragId(null)

    const post = posts.find(p => p.id === postId)
    if (!post || post.scheduled_date === dateStr) return
    if (!canDrag(post)) return // can't move published or FB-only posts

    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, scheduled_date: dateStr } : p
    ))

    try {
      await updateScheduledPost(postId, { scheduled_date: dateStr })
    } catch (err) {
      console.error('Failed to reschedule:', err)
      // Revert
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, scheduled_date: post.scheduled_date } : p
      ))
      alert('ย้ายโพสต์ไม่สำเร็จ')
    }
  }

  const handleDragEnd = () => {
    setDragId(null)
    setDropTarget(null)
  }

  // ── Delete ──
  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteScheduledPost(deleteId)
      setPosts(prev => prev.filter(p => p.id !== deleteId))
      if (selectedPost?.id === deleteId) setSelectedPost(null)
    } catch (e) {
      alert('ลบไม่สำเร็จ: ' + (e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'))
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const isFbOnly = (post: ScheduledPost) => post.id.startsWith('fb_')
  const canDrag = (post: ScheduledPost) => !isFbOnly(post) && post.status !== 'published'

  // ── Count by status for header ──
  const counts = {
    planned: posts.filter(p => p.status === 'planned').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
    fb_scheduled: posts.filter(p => p.status === 'fb_scheduled').length,
    fb_published: posts.filter(p => p.status === 'fb_published').length,
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cream)' }}>
      <AdminSidebar />

      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 overflow-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--brown)' }}>
              ปฏิทินโพสต์
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {Object.entries(counts).map(([key, count]) => {
                const s = STATUS_STYLE[key]
                return count > 0 ? (
                  <span key={key} className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: s.bg, color: s.color }}>
                    {s.label} {count}
                  </span>
                ) : null
              })}
              <a href="https://business.facebook.com/latest/content_calendar"
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-opacity hover:opacity-80"
                style={{ background: 'rgba(24,119,242,0.08)', color: '#1877F2', border: '1px solid rgba(24,119,242,0.12)' }}>
                <Facebook size={11} />
                FB Planner
                <ExternalLink size={10} />
              </a>
            </div>
          </div>

          {/* Month nav */}
          <div className="flex items-center gap-2">
            <button onClick={goToday}
              className="px-3 py-2 rounded-xl text-sm font-medium border transition-all"
              style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-mid)', background: 'white' }}>
              วันนี้
            </button>
            <button onClick={prevMonth}
              className="p-2 rounded-xl border transition-all"
              style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-mid)', background: 'white' }}>
              <ChevronLeft size={18} />
            </button>
            <div className="font-serif font-semibold text-lg min-w-[180px] text-center" style={{ color: 'var(--brown)' }}>
              {MONTHS_TH[month]} {year + 543}
            </div>
            <button onClick={nextMonth}
              className="p-2 rounded-xl border transition-all"
              style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-mid)', background: 'white' }}>
              <ChevronRight size={18} />
            </button>
            <button onClick={() => { setLoading(true); fetchPosts() }}
              className="p-2 rounded-xl border transition-all ml-1"
              style={{ borderColor: 'rgba(196,98,45,0.15)', color: 'var(--text-mid)', background: 'white' }}
              title="รีเฟรชข้อมูล">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* FB connection errors */}
        {fbErrors.length > 0 && (
          <div className="rounded-xl border px-4 py-3 mb-4 text-sm"
            style={{ background: 'rgba(220,38,38,0.05)', borderColor: 'rgba(220,38,38,0.15)', color: '#991b1b' }}>
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium mb-1">Facebook API Error</div>
                {fbErrors.map((err, i) => (
                  <div key={i} className="text-xs opacity-80">{err}</div>
                ))}
                <div className="text-xs mt-2 opacity-60">
                  ตรวจสอบ FACEBOOK_PAGE_ID (ต้องเป็นตัวเลข เช่น 123456789) และ FACEBOOK_PAGE_ACCESS_TOKEN ใน .env.local
                </div>
              </div>
              <button onClick={() => { setLoading(true); fetchPosts() }}
                className="p-1.5 rounded-lg transition-colors hover:bg-red-50" title="ลองอีกครั้ง">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Skeleton calendar */}
            <div className="flex-1">
              <div className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="grid grid-cols-7">
                  {DAYS_TH.map((d, i) => (
                    <div key={i} className="py-3 text-center text-xs font-medium"
                      style={{ color: i === 0 ? '#dc2626' : 'var(--text-light)', background: 'var(--cream)' }}>
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="min-h-[90px] md:min-h-[110px] border-t border-r p-1.5"
                      style={{ borderColor: 'rgba(196,98,45,0.06)' }}>
                      <div className="skeleton h-4 w-4 rounded-full mb-2" />
                      {i % 5 === 0 && <div className="skeleton h-5 w-full rounded-lg mb-1" />}
                      {i % 7 === 2 && <div className="skeleton h-5 w-full rounded-lg mb-1" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Skeleton detail panel */}
            <div className="w-full lg:w-80 shrink-0">
              <div className="rounded-2xl border p-5" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                <div className="skeleton h-5 w-36 rounded mb-4" />
                <div className="skeleton h-20 w-full rounded-xl mb-4" />
                <div className="skeleton h-4 w-48 rounded mb-2" />
                <div className="skeleton h-3 w-32 rounded" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Calendar grid */}
            <div className="flex-1">
              <div className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                {/* Day headers */}
                <div className="grid grid-cols-7">
                  {DAYS_TH.map((d, i) => (
                    <div key={i} className="py-3 text-center text-xs font-medium"
                      style={{ color: i === 0 ? '#dc2626' : 'var(--text-light)', background: 'var(--cream)' }}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {cells.map((cell, i) => {
                    const cellPosts = postsByDate[cell.dateStr] || []
                    const today = cell.currentMonth && isToday(year, month, cell.day)
                    const isSunday = i % 7 === 0
                    const past = isPast(cell.dateStr) && !today

                    return (
                      <div
                        key={i}
                        className="min-h-[90px] md:min-h-[110px] border-t border-r p-1.5 transition-colors"
                        style={{
                          borderColor: 'rgba(196,98,45,0.06)',
                          background: dropTarget === cell.dateStr
                            ? 'rgba(196,98,45,0.08)'
                            : today
                              ? 'rgba(196,98,45,0.04)'
                              : 'transparent',
                          opacity: cell.currentMonth ? 1 : 0.35,
                        }}
                        onDragOver={e => handleDragOver(e, cell.dateStr)}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, cell.dateStr)}
                      >
                        {/* Day number */}
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${today ? 'text-white' : ''}`}
                            style={{
                              color: today ? 'white' : isSunday ? '#dc2626' : past ? 'var(--text-light)' : 'var(--text-mid)',
                              background: today ? 'var(--terracotta)' : 'transparent',
                            }}
                          >
                            {cell.day}
                          </span>
                          {cellPosts.length > 0 && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(196,98,45,0.1)', color: 'var(--terracotta)' }}>
                              {cellPosts.length}
                            </span>
                          )}
                        </div>

                        {/* Post cards */}
                        <div className="space-y-1">
                          {cellPosts.slice(0, 3).map(post => {
                            const s = STATUS_STYLE[post.status] || STATUS_STYLE.planned
                            const isDragging = dragId === post.id
                            const draggable = canDrag(post)
                            const fbOnly = isFbOnly(post)
                            // Show property title, or first line of FB message
                            const label = post.property?.title
                              || (post.post_content_th ? post.post_content_th.split('\n').find(l => l.trim() && !l.startsWith('─'))?.replace(/^[🔑✨📍💰☎️💬🏢🏠🏊]+ ?/, '') : null)
                              || 'โพสต์ FB'
                            return (
                              <div
                                key={post.id}
                                draggable={draggable}
                                onDragStart={e => draggable ? handleDragStart(e, post.id) : e.preventDefault()}
                                onDragEnd={handleDragEnd}
                                onClick={() => setSelectedPost(post)}
                                className="group flex items-center gap-1 px-1.5 py-1 rounded-lg text-[11px] leading-tight transition-all cursor-pointer"
                                style={{
                                  background: s.bg,
                                  color: s.color,
                                  opacity: isDragging ? 0.4 : 1,
                                  border: `1px solid ${s.color}22`,
                                }}
                              >
                                {fbOnly && (
                                  <Facebook size={9} className="shrink-0" />
                                )}
                                {draggable && (
                                  <GripVertical size={10} className="shrink-0 opacity-0 group-hover:opacity-60 cursor-grab" />
                                )}
                                <span className="truncate font-medium">
                                  {label}
                                </span>
                              </div>
                            )
                          })}
                          {cellPosts.length > 3 && (
                            <div className="text-[10px] text-center" style={{ color: 'var(--text-light)' }}>
                              +{cellPosts.length - 3} เพิ่มเติม
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Detail panel */}
            <div className="w-full lg:w-80 shrink-0">
              <div className="rounded-2xl border p-5 sticky top-8"
                style={{ background: 'white', borderColor: 'rgba(196,98,45,0.08)' }}>
                {selectedPost ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-serif font-semibold flex items-center gap-2" style={{ color: 'var(--brown)' }}>
                        {isFbOnly(selectedPost) && <Facebook size={16} style={{ color: '#1877F2' }} />}
                        รายละเอียดโพสต์
                      </h3>
                      <div className="flex items-center gap-1">
                        {selectedPost.fb_post_id && (
                          <a href={`https://facebook.com/${selectedPost.fb_post_id}`}
                            target="_blank" rel="noreferrer"
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: '#1877F2' }}
                            title="ดูบน Facebook">
                            <Facebook size={15} />
                          </a>
                        )}
                        {!isFbOnly(selectedPost) && (
                          <button onClick={() => setDeleteId(selectedPost.id)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--text-light)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* FB source badge */}
                    {isFbOnly(selectedPost) && (
                      <div className="rounded-xl px-3 py-2 mb-4 text-xs font-medium flex items-center gap-2"
                        style={{ background: 'rgba(24,119,242,0.06)', color: '#1877F2', border: '1px solid rgba(24,119,242,0.15)' }}>
                        <Facebook size={12} /> ดึงจาก Facebook Page ({selectedPost.status === 'fb_published' ? 'Published Post' : 'Scheduled Post'})
                      </div>
                    )}

                    {/* Property info */}
                    {selectedPost.property && (
                      <div className="rounded-xl p-3 mb-4" style={{ background: 'var(--cream)' }}>
                        <div className="font-medium text-sm mb-1" style={{ color: 'var(--brown)' }}>
                          {selectedPost.property.title}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-light)' }}>
                          {selectedPost.property.district} · ฿{selectedPost.property.price_monthly.toLocaleString()}/เดือน
                        </div>
                        {selectedPost.property.images?.[0] && (
                          <img src={selectedPost.property.images[0]} alt=""
                            className="w-full h-28 object-cover rounded-lg mt-2" />
                        )}
                      </div>
                    )}

                    {/* Status */}
                    {(() => {
                      const s = STATUS_STYLE[selectedPost.status] || STATUS_STYLE.planned
                      return (
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ background: s.bg, color: s.color }}>{s.label}</span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-light)' }}>
                            <Clock size={12} />
                            {selectedPost.scheduled_date} {selectedPost.scheduled_time}
                          </span>
                        </div>
                      )
                    })()}

                    {/* Images count */}
                    {selectedPost.images && selectedPost.images.length > 0 && (
                      <div className="flex gap-1.5 mb-3 flex-wrap">
                        {selectedPost.images.slice(0, 4).map((img, i) => (
                          <img key={i} src={img} alt=""
                            className="w-12 h-12 rounded-lg object-cover border"
                            style={{ borderColor: 'rgba(196,98,45,0.1)' }} />
                        ))}
                        {selectedPost.images.length > 4 && (
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xs font-medium"
                            style={{ background: 'var(--cream)', color: 'var(--text-light)' }}>
                            +{selectedPost.images.length - 4}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Post preview */}
                    <div>
                      <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
                        ตัวอย่างโพสต์
                      </div>
                      <div className="rounded-xl p-3 text-xs leading-relaxed max-h-60 overflow-y-auto font-mono"
                        style={{ background: 'var(--cream)', color: 'var(--text-dark)', whiteSpace: 'pre-wrap' }}>
                        {selectedPost.post_content_th || selectedPost.post_content_en || '(ไม่มีเนื้อหา)'}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10">
                    <Eye size={32} style={{ color: 'rgba(196,98,45,0.2)', margin: '0 auto 12px' }} />
                    <div className="text-sm font-medium mb-1" style={{ color: 'var(--brown)' }}>
                      เลือกโพสต์เพื่อดูรายละเอียด
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-light)' }}>
                      คลิกที่โพสต์ในปฏิทิน หรือลากเพื่อเปลี่ยนวัน
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete confirm dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => !deleting && setDeleteId(null)}>
          <div className="rounded-2xl p-6 w-80 shadow-xl"
            style={{ background: 'white' }}
            onClick={e => e.stopPropagation()}>
            <h2 className="font-serif text-lg font-bold mb-2" style={{ color: 'var(--brown)' }}>
              ยืนยันการลบ
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-mid)' }}>
              โพสต์นี้จะถูกลบออกจากปฏิทิน
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm border"
                style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-mid)' }}>
                ยกเลิก
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm text-white font-medium"
                style={{ background: '#dc2626', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'กำลังลบ...' : 'ลบโพสต์'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
