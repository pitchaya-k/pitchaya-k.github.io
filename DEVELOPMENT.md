# คู่มือพัฒนาต่อ (Developer Guide) — E-CMIS กิจกรรมที่ 7 Prototype

ไฟล์นี้บอก **โครงสร้าง กระบวนการทำงาน และวิธีทำงานต่อ** ใช้คู่กับ [README.md](README.md) (รายละเอียดรายหน้า/สิทธิ์/ข้อมูลที่ต้องยืนยัน)
ข้อความทุกข้อมาจากไฟล์ที่ตรวจ ส่วนที่ไม่ได้ตรวจระบุว่า "ต้องยืนยัน"

---

## 1. Branch

`temp1` ถูก merge เข้า `main` แบบ fast-forward แล้ว (HEAD `0afb372` "13112026") ให้พัฒนาต่อบน `main` ไม่ต้องใช้ `temp1` อีก (ยังมี branch อยู่ ลบได้เมื่อไม่ใช้)

สิ่งที่ commit นั้นเพิ่ม: จอแบ่งสองฝั่ง (ฟอร์มซ้าย/เอกสารขวา sync กัน) บน 23 หน้า, คำ "ปฏิเสธการรับ" แทน "ตีกลับ", ปรับ Option A/B

---

## 2. โครงสร้างโปรเจกต์

```
pitchaya-k.github.io/
├── *.html                  หน้าจอ 52 ไฟล์ (Multi-page, ไม่ใช่ SPA)
├── assets/
│   ├── ecmis-app.js        แกนหลัก ~9,700 บรรทัด: ROLES, DOC_TYPES, STATUS, TRANSITIONS, CASES (ข้อมูลจำลอง),
│   │                       PAGE_PERMISSIONS, เมนู, renderShell, Supabase, mergeField, initDocEditor, export
│   ├── ecmis-model.js      CaseStore / StatusStore / RoundStore / SignatureStore (โหลดหลัง ecmis-app.js)
│   ├── ecmis-livedoc.js/.css   กลไกจอแบ่งสองฝั่ง
│   ├── agenda-registry-data.js, case-closure.js, saraban-no.js, resolution-split.js,
│   │   case-summary-*.js, secgen-route-text.js, junction-bridge-a7.js, report-export.js, order-memo-docs.js
│   ├── dashboard-{analytics,chart,export}-service.js
│   ├── templates/          แม่แบบ .docx    flow-samples.json  ข้อมูลตัวอย่างต่อสถานะ
├── scripts/                seed/backfill (.mjs, .py, .sh)  — เครื่องมือเตรียมข้อมูลทดสอบ
├── A7-Option-A-03112026/, A7-Option-B-03112026/   สำเนา Prototype แบบ Option A/B
├── docs/, prototype/, commit-c64-summary/          เอกสารอ้างอิงและภาพหน้าจอ
├── graphify-out/           กราฟความรู้ของโค้ด (ดูข้อ 7)
└── .claude/launch.json     dev server
```

Option A/B มีไฟล์ HTML ชุดเดียวกับรากเกือบทั้งหมด เพิ่ม `business-flow.html` และ `report-07.html` (ไม่มีในราก) และมี README ของตัวเอง

---

## 3. กระบวนการทำงานของระบบ (ตามโค้ด)

### 3.1 ลำดับตั้งแต่เปิดเว็บ
1. `login.html` → ตรวจ username ใน `LOGIN_ALLOWED_ROLE_IDS` (10 บทบาท), ไม่ตรวจรหัสผ่าน → ตั้ง `sessionStorage.ecmis_authed / ecmis_role / ecmis_username` → ไป `ECMIS.homeHref(role)`
2. ทุกหน้าเรียก `ECMIS.renderShell('<ชื่อไฟล์>.html')` เป็นอย่างแรกใน `<script>`:
   - ไม่ล็อกอิน → redirect `login.html`
   - `canAccessPage(หน้า, role)` เทียบ `PAGE_PERMISSIONS` → ไม่มีสิทธิ์ = toast + redirect หน้าแรก
   - วาด Topbar + Sidebar (เมนูจากอาร์เรย์ NAV กรองตามบทบาท) และตัวสลับบทบาท `#a7RoleSelect`
3. หน้ารายการ (inbox) ใช้ `inboxFor(role)` → คลิกแถว → หน้ารายละเอียด `?case=<เลข/ปี>`
4. หน้ารายละเอียดอ่านสำนวนด้วย `ECMIS.getCase()/requireCase()` หรือดึงจาก Supabase (`loadCaseFromSupabase` → `supabaseRowToCase`) แล้ว render ฟอร์ม + เอกสาร A4
5. กดบันทึก/ลงนาม/ตีกลับ → ตรวจ `canTransition(from,to,kase)` (`TRANSITIONS`) → เปลี่ยน `kase.status`
   - เขียน `CASES` (`ECMIS.Model.CaseStore.update` → `saveCases` → sessionStorage)
   - เขียน Supabase (`tbl_res_request` ฯลฯ) และ audit `logRequestEvent` → `tbl_res_request_event`
   - ส่วนใหญ่กลับหน้าแรก (`location.href = ECMIS.homeHref(role.id)` หรือ `ECMIS.goAfterSaves(...)` ที่รอการบันทึกค้างสูงสุด 3 วินาที)

