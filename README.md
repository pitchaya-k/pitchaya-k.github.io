# E-CMIS กิจกรรมที่ 7 — Prototype (เอกสารส่งต่อทีม Developer)

เอกสารนี้สรุปสิ่งที่ **ตรวจพบจากไฟล์ใน Prototype จริง** (โฟลเดอร์รากของโปรเจกต์ `pitchaya-k.github.io`) เพื่อใช้ประกอบการพัฒนาระบบจริง
ไม่ใช่เอกสารความต้องการ (Requirement) และไม่ใช่เอกสารออกแบบระบบ

> **วิธีอ่านเอกสารนี้** — ทุกหัวข้อแยกเนื้อหาเป็น 3 ประเภทชัดเจน
> - **[พฤติกรรมใน Prototype]** สิ่งที่ตรวจพบในโค้ดหรือหน้าจอ
> - **[ข้อเสนอแนะ]** ความเห็นของผู้จัดทำเอกสาร ไม่ใช่ข้อกำหนด
> - **[ต้องยืนยัน]** ข้อมูลที่ไฟล์ไม่ได้ระบุ ต้องถามผู้รับผิดชอบก่อนพัฒนา
>
> ข้อความ "ยังไม่พบข้อมูล/ต้องยืนยัน" หมายถึงค้นในไฟล์แล้วไม่พบ ไม่ได้แปลว่าไม่มี

---

## 0. ข้อควรรู้ก่อนอ่าน (สรุปสำคัญ)

1. **Prototype นี้ไม่ใช่ระบบจริง** และไม่มี Backend ของตัวเอง (ไม่พบ server code, API ที่เขียนเอง หรือ build/package file ในโฟลเดอร์ราก)
2. **แต่โค้ดฝั่งหน้าเว็บมีการเรียก Supabase โดยตรง** [พฤติกรรมใน Prototype] — พบการอ่านและเขียนตาราง `tbl_res_request`, `tbl_cmp_case`, `tbl_res_calendar*`, `tbl_res_attachment`, `tbl_res_request_event` ฯลฯ (รายละเอียดหัวข้อ 3.2) จึงไม่ใช่ mockup ล้วน การกดบางปุ่ม **อาจเขียนข้อมูลลงฐานข้อมูลภายนอกจริง** ถ้าเครื่องที่เปิดเข้าถึง Supabase ได้
3. URL และ publishable key ของ Supabase ถูก **ฝังในไฟล์ฝั่งหน้าเว็บ** (`assets/ecmis-app.js` และบางหน้า HTML) ไม่คัดลอกค่ามาไว้ในเอกสารนี้ [ต้องยืนยัน] ว่าเป็นฐานข้อมูลทดสอบหรือใช้งานจริง และตั้ง Row Level Security ไว้หรือไม่
4. **การเข้าสู่ระบบเป็นการจำลอง** — ตรวจเฉพาะว่า username อยู่ในรายชื่อ 10 บัญชี และรหัสผ่านไม่ว่าง ไม่มีการตรวจรหัสผ่านจริง (หัวข้อ 4)
5. **สถานะ branch:** `temp1` ถูก merge เข้า `main` แบบ fast-forward แล้ว (HEAD `0afb372`) จึงมีจอแบ่งสองฝั่ง (ฟอร์ม ↔ เอกสาร) และคำ "ปฏิเสธการรับ" อยู่ใน `main` ทั้งหมด ข้อความ "เฉพาะ temp1" ที่เหลือในเอกสารนี้ = ฟีเจอร์ที่เพิ่มใน commit `0afb372` (ตรวจแล้ว `assets/ecmis-livedoc.js` มีอยู่ และ 23 หน้า HTML โหลด livedoc)
6. **ยังไม่ได้กดทดสอบรายปุ่มของทุกหน้า** ผลลัพธ์ของปุ่มในหัวข้อ 7 จึงระบุตามโค้ดที่อ่านได้ การทดสอบ sync สองฝั่งในเบราว์เซอร์ที่เคยทำ ทำก่อน merge (บน `temp1`) และไม่ได้ทดสอบซ้ำหลัง merge

---

## 1. วัตถุประสงค์และขอบเขตของ Prototype

**วัตถุประสงค์ [พฤติกรรมใน Prototype / ตามชื่อหน้าและโค้ด]**
จำลองหน้าจอระบบ E-CMIS ของสำนักงาน ป.ป.ท. สำหรับ **กิจกรรมที่ 7** (หัวเรื่องหน้า `overall-flow.html` คือ "ภาพรวมกระบวนงาน กจ.7") ครอบคลุมการพิจารณาและมติคณะกรรมการ ได้แก่

| กลุ่มงาน | หน้าที่เกี่ยวข้อง |
|---|---|
| ไต่สวนเบื้องต้น (ในโค้ดเรียก procType `7.1`, รายงาน ปปท. ๒-๑๓) | `approval-review`, `chairman-agenda`, `subcommittee-screening`, `support-subcommittee`, `order` |
| ไต่สวนวินิจฉัยชี้มูล (`7.2`, รายงาน ปปท. ๖-๔๔) | `affairs-case-detail`, `affairs-opinion`, `resolution-72`, `ruling-report` |
| เรื่องทั่วไป / ข้อกฎหมาย / กิจการคณะกรรมการ (`7.3`) | `agenda`, `agenda-set`, `meeting-docs`, `board-resolution`, `resolution` |
| Dashboard | `dashboard`, `followup-dashboard` |
| ทะเบียน | `case-register`, `register`, `agenda-registry` |
| รายงานและเอกสาร | `meeting-report`, `ruling-report`, `dashboard` (ส่งออก Word/Excel/PDF/พิมพ์) |
| อื่นๆ | รายงานผล ม.38 (`m38-*`), หน้าสาธารณะ (`index`), เข้าสู่ระบบ (`login`) |

**นอกขอบเขตที่ตรวจพบ** [พฤติกรรมใน Prototype]
- ไม่พบหน้าจอสำหรับ กิจกรรมอื่น (เช่น กจ.5, กจ.8) นอกจากการอ้างถึงในข้อความ
- ไม่พบการเชื่อมระบบ e-Meeting, ระบบสารบรรณ, ThaID, ลายเซ็นดิจิทัล PKI จริง (รายละเอียดหัวข้อ 10)

**โฟลเดอร์ที่ไม่ได้อธิบายในเอกสารนี้**
- `A7-Option-A-03112026/`, `A7-Option-B-03112026/` — ชุดสำเนา Prototype แบบ Option A/B (มีไฟล์เพิ่ม เช่น `business-flow.html`, `report-07.html`) มี README ของตัวเอง
- `docs/`, `prototype/` (ภาพหน้าจอ), `commit-c64-summary/`, `graphify-out/` — เอกสารอ้างอิงและผลวิเคราะห์ ไม่ใช่โค้ดของระบบ

---

## 2. โครงสร้างโฟลเดอร์และวิธีเปิดใช้งาน

### 2.1 โครงสร้าง (ตรวจจากโฟลเดอร์จริง)

```
pitchaya-k.github.io/
├── *.html            หน้าจอ 52 ไฟล์ (รวมหน้า mock 10 ไฟล์)
├── assets/
│   ├── ecmis-app.js          แกนหลักของทุกหน้า (~9,700 บรรทัด: บทบาท สถานะ ข้อมูลจำลอง เมนู การเชื่อม Supabase)
│   ├── ecmis-model.js        CaseStore / StatusStore / RoundStore / SignatureStore
│   ├── ecmis-livedoc.js/.css กลไกจอแบ่งสองฝั่ง (เพิ่มใน commit 0afb372)
│   ├── agenda-registry-data.js, case-closure.js, saraban-no.js, resolution-split.js, ...
│   ├── dashboard-analytics-service.js / -chart-service.js / -export-service.js
│   ├── templates/            ไฟล์แม่แบบ .docx (คำสั่ง บันทึก รายงาน ระเบียบวาระ ฯลฯ)
│   ├── flow-samples.json    ข้อมูลตัวอย่างสำนวนต่อสถานะ (generatedAt 2026-10-28)
│   └── fonts/, pacc_logo.png, doc_logo.jpg
├── scripts/          สคริปต์ seed/backfill (.mjs, .py, .sh) ไม่ใช่ส่วนของหน้าเว็บ
├── prototype/        ภาพหน้าจอแยกตามบทบาท
├── docs/             เอกสารอ้างอิงกิจกรรม 7
└── .claude/launch.json   ตั้งค่า dev server
```

### 2.2 วิธีเปิด [พฤติกรรมใน Prototype]
- เป็นไฟล์ HTML/JS ล้วน ไม่มี build step
- ตั้งค่าใน `.claude/launch.json`: `python -m http.server 8765 --bind 127.0.0.1` → เปิด `http://127.0.0.1:8765/login.html`
- ทุกหน้าโหลด jQuery, Bootstrap, SweetAlert2, Supabase JS, Chart.js, mammoth, ฟอนต์ ฯลฯ จาก **CDN (ต้องต่ออินเทอร์เน็ต)** ยกเว้น `html2pdf.bundle.min.js` และฟอนต์บางส่วนที่อยู่ในโฟลเดอร์ `assets/`
- `index.html` และ `login.html` อ้างสคริปต์ `../cases.js` ซึ่ง **ไม่พบในโฟลเดอร์ระดับบน** (ตรวจแล้วไม่มี `../cases.js`) ที่เหลือที่อ้างนอกโฟลเดอร์คือ `../shared-auth.js`, `../shared-handoff.js`, `../shared-junctions.js` ก็ไม่พบเช่นกัน [ต้องยืนยัน] ว่าไฟล์เหล่านี้เป็นของระบบ hub ภายนอกหรือไม่ และหน้ารัน ได้โดยไม่มีไฟล์เหล่านี้หรือไม่

---

## 3. สิ่งที่ตรวจพบด้านเทคนิค

### 3.1 โครงสร้างหน้า (Shared shell)
[พฤติกรรมใน Prototype]
- ทุกหน้า (ยกเว้น `index`, `login`, `overall-flow`, `approval-review-mock-*`) เรียก `ECMIS.renderShell(...)` สร้าง Sidebar, Topbar, แจ้งเตือน
- `renderShell` ตรวจ `sessionStorage.ecmis_authed === '1'` ถ้าไม่ใช่จะ redirect ไป login
- ตรวจสิทธิ์เข้าหน้าด้วยตาราง `PAGE_PERMISSIONS` (หัวข้อ 4.3) ถ้าไม่มีสิทธิ์จะแสดง toast แล้ว redirect ไปหน้าแรกของบทบาท
- ข้อมูลสำนวนมาจาก 2 แหล่งซ้อนกัน: **(ก)** อาร์เรย์ `CASES` ข้อมูลจำลองใน `assets/ecmis-app.js` และ **(ข)** แถวจาก Supabase ที่แปลงด้วย `supabaseRowToCase()` แล้วแคชลง `localStorage/sessionStorage`
- สถานะสำนวนนิยามใน `STATUS` (พบ 49 สถานะ) พร้อม `TRANSITIONS` / `canTransition` (กติกาเปลี่ยนสถานะอยู่ในโค้ดฝั่งหน้าเว็บ)

### 3.2 การเชื่อม Supabase [พฤติกรรมใน Prototype — ตรวจจากโค้ดเท่านั้น]
ตารางที่พบการเรียกใช้ (จำนวนครั้งที่ปรากฏในโค้ด): `tbl_res_request` (~80), `tbl_cmp_case` (7), `tbl_res_attachment` (6), `tbl_res_calendar` (5), `tbl_res_calendar_item` (6), `tbl_res_calendar_item_case` (6), `tbl_res_accused_offense` (3), `tbl_res_request_event` (2), `tbl_res_calendar_item_history` (1), `tbl_res_calendar_item_qualifier` (1), `tbl_res_offense_basis` (1), `ecmis_notification_read_receipt` (1), `public_case_status_view` (1)

