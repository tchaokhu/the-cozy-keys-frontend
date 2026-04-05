# 🏠 The Cozy Keys — Real Estate Platform

Next.js 14 + Supabase (PostgreSQL) + Tailwind CSS

## โครงสร้างไฟล์

```
cozy-keys/
├── app/
│   ├── page.tsx                    # Phase 1: Landing Page
│   ├── listings/
│   │   ├── page.tsx                # Phase 2: Listings + Filter
│   │   └── [id]/page.tsx           # Phase 3: Property Detail
│   ├── contact/page.tsx            # Phase 3: Contact Form
│   └── admin/
│       ├── dashboard/page.tsx      # Phase 4: Admin Overview
│       ├── properties/page.tsx     # Phase 4: Manage Properties
│       └── inquiries/page.tsx      # Phase 4: Manage Inquiries
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   └── ui/
│       └── PropertyCard.tsx
├── lib/
│   └── supabase.ts                 # Supabase client + mock data
├── types/
│   └── index.ts
├── supabase-schema.sql             # SQL สำหรับ setup DB
└── .env.local.example
```

## วิธี Setup

### 1. ติดตั้ง dependencies
```bash
npm install
```

### 2. Setup Supabase
1. ไปที่ [supabase.com](https://supabase.com) → New Project
2. ตั้งชื่อ project: `cozy-keys`
3. เข้า SQL Editor → copy/paste `supabase-schema.sql` แล้วรัน
4. ไปที่ Settings → API → copy URL และ anon key

### 3. ตั้งค่า Environment Variables
```bash
cp .env.local.example .env.local
```
แล้วแก้ไข `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx...
```

### 4. Run development server
```bash
npm run dev
```
เปิด [http://localhost:3000](http://localhost:3000)

## หน้าทั้งหมด

| URL | หน้า |
|-----|------|
| `/` | Landing Page |
| `/listings` | ทรัพย์ทั้งหมด + ตัวกรอง |
| `/listings/[id]` | รายละเอียดทรัพย์ + นัดชม |
| `/contact` | ติดต่อ |
| `/admin/dashboard` | Admin: ภาพรวม |
| `/admin/properties` | Admin: จัดการทรัพย์ |
| `/admin/inquiries` | Admin: การติดต่อ |

## Deploy

### Frontend → Vercel
```bash
npx vercel --prod
```
ใส่ environment variables ใน Vercel dashboard

### Backend API (ถ้าต้องการ .NET)
Push code ขึ้น GitHub → เชื่อม Railway → deploy อัตโนมัติ

## Brand Colors

| Color | Hex |
|-------|-----|
| Terracotta | `#C4622D` |
| Cream | `#F5F0E8` |
| Sage Green | `#87A878` |
| Warm Brown | `#6B4423` |

## ติดต่อ

- K. Nut: 087 670 6436
- K. Dear: 098 091 5461
- LINE: [lin.ee/ZhDShaPc](@thecozykeys)
