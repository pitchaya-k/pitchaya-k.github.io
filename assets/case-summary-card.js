/* การ์ด "สรุปสำนวน" ของหน้ารองเลขาฯ / เลขาฯ (A7-01 – A7-07)
   ใช้ร่วมกันระหว่าง approval-review.html (ข้อมูลจริง) และหน้าจอ Mock approval-review-mock-01..06.html (ข้อมูลจำลอง)
   ต้องโหลดหลัง assets/ecmis-app.js

   ช่องที่ไม่มีค่าแยกความหมาย 3 แบบ — ห้ามสรุปว่า "ไม่มี" เมื่อข้อมูลยังมาไม่ครบ:
     NO_DATA = ยังไม่มีข้อมูล (ค่าเริ่มต้นเมื่อช่องว่าง) · NONE = ตรวจแล้วไม่มีรายการ · NA = ไม่เกี่ยวข้องกับเรื่องประเภทนี้
   ผู้ส่งข้อมูลระบุ NONE / NA เองผ่าน kase.fieldStates เช่น { accused:'NA', witnessProtection:'NONE' } — ระบบไม่เดาเองจากรายการว่าง

   รูปแบบข้อมูลที่การ์ดอ่าน (จากฟิลด์ของสำนวน แล้วจึงจาก kase.junction.payload / caseContext ที่ส่งมาทางทะเบียนกลาง):
     intakeChannel                 : 'WEBSITE' | 'NACC' | 'WALK_IN' | 'HOTLINE_1206' | ข้อความอิสระ          (A7-01)
     receivedDate / mockDaysElapsed: วันที่รับเรื่อง · จำนวนวันจำลอง (มีเฉพาะหน้าจอ Mock)                   (A7-02)
     offenses                      : [{ section:'ม.149', name:'เจ้าพนักงานเรียกรับทรัพย์สิน' }]              (A7-03)
     accused[i].result             : 'MERIT' | 'NO_MERIT' (รอบ 213) · 'INDICT' | 'NO_INDICT' (รอบ 644) | ข้อความ (A7-04)
     accused[i].offenseResults     : [{ offense:'ม.149', result:'มีมูล', note:'...' }]                       (A7-05)
     ownerOpinion / meetingResolution : ข้อความ — ความเห็นผู้รับผิดชอบสำนวนแยกจากมติที่ประชุม
     witnessProtection             : { has:true|false, caseNo, detail, url, mockLink }                       (A7-06)
     prototypeFilled               : [ชื่อช่อง] ที่ case-summary-prototype-fill.js เติมเป็นตัวอย่างประกอบ (แสดงหมายเหตุใต้การ์ด) */