หน้าที่มีการ **เขียน** (update/insert/upsert/delete) พบในโค้ด: `approval-review`, `review`, `affairs-case-detail`, `affairs-opinion`, `agenda`, `agenda-set`, `agenda-registry`, `board-resolution`, `resolution`, `resolution-72`, `ruling-report`, `order`, `order-m24`, `chairman-agenda`, `case-admin-inbox`, `case-admin-detail`, `case-register`, `register`, `dir-case-support-assign`, `meeting-report`, `resolution-inbox`, `subcommittee-screening`, `support-subcommittee`, `urgent-agenda` และไฟล์ `assets/agenda-registry-data.js`, `case-closure.js`, `saraban-no.js`

หน้าที่พบเฉพาะการ **อ่าน**: `inbox`, `chairman`, `subcommittee-inbox`, `support-subcommittee-inbox`, `followup-dashboard`, `dashboard` (ผ่าน `dashboard-analytics-service.js`), `index`

ข้อสังเกตเชิงพฤติกรรม
- เมื่อบันทึกสถานะ โค้ดเรียก `logRequestEvent(...)` เพิ่มแถวใน `tbl_res_request_event` (audit trail) แบบ best-effort — ถ้าล้มเหลวจะ log error แล้วไปต่อ ไม่หยุดผู้ใช้
- ถ้าโหลด Supabase JS ไม่ได้ `getSupabaseClient()` จะคืน `null` ส่วน `logRequestEvent` ข้ามการเรียกเมื่อ `sb` เป็น `null` แต่หลายหน้า (เช่น `approval-review.html`) เรียก `sb.from(...)` ตรงโดยไม่พบการตรวจ `null` ในไฟล์ จึง **ยังไม่ทราบพฤติกรรมของ Prototype เมื่อเชื่อม Supabase ไม่ได้** [ต้องยืนยัน / ยังไม่ได้ทดสอบโหมดออฟไลน์]
- `prototype/README.md` ระบุว่าตอนถ่ายภาพหน้าจอ มีการบล็อกคำขอเขียน Supabase ทุกคำขอ แปลว่าทีมจัดทำทราบว่าการเปิดจริงอาจเขียนข้อมูลได้

[ต้องยืนยัน] Supabase project นี้เป็นของใคร, เป็น staging หรือ production, schema/ข้อมูลในตารางเป็นข้อมูลจริงหรือทดสอบ, มี Row Level Security หรือไม่, และจะเปลี่ยน key ก่อนส่งมอบหรือไม่

### 3.3 การเก็บข้อมูลฝั่ง Browser
| Key | ที่เก็บ | ใช้ทำอะไร (ตามโค้ด) |
|---|---|---|
| `ecmis_authed`, `ecmis_role`, `ecmis_username` | sessionStorage | สถานะเข้าสู่ระบบและบทบาท |
| `ecmis_cases`, `ecmis_cases_version` | sessionStorage | สำเนา `CASES` ที่ถูกแก้ระหว่างใช้งาน (เวอร์ชัน `2026-10-05-0005-is-644`) |
| `ecmis_live_cases` | local + sessionStorage | แคชสำนวนที่ดึงจาก Supabase |
| `ecmis_rounds`, `ecmis_signatures` | sessionStorage | บันทึกรอบ และบันทึกการลงนาม (จำลอง) |
| `ecmis_subcommittee_team`, `ecmis_support_sub_group` | sessionStorage | คณะ/กลุ่มของบทบาทอนุกรรมการ |
| `ecmis_flash_toast` | sessionStorage | ข้อความแจ้งเตือนข้ามหน้า |
| `ecmis_color_mode`, `ecmis_dark_mode`, `ecmis_high_contrast`, `ecmis_font_step`, `ecmis_sidebar_collapsed`, `ecmis_managed_suggestions` | localStorage | การตั้งค่าการแสดงผล |
| `ecmis.livedoc.split`  | localStorage | สัดส่วนจอแบ่งสองฝั่ง |
| `ecmis_sso_for` + key ใน `login.html` (`SHARED_AUTH_KEY`) | local/sessionStorage | ข้อมูล "shared auth" สำหรับ hub ภายนอก |

ผลคือ **ข้อมูลที่ผู้ใช้แก้และไม่ได้เขียนลง Supabase จะหายเมื่อปิด Tab/Session** (sessionStorage)

### 3.4 การสร้างเอกสาร / ส่งออก [พฤติกรรมใน Prototype]
- หน้าเอกสาร (`.doc-paper` A4) มีปุ่ม "แก้ไขเอกสาร", "ส่งออก DOCX", "พิมพ์ A4", "ดูทีละหน้า / ดูทุกหน้าต่อเนื่อง"
- "ส่งออก DOCX" ทำงานฝั่ง browser (ฟังก์ชัน `exportDocToDocx` แปลง HTML ของหน้าเอกสารเป็นไฟล์ Word) ไม่ใช่การเติมแม่แบบ `.docx` บนเซิร์ฟเวอร์ [ต้องยืนยัน] คุณภาพไฟล์ที่ได้เทียบแม่แบบจริง
- บางหน้า (`order`, `order-m24`, `resolution`, `resolution-72`, `board-resolution`) `fetch` ไฟล์แม่แบบจาก `assets/templates/` เพื่อใช้เติมข้อมูล (ต้องเปิดผ่าน HTTP server ไม่ใช่ `file://`)
- `dashboard.html` มีปุ่ม Word / Excel / PDF / พิมพ์ ผ่าน `dashboard-export-service.js` และ `html2pdf.bundle.min.js`

### 3.5 กลไกจอแบ่งสองฝั่ง (Live-doc) (เพิ่มใน commit `0afb372`)
หน้าเอกสาร 23 หน้าในโฟลเดอร์รากมีฟอร์มด้านซ้ายและเอกสารด้านขวา โดยแก้ฝั่งใดฝั่งหนึ่งอีกฝั่งจะ sync (ใช้ `data-bind` + `assets/ecmis-livedoc.js`) มีแถบแบ่งลากปรับขนาดได้ และสถานะ sync ด้านล่าง
- ฟิลด์ข้อความ: แก้ในเอกสารได้โดยตรง
- ฟิลด์วันที่/ตัวเลือก/radio: คลิกในเอกสารเพื่อกระโดดไปยังช่องในฟอร์ม
- ขอบเขตที่ผูกแล้วและที่ยังไม่ผูก ดูหัวข้อ 10

---

## 4. บทบาทผู้ใช้และสิทธิ์

### 4.1 บัญชีที่เข้าสู่ระบบได้ (10 บัญชี, ตัวระบุ `LOGIN_ALLOWED_ROLE_IDS`)

| role id | ชื่อผู้ใช้ (login) | ตำแหน่งในข้อมูลจำลอง | หน้าแรกหลังเข้าสู่ระบบ |
|---|---|---|---|
| `deputy` | Prasert.T | รองเลขาธิการ | `inbox.html` |
| `secgen` | Apichat.S | เลขาธิการ | `inbox.html` |
| `support_sub` | Jiraporn.N | อนุกรรมการสนับสนุนเลขาธิการฯ | `support-subcommittee-inbox.html` |
| `subcommittee` | Sumet.N | อนุกรรมการกลั่นกรองฯ (ค่าเริ่มต้น คณะที่ 1) | `subcommittee-inbox.html` |
| `chairman` | Wichai.Y | ประธานกรรมการ ป.ป.ท. | `inbox.html` |
| `board_sec` | Thanakrit.B | กลุ่มงานวินิจฉัยและมติคณะกรรมการ | `agenda-registry.html` |
| `board` | Somboon.T | กรรมการ ป.ป.ท. | `board-inbox.html` |
| `affairs` | Siriporn.K | กลุ่มงานกิจการคณะกรรมการ | `inbox.html` |
| `case_admin` | Kannika.W | กลุ่มงานบริหารคดีและบริหารทั่วไป (กองบริหารคดี) | `case-admin-inbox.html` |
| `dir_case` | Bunlue.S | ผู้อำนวยการกองบริหารคดี | `inbox.html` |

ชื่อบุคคลในข้อมูลจำลองเป็นชื่อสมมติที่อยู่ในโค้ด [ต้องยืนยัน] ว่าไม่ตรงกับบุคคลจริง

### 4.2 การเข้าสู่ระบบ (`login.html`) [พฤติกรรมใน Prototype]
- แท็บ Username/Email: กรอกชื่อผู้ใช้ + รหัสผ่าน → รอ 1.1 วินาที → ถ้า username ตรงกับ 10 บัญชีข้างต้น (ไม่สนตัวพิมพ์) ตั้ง session แล้วไปหน้าแรกของบทบาท ถ้าไม่ตรงแจ้ง "ไม่พบผู้ใช้งานนี้ในระบบ"
- **ไม่ตรวจรหัสผ่านจริง** (ตรวจแค่ไม่ว่าง)
- ปุ่มลัด 10 ปุ่ม (ชื่อบทบาท + username) เข้าสู่ระบบทันทีโดยไม่ต้องกรอก
- แท็บ ThaID: มี UI QR และปุ่มเดโม (`btn-thaid-demo`) — **ไม่พบการเชื่อม ThaID จริง** ยังไม่ได้อ่านโค้ดแท็บนี้ทั้งหมด [ต้องยืนยัน]
- ลิงก์ "ลืมรหัสผ่าน" เปิดกล่องกรอกอีเมลแล้วแสดงข้อความสำเร็จ ไม่พบการส่งอีเมลจริง

### 4.3 สิทธิ์เข้าหน้า (`PAGE_PERMISSIONS` ใน `assets/ecmis-app.js`)
ตารางนี้ใช้ตัดสินว่าเปิดหน้าได้หรือไม่ เมื่อพิมพ์ URL ตรง ถ้าไม่มีสิทธิ์จะ redirect กลับหน้าแรกของบทบาท (ตรวจฝั่งหน้าเว็บเท่านั้น ใครแก้ sessionStorage ก็ข้ามได้)

หมายเหตุ: ในตารางมี role id ที่ **ไม่อยู่ในรายชื่อล็อกอิน** เช่น `owner`, `director`, `section_head`, `legal`, `admin`, `board_ex`, `sup_chair`, `sup_sec`, `sup_asst` [ต้องยืนยัน] ว่าเป็นบทบาทที่จะมีในระบบจริงหรือเป็นของเดิมที่เหลืออยู่ ตารางหัวข้อ 7 จึงแสดงเฉพาะ 10 บทบาทที่ล็อกอินได้

### 4.4 รายการสิทธิ์ (`perms`) ต่อบทบาทที่นิยามไว้ในโค้ด
| role id | perms ที่นิยามในโค้ด |
|---|---|
| deputy | view.all, download, deputy.opinion, return |
| secgen | view.all, download, sign.report213, decide.complex, sign.order24p1, approve.general, return |
| support_sub | view.assigned, download, support.opinion, support.certify, request.moreinfo |
| subcommittee | view.assigned, download, support.opinion, support.certify |
| chairman | view.all, download, order.agenda, sign.agenda, sign.order24p3, sign.ruling, vote, bypass.approve, return |
| board_sec | view.all, download, create.agenda, create.invite, record.minutes, lock.pdf, compile.minutes, doc.generate, dispatch.resolution |
| board | view.all, download, vote, read.agenda.advance |
| affairs | view.all, download, EDIT.MASTER, doc.generate, order24.draft, secrecy.set |
| case_admin | view.all, download, create.agenda, create.invite, record.minutes, doc.generate, dispatch.resolution |
| dir_case | view.assigned, download, urgent.endorse |