### 3.2 โมเดลสถานะ
- `STATUS` 49 สถานะ (`label`, `cls`, `owner`, `scope`), เช่น `PENDING_DEPUTY` → `PENDING_SECGEN` → …
- `TRANSITIONS`: `{ from, to, event, actor, ref, guard(k), note }` — **การเพิ่ม/แก้ขั้นตอนทำที่นี่**
- `STATUS_CODE` แปลงชื่อสถานะ ↔ รหัส 3 หลักของคอลัมน์ `trr_status` ใน DB
- สาย 7.1 / 7.2 / 7.3 แยกด้วย `procType` และ `isCase72()/isCase73()`

### 3.3 สองแหล่งข้อมูลซ้อนกัน (สำคัญ)
- `CASES` ข้อมูลจำลองในโค้ด + `CASES_VERSION` (เปลี่ยนค่านี้เมื่อแก้โครงสร้าง `CASES` ไม่งั้น sessionStorage เก่าทับ)
- แถวจาก Supabase แคชเป็น `ecmis_live_cases` และผสมเข้า `CASES` (`cacheLiveCases`)
- ผลที่เห็นจึงต่างกันตามเครือข่ายและ cache — เวลาแก้บั๊กให้ล้าง sessionStorage/localStorage ก่อนทดสอบ

### 3.4 เอกสาร (A4) และการส่งออก
- เทมเพลตเอกสารในหน้าสร้าง HTML ด้วยฟังก์ชันของหน้า แล้วใส่ค่าด้วย `ECMIS.mergeField(value, placeholder)` (เพิ่มพารามิเตอร์ที่ 3 `controlId`)
- `ECMIS.initDocEditor(opts)` จัดการแท็บเอกสาร, แก้ไขเอกสาร, ซูม, ดูทีละหน้า/ต่อเนื่อง, พิมพ์, ส่งออก
- ส่งออก DOCX = `exportDocToDocx` แปลง HTML เป็น Word ฝั่ง browser, PDF = `html2pdf`
- แม่แบบ `.docx` ใน `assets/templates/` ถูก `fetch` โดย `order*`, `resolution*`, `board-resolution` (ต้องเปิดผ่าน HTTP)

### 3.5 จอแบ่งสองฝั่ง 
- ผูกช่องฟอร์มกับจุดในเอกสารด้วย `data-bind="<id ช่องฟอร์ม>"` ผ่าน `mergeField(ค่า, ข้อความว่าง, 'idช่อง')`
- ช่องข้อความ: พิมพ์ในเอกสาร → เขียนกลับช่องฟอร์ม (แปลงเลขไทย→อารบิก, คืนตำแหน่งเคอร์เซอร์); วันที่/select/radio: คลิกในเอกสารเพื่อเลื่อนไปช่องฟอร์ม
- ฟอร์มยังเป็นต้นทางข้อมูล, ไม่ผูก = พฤติกรรมเดิมของหน้า
- API: `ECMISLiveDoc.init / decorate / controlFor / bindNodes`

---

## 4. วิธีรันและทดสอบ

```bash
# ในโฟลเดอร์โปรเจกต์ (ต้องใช้ HTTP ไม่ใช่ file://)
python -m http.server 8765 --bind 127.0.0.1
# เปิด http://127.0.0.1:8765/login.html  (หรือใช้ชื่อ "ecmis-static" ใน .claude/launch.json)
```

- เข้าระบบ: ปุ่มลัดบทบาทในหน้า login หรือใช้ username ตาราง README 4.1 กับรหัสผ่านอะไรก็ได้
- ทดสอบหน้าเอกสาร: ใช้ `?case=` เช่น `9205/2569` (approval-review), `3027/2569` (order), `?meet=4` (meeting-docs)
- เครื่องต้องต่ออินเทอร์เน็ต (CDN + Supabase) — **ระวังการกดบันทึก: ถ้าเข้าถึง Supabase ได้ จะเขียนข้อมูลจริง** (README 3.2) ถ้าต้องการทดสอบแบบไม่เขียน ให้บล็อกคำขอ POST/PATCH/PUT/DELETE ไปยังโดเมน Supabase ใน DevTools (ทีมเคยทำแบบนี้ตอนถ่ายภาพหน้าจอ ตาม `prototype/README.md`)
- ไม่พบชุดทดสอบอัตโนมัติ (unit/e2e) ในรีโป [ต้องยืนยัน] — การทดสอบ sync ที่ผ่านมาใช้สคริปต์ชั่วคราวนอกรีโป

---

## 5. สูตรงานที่ทำบ่อย

