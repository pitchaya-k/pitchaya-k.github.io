/**
 * Seed เคสตัวอย่างสำหรับ overall-flow.html — 1 เคสต่อ 1 กล่องในผังกระบวนงาน
 *
 * หลักการ
 * - โคลนจากเคสจริงที่มีอยู่ (template) แล้วตั้งสถานะตามกล่อง — ไม่แตะเคสเดิมเลย
 * - เลขสำนวนตัวอย่างอยู่ในช่วง 9801/2569 เป็นต้นไป (ช่วงนี้สงวนไว้ให้ผังเท่านั้น)
 * - รันซ้ำได้: เลขที่มีอยู่แล้วจะถูกเขียนทับกลับเป็นค่าตั้งต้น (= รีเซ็ตทั้งชุด)
 * - เขียน assets/flow-samples.json (snapshot ของ tbl_res_request) ให้หน้า overall-flow.html
 *   ใช้ตรวจสถานะปัจจุบันและรีเซ็ตทีละเคส
 *
 * Run:  node scripts/seed-flow-samples.mjs            (ตรวจอย่างเดียว — แสดงแผน ไม่เขียน DB)
 *       node scripts/seed-flow-samples.mjs --apply    (เขียน DB + assets/flow-samples.json)
 * ต้องการ: Node 18+ (fetch)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APPLY = process.argv.includes('--apply');
const YEAR = '2569';
const FIRST_NO = 9801;

const here = path.dirname(fileURLToPath(import.meta.url));
const appJs = fs.readFileSync(path.join(here, '../assets/ecmis-app.js'), 'utf8');
const SB_URL = (appJs.match(/DEFAULT_SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1];
const SB_KEY = (appJs.match(/DEFAULT_SUPABASE_KEY\s*=\s*'([^']+)'/) || [])[1];
if (!SB_URL || !SB_KEY) throw new Error('อ่านค่า Supabase จาก assets/ecmis-app.js ไม่ได้');
const OUT_JSON = path.join(here, '../assets/flow-samples.json');

async function sb(p, opt = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${p}`, {
    ...opt,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json',
      Prefer: 'return=representation', ...(opt.headers || {}) }
  });
  const t = await r.text();
  let data; try { data = JSON.parse(t); } catch { data = t; }
  return { ok: r.ok, data };
}

/* CHECK constraint ของ tbl_cmp_case ไม่รับ doc_type 'GENERAL' / legal_base 'ม.33' — ใช้ procType ใน
   trr_resolution_data แทน (supabaseRowToCase spread เข้า kase → isCase73() เป็นจริง) */
const GENERAL_73 = { rd: { procType: '7.3' } };

/* key = <ผัง>.<id กล่อง> ตรงกับ overall-flow.html
   [key, สถานะ (trr_status), เคสต้นแบบ, role ที่ใช้เปิด, หน้า, ค่าที่ปรับเพิ่ม] */