[ต้องยืนยัน] ความหมายและขอบเขตจริงของแต่ละ perm (ในโค้ดเป็นเพียงชื่อ ไม่มีเอกสารนิยามครบ)

---

## 5. ลำดับการใช้งานและการเปลี่ยนหน้าจอ

### 5.1 ลำดับหลัก [พฤติกรรมใน Prototype]
1. เปิด `index.html` (หน้าสาธารณะ) → ลิงก์ไป `login.html` — หรือเปิด `login.html` ตรง
2. เลือกบัญชี → ไปหน้าแรกตามบทบาท (ตาราง 4.1)
3. หน้าแรก (รายการ/inbox) → คลิกแถวสำนวนเข้าหน้ารายละเอียดตามสถานะ (หน้าเป้าหมายกำหนดจากสถานะสำนวน ในฟังก์ชันฝั่ง `ecmis-app.js` ยังไม่ได้ไล่ปลายทางของทุกสถานะ)
4. ทำรายการ (ความเห็น ลงนาม บันทึกมติ ฯลฯ) → ระบบบันทึก (ใน `CASES` และ/หรือ Supabase) แล้ว **ส่วนใหญ่กลับไปหน้าแรกของบทบาท** (เช่น `approval-review.html` เรียก `location.href = ECMIS.homeHref(role.id)` หลังบันทึก)
5. สลับบทบาทเพื่อดูขั้นถัดไปได้ 2 ทาง: **(ก)** ตัวเลือก "สิทธิ์การทำงาน" (`#a7RoleSelect`) ใน Topbar ของ shell — เปลี่ยนแล้วระบบตั้ง `ecmis_role` ใหม่และไปหน้าแรกของบทบาทนั้นทันที โดยไม่ต้องเข้าสู่ระบบใหม่ และ **(ข)** ออกจากระบบแล้วเข้าใหม่ (นอกจากนี้ `overall-flow.js` ตั้ง session ของบทบาทเองเมื่อคลิกกล่องในผัง)

[ต้องยืนยัน] ตัวสลับบทบาทใน Topbar เป็นเครื่องมือสำหรับ Prototype/ทดสอบ ไม่ควรมีในระบบจริง และต้องยืนยันว่าผู้ใช้จริงหนึ่งคนมีได้กี่บทบาท

### 5.2 ลิงก์ระหว่างหน้าที่ตรวจพบในโค้ด (ยืนยันจากไฟล์)
| จาก | ไป |
|---|---|
| `index.html` | `login.html` |
| `login.html` | `index.html` (และ anchor `#home`, `#channels`, `#stats`, `#riskmap`, `#news`, `#faq`, `#footer`) / หน้าแรกของบทบาท |
| `case-admin-inbox.html` | `case-admin-detail.html?case=<เลขสำนวน>` |
| `case-admin-detail.html` | `case-admin-inbox.html`, `subcommittee-screening.html?case=<เลขสำนวน>` |
| `support-subcommittee-inbox.html` | `support-subcommittee.html?case=<เลข>` และ `...&readonly=true` |
| `m38-inbox.html` | `m38-review.html?report=<เลขรายงาน>` |
| `m38-review.html` | `m38-inbox.html` |
| `board-inbox.html` | `board-detail.html?id=<id>` |
| `board-detail.html` | `board-inbox.html` |
| `agenda-registry.html` | `agenda-detail.html?meet=ALL`, `?meet=<id การประชุม>` |
| `agenda-detail.html`, `agenda-registry-detail.html` | `agenda-registry.html`, `meeting-docs.html?meet=<id>` |
| `agenda.html`, `agenda-set.html` | `agenda-detail.html?meet=` |
| `meeting-docs.html`, `agenda-meeting-docs.html` | `agenda-registry.html` |
| `urgent-agenda.html` | `agenda-set.html?case=` |
| `resolution-72.html` | `ruling-report.html?case=` |
| `ruling-report.html` | `register.html` |
| `resolution.html`, `affairs-case-detail.html`, `affairs-opinion.html` | `inbox.html` |
| `case-register.html`, `register.html` | `agenda-registry.html` |
| `dashboard.html` ↔ `followup-dashboard.html` | ลิงก์หากัน |
| `overall-flow.html` | ลิงก์ไป 20 หน้า (inbox, approval-review, urgent-agenda, order, dir-case-support-assign, support-subcommittee-inbox, support-subcommittee, chairman-agenda, affairs-case-detail, ruling-report, subcommittee-inbox, subcommittee-screening, agenda-registry, resolution-inbox, agenda-meeting-docs, board-resolution, resolution-72, affairs-opinion, resolution) |
| ทุกหน้าที่ใช้ shell | เมนู Sidebar ตามบทบาท (หัวข้อ 5.3) |

หน้าที่ **ไม่พบลิงก์ `.html` ตรงๆ ในไฟล์** (`approval-review`, `review`, `board-resolution`, `chairman`, `chairman-agenda`, `meeting-report`, `order`, `order-m24`, `screening`, `subcommittee-screening` [บางส่วน], `support-subcommittee`, `resolution-inbox`, `inbox`, `subcommittee-inbox`, `dir-case-support-assign`) ปลายทางถูกสร้างโดยฟังก์ชันกลางใน `ecmis-app.js` (เช่น `homeHref`, ลิงก์ในแถวสำนวน) [ต้องยืนยัน] ผังเส้นทางครบถ้วนต่อสถานะ — แนะนำให้ใช้เอกสาร User Flow ใน `docs/` เทียบ ไม่ใช้โค้ดนี้เป็นแหล่งเดียว

### 5.3 เมนู Sidebar (ตามนิยาม `NAV` ใน `ecmis-app.js`)
| เมนู | ไป | เงื่อนไขแสดง |
|---|---|---|
| หน้าแรก (ชื่อเปลี่ยนตามบทบาท เช่น "รายการพิจารณา/ลงนาม", "รายการคดี (กองบริหารคดี)") | หน้าแรกของบทบาท | ทุกบทบาท |
| ทะเบียนสำนวน | `case-register.html` | ทุกบทบาท |
| รายงานผล ม.38 | `m38-inbox.html` | deputy, secgen |
| รายการรอจัดทำมติ | `resolution-inbox.html` | board_sec |
| จัดทำรายงานมติการประชุม | `meeting-report.html` | บทบาทที่มี perm `compile.minutes` (board_sec ในข้อมูลปัจจุบัน) |
| ทะเบียนวาระการประชุม | `agenda-registry.html` | ซ่อนสำหรับ secgen, board_sec, chairman, affairs, case_admin |
| ติดตามผลมติ | `followup-dashboard.html` | affairs, board_sec, chairman, board, case_admin |
| Dashboard สถิติมติ | `dashboard.html` | affairs, board_sec, chairman, board, secgen, case_admin |

[ต้องยืนยัน] พบความไม่สอดคล้อง: เมนู "ทะเบียนวาระการประชุม" แสดงให้ deputy, support_sub, subcommittee, board, dir_case (เพราะซ่อนเฉพาะ 5 บทบาทข้างบน) แต่ `PAGE_PERMISSIONS` อนุญาตหน้านี้เฉพาะ board_sec, board, support_sub — deputy/subcommittee/dir_case จะเห็นเมนูแต่กดแล้วถูก redirect ควรยืนยันว่าตั้งใจหรือไม่

---

## 6. รายชื่อหน้าจอ (สรุป)

| # | Path | ชื่อหน้า (ตาม `<title>`) | กลุ่ม |
|---|---|---|---|
| 1 | `/index.html` | E-CMIS ระบบบริหารจัดการและติดตามสำนวนคดีการทุจริตฯ | สาธารณะ |
| 2 | `/login.html` | เข้าสู่ระบบ | สาธารณะ |
| 3 | `/overall-flow.html` | ภาพรวมกระบวนงาน กจ.7 | เครื่องมือของ Prototype |
| 4 | `/inbox.html` | รายการพิจารณา/ลงนาม | รายการงาน |
| 5 | `/case-admin-inbox.html` | รายการคดี (กองบริหารคดี) | รายการงาน |
| 6 | `/subcommittee-inbox.html` | รายการสำนวนรอกลั่นกรอง (คณะอนุกรรมการกลั่นกรองฯ) | รายการงาน |
| 7 | `/support-subcommittee-inbox.html` | รายการสำนวนรอกลั่นกรอง (คณะอนุกรรมการสนับสนุนเลขาธิการฯ) | รายการงาน |
| 8 | `/board-inbox.html` | รอบการประชุมและอ่านวาระล่วงหน้า (คณะกรรมการ) | รายการงาน |
| 9 | `/resolution-inbox.html` | รายการจัดทำมติ | รายการงาน |
| 10 | `/m38-inbox.html` | รายงานผล ม.38 | รายการงาน |
| 11 | `/approval-review.html` | เลขาธิการฯ พิจารณา / ลงนาม | ไต่สวนเบื้องต้น |
| 12 | `/review.html` | เลขาธิการฯ พิจารณา / ลงนาม (หน้าเดิม) | ไต่สวนเบื้องต้น |
| 13 | `/dir-case-support-assign.html` | ออกเลขทะเบียนคุม / มอบหมายคณะอนุสนับสนุน | ไต่สวนเบื้องต้น |
| 14 | `/support-subcommittee.html` | คณะอนุกรรมการสนับสนุนเลขาธิการฯ กลั่นกรองสำนวนซับซ้อน | ไต่สวนเบื้องต้น |
| 15 | `/subcommittee-screening.html` | คณะอนุกลั่นกรองฯ คณะที่ 1–8 | ไต่สวนเบื้องต้น |
| 16 | `/screening.html` | คณะอนุกลั่นกรองฯ คณะที่ 1–8 (หน้าเดิม) | ไต่สวนเบื้องต้น |
| 17 | `/chairman-agenda.html` | ลงนามคำสั่งและรายงาน | ไต่สวนเบื้องต้น |
| 18 | `/chairman.html` | ศูนย์ลงนามคำสั่งและรายงาน — ประธานกรรมการ ป.ป.ท. | ไต่สวนเบื้องต้น |
| 19 | `/order.html` | ออกคำสั่งแต่งตั้งคณะไต่สวน ม.24 | ไต่สวนเบื้องต้น |
| 20 | `/order-m24.html` | ออกคำสั่งแต่งตั้งคณะไต่สวน ม.24 (หน้าเดิม) | ไต่สวนเบื้องต้น |
| 21 | `/urgent-agenda.html` | คำร้องขอบรรจุวาระด่วน | เร่งด่วน |
| 22 | `/case-admin-detail.html` | รายละเอียดคดี (กองบริหารคดี) | รายละเอียด |
| 23 | `/affairs-case-detail.html` | ฟอร์มคัดกรองสำนวน | ชี้มูล 7.2 |
| 24 | `/affairs-opinion.html` | ทำความเห็นเสนอ (กลุ่มงานกิจการฯ) | ชี้มูล 7.2 |
| 25 | `/resolution-72.html` | บันทึกมติที่ประชุมฯ (วินิจฉัยชี้มูล) | ชี้มูล 7.2 |
| 26 | `/ruling-report.html` | รายงานวินิจฉัยชี้มูล | ชี้มูล 7.2 |
| 27 | `/agenda.html` | บรรจุระเบียบวาระการประชุม | เรื่องทั่วไป/วาระ |
| 28 | `/agenda-set.html` | บรรจุระเบียบวาระการประชุม (หน้าเดิม) | เรื่องทั่วไป/วาระ |
| 29 | `/meeting-docs.html` | จัดทำเอกสารการประชุม | เรื่องทั่วไป/วาระ |
| 30 | `/agenda-meeting-docs.html` | จัดทำเอกสารการประชุม (หน้าเดิม) | เรื่องทั่วไป/วาระ |
| 31 | `/board-resolution.html` | บันทึกมติที่ประชุมคณะกรรมการ ป.ป.ท. | มติ |
| 32 | `/resolution.html` | บันทึกมติที่ประชุมคณะกรรมการ ป.ป.ท. (หน้าเดิม) | มติ |
| 33 | `/meeting-report.html` | จัดทำรายงานมติการประชุม | รายงาน |
| 34 | `/board-detail.html` | รายละเอียดวาระการประชุม (คณะกรรมการ) | รายละเอียด |
| 35 | `/m38-review.html` | พิจารณารายงานผล ม.38 | ม.38 |
| 36 | `/case-register.html` | ทะเบียนสำนวน | ทะเบียน |
| 37 | `/register.html` | ทะเบียนสำนวน (หน้าเดิม) | ทะเบียน |
| 38 | `/agenda-registry.html` | ทะเบียนวาระการประชุม | ทะเบียน |
| 39 | `/agenda-detail.html` | รายละเอียดวาระการประชุม | ทะเบียน |
| 40 | `/agenda-registry-detail.html` | รายละเอียดวาระการประชุม (ไฟล์ซ้ำกับ agenda-detail) | ทะเบียน |
| 41 | `/dashboard.html` | Dashboard สถิติมติคณะกรรมการ ป.ป.ท. | Dashboard |
| 42 | `/followup-dashboard.html` | Dashboard ติดตามผลมติ | Dashboard |
| 43–52 | `/approval-review-mock-01.html` ถึง `-10.html` | สรุปสำนวน (Mock …) | หน้า mock การ์ดสรุป |

