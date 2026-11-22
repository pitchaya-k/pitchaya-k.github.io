/* ============================================================
   saraban-docs.js — เอกสารที่ต้องขอเลขจากระบบงานสารบรรณ สำนักงาน ป.ป.ท. (e-office)
   ------------------------------------------------------------
   ที่มา: Check List สารบรรณ x Process (เติมกิจกรรมที่ 7) 20112026 ชีต Checklist ลำดับ 115–133
          และต้นแบบทะเบียนคุมเลข กจ.7 (wireframe W1: หน้าต่างขอเลข 4 ขั้น)
   - SARABAN_DOCS   รายการเอกสาร 18 รายการที่ต้องขอเลข (Option A 16 / Option B 18) + แฟ้มทะเบียนส่ง
   - openSarabanRequest()  หน้าต่างขอเลขสารบรรณ: กรอกคำขอ → ส่งไปสารบรรณ → รอรับเลข → ได้รับเลข
   - mountSarabanDocs()    การ์ด "เลขหนังสือของขั้นนี้" ในหน้าสำนวน: ขอเลข → แนบไฟล์ลงนาม → ส่งต่อ/ส่งไปรษณีย์ → ปิดเรื่อง
   ระบบสารบรรณในต้นแบบเป็นตัวจำลอง (Open API 2.0/3.0) เลขจริงออกโดยระบบงานสารบรรณเท่านั้น
   ข้อมูลเก็บใน record เดิมของ saraban-no.js: trr_resolution_data.sarabanNos[slot]
     { no, prefix, ..., docCode, state, reqId, ref, file, sent, closedAt, error, trace[] }
   ต้องโหลดหลัง ecmis-app.js, saraban-no.js และ a7-option.js
   ============================================================ */
