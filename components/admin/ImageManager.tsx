'use client'
import { useRef, useState } from 'react'
import { Upload, Plus, X, GripVertical, ChevronUp, ChevronDown, Image as ImageIcon, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react'
import { uploadPropertyImage, deletePropertyImage } from '@/lib/supabase'

interface Props {
  images: string[]
  onChange: (images: string[]) => void
}

export default function ImageManager({ images, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [urlInput, setUrlInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)


  // ── File upload ──────────────────────────────────────────────────────────
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadError('')
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(f => uploadPropertyImage(f))
      )
      onChange([...images, ...uploaded.filter(u => !images.includes(u))])
    } catch (e) {
      console.error('Upload failed', e)
      setUploadError('อัปโหลดไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── URL add ──────────────────────────────────────────────────────────────
  const addUrl = () => {
    const url = urlInput.trim()
    if (url && !images.includes(url)) {
      onChange([...images, url])
      setUrlInput('')
    }
  }

  // ── Remove ───────────────────────────────────────────────────────────────
  const remove = (i: number) => {
    deletePropertyImage(images[i]) // fire-and-forget: delete from Storage if applicable
    onChange(images.filter((_, idx) => idx !== i))
  }

  // ── Move up / down ───────────────────────────────────────────────────────
  const move = (from: number, to: number) => {
    const next = [...images]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  // ── Drag-and-drop reorder ────────────────────────────────────────────────
  const onDragStart = (i: number) => setDragIndex(i)
  const onDragEnd = () => { setDragIndex(null); setDragOver(null) }
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    setDragOver(i)
  }
  const onDrop = (i: number) => {
    if (dragIndex === null || dragIndex === i) return
    move(dragIndex, i)
    setDragIndex(null)
    setDragOver(null)
  }

  return (
    <div className="space-y-4">
      {/* Upload + URL row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all shrink-0 disabled:opacity-60"
          style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--terracotta)', background: 'rgba(196,98,45,0.05)' }}>
          <Upload size={15} /> {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูป'}
        </button>
        <div className="flex gap-2 flex-1 min-w-0">
          <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUrl())}
            placeholder="หรือวาง URL รูปภาพ..."
            className="flex-1 min-w-0 px-4 py-2.5 rounded-xl text-sm border outline-none"
            style={{ background: 'white', borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-dark)' }} />
          <button type="button" onClick={addUrl}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium shrink-0"
            style={{ background: 'var(--terracotta)', color: 'white' }}>
            <Plus size={15} />
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => handleFiles(e.target.files)} />

      {uploadError && (
        <p className="text-xs px-3 py-2 rounded-lg"
          style={{ color: '#A32D2D', background: 'rgba(226,75,74,0.06)' }}>
          {uploadError}
        </p>
      )}

      {/* Image list */}
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed gap-2"
          style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-light)' }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}>
          <ImageIcon size={28} style={{ opacity: 0.35 }} />
          <p className="text-xs">ลากรูปมาวาง หรือกด &quot;อัปโหลดรูป&quot;</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((url, i) => (
            <div key={url + i}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragEnd={onDragEnd}
              onDragOver={e => onDragOver(e, i)}
              onDrop={() => onDrop(i)}
              className="relative group rounded-xl overflow-hidden border transition-all"
              style={{
                borderColor: dragOver === i ? 'var(--terracotta)' : 'rgba(196,98,45,0.12)',
                opacity: dragIndex === i ? 0.4 : 1,
                cursor: 'grab',
                aspectRatio: '4/3',
              }}>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />

              {/* Order badge */}
              <span className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold"
                style={{ background: i === 0 ? 'var(--terracotta)' : 'rgba(0,0,0,0.5)', color: 'white' }}>
                {i + 1}
              </span>
              {i === 0 && (
                <span className="absolute top-2 left-10 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: 'var(--terracotta)', color: 'white' }}>
                  ปก
                </span>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button type="button" onClick={() => setPreviewIndex(i)}
                  className="p-2 rounded-full bg-white/90 hover:bg-white transition-colors"
                  style={{ color: 'var(--text-dark)' }}>
                  <ZoomIn size={16} />
                </button>
                <button type="button" onClick={() => remove(i)}
                  className="p-2 rounded-full bg-white/90 hover:bg-white transition-colors"
                  style={{ color: '#A32D2D' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Drag handle */}
              <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical size={16} style={{ color: 'white', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
              </div>

              {/* Move buttons */}
              <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {i > 0 && (
                  <button type="button" onClick={() => move(i, i - 1)}
                    className="p-1 rounded-full bg-white/90 hover:bg-white transition-colors"
                    style={{ color: 'var(--text-dark)' }}>
                    <ChevronLeft size={14} />
                  </button>
                )}
                {i < images.length - 1 && (
                  <button type="button" onClick={() => move(i, i + 1)}
                    className="p-1 rounded-full bg-white/90 hover:bg-white transition-colors"
                    style={{ color: 'var(--text-dark)' }}>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--text-light)' }}>
          ลากเพื่อเรียงลำดับ · คลิกรูปเพื่อดูเต็มจอ · รูปแรกจะใช้เป็นรูปปก
        </p>
      )}

      {/* Lightbox modal */}
      {previewIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewIndex(null)}>
          {/* Close */}
          <button type="button" onClick={() => setPreviewIndex(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            style={{ color: 'white' }}>
            <X size={24} />
          </button>

          {/* Counter */}
          <span className="absolute top-4 left-4 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {previewIndex + 1} / {images.length}
          </span>

          {/* Prev */}
          {previewIndex > 0 && (
            <button type="button"
              onClick={e => { e.stopPropagation(); setPreviewIndex(previewIndex - 1) }}
              className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              style={{ color: 'white' }}>
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Next */}
          {previewIndex < images.length - 1 && (
            <button type="button"
              onClick={e => { e.stopPropagation(); setPreviewIndex(previewIndex + 1) }}
              className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              style={{ color: 'white' }}>
              <ChevronRight size={28} />
            </button>
          )}

          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[previewIndex]} alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