หมายเหตุที่ตรวจด้วย `diff` ไฟล์
- `agenda-detail.html` กับ `agenda-registry-detail.html` **เนื้อหาเหมือนกันทุกบรรทัด**
- `meeting-docs.html` กับ `agenda-meeting-docs.html` ต่างกัน 3 บรรทัด
- คู่ `order`/`order-m24`, `resolution`/`board-resolution`, `review`/`approval-review`, `chairman`/`chairman-agenda`, `screening`/`subcommittee-screening`, `agenda`/`agenda-set`, `register`/`case-register` มีทั้งสองไฟล์ในโฟลเดอร์ และ `PAGE_PERMISSIONS` ระบุสิทธิ์ของทั้งคู่
- [ต้องยืนยัน] ว่าไฟล์ "หน้าเดิม" (`review`, `screening`, `order-m24`, `resolution`, `chairman`, `register`, `agenda-set`, `agenda-registry-detail`, `agenda-meeting-docs`) ยังใช้งานจริงหรือเป็นซากของเวอร์ชันก่อน (เมนู Sidebar ที่ตรวจพบไม่ลิงก์ไปไฟล์เหล่านี้ แต่ `overall-flow.html` ลิงก์ไป `order`, `resolution`)

---

## 7. รายละเอียดแยกตาม Path

> **ข้อกำหนดของ Prototype นี้:** เป็นเว็บหลายไฟล์ (Multi-page) แต่ละหน้ามี Path จริงตามชื่อไฟล์ จึงใช้ path เหล่านี้ได้ (ตรวจแล้วตรงกับไฟล์ในโฟลเดอร์) ไม่ใช่ SPA
> - "สิทธิ์เข้าถึง" คือบทบาทที่ล็อกอินได้ (10 บัญชี) ซึ่ง `PAGE_PERMISSIONS` อนุญาต; `null` = ไม่จำกัด
> - "ผลลัพธ์" ที่ระบุว่า (ตามโค้ด) = อ่านจากโค้ด **ยังไม่ได้กดทดสอบ** ที่ไม่ได้ระบุ = ยังไม่พบข้อมูล/ต้องยืนยัน
> - บรรทัด "ฟิลด์ที่ผูก sync" ในแต่ละหน้า = ฟิลด์ที่ผูกใน commit `0afb372`
> - ปุ่มร่วมของหน้าเอกสาร (เรียก "ชุดปุ่มเอกสาร"): แท็บ "เอกสาร", "แก้ไขเอกสาร", "ส่งออก DOCX", "พิมพ์ A4" (บางหน้า), "ดูทีละหน้า", "ดูทุกหน้าต่อเนื่อง" — หน้าเหล่านี้มีจอแบ่งฟอร์ม ↔ เอกสาร sync สองฝั่ง (ดูหัวข้อ 3.5, 10)
> - ทุกหน้าที่ใช้ shell: ต้องล็อกอิน มิฉะนั้น redirect ไป `login.html`; ข้อมูลสำนวนเปิดด้วย `?case=<เลขสำนวน เช่น 9205/2569>`

### 7.1 `/index.html`
- **ชื่อ/วัตถุประสงค์:** หน้าแรกสาธารณะของ E-CMIS (ตัวเลือกปรับขนาดตัวอักษร/สี, ปุ่มลงทะเบียนเจ้าหน้าที่ใหม่, ตรวจสอบสถานะสำนวนคดี, ค้นหา, ข่าวประชาสัมพันธ์ ประกาศจัดซื้อจัดจ้าง ผลการดำเนินคดีที่เผยแพร่ได้)
- **เข้าถึง:** เปิดตรง ไม่ต้องล็อกอิน (`PAGE_PERMISSIONS: null`)
- **ข้อมูลที่แสดง:** ข้อความและตัวเลขในหน้า (ไม่ได้ตรวจว่ามาจาก Supabase หรือข้อมูลจำลอง; พบการเรียก `public_case_status_view`)
- **ปุ่ม:** A-/A/A+, ปรับสี, ลงทะเบียนเจ้าหน้าที่ใหม่, ตรวจสอบสถานะสำนวนคดี, ค้นหา
- **ลิงก์ออก:** `login.html`
- **ข้อจำกัด/ต้องยืนยัน:** อ้าง `../cases.js` ที่ไม่พบ; ผลของปุ่มค้นหา/ตรวจสถานะ/ลงทะเบียนยังไม่ได้ตรวจ

### 7.2 `/login.html`
- **วัตถุประสงค์:** เข้าสู่ระบบ
- **เข้าถึง:** เปิดตรง
- **องค์ประกอบ:** แท็บ Username/Email และ ThaID, ฟอร์มชื่อผู้ใช้/รหัสผ่าน, ปุ่มลัด 10 บทบาท, ลืมรหัสผ่าน, ปรับขนาดตัวอักษร/สี
- **ผลลัพธ์:** ตามหัวข้อ 4.2
- **ลิงก์ออก:** `index.html`, หน้าแรกของบทบาท
- **ข้อจำกัด:** ไม่ตรวจรหัสผ่านจริง; ไม่พบ ThaID/SSO จริง; มีการเขียน key "shared auth" ลง localStorage สำหรับระบบ hub ภายนอก [ต้องยืนยัน]

### 7.3 `/overall-flow.html`
- **วัตถุประสงค์:** แผนผัง/ภาพรวมกระบวนงาน กจ.7 สำหรับทดสอบ Prototype (มีปุ่ม "ตรวจสถานะใหม่", "รีเซ็ตเคสที่เพี้ยนทั้งหมด")
- **เข้าถึง:** เปิดตรง (ไม่อยู่ใน `PAGE_PERMISSIONS` และไม่เรียก renderShell); โค้ด `assets/overall-flow.js` ตั้ง `ecmis_role`, `ecmis_username`, `ecmis_authed` ใน session เอง
- **ลิงก์ออก:** 20 หน้าตามหัวข้อ 5.2; โหลดข้อมูลจาก `assets/flow-samples.json` (ตามชื่อไฟล์ ยังไม่ได้ตรวจว่าโหลดจริงหรือไม่)
- **ข้อจำกัด:** เป็นเครื่องมือของทีมจัดทำ Prototype ไม่ใช่หน้าจอของระบบจริง [ต้องยืนยัน] ว่าจะนำไปเป็นส่วนของระบบหรือไม่; ปุ่มรีเซ็ตทำงานกับข้อมูลใน browser ยังไม่ได้ตรวจว่ารวมการเขียน Supabase หรือไม่

### 7.4 `/inbox.html`
- **วัตถุประสงค์:** รายการพิจารณา/ลงนาม (หน้าแรกของ deputy, secgen, chairman, affairs, dir_case ชื่อหัวเรื่องในเมนูเปลี่ยนตามบทบาท — ผู้บริหาร/ต้นทางเป็น "รายการติดตามสถานะสำนวน")
- **เข้าถึง:** secgen, chairman, affairs, deputy, dir_case
- **ข้อมูล:** รายการสำนวนจาก `inboxFor(role)` (ผสมข้อมูลจำลอง + Supabase) พร้อม SLA ที่คำนวณในโค้ด
- **ปุ่ม:** ล้างตัวกรอง, ตัวกรองต่างๆ (ยังไม่ได้ไล่ทุกตัว)
- **ผลลัพธ์:** คลิกแถวเข้าหน้าตามสถานะ (ตามโค้ด)
- **ลิงก์ออก:** หน้ารายละเอียดตามสถานะ (ไม่พบ `href` ตรงในไฟล์)
- **ข้อจำกัด:** อ่านอย่างเดียว (ไม่พบการเขียน DB ในไฟล์นี้)

### 7.5 `/case-admin-inbox.html`
- **วัตถุประสงค์:** รายการคดีของกองบริหารคดี มีปุ่ม "ส่งเข้าคณะ" (เลือกคณะอนุกลั่นกรองฯ)
- **เข้าถึง:** case_admin
- **ปุ่ม:** ล้างตัวกรอง, ส่งเข้าคณะ
- **ผลลัพธ์ (ตามโค้ด):** อัปเดต `subCommittee` ใน `CASES` และเรียก Supabase update `trr_sub_committee`
- **ลิงก์ออก:** `case-admin-detail.html?case=<id>`
- **ข้อจำกัด:** [ต้องยืนยัน] กติกาเลือกคณะ (จำนวนคณะ/การกระจายงาน)

### 7.6 `/case-admin-detail.html`
- **วัตถุประสงค์:** รายละเอียดคดีและส่งเข้าคณะอนุกลั่นกรองฯ
- **เข้าถึง:** case_admin
- **ปุ่ม:** ส่งเข้าคณะอนุกลั่นกรองฯ
- **ผลลัพธ์ (ตามโค้ด):** เขียน `trr_sub_committee` แล้วบันทึกประวัติใน `CASES`
- **ลิงก์ออก:** `case-admin-inbox.html`, `subcommittee-screening.html?case=<id>`

### 7.7 `/subcommittee-inbox.html`
- **วัตถุประสงค์:** รายการสำนวนรอกลั่นกรอง "คณะของฉัน" (หน้าแรก subcommittee)
- **เข้าถึง:** subcommittee, affairs, chairman, secgen, board_sec, board, case_admin
- **ปุ่ม:** ล้างตัวกรอง
- **ข้อจำกัด:** อ่านอย่างเดียว; คณะอ่านจาก `ecmis_subcommittee_team` ใน session

