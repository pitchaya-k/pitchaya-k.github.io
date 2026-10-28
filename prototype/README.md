# ภาพหน้าจอ Prototype กจ.7 (28 ต.ค. 2569)

ถ่ายจาก prototype ในโปรเจกต์นี้ (`localhost:8765`) ด้วย Microsoft Edge แบบ headless ขนาดกว้าง 1440 px
ระหว่างถ่ายบล็อกคำขอเขียน Supabase ทุกคำขอ (POST / PATCH / PUT / DELETE) จึงไม่มีข้อมูลถูกสร้างหรือแก้

| โฟลเดอร์ | เนื้อหา |
|---|---|
| `00_common` | หน้าเข้าสู่ระบบ |
| `01_affairs` … `10_case_admin` | แยกตาม role: หน้าแรก (`home_`), เมนูใน sidebar (`menu_`), หน้าข้างในของสำนวน 1 เรื่องต่อประเภทหน้า (`detail_<หน้า>_<เลขสำนวน>`) |
| `11_mock_case_summary` | หน้า mock การ์ดสรุปสำนวน 01–10 (A7-01–A7-07) |
| `12_fix_points_A7` | ภาพจุดที่แก้ (กรอบแดง) A7-10, A7-13, A7-15, A7-16 |
| `13_doc_sections` | ภาพเต็มหน้าและภาพแบ่ง "ส่วนที่ 1–N" ที่ใช้ในเล่ม 4 V1.5 และ PPT |
| `14_other_pages` | หน้าที่ไม่มีลิงก์จากหน้าแรก/เมนู (หน้ารายละเอียดระดับลึกและหน้าเดิม) |
| `_viewport` | ภาพขนาดจอ 1440×900 ของทุกภาพข้างบน (ใช้ใส่สไลด์) |

`index.csv` = รายการภาพทั้งหมด: โฟลเดอร์, role, ประเภทหน้า, ชื่อหน้า, URL, ไฟล์ภาพ

role ที่ใช้ล็อกอิน: affairs Siriporn.K, deputy Prasert.T, secgen Apichat.S, dir_case Bunlue.S, support_sub Jiraporn.N, subcommittee Sumet.N, chairman Wichai.Y, board_sec Thanakrit.B, board Somboon.T, case_admin Kannika.W