(function (root) {
  'use strict';

  const E = () => root.ECMIS;
  const SYS = 'ระบบงานสารบรรณ สำนักงาน ป.ป.ท. (e-office)';
  const OPT = () => String(root.ECMIS_A7_OPTION || 'AB');

  /* แฟ้มทะเบียนส่ง (ชีต "เทียบเอกสารอ้างอิง" ข้อ 2) — prefix ต่อท้ายด้วยเลขลำดับ/ปี (ดู formatSarabanNo) */
  const FILES = {
    'ปป 0004/':   { label: 'กอง ปป 0004 (ลับ)', level: 'ระดับกอง · กองบริหารคดี', secret: true },
    'ปป 0004.3/': { label: 'ปป 0004.3 (ลับ)', level: 'ระดับกลุ่มงาน · กลุ่มงานกิจการคณะกรรมการ', secret: true },
    'ปป 0004.5/': { label: 'ปป 0004.5 (ลับ)', level: 'ระดับกลุ่มงาน · กลุ่มงานคำวินิจฉัยและกฎหมาย', secret: true },
    'ปป 0004/ว ': { label: 'ปป 0004/ว (ส่งเวียน)', level: 'แฟ้มส่งเวียน', secret: false },
    'ปป 0004/ป ': { label: 'กอง ปป 0004/ป (ลับ)', level: 'ประธานกรรมการ ป.ป.ท. ลงนาม', secret: true, note: 'ความหมายแฟ้ม ป เป็นการตีความ รอผู้ใช้งานยืนยัน' }
  };
  const AFFAIRS = ['affairs'];
  const BOARD_SEC = ['board_sec'];
  const ROUTE = {
    eoffice: { label: 'ส่งต่อในระบบสารบรรณ', seq: 'ข้อ 2 → 7 → 10 → 6', steps: 'ขอเลข → แนบไฟล์ลงนาม → ส่งต่อในระบบสารบรรณ → ปิดเรื่อง' },
    mail: { label: 'ส่งทางไปรษณีย์ลงทะเบียน', seq: 'ข้อ 2 → 7 → 6', steps: 'ขอเลข → แนบไฟล์ลงนาม → ส่งไปรษณีย์ลงทะเบียน (บันทึกเลข EMS) → ปิดเรื่อง' }
  };

  /* slot = ชื่อ record ใน sarabanNos — ใช้ชื่อเดิมของหน้า (Task 300) ถ้ามี เอกสารในหน้าจึงแสดงเลขเดียวกัน */
  const SARABAN_DOCS = [
    { code: '4.4.1', name: 'บันทึกเสนอ ผอ.กอง ขออนุมัติหนังสือเชิญประชุม', prefix: 'ปป 0004.5/', route: 'eoffice', option: 'AB',
      slot: 'inviteMemo', scope: 'meeting', roles: BOARD_SEC, signer: 'ผอ.กบค.', to: 'ผู้อำนวยการกองบริหารคดี', page: 'meeting-docs.html' },
    { code: '4.4.3', name: 'หนังสือเวียน (ว) เชิญประชุมคณะกรรมการ ป.ป.ท.', prefix: 'ปป 0004/ว ', route: 'eoffice', option: 'AB',
      slot: 'inviteCircular', scope: 'meeting', roles: BOARD_SEC, signer: 'ผอ.กบค.', to: 'กรรมการ ป.ป.ท. และหน่วยงานที่เกี่ยวข้อง', page: 'meeting-docs.html' },
    { code: '5.3.1', name: 'หนังสือนำส่งมติ เสนอ ผอ.กอง', prefix: 'ปป 0004.5/', route: 'eoffice', option: 'AB',
      slot: k => (E().isCase72 && E().isCase72(k) ? 'notifyMemo72' : 'resNotifyMemo71'), roles: BOARD_SEC, signer: 'ผอ.กบค.', to: 'ผู้อำนวยการกองบริหารคดี',
      page: 'board-resolution.html / resolution-72.html' },
    { code: '5.3.2', name: 'หนังสือนำส่งมติให้กลุ่มงานกิจการคณะกรรมการ', prefix: 'ปป 0004.5/', route: 'eoffice', option: 'AB',
      slot: 'minutesMemo', scope: 'meeting', roles: BOARD_SEC, signer: 'ผอ.กบค.', to: 'กลุ่มงานกิจการคณะกรรมการ', page: 'meeting-report.html' },
    { code: '5.3.3', name: 'หนังสือส่งมติถึงหน่วยงานเจ้าของสำนวน', prefix: 'ปป 0004/', route: 'eoffice', option: 'AB',
      slot: k => (E().isCase72 && E().isCase72(k) ? 'resReturnLetter72' : 'resReturnLetter71'), roles: BOARD_SEC, signer: 'ผอ.กบค.', to: 'หน่วยงานเจ้าของสำนวน (สำนัก/เขต)',
      page: 'board-resolution.html / resolution-72.html' },
    { code: '5.4', name: 'หนังสือคัดแยกผลมติ', prefix: 'ปป 0004.5/', route: 'eoffice', option: 'B',
      slot: 'resultSplitMemo', scope: 'meeting', roles: BOARD_SEC, signer: 'ผอ.กบค.', to: 'ผู้อำนวยการกองบริหารคดี', page: 'meeting-report.html' },
    { code: '6.1.1', name: 'บันทึกเสนอคำสั่งคณะกรรมการ ป.ป.ท. (เรียน ผอ.กบค.)', prefix: 'ปป 0004.3/', route: 'eoffice', option: 'AB',
      slot: 'memoNo', roles: AFFAIRS, signer: 'ผอ.กบค.', to: 'ผู้อำนวยการกองบริหารคดี', page: 'order.html', note: 'รวมคำสั่งแต่งตั้งผู้ไต่สวน' },
    { code: '6.1.4', name: 'บันทึกเสนอคำสั่งเพื่อประธานกรรมการ ป.ป.ท. ลงนาม', prefix: 'ปป 0004/', route: 'eoffice', option: 'AB',
      slot: 'orderSignMemo', roles: AFFAIRS, signer: 'ผอ.กบค.', to: 'ประธานกรรมการ ป.ป.ท.', page: 'order.html' },
    { code: '6.1.5', name: 'หนังสือส่งคำสั่งคณะกรรมการ ป.ป.ท. ถึงหน่วยงานที่เกี่ยวข้อง', prefix: 'ปป 0004/', route: 'eoffice', option: 'AB',
      slot: 'orderNotifyLetter', roles: AFFAIRS, signer: 'ผอ.กบค.', to: 'หน่วยงานที่เกี่ยวข้อง (สำนัก/เขต)', page: 'order.html' },
    { code: '6.2.1', name: 'บันทึกเสนอคำสั่งสำนักงาน ป.ป.ท. (เรียน ผอ.กบค.)', prefix: 'ปป 0004.3/', route: 'eoffice', option: 'AB',
      slot: 'memoNo', roles: AFFAIRS, signer: 'ผอ.กบค.', to: 'ผู้อำนวยการกองบริหารคดี', page: 'order.html' },
    { code: '6.2.2', name: 'บันทึกเสนอคำสั่งสำนักงาน ป.ป.ท. เพื่อเลขาธิการ ป.ป.ท. ลงนาม', prefix: 'ปป 0004/', route: 'eoffice', option: 'AB',
      slot: 'orderSignMemo', roles: AFFAIRS, signer: 'ผอ.กบค.', to: 'เลขาธิการ ป.ป.ท.', page: 'order.html' },
    { code: '6.2.3', name: 'หนังสือส่งคำสั่งสำนักงาน ป.ป.ท. ถึงหน่วยงานที่เกี่ยวข้อง', prefix: 'ปป 0004/', route: 'eoffice', option: 'AB',
      slot: 'orderNotifyLetter', roles: AFFAIRS, signer: 'ผอ.กบค.', to: 'หน่วยงานที่เกี่ยวข้อง (สำนัก/เขต)', page: 'order.html' },
    { code: '7.1.1', name: 'บันทึกเสนอรายงานการไต่สวนเพื่อวินิจฉัยชี้มูล (เรียน ผอ.กบค.)', prefix: 'ปป 0004.3/', route: 'eoffice', option: 'AB',
      slot: 'rulingMemo72', roles: AFFAIRS, signer: 'ผอ.กบค.', to: 'ผู้อำนวยการกองบริหารคดี', page: 'ruling-report.html' },
    { code: '7.1.2', name: 'หนังสือส่งรายงานการไต่สวนเพื่อวินิจฉัยชี้มูล', prefix: 'ปป 0004/', route: 'eoffice', option: 'AB',
      slot: 'notifyLetter72', roles: AFFAIRS, signer: 'ผอ.กบค.', to: 'หน่วยงานเจ้าของสำนวน (สำนัก/เขต)', page: 'ruling-report.html' },
    { code: '7.1.3', name: 'หนังสือส่งเรื่องดำเนินคดีอาญา (สายอาญา)', prefix: 'ปป 0004/', route: 'mail', option: 'B',
      slot: 'crimDispatchLetter72', when: k => !!(E().hasCriminalTrack72 && E().hasCriminalTrack72(k)), roles: AFFAIRS, signer: 'ผอ.กบค.',
      to: 'อัยการสูงสุด / พนักงานสอบสวน', page: 'ruling-report.html', note: 'ขอเลขจากทะเบียนส่ง (ลับ) กบค. · ส่งไปรษณีย์ลงทะเบียน บันทึกเลข EMS' },
    { code: '7.2.1', name: 'บันทึกเสนอหนังสือลงโทษทางวินัย (เรียน ผอ.กบค.)', prefix: 'ปป 0004.3/', route: 'eoffice', option: 'AB',
      slot: 'disciplineMemo72', when: k => !!(E().hasDisciplineTrack72 && E().hasDisciplineTrack72(k)), roles: AFFAIRS, signer: 'ผอ.กบค.',
      to: 'ผู้อำนวยการกองบริหารคดี', page: 'ruling-report.html' },
    { code: '7.2.2', name: 'หนังสือลงโทษทางวินัย (ประธานกรรมการ ป.ป.ท. ลงนาม)', prefix: 'ปป 0004/ป ', route: 'mail', option: 'AB',
      slot: 'disciplineLetter72', when: k => !!(E().hasDisciplineTrack72 && E().hasDisciplineTrack72(k)), roles: AFFAIRS, signer: 'ประธานกรรมการ ป.ป.ท.',
      to: 'หน่วยงานต้นสังกัดของผู้ถูกกล่าวหา', page: 'ruling-report.html', note: 'ออกเลขและลงนามก่อน แล้วจึงส่งตามรายการ 7.2.3' },
    { code: '7.2.3', name: 'หนังสือส่งหนังสือลงโทษทางวินัยถึงหน่วยงานต้นสังกัด', prefix: 'ปป 0004/ป ', route: 'eoffice', option: 'AB',
      slot: 'discDispatchLetter72', when: k => !!(E().hasDisciplineTrack72 && E().hasDisciplineTrack72(k)), roles: AFFAIRS, signer: 'ประธานกรรมการ ป.ป.ท.',
      to: 'หน่วยงานต้นสังกัดของผู้ถูกกล่าวหา', page: 'ruling-report.html' }
  ];
  /* เลขที่ออกไว้ก่อนมีรายการนี้ (Task 300) และเอกสารนอก checklist — ใช้แสดงชื่อในทะเบียน */
  const LEGACY_SLOTS = {
    screeningMemo: 'บันทึกแจ้งมติคณะอนุกรรมการกลั่นกรองฯ (นอกรายการ checklist)',
    supportSubMemo: 'บันทึกแจ้งมติคณะอนุกรรมการสนับสนุนฯ (นอกรายการ checklist)',
    minutesLetter: 'หนังสือรายงานการประชุม (นอกรายการ checklist)',
    rulingReport72: 'เลขรายงานวินิจฉัยชี้มูล ปท.7-02 (นอกรายการ checklist)',
    orderNo: 'เลขคำสั่ง (ทะเบียนส่ง "คำสั่งไต่สวน")', amendOrderNo: 'เลขคำสั่งแก้ไข (ทะเบียนส่ง "คำสั่งไต่สวน")'
  };
  /* รายการรับเข้า (ไม่ออกเลข) — แสดงในทะเบียนเพื่อให้ครบ 19 แถวของ checklist */
  const RECEIVE_ITEM = { code: '1.1', name: 'รับรายงานการไต่สวนและสำนวนจากระบบกระบวนการดำเนินงานเรื่องร้องเรียนกล่าวหา',
    seq: 'ข้อ 3 → 4 → 5 → 8 → 6', note: 'รับเรื่องในระบบ ไม่ออกเลขใหม่' };

  const STATES = {
    none:     { label: 'ยังไม่ขอเลข', cls: 'sd-st-none' },
    failed:   { label: 'ขอเลขไม่สำเร็จ', cls: 'sd-st-fail' },
    pending:  { label: 'รอรับเลข', cls: 'sd-st-wait' },
    issued:   { label: 'ได้รับเลขแล้ว', cls: 'sd-st-ok' },
    manual:   { label: 'เลขนอกระบบ · รอตรวจ', cls: 'sd-st-warn' },
    attached: { label: 'แนบไฟล์ลงนามแล้ว', cls: 'sd-st-ok' },
    sent:     { label: 'ส่งแล้ว', cls: 'sd-st-sent' },
    closed:   { label: 'ปิดเรื่องแล้ว', cls: 'sd-st-done' }
  };

  function docVisible(d) { return d.option === 'AB' || OPT().includes(d.option); }
  function docsFor(codes) { return codes.map(c => SARABAN_DOCS.find(d => d.code === c)).filter(Boolean).filter(docVisible); }
  function slotOf(d, kase) { return typeof d.slot === 'function' ? d.slot(kase) : d.slot; }
  function stateOf(rec) {
    if (!rec) return 'none';
    if (rec.state) return rec.state;
    return rec.no ? (rec.manual ? 'manual' : 'issued') : 'none';   /* record เก่าจาก Task 300 */
  }
  function canAct(d) {
    const r = E().currentRoleId ? E().currentRoleId() : '';
    return (d.roles || []).includes(r);
  }
  function roleTitle(ids) { return (ids || []).map(id => (E().getRole(id) || {}).title || id).join(' / '); }
  function who() {
    const r = E().currentRole ? E().currentRole() : null;
    return r ? (r.name || r.title || r.id) : '';
  }
  function trace(rec, act, note) {
    return ((rec && rec.trace) || []).concat([{ at: new Date().toISOString(), by: who(), act, note: note || '' }]);
  }
  function caseLabel(k) { return (E().caseNo ? E().caseNo(k) : (k && k.id)) || '—'; }
  function todayBE() { return E().fakeTodayIso(); }
  function thai(iso) { return iso ? E().thaiDate(E().toBuddhistFakeIso(String(iso).slice(0, 10))) : ''; }
  function reqId() {
    const y = String(Number(String(todayBE()).slice(0, 4))).slice(-2);
    return `REQ-${y}-${String(Date.now()).slice(-6)}`;
  }

  /* ---------- ตัวจำลองระบบงานสารบรรณ (เลือกโหมดได้จากหน้าทะเบียนคุมเลข) ---------- */
  const MODE_KEY = 'ecmis_eoffice_mode';
  function apiMode() { try { return localStorage.getItem(MODE_KEY) || 'ok'; } catch (e) { return 'ok'; } }
  function setApiMode(m) { try { localStorage.setItem(MODE_KEY, m); } catch (e) { /* ไม่มี storage ก็ใช้ค่าเริ่มต้น */ } }
  const wait = ms => new Promise(r => setTimeout(r, ms));

  const STYLE = `
    .sd-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin-bottom:1rem}
    .sd-step{border:1px solid var(--ws-border,#d7dde6);border-radius:.5rem;padding:.4rem .5rem;font-size:.85rem;text-align:center;color:#5b6470;background:#fff}
    .sd-step.is-on{background:#e8f0fb;border-color:#9fb6e8;color:#1f3864;font-weight:600}
    .sd-step.is-done{background:#e9f6ee;border-color:#9ccfb0;color:#22704a}
    .sd-pre{background:#f6f8fb;border:1px solid #e2e7ef;border-radius:.4rem;padding:.6rem .75rem;font:12px/1.55 ui-monospace,Consolas,monospace;white-space:pre-wrap;margin:0}
    .sd-box{border:1px solid #e2e7ef;border-radius:.5rem;padding:.6rem .75rem;font-size:.85rem}
    .sd-box.ok{background:#eef8f1;border-color:#a9d7b8}.sd-box.warn{background:#fff7e6;border-color:#f0cf86}.sd-box.info{background:#eef3fb;border-color:#b9cbeb}
    .sd-row{display:grid;grid-template-columns:4.2rem 1fr;gap:.35rem .6rem;align-items:start;padding:.6rem 0;border-top:1px solid var(--ws-border,#e6eaf0)}
    .sd-row:first-child{border-top:0}
    .sd-code{font-weight:700;color:#1f3864}
    .sd-no{font-family:ui-monospace,Consolas,monospace;font-weight:700}
    .sd-chip{display:inline-block;border-radius:99px;padding:.05rem .55rem;font-size:.75rem;border:1px solid transparent;margin-right:.25rem}
    .sd-st-none{background:#f1f3f6;color:#5b6470;border-color:#dde2e8}.sd-st-fail{background:#fde8e8;color:#9b1c1c;border-color:#f5b5b5}
    .sd-st-wait{background:#e8f0fb;color:#1f3864;border-color:#b9cbeb}.sd-st-ok{background:#e9f6ee;color:#22704a;border-color:#a9d7b8}
    .sd-st-warn{background:#fff3db;color:#8a5a00;border-color:#f0cf86}.sd-st-sent{background:#efe9fb;color:#5b3aa8;border-color:#cbbbef}
    .sd-st-done{background:#22704a;color:#fff}
    .sd-actions{grid-column:2;display:flex;flex-wrap:wrap;gap:.35rem}.sd-actions:empty{display:none}
    .sd-meta{font-size:.8rem;color:#5b6470}
    body.dark-mode .sd-step,body.dark-mode .sd-pre,body.dark-mode .sd-box{background:transparent;color:inherit}
    @media (max-width:576px){.sd-row{grid-template-columns:1fr}.sd-actions{grid-column:1}.sd-steps{grid-template-columns:1fr 1fr}}`;
  function ensureStyle() {
    if (document.getElementById('sarabanDocsStyle')) return;
    const el = document.createElement('style'); el.id = 'sarabanDocsStyle'; el.textContent = STYLE;
    document.head.appendChild(el);
  }

  /* ---------- หน้าต่างขอเลขสารบรรณ ---------- */
  function payloadText(v) {
    const f = FILES[v.prefix] || {};
    return [
      `bucket_id : (รหัสแฟ้ม ${f.label || v.prefix} — รอผู้ดูแลสารบรรณยืนยัน)`,
      `doc_header: ${v.docName} · ${v.caseNo}`,
      `doc_detail: [${v.ref}]  ← รหัสอ้างอิง E-CMIS ใช้กันเลขซ้ำ`,
      'doc_format: 2 (ดิจิทัล)',
      `speed_id  : ${v.speed}`,
      `secure_id : ${v.secret ? '2 ลับ' : '1 ปกติ'}`,
      'type_id   : (รหัสหมวด — รอผู้ดูแลสารบรรณ)',
      'purpose_id: (รหัสจุดประสงค์ — รอผู้ดูแลสารบรรณ)',
      `add_date  : ${v.date}`,
      `doc_dear  : ${v.to}`
    ].join('\n');
  }

  /* opts: { kase, kases, doc, group, sb, onDone(record) } → Promise<record|null> */
  async function openSarabanRequest(opts) {
    ensureStyle();
    const ECMIS = E();
    const esc = ECMIS.escapeHtml;
    const d = opts.doc;
    const kases = (opts.kases || [opts.kase]).filter(Boolean);
    const kase = kases[0];
    const slot = slotOf(d, kase);
    const group = opts.group ? `${opts.group}:${slot}` : undefined;
    const prev = ECMIS.sarabanRecord(kase, slot);
    const prevState = stateOf(prev);
    const version = ((prev && prev.history) || []).length + (prev && prev.no ? 2 : 1);
    const ref = `E-CMIS|${caseLabel(kase)}${kases.length > 1 ? `+${kases.length - 1}` : ''}|${d.code}|${slot}|v${version}`;
    const fileOpts = Object.entries(FILES).map(([p, f]) =>
      `<option value="${esc(p)}" ${p === d.prefix ? 'selected' : ''}>${esc(f.label)} · ${esc(f.level)}</option>`).join('');
    const dupBox = prevState === 'pending'
      ? `<div class="sd-box warn"><i class="fa-solid fa-hourglass-half me-1"></i>มีคำขอ <strong>${esc(prev.reqId || '')}</strong> ที่ยังรอรับเลข — กด "ตรวจสถานะ" ในการ์ดก่อน ระบบจะค้นเอกสารจากรหัสอ้างอิงในสารบรรณ ไม่สร้างคำขอใหม่</div>`
      : (prev && prev.no
        ? `<div class="sd-box warn"><i class="fa-solid fa-triangle-exclamation me-1"></i>เอกสารนี้มีเลข <strong class="sd-no">${esc(prev.no)}</strong> อยู่แล้ว — ถ้าขอใหม่ถือเป็น "ออกเลขแทน" เลขเดิมถูกยกเลิกและต้องแจ้งงานสารบรรณ
            <div class="form-check mt-2"><input class="form-check-input" type="checkbox" id="sdReplace"><label class="form-check-label" for="sdReplace">ยืนยันออกเลขแทนเลขเดิม</label></div></div>`
        : `<div class="sd-box ok"><i class="fa-solid fa-check me-1"></i>ตรวจซ้ำก่อนส่ง: ไม่มีคำขอที่ยังใช้งานของ <strong>สำนวน + ขั้น + เอกสาร</strong> นี้
            <div class="sd-pre mt-2">marker ใน doc_detail: ${esc(ref)}</div></div>`);
    const steps = ['① กรอกคำขอ', '② ส่งไปสารบรรณ', '③ รอรับเลข', '④ ได้รับเลข / ผูกเอกสาร']
      .map((s, i) => `<div class="sd-step ${i === 0 ? 'is-on' : ''}" data-step="${i}">${s}</div>`).join('');
    const html = `
      <div class="sd-steps">${steps}</div>
      <div class="row g-3 text-start">
        <div class="col-lg-6">
          <div class="mb-2"><label class="form-label small mb-1">สำนวน</label><input class="form-control form-control-sm" value="${esc(kases.map(caseLabel).join(', '))}" readonly></div>
          <div class="mb-2"><label class="form-label small mb-1">ขั้นตอน · เอกสาร</label><input class="form-control form-control-sm" value="${esc(d.code + ' ' + d.name)}" readonly></div>
          <div class="mb-2"><label class="form-label small mb-1" for="sdFile">แฟ้มทะเบียนส่ง</label><select class="form-select form-select-sm" id="sdFile">${fileOpts}</select>
            <div class="form-text">ค่าเริ่มต้นตามตาราง Check List สารบรรณ x Process · ${esc((FILES[d.prefix] || {}).note || 'แก้ได้ถ้าต่างจากนี้')}</div></div>
          <div class="row g-2">
            <div class="col-6 mb-2"><label class="form-label small mb-1" for="sdSigner">ผู้ลงนาม</label><input class="form-control form-control-sm" id="sdSigner" value="${esc(d.signer || '')}"></div>
            <div class="col-6 mb-2"><label class="form-label small mb-1" for="sdSpeed">ความเร็ว</label>
              <select class="form-select form-select-sm" id="sdSpeed"><option value="1 ปกติ">ปกติ</option><option value="2 ด่วน">ด่วน</option><option value="3 ด่วนมาก">ด่วนมาก</option><option value="4 ด่วนที่สุด">ด่วนที่สุด</option></select></div>
          </div>
          <div class="mb-2"><label class="form-label small mb-1" for="sdTo">ผู้รับ</label><input class="form-control form-control-sm" id="sdTo" value="${esc(d.to || '')}"></div>
          <div class="mb-2"><label class="form-label small mb-1" for="sdDate">วันที่เอกสาร</label><input class="form-control form-control-sm" id="sdDate" value="${esc(ECMIS.thaiDate(todayBE()))}"></div>
          ${dupBox}
        </div>
        <div class="col-lg-6">
          <div class="small fw-semibold mb-1">ข้อมูลที่ส่งให้ API (POST …/1.0/document/internal)</div>
          <pre class="sd-pre" id="sdPayload"></pre>
          <div class="form-text mb-2">ต้องมีครบ: bucket_id, doc_header, speed_id, secure_id, type_id, add_date, purpose_id · ไฟล์แนบอัปโหลดแยกหลังได้ doc_id</div>
          <div class="sd-box info mb-2" id="sdProgress"><strong>เมื่อกดส่งคำขอ</strong>
            <div>① ระบบสร้างคำขอ + marker และล็อกเอกสาร</div><div>② เรียก API สร้างเอกสารใน${SYS} (สารบรรณเป็นผู้ออกเลขรายเดียว)</div>
            <div>③ สารบรรณตอบทันที (201 พร้อม doc_id, doc_no) — ไม่มี callback</div><div>④ ผูกเลขกับเอกสารนี้ → บันทึก trace</div></div>
          <div class="sd-box"><strong>ถ้าไม่ตอบกลับ (408 / เชื่อมต่อขาด)</strong><div>API ไม่มี idempotency-key จึงกันซ้ำเอง: ก่อนลองใหม่ ระบบค้นเอกสารที่มี marker นี้ในสารบรรณก่อน ถ้าพบจะใช้เลขเดิม ไม่สร้างใหม่</div>
            <div class="sd-meta mt-1">จำลองสถานะ API ได้ที่หน้า "ทะเบียนคุมเลขสารบรรณ" · ตอนนี้: <strong>${esc(({ ok: 'ปกติ (201)', timeout: 'ตอบไม่ทัน (408)', down: 'ล่ม (503)' })[apiMode()])}</strong></div></div>
        </div>
      </div>`;

    let result = null;
    const res = await Swal.fire({
      title: 'ขอเลขสารบรรณ', html, width: 1000, showCancelButton: true, reverseButtons: true,
      confirmButtonText: 'ส่งคำขอ', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#0a2647', cancelButtonColor: '#6b7280',
      showLoaderOnConfirm: false, allowOutsideClick: () => !Swal.isLoading(),
      didOpen: (popup) => {
        const val = () => ({
          prefix: popup.querySelector('#sdFile').value, docName: d.name, caseNo: kases.map(caseLabel).join(', '), ref,
          speed: popup.querySelector('#sdSpeed').value, secret: !!(FILES[popup.querySelector('#sdFile').value] || {}).secret,
          date: popup.querySelector('#sdDate').value, to: popup.querySelector('#sdTo').value
        });
        const render = () => { popup.querySelector('#sdPayload').textContent = payloadText(val()); };
        popup.querySelectorAll('input,select').forEach(el => el.addEventListener('input', render));
        render();
        if (prevState === 'pending') Swal.getConfirmButton().disabled = true;
      },
      preConfirm: async () => {
        const popup = Swal.getPopup();
        if (prev && prev.no && !(popup.querySelector('#sdReplace') || {}).checked) {
          Swal.showValidationMessage('ติ๊ก "ยืนยันออกเลขแทนเลขเดิม" ก่อนส่งคำขอใหม่'); return false;
        }
        const prefix = popup.querySelector('#sdFile').value;
        const meta = {
          docCode: d.code, docName: d.name, ref, reqId: reqId(), signer: popup.querySelector('#sdSigner').value.trim(),
          to: popup.querySelector('#sdTo').value.trim(), speed: popup.querySelector('#sdSpeed').value, docDate: popup.querySelector('#sdDate').value,
          requestedBy: who(), requestedAt: new Date().toISOString(), file: null, sent: null, closedAt: null, error: null
        };
        const mark = i => popup.querySelectorAll('.sd-step').forEach((el, j) => {
          el.classList.toggle('is-done', j < i); el.classList.toggle('is-on', j === i);
        });
        const prog = popup.querySelector('#sdProgress');
        try {
          Swal.showLoading(); mark(1);
          prog.innerHTML = `<i class="fa-solid fa-paper-plane me-1"></i>ส่งคำขอ <strong>${esc(meta.reqId)}</strong> ไป${SYS}…`;
          await wait(650); mark(2);
          prog.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>รอสารบรรณตอบกลับ…';
          await wait(650);
          const mode = apiMode();
          if (mode === 'down') {
            /* มีเลขเดิมอยู่แล้ว: เก็บแค่ประวัติ ไม่แตะไฟล์แนบ/การส่งของเลขเดิม */
            const patch = prev && prev.no
              ? { trace: trace(prev, 'ขอเลขแทนไม่สำเร็จ', `${meta.reqId} · 503`) }
              : Object.assign({}, meta, { prefix, state: 'failed', error: '503 ระบบสารบรรณไม่พร้อมให้บริการ', group, trace: trace(prev, 'ขอเลขไม่สำเร็จ', `${meta.reqId} · 503`) });
            result = await ECMIS.patchSarabanRecord({ sb: opts.sb, kases, slot, patch });
            Swal.hideLoading();
            Swal.showValidationMessage('ระบบสารบรรณไม่พร้อมให้บริการ (503) — ยังไม่ได้เลข ลองใหม่ภายหลังหรือบันทึกเลขที่ออกนอกระบบ');
            mark(1); return false;
          }
          if (mode === 'timeout') {
            result = await ECMIS.patchSarabanRecord({ sb: opts.sb, kases, slot, patch: Object.assign({}, meta, { prefix, no: prev && prev.no ? prev.no : '', state: 'pending',
              group, trace: trace(prev, 'ส่งคำขอแล้ว รอรับเลข', `${meta.reqId} · 408 ตอบกลับไม่ทัน`) }) });
            return true;
          }
          const rec = await ECMIS.issueSarabanNo({ sb: opts.sb, kases, slot, prefix, group,
            extra: Object.assign({}, meta, { state: 'issued', eofficeDocId: 'DOC-' + String(Date.now()).slice(-7), trace: trace(prev, 'ได้รับเลข', meta.reqId) }) });
          mark(3);
          prog.innerHTML = `<i class="fa-solid fa-circle-check me-1 text-success"></i>ได้รับเลข <strong class="sd-no">${esc(rec.no)}</strong> · ผูกกับเอกสารแล้ว`;
          await wait(700);
          result = rec;
          return true;
        } catch (e) {
          console.error('ขอเลขสารบรรณไม่สำเร็จ:', e);
          Swal.hideLoading(); Swal.showValidationMessage('ขอเลขไม่สำเร็จ: ' + (e.message || e)); mark(0); return false;
        }
      }
    });
    if (!res.isConfirmed) { if (result && typeof opts.onDone === 'function') opts.onDone(result); return null; }
    if (result && result.state === 'pending') ECMIS.toastWarn('สารบรรณตอบกลับไม่ทัน (408) — คำขอ ' + result.reqId, 'กด "ตรวจสถานะ" เพื่อค้นเลขจากรหัสอ้างอิงก่อนลองใหม่');
    else if (result) ECMIS.toastOk('ได้รับเลขสารบรรณแล้ว · ' + result.no, d.code + ' ' + d.name);
    if (typeof opts.onDone === 'function') opts.onDone(result);
    return result;
  }

  /* ตรวจสถานะคำขอที่รอรับเลข: ค้นจาก marker ในสารบรรณ (จำลอง: พบเอกสาร → ใช้เลขนั้น) */
  async function checkPending({ kases, doc, slot, group, sb }) {
    const ECMIS = E();
    const prev = ECMIS.sarabanRecord(kases[0], slot);
    if (apiMode() === 'down') throw new Error('ระบบสารบรรณไม่พร้อมให้บริการ (503) — ยังตรวจสถานะไม่ได้');
    const prefix = (prev && prev.prefix) || doc.prefix;
    return ECMIS.issueSarabanNo({ sb, kases, slot, prefix, group,
      extra: { docCode: doc.code, docName: doc.name, ref: prev && prev.ref, reqId: prev && prev.reqId, state: 'issued', error: null,
        eofficeDocId: 'DOC-' + String(Date.now()).slice(-7), trace: trace(prev, 'ตรวจสถานะ พบเอกสารจาก marker', 'ใช้เลขที่สารบรรณออกให้ ไม่สร้างคำขอใหม่') } });
  }

  function traceHtml(rec) {
    const esc = E().escapeHtml;
    const rows = ((rec && rec.trace) || []).slice().reverse().map(t =>
      `<tr><td class="text-nowrap">${esc(thai(t.at))} ${esc(String(t.at || '').slice(11, 16))}</td><td>${esc(t.act)}</td><td>${esc(t.note || '')}</td><td>${esc(t.by || '')}</td></tr>`).join('');
    const hist = ((rec && rec.history) || []).map(h => `<li><span class="sd-no">${esc(h.no)}</span> <span class="text-muted">(ยกเลิก/ออกเลขแทน)</span></li>`).join('');
    return `<div class="text-start small">
      ${rec && rec.ref ? `<div class="mb-2">รหัสอ้างอิง E-CMIS: <code>${esc(rec.ref)}</code>${rec.eofficeDocId ? ` · doc_id ${esc(rec.eofficeDocId)}` : ''}</div>` : ''}
      <table class="table table-sm align-top"><thead><tr><th>เวลา</th><th>เหตุการณ์</th><th>รายละเอียด</th><th>ผู้ทำ</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" class="text-muted">ยังไม่มีประวัติ</td></tr>'}</tbody></table>
      ${hist ? `<div class="fw-semibold">เลขเดิม</div><ul class="mb-0">${hist}</ul>` : ''}</div>`;
  }
  function showTrace(rec, title) {
    return Swal.fire({ title: title || 'ประวัติการขอเลข (trace)', html: traceHtml(rec), width: 760, confirmButtonText: 'ปิด', confirmButtonColor: '#0a2647' });
  }

  /* ---------- การ์ดเลขหนังสือของขั้นนี้ ----------
     ECMIS.mountSarabanDocs({ host, kase | kases, group, sb, codes: ['7.1.1', ...], inputs: { slot: inputEl }, readonly, onChange(slot, no) })
     → { refresh() } */
  function mountSarabanDocs(opts) {
    ensureStyle();
    const ECMIS = E();
    const esc = ECMIS.escapeHtml;
    const host = opts.host;
    if (!host) return { refresh() {} };
    const kases = () => (typeof opts.kases === 'function' ? opts.kases() : (opts.kases || [opts.kase])).filter(Boolean);

    function applyInput(slot, no) {
      const map = typeof opts.inputs === 'function' ? opts.inputs() : opts.inputs;
      const el = map && map[slot];
      if (el && no && el.value !== no) { el.value = no; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
      if (typeof opts.onChange === 'function') opts.onChange(slot, no);
    }

    function rowHtml(d, k) {
      const slot = slotOf(d, k);
      const rec = ECMIS.sarabanRecord(k, slot);
      const st = stateOf(rec);
      const s = STATES[st] || STATES.none;
      const mine = !opts.readonly && canAct(d);
      const route = ROUTE[d.route];
      const btn = (act, label, icon, cls) => `<button type="button" class="btn btn-sm ${cls || 'btn-outline-navy'}" data-act="${act}" data-code="${d.code}"><i class="fa-solid ${icon} me-1"></i>${label}</button>`;
      const acts = [];
      if (mine) {
        if (st === 'none' || st === 'failed') acts.push(btn('request', st === 'failed' ? 'ลองใหม่' : 'ขอเลขสารบรรณ', 'fa-hashtag', 'btn-navy'));
        if (st === 'none' || st === 'failed') acts.push(btn('manual', 'บันทึกเลขที่ออกนอกระบบ', 'fa-pen'));
        if (st === 'pending') acts.push(btn('check', 'ตรวจสถานะ', 'fa-rotate', 'btn-navy'));
        if (st === 'manual') acts.push(btn('verify', 'ตรวจกับสารบรรณ', 'fa-check-double', 'btn-navy'));
        if (st === 'issued') acts.push(btn('attach', 'แนบไฟล์ฉบับลงนาม', 'fa-paperclip', 'btn-navy'));
        if (st === 'attached') acts.push(d.route === 'mail' ? btn('mail', 'บันทึกส่งไปรษณีย์', 'fa-envelope', 'btn-navy') : btn('forward', 'ส่งต่อในระบบสารบรรณ', 'fa-share', 'btn-navy'));
        if (st === 'sent') acts.push(btn('close', 'ปิดเรื่อง', 'fa-flag-checkered', 'btn-success'));
        if (rec && rec.no && st !== 'closed') acts.push(btn('request', 'ออกเลขแทน', 'fa-arrows-rotate', 'btn-outline-secondary'));
      }
      if (rec && (rec.trace || rec.no)) acts.push(btn('trace', 'trace', 'fa-clock-rotate-left', 'btn-outline-secondary'));
      const f = FILES[(rec && rec.prefix) || d.prefix] || {};
      const optB = d.option === 'B' && OPT() === 'AB' ? '<span class="sd-chip sd-st-warn">เฉพาะ Option B</span>' : '';
      const sub = [];
      if (rec && rec.file) sub.push(`<i class="fa-solid fa-paperclip me-1"></i>${esc(rec.file.name)}`);
      if (rec && rec.sent) sub.push(rec.sent.via === 'mail' ? `<i class="fa-solid fa-envelope me-1"></i>EMS ${esc(rec.sent.ems || '—')}` : `<i class="fa-solid fa-share me-1"></i>ส่งต่อถึง ${esc(rec.sent.to || '')}`);
      if (rec && rec.error && st === 'failed') sub.push(`<span class="text-danger">${esc(rec.error)}</span>`);
      if (rec && rec.reqId) sub.push(`คำขอ ${esc(rec.reqId)}`);
      return `<div class="sd-row" data-code="${d.code}">
        <div class="sd-code">${esc(d.code)}</div>
        <div>
          <div class="fw-semibold">${esc(d.name)} ${optB}</div>
          <div class="sd-meta">แฟ้ม ${esc(f.label || d.prefix)} · ${esc(route.label)} (${esc(route.seq)})${d.note ? ' · ' + esc(d.note) : ''}</div>
          <div class="mt-1"><span class="sd-chip ${s.cls}">${esc(s.label)}</span>${rec && rec.no ? `<span class="sd-no">${esc(ECMIS.sarabanThai(rec.no))}</span>` : ''}</div>
          ${sub.length ? `<div class="sd-meta mt-1">${sub.join(' · ')}</div>` : ''}
          ${!mine && !opts.readonly && st !== 'closed' ? `<div class="sd-meta mt-1">ผู้ขอเลข: ${esc(roleTitle(d.roles))}</div>` : ''}
        </div>
        <div class="sd-actions">${acts.join('')}</div>
      </div>`;
    }

    function render() {
      const ks = kases();
      const k = ks[0];
      const codes = typeof opts.codes === 'function' ? opts.codes(k) : opts.codes;
      const docs = docsFor(codes || []).filter(d => !d.when || !k || d.when(k));
      if (!k || !docs.length) { host.innerHTML = ''; host.hidden = true; return; }
      host.hidden = false;
      host.innerHTML = `<div class="ws-card mb-3 saraban-docs-card">
        <div class="card-header"><i class="fa-solid fa-hashtag"></i> เลขหนังสือของขั้นนี้ <span class="sd-meta ms-1">· ${SYS}</span></div>
        <div class="card-body">${docs.map(d => rowHtml(d, k)).join('')}
          <div class="sd-meta mt-2"><i class="fa-solid fa-circle-info me-1"></i>ต้นแบบจำลอง: ระบบสารบรรณเป็นตัวจำลองตาม Open API 2.0/3.0 · เลขจริงออกโดยงานสารบรรณเท่านั้น · ดูทุกเลขที่ <a href="number-registry.html">ทะเบียนคุมเลขสารบรรณ</a></div>
        </div></div>`;
      docs.forEach(d => { const no = ECMIS.sarabanNoOf(k, slotOf(d, k)); if (no) applyInput(slotOf(d, k), no); });
    }

    host.addEventListener('click', async ev => {
      const b = ev.target.closest('button[data-act]');
      if (!b || !host.contains(b)) return;
      const d = SARABAN_DOCS.find(x => x.code === b.dataset.code);
      const ks = kases(); const k = ks[0];
      const slot = slotOf(d, k);
      const grp = typeof opts.group === 'function' ? opts.group() : opts.group;   /* เอกสารระดับครั้งประชุม: เลขเดียวลงทุกเรื่องในครั้งประชุม */
      const group = grp ? `${grp}:${slot}` : undefined;
      const rec = ECMIS.sarabanRecord(k, slot);
      const sb = opts.sb;
      const done = () => { render(); applyInput(slot, ECMIS.sarabanNoOf(k, slot)); };
      try {
        if (b.dataset.act === 'request') { await openSarabanRequest({ kases: ks, doc: d, group: grp, sb, onDone: done }); return; }
        if (b.dataset.act === 'trace') { showTrace(rec, `${d.code} ${d.name}`); return; }
        if (b.dataset.act === 'check') {
          const r = await checkPending({ kases: ks, doc: d, slot, group, sb });
          ECMIS.toastOk('พบเอกสารในสารบรรณจากรหัสอ้างอิง · ' + r.no, 'ใช้เลขเดิม ไม่สร้างคำขอใหม่'); done(); return;
        }
        if (b.dataset.act === 'manual') {
          const r = await Swal.fire({ title: 'บันทึกเลขที่ออกนอกระบบ', input: 'text', inputLabel: `${d.code} ${d.name}`,
            inputPlaceholder: 'เช่น ' + ECMIS.formatSarabanNo(d.prefix, 12, Number(String(todayBE()).slice(0, 4))),
            html: '<div class="small text-start">ใช้เมื่องานสารบรรณออกเลขให้นอกระบบ (เช่น ระบบสารบรรณล่ม) — เลขนี้จะอยู่สถานะ "รอตรวจ" จนกว่าจะกระทบยอดกับสารบรรณ</div>',
            showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#0a2647', reverseButtons: true,
            inputValidator: v => (!v || !v.trim() ? 'กรอกเลขที่หนังสือ' : null) });
          if (!r.isConfirmed) return;
          await ECMIS.saveManualSarabanNo({ sb, kases: ks, slot, prefix: d.prefix, group, no: r.value.trim() });
          await ECMIS.patchSarabanRecord({ sb, kases: ks, slot, patch: { docCode: d.code, docName: d.name, state: 'manual', trace: trace(rec, 'บันทึกเลขนอกระบบ', r.value.trim()) } });
          ECMIS.toastOk('บันทึกเลขนอกระบบแล้ว — รอตรวจกับสารบรรณ'); done(); return;
        }
        if (b.dataset.act === 'verify') {
          if (apiMode() === 'down') throw new Error('ระบบสารบรรณไม่พร้อมให้บริการ (503)');
          await ECMIS.patchSarabanRecord({ sb, kases: ks, slot, patch: { state: 'issued', trace: trace(rec, 'กระทบยอดกับสารบรรณ', 'พบเลขในทะเบียนส่งของสารบรรณ') } });
          ECMIS.toastOk('ตรวจกับสารบรรณแล้ว · ' + rec.no); done(); return;
        }
        if (b.dataset.act === 'attach') {
          const r = await Swal.fire({ title: 'แนบไฟล์ฉบับลงนาม', input: 'file', inputAttributes: { accept: '.pdf,.png,.jpg,.jpeg' },
            html: `<div class="small text-start">${esc(d.code)} ${esc(d.name)} · เลขที่ <strong>${esc(ECMIS.sarabanThai(rec.no))}</strong><br>ระบบแนบไฟล์เข้าเอกสารใน${SYS} (Process ข้อ 7) ก่อนส่งต่อ · ต้นแบบเก็บเฉพาะชื่อไฟล์</div>`,
            showCancelButton: true, confirmButtonText: 'แนบไฟล์', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#0a2647', reverseButtons: true,
            inputValidator: f => (!f ? 'เลือกไฟล์ฉบับลงนาม' : null) });
          if (!r.isConfirmed) return;
          const file = { name: r.value.name, size: r.value.size, at: new Date().toISOString(), by: who() };
          await ECMIS.patchSarabanRecord({ sb, kases: ks, slot, patch: { state: 'attached', file, trace: trace(rec, 'แนบไฟล์ฉบับลงนาม', file.name) } });
          ECMIS.toastOk('แนบไฟล์ฉบับลงนามแล้ว', file.name); done(); return;
        }
        if (b.dataset.act === 'forward') {
          const r = await Swal.fire({ title: 'ส่งต่อในระบบสารบรรณ', input: 'text', inputLabel: 'แฟ้มปลายทาง / หน่วยงานผู้รับ', inputValue: rec.to || d.to || '',
            html: `<div class="small text-start">ส่งเอกสาร <strong>${esc(ECMIS.sarabanThai(rec.no))}</strong> ให้หน่วยงานปลายทางเห็นเป็น "รอรับ" (Process ข้อ 10)</div>`,
            showCancelButton: true, confirmButtonText: 'ส่งต่อ', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#0a2647', reverseButtons: true,
            inputValidator: v => (!v || !v.trim() ? 'ระบุปลายทาง' : null) });
          if (!r.isConfirmed) return;
          const sent = { via: 'eoffice', to: r.value.trim(), at: new Date().toISOString(), by: who() };
          await ECMIS.patchSarabanRecord({ sb, kases: ks, slot, patch: { state: 'sent', sent, trace: trace(rec, 'ส่งต่อในระบบสารบรรณ', sent.to) } });
          ECMIS.toastOk('ส่งต่อในระบบสารบรรณแล้ว', sent.to); done(); return;
        }
        if (b.dataset.act === 'mail') {
          const r = await Swal.fire({ title: 'บันทึกส่งไปรษณีย์ลงทะเบียน', input: 'text', inputLabel: 'เลข EMS (ยิงบาร์โค้ดจากใบฝากส่งได้)',
            inputPlaceholder: 'เช่น EQ 1702 9983 1 TH',
            html: `<div class="small text-start">หนังสือ <strong>${esc(ECMIS.sarabanThai(rec.no))}</strong> ส่งทางไปรษณีย์ ไม่ส่งต่อผ่านสารบรรณ (Process ข้อ 2 → 7 → 6)</div>`,
            showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#0a2647', reverseButtons: true,
            inputValidator: v => {
              const t = String(v || '').replace(/\s+/g, '').toUpperCase();
              return /^[A-Z]{2}\d{9}TH$/.test(t) ? null : 'รูปแบบเลข EMS: อักษร 2 ตัว + ตัวเลข 9 หลัก + TH';
            } });
          if (!r.isConfirmed) return;
          const sent = { via: 'mail', ems: r.value.replace(/\s+/g, '').toUpperCase(), to: rec.to || d.to, at: new Date().toISOString(), by: who() };
          await ECMIS.patchSarabanRecord({ sb, kases: ks, slot, patch: { state: 'sent', sent, trace: trace(rec, 'ส่งไปรษณีย์ลงทะเบียน', 'EMS ' + sent.ems) } });
          ECMIS.toastOk('บันทึกส่งไปรษณีย์แล้ว', 'EMS ' + sent.ems); done(); return;
        }
        if (b.dataset.act === 'close') {
          const r = await ECMIS.confirmAction({ title: 'ปิดเรื่องในระบบสารบรรณ?', html: `<p class="mb-0">${esc(d.code)} ${esc(d.name)} · ${esc(ECMIS.sarabanThai(rec.no))}</p>`, confirmText: 'ปิดเรื่อง' });
          if (!r || !r.isConfirmed) return;
          await ECMIS.patchSarabanRecord({ sb, kases: ks, slot, patch: { state: 'closed', closedAt: new Date().toISOString(), trace: trace(rec, 'ปิดเรื่อง', '') } });
          ECMIS.toastOk('ปิดเรื่องแล้ว · ' + rec.no); done();
        }
      } catch (e) {
        console.error('งานเลขสารบรรณไม่สำเร็จ:', e);
        ECMIS.toastWarn('ดำเนินการไม่สำเร็จ: ' + (e.message || e));
      }
    });

    render();
    return { refresh: render };
  }

  /* ---------- รวม record ทุกสำนวน (หน้าทะเบียนคุมเลข) ---------- */
  async function listSarabanEntries(sb) {
    const ECMIS = E();
    const client = sb === undefined ? ECMIS.getSupabaseClient() : sb;
    const byId = new Map((ECMIS.CASES || []).map(c => [String(c.trr_id || c.id), c]));
    let rows = [];
    try { rows = await ECMIS.loadSarabanRows(client); }
    catch (e) { console.warn('อ่านเลขสารบรรณจากฐานข้อมูลไม่สำเร็จ ใช้ข้อมูลในเครื่องแทน:', e); rows = await ECMIS.loadSarabanRows(null); }
    /* รวมเลขที่อยู่ในเบราว์เซอร์ (สำนวนตัวอย่างที่ไม่มีในฐานข้อมูล หรือเปิดออฟไลน์) — slot เดียวกันใช้ record ที่ใหม่กว่า */
    const stamp = r => String((r && (r.closedAt || (r.sent && r.sent.at) || (r.file && r.file.at) || r.issuedAt || r.requestedAt)) || '');
    const byTrr = new Map(rows.map(r => [String(r.trr_id), r]));
    (ECMIS.CASES || []).forEach(c => {
      const mine = (c.resolutionData && c.resolutionData.sarabanNos) || {};
      if (!Object.keys(mine).length) return;
      const id = String(c.trr_id || c.id);
      const row = byTrr.get(id);
      if (!row) { const r = { trr_id: c.trr_id || c.id, trr_resolution_data: { sarabanNos: mine } }; rows.push(r); byTrr.set(id, r); return; }
      const nos = Object.assign({}, (row.trr_resolution_data || {}).sarabanNos || {});
      Object.entries(mine).forEach(([slot, r]) => { if (r && stamp(r) > stamp(nos[slot])) nos[slot] = r; });
      row.trr_resolution_data = Object.assign({}, row.trr_resolution_data, { sarabanNos: nos });
    });
    rows = rows.filter(row => Object.keys((row.trr_resolution_data || {}).sarabanNos || {}).length);
    /* แถวที่ไม่มีใน CASES ของเบราว์เซอร์ — อ่านเลขสำนวนจากฐานข้อมูล (อ่านอย่างเดียว) */
    const missing = rows.map(r => r.trr_id).filter(id => !byId.has(String(id)));
    if (client && missing.length && ECMIS.supabaseRowToCase) {
      try {
        const { data } = await client.from('tbl_res_request').select('*, tbl_cmp_case(*)').in('trr_id', missing);
        (data || []).forEach(row => { const k = ECMIS.supabaseRowToCase(row); if (k) byId.set(String(row.trr_id), k); });
      } catch (e) { console.warn('อ่านเลขสำนวนไม่สำเร็จ:', e); }
    }
    const seen = new Set(); const out = [];
    rows.forEach(row => {
      const k = byId.get(String(row.trr_id)) || { id: String(row.trr_id), trr_id: row.trr_id };
      Object.entries((row.trr_resolution_data || {}).sarabanNos || {}).forEach(([slot, r]) => {
        if (!r) return;
        const key = r.group || `${row.trr_id}:${slot}`;
        if (seen.has(key)) { const hit = out.find(o => o.key === key); if (hit && !hit.cases.includes(k)) hit.cases.push(k); return; }
        seen.add(key);
        const doc = SARABAN_DOCS.find(d => d.code === r.docCode) || SARABAN_DOCS.find(d => slotOf(d, k) === slot) || null;
        out.push({ key, slot, rec: r, doc, label: doc ? '' : (LEGACY_SLOTS[slot] || slot), cases: [k], state: stateOf(r) });
      });
    });
    return out.sort((a, b) => String(b.rec.requestedAt || b.rec.issuedAt || '').localeCompare(String(a.rec.requestedAt || a.rec.issuedAt || '')));
  }

  const api = { SARABAN_DOCS, SARABAN_FILES: FILES, SARABAN_ROUTES: ROUTE, SARABAN_STATES: STATES, SARABAN_RECEIVE_ITEM: RECEIVE_ITEM, SARABAN_SYSTEM: SYS,
    sarabanDocVisible: docVisible, sarabanDocsFor: docsFor, sarabanSlotOf: slotOf, sarabanStateOf: stateOf, sarabanApiMode: apiMode, setSarabanApiMode: setApiMode,
    sarabanCanAct: canAct, ensureSarabanStyle: ensureStyle, openSarabanRequest, showSarabanTrace: showTrace, mountSarabanDocs, listSarabanEntries, a7Option: OPT };
  if (root.ECMIS) Object.assign(root.ECMIS, api);
})(typeof window !== 'undefined' ? window : globalThis);
