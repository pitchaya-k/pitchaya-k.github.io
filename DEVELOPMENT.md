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
├── *.html                  หน้าจอ 54 ไฟล์ (Multi-page, ไม่ใช่ SPA)
├── assets/
│   ├── ecmis-app.js        แกนหลัก ~9,700 บรรทัด: ROLES, DOC_TYPES, STATUS, TRANSITIONS, CASES (ข้อมูลจำลอง),
│   │                       PAGE_PERMISSIONS, เมนู, renderShell, Supabase, mergeField, initDocEditor, export
│   ├── ecmis-model.js      CaseStore / StatusStore / RoundStore / SignatureStore (โหลดหลัง ecmis-app.js)
│   ├── ecmis-livedoc.js/.css   กลไกจอแบ่งสองฝั่ง
│   ├── agenda-registry-data.js, case-closure.js, saraban-no.js, resolution-split.js,
│   │   case-summary-*.js, secgen-route-text.js, junction-bridge-a7.js, report-export.js, order-memo-docs.js
│   ├── dashboard-{analytics,chart,export}-service.js
│   ├── a7-option.js        ค่า Option ของชุดไฟล์ ('AB' / 'A' / 'B') — ห้ามคัดลอกทับระหว่างโฟลเดอร์
│   ├── saraban-docs.js     รายการเอกสารขอเลข + การ์ด/หน้าต่างขอเลขสารบรรณ (ข้อ 5.6)
│   ├── vendor/             ไลบรารี ฟอนต์ ไอคอน สำหรับเปิดออฟไลน์ (ข้อ 5.7)
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
- เปิดหน้าได้โดยไม่ต้องต่ออินเทอร์เน็ต (ไลบรารีอยู่ใน `assets/vendor/`) แต่ข้อมูลจาก Supabase ต้องต่ออินเทอร์เน็ต — **ระวังการกดบันทึก: ถ้าเข้าถึง Supabase ได้ จะเขียนข้อมูลจริง** (README 3.2) ถ้าต้องการทดสอบแบบไม่เขียน ให้บล็อกคำขอ POST/PATCH/PUT/DELETE ไปยังโดเมน Supabase ใน DevTools (ทีมเคยทำแบบนี้ตอนถ่ายภาพหน้าจอ ตาม `prototype/README.md`)
- ไม่พบชุดทดสอบอัตโนมัติ (unit/e2e) ในรีโป [ต้องยืนยัน] — การทดสอบที่ผ่านมาใช้สคริปต์ชั่วคราวนอกรีโป (ข้อ 5.9)
- ทดลองเดินตาม User Flow: ใช้ไฟล์ขั้นตอนการกด (ข้อ 5.9) สลับบทบาทระหว่างทางที่ช่อง "สิทธิ์การทำงาน" มุมขวาบน
- เล่นเรื่องเดิมซ้ำ: บนหน้าของเรื่องกด R สามครั้งภายใน 1.5 วินาที (`openResetCaseDialog` → กลับไปขั้นรองเลขาธิการฯ) · กด K สามครั้ง = สลับสาย 7.1/7.2/7.3 (`openSwitchLineDialog`) — ทั้งสองเขียนฐานข้อมูลร่วม และมีรายการเรื่องที่ห้ามรีเซ็ต (`RESET_PROTECTED_CASES`)

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
ไฟล์เดียวที่ต้องต่างกันระหว่างโฟลเดอร์คือ `assets/a7-option.js` (`'AB'` ราก · `'A'` · `'B'`) และ `business-flow.html` / `report-07.html` ที่มีเฉพาะในโฟลเดอร์ Option — ห้ามคัดลอก `a7-option.js` ทับ

### 5.6 เลขหนังสือสารบรรณ (ปรับ 21/11/2569)
- รายการเอกสารที่ต้องขอเลข 18 รายการ (Option A 16 · Option B 18) อยู่ใน `SARABAN_DOCS` ของ `assets/saraban-docs.js` ตาม Check List สารบรรณ x Process 20/11/2569 พร้อมแฟ้มทะเบียนส่ง (ปป 0004 / .3 / .5 / ว / ป)
- การ์ด "เลขหนังสือของขั้นนี้" = `ECMIS.mountSarabanDocs({ host, kase | kases, group, codes, inputs, readonly, onChange })` ใช้ใน ruling-report, order, board-resolution, resolution-72, meeting-report, meeting-docs
- ลำดับในการ์ด: ขอเลข (หน้าต่าง 4 ขั้นตาม wireframe W1) → แนบไฟล์ฉบับลงนาม → ส่งต่อในระบบสารบรรณ หรือส่งไปรษณีย์ (EMS) → ปิดเรื่อง · กันเลขซ้ำด้วยรหัสอ้างอิง `E-CMIS|สำนวน|ขั้น|slot|vN` ใน doc_detail
- ระบบงานสารบรรณ สำนักงาน ป.ป.ท. (e-office) ยังเป็นตัวจำลอง — สลับสถานะ API (ปกติ / 408 / 503) ได้ที่หน้า `number-registry.html` · ข้อมูลเก็บที่ `trr_resolution_data.sarabanNos[slot]` เหมือน Task 300 (เคสที่ไม่มี trr_id เก็บใน sessionStorage)
- ช่องเลขสารบรรณแบบเดิม (Task 300) ยังปิดอยู่ (`SARABAN_UI_ENABLED = false`) เพื่อไม่ให้ซ้ำกับการ์ด
- ต่อ API จริง: แทน `issueSarabanNo` / `checkPending` ใน saraban-docs.js ด้วยการเรียก Open API (POST …/1.0/document/internal) และค้นเอกสารด้วยรหัสอ้างอิงก่อนลองใหม่

