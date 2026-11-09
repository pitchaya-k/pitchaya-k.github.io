/* ตัวควบคุมหน้าจอ Mock การ์ดสรุปสำนวน + การ์ดความเห็นของเลขาฯ (approval-review-mock-01..10.html)
   แต่ละไฟล์กำหนด window.A7_MOCK_PAGE ก่อนโหลดไฟล์นี้:
     { type:'73'|'213'|'644', state:'partial'|'full' }   — หน้า 01–06 (ประเภทเคส × สถานะข้อมูล)
     { scenario:'kong71'|'urgent'|'diverged'|'round2' }  — หน้า 07–10 (สถานการณ์การ์ดความเห็นของเลขาฯ)
   การ์ดสรุปสำนวนเหมือนกันทั้งรองเลขาฯ และเลขาฯ — ปุ่มมุมมองบทบาทเปลี่ยนหัวหน้าจอ สถานะ และการ์ดความเห็น
   (รองเลขาฯ ไม่มีกล่องเร่งด่วน/ซับซ้อน) ไม่สลับบทบาทที่ login จริง ไม่บันทึกข้อมูลใด ๆ */
(function (global) {
'use strict';

const ECMIS = global.ECMIS;
const MOCKS = global.ECMISCaseSummaryMocks;
const ROUTE = global.ECMISSecgenRouteText;
const cfg = global.A7_MOCK_PAGE || {};
const VIEW_KEY = 'ecmis_a7_mock_view_role';
const VIEWS = {
  deputy: { title: 'รองเลขาธิการฯ พิจารณา / ลงความเห็น', icon: 'fa-user-tie', flow: 'ขั้นแรกของ กจ.7 — รองเลขาธิการฯ ลงความเห็นก่อนเสนอเลขาธิการฯ', status: 'PENDING_DEPUTY' },
  secgen: { title: 'เลขาธิการฯ พิจารณา / ลงนาม', icon: 'fa-user-check', flow: 'เลขาธิการฯ พิจารณาและลงนาม', status: 'PENDING_SECGEN' }
};
const esc = v => ECMIS.escapeHtml(String(v == null ? '' : v));

function readView() {
  try { const v = sessionStorage.getItem(VIEW_KEY); if (VIEWS[v]) return v; } catch (e) { /* storage ปิดอยู่ */ }
  const r = ECMIS.currentRoleId();
  return VIEWS[r] ? r : 'deputy';
}
function saveView(v) { try { sessionStorage.setItem(VIEW_KEY, v); } catch (e) { /* storage ปิดอยู่ */ } }

function linkBtn(href, label, active) {
  return `<a class="btn btn-sm ${active ? 'btn-primary' : 'btn-outline-primary'}" href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
}

/* ---------- ปลายทางของเลขาฯ (จำลอง) ----------
   ลำดับเดียวกับ secgenRoute() ใน approval-review.html (คำสั่ง ม.28 ถือว่ารับไว้ — หน้า Mock ไม่มีการ์ด ม.28):
   ซับซ้อน (รอบแรก) > เร่งด่วน (ใบด่วนแนบหรือเลขาฯ เลือก) > ผ่านอนุฯ สนับสนุนแล้ว > ปกติตามประเภทสำนวน
   หากแก้ secgenRoute() ต้องแก้ฟังก์ชันนี้ให้ตรงกันด้วย */
const hasSupport = k => !!(k.supportOpinion || k.supportOpinion72 || k.supportDecision);
const isRegional = k => !ECMIS.isCase72(k) && !ECMIS.isCase73(k) && !!(k.ownerOrg && k.ownerOrg.includes('เขต'));
function mockSecgenRoute(k, complex, urgent) {
  const is72 = ECMIS.isCase72(k);
  const support = hasSupport(k);
  if (complex && !support) return is72 ? 'PENDING_SUPPORT_ASSIGN_72' : 'PENDING_SUPPORT_ASSIGN';
  if (k.urgent || urgent) return is72 ? 'PENDING_URGENT_72' : 'PENDING_URGENT';
  if (support && isRegional(k)) return 'IN_SCREENING';
  if (support || ECMIS.isCase73(k)) return is72 ? 'PENDING_CHAIRMAN_72' : 'PENDING_CHAIRMAN';
  if (is72) return 'PENDING_CASE_ADMIN_SCREEN_72';
  if (isRegional(k)) return 'IN_SCREENING';
  return 'PENDING_CHAIRMAN';
}
/* A7-11: ข้อความตัวเลือก "ไม่ซับซ้อน" ตามเส้นทางปกติของสำนวน (เหมือน approval-review.html) */
function noComplexLabel(k) {
  if (ECMIS.isCase72(k)) return 'ไม่ซับซ้อน — เสนอประธานกรรมการ ป.ป.ท. ลงรับและคัดกรองสำนวน';
  if (isRegional(k)) return 'ไม่ซับซ้อน — ส่งกองบริหารคดีเพื่อส่งเข้าคณะอนุกลั่นกรองฯ';
  return 'ไม่ซับซ้อน — เสนอประธานกรรมการ ป.ป.ท. พิจารณาบรรจุวาระ';
}

/* ผลกลั่นกรองของคณะอนุฯ สนับสนุน (รอบที่ 2) — รูปแบบเดียวกับการ์ด supportSubResultCard ของหน้าจริง */
function supportCardHtml(k) {
  const team = k.supportSubTeam || (k.supportTeam === 'TEAM2' ? 'คณะที่ 2' : 'คณะที่ 1');
  return `<div class="ws-card mb-3 border-primary" id="mockSupportCard" style="max-width:960px">
    <div class="card-header bg-light text-primary"><i class="fa-solid fa-users-gear me-1"></i><strong>ความเห็นและผลการกลั่นกรองของคณะอนุกรรมการสนับสนุนเลขาธิการฯ</strong></div>
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <div><strong>คณะผู้กลั่นกรอง:</strong> ${esc(team)}${k.supportControlNo ? ` <span class="text-muted small">(เลขทะเบียนคุม ${esc(k.supportControlNo)})</span>` : ''}</div>
        <span class="badge bg-success">เห็นพ้องกับความเห็นเดิม</span>
      </div>
      <strong class="small text-muted">ความเห็นและข้อสังเกตประกอบ:</strong>
      <div class="p-2 bg-light rounded small">${esc(k.supportOpinion)}</div>
    </div>
  </div>`;
}

/* การ์ด "ความเห็นของผู้พิจารณาชั้นนี้" — markup และกติกาเดียวกับหน้าเลขาฯ ใน approval-review.html */
function opinionCardHtml(k, view) {
  const head = '<div class="card-header"><i class="fa-solid fa-pen-nib"></i> ความเห็นของผู้พิจารณาชั้นนี้</div>';
  if (view !== 'secgen') {
    return `${head}<div class="card-body"><div class="text-muted small"><i class="fa-solid fa-circle-info me-1"></i>
      ขั้นรองเลขาธิการฯ ไม่มีตัวเลือกเร่งด่วน / ซับซ้อน — เลขาธิการฯ เป็นผู้พิจารณาในขั้นถัดไป (สลับมุมมองเป็นเลขาธิการฯ เพื่อดูกล่อง)</div></div>`;
  }
  const support = hasSupport(k);
  const showComplex = !ECMIS.isCase73(k) && !support;
  const diverged = showComplex && ECMIS.g1Triggers(k).diverged;
  /* ชั้นต้นทาง (ผู้รับผิดชอบ/หัวหน้ากลุ่มงาน/ผอ.) ไม่ใช่บทบาทที่ login ได้ — ใช้ชื่อตำแหน่งจาก upstreamMockTitle เหมือนหน้าจริง */
  const roleTitle = o => (['owner', 'section_head', 'director'].includes(o.roleId) ? ECMIS.upstreamMockTitle(o.roleId, k) : ECMIS.getRole(o.roleId).title);
  const chainList = (k.chainOpinions || []).map(o =>
    `<li>${esc(roleTitle(o))}: <strong>${esc((ECMIS.OPINION_TYPES[o.type] || {}).label || o.type)}</strong></li>`).join('');
  const urgentPart = k.urgent
    ? `<div id="mockUrgentBadge" class="border rounded-3 p-3 mb-3" style="background:#fffaf0">
         <span class="text-warning fw-medium"><i class="fa-solid fa-bolt me-1"></i>มีใบด่วนแนบ: ${esc(k.urgentReason || '—')}</span></div>`
    : `<div class="border rounded-3 p-3 mb-3" style="background:#f8fafc">
         <label class="form-label field-req fw-semibold mb-2">เป็นกรณีเร่งด่วนหรือไม่?</label>
         <div class="d-flex flex-wrap gap-4">
           <div class="form-check mb-0"><input class="form-check-input" type="radio" name="mockUrgent" id="mockUrgentNo" value="no" checked>
             <label class="form-check-label" for="mockUrgentNo">ไม่เร่งด่วน</label></div>
           <div class="form-check mb-0"><input class="form-check-input" type="radio" name="mockUrgent" id="mockUrgentYes" value="yes">
             <label class="form-check-label" for="mockUrgentYes">เร่งด่วน</label></div>
         </div></div>`;
  const complexPart = !showComplex ? '' : `<div class="border rounded-3 p-3 mb-3" style="background:#f8fafc">
       <label class="form-label field-req fw-semibold mb-2">เป็นกรณีซับซ้อนหรือไม่?</label>
       <div class="d-flex flex-column gap-2">
         <div class="form-check mb-0"><input class="form-check-input" type="radio" name="mockComplex" id="mockComplexNo" value="no"${diverged ? ' disabled' : ' checked'}>
           <label class="form-check-label" for="mockComplexNo">${esc(noComplexLabel(k))}</label></div>
         <div class="form-check mb-0"><input class="form-check-input" type="radio" name="mockComplex" id="mockComplexYes" value="yes"${diverged ? ' checked' : ''}>
           <label class="form-check-label" for="mockComplexYes">ซับซ้อน — ส่ง ผอ.กบค. ออกเลขทะเบียนคุม / มอบหมายคณะอนุสนับสนุนฯ</label></div>
       </div>
       ${diverged ? `<div class="small text-danger mt-2"><i class="fa-solid fa-triangle-exclamation me-1"></i>${esc(ROUTE.DIVERGED_REASON)} — ต้องส่งเป็นเรื่องซับซ้อน
         <ul class="mb-0 mt-1 text-body">${chainList}</ul></div>` : ''}
       <div id="mockComplexReason" class="mt-3 d-none">
         <label class="form-label field-req" for="mockComplexReasonText">เหตุผลที่เห็นว่าเป็นเรื่องยุ่งยากซับซ้อน
           <small class="text-muted fw-normal">(ใช้ในใบบันทึกซับซ้อนถึง ผอ.กบค.)</small></label>
         <textarea class="form-control" id="mockComplexReasonText" rows="3" placeholder="เช่น มีผู้ถูกกล่าวหาหลายราย พยานหลักฐานจำนวนมาก ประเด็นข้อกฎหมายซับซ้อน..."></textarea>
       </div></div>`;
  const opinionLabel = support ? 'ความเห็นของเลขาธิการ ป.ป.ท.' : 'ความเห็น';
  const opinionText = support
    ? (isRegional(k)
      ? 'ตรวจทานรายงานและผลการกลั่นกรองของคณะอนุกรรมการสนับสนุนเลขาธิการฯ แล้ว เห็นชอบตามผลการกลั่นกรอง เห็นควรส่งกองบริหารคดีเพื่อกระจายเข้าคณะอนุกลั่นกรองฯ ต่อไป'
      : 'ตรวจทานรายงานและผลการกลั่นกรองของคณะอนุกรรมการสนับสนุนเลขาธิการฯ แล้ว เห็นชอบตามผลการกลั่นกรอง เห็นควรเสนอประธานกรรมการ ป.ป.ท. สั่งบรรจุวาระการประชุม')
    : '';
  return `${head}<div class="card-body">
    ${urgentPart}
    ${complexPart}
    <div id="mockOutcome" class="ws-callout mb-3" style="font-size:.85rem"></div>
    <div id="mockOpinionBox">
      <label class="form-label field-req" for="mockOpinionText">${opinionLabel}</label>
      <textarea class="form-control mb-3" id="mockOpinionText" rows="3" placeholder="ระบุความเห็นประกอบการเสนอตามลำดับชั้น">${esc(opinionText)}</textarea>
    </div>
    <div class="d-flex flex-wrap align-items-center gap-2 justify-content-end">
      <span class="text-muted small me-auto" id="mockNextStatus"></span>
      <button type="button" class="btn btn-gold" id="mockSignBtn"><i class="fa-solid fa-signature me-1"></i><span></span></button>
    </div>
  </div>`;
}

function mountOpinionCard(kase, getView) {
  const summary = document.getElementById('summaryCard');
  let supportEl = document.getElementById('mockSupportCard');
  if (hasSupport(kase) && !supportEl) {
    summary.insertAdjacentHTML('afterend', supportCardHtml(kase));
    supportEl = document.getElementById('mockSupportCard');
  }
  let card = document.getElementById('mockOpinionCard');
  if (!card) {
    card = document.createElement('div');
    card.className = 'ws-card mb-3';
    card.id = 'mockOpinionCard';
    card.style.maxWidth = '960px';
    (supportEl || summary).after(card);
  }
  function render() {
    const view = getView();
    card.innerHTML = opinionCardHtml(kase, view);
    if (view !== 'secgen') return;
    const complexYes = () => !!document.getElementById('mockComplexYes')?.checked;
    const urgentYes = () => !!document.getElementById('mockUrgentYes')?.checked;
    function update() {
      const st = mockSecgenRoute(kase, complexYes(), urgentYes());
      const text = ROUTE.TEXT[st] || {};
      const complexRoute = st === 'PENDING_SUPPORT_ASSIGN' || st === 'PENDING_SUPPORT_ASSIGN_72';
      document.getElementById('mockOutcome').innerHTML = `<strong>เส้นทางเมื่อลงนาม:</strong> ${esc(text.summary || '')}`
        + (complexRoute && ECMIS.g1Triggers(kase).diverged ? `<div class="text-muted mt-1" style="font-size:.78rem">เหตุ: ${esc(ROUTE.DIVERGED_REASON)}</div>` : '');
      document.getElementById('mockComplexReason')?.classList.toggle('d-none', !complexRoute);
      document.getElementById('mockOpinionBox').classList.toggle('d-none', complexRoute);
      const btn = document.getElementById('mockSignBtn');
      btn.className = `btn ${complexRoute ? 'btn-navy' : 'btn-gold'}`;
      btn.querySelector('span').textContent = text.sign || '';
      btn.dataset.status = st;
      document.getElementById('mockNextStatus').textContent = `สถานะถัดไป: ${ECMIS.STATUS_CODE[st] || '—'} · ${(ECMIS.STATUS[st] || {}).label || st}`;
    }
    card.querySelectorAll('input[type=radio]').forEach(r => r.addEventListener('change', update));
    document.getElementById('mockSignBtn').addEventListener('click', e => {
      const st = e.currentTarget.dataset.status;
      ECMIS.toastOk('หน้าจอ Mock — ไม่ลงนาม/บันทึกจริง', `หน้าจริงจะส่งต่อไปที่สถานะ ${ECMIS.STATUS_CODE[st] || ''} (${(ECMIS.STATUS[st] || {}).label || st})`);
    });
    update();
  }
  render();
  return render;
}

function init() {
  ECMIS.renderShell('approval-review.html');
  if (!MOCKS) return;
  const scenario = cfg.scenario && MOCKS.SCENARIOS[cfg.scenario];
  const def = !scenario && MOCKS.CASES[cfg.type];
  const kase = scenario ? MOCKS.buildScenario(cfg.scenario) : (def && MOCKS.buildCase(cfg.type, cfg.state));
  if (!kase) return;
  const is72 = ECMIS.isCase72(kase);
  const pageLabel = scenario ? `ตัวอย่างความเห็นเลขาฯ: ${scenario.label}` : `${def.label} · ${MOCKS.STATE_LABEL[cfg.state]}`;
  const currentFile = (location.pathname.split('/').pop() || '');
  let view = readView();

  document.getElementById('mockSwitch').innerHTML = `
    <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
      <span class="text-muted" style="min-width:7rem">ประเภทเคส:</span>
      ${Object.entries(MOCKS.CASES).map(([t, c]) => linkBtn(c.files[cfg.state || 'full'], c.label, !scenario && t === cfg.type)).join('')}
    </div>
    ${scenario ? '' : `<div class="d-flex flex-wrap align-items-center gap-2 mb-2">
      <span class="text-muted" style="min-width:7rem">สถานะข้อมูล:</span>
      ${['partial', 'full'].map(s => linkBtn(def.files[s], MOCKS.STATE_LABEL[s], s === cfg.state)).join('')}
    </div>`}
    <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
      <span class="text-muted" style="min-width:7rem">ความเห็นเลขาฯ:</span>
      ${MOCKS.OPINION_EXAMPLES.map(x => linkBtn(x.file, x.label, x.file === currentFile)).join('')}
    </div>
    <div class="d-flex flex-wrap align-items-center gap-2">
      <span class="text-muted" style="min-width:7rem">มุมมองบทบาท:</span>
      <div class="btn-group btn-group-sm" role="group" aria-label="มุมมองบทบาท">
        ${Object.keys(VIEWS).map(v => `<button type="button" class="btn btn-outline-primary" data-view="${v}">${ECMIS.getRole(v).title}</button>`).join('')}
      </div>
    </div>`;

  const card = document.getElementById('summaryCard');
  card.querySelector('.card-body').innerHTML = global.ECMISCaseSummary.html(kase);
  global.ECMISCaseSummary.mountCollapse(card, kase);
  const renderOpinion = mountOpinionCard(kase, () => view);

  function applyView() {
    const v = VIEWS[view];
    const status = v.status + (is72 ? '_72' : '');
    document.querySelector('.page-head h1').innerHTML = `<i class="fa-solid ${v.icon} me-2"></i>${v.title}`;
    document.querySelector('.flow-ref').textContent = v.flow;
    document.title = `${v.title} (Mock ${pageLabel}) | E-CMIS`;
    document.getElementById('stBadge').innerHTML = `<span class="chip me-1">เลขสำนวน ${esc(kase.id)}</span>`
      + ECMIS.statusBadge(status) + ' <span class="chip ms-1">ข้อมูลจำลอง</span>';
    /* สลับคลาสเต็ม/เส้นขอบแบบเดียวกับปุ่มประเภทเคส — .active ของ outline ถูก ecmis-ws-standard.css ทับจนดูไม่ออก */
    document.querySelectorAll('[data-view]').forEach(b => {
      const on = b.dataset.view === view;
      b.classList.toggle('btn-primary', on);
      b.classList.toggle('btn-outline-primary', !on);
      b.setAttribute('aria-pressed', String(on));
    });
    renderOpinion();
  }
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
    view = b.dataset.view;
    saveView(view);
    applyView();
  }));
  applyView();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})(window);
