/* Local DB (assets/ecmis-localdb.js) — Unit Tests
   Runs the fake Supabase client against a small synthetic seed, using query shapes copied
   from the pages (embed !inner, dotted embed filters, ->> JSON path, maybeSingle, upsert conflict).
   รันด้วย: node tests/localdb.test.mjs */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(here, '../assets/ecmis-localdb.js'), 'utf8');

function memoryStorage() {
  const m = new Map();
  return new Proxy({
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    key: i => [...m.keys()][i] ?? null
  }, { ownKeys: () => [...m.keys()], getOwnPropertyDescriptor: (t, k) => (m.has(k) ? { value: m.get(k), enumerable: true, configurable: true } : undefined) });
}

const SEED = {
  version: 'test-seed',
  tables: {
    tbl_cmp_case: [
      { tcc_id: 1, tcc_no: '0001/2569', tcc_subject: 'เรื่อง ก', is_deleted: false },
      { tcc_id: 2, tcc_no: '0002/2569', tcc_subject: 'เรื่อง ข', is_deleted: false }
    ],
    tbl_cmp_case_accused: [
      { tcca_id: 10, tcc_id: 1, tcca_no: 2, tcca_name: 'B', is_deleted: false },
      { tcca_id: 11, tcc_id: 1, tcca_no: 1, tcca_name: 'A', is_deleted: false }
    ],
    tbl_res_request: [
      { trr_id: 6, tcc_id: 1, trr_status: 'A01', is_deleted: false, trr_resolution_data: { supportControlYear: 2569, code: 'ACCEPT_S24P1' } },
      { trr_id: 7, tcc_id: 2, trr_status: 'A02', is_deleted: false, trr_resolution_data: null },
      { trr_id: 8, tcc_id: 99, trr_status: 'A03', is_deleted: false, trr_resolution_data: null }
    ],
    tbl_res_calendar: [{ trc_id: 1, trc_name: 'ครั้งที่ 1', trc_date: '2026-11-01', is_deleted: false }],
    tbl_res_calendar_item: [{ trci_id: 1, trc_id: 1, trci_number: 1, is_deleted: false }],
    tbl_res_calendar_item_case: [{ trcic_id: 1, trci_id: 1, trr_id: 6, is_deleted: false }],
    tbl_res_accused_offense: [],
    ecmis_notification_read_receipt: []
  }
};

function freshClient(search = '') {
  const window = {
    localStorage: memoryStorage(),
    location: { search },
    supabase: { createClient: () => 'REAL' },
    __ECMIS_LOCALDB_SEED: JSON.parse(JSON.stringify(SEED)),
    addEventListener() {}, dispatchEvent() {}
  };
  vm.runInNewContext(SRC, { window, localStorage: window.localStorage, URLSearchParams, CustomEvent: class {}, console });
  return window;
}

let count = 0;
const T = async (name, fn) => {
  count++;
  try { await fn(); console.log('  ✓', name); } catch (e) { console.error('  ✗', name); throw e; }
};

const w = freshClient();
const sb = w.supabase.createClient('url', 'key');

await T('createClient returns the local client', () => {
  assert.equal(sb.__local, true);
  assert.equal(w.ECMISLocalDB.enabled, true);
});

await T('?db=supabase keeps the real client', () => {
  const w2 = freshClient('?db=supabase');
  assert.equal(w2.supabase.createClient(), 'REAL');
});

await T('select * with !inner embed + nested to-many embed', async () => {
  const { data, error } = await sb.from('tbl_res_request').select('*, tbl_cmp_case!inner(*, tbl_cmp_case_accused(*))').eq('is_deleted', false);
  assert.equal(error, null);
  assert.equal(data.length, 2, 'row 8 has no case → dropped by !inner');
  assert.equal(data[0].tbl_cmp_case.tcc_no, '0001/2569');
  assert.equal(data[0].tbl_cmp_case.tbl_cmp_case_accused.length, 2);
});

await T('dotted embed filter + maybeSingle (getCase shape)', async () => {
  const { data } = await sb.from('tbl_res_request').select('*, tbl_cmp_case!inner(*)').eq('tbl_cmp_case.tcc_no', '0002/2569').maybeSingle();
  assert.equal(data.trr_id, 7);
});

await T('embed without !inner keeps parent with null embed', async () => {
  const { data } = await sb.from('tbl_res_request').select('trr_id, tbl_cmp_case(tcc_no)').eq('tbl_cmp_case.tcc_no', '0002/2569');
  assert.equal(data.length, 3);
  assert.equal(data.find(r => r.trr_id === 6).tbl_cmp_case, null);
});