### 5.1 เพิ่มหน้าจอใหม่
1. คัดลอกหน้าที่คล้ายกัน (head: Bootstrap/SweetAlert2/Supabase CDN + `assets/ecmis-app.css`; ท้ายไฟล์: `assets/ecmis-app.js?v=…`, `ecmis-model.js`)
2. เรียก `ECMIS.renderShell('ชื่อไฟล์.html')` ต้นสคริปต์
3. เพิ่มแถวใน `PAGE_PERMISSIONS` (ไม่ใส่ = ทุกบทบาทที่ล็อกอินเข้าได้ ไม่ใช่ปิด)
4. ถ้าต้องมีเมนู: เพิ่มใน NAV (ใกล้บรรทัด ~4724 ของ `ecmis-app.js`) พร้อมเงื่อนไข `visible`
5. ถ้าเป็นหน้าแรกของบทบาท: แก้ `homeHref`
6. ถ้าเปิดจากแถวสำนวน: แก้ตัวสร้างลิงก์ในหน้ารายการ

### 5.2 เพิ่ม/แก้ขั้นตอนสถานะ
เพิ่ม `STATUS` + `STATUS_CODE` (ถ้าต้องบันทึกลง DB) + แถวใน `TRANSITIONS` (ระบุ `actor`, `guard`) แล้วแก้หน้าที่เกี่ยวข้องให้เรียก `canTransition`/`updateCaseStatus` และ `logRequestEvent`

### 5.3 ผูกฟิลด์ฟอร์มกับเอกสาร
ในเทมเพลตเอกสารของหน้า เปลี่ยน `M(value, 'ข้อความว่าง')` เป็น `M(value, 'ข้อความว่าง', 'id ของ input/textarea/select')` หน้าต้องโหลด `assets/ecmis-livedoc.css/.js` และมี `.ws-doc-pane` ตัวอย่างที่ผูกแล้ว: `approval-review.html`, `order.html`, `board-resolution.html`

### 5.4 แก้ `ecmis-app.js` / assets
- เปลี่ยนค่า `?v=` ของสคริปต์ในหน้า HTML ทุกครั้งที่แก้ไฟล์ asset (ไม่งั้น browser ใช้ไฟล์เก่า)
- แก้โครงสร้าง `CASES` → เพิ่ม `CASES_VERSION`

### 5.5 ซิงก์ Option A/B
Option A/B เป็นสำเนา ไม่ได้เชื่อมอัตโนมัติ — หลังแก้ในรากต้องคัดลอกไฟล์ที่เปลี่ยน (HTML + `assets/`) ไปทั้งสองโฟลเดอร์ด้วยมือ/สคริปต์ [ต้องยืนยัน] ว่าจะคงรูปแบบสำเนาต่อหรือรวมเป็นชุดเดียว

---

## 6. ข้อควรระวัง (พบในโค้ด)

1. key และ URL Supabase ฝังในหน้าเว็บ (`ecmis-app.js` และหลายหน้า HTML) — ห้ามเผยแพร่ต่อสาธารณะก่อนยืนยันสภาพแวดล้อม
2. การตรวจสิทธิ์อยู่ฝั่ง client เท่านั้น
3. ตรรกะธุรกิจ สถานะ และ SLA ปนอยู่ในไฟล์เดียว (`ecmis-app.js`) และในสคริปต์ของแต่ละหน้า — ก่อนย้ายไประบบจริงต้องแยกออกไปฝั่ง server
4. `index.html`/`login.html` อ้างไฟล์ `../cases.js`, `../shared-*.js` ที่ไม่มีในโฟลเดอร์
5. คู่ไฟล์ "หน้าเดิม/หน้าใหม่" ซ้ำซ้อน (README หัวข้อ 6) — แก้ผิดไฟล์ได้ง่าย เช็กเมนู/`overall-flow.html` ก่อนว่าใช้ไฟล์ไหน
6. ฟอร์มในหน้าที่แก้ผ่าน sync ต้องคงชื่อ id เดิม ถ้าเปลี่ยน id ต้องเปลี่ยนพารามิเตอร์ `controlId` ตามด้วย

---

## 7. ใช้ graphify ค้นโค้ด (ตาม CLAUDE.md ของโปรเจกต์)

```bash
graphify query "<คำถามเกี่ยวกับโค้ด>"      # ก่อน grep หรืออ่านไฟล์ดิบ
graphify path "<A>" "<B>"                  # ความสัมพันธ์ระหว่างสองจุด
graphify explain "<แนวคิด>"
graphify update .                          # หลังแก้โค้ด (AST ล้วน ไม่มีค่า API)
```

ไฟล์ `graphify-out/GRAPH_REPORT.md` ใช้เมื่อต้องการภาพสถาปัตยกรรมกว้างเท่านั้น

---

## 8. สิ่งที่ยังไม่ทราบ (ต้องยืนยันก่อนพัฒนาต่อ)

ดูรายการเต็มใน [README.md](README.md) หัวข้อ 11 ที่สำคัญสุด: (1) Supabase นี้เป็น staging หรือ production และมี RLS หรือไม่, (2) ระบบจริงจะมี Backend/API แยกหรือใช้ Supabase ต่อ, (3) กฎสถานะ/SLA/สิทธิ์ที่ถูกต้อง, (4) ใช้ branch ใดเป็นฐาน และคงโครงสร้างสำเนา Option A/B หรือไม่
