/**
 * เติม trr_resolution_data.staleAgendaLinks ให้เคสที่เคยรีเซ็ตด้วยปุ่มลัด R×3 ก่อน Task 196
 * (ตอนนั้นรีเซ็ตแล้วแถวผูกวาระเดิมใน tbl_res_calendar_item_case ค้าง เพราะ DB ไม่ให้ soft-delete
 *  ทำให้เล่นใหม่แล้วเคสไม่ขึ้นคิวรอบรรจุวาระ)
 *
 * กติกา (ตกลงกับผู้ใช้ 2026-10-04, Task 196)
 * - เคสที่มี event RESET และตอนนี้ยังไม่ถึงขั้นบรรจุวาระ → แถวผูกวาระทั้งหมดของเคสถือว่าค้าง
 * - เคสที่เล่นซ้ำจนบรรจุวาระใหม่แล้ว → ค้างเฉพาะแถวที่สร้างก่อนเวลารีเซ็ตล่าสุด
 *   (แถวที่ไม่มี created_datetime เทียบไม่ได้ → ข้ามและรายงาน ยกเว้นแถวทดสอบ "ทดสอบ Task 191" ที่รู้แน่ว่าค้าง)
 *
 * Run:  node board-resolution/scripts/backfill-stale-agenda-links.mjs            (ตรวจอย่างเดียว)
 *       node board-resolution/scripts/backfill-stale-agenda-links.mjs --apply    (เขียน DB)
 * ต้องการ: Node 18+ (fetch)
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const APPLY = process.argv.includes('--apply');
const here = path.dirname(fileURLToPath(import.meta.url));
const appJs = fs.readFileSync(path.join(here, '../assets/ecmis-app.js'), 'utf8');
const SB_URL = (appJs.match(/DEFAULT_SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1];
const SB_KEY = (appJs.match(/DEFAULT_SUPABASE_KEY\s*=\s*'([^']+)'/) || [])[1];
if (!SB_URL || !SB_KEY) throw new Error('อ่านค่า Supabase จาก assets/ecmis-app.js ไม่ได้');
const w = { addEventListener() {} };
vm.runInNewContext(appJs, { window: w });
const { STATUS_CODE } = w.ECMIS;

async function sb(p, opt = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${p}`, { ...opt,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(opt.headers || {}) } });
  const t = await r.text(); let data; try { data = JSON.parse(t); } catch { data = t; }
  return { ok: r.ok, data };
}

/* ขั้นก่อนบรรจุวาระ — แถวผูกวาระของเคสในสถานะเหล่านี้คือของรอบก่อนทั้งหมด */
const PRE_AGENDA = ['PENDING_DEPUTY', 'PENDING_SECGEN', 'PENDING_SUPPORT_ASSIGN', 'IN_SUPPORT_SUB', 'PENDING_URGENT',
  'PENDING_SECGEN_URGENT_CONFIRM', 'PENDING_CHAIRMAN', 'IN_SCREENING', 'SCREENING_MORE_INFO', 'PENDING_SIGN_AGENDA',
  'RETURNED', 'PENDING_DEPUTY_72', 'PENDING_SECGEN_72', 'PENDING_SUPPORT_ASSIGN_72', 'IN_SUPPORT_SUB_72', 'PENDING_URGENT_72',
  'PENDING_SECGEN_URGENT_CONFIRM_72', 'PENDING_CHAIRMAN_URGENT_72', 'PENDING_CHAIRMAN_72', 'PENDING_CASE_ADMIN_SCREEN_72',
  'PENDING_CHAIRMAN_ASSIGN_72', 'PENDING_AFFAIRS_OPINION_72', 'IN_SCREENING_72', 'SCREENING_MORE_INFO_72', 'PENDING_SIGN_AGENDA_72', 'RETURNED_72']
  .map(k => STATUS_CODE[k]).filter(Boolean);

const events = (await sb('tbl_res_request_event?select=trr_id,created_datetime&trre_type=eq.RESET&order=created_datetime.desc')).data || [];
const lastReset = {};
events.forEach(e => { if (!lastReset[e.trr_id]) lastReset[e.trr_id] = e.created_datetime; });
const trrIds = Object.keys(lastReset);
console.log(`เคสที่เคยรีเซ็ต: ${trrIds.length}`);

let changed = 0;
for (const trrId of trrIds) {
  const req = ((await sb(`tbl_res_request?select=trr_id,trr_status,trr_resolution_data,tbl_cmp_case!inner(tcc_no)&trr_id=eq.${trrId}`)).data || [])[0];
  if (!req) continue;
  const links = (await sb(`tbl_res_calendar_item_case?select=trcic_id,created_datetime,trcic_remark&trr_id=eq.${trrId}&is_deleted=eq.false`)).data || [];
  const rd = req.trr_resolution_data || {};
  const already = new Set(rd.staleAgendaLinks || []);
  const preAgenda = PRE_AGENDA.includes(req.trr_status);
  const resetAt = lastReset[trrId] ? new Date(lastReset[trrId]) : null;
  const add = [], skipped = [];
  for (const l of links) {
    if (already.has(l.trcic_id)) continue;
    /* แถวทดสอบของ Task 191 (trcic 82–84 ผูก 9501) — รู้แน่ว่าค้าง แม้ไม่มีเวลาสร้างให้เทียบ */
    if (preAgenda || /ทดสอบ Task 191/.test(l.trcic_remark || '')) add.push(l.trcic_id);
    else if (l.created_datetime && resetAt && new Date(l.created_datetime) < resetAt) add.push(l.trcic_id);
    else if (!l.created_datetime) skipped.push(l.trcic_id);
  }
  const no = req.tbl_cmp_case.tcc_no;
  console.log(`\n=== ${no} (trr ${trrId}) สถานะ ${req.trr_status}${preAgenda ? ' — ก่อนบรรจุวาระ' : ' — บรรจุวาระแล้ว'} · ลิงก์เปิดอยู่ ${links.length} · ค้างเดิม ${already.size}`);
  if (add.length) console.log(`  + ค้างเพิ่ม: ${add.join(', ')}`);
  if (skipped.length) console.log(`  ? ข้าม (ไม่มีเวลาสร้างให้เทียบกับเวลารีเซ็ต): ${skipped.join(', ')}`);
  if (!add.length) { console.log('  — ไม่มีอะไรต้องเติม'); continue; }
  changed++;
  if (!APPLY) continue;
  const next = { ...rd, staleAgendaLinks: [...already, ...add] };
  const r = await sb(`tbl_res_request?trr_id=eq.${trrId}`, { method: 'PATCH', body: JSON.stringify({ trr_resolution_data: next }) });
  console.log(r.ok && Array.isArray(r.data) && r.data.length ? '  ✓ เขียนแล้ว' : `  ✗ เขียนไม่สำเร็จ: ${JSON.stringify(r.data)}`);
}
console.log(`\n${APPLY ? 'เขียน DB แล้ว' : 'โหมดตรวจ (ยังไม่เขียน DB) — ใช้ --apply เพื่อเขียน'} | เคสที่ต้องเติม: ${changed}`);