### 7.8 `/support-subcommittee-inbox.html`
- **วัตถุประสงค์:** รายการสำนวนรอกลั่นกรองของคณะอนุกรรมการสนับสนุนเลขาธิการฯ
- **เข้าถึง:** support_sub
- **ลิงก์ออก:** `support-subcommittee.html?case=<id>` และ `?case=<id>&readonly=true` (โหมดอ่านอย่างเดียว)
- **ข้อจำกัด:** อ่านอย่างเดียว

### 7.9 `/board-inbox.html`
- **วัตถุประสงค์:** รอบการประชุมและอ่านวาระล่วงหน้า (กรรมการ)
- **เข้าถึง:** board
- **ปุ่ม:** ล้างตัวกรอง
- **ลิงก์ออก:** `board-detail.html?id=<id>`

### 7.10 `/board-detail.html`
- **วัตถุประสงค์:** รายละเอียดวาระการประชุมสำหรับกรรมการ มีตัวกรอง "ทั้งหมด/รอพิจารณา/มีมติแล้ว", ปุ่ม "วาระก่อนหน้า/ถัดไป", "เล่มระเบียบวาระ (.pdf)", "คลังพยานหลักฐานดิจิทัล", "แผงเอกสารทางการ (A4)"
- **เข้าถึง:** ไม่พบรายการใน `PAGE_PERMISSIONS` (= ไม่จำกัดเมื่อล็อกอิน เพราะ `undefined`→ อนุญาต)
- **ลิงก์ออก:** `board-inbox.html`
- **ข้อจำกัด:** ตัวเลข "(10)", "(0)", "(2)" เป็นข้อมูลในหน้า [ต้องยืนยัน] ที่มา; ผลปุ่ม "เล่มระเบียบวาระ (.pdf)" และ "คลังพยานฯ" ยังไม่ได้ตรวจ; **ไม่พบการเขียนข้อมูล** ในหน้านี้ — การลงมติของกรรมการ (perm `vote`) [ต้องยืนยัน] ว่าหน้านี้รองรับหรือไม่

### 7.11 `/resolution-inbox.html`
- **วัตถุประสงค์:** รายการจัดทำมติ (work-inbox ของ board_sec) มี 2 แท็บ: "คิวงานรอบันทึกมติ", "ทะเบียนมติและสถานะส่งต่อ"
- **เข้าถึง:** board_sec (โค้ดบังคับซ้ำในหน้า)
- **ปุ่ม:** ล้างตัวกรอง
- **ผลลัพธ์/ข้อจำกัด:** พบ 1 จุดเขียนข้อมูลในไฟล์ [ต้องยืนยัน] เหตุการณ์ที่เขียน

### 7.12 `/m38-inbox.html`
- **วัตถุประสงค์:** รายงานผล ม.38 จาก กจ.8 (ตามคอมเมนต์ในโค้ด) แท็บ "รอดำเนินการ/ดำเนินการแล้ว", ค้นหา
- **เข้าถึง:** deputy, secgen
- **ลิงก์ออก:** `m38-review.html?report=<เลขรายงาน>`
- **ข้อจำกัด:** ข้อมูลรายงาน ม.38 เป็นข้อมูลจำลองในโค้ด ไม่พบการเชื่อมระบบ กจ.8 [ต้องยืนยัน]

### 7.13 `/m38-review.html`
- **วัตถุประสงค์:** พิจารณารายงานผล ม.38 (รองเลขาธิการฯ อนุมัติ → เลขาธิการฯ อนุมัติ ตามคอมเมนต์โค้ด)
- **เข้าถึง:** deputy, secgen; รับ `?report=`
- **ลิงก์ออก:** `m38-inbox.html`
- **ข้อจำกัด:** ไม่พบปุ่ม `<button>` ที่ตรวจจับได้จาก HTML ปุ่มอาจสร้างด้วย JavaScript [ต้องยืนยัน] การกระทำที่ทำได้

### 7.15 `/approval-review.html`
- **วัตถุประสงค์:** เลขาธิการฯ (และรองเลขาธิการฯ ในขั้นแรก) พิจารณา/ลงนาม มีการ์ดสรุปสำนวน ความเห็นรอง/เลขาฯ "ซับซ้อนหรือไม่/เร่งด่วนหรือไม่" ลงนามดิจิทัล/ลายเซ็นมือ ปฏิเสธการรับ (เดิมใช้คำว่า "ตีกลับ")
- **เข้าถึง:** secgen, affairs, deputy, board_sec, chairman, board, case_admin, dir_case
- **ปุ่ม:** ชุดปุ่มเอกสาร + "แก้ไข / ลงนามใหม่", "ลบลายเซ็น" (ปุ่มส่ง/ลงนาม/ตีกลับสร้างตามสถานะด้วย JavaScript)
- **ฟิลด์ที่ผูก sync:** ความเห็นเลขาฯ/รองฯ, เหตุผลซับซ้อน, เหตุผลเร่งด่วน 72 ชม.
- **ผลลัพธ์ (ตามโค้ด):** เขียน `tbl_res_request` (+ แนบไฟล์ใน `tbl_res_attachment`) แล้วกลับหน้าแรกของบทบาท
- **ลิงก์ออก:** หน้าแรกของบทบาท
- **ข้อจำกัด:** ลายเซ็นเป็นการจำลอง (`SignatureStore` ระบุในโค้ดว่า "Mock audit record only"); [ต้องยืนยัน] วิธีลงนามจริง/PKI

### 7.16 `/review.html`
- **วัตถุประสงค์:** รูปแบบเดิมของหน้าเลขาธิการฯ พิจารณา/ลงนาม (title เดียวกับ approval-review)
- **เข้าถึง:** secgen, affairs, deputy, board_sec, chairman, board, case_admin (ไม่รวม dir_case)
- **ข้อจำกัด:** ไม่ลิงก์จากเมนู [ต้องยืนยัน] ว่ายังใช้

### 7.17 `/dir-case-support-assign.html`
- **วัตถุประสงค์:** ผอ.กบค. ออกเลขทะเบียนคุม / มอบหมายคณะอนุสนับสนุน (ตามหัวข้อหน้า; โค้ดบอกว่าบทบาท dir_case เหลือเฉพาะด่านรับรองความเร่งด่วน)
- **เข้าถึง:** dir_case, secgen, support_sub
- **ฟิลด์ที่ผูก sync:** ตัวเลือกคณะอนุสนับสนุน (radio)
- **ข้อจำกัด:** [ต้องยืนยัน] ขอบเขตงานของ ผอ.กบค. ว่ารวม "มอบหมาย" ด้วยหรือไม่ เพราะคอมเมนต์ในโค้ดบอกว่าถูกถอดออก

### 7.18 `/support-subcommittee.html`
- **วัตถุประสงค์:** คณะอนุสนับสนุนฯ กลั่นกรองสำนวนซับซ้อน (ความเห็น เหตุผลเห็นแย้ง ฐานกฎหมาย ผลการพิจารณา)
- **เข้าถึง:** support_sub, affairs, secgen, board_sec, chairman, board, case_admin
- **ปุ่ม:** จัดการคำแนะนำ + ชุดปุ่มเอกสาร
- **พารามิเตอร์:** `?case=`, `?readonly=true`
- **ผลลัพธ์:** เขียนข้อมูล 1 จุดในไฟล์ (ตามโค้ด)

### 7.19 `/subcommittee-screening.html`
- **วัตถุประสงค์:** คณะอนุกรรมการกลั่นกรองฯ คณะที่ 1–8 ให้ความเห็น
- **เข้าถึง:** subcommittee, affairs, chairman, secgen, board_sec, board, case_admin
- **ฟิลด์ที่ผูก sync:** ทีมที่ตั้งเอง, ครั้งที่/วันที่ประชุมอนุฯ, ความเห็น
- **ผลลัพธ์:** พบ 4 จุดเขียนข้อมูลในไฟล์

### 7.20 `/screening.html`
- รูปแบบเดิมของ 7.19 (title เดียวกัน) ต่างจาก `subcommittee-screening.html` 295 บรรทัด

### 7.21 `/chairman-agenda.html`
- **วัตถุประสงค์:** ประธานฯ ลงนามคำสั่งและรายงาน (รายงาน ๒-๑๓ ที่เลขาฯ ลงนามแล้ว)
- **เข้าถึง:** chairman, affairs, board_sec, secgen, board, case_admin
- **ปุ่ม:** ชุดปุ่มเอกสาร + แท็บ "เอกสารคำสั่ง / รายงานรอลงนาม"
- **ผลลัพธ์:** เขียน `trr_resolution_data` ตามโค้ด
- **ข้อจำกัด:** ฟิลด์ฟอร์มยังไม่ผูก sync (อยู่นอกขอบเขตที่ทำรอบนี้)

### 7.22 `/chairman.html`
- รูปแบบเดิม "ศูนย์ลงนามคำสั่งและรายงาน — ประธานกรรมการ ป.ป.ท." สิทธิ์เหมือน 7.21 อ่านอย่างเดียวในส่วนที่ตรวจพบ (writes=0)

### 7.23 `/affairs-case-detail.html`
- **วัตถุประสงค์:** ฟอร์มคัดกรองสำนวน (ประธานฯ ลงรับ/คัดกรองสาย 7.2 ตามคอมเมนต์ ชื่อไฟล์คงเดิม)
- **เข้าถึง:** chairman เท่านั้น
- **ปุ่ม:** ชุดปุ่มเอกสาร + แท็บ "บันทึกคัดกรอง (รอลงนาม)", "รายงาน ๖-๔๔ (เลขาฯ ลงนามแล้ว)"
- **ผลลัพธ์:** เขียน `trr_resolution_data`; ลิงก์ `inbox.html`
- **ข้อจำกัด:** ในชุดทดสอบ mock ไม่มีสำนวนที่เปิดหน้านี้ได้ จึงไม่ได้ทดสอบ sync

### 7.24 `/affairs-opinion.html`
- **วัตถุประสงค์:** กลุ่มงานกิจการฯ ทำความเห็นเสนอ (สาย 7.2 ทางไม่ยุ่งยาก)
- **เข้าถึง:** affairs เท่านั้น
- **ฟิลด์ที่ผูก sync:** ความเห็นกลุ่มงานกิจการฯ
- **ลิงก์ออก:** `inbox.html`

### 7.25 `/order.html` และ 7.26 `/order-m24.html`
- **วัตถุประสงค์:** ออกคำสั่งแต่งตั้งคณะไต่สวน ม.24 + เสนอเพื่อลงนาม (บันทึกข้อความ) + แก้ไของค์ประกอบ/เพิ่มผู้ถูกกล่าวหา
- **เข้าถึง:** secgen, chairman, affairs, board_sec, board, case_admin (+ id ที่ไม่ล็อกอิน)
- **ปุ่ม:** ออกคำสั่งแต่งตั้ง, เสนอเพื่อลงนาม, แก้ไของค์ประกอบ/เพิ่มผู้ถูกกล่าวหา, เพิ่มรายชื่อ, เพิ่มรายการ, B/I (ตัวหนา/ตัวเอียง) + ชุดปุ่มเอกสาร
- **พารามิเตอร์:** `?case=`, `?res=`, `?mode=`
- **ผลลัพธ์:** `fetch` แม่แบบ `.docx` ใน `assets/templates/`; เขียนข้อมูล 4–5 จุด (ตามโค้ด)
- **ฟิลด์ที่ผูก sync:** เลขที่/วันที่คำสั่ง, ชื่อผู้ถูกกล่าวหา, ฐานความผิด, บันทึกข้อความ, การแก้ไขคำสั่ง
- **ข้อจำกัด:** ต่างกัน 380 บรรทัด [ต้องยืนยัน] ว่าใช้ไฟล์ใดเป็นหลัก