(function (global) {
'use strict';

const ECMIS = global.ECMIS;
if (!ECMIS) { throw new Error('case-summary-card.js must load after ecmis-app.js'); }

const INTAKE_CHANNELS = { WEBSITE: 'เว็บไซต์', NACC: 'ป.ป.ช. ส่งเรื่อง', WALK_IN: 'Walk-in', HOTLINE_1206: 'สายด่วน 1206' };
/* A7-04: รอบ 213 ใช้ "มีมูล / ไม่มีมูล" (คำยังรอยืนยันตามช่อง "ต้องยืนยันก่อนแก้" ใน Excel) */
const ACCUSED_RESULTS = { MERIT: 'มีมูล', NO_MERIT: 'ไม่มีมูล', INDICT: 'ชี้มูล', NO_INDICT: 'ไม่ชี้มูล' };
const EMPTY_TEXT = { NO_DATA: 'ยังไม่มีข้อมูล', NONE: 'ไม่มีรายการ', NA: 'ไม่เกี่ยวข้อง' };

const esc = v => ECMIS.escapeHtml(String(v));
const isBlank = v => v == null || v === '' || v === '—' || v === '-';
const emptyHtml = state => `<span class="text-muted">${EMPTY_TEXT[state] || EMPTY_TEXT.NO_DATA}</span>`;
const stateOf = (k, key) => ((k && k.fieldStates) || {})[key] || 'NO_DATA';
const valueOr = (k, key, v) => (isBlank(v) ? emptyHtml(stateOf(k, key)) : esc(v));
const isIsoDate = v => /^\d{4}-\d{2}-\d{2}/.test(String(v || ''));

function caseSource(k, key) {
  const p = (k.junction && k.junction.payload) || {};
  const v = k[key] != null ? k[key] : (p[key] != null ? p[key] : (p.caseContext || {})[key]);
  return v === '' ? null : v;
}
function lineOf(k) { return ECMIS.isCase73(k) ? '7.3' : (ECMIS.isCase72(k) ? '7.2' : '7.1'); }
/* ทะเบียนกลางใส่ "-" แทนชื่อเมื่อยังไม่ระบุผู้ถูกกล่าวหา — ไม่นับเป็นรายชื่อ */
const namedAccused = k => (Array.isArray(k.accused) ? k.accused : []).filter(a => a && !isBlank(String(a.name || '').trim()));
function offensesOf(k) {
  const list = caseSource(k, 'offenses');
  return (Array.isArray(list) ? list : [])
    .map(o => (typeof o === 'string' ? { name: o } : o))
    .filter(o => o && (o.section || o.name));
}
const offenseLabel = o => [o.section, o.name].filter(Boolean).join(' ');
const caseNoOrNull = k => { const no = ECMIS.caseNo(k); return isBlank(no) ? null : no; };
function accusedResultText(a) {
  const r = a && (a.result || a.finding);
  return r ? (ACCUSED_RESULTS[r] || String(r)) : null;
}

function caseTypeChip(k) {
  const t73 = ECMIS.isCase73(k) && ECMIS.generalType73(k.generalType);
  return t73
    ? `<span class="meet-badge meet-type-general"><i class="fa-solid fa-scale-balanced me-1"></i>เรื่องทั่วไป / ${esc(t73.label)}</span>`
    : ECMIS.typeBadge(k);
}

/* A7-02: วันที่รับเรื่อง · ดำเนินการมาแล้ว N วัน — ระบบจริงคำนวณอัตโนมัติถึงวันนี้ (ปีระบบเป็น พ.ศ.; ค่า ค.ศ. แปลงก่อนนับ)
   หน้าจอ Mock ส่ง mockDaysElapsed มาเป็นค่าจำลอง และแสดงหมายเหตุกำกับว่าระบบจริงต้องคำนวณเอง */
function receivedHtml(k) {
  const raw = k && k.receivedDate;
  if (isBlank(raw)) return emptyHtml(stateOf(k, 'receivedDate'));
  const iso = String(raw).slice(0, 10);
  if (!isIsoDate(iso)) return esc(ECMIS.thaiDate(raw));
  if (k.mockDaysElapsed != null) {
    return `${esc(ECMIS.thaiDate(iso))} · ดำเนินการมาแล้ว ${esc(k.mockDaysElapsed)} วัน
      <span class="text-muted" style="font-size:.8em">(ค่าจำลอง — ระบบจริงคำนวณอัตโนมัติจากวันที่รับเรื่อง)</span>`;
  }
  const p = iso.split('-');
  let y = parseInt(p[0], 10);
  if (!isNaN(y) && y < 2400) y += 543;
  const days = -ECMIS.daysUntilFakeIso(`${y}-${p[1]}-${p[2]}`);
  return esc(ECMIS.thaiDate(iso)) + (Number.isFinite(days) && days >= 0 ? ` · ดำเนินการมาแล้ว ${days} วัน` : '');
}
const dateHtml = (k, key) => (isIsoDate(k[key]) ? esc(ECMIS.thaiDate(k[key])) : emptyHtml(stateOf(k, key)));

/* วันกำหนดตามประเภทเคส — 7.1 ใช้ ม.23 (60 วัน / 2 ปี) · 7.2 ใช้รอบการไต่สวน + อายุความ · 7.3 ไม่มีกำหนดตาม ม.23 */
function deadlineFields(k) {
  const line = lineOf(k);
  if (line === '7.3') return [['วันกำหนดเริ่มไต่สวน / ครบกำหนด', emptyHtml('NA')]];
  if (line === '7.2') return [['รอบการไต่สวน', `ครั้งที่ ${esc(k.round72 || 1)}`], ['วันครบกำหนดอายุความ', dateHtml(k, 'prescription')]];
  return [['ต้องเริ่มไต่สวนภายใน (ม.23)', dateHtml(k, 'deadline60')], ['ครบกำหนด 2 ปี (ม.23)', dateHtml(k, 'deadline2y')]];
}

function ownerOpinionHtml(k) {
  if (!isBlank(k.ownerOpinion)) return esc(k.ownerOpinion);
  /* 7.3 ไม่มีความเห็น "รับไว้ไต่สวน" ของผู้รับผิดชอบ (Task 179) — ไม่ดึงจากความเห็นตามสายที่ระบบสร้างให้ */
  const op = !ECMIS.isCase73(k) && (k.chainOpinions || []).find(o => o.roleId === 'owner');
  if (op) {
    const type = ECMIS.OPINION_TYPES && ECMIS.OPINION_TYPES[op.type];
    return `${type ? `<span class="chip">${esc(type.label)}</span> — ` : ''}${esc(op.note || '')}`;
  }
  return emptyHtml(stateOf(k, 'ownerOpinion'));
}

/* A7-05: ความเห็น/ผลแยกตามผู้ถูกกล่าวหา × ฐานความผิด */
function findingsHtml(k, accused) {
  const rows = [];
  accused.forEach((a, i) => (a.offenseResults || []).forEach(r => rows.push(
    `<tr><td>${esc(a.no || i + 1)}. ${esc(a.name)}</td><td>${esc(r.offense || '—')}</td>
      <td><span class="chip">${esc(r.result || '—')}</span>${r.note ? ` <span class="text-muted">${esc(r.note)}</span>` : ''}</td></tr>`)));
  if (!rows.length) return emptyHtml(accused.length ? stateOf(k, 'findings') : stateOf(k, 'accused'));
  return `<table class="table table-sm table-bordered mb-0" style="font-size:.95em">
    <thead class="table-light"><tr><th>ผู้ถูกกล่าวหา</th><th>ฐานความผิด</th><th>ความเห็น / ผล</th></tr></thead>
    <tbody>${rows.join('')}</tbody></table>`;
}

/* A7-06: คุ้มครองพยาน — คำว่า "เปิดเรื่องใน กจ.6" แสดงเสมอในทุกสถานะ ต่างกันแค่ style
   กดได้ = มีเรื่องคุ้มครองพยานและต้นทางส่ง url มา (ลิงก์สีปกติ) · กดไม่ได้ = สีจาง ไม่มีลิงก์ พร้อมคำอธิบายเมื่อชี้
   (mockLink = ลิงก์ของหน้าจอ Mock ไม่พาไปไหน แสดงแจ้งเตือนว่าเป็นลิงก์จำลองแทน) */
const A6_LINK_TEXT = 'เปิดเรื่องใน กจ.6';
function witnessLinkHtml(wp) {
  if (wp && wp.has && wp.url) {
    return wp.mockLink
      ? `<a class="text-decoration-none" href="#" data-mock-link="${esc(wp.caseNo || '')}">${A6_LINK_TEXT}</a>`
      : `<a class="text-decoration-none" href="${esc(wp.url)}" target="_blank" rel="noopener">${A6_LINK_TEXT}</a>`;
  }
  const why = wp && wp.has ? 'ยังไม่มีลิงก์จาก กจ.6' : 'ไม่มีเรื่องที่เชื่อมโยงใน กจ.6';
  return `<span class="text-muted" style="cursor:not-allowed;opacity:.6" aria-disabled="true" title="${why}">${A6_LINK_TEXT}</span>`;
}
function witnessHtml(k) {
  const wp = caseSource(k, 'witnessProtection');
  const status = !wp ? emptyHtml(stateOf(k, 'witnessProtection'))
    : !wp.has ? emptyHtml('NONE')
    : `มี${wp.caseNo ? ' — เรื่อง ' + esc(wp.caseNo) : ''}${wp.detail ? ` <span class="text-muted">(${esc(wp.detail)})</span>` : ''}`;
  return `${status} · ${witnessLinkHtml(wp)}`;
}

/* หนึ่งช่องต่อหนึ่งบรรทัด (ป้ายซ้าย / ค่าขวา) ในกริดเดียวทั้งการ์ด — ป้ายทุกส่วนตรงแนวกัน ค่าที่ยาวตัดบรรทัดในคอลัมน์ค่าเอง
   opts.extraOpinionFields = [[ป้าย, HTML ที่ escape แล้ว]] ต่อท้ายส่วนความเห็น (เช่น ความเห็นตามสายอนุมัติของหน้าชี้มูล) */
function html(k, opts) {
  const o = opts || {};
  const field = (label, value) => `<span class="k text-nowrap">${label}:</span><span class="v">${value}</span>`;
  const section = (title, inner) => `<hr class="my-1" style="grid-column:1/-1"><div class="fw-semibold" style="grid-column:1/-1">${title}</div>${inner}`;

  const channel = intakeChannelText(k);
  const intake = [
    field('ช่องทางรับเรื่อง', channel ? esc(channel) : emptyHtml(stateOf(k, 'intakeChannel'))),
    field('วันที่รับเรื่อง', receivedHtml(k))
  ].concat(deadlineFields(k).map(([label, v]) => field(label, v)), [
    field('ฐานการรับเรื่อง', valueOr(k, 'legalBase', k.legalBase)),
    field('เจ้าของสำนวน', valueOr(k, 'owner', k.owner)),
    field('หน่วยงาน', valueOr(k, 'ownerOrg', k.ownerOrg))
  ]).join('');

  const offenses = offensesOf(k);
  const offenseInner = field('ฐานความผิด', offenses.length ? offenses.map(x => esc(offenseLabel(x))).join('<br>') : emptyHtml(stateOf(k, 'offenses')))
    + field('ข้อกล่าวหา / พฤติการณ์', valueOr(k, 'allegation', k.allegation));

  const accused = namedAccused(k);
  const accusedState = stateOf(k, 'accused');
  const accusedList = accused.length
    ? `${accused.length} คน<br>` + accused.map((a, i) => `${esc(a.no || i + 1)}. ${esc(a.name)}${a.pos ? ' — ' + esc(a.pos) : ''}${a.agency ? ` <span class="text-muted">(${esc(a.agency)})</span>` : ''}`).join('<br>')
    : emptyHtml(accusedState);
  const resultList = accused.length
    ? accused.map((a, i) => `${esc(a.no || i + 1)}. ${esc(a.name)} — ${accusedResultText(a) ? `<span class="chip">${esc(accusedResultText(a))}</span>` : emptyHtml(stateOf(k, 'accusedResult'))}`).join('<br>')
    : emptyHtml(accusedState);
  const accusedInner = field('รายชื่อและจำนวน', accusedList) + field('ผลรายบุคคล', resultList)
    + field('ผลแยกตามฐานความผิด', findingsHtml(k, accused));

  const opinionInner = field('ความเห็นผู้รับผิดชอบสำนวน', ownerOpinionHtml(k))
    + (o.extraOpinionFields || []).map(([label, v]) => field(label, v)).join('')
    + field('มติที่ประชุม', valueOr(k, 'meetingResolution', k.meetingResolution));

  return `<div style="font-size:.88rem"><div class="mb-2">${caseTypeChip(k)}</div>
    <div class="kv" style="display:grid;grid-template-columns:max-content minmax(0,1fr);gap:.4rem 1rem;align-items:start;font-size:inherit">
      ${field('เรื่อง', valueOr(k, 'subject', k.subject))}
      ${field('เลขสำนวน', caseNoOrNull(k) ? esc(caseNoOrNull(k)) : emptyHtml(stateOf(k, 'caseNo')))}
      ${section('ข้อมูลรับเรื่อง', intake)}
      ${section('ฐานความผิดและข้อกล่าวหา', offenseInner)}
      ${section('ผู้ถูกกล่าวหา', accusedInner)}
      ${section('ความเห็นและมติ', opinionInner)}
      ${section('เรื่องที่เกี่ยวข้องใน กจ.6', field('การคุ้มครองพยาน', witnessHtml(k)))}
    </div>${prototypeNoteHtml(k)}</div>`;
}
/* ช่องที่ assets/case-summary-prototype-fill.js เติมให้เคสเดิม — บอกชัดว่าเป็นตัวอย่างประกอบ ไม่ใช่ข้อมูลจริงจากต้นทาง */
/* ป้าย/หมายเหตุข้อมูลจำลองรูปแบบเดียวกันทุกหน้า — หน้า Mock (isMock) จำลองทั้งการ์ด · เคสเดิมจำลองเฉพาะช่องที่เติม */
const SAMPLE_CHIP = '<span class="chip ms-2" style="font-size:.72rem">ข้อมูลจำลอง</span>';
const isSample = k => !!(k && (k.isMock || (k.prototypeFilled || []).length));
function prototypeNoteHtml(k) {
  if (!isSample(k)) return '';
  const what = k.isMock ? 'ข้อมูลทั้งการ์ด' : (k.prototypeFilled || []).map(esc).join(' · ');
  return `<div class="text-muted mt-2" style="font-size:.8rem"><i class="fa-solid fa-circle-info me-1"></i>ข้อมูลจำลอง (Prototype): ${what}
    — ระบบจริงรับข้อมูลจากกิจกรรมต้นทาง</div>`;
}
function intakeChannelText(k) {
  const v = caseSource(k, 'intakeChannel');
  return v == null ? null : (INTAKE_CHANNELS[v] || String(v));
}

/* A7-07: การ์ดพับได้ ค่าเริ่มต้นแสดงแบบย่อ (ชิปประเภทเรื่อง + เรื่อง / เลขสำนวน / ฐานความผิด / จำนวนผู้ถูกกล่าวหา) กด "ดูทั้งหมด" เพื่อขยาย */
const COMPACT_FIELDS = [
  ['เรื่อง', k => valueOr(k, 'subject', k.subject)],
  ['เลขสำนวน', k => (caseNoOrNull(k) ? esc(caseNoOrNull(k)) : emptyHtml(stateOf(k, 'caseNo')))],
  ['ฐานความผิด', k => (offensesOf(k).length ? esc(offensesOf(k).map(offenseLabel).join(', ')) : emptyHtml(stateOf(k, 'offenses')))],
  ['ผู้ถูกกล่าวหา', k => (namedAccused(k).length ? `${namedAccused(k).length} คน` : emptyHtml(stateOf(k, 'accused')))]
];
function mountCollapse(card, k) {
  if (!card || card.dataset.collapse || !k) return;
  card.dataset.collapse = '1';
  const header = card.querySelector('.card-header');
  const body = card.querySelector('.card-body');
  if (!header || !body) return;
  const full = document.createElement('div');
  full.id = 'summaryFull';
  full.hidden = true;
  while (body.firstChild) full.appendChild(body.firstChild);
  const compact = document.createElement('div');
  compact.className = 'summary-compact';
  compact.style.fontSize = '.88rem';
  compact.innerHTML = `<div class="mb-2">${caseTypeChip(k)}</div>
    <div class="kv" style="display:grid;grid-template-columns:max-content minmax(0,1fr);gap:.4rem 1rem;font-size:inherit">`
    + COMPACT_FIELDS.map(([label, get]) => `<span class="text-muted">${label}:</span><span>${get(k)}</span>`).join('') + '</div>';
  body.append(compact, full);
  /* หัวการ์ดเหมือนกันทุกหน้าจอ (เดิมหน้าเลขาฯ ใช้ "สรุปสำนวนสำหรับผู้พิจารณา" / หน้ารองเลขาฯ และ Mock ใช้ "สรุปสำนวน") */
  header.innerHTML = `<i class="fa-solid fa-folder-open"></i> สรุปสำนวน${isSample(k) ? SAMPLE_CHIP : ''}`;
  header.classList.add('d-flex', 'align-items-center', 'gap-2');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-sm btn-link ms-auto p-0 text-decoration-none';
  btn.dataset.a7roKeep = '';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'summaryFull');
  btn.innerHTML = '<span>ดูทั้งหมด</span> <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    full.hidden = !open;
    compact.hidden = open;
    btn.querySelector('span').textContent = open ? 'ย่อ' : 'ดูทั้งหมด';
    btn.querySelector('i').className = `fa-solid fa-chevron-${open ? 'up' : 'down'}`;
  });
  header.appendChild(btn);
  card.addEventListener('click', e => {
    const a = e.target.closest('[data-mock-link]');
    if (!a) return;
    e.preventDefault();
    ECMIS.toastOk('ลิงก์จำลอง (Prototype)', `ระบบจริงจะเปิดรายการ ${a.dataset.mockLink || ''} ในกิจกรรมที่ 6 (คุ้มครองพยาน)`);
  });
}

global.ECMISCaseSummary = { html, mountCollapse, caseTypeChip, EMPTY_TEXT };

})(window);