await T('column list projection', async () => {
  const { data } = await sb.from('tbl_res_request').select('trr_id,trr_status').eq('trr_id', '6').single();
  assert.equal(JSON.stringify(data), JSON.stringify({ trr_id: 6, trr_status: 'A01' }));
});

await T('->> JSON path filter compares as text', async () => {
  const { data } = await sb.from('tbl_res_request').select('trr_id').eq('trr_resolution_data->>supportControlYear', '2569');
  assert.equal(JSON.stringify(data.map(r => r.trr_id)), JSON.stringify([6]));
});

await T('three-level embed (agenda link shape)', async () => {
  const { data } = await sb.from('tbl_res_calendar_item_case')
    .select('trcic_id, trr_id, tbl_res_request(trr_resolution_data), tbl_res_calendar_item!inner(trci_number, is_deleted, tbl_res_calendar!inner(trc_name, trc_date, is_deleted))')
    .eq('tbl_res_calendar_item.is_deleted', false);
  assert.equal(data.length, 1);
  assert.equal(data[0].tbl_res_calendar_item.tbl_res_calendar.trc_name, 'ครั้งที่ 1');
  assert.equal(data[0].tbl_res_request.trr_resolution_data.code, 'ACCEPT_S24P1');
});

await T('update persists and .select() returns changed rows', async () => {
  const { data, error } = await sb.from('tbl_res_request').update({ trr_status: 'B01' }).eq('trr_id', 7).select();
  assert.equal(error, null);
  assert.equal(data[0].trr_status, 'B01');
  const saved = JSON.parse(w.localStorage.getItem('ecmis.db.v1.tbl_res_request'));
  assert.equal(saved.find(r => r.trr_id === 7).trr_status, 'B01');
});

await T('insert assigns next id + defaults, .select().single()', async () => {
  const { data } = await sb.from('tbl_res_calendar').insert({ trc_name: 'ครั้งที่ 2', trc_date: '2026-12-01' }).select().single();
  assert.equal(data.trc_id, 2);
  assert.equal(data.is_deleted, false);
  assert.ok(data.created_datetime);
});

await T('upsert with onConflict + ignoreDuplicates, then delete', async () => {
  await sb.from('tbl_res_accused_offense').upsert({ tcca_id: 10, trob_id: 3 }, { onConflict: 'tcca_id,trob_id', ignoreDuplicates: true });
  await sb.from('tbl_res_accused_offense').upsert({ tcca_id: 10, trob_id: 3 }, { onConflict: 'tcca_id,trob_id', ignoreDuplicates: true });
  let { data } = await sb.from('tbl_res_accused_offense').select('tcca_id, trob_id');
  assert.equal(data.length, 1);
  await sb.from('tbl_res_accused_offense').delete().eq('tcca_id', 10).eq('trob_id', 3);
  ({ data } = await sb.from('tbl_res_accused_offense').select('*'));
  assert.equal(data.length, 0);
});

await T('order desc + limit + in()', async () => {
  const { data } = await sb.from('tbl_res_request').select('trr_id').in('trr_id', [6, 7, 8]).order('trr_id', { ascending: false }).limit(2);
  assert.equal(JSON.stringify(data.map(r => r.trr_id)), JSON.stringify([8, 7]));
});

await T('single() with no rows returns PGRST116 error', async () => {
  const { data, error } = await sb.from('tbl_res_request').select('*').eq('trr_id', 999).single();
  assert.equal(data, null);
  assert.equal(error.code, 'PGRST116');
});

await T('rpc ecmis_record_notification_read is idempotent', async () => {
  const a = await sb.rpc('ecmis_record_notification_read', { p_notification_id: 'n1', p_user_id: 'owner' });
  const b = await sb.rpc('ecmis_record_notification_read', { p_notification_id: 'n1', p_user_id: 'owner' });
  assert.ok(a.data);
  assert.equal(a.data, b.data);
  const { data } = await sb.from('ecmis_notification_read_receipt').select('notification_id,read_at').eq('user_id', 'owner');
  assert.equal(data.length, 1);
});

await T('demo guide read-only blocks writes', async () => {
  w.demoReadOnly = () => true;
  await sb.from('tbl_res_request').update({ trr_status: 'ZZZ' }).eq('trr_id', 6);
  delete w.demoReadOnly;
  const { data } = await sb.from('tbl_res_request').select('trr_status').eq('trr_id', 6).single();
  assert.equal(data.trr_status, 'A01');
});

await T('reset() restores the seed', async () => {
  w.ECMISLocalDB.reset();
  const { data } = await sb.from('tbl_res_request').select('trr_status').eq('trr_id', 7).single();
  assert.equal(data.trr_status, 'A02');
});

console.log(`\n${count} tests passed`);
