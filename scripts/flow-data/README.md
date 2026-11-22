# สร้างข้อมูลผังกระบวนงาน `assets/a7-flow-data.js`

ไฟล์ `assets/a7-flow-data.js` เป็นแหล่งข้อมูลเดียวของ `flow-to-page.html` และ `flow-guide.html` **ห้ามแก้มือ** — แก้ที่สคริปต์ในโฟลเดอร์นี้แล้วสร้างใหม่

| ไฟล์ | หน้าที่ |
|---|---|
| `parse_flow.py` | อ่าน User Flow V1.0.14 Option A/B (`.drawio`) → `userflow.json` (เลน · โหนดงาน/ตัดสินใจ/ตัวเชื่อม/เริ่ม/สิ้นสุด · เส้นและป้ายทางเลือก) |
| `node_map.py` | แมปโหนดงานในผัง → หน้าจอต้นแบบ บทบาท เรื่องตัวอย่าง ปุ่มที่ต้องกด สถานะการแมป (`M` = Option B, `MA` = โหนด Option A ที่ชื่อต่างจาก B) |
| `build_flow_data.py` | รวมผัง + แมป + ข้อมูลเล่ม 4.1 (ตารางขั้นตอน 2.2, DFD L1, ข้อกำหนด R, ประเด็นรอยืนยัน K) + สถานะเรื่องตัวอย่าง → `assets/a7-flow-data.js` และจำลองเดินทุกสถานการณ์เพื่อตรวจว่าไปถึงปลายทางได้ |

## ข้อมูลเข้า (ตั้งผ่าน environment)

| ตัวแปร | ค่า |
|---|---|
| `A7_USERFLOW_DIR` | โฟลเดอร์ที่มี `กิจกรรมที่ 7 User Flow V1.0.14 Option A/B_21112026.drawio` |
| `A7_USERFLOW_JSON` | ผลจาก `parse_flow.py` |
| `A7_BOOK_MD` | ข้อความเล่ม 4.1 Option B แปลงเป็น markdown (หัวข้อเป็น `#`, ตารางเป็น `| a | b |`) — ไฟล์ .docx ฉบับ 22112026 เปิดด้วย python-docx ไม่ได้ (ภาพในไฟล์หาย) จึงอ่านจาก `word/document.xml` ตรง |
| `A7_DISCOVER_JSON` | สถานะเรื่องตัวอย่างในฐานข้อมูล (ได้จากสคริปต์สำรวจที่เปิดต้นแบบแบบอ่านอย่างเดียว) |

```powershell
python scripts/flow-data/parse_flow.py userflow.json
python scripts/flow-data/build_flow_data.py assets/a7-flow-data.js
```

ผลที่พิมพ์ออก: จำนวนขั้นของแต่ละสถานการณ์ต่อ Option (ต้องไม่มี notes) และรายการที่ยังไม่ครบ (`mappingReport`)
เมื่อสถานะเรื่องตัวอย่างในฐานข้อมูลเปลี่ยน ให้แก้เลขสำนวนใน `node_map.py` แล้วสร้างใหม่
