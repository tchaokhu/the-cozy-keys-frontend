-- ══════════════════════════════════════════════
--  The Cozy Keys — Supabase PostgreSQL Schema
--  วิธีใช้: Copy ไปรันใน Supabase SQL Editor
-- ══════════════════════════════════════════════

-- 1. Properties table
create table if not exists properties (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  title_en      text,
  description   text,
  price_monthly numeric not null,
  property_type text not null check (property_type in ('condo','house','townhome')),
  bedrooms      int not null default 1,
  bathrooms     int not null default 1,
  area_sqm      numeric,
  location      text,
  district      text,
  province      text default 'ชลบุรี',
  status        text not null default 'available'
                  check (status in ('available','reserved','rented')),
  images        text[] default '{}',
  amenities     text[] default '{}',
  contact_line  text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 2. Inquiries table
create table if not exists inquiries (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid references properties(id) on delete set null,
  name           text not null,
  phone          text not null,
  email          text,
  message        text,
  preferred_date date,
  status         text not null default 'new'
                   check (status in ('new','contacted','closed')),
  created_at     timestamptz default now()
);

-- 3. Indexes
create index if not exists idx_properties_status   on properties(status);
create index if not exists idx_properties_district on properties(district);
create index if not exists idx_inquiries_status    on inquiries(status);
create index if not exists idx_inquiries_created   on inquiries(created_at desc);

-- 4. Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_properties_updated_at
  before update on properties
  for each row execute function update_updated_at();

-- 5. Row Level Security (RLS)
alter table properties enable row level security;
alter table inquiries  enable row level security;

-- Public: anyone can read available properties
create policy "public_read_properties" on properties
  for select using (true);

-- Public: anyone can insert inquiries
create policy "public_insert_inquiries" on inquiries
  for insert with check (true);

-- Admin: full access (ใส่ email admin ของคีย์)
-- create policy "admin_all_properties" on properties
--   for all using (auth.email() = 'your-email@gmail.com');
-- create policy "admin_all_inquiries" on inquiries
--   for all using (auth.email() = 'your-email@gmail.com');

-- 6. Seed mock data
insert into properties (title, description, price_monthly, property_type, bedrooms, bathrooms, area_sqm, location, district, status, amenities) values
('Notting Hill Laemchabang-Sriracha', 'คอนโดพร้อมอยู่ บรรยากาศดี ใกล้นิคมฯ เฟอร์นิเจอร์ครบ ชั้น 8 วิวสระ', 12000, 'condo', 1, 1, 30, 'แหลมฉบัง-ศรีราชา', 'แหลมฉบัง', 'available', ARRAY['เฟอร์นิเจอร์ครบ','แอร์','ตู้เย็น','สระว่ายน้ำ','ฟิตเนส','รปภ. 24 ชม.']),
('The Zea Sriracha', 'คอนโดติดทะเล วิวสวย ใกล้ Big C ศรีราชา เฟอร์นิเจอร์ครบ', 15000, 'condo', 2, 1, 45, 'ศรีราชา', 'ศรีราชา', 'available', ARRAY['เฟอร์นิเจอร์ครบ','แอร์','วิวทะเล','สระว่ายน้ำ','ที่จอดรถ']),
('Stasia Condo Sriracha', 'คอนโดใหม่ใกล้โรงพยาบาลศรีราชา ตกแต่งสวย minimal', 13500, 'condo', 1, 1, 35, 'ศรีราชา', 'ศรีราชา', 'reserved', ARRAY['เฟอร์นิเจอร์ครบ','แอร์','สระว่ายน้ำ']),
('ทาวน์โฮม ศรีราชา ซอยสุขุมวิท', '3 ชั้น 3 ห้องนอน ใกล้โรงเรียนนานาชาติ ที่จอดรถ 2 คัน', 22000, 'townhome', 3, 2, 120, 'ศรีราชา ซอยสุขุมวิท', 'ศรีราชา', 'available', ARRAY['ที่จอดรถ 2 คัน','เครื่องซักผ้า','ครัวไทย']);
