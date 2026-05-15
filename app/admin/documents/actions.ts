'use server'
import { getServerSupabase, requireAdmin } from '@/lib/supabase-server'

export async function getDocumentSignedUrl(
  id: string,
  format: 'pdf' | 'docx',
  forceDownload = false
): Promise<{ url: string; fileName: string; mimeType: string; disposition: 'inline' | 'attachment' }> {
  await requireAdmin()
  const supabase = getServerSupabase()
  const { data: row, error } = await supabase
    .from('document_templates')
    .select('pdf_storage_path, pdf_file_name, docx_storage_path, docx_file_name')
    .eq('id', id)
    .single()
  if (error || !row) throw new Error('ไม่พบเอกสาร')

  const storagePath = format === 'pdf' ? row.pdf_storage_path : row.docx_storage_path
  const fileName = format === 'pdf' ? row.pdf_file_name : row.docx_file_name
  if (!storagePath || !fileName) throw new Error('Document variant not available')

  const mimeType =
    format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

  // PDF preview = inline (no download param). All other cases = attachment with original filename.
  const asAttachment = forceDownload || format === 'docx'

  const { data, error: signErr } = await supabase.storage
    .from('document-templates')
    .createSignedUrl(storagePath, 60, {
      download: asAttachment ? fileName : undefined,
    })
  if (signErr || !data) throw new Error(signErr?.message ?? 'สร้าง signed URL ไม่สำเร็จ')

  return {
    url: data.signedUrl,
    fileName,
    mimeType,
    disposition: asAttachment ? 'attachment' : 'inline',
  }
}