const SPEC = [
  ['f71.D0',  '000', '0807/2568', 'secgen',       'approval-review.html'],
  ['f71.D2',  '002', '0807/2568', 'secgen',       'approval-review.html'],
  ['f71.D3',  '003', '0807/2568', 'secgen',       'approval-review.html'],
  ['f71.DEP', '004', '0807/2568', 'deputy',       'approval-review.html'],
  ['f71.RET', '001', '1015/2568', 'secgen',       'approval-review.html'],
  ['f71.SG',  '005', '2010/2569', 'secgen',       'approval-review.html'],
  ['f71.SA',  '025', '2010/2569', 'dir_case',     'dir-case-support-assign.html', { cc: { tcc_complex: true } }],
  ['f71.SS',  '006', '2006/2569', 'support_sub',  'support-subcommittee.html'],
  ['f71.UR',  '007', '9303/2569', 'dir_case',     'approval-review.html', { req: { trr_urgent: true } }],
  ['f71.UC',  '022', '9303/2569', 'secgen',       'approval-review.html', { req: { trr_urgent: true }, rd: { urgentCertified: true } }],
  ['f71.CH',  '009', '2014/2569', 'chairman',     'chairman-agenda.html'],
  ['f71.SCR', '010', '2001/2569', 'subcommittee', 'subcommittee-screening.html'],
  ['f71.MI',  '021', '2001/2569', 'subcommittee', 'subcommittee-screening.html'],
  ['f71.SGA', '026', '2012/2569', 'chairman',     'chairman-agenda.html'],
  ['f71.AG',  '011', '1525/2558', 'board_sec',    'agenda-registry.html'],
  ['f71.MT',  '012', '1609/2568', 'board_sec',    'board-resolution.html'],
  ['f71.DF',  '013', '3008/2569', 'affairs',      'board-resolution.html'],
  ['f71.RS',  '015', '1189/2569', 'board_sec',    'board-resolution.html'],

  ['a71.OC',  '018', '3030/2569', 'secgen',       'order.html'],
  ['a71.OS',  '019', '3030/2569', 'secgen',       'order.html'],
  ['a71.UI',  '020', '3030/2569', 'secgen',       'order.html'],
  ['a71.DS',  '016', '1189/2569', 'affairs',      'order.html'],
  ['a71.CL',  '017', '1189/2569', 'affairs',      'board-resolution.html'],
  ['a71.RS3', '015', '1189/2569', 'board_sec',    'resolution.html', GENERAL_73],
  ['a71.LG',  '016', '1189/2569', 'affairs',      'resolution.html', GENERAL_73],

  ['f72.S0',  '100', '1210/2566', 'secgen',       'approval-review.html'],
  ['f72.S1',  '101', '1210/2566', 'secgen',       'approval-review.html'],
  ['f72.S2',  '102', '1210/2566', 'deputy',       'approval-review.html'],
  ['f72.RT',  '103', '1210/2566', 'secgen',       'approval-review.html'],
  ['f72.SG',  '104', '1151/2566', 'secgen',       'approval-review.html'],
  ['f72.SA',  '123', '1151/2566', 'dir_case',     'dir-case-support-assign.html', { cc: { tcc_complex: true }, rd: { complex72: true } }],
  ['f72.SS',  '105', '1088/2566', 'support_sub',  'support-subcommittee.html'],
  ['f72.UR',  '106', '1155/2566', 'dir_case',     'urgent-agenda.html', { req: { trr_urgent: true } }],
  ['f72.UC',  '120', '1155/2566', 'secgen',       'urgent-agenda.html', { req: { trr_urgent: true } }],
  ['f72.CU',  '107', '1155/2566', 'chairman',     'urgent-agenda.html', { req: { trr_urgent: true } }],
  ['f72.CS',  '121', '9220/2569', 'chairman',     'affairs-case-detail.html'],
  ['f72.AO',  '124', '9308/2569', 'affairs',      'affairs-opinion.html'],
  ['f72.CA',  '122', '9309/2569', 'chairman',     'chairman-agenda.html'],
  ['f72.C72', '118', '9101/2569', 'chairman',     'chairman-agenda.html'],
  ['f72.SCR', '108', '9101/2569', 'subcommittee', 'subcommittee-screening.html'],
  ['f72.MI',  '117', '9101/2569', 'subcommittee', 'subcommittee-screening.html'],
  ['f72.SGA', '119', '9101/2569', 'chairman',     'chairman-agenda.html'],
  ['f72.INV', '109', '1366/2566', 'board_sec',    'agenda-registry.html'],
  ['f72.MT',  '110', '1402/2565', 'board_sec',    'resolution-72.html'],
  ['f72.RP',  '111', '9203/2569', 'affairs',      'ruling-report.html'],
  ['f72.SR',  '112', '1402/2565', 'chairman',     'ruling-report.html'],
  ['f72.AN',  '113', '1322/2566', 'affairs',      'ruling-report.html'],
  ['f72.NC',  '114', '1344/2566', 'affairs',      'ruling-report.html'],
  ['f72.GU',  '115', '1355/2566', 'affairs',      'ruling-report.html'],
  ['f72.CL',  '116', '9701/2569', 'affairs',      'ruling-report.html']
];

const CC_SKIP = ['tcc_id', 'created_datetime', 'updated_datetime', 'updated_by', 'tbl_cmp_case_accused', 'tbl_res_request'];
const REQ_SKIP = ['trr_id', 'tcc_id', 'created_datetime', 'updated_datetime', 'updated_by'];
const ACC_SKIP = ['tcca_id', 'tcc_id', 'created_datetime'];
const omit = (obj, keys) => Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));
const enc = s => encodeURIComponent(s);

async function loadTemplate(caseNo, cache) {
  if (cache.has(caseNo)) return cache.get(caseNo);
  const { ok, data } = await sb(`tbl_cmp_case?tcc_no=eq.${enc(caseNo)}&is_deleted=eq.false&select=*,tbl_cmp_case_accused(*),tbl_res_request(*)`);
  if (!ok || !data.length) throw new Error(`ไม่พบเคสต้นแบบ ${caseNo}: ${JSON.stringify(data)}`);
  const cc = data[0];
  const req = (cc.tbl_res_request || []).find(r => !r.is_deleted);
  if (!req) throw new Error(`เคสต้นแบบ ${caseNo} ไม่มี tbl_res_request`);
  const tpl = { cc, req, accused: (cc.tbl_cmp_case_accused || []).filter(a => !a.is_deleted) };
  cache.set(caseNo, tpl);
  return tpl;
}

