'use server'
import { getServerSupabase, requireAdmin } from '@/lib/supabase-server'

export async function getRentalDocumentSignedUrl(
  id: string,
  forceDownload = false
): Promise<{ url: string; fileName: string; mimeType: string; disposition: 'inline' | 'attachment' }> {
  await requireAdmin()
  const supabase = getServerSupabase()
  const { data: row, error } = await supabase
    .from('rental_documents')
    .select('storage_path, file_name, mime_type')
    .eq('id', id)
    .single()
  if (error || !row) throw new Error('ไม่พบเอกสาร')

  const previewableInline = row.mime_type === 'application/pdf' || row.mime_type.startsWith('image/')
  const asAttachment = forceDownload || !previewableInline

  const { data, error: signErr } = await supabase.storage
    .from('rental-documents')
    .createSignedUrl(row.storage_path, 60, {
      download: asAttachment ? row.file_name : undefined,
    })
  if (signErr || !data) throw new Error(signErr?.message ?? 'สร้าง signed URL ไม่สำเร็จ')

  return {
    url: data.signedUrl,
    fileName: row.file_name,
    mimeType: row.mime_type,
    disposition: asAttachment ? 'attachment' : 'inline',
  }
}
