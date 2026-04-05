'use client'
import { useRef, useState } from 'react'
import { Upload, Plus, X, GripVertical, ChevronUp, ChevronDown, Image as ImageIcon } from 'lucide-react'
import { uploadPropertyImage } from '@/lib/supabase'

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
  const remove = (i: number) => onChange(images.filter((_, idx) => idx !== i))

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
      <div className="flex gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all shrink-0 disabled:opacity-60"
          style={{ borderColor: 'rgba(196,98,45,0.2)', color: 'var(--terracotta)', background: 'rgba(196,98,45,0.05)' }}>
          <Upload size={15} /> {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูป'}
        </button>
        <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUrl())}
          placeholder="หรือวาง URL รูปภาพ..."
          className="flex-1 px-4 py-2.5 rounded-xl text-sm border outline-none"
          style={{ background: 'white', borderColor: 'rgba(196,98,45,0.2)', color: 'var(--text-dark)' }} />
        <button type="button" onClick={addUrl}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium shrink-0"
          style={{ background: 'var(--terracotta)', color: 'white' }}>
          <Plus size={15} />
        </button>
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
          <p className="text-xs">ลากรูปมาวาง หรือกด "อัปโหลดรูป"</p>
        </div>
      ) : (
        <div className="space-y-2">
          {images.map((url, i) => (
            <div key={url + i}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragEnd={onDragEnd}
              onDragOver={e => onDragOver(e, i)}
              onDrop={() => onDrop(i)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl border transition-all"
              style={{
                borderColor: dragOver === i ? 'var(--terracotta)' : 'rgba(196,98,45,0.12)',
                background: dragOver === i ? 'rgba(196,98,45,0.04)' : 'white',
                opacity: dragIndex === i ? 0.4 : 1,
                cursor: 'grab',
              }}>

              {/* Drag handle */}
              <GripVertical size={14} style={{ color: 'var(--text-light)', flexShrink: 0 }} />

              {/* Thumbnail */}
              <div className="w-12 h-10 rounded-lg overflow-hidden shrink-0 border"
                style={{ borderColor: 'rgba(196,98,45,0.1)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              </div>

              {/* URL */}
              <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-mid)' }}>{url}</span>

              {/* Order badge */}
              <span className="text-xs font-medium w-5 text-center shrink-0" style={{ color: 'var(--text-light)' }}>
                {i + 1}
              </span>

              {/* Up / Down */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button type="button" onClick={() => i > 0 && move(i, i - 1)} disabled={i === 0}
                  className="p-0.5 rounded disabled:opacity-20 transition-opacity"
                  style={{ color: 'var(--text-light)' }}>
                  <ChevronUp size={13} />
                </button>
                <button type="button" onClick={() => i < images.length - 1 && move(i, i + 1)} disabled={i === images.length - 1}
                  className="p-0.5 rounded disabled:opacity-20 transition-opacity"
                  style={{ color: 'var(--text-light)' }}>
                  <ChevronDown size={13} />
                </button>
              </div>

              {/* Remove */}
              <button type="button" onClick={() => remove(i)} className="shrink-0 p-1 rounded-lg transition-colors"
                style={{ color: 'var(--text-light)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#A32D2D')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-light)')}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--text-light)' }}>
          ลากเพื่อเรียงลำดับ · รูปแรกจะใช้เป็นรูปปก
        </p>
      )}
    </div>
  )
}
