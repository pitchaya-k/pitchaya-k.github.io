# Flow ของโปรเจกต์ E-CMIS (สร้างจาก graphify)

> สร้างจากกราฟ `graphify-out/graph.json` (เฉพาะโค้ด 29 ไฟล์) — แสดงโมดูลและการไหลของข้อมูลหลัก
> ความสัมพันธ์บางเส้นเป็น INFERRED ควรตรวจกับโค้ดจริงก่อนใช้อ้างอิง

## 1) ภาพรวมโมดูล (Module Flow)

```mermaid
flowchart TD
    User([ผู้ใช้ / บทบาท]) --> Shell["renderShell()<br/>ecmis-app.js"]
    Shell --> Role["Roles & Notifications<br/>currentRoleId(), can()"]
    Shell --> Core["E-CMIS App Core<br/>ecmis-app.js"]

    Core --> Stepper["Case Flow Stepper<br/>caseStepperHtml(), caseFlowSteps()"]
    Core --> Status["Case Status Transitions<br/>canTransition(), logRequestEvent()"]
    Core --> Cache["Case Data Cache<br/>getSupabaseClient(), supabaseRowToCase()"]
    Core --> Summary["Case Summary Card<br/>case-summary-card.js"]
    Core --> Agenda["Agenda Registry<br/>agenda-registry-data.js"]
    Core --> Closure["Case Closure<br/>case-closure.js"]
    Core --> Dash["Dashboard<br/>analytics / chart / export services"]
    Core --> Export["Report Export<br/>docx / pdf / xlsx"]

    Cache <--> DB[("Supabase")]
    Agenda --> Meeting["boardMeetings()<br/>meetingResolutionFor()"]
    Meeting --> Resolution["Resolution Split / SLA<br/>resolution-split.js"]
    Resolution --> Closure
    Status --> Closure

    Mock["case-summary-mock-page.js<br/>prototype-fill.js"] -.ข้อมูลจำลอง.-> Summary
```

## 2) Flow ของคดี (Case lifecycle) ตามที่กราฟชี้

```mermaid
flowchart LR
    A[รับเรื่อง / Intake] --> B[Screening<br/>isScreeningLocked]
    B --> C[ไต่สวน<br/>Stepper + สถานะ]
    C --> D[เข้าวาระประชุม<br/>Agenda Registry]
    D --> E[มติที่ประชุม<br/>Resolution]
    E --> F[Split ผู้ถูกกล่าวหา<br/>canSplit]
    F --> G[ปิดคดี<br/>Case Closure 7.1/7.3]
    C -. เปลี่ยนสาย/รีเซ็ต .-> R[openSwitchLineDialog /<br/>openResetCaseDialog]
    R --> C
```

## 3) Flow ของเครื่องมือ/สคริปต์

```mermaid
flowchart LR
    Seed["seed-deputy-cases.mjs<br/>seed-scenario-cases.mjs"] --> DB[(Supabase)]
    Backfill["backfill-stale-agenda-links.mjs"] --> DB
    Sync["sync-board-resolution.mjs"] --> Dest["assets / html ปลายทาง"]
    Tests["tests/*.test.mjs<br/>resolution / deputy / secgen rules"] -.ตรวจกฎ.-> Core2["ecmis-app.js"]
    Pipe["run_pipeline_parallel.py/.sh<br/>Activity 7 (3-Wave)"] --> Agents["Sub-agents"]
```