### 7.27 `/urgent-agenda.html`
- **วัตถุประสงค์:** คำร้องขอบรรจุวาระด่วน (ผอ.กบค. รับรองความเร่งด่วน ตามคอมเมนต์ใน `ROLES`)
- **เข้าถึง:** dir_case, chairman, affairs, secgen, board_sec, board, case_admin
- **ฟิลด์ที่ผูก sync:** เหตุผลเร่งด่วน (ขั้นรับรอง)
- **ลิงก์ออก:** `agenda-set.html?case=`
- **ข้อจำกัด:** ไม่ได้ทดสอบ sync เพราะต้องมีสำนวนในสถานะที่เปิดขั้นรับรอง

### 7.28 `/agenda.html` และ 7.29 `/agenda-set.html`
- **วัตถุประสงค์:** บรรจุระเบียบวาระการประชุม + หนังสือเชิญประชุม
- **เข้าถึง:** board_sec, affairs, chairman, board, secgen, case_admin
- **ปุ่ม:** ชุดปุ่มเอกสาร + แท็บ "ระเบียบวาระ", "หนังสือเชิญประชุม" + "บันทึกร่าง", "ยืนยันบรรจุวาระ — ส่งต่อฝ่ายเลขานุการบอร์ด…"
- **ฟิลด์ที่ผูก sync:** ครั้งที่/วันที่ประชุม, ลำดับวาระ, ตัวเลือกการประชุม
- **ผลลัพธ์:** เขียน `tbl_res_request` (เพิ่ม meeting ใน `tbl_res_calendar*`) ตามโค้ด; ลิงก์ `agenda-detail.html?meet=`
- **ข้อจำกัด:** ต่างกัน 114 บรรทัด; ฝัง Supabase URL/key ในหน้า

### 7.30 `/meeting-docs.html` และ 7.31 `/agenda-meeting-docs.html`
- **วัตถุประสงค์:** จัดทำเอกสารการประชุม: ระเบียบวาระ (รวม), เสนอวาระผ่านเลขาธิการฯ, เชิญประธาน/กรรมการ, เชิญเลขาธิการ ป.ป.ช., เชิญ ผอ.กอง/สำนัก, แจ้ง IT e-Meeting
- **เข้าถึง:** board_sec, affairs, chairman, board, secgen, case_admin
- **พารามิเตอร์:** `?meet=<id>` (ทดสอบด้วย `?meet=4`)
- **ฟิลด์ที่ผูก sync:** เบอร์โทร, เลขที่/วันที่หนังสือเชิญ, เวลา/สถานที่, ผู้รับ, ผู้ลงนาม
- **ลิงก์ออก:** `agenda-registry.html`
- **ข้อจำกัด:** แท็บ "แจ้ง IT e-Meeting" เป็นเอกสาร ไม่พบการเชื่อมระบบ e-Meeting จริง [ต้องยืนยัน]

### 7.32 `/board-resolution.html` และ 7.33 `/resolution.html`
- **วัตถุประสงค์:** บันทึกมติที่ประชุมคณะกรรมการ ป.ป.ท. (ไต่สวนเบื้องต้น/เรื่องทั่วไป)
- **เข้าถึง:** board_sec, affairs, chairman, board, secgen, case_admin
- **ฟิลด์ที่ผูก sync:** ครั้งที่/วันที่ประชุม, ลำดับวาระ, เรื่อง, เจ้าของเรื่อง, หน่วยงาน, ผู้เสนอ, ความเห็น, รายละเอียดวาระ, ผู้ลงนาม
- **ผลลัพธ์:** เขียนข้อมูล 2–3 จุด; `fetch` แม่แบบใน `assets/templates/` (เอกสารมติ)
- **ลิงก์ออก:** `resolution.html` → `inbox.html`
- **ข้อจำกัด:** [ต้องยืนยัน] กติกาองค์ประชุม/การลงมติ (ในโค้ดมีเพียง perm `vote`)

### 7.34 `/resolution-72.html`
- **วัตถุประสงค์:** บันทึกมติ (วินิจฉัยชี้มูล) รายผู้ถูกกล่าวหา (เพิ่มมาตรา, ข้อกล่าวหา/มูลความผิด, ความเห็นผู้ไต่สวน)
- **เข้าถึง:** board_sec, affairs, chairman, board, secgen, case_admin
- **ลิงก์ออก:** `ruling-report.html?case=`
- **ผลลัพธ์:** เขียนข้อมูล 2 จุด (ตามโค้ด)

### 7.35 `/ruling-report.html`
- **วัตถุประสงค์:** รายงานวินิจฉัยชี้มูล / หนังสือแจ้งโทษทางวินัย (แท็บ "รายงานวินิจฉัยชี้มูล", "หนังสือลงโทษทางวินัย", และ "(v.2)")
- **เข้าถึง:** board_sec, affairs, chairman, secgen, board, case_admin
- **ปุ่ม:** เพิ่มฐานความผิดอื่นๆ, ล้าง + ชุดปุ่มเอกสาร; โหลดไฟล์ `.docx` ด้วย mammoth
- **ผลลัพธ์:** เขียนข้อมูลมากที่สุดในโปรเจกต์ (15 จุด) ตามโค้ด
- **ลิงก์ออก:** `register.html`
- **ข้อจำกัด:** ฟอร์มซ่อนในบางบทบาท/สถานะ ที่ทดสอบ sync ได้เฉพาะฟอร์ม → เอกสาร

### 7.36 `/meeting-report.html`
- **วัตถุประสงค์:** จัดทำรายงานมติการประชุม
- **เข้าถึง:** board_sec, affairs, case_admin
- **ปุ่ม:** ชุดปุ่มเอกสาร + "บันทึกร่างรายงาน"
- **ฟิลด์ที่ผูก sync:** วันที่ประชุม
- **ข้อจำกัด:** [ต้องยืนยัน] ว่ารวมสถิติ/ตารางมติเข้ารายงานอัตโนมัติหรือไม่ (ยังไม่ได้ตรวจเนื้อหา)

### 7.37 `/case-register.html` และ 7.38 `/register.html`
- **วัตถุประสงค์:** ทะเบียนสำนวน ค้นหา ตัวกรองขั้นสูง ตัวกรองด่วน (ไต่สวนเบื้องต้น, วินิจฉัยชี้มูล, เรื่องทั่วไป/ทบทวนอัยการ, เกินกำหนด, เร่งด่วน, คิวของฉัน, เตือนสำนวนซ้ำ) และส่งออก Excel/CSV
- **เข้าถึง:** ทุกบทบาท (`null`)
- **ผลลัพธ์:** พบการเขียน `tbl_cmp_case` (`tcc_subject`, `tcc_owner`) ในโค้ด [ต้องยืนยัน] ว่าเป็นการแก้ไขในทะเบียนจริง
- **ลิงก์ออก:** `agenda-registry.html`

### 7.39 `/agenda-registry.html`
- **วัตถุประสงค์:** ทะเบียนวาระการประชุม (หน้าแรกของ board_sec) ปุ่ม "เพิ่มการประชุม", "บรรจุวาระ", "เพิ่มเลขที่เรื่อง", "ดำเนินการ"
- **เข้าถึง:** board_sec, board, support_sub
- **ลิงก์ออก:** `agenda-detail.html?meet=…`
- **ผลลัพธ์:** เขียน `trr_urgent` ใน `tbl_res_request`; ข้อมูลการประชุมและการเชื่อมสำนวนอยู่ใน `assets/agenda-registry-data.js` (ใช้ทั้ง Supabase และ localStorage/overlay)

### 7.40 `/agenda-detail.html` และ 7.41 `/agenda-registry-detail.html`
- **วัตถุประสงค์:** รายละเอียดวาระของการประชุมหนึ่งครั้ง (เพิ่มวาระ, เพิ่มเลขที่เรื่อง, ส่งออก Excel/CSV 9 คอลัมน์)
- **เข้าถึง:** board_sec, board, support_sub
- **ลิงก์ออก:** `agenda-registry.html`, `meeting-docs.html?meet=<id>`
- **ข้อจำกัด:** สองไฟล์เหมือนกันทุกบรรทัด [ต้องยืนยัน] ว่าเก็บไฟล์เดียว

### 7.42 `/dashboard.html`
- **วัตถุประสงค์:** Dashboard สถิติมติคณะกรรมการ ป.ป.ท. (Chart.js) ส่งออก Word/Excel/PDF/พิมพ์ + รีเฟรช
- **เข้าถึง:** secgen, chairman, board_sec, board, affairs, case_admin
- **ลิงก์ออก:** `followup-dashboard.html`
- **ข้อมูล:** `dashboard-analytics-service.js` มีการอ่าน Supabase 4 จุด
- **ข้อจำกัด:** [ต้องยืนยัน] นิยามตัวชี้วัด สูตรสถิติ และตัวอย่างรายงาน "สถิติมติแบบ กบค." ที่อยู่ในโฟลเดอร์ `06 ต้นแบบ Prototype` นอกโปรเจกต์

### 7.43 `/followup-dashboard.html`
- **วัตถุประสงค์:** ติดตามผลมติ (feedback จาก กจ.8 ตามคอมเมนต์ในโค้ด) + แจ้งเตือนคดีล่าช้า
- **เข้าถึง:** secgen, chairman, board_sec, board, affairs, case_admin
- **ปุ่ม:** รีเฟรชข้อมูล
- **ข้อจำกัด:** อ่านอย่างเดียว; ไม่ได้เชื่อมระบบ กจ.8 จริง (ไม่พบ) [ต้องยืนยัน]

### 7.44 `/approval-review-mock-01.html` ถึง `-10.html`
- **วัตถุประสงค์:** หน้า mock การ์ดสรุปสำนวน (ข้อมูลจำลอง) 10 แบบ: 01–02 เรื่องทั่วไป 7.3 (ข้อมูลไม่ครบ/ครบ), 03–04 ไต่สวน 213 (ไม่ครบ/ครบ), 05–06 วินิจฉัยชี้มูล 644 (ไม่ครบ/ครบ), 07–10 ตัวอย่างความเห็นเลขาฯ (7.1 กองปราบ / มีใบด่วนแนบ / ความเห็นไม่ตรงกัน / รอบที่ 2)
- **เข้าถึง:** เปิดตรง ไม่เรียก `renderShell`
- **ข้อมูล:** `assets/case-summary-mock-data.js`, `case-summary-mock-page.js`
- **ข้อจำกัด:** เป็นหน้าสาธิตแยก ไม่เชื่อมกับสำนวนจริง

---

## 8. ตารางสรุปองค์ประกอบสำคัญ