function buildRows(tpl, caseNo, status, extra = {}) {
  const cc = { ...omit(tpl.cc, CC_SKIP), tcc_no: caseNo, is_deleted: false, ...(extra.cc || {}) };
  const rd = { ...(tpl.req.trr_resolution_data || {}), ...(extra.rd || {}), flowSample: true };
  delete rd.status;
  const req = { ...omit(tpl.req, REQ_SKIP), trr_status: status, is_deleted: false, ...(extra.req || {}), trr_resolution_data: rd };
  const accused = tpl.accused.map(a => omit(a, ACC_SKIP));
  return { cc, req, accused };
}

async function upsertCase(rows) {
  const found = await sb(`tbl_cmp_case?tcc_no=eq.${enc(rows.cc.tcc_no)}&select=tcc_id`);
  if (!found.ok) throw new Error(JSON.stringify(found.data));
  let tccId;
  if (found.data.length) {
    tccId = found.data[0].tcc_id;
    const up = await sb(`tbl_cmp_case?tcc_id=eq.${tccId}`, { method: 'PATCH', body: JSON.stringify(rows.cc) });
    if (!up.ok) throw new Error(`แก้ tbl_cmp_case ไม่ได้: ${JSON.stringify(up.data)}`);
    await sb(`tbl_cmp_case_accused?tcc_id=eq.${tccId}`, { method: 'DELETE' });
  } else {
    const ins = await sb('tbl_cmp_case', { method: 'POST', body: JSON.stringify(rows.cc) });
    if (!ins.ok) throw new Error(`เพิ่ม tbl_cmp_case ไม่ได้: ${JSON.stringify(ins.data)}`);
    tccId = ins.data[0].tcc_id;
  }
  if (rows.accused.length) {
    const acc = await sb('tbl_cmp_case_accused', { method: 'POST', body: JSON.stringify(rows.accused.map(a => ({ ...a, tcc_id: tccId }))) });
    if (!acc.ok) throw new Error(`เพิ่มผู้ถูกกล่าวหาไม่ได้: ${JSON.stringify(acc.data)}`);
  }
  const reqRow = { ...rows.req, tcc_id: tccId };
  const oldReq = await sb(`tbl_res_request?tcc_id=eq.${tccId}&select=trr_id`);
  const res = oldReq.data.length
    ? await sb(`tbl_res_request?trr_id=eq.${oldReq.data[0].trr_id}`, { method: 'PATCH', body: JSON.stringify(reqRow) })
    : await sb('tbl_res_request', { method: 'POST', body: JSON.stringify(reqRow) });
  if (!res.ok) throw new Error(`เขียน tbl_res_request ไม่ได้: ${JSON.stringify(res.data)}`);
  return { tccId, trrId: res.data[0].trr_id, request: omit(res.data[0], ['trr_id', 'tcc_id', 'created_datetime', 'updated_datetime']) };
}

const cache = new Map();
const samples = {};
let failed = 0;
for (const [i, [key, status, tplNo, role, page, extra]] of SPEC.entries()) {
  const caseNo = `${FIRST_NO + i}/${YEAR}`;
  try {
    const tpl = await loadTemplate(tplNo, cache);
    const rows = buildRows(tpl, caseNo, status, extra);
    const sample = { caseNo, status, template: tplNo, role, page, subTeam: rows.req.trr_sub_committee || null };
    if (APPLY) Object.assign(sample, await upsertCase(rows));
    samples[key] = sample;
    console.log(`${APPLY ? 'OK ' : 'PLAN'} ${key.padEnd(8)} ${caseNo} ← ${tplNo} สถานะ ${status} · ${role} · ${page}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${key} ${caseNo}: ${e.message}`);
  }
}

if (APPLY) {
  fs.writeFileSync(OUT_JSON, JSON.stringify({ generatedAt: new Date().toISOString(), samples }, null, 1));
  console.log(`\nเขียน ${path.relative(process.cwd(), OUT_JSON)} (${Object.keys(samples).length} เคส)`);
} else {
  console.log('\n(ตรวจอย่างเดียว — เพิ่ม --apply เพื่อเขียน DB)');
}
if (failed) process.exitCode = 1;
