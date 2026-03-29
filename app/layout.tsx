import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Cozy Keys | อสังหาฯ ให้เช่า ศรีราชา-แหลมฉบัง',
  description: 'ค้นหาคอนโด บ้าน ทาวน์โฮม ให้เช่าในศรีราชา แหลมฉบัง ชลบุรี ดูแลครบ จบในที่เดียว',
  keywords: ['คอนโดให้เช่า', 'ศรีราชา', 'แหลมฉบัง', 'ชลบุรี', 'บ้านเช่า'],
  openGraph: {
    title: 'The Cozy Keys',
    description: 'อสังหาฯ ให้เช่า ศรีราชา-แหลมฉบัง',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
