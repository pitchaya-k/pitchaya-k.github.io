#!/usr/bin/env node
/* Export every Supabase table the prototype uses into assets/localdb-seed.json,
   the starting data for the localStorage DB (assets/ecmis-localdb.js).
   Run once (or again whenever you want fresh data from Supabase):
     node scripts/export-localdb-seed.mjs
   URL/key are read from assets/ecmis-app.js (the same publishable key the pages use). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'localdb-seed.json');
const PAGE_SIZE = 1000;

const TABLES = [
  'tbl_cmp_case', 'tbl_cmp_case_accused',
  'tbl_res_request', 'tbl_res_request_event', 'tbl_res_attachment',
  'tbl_res_calendar', 'tbl_res_calendar_item', 'tbl_res_calendar_item_case',
  'tbl_res_calendar_item_history', 'tbl_res_calendar_item_qualifier', 'tbl_res_agenda_qualifier',
  'tbl_res_offense_basis', 'tbl_res_accused_offense',
  'ecmis_notification_read_receipt', 'public_case_status_view'
];

function readConf() {
  const js = fs.readFileSync(path.join(ROOT, 'assets', 'ecmis-app.js'), 'utf8');
  const url = (js.match(/DEFAULT_SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1];
  const key = (js.match(/DEFAULT_SUPABASE_KEY\s*=\s*'([^']+)'/) || [])[1];
  if (!url || !key) throw new Error('Supabase URL/key not found in assets/ecmis-app.js');
  return { url, key };
}

async function fetchAll({ url, key }, table) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + PAGE_SIZE - 1}`, 'Range-Unit': 'items' }
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

/* Most rows in Supabase are soft-deleted (is_deleted = true) leftovers from test runs; together they
   are ~5MB, past the localStorage quota. The pages filter is_deleted = false almost everywhere, so drop
   them — but keep any request/case still referenced from a live agenda link, so joins don't break. */
function prune(tables) {
  const live = r => !r.is_deleted;
  const linkedTrr = new Set((tables.tbl_res_calendar_item_case || []).filter(live).map(r => r.trr_id));
  const req = tables.tbl_res_request.filter(r => live(r) || linkedTrr.has(r.trr_id));
  const trr = new Set(req.map(r => r.trr_id));
  const tcc = new Set(req.map(r => r.tcc_id));
  const out = {};
  for (const [t, rows] of Object.entries(tables)) {
    if (t === 'tbl_res_request') out[t] = req;
    else if (t === 'tbl_cmp_case') out[t] = rows.filter(r => live(r) || tcc.has(r.tcc_id));
    else if (t === 'tbl_res_request_event') out[t] = rows.filter(r => trr.has(r.trr_id));
    else if (t === 'tbl_cmp_case_accused' || t === 'tbl_res_attachment') out[t] = rows.filter(r => live(r) && tcc.has(r.tcc_id));
    else out[t] = rows.filter(live);
    if (out[t].length !== rows.length) console.log(`  pruned ${t}: ${rows.length} → ${out[t].length}`);
  }
  return out;
}

async function main() {
  const conf = readConf();
  const tables = {};
  for (const t of TABLES) {
    try {
      tables[t] = await fetchAll(conf, t);
      console.log(`${t.padEnd(34)} ${tables[t].length} rows`);
    } catch (e) {
      console.error(`skip ${t}: ${e.message}`);
      tables[t] = [];
    }
  }
  const seed = { version: new Date().toISOString(), tables: prune(tables) };
  fs.writeFileSync(OUT, JSON.stringify(seed));
  console.log(`wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