### 5.7 เปิดแบบออฟไลน์
ไลบรารีและฟอนต์ทั้งหมดอยู่ใน `assets/vendor/` (เวอร์ชันใน `assets/vendor/VERSIONS.json`) — หน้าใหม่ให้อ้าง `assets/vendor/...` แทน CDN · ข้อมูลจาก Supabase ยังต้องใช้อินเทอร์เน็ต ถ้าไม่มีเน็ตจะใช้ข้อมูลจำลองใน `CASES`

### 5.8 หน้าจอขั้น 6.4 รายงานการไต่สวนเพิ่มเติม (Option B, เพิ่ม 21/11/2569)

- หน้า `additional-inquiry.html` (มีในราก และ `A7-Option-B-03112026/` เท่านั้น — Option A ไม่มีขั้นนี้ เมนูซ่อนตาม `window.ECMIS_A7_OPTION`)
- ที่มา: User Flow V1.0.14 Option B หน้า 6-4 (RES217 จัดทำรายงานการไต่สวนเพิ่มเติมตามมติ → RES218 ส่งเอกสารให้ผู้รับผิดชอบสำนวน → สิ้นสุด), เล่ม 4.1 Option B (ไม่เกิน 15 วัน), DFD L2 B หน้า 4/4
- ผู้จัดทำ: `affairs` (กลุ่มงานกิจการคณะกรรมการ) · `board_sec`, `case_admin` ดูได้อย่างเดียว
- เรื่องที่เข้าขั้นนี้: เรื่องทั่วไป (`isCase73`) ที่สถานะ RESOLVED_PENDING / RESOLVED / DISPATCHING / CLOSED — กลุ่มงานกิจการเลือกเรื่องเองเพราะมติเรื่องทั่วไปเป็นข้อความอิสระ
- **ไม่เปลี่ยนสถานะสำนวน** (ไม่แตะ TRANSITIONS / STATUS_CODE) เก็บความคืบหน้าใน `trr_resolution_data.additionalInquiry` {status DRAFT|SENT, issues, evidence, opinion, dueDays, note, docs, startedAt, sentAt, sentBy, to} และบันทึกเหตุการณ์ `ADDITIONAL_INQUIRY_SENT`
- ไม่ขอเลขสารบรรณ (ไม่อยู่ใน Check List สารบรรณ x Process) · ช่อง "ระยะเวลาให้รายงานผลกลับ" เป็นข้อสมมติ รอยืนยัน
- หน้าตาใช้โครงเดียวกับ `affairs-opinion.html` (แถบขั้นตอน + การ์ดซ้าย + เอกสาร A4 ขวา + แถบปุ่มล่าง) ตรวจค่า CSS เทียบกันแล้วตรงกัน