| หน้าจอ | องค์ประกอบหรือการกระทำ | ผลลัพธ์ที่สังเกตได้ใน Prototype |
|---|---|---|
| `login.html` | กรอกชื่อผู้ใช้ที่อยู่ในรายชื่อ + รหัสผ่านใดๆ แล้วกด "เข้าสู่ระบบ" | แสดง loading ~1.1 วินาที, ป๊อปอัป "เข้าสู่ระบบสำเร็จ", ไปหน้าแรกของบทบาท |
| `login.html` | กรอกชื่อผู้ใช้ที่ไม่อยู่ในรายชื่อ | แจ้ง "ไม่พบผู้ใช้งานนี้ในระบบ" |
| `login.html` | กดปุ่มลัดบทบาท (10 ปุ่ม) | เข้าระบบทันทีโดยไม่กรอกรหัสผ่าน |
| หน้าที่ใช้ shell | เปิดโดยไม่ล็อกอิน | redirect ไป `login.html` (ตามโค้ด) |
| หน้าที่ใช้ shell | เปิดหน้าที่บทบาทไม่มีสิทธิ์ | แสดง toast แจ้งไม่มีสิทธิ์ แล้ว redirect ไปหน้าแรกของบทบาท (ตามโค้ด) |
| Sidebar | ขยาย/พับเมนู, ปรับขนาดตัวอักษร, สีสูงต่ำ, โหมดมืด | บันทึกค่าใน localStorage (ตามโค้ด) |
| Topbar | กระดิ่งแจ้งเตือน | แสดง `MOCK_NOTIFICATIONS` (ข้อมูลจำลอง); อ่านแล้ว/ยังไม่อ่านพยายามบันทึกใน `ecmis_notification_read_receipt` ตามโค้ด |
| รายการ (inbox ทั้งหมด) | พิมพ์ค้นหา/เลือกตัวกรอง/"ล้างตัวกรอง" | รายการแถวถูกกรองและ badge ปรับตามบทบาท |
| รายการ (inbox ทั้งหมด) | คลิกแถวสำนวน | เปิดหน้ารายละเอียดตามสถานะ พร้อม `?case=` |
| หน้าเอกสาร 23 หน้า  | พิมพ์ในช่องฟอร์มซ้าย | ข้อความในเอกสารขวาเปลี่ยนตามทันที (ทดสอบบน temp1 ยกเว้นหน้าตามหัวข้อ 10) |
| หน้าเอกสาร 23 หน้า  | แก้ข้อความที่ขีดเส้นประในเอกสารขวา | ช่องในฟอร์มซ้ายเปลี่ยนตาม (ทดสอบแล้ว) |
| หน้าเอกสาร 23 หน้า  | คลิกค่าวันที่/ตัวเลือกในเอกสาร | เลื่อนและกะพริบช่องที่เกี่ยวข้องในฟอร์ม |
| หน้าเอกสาร 23 หน้า  | ลากเส้นแบ่งกลาง / ดับเบิลคลิก | ปรับสัดส่วนซ้าย-ขวา / รีเซ็ต (เก็บใน localStorage) |
| หน้าเอกสาร | "ดูทีละหน้า" / "ดูทุกหน้าต่อเนื่อง" | สลับโหมดแสดงเอกสาร A4 |
| หน้าเอกสาร | "ส่งออก DOCX" | สร้างไฟล์ Word ฝั่ง browser จาก HTML ของเอกสาร (ตามโค้ด ยังไม่ได้เปิดไฟล์ที่ได้ตรวจ) |
| `approval-review.html` | บันทึกความเห็น/ลงนาม/ปฏิเสธการรับ | เปลี่ยนสถานะสำนวนใน `CASES` และเขียน `tbl_res_request` (+ audit `tbl_res_request_event`) แล้วกลับหน้าแรกของบทบาท (ตามโค้ด) |
| `case-admin-inbox.html` | "ส่งเข้าคณะ" | บันทึกคณะ (`trr_sub_committee`) และตั้งประวัติ (ตามโค้ด) |
| `agenda-registry.html` | "เพิ่มการประชุม", "บรรจุวาระ" | บันทึกข้อมูลการประชุม/รายการวาระ (Supabase + overlay ใน storage ตามโค้ด) |
| `agenda-detail.html` | "Excel/CSV (9 คอลัมน์)" | ดาวน์โหลดไฟล์ฝั่ง browser (ตามชื่อปุ่ม ยังไม่ได้ตรวจเนื้อไฟล์) |
| `case-register.html` | ค้นหา, ตัวกรองด่วน | กรองทะเบียนสำนวน |
| `dashboard.html` | Word / Excel / PDF / พิมพ์ | สร้างไฟล์/พิมพ์ฝั่ง browser ตามบริการส่งออก (ยังไม่ได้ตรวจเนื้อไฟล์) |
| `followup-dashboard.html` | "รีเฟรชข้อมูล" | โหลดข้อมูลจาก Supabase ใหม่ (ตามโค้ด) |
| `overall-flow.html` | "รีเซ็ตเคสที่เพี้ยนทั้งหมด" | จัดการข้อมูลสำนวนจำลอง (ยังไม่ได้ตรวจขอบเขต) |

---

## 9. ข้อมูลตัวอย่าง / ข้อมูลจำลองที่พบ

[พฤติกรรมใน Prototype]
- **สำนวนจำลอง** — `CASES` ใน `assets/ecmis-app.js` พบ id ไม่น้อยกว่า 87 รายการ (นับจากรูปแบบ `NNNN/25XX` ในไฟล์; ตัวเลขนี้เป็นการนับคร่าวๆ [ต้องยืนยัน]) ตัวอย่าง: `0001/2569`, `0005/2569`, `3027/2569` (สำนวนสาธิตของหน้าออกคำสั่ง), `9205/2569`, `9423/2569`, `1119/2565`, `1402/2565`, `1344/2566`, `0012/2565` และชุด `92xx/2569`, `94xx/2569`
- เลขสำนวนใช้ปี พ.ศ. 4 หลัก (`เลข/ปี`)
- **สถานะ** 49 รายการใน `STATUS` และรหัสสถานะ 3 หลักใน `STATUS_CODE` (เช่น `000`) สำหรับเทียบกับ `trr_status` ใน DB
- **เหตุผลตีกลับ** `RETURN_REASONS` 6 รายการ: เอกสาร/พยานหลักฐานไม่ครบถ้วน, ข้อเท็จจริงยังไม่ชัดเจน, ความเห็นข้อกฎหมายไม่ตรงกัน, รูปแบบรายงานไม่ถูกต้อง, เสนอผิดสายงาน/ผิดหน่วยงาน, อื่นๆ
- **ประเภทเอกสาร** `DOC_TYPES`: `213` (รายงานไต่สวนเบื้องต้น ปปท.๒-๑๓, SLA รอลงนาม 5 วัน/ส่งต่อ 3 วัน), `644` (รายงานไต่สวนข้อเท็จจริง ปปท.๖-๔๔, 15/15 วัน), `RULING` (15/15 วัน), `GENERAL` (เรื่องทั่วไป 5/5 วัน) — ตัวเลข SLA อยู่ในโค้ด [ต้องยืนยัน] ว่าถูกต้องตามระเบียบ
- **ตัวเลือกมติ** `RESOLUTIONS` (กลุ่ม): รับไว้ไต่สวน (ม.24 วรรคหนึ่ง ผู้ลงนามเลขาธิการฯ / วรรคสาม ผู้ลงนามประธานฯ), ไม่รับเรื่องไว้พิจารณา (`NOT_ACCEPTED` ม.25/ม.26, `DISMISS`), ข้อกล่าวหาไม่มีมูล (`NO_GROUND`), มติอื่นๆ (`MORE_INVESTIGATE`, `FORWARD`, `OTHER`) พร้อมชื่อแบบเอกสารที่เกี่ยวข้อง และรายการหน่วยปลายทางส่งต่อ (เช่น `NACC` สำนักงาน ป.ป.ช., `SCREENING`, `LEGAL` กองกฎหมาย) นอกจากนี้มีชุดตัวเลือกสั้นอีกชุด (`ACCEPT`, `REJECT`, `DISMISS`) ที่บรรทัดอื่นในไฟล์เดียวกัน [ต้องยืนยัน] ว่าชุดใดเป็นชุดที่ใช้จริง
- **ไฟล์แม่แบบ** ใน `assets/templates/`: memo-7x-* (7 ไฟล์), order-* (6 ไฟล์), tagged-5-01/5-04, และโฟลเดอร์เอกสารอ้างอิงตามชื่อแบบ (ปปท.5-01 … 8-06, ระเบียบวาระการประชุม, หนังสือเชิญประชุม, เอกสารมติ)
- **ข้อมูลตัวอย่างต่อสถานะ** `assets/flow-samples.json` (สร้างเมื่อ 2026-10-28; `overall-flow.js` โหลดไฟล์นี้) เป็นเคสเลข 9801–9850/2569 ที่สร้างด้วย `scripts/seed-flow-samples.mjs` (ตามคำอธิบายในไฟล์: โคลนจากเคสจริงที่มีอยู่แล้วตั้งสถานะตามกล่องในผัง) และอ้าง `tccId`, `trrId` ของแถวใน DB
- **สคริปต์ seed** ใน `scripts/`: `seed-flow-samples.mjs`, `seed-deputy-cases.mjs`, `seed-scenario-cases.mjs`, `sync-board-resolution.mjs`, `backfill-stale-agenda-links.mjs`, `run_pipeline_parallel.py/.sh` — เป็นเครื่องมือของทีมจัดทำ Prototype สำหรับสร้าง/ปรับข้อมูลทดสอบ ยังไม่ได้อ่านเนื้อหาทั้งหมดของแต่ละไฟล์ [ต้องยืนยัน] ว่าสคริปต์เหล่านี้เขียนลง Supabase ใด
- **ข้อมูลหน้า mock** `assets/case-summary-mock-data.js` (ใช้กับ `approval-review-mock-*`)
- **ผู้ใช้/ชื่อบุคคล** ตามหัวข้อ 4.1
- **รายการแจ้งเตือน** `MOCK_NOTIFICATIONS`
- **ข้อมูลหน้าแรกสาธารณะ** (ข่าว ตัวเลข ประกาศ) ฝังใน `index.html`

[ต้องยืนยัน] ข้อมูลใดในชุดนี้มาจากข้อมูลจริงที่ถอดมาจาก DB (เช่น `trrId`/`tccId` ใน flow-samples) และต้องปกปิดก่อนส่งต่อหรือไม่ ไม่ได้ตรวจเนื้อหาข้อมูลส่วนบุคคล

---

## 10. ข้อจำกัดของ Prototype (ตรวจสอบได้จากไฟล์)

**การเชื่อมต่อ/ระบบหลัง**
1. ไม่มี Backend ของตัวเองในโฟลเดอร์ราก; มีเพียงการเรียก Supabase จากหน้าเว็บโดยตรง (หัวข้อ 3.2) พร้อม key ฝังใน client
2. การตรวจสิทธิ์ทำฝั่ง client (`sessionStorage`) เท่านั้น แก้ค่าในเบราว์เซอร์แล้วเข้าหน้าอื่นได้
3. การเข้าสู่ระบบไม่ตรวจรหัสผ่าน; ThaID มีเฉพาะหน้าจอเดโม; ไม่พบ SSO/Single Sign-On จริง
4. ไม่พบการเชื่อมระบบภายนอก: ระบบสารบรรณ (`saraban-no.js` ออกเลขโดยหาเลขสูงสุดของ prefix+ปี ใน `tbl_res_request.trr_resolution_data.sarabanNos` ของ Supabase แล้วบวก 1 ตามคอมเมนต์ในไฟล์ — ไม่ใช่การเชื่อมระบบสารบรรณ และอาจซ้ำกันได้เมื่อมีหลายคนออกเลขพร้อมกัน [ต้องยืนยัน]), e-Meeting, อีเมล/SMS, ระบบ กจ.5/กจ.8, ป.ป.ช., PKI/ลายเซ็นดิจิทัลจริง (`SignatureStore` ระบุในโค้ดว่าเป็น mock)
5. การแจ้งเตือนเป็นข้อมูลจำลอง (`MOCK_NOTIFICATIONS`) — ไม่พบการส่งแจ้งเตือนจริง
6. ไม่พบการอัปโหลดไฟล์ไป storage จริง ยกเว้นตาราง `tbl_res_attachment` (บันทึกข้อมูลไฟล์แนบ) [ต้องยืนยัน] ว่าเก็บตัวไฟล์ที่ใด

