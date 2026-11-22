/* ผอ.กบค. พิจารณาเห็นชอบเอกสารก่อนเสนอผู้ลงนาม (User Flow V1.0.14 Option B: 6-1 ขั้น 6.1.4, 6-2 ขั้น 6.2.1, 7-2 ขั้น 7.2.1)
   ไม่เปลี่ยนสถานะสำนวน (ไม่แตะ TRANSITIONS / STATUS_CODE) — เก็บผลใน trr_resolution_data.dirCaseApproval[order|discipline72]
   = { decision: 'APPROVED'|'RETURNED', stage, note, at, by, signer } และบันทึกเหตุการณ์ DIR_CASE_APPROVE / DIR_CASE_RETURN
   (from = to = สถานะปัจจุบัน) แบบเดียวกับขั้น 6.4 (additional-inquiry.html)
   ไฟล์นี้ใช้ทั้งหน้า dir-case-approve.html และแถบแจ้งผลบนหน้าผู้ลงนาม (order.html, ruling-report.html) */
(function () {
  const STAGES = {
    '6.1': { key: 'order', step: '6.1.4', docTitle: 'คำสั่งคณะกรรมการ ป.ป.ท. / คำสั่งแต่งตั้งผู้ไต่สวน (ม.24)', flowTo: 'chairman', docPage: 'order.html' },
    '6.2': { key: 'order', step: '6.2.1', docTitle: 'คำสั่งสำนักงาน ป.ป.ท.', flowTo: 'secgen', docPage: 'order.html' },
    '7.2': { key: 'discipline72', step: '7.2.1', docTitle: 'หนังสือขอให้ลงโทษทางวินัย (ปปท.8-05)', flowTo: 'chairman', docPage: 'ruling-report.html' }
  };
  const ORDER_STATUSES = ['PENDING_SIGN_ORDER_SECGEN', 'PENDING_SIGN_ORDER_CHAIRMAN'];
  const DISCIPLINE_STATUSES = ['PENDING_DISPATCH_GUILTY_72'];

  function stageOf(kase, override) {
    if (override && STAGES[override]) return override;
    if (!kase) return null;
    if (kase.status === 'PENDING_SIGN_ORDER_CHAIRMAN') return '6.1';
    if (kase.status === 'PENDING_SIGN_ORDER_SECGEN') return '6.2';
    if (DISCIPLINE_STATUSES.includes(kase.status)) return '7.2';
    return null;
  }
  function isOpenFor(kase, stage) {
    const st = STAGES[stage];
    if (!st || !kase) return false;
    return st.key === 'order' ? ORDER_STATUSES.includes(kase.status) : DISCIPLINE_STATUSES.includes(kase.status);
  }
  /* ผู้ลงนามจริงในต้นแบบ = เจ้าของสถานะปัจจุบัน (คำสั่ง ม.24 ต้นแบบให้เลขาธิการฯ ลงนาม ต่างจากผัง 6-1 ที่ระบุประธานฯ — รอยืนยัน)
     หนังสือลงโทษ 7.2.2 ประธานฯ ลงนาม */
  function signerRoleOf(kase, stage) {
    const st = STAGES[stage];
    if (!st) return null;
    if (st.key === 'discipline72') return 'chairman';
    const s = window.ECMIS && ECMIS.STATUS && ECMIS.STATUS[kase.status];
    return (s && s.owner) || st.flowTo;
  }
  function recordOf(kase, stage) {
    const st = STAGES[stage];
    if (!st || !kase) return null;
    const rd = kase.resolutionData || {};
    return (rd.dirCaseApproval && rd.dirCaseApproval[st.key]) || null;
  }
  function roleName(id) {
    try { const r = ECMIS.getRole(id); return r ? r.title : id; } catch (e) { return id; }
  }
  function bannerHtml(kase, stage) {
    const st = STAGES[stage];
    if (!st) return '';
    const E = (window.ECMIS && ECMIS.escapeHtml) || (s => String(s));
    const rec = recordOf(kase, stage);
    const signer = roleName(signerRoleOf(kase, stage));
    const when = rec && rec.at ? ' · ' + ECMIS.thaiDate(String(rec.at).slice(0, 10)) : '';
    let cls = 'pending', icon = 'fa-hourglass-half', text;
    if (rec && rec.decision === 'APPROVED') {
      cls = 'ok'; icon = 'fa-circle-check';
      text = `ผอ.กบค. เห็นชอบ${E(st.docTitle)}แล้ว เสนอ${E(signer)}ลงนาม${when}`;
    } else if (rec && rec.decision === 'RETURNED') {
      cls = 'warn'; icon = 'fa-rotate-left';
      text = `ผอ.กบค. ส่งกลับให้แก้ไข${when}`;
    } else {
      text = `รอ ผอ.กบค. พิจารณาเห็นชอบ${E(st.docTitle)} (ขั้น ${st.step}) ก่อนเสนอ${E(signer)}ลงนาม`;
    }
    const note = rec && rec.note ? `<div class="a7dca-note">ความเห็น: ${E(rec.note)}</div>` : '';
    return `<div class="a7dca-banner a7dca-${cls}" data-stage="${stage}"><i class="fa-solid ${icon} me-2"></i><div><div>${text}</div>${note}</div></div>`;
  }

  function injectCss() {
    if (document.getElementById('a7dca-css')) return;
    const s = document.createElement('style');
    s.id = 'a7dca-css';
    s.textContent = `.a7dca-banner{display:flex;align-items:flex-start;gap:.25rem;padding:.6rem .85rem;border-radius:8px;margin:0 0 .85rem;font-size:.9rem;border:1px solid}
      .a7dca-ok{background:#ecfdf3;border-color:#a6e3bf;color:#14532d}
      .a7dca-warn{background:#fff7ed;border-color:#fdc98f;color:#7c2d12}
      .a7dca-pending{background:#f1f5fb;border-color:#c9d6ea;color:#1e3a6b}
      .a7dca-note{font-size:.82rem;opacity:.85;margin-top:.15rem;white-space:pre-wrap}`;
    document.head.appendChild(s);
  }

  /* แถบแจ้งผลบนหน้าผู้ลงนาม — โหลดเรื่องจาก ?case= เอง จึงเพิ่มได้ด้วยแท็กสคริปต์เดียวโดยไม่ต้องแก้โค้ดหน้า */
  async function autoBanner() {
    const page = (location.pathname.split('/').pop() || '').toLowerCase();
    if (page === 'dir-case-approve.html') return;
    const caseNo = new URLSearchParams(location.search).get('case');
    if (!caseNo || !window.ECMIS || !ECMIS.getSupabaseClient) return;
    let kase = null;
    try {
      const sb = ECMIS.getSupabaseClient();
      if (!sb) return;
      const { data } = await sb.from('tbl_res_request')
        .select('*, tbl_cmp_case!inner(*, tbl_cmp_case_accused(*))')
        .eq('tbl_cmp_case.tcc_no', caseNo).eq('is_deleted', false).maybeSingle();
      if (data) kase = ECMIS.supabaseRowToCase(data);
    } catch (e) { return; }
    const stage = stageOf(kase);
    if (!stage || !isOpenFor(kase, stage)) return;
    if (STAGES[stage].docPage !== page) return;
    injectCss();
    const head = document.querySelector('.page-head');
    if (!head) return;
    const wrap = document.createElement('div');
    wrap.id = 'a7dcaBanner';
    wrap.innerHTML = bannerHtml(kase, stage);
    head.insertAdjacentElement('afterend', wrap);
  }

  window.A7DirApproval = { STAGES, ORDER_STATUSES, DISCIPLINE_STATUSES, stageOf, isOpenFor, signerRoleOf, recordOf, bannerHtml, injectCss };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoBanner);
  else autoBanner();
})();