### 5.9 ทดสอบตาม User Flow และไฟล์ขั้นตอนการกด (22/11/2569)
- คู่มือการกด: `../06 ต้นแบบ Prototype/กิจกรรมที่ 7 ขั้นตอนการกดต้นแบบตาม User Flow V1.0.14_22112026.xlsx` (นอกโปรเจกต์) — 27 หน้าผัง 66 ขั้น บอกบทบาท เมนู เลขสำนวน ปุ่มที่กด ผลที่ควรเห็น และภาพหน้าจอที่ตีกรอบแดงตรงปุ่ม
- วิธีตรวจที่ใช้: Playwright (Python) + Microsoft Edge แบบ headless · ตั้ง `sessionStorage` บทบาทเอง · route ดักคำขอ `POST/PATCH/PUT/DELETE` ไปโดเมน Supabase แล้วตอบ `200 []` (ไม่มีข้อมูลเปลี่ยน) · เปิดหน้า → เทียบข้อความ/ปุ่มที่คาดไว้ → ถ่ายภาพ
- ผล 22/11/2569: ผ่าน 65 ขั้น · 1 ขั้นตรวจจากโค้ด (หน้า 3-4 ไม่มีเรื่องค้างในสถานะนั้น) · จุดที่ต้นแบบต่างจากผังอยู่ใน README หัวข้อ 11
- สคริปต์ (`walk_data.py` ขั้นตอน, `verify_walk.py` ตรวจ+ถ่ายภาพ, `build_xlsx.py` สร้าง Excel) อยู่ในโฟลเดอร์ชั่วคราวของเครื่องที่ทำงาน ยังไม่ได้เก็บเข้ารีโป [ต้องยืนยัน] ว่าจะเก็บไว้ที่ `tests/` หรือไม่
- เมื่อแก้หน้า/ปุ่ม ให้ตรวจซ้ำและอัปเดตไฟล์ขั้นตอนการกด เพราะเลขสำนวนตัวอย่างอิงสถานะในฐานข้อมูลร่วม ณ วันที่ตรวจ

### 5.11 Live-doc ตาม sample-livedoc (เพิ่ม 22/11/2569)
อ้างอิง `09 อ้างอิง/00 template/sample-livedoc` (ก5 รายงาน 213) · ทำใน `assets/ecmis-livedoc.js/.css` ทำงานทุกหน้าที่โหลด livedoc (24 หน้า) โดยไม่ต้องแก้หน้า
- **เก็บข้อความที่แก้ทั้งเอกสาร (mergeBound):** กด "แก้ไขเอกสาร" → แก้ → "บันทึกการแก้ไข" แล้วพิมพ์ในฟอร์มต่อ ข้อความที่แก้ยังอยู่ ส่วนค่าที่ผูก (`data-bind`) อัปเดตตามฟอร์ม · แถบซิงก์แสดง "ใช้ข้อความที่แก้ทั้งเอกสาร" + ปุ่ม "คืนเอกสารตามแบบ" · เก็บใน sessionStorage `ecmis.livedoc.edit::<หน้า?พารามิเตอร์>::<แท็บเอกสาร>` (ไม่เขียนฐานข้อมูล — ถ้าหน้ามี `onSave` ของตัวเอง หน้าเป็นผู้บันทึก)
- **ป้ายความครบของแต่ละการ์ด:** ✓ ครบ / ◐ กรอกบางส่วน n/m / ○ ยังไม่ครบ / ไม่บังคับ / ข้อมูลจากระบบ / ดูอย่างเดียว · ช่องบังคับ = `[required]` หรือ label `.field-req` · ข้อความป้ายมาจาก CSS `attr(data-label)` จึงไม่เปลี่ยนข้อความหัวการ์ดที่ `initCardCollapse` ใช้เป็น key
- **แถบเครื่องมือบนฟอร์ม:** จำนวนส่วนที่กรอกช่องบังคับครบ + "ตรวจสอบความครบ" (ขยายการ์ด ไฮไลต์ช่องว่าง เลื่อนไปช่องแรก) + "เติมข้อมูลตัวอย่างเฉพาะช่องว่าง" (เติมเฉพาะช่องที่แก้ได้และว่าง ยังไม่บันทึก) · แสดงเฉพาะเมื่อมีช่องที่แก้ได้
- **เมนู "ดูเอกสารทั้งหมด (n)":** เมื่อแผงเอกสารมีแท็บตั้งแต่ 4 แท็บ (เช่น meeting-docs)
- **ป้ายในแถบแก้ไข:** ยังไม่มีการแก้ไข → ยังไม่บันทึก → บันทึกแล้ว
- ไม่ได้ทำ: พรีวิวย่อในฟอร์ม (ต้นแบบนี้แสดงเอกสาร A4 ข้างฟอร์มอยู่แล้ว)
- API เพิ่ม: `ECMISLiveDoc.mergeBound / cardState / validateForm / fillSample / resetSavedEdit / updateCompleteness`
- `?v=20261122-livedoc2`

