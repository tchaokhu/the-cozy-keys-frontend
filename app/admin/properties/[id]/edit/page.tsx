'use client'
import { useParams } from 'next/navigation'
import PropertyForm from '@/components/admin/PropertyForm'

export default function EditPropertyPage() {
  const params = useParams()
  return <PropertyForm mode="edit" propertyId={params.id as string} />
}