**การเก็บข้อมูล**
7. ข้อมูลที่ไม่ได้ถูกเขียนลง Supabase เก็บใน `sessionStorage` จึงหายเมื่อปิดแท็บ
8. ข้อมูลสำนวนจำลองกับข้อมูลจาก DB ถูกผสมกันในฝั่งหน้าเว็บ ผลที่เห็นอาจต่างกันตามเครือข่ายและเวอร์ชัน cache (`CASES_VERSION`)

**ฟังก์ชันที่ทำไม่ครบหรือยังไม่ได้ทดสอบ**
9. Live-doc (จอแบ่งสองฝั่ง) — ผูกฟิลด์และทดสอบสำเร็จกับหลายหน้า ยกเว้น
   - `ruling-report.html` — ฟอร์มซ่อนในบทบาท/สถานะที่ทดสอบ ยืนยันเฉพาะฟอร์ม → เอกสาร
   - `affairs-case-detail.html` — ไม่มีสำนวนในข้อมูลจำลองที่เปิดหน้านี้ได้ จึงไม่ได้ทดสอบ
   - `urgent-agenda.html` — ผูกเฉพาะขั้นรับรอง ไม่ได้ทดสอบโดยตรง
   - `chairman.html`, `chairman-agenda.html`, `board-detail.html` — ยังไม่ได้ผูกฟิลด์ฟอร์มกับเอกสาร
10. คำ "ตีกลับ" ถูกเปลี่ยนเป็น "ปฏิเสธการรับ" ทั้งหมดตามเอกสารกระบวนการ (RES035/139/222) โดยไม่แยกกรณี บางจุดที่เป็นการส่งกลับภายในอาจไม่ควรเปลี่ยนคำ [ต้องยืนยัน]
11. ข้อความ "ส่ง ป.ป.ช." ปรากฏหลายแห่ง (นับได้ 42 แห่ง) ยังไม่ปรับเพราะเอกสารยังไม่สรุป [ต้องยืนยัน]
12. ปุ่ม/การกระทำที่สร้างด้วย JavaScript ตามสถานะ ยังไม่ได้ไล่ทดสอบรายปุ่มทุกบทบาท ทุกสถานะ
13. หน้าส่วนหนึ่งเป็นรูปแบบเดิม (ดูหัวข้อ 6) ที่อาจไม่สอดคล้องกับหน้าหลักปัจจุบัน
14. `index.html` และ `login.html` อ้างไฟล์ `../*.js` ที่ไม่พบ

**สภาพแวดล้อม**
15. ต้องเปิดผ่าน HTTP server (ไม่ใช่ `file://`) เพราะมี `fetch` แม่แบบและโหลดสคริปต์แบบไดนามิก
16. ต้องมีอินเทอร์เน็ตเพื่อโหลดไลบรารี/ฟอนต์จาก CDN และเพื่อให้ Supabase ทำงาน
17. ออกแบบสำหรับจอกว้าง (จอแบ่งสองฝั่งเปิดใช้เมื่อกว้างกว่า 1,100 px) ยังไม่ได้ตรวจรองรับมือถือครบทุกหน้า

---

## 11. รายการที่ต้องยืนยันก่อนพัฒนาระบบจริง [ต้องยืนยัน]

**ก. กฎธุรกิจ**
- [ ] เงื่อนไขการเปลี่ยนสถานะ (49 สถานะใน `STATUS`/`TRANSITIONS`) ครบและถูกต้องหรือไม่ ใครเปลี่ยนได้ในขั้นใด
- [ ] SLA (5/3/15 วัน), การนับวันทำการ (`businessDaysBetween`, วันหยุด), วิธีคำนวณ "เกินกำหนด"
- [ ] เกณฑ์ "ซับซ้อน/เร่งด่วน (72 ชม.)" และด่านรับรอง ผอ.กบค. → เลขาธิการยืนยัน
- [ ] เงื่อนไขสาย 7.1 / 7.2 / 7.3 และการวนรอบ (`RoundStore` ม.24 วรรคท้าย)
- [ ] องค์ประชุม การลงมติ การออกเสียงเห็นแย้ง
- [ ] ถ้อยคำ "ปฏิเสธการรับ" เทียบ "ตีกลับ" และ "ส่ง ป.ป.ช."
- [ ] โครงสร้างกระบวนการตามเอกสาร 12/11/2569 (ข้อ 3.2 กองปราบ, 6.1/6.3, 7.1.3) — หน้า `business-flow.html` อยู่ในโฟลเดอร์ Option A/B ไม่ใช่โฟลเดอร์รากนี้ และไม่ได้ตรวจในรอบนี้ว่าตรงกับเอกสารหรือไม่

**ข. สิทธิ์ผู้ใช้**
- [ ] นิยามบทบาทและ `perms` ทั้งหมด รวมบทบาทที่มีใน `PAGE_PERMISSIONS` แต่ไม่ได้เปิดให้ล็อกอิน (owner, director, section_head, legal, admin, board_ex, sup_chair, sup_sec, sup_asst)
- [ ] ขอบเขต "เห็นสำนวนของตนเอง" (`view.assigned`) vs "เห็นทั้งหมด" (`view.all`)
- [ ] ความไม่สอดคล้องของเมนูทะเบียนวาระเทียบสิทธิ์หน้า (หัวข้อ 5.3)
- [ ] การรักษาความลับสำนวน (`secrecy.set`) และการซ่อนข้อมูล

**ค. การตรวจสอบข้อมูล (Validation)**
- [ ] ฟิลด์บังคับ รูปแบบเลข (เลขสำนวน เลขหนังสือ เลขทะเบียนคุม) และการออกเลขอัตโนมัติ
- [ ] ข้อจำกัดไฟล์แนบ (ชนิด/ขนาด/จำนวน), การลบ/แก้ไฟล์ที่ลงนามแล้ว
- [ ] การเปลี่ยนเลขปี พ.ศ./ค.ศ. ในฐานข้อมูล (โค้ดมีการแปลงวันที่ ค.ศ. ↔ พ.ศ.)

**ง. ฐานข้อมูลและ API**
- [ ] Schema จริงของตารางที่ใช้ (หัวข้อ 3.2) เทียบกับ ER/Class Diagram ใน `docs/`
- [ ] ใครเป็นเจ้าของ Supabase นี้ เป็นสภาพแวดล้อมใด RLS/สิทธิ์ของ key ฝังในหน้า
- [ ] ระบบจริงจะใช้ Supabase ต่อ หรือมี API/Backend อื่น (ไม่พบข้อกำหนดในไฟล์)
- [ ] ที่เก็บไฟล์แนบ/PDF/เอกสารที่สร้างและการเก็บลายเซ็น
- [ ] ที่มาของข้อมูล Dashboard และตัวชี้วัด

**จ. ระบบภายนอก**
- [ ] การยืนยันตัวตน: ThaID / SSO / ระบบผู้ใช้เดิมของ ป.ป.ท.
- [ ] ลายเซ็นดิจิทัล/PKI และรูปแบบลงนามจริง (ลายมือ/ดิจิทัล)
- [ ] ระบบสารบรรณ (เลขหนังสือ), e-Meeting, อีเมล/แจ้งเตือน
- [ ] การรับ/ส่งข้อมูลกับ กจ.5, กจ.8 (ม.38), ป.ป.ช.
- [ ] hub ภายนอกที่ `shared-auth/shared-handoff/shared-junctions` อ้างถึง

**ฉ. เอกสารและการส่งออก**
- [ ] ให้ระบบสร้างเอกสารจากแม่แบบ `.docx` จริงฝั่ง server หรือใช้การส่งออก HTML→Word แบบปัจจุบัน
- [ ] การพิมพ์/PDF A4 (ขอบ ฟอนต์ ลายน้ำ) ตามระเบียบ

**ช. ความเป็นส่วนตัวและความปลอดภัย**
- [ ] ข้อมูลใน `flow-samples.json` / `CASES` ที่อาจมาจากข้อมูลจริง
- [ ] การนำ key ออกจากโค้ดหน้าเว็บ

---

## 12. ข้อเสนอแนะ [ข้อเสนอแนะ — ไม่ใช่ข้อกำหนด]

1. ใช้ Prototype เป็นแบบอ้างอิงหน้าจอและลำดับขั้น ไม่ใช้เป็นฐานโค้ดตรงๆ (ตรรกะธุรกิจ สิทธิ์ และการเขียน DB อยู่ปนกับ UI ในไฟล์ HTML และ `ecmis-app.js` ขนาดใหญ่)
2. ย้ายกติกาสถานะ (`STATUS`/`TRANSITIONS`), SLA และสิทธิ์ ไปไว้ฝั่ง server และตรวจซ้ำที่นั่น
3. ปฏิบัติต่อรหัสผ่าน/ลายเซ็น/ThaID เป็นงานใหม่ทั้งหมด เพราะ Prototype ไม่มีของจริงให้เทียบ
4. ก่อนส่งต่อภายนอก ควรเปลี่ยน key Supabase ที่ฝังในหน้าและตรวจว่ามีข้อมูลจริงอยู่ใน DB เดียวกันหรือไม่
5. ให้ทีมเลือกหน้าหลักระหว่างคู่ไฟล์ "หน้าเดิม" กับ "หน้าใหม่" (หัวข้อ 6) เพื่อลดงานซ้ำ
6. ใช้เอกสารใน `docs/` (User Flow, Data Flow, ER) เทียบกับหัวข้อ 5 และ 3.2 ก่อนสรุป API
7. ถ้าจะพัฒนาหน้า Dashboard/รายงาน ให้ยืนยันนิยามตัวชี้วัดกับเจ้าของงานก่อน

---

## 13. ไฟล์ที่ตรวจสอบเพื่อจัดทำเอกสารนี้

- หน้าจอ HTML ในโฟลเดอร์ราก 52 ไฟล์ (อ่านด้วยสคริปต์ดึง `<title>`, ลิงก์ `.html`, ปุ่ม, สคริปต์ที่โหลด, การเรียก storage/fetch/Supabase และเทียบความต่างด้วย `diff`)
- `assets/ecmis-app.js` (อ่านส่วน `ROLES`, `DOC_TYPES`, `STATUS`, `CASES`, `PAGE_PERMISSIONS`, `LOGIN_ALLOWED_ROLE_IDS`, `homeHref`, เมนู NAV, `renderShell`, `getSupabaseClient`, `logRequestEvent`, `cacheLiveCases`, `exportDocToDocx`)
- `assets/ecmis-model.js`, `assets/flow-samples.json` (ส่วนต้น), `assets/templates/` (รายชื่อไฟล์), รายชื่อไฟล์ใน `assets/`
- `.claude/launch.json`, `.gitignore`, `README.md` เดิม, `FLOW.md`, `prototype/README.md`, โครงสร้างโฟลเดอร์ `docs/`, `scripts/`, `prototype/`
- ผลทดสอบเบราว์เซอร์ของ Live-doc รอบก่อนหน้า (ทำก่อน merge)

**ไม่ได้ตรวจ:** เนื้อหาภายในไฟล์ใน `docs/`, ไฟล์ `.docx` แม่แบบ, ข้อมูลจริงใน Supabase, การทำงานเมื่อออฟไลน์ครบทุกหน้า, การกดทดสอบปุ่มทุกปุ่มทุกบทบาท