### 5.12 ผังกระบวนงานและหน้าจอ / คู่มือเดิน Flow / สลับบทบาท (เพิ่ม 22/11/2569)
รายละเอียดการใช้งานดู README หัวข้อ 14
- **ไฟล์ใหม่:** `flow-to-page.html`, `flow-guide.html`, `assets/a7-flow-data.js` (สร้างอัตโนมัติ ห้ามแก้มือ), `assets/a7-flow-common.js`, `assets/a7-flow.css`, `scripts/flow-data/` (ตัวสร้างข้อมูล), `tests/flow/` (สคริปต์ทดสอบ), `docs/A7-flow-mapping-report.md`
- **แก้ `assets/ecmis-app.js`** (เฉพาะโหมดสาธิต): เมนู "คู่มือต้นแบบ" 2 รายการ + ไอคอน · ป้าย "สลับบทบาท" · `applyDemoRoleParam()` รับ `?demo_role=` · `noteDemoRoleSwitch()` บันทึกการสลับลง demo session · `getSupabaseClient()` ใส่ fetch กันการเขียนเมื่ออยู่ในกรอบคู่มือ (`window.name === 'a7guide-frame'`) และโหมดไม่ใช่ live · `renderDemoGuideChip()` ปุ่มกลับคู่มือ — ไม่แตะ STATUS / TRANSITIONS / สิทธิ์หน้า
- **เพิ่มขั้น/แก้การแมป:** แก้ `scripts/flow-data/node_map.py` แล้วสร้าง `assets/a7-flow-data.js` ใหม่ (scripts/flow-data/README.md) · ปุ่มที่ต้องการให้คู่มือหาแน่นอน ใส่ `data-guide-id="<ข้อความ target>"` ที่ปุ่มนั้น (คู่มือหา data-guide-id ก่อน แล้วจึงหาจากข้อความ)
- **ผังไม่ใช้รูปวาดเอง:** สร้างด้วย Mermaid 10.9.1 (vendor) จากโหนด/เส้นของ drawio · PNG ส่งออกด้วยป้ายแบบ SVG (ไม่ใช้ foreignObject) เพื่อให้ canvas ส่งออกได้
- **ผลทดสอบ 22/11/2569** (Playwright + Edge, บล็อกการเขียน Supabase อีกชั้นที่ระดับเครือข่าย):
  - `tests/flow/test_ftp.py` ภาพรวม 8 กระบวนการ · ผังรายหน้า · แผงรายละเอียด 15 รายการ · ไฮไลต์เส้นทาง · กรองบทบาท · ค้นหา · ดูตัวอย่างหน้าจอด้วยบทบาทที่ถูกต้อง · รายงาน · Option A · มือถือไม่ล้น — ไม่มี error
  - `tests/flow/test_guide.py` เริ่มสถานการณ์ → ไฮไลต์ลิงก์ในแถวเรื่องตัวอย่าง → กดแล้วนับว่าทำจริง → จุดตัดสินใจ → ส่งต่องานเลขาธิการฯ→ประธานฯ → สลับบทบาทผิดขึ้นเตือนและไม่นับ → กลับบทบาท → ย้อนกลับ → ลิงก์ลึกจากผัง → Option A → จบเส้นทางและเล่นทางอื่น — คำขอเขียนที่หลุดถึงเครือข่าย **0** · ปุ่มดำเนินการอื่นในโหมดสาธิตถูกปิด
  - `tests/flow/test_optflow.py` โฟลเดอร์ Option A/B เลือก Option ได้เฉพาะของตัวเอง สถานการณ์ 7/9 เมนูถูกต้อง
  - `tests/flow/verify_walk.py` ตรวจซ้ำ 66 ขั้นของต้นแบบหลังแก้ ecmis-app.js: ผ่าน 65 · ตรวจจากโค้ด 1 (เท่าเดิม)
  - ข้อจำกัด: ไม่ได้ทดสอบโหมด "บันทึกจริง" (จะเขียนฐานข้อมูลร่วม) · ไม่ได้ตรวจ PNG ที่ส่งออกด้วยตา
- `?v=` ของ ecmis-app.js ทุกหน้า = `20261122-flow1`

### 5.10 ค่า `?v=` ล่าสุด
`ecmis-app.js` ใช้ `?v=20261122-flow1` · `a7-option.js` ใช้ `?v=20261121-a7-inq64` (ทุกหน้า ทั้งรากและ Option A/B) · `saraban-docs.js`, `saraban-no.js`, `report-export.js`, `case-summary-*.js` ใช้ `?v=20261121-a7-saraban`

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

ดูรายการเต็มใน [README.md](README.md) หัวข้อ 11 ที่สำคัญสุด: (1) Supabase นี้เป็น staging หรือ production และมี RLS หรือไม่, (2) ระบบจริงจะมี Backend/API แยกหรือใช้ Supabase ต่อ, (3) กฎสถานะ/SLA/สิทธิ์ที่ถูกต้อง, (4) ใช้ branch ใดเป็นฐาน และคงโครงสร้างสำเนา Option A/B หรือไม่, (5) ผู้ลงนามคำสั่ง ม.24 ในหน้า `order.html` (เลขาธิการฯ) ต่างจากสถานะ/ผัง (ประธานฯ), (6) การต่อ Open API ระบบงานสารบรรณจริง
