import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata = {
  title: 'Privacy Policy | The Cozy Keys',
  description: 'Privacy Policy for The Cozy Keys — นโยบายความเป็นส่วนตัว',
}

export default function PrivacyPage() {
  const lastUpdated = '18 เมษายน 2026'

  return (
    <>
      <Navbar />
      <div className="pt-16">
        <div className="px-6 lg:px-16 py-16" style={{ background: 'var(--cream-dark)' }}>
          <div className="max-w-4xl mx-auto">
            <div className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--terracotta)' }}>Privacy Policy</div>
            <h1 className="font-serif mb-2" style={{ fontSize: 'clamp(28px,4vw,48px)', color: 'var(--brown)' }}>
              นโยบาย<em style={{ color: 'var(--terracotta)', fontStyle: 'italic' }}>ความเป็นส่วนตัว</em>
            </h1>
            <p className="font-light" style={{ color: 'var(--text-light)' }}>อัปเดตล่าสุด: {lastUpdated}</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 lg:px-16 py-16">
          {/* Thai version */}
          <section className="mb-16">
            <h2 className="font-serif text-2xl font-semibold mb-6" style={{ color: 'var(--brown)' }}>ภาษาไทย</h2>
            <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-dark)' }}>
              <p>
                The Cozy Keys (&ldquo;เรา&rdquo;) ให้บริการเว็บไซต์ <strong>thecozykeys.com</strong> สำหรับให้ข้อมูลทรัพย์ให้เช่าในพื้นที่ศรีราชา แหลมฉบัง และชลบุรี
                เอกสารฉบับนี้อธิบายว่าเราเก็บข้อมูลใดบ้าง ใช้อย่างไร และผู้ใช้มีสิทธิ์อะไรเกี่ยวกับข้อมูลของตนเอง
              </p>

              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--brown)' }}>1. ข้อมูลที่เราเก็บ</h3>
                <ul className="list-disc pl-6 space-y-1.5">
                  <li><strong>ข้อมูลติดต่อ</strong> — ชื่อ เบอร์โทร อีเมล และข้อความ ที่คุณส่งผ่านแบบฟอร์มติดต่อหรือสอบถามทรัพย์</li>
                  <li><strong>ข้อมูลการนัดหมาย</strong> — วันที่ที่คุณต้องการนัดชมทรัพย์</li>
                  <li><strong>ข้อมูลผู้ดูแลระบบ</strong> — อีเมลและรหัสผ่านสำหรับเข้าระบบหลังบ้าน (เก็บผ่าน Supabase Auth)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--brown)' }}>2. วัตถุประสงค์การใช้ข้อมูล</h3>
                <ul className="list-disc pl-6 space-y-1.5">
                  <li>ติดต่อกลับเพื่อให้ข้อมูลทรัพย์และนัดหมาย</li>
                  <li>บริหารจัดการรายการทรัพย์ในระบบหลังบ้าน</li>
                  <li>โพสต์ประชาสัมพันธ์ทรัพย์ของเราไปยัง Facebook Page ของบริษัท</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--brown)' }}>3. การเชื่อมต่อกับ Facebook</h3>
                <p>
                  ระบบหลังบ้านของเราเชื่อมต่อกับ Facebook Graph API เพื่อโพสต์เนื้อหาทรัพย์ไปยัง Facebook Page ของเราเองเท่านั้น
                  เราไม่เก็บหรือเข้าถึงข้อมูลผู้ใช้ Facebook คนอื่น และไม่ใช้ permission ใด ๆ นอกเหนือจาก <code>pages_manage_posts</code> และ <code>pages_read_engagement</code>
                  สำหรับโพสต์และอ่านสถิติของ Page ของเราเอง
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--brown)' }}>4. การเปิดเผยข้อมูลต่อบุคคลที่สาม</h3>
                <p>
                  เราไม่ขาย ไม่เช่า และไม่แลกเปลี่ยนข้อมูลส่วนบุคคลของคุณกับบุคคลที่สาม ยกเว้นผู้ให้บริการโครงสร้างพื้นฐานที่จำเป็น ได้แก่:
                </p>
                <ul className="list-disc pl-6 space-y-1.5 mt-2">
                  <li><strong>Supabase</strong> — ฐานข้อมูลและระบบ authentication</li>
                  <li><strong>Vercel</strong> — โฮสติ้งเว็บไซต์</li>
                  <li><strong>Meta (Facebook)</strong> — เฉพาะกรณีโพสต์ข้อมูลทรัพย์ไปยัง Page ของเรา</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--brown)' }}>5. ระยะเวลาเก็บข้อมูล</h3>
                <p>เราเก็บข้อมูลติดต่อไว้นานเท่าที่จำเป็นสำหรับการให้บริการ คุณสามารถขอให้ลบข้อมูลของคุณได้ตลอดเวลา</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--brown)' }}>6. สิทธิ์ของผู้ใช้</h3>
                <p>คุณมีสิทธิ์ขอ ดู แก้ไข หรือลบข้อมูลส่วนบุคคลของคุณได้ โดยติดต่อทางช่องทางด้านล่าง</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--brown)' }}>7. การติดต่อ</h3>
                <p>
                  หากมีคำถามเกี่ยวกับนโยบายนี้ หรือต้องการใช้สิทธิ์เกี่ยวกับข้อมูลของคุณ กรุณาติดต่อ:<br />
                  โทร: 087 670 6436 (K. Nut) / 098 091 5461 (K. Dear)<br />
                  LINE: @thecozykeys
                </p>
              </div>
            </div>
          </section>

          {/* English version */}
          <section>
            <h2 className="font-serif text-2xl font-semibold mb-6" style={{ color: 'var(--brown)' }}>English</h2>
            <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-dark)' }}>
              <p>
                The Cozy Keys (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates the website <strong>thecozykeys.com</strong>, providing rental property listings
                in Sriracha, Laem Chabang, and Chonburi, Thailand. This Privacy Policy explains what information we collect, how we use it, and your rights.
              </p>

              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--brown)' }}>1. Information We Collect</h3>
                <ul className="list-disc pl-6 space-y-1.5">
                  <li><strong>Contact information</strong> — name, phone, email, and messages you submit through inquiry/contact forms</li>
                  <li><strong>Appointment data</strong> — preferred viewing dates</li>
                  <li><strong>Admin credentials</strong> — email/password for backend access (managed by Supabase Auth)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--brown)' }}>2. How We Use Information</h3>
                <ul className="list-disc pl-6 space-y-1.5">
                  <li>To respond to inquiries and arrange property viewings</li>
                  <li>To manage internal property listings</li>
                  <li>To publish our own property listings to our company&apos;s Facebook Page</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--brown)' }}>3. Facebook Integration</h3>
                <p>
                  Our admin backend uses the Facebook Graph API solely to publish content to our own Facebook Page. We do not collect or access
                  data of other Facebook users. The only permissions used are <code>pages_manage_posts</code> and <code>pages_read_engagement</code>,
                  scoped exclusively to our own Page.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--brown)' }}>4. Third-Party Disclosure</h3>
                <p>We do not sell, rent, or trade your personal information. We use the following infrastructure providers:</p>
                <ul className="list-disc pl-6 space-y-1.5 mt-2">
                  <li><strong>Supabase</strong> — database and authentication</li>
                  <li><strong>Vercel</strong> — website hosting</li>
                  <li><strong>Meta (Facebook)</strong> — only when publishing property listings to our own Page</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--brown)' }}>5. Data Retention</h3>
                <p>We retain contact data for as long as necessary to provide our services. You may request deletion at any time.</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--brown)' }}>6. Your Rights</h3>
                <p>You have the right to access, correct, or delete your personal data. Contact us using the details below.</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--brown)' }}>7. Contact</h3>
                <p>
                  For questions or data requests:<br />
                  Phone: +66 87 670 6436 (K. Nut) / +66 98 091 5461 (K. Dear)<br />
                  LINE: @thecozykeys
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  )
}
