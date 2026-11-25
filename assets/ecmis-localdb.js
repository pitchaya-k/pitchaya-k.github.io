/* ECMIS local DB — a stand-in for the Supabase client that keeps every table in localStorage.
   ---------------------------------------------------------------------------------------------
   Load it right after assets/vendor/supabase/supabase.js (or before ecmis-app.js on pages that
   don't load the vendor file). It swaps window.supabase.createClient so every existing caller
   (ECMIS.getSupabaseClient, pages that create their own client) gets this local client instead.

   Covers only the supabase-js surface the prototype uses:
     from(t).select('*, tbl_x!inner(cols, tbl_y(*))') · insert · update · upsert(onConflict) · delete
     eq · neq · in · is · gt/gte/lt/lte · match · filter(col, op, val) · contains · 'col->>key' paths
     order · limit · range · single · maybeSingle · .select() after a write
     rpc('ecmis_record_notification_read') · storage.from(bucket).upload/download (IndexedDB)

   Storage:  localStorage['ecmis.db.v1.<table>'] = JSON rows, seeded once from assets/localdb-seed.json
   Switches: ?db=supabase  use the real Supabase again (remembered)   ?db=local  back to local (default)
             ?db=reset     wipe local data and re-seed                 ECMISLocalDB.reset() does the same */
(function (global) {
  'use strict';

  const NS = 'ecmis.db.v1.';
  const MODE_KEY = 'ecmis.db.mode';
  const VERSION_KEY = NS + '__version';
  const SEED_FILE = 'localdb-seed.json';
  const FILE_DB = 'ecmis-localdb-files';

  /* Primary key per table (single column → auto-increment on insert). Composite keys are only
     used for upsert conflict matching. */
  const PK = {
    tbl_cmp_case: 'tcc_id', tbl_cmp_case_accused: 'tcca_id',
    tbl_res_request: 'trr_id', tbl_res_request_event: 'trre_id', tbl_res_attachment: 'trat_id',
    tbl_res_calendar: 'trc_id', tbl_res_calendar_item: 'trci_id', tbl_res_calendar_item_case: 'trcic_id',
    tbl_res_calendar_item_history: 'trcih_id', tbl_res_calendar_item_qualifier: 'trciq_id',
    tbl_res_agenda_qualifier: 'trqf_id', tbl_res_offense_basis: 'trob_id', tbl_res_accused_offense: 'trao_id',
    ecmis_notification_read_receipt: ['notification_id', 'user_id'], public_case_status_view: 'tracking_no',
    ecmis_app_state: 'state_key'
  };
  /* Tables without is_deleted / created_datetime columns (everything else gets the DB defaults on insert). */
  const NO_SOFT_DELETE = new Set(['tbl_res_calendar_item_history', 'ecmis_notification_read_receipt', 'public_case_status_view', 'ecmis_app_state']);
  const NO_CREATED_AT = new Set(['ecmis_notification_read_receipt', 'public_case_status_view']);

  /* ---------- mode ---------- */
  function readMode() {
    try {
      const q = new URLSearchParams(global.location ? global.location.search : '').get('db');
      if (q === 'supabase' || q === 'local') localStorage.setItem(MODE_KEY, q);
      if (q === 'reset') { wipe(); localStorage.setItem(MODE_KEY, 'local'); }
      return localStorage.getItem(MODE_KEY) || 'local';
    } catch (e) { return 'local'; }
  }

  /* ---------- table storage ---------- */
  const cache = Object.create(null);
  const scriptSrc = (global.document && document.currentScript && document.currentScript.src) || '';

  function seedUrls() {
    const dir = scriptSrc ? scriptSrc.replace(/[^/]*$/, '') : 'assets/';
    return [dir + SEED_FILE];
  }

  function loadSeedSync() {
    for (const url of seedUrls()) {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.send();
        if (xhr.status >= 200 && xhr.status < 300) return JSON.parse(xhr.responseText);
      } catch (e) { /* try the next location */ }
    }
    throw new Error('โหลดข้อมูลตั้งต้น (' + SEED_FILE + ') ไม่สำเร็จ');
  }

  function ensureSeeded() {
    if (localStorage.getItem(VERSION_KEY)) return;
    const seed = global.__ECMIS_LOCALDB_SEED || loadSeedSync();
    Object.entries(seed.tables || {}).forEach(([t, rows]) => {
      cache[t] = rows;
      localStorage.setItem(NS + t, JSON.stringify(rows));
    });
    localStorage.setItem(VERSION_KEY, seed.version || 'seed');
  }

  function rowsOf(table) {
    if (cache[table]) return cache[table];
    ensureSeeded();
    let rows = [];
    try { rows = JSON.parse(localStorage.getItem(NS + table) || '[]'); } catch (e) { rows = []; }
    cache[table] = Array.isArray(rows) ? rows : [];
    return cache[table];
  }

  function saveTable(table, rows) {
    try {
      localStorage.setItem(NS + table, JSON.stringify(rows));
    } catch (e) {
      throw new Error('บันทึกลง localStorage ไม่สำเร็จ (พื้นที่อาจเต็ม): ' + e.message);
    }
    cache[table] = rows;
    notifyChange(table);
  }

  function wipe() {
    Object.keys(localStorage).filter(k => k.startsWith(NS)).forEach(k => localStorage.removeItem(k));
    Object.keys(cache).forEach(k => delete cache[k]);
  }

  function notifyChange(table) {
    try { global.dispatchEvent(new CustomEvent('ecmis-localdb-change', { detail: { table } })); } catch (e) { /* no DOM events (node tests) */ }
  }

  /* Another tab wrote a table → drop our cached copy so the next query reads the new rows. */
  if (global.addEventListener) {
    global.addEventListener('storage', e => {
      if (!e.key || !e.key.startsWith(NS)) return;
      const t = e.key.slice(NS.length);
      delete cache[t];
      if (!t.startsWith('__')) notifyChange(t);
    });
  }

  /* ---------- value helpers ---------- */
  const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

  /* 'col' | 'col->key' | 'col->>key' (JSON path; ->> returns text like Postgres) */
  function getPath(row, col) {
    const m = String(col).split(/(->>?)/);
    let v = row ? row[m[0]] : undefined;
    for (let i = 1; i < m.length; i += 2) {
      if (v == null || typeof v !== 'object') return undefined;
      v = v[m[i + 1]];
      if (m[i] === '->>' && v != null) v = typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
    return v;
  }

  /* PostgREST sends every filter value as text, so '6' must match 6 and 'true' must match true. */
  const same = (a, b) => a != null && b != null && String(a) === String(b);
  function compare(a, b) {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    const na = Number(a), nb = Number(b);
    if (a !== '' && b !== '' && !isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
  }
  function containsJson(hay, needle) {
    if (needle == null || typeof needle !== 'object') return same(hay, needle);
    if (hay == null || typeof hay !== 'object') return false;
    if (Array.isArray(needle)) return Array.isArray(hay) && needle.every(n => hay.some(h => containsJson(h, n)));
    return Object.keys(needle).every(k => containsJson(hay[k], needle[k]));
  }
  function likeToRegex(p, flags) {
    return new RegExp('^' + String(p).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', flags);
  }
  const parseInList = v => (Array.isArray(v) ? v : String(v).replace(/^\(|\)$/g, '').split(',').map(s => s.trim().replace(/^"|"$/g, '')));

  function predicate(op, col, val) {
    switch (op) {
      case 'eq': return r => same(getPath(r, col), val);
      case 'neq': return r => !same(getPath(r, col), val);
      case 'in': { const list = parseInList(val); return r => list.some(x => same(getPath(r, col), x)); }
      case 'is': return r => { const v = getPath(r, col); return val === null || val === 'null' ? v == null : String(!!v) === String(val); };
      case 'gt': return r => getPath(r, col) != null && compare(getPath(r, col), val) > 0;
      case 'gte': return r => getPath(r, col) != null && compare(getPath(r, col), val) >= 0;
      case 'lt': return r => getPath(r, col) != null && compare(getPath(r, col), val) < 0;
      case 'lte': return r => getPath(r, col) != null && compare(getPath(r, col), val) <= 0;
      case 'like': { const re = likeToRegex(val, ''); return r => re.test(String(getPath(r, col) ?? '')); }
      case 'ilike': { const re = likeToRegex(val, 'i'); return r => re.test(String(getPath(r, col) ?? '')); }
      case 'cs': { const needle = typeof val === 'string' ? JSON.parse(val) : val; return r => containsJson(getPath(r, col), needle); }
      default: throw new Error('localdb: ไม่รองรับตัวกรอง ' + op);
    }
  }

  /* ---------- select parsing: "*, tbl_x!inner(a, b, tbl_y(*))" ---------- */
  function parseSelect(str) {
    const items = [];
    let depth = 0, buf = '';
    const push = () => {
      const s = buf.trim(); buf = '';
      if (!s) return;
      const m = s.match(/^(?:(\w+):)?(\w+)(!inner|!left)?\s*\(([\s\S]*)\)$/);
      if (m) items.push({ embed: m[2], alias: m[1] || m[2], inner: m[3] === '!inner', children: parseSelect(m[4]) });
      else items.push({ col: s });
    };
    for (const ch of String(str || '*')) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) push(); else buf += ch;
    }
    push();
    return items;
  }

  function pkCol(table) { const k = PK[table]; return typeof k === 'string' ? k : null; }

  /* Rows of `child` linked to `row` of `parent`: to-one when the parent row holds the child's PK
     (request.tcc_id → case), to-many when the child rows hold the parent's PK (case → accused). */
  function related(parent, row, child) {
    const cpk = pkCol(child), ppk = pkCol(parent);
    const rows = rowsOf(child);
    if (cpk && row[cpk] !== undefined) return { one: true, rows: row[cpk] == null ? [] : rows.filter(r => same(r[cpk], row[cpk])) };
    if (ppk && row[ppk] != null) return { one: false, rows: rows.filter(r => same(r[ppk], row[ppk])) };
    return { one: false, rows: [] };
  }

  /* Build one output row; returns null when an !inner embed is empty (the parent is then dropped). */
  function project(table, row, items, embedFilters, path) {
    const out = {};
    if (items.some(i => i.col === '*')) Object.assign(out, clone(row));
    for (const it of items) {
      if (it.col) {
        if (it.col !== '*') out[it.col.split(/->>?/).pop()] = clone(getPath(row, it.col));
        continue;
      }
      const subPath = path ? path + '.' + it.alias : it.alias;
      const preds = embedFilters.filter(f => f.path === subPath).map(f => f.pred);
      const rel = related(table, row, it.embed);
      const kids = rel.rows
        .filter(r => preds.every(p => p(r)))
        .map(r => project(it.embed, r, it.children, embedFilters, subPath))
        .filter(Boolean);
      if (rel.one) {
        out[it.alias] = kids[0] || null;
        if (it.inner && !kids[0]) return null;
      } else {
        out[it.alias] = kids;
        if (it.inner && !kids.length) return null;
      }
    }
    return out;
  }

  /* ---------- demo guide read-only guard (same rule as demoGuardFetch in ecmis-app.js) ---------- */
  function demoWriteBlocked(table, method) {
    const inFrame = typeof global.inGuideFrame === 'function' && global.inGuideFrame();
    const blocked = typeof global.demoReadOnly === 'function' && global.demoReadOnly();
    if (inFrame) {
      try { global.parent.postMessage({ type: 'a7-supabase-write', method, url: table, blocked }, '*'); } catch (e) { /* cross-origin parent */ }
    }
    return blocked;
  }

  /* ---------- query builder ---------- */
  class Query {
    constructor(table) {
      this.table = table;
      this.op = 'select';
      this.sel = '*';
      this.returnRows = false;
      this.filters = [];       // top-level predicates
      this.embedFilters = [];  // { path, pred } for filters like 'tbl_cmp_case.tcc_no'
      this.orders = [];
      this.limitN = null;
      this.rangeAB = null;
      this.singleMode = null;  // 'single' | 'maybe'
      this.payload = null;
      this.opts = {};
    }
    select(s) {
      if (this.op !== 'select') this.returnRows = true;
      this.sel = s || '*';
      return this;
    }
    insert(v, o) { this.op = 'insert'; this.payload = v; this.opts = o || {}; return this; }
    update(v, o) { this.op = 'update'; this.payload = v; this.opts = o || {}; return this; }
    upsert(v, o) { this.op = 'upsert'; this.payload = v; this.opts = o || {}; return this; }
    delete(o) { this.op = 'delete'; this.opts = o || {}; return this; }

    addFilter(op, col, val) {
      const s = String(col);
      const last = s.lastIndexOf('.');
      if (last > 0 && !s.includes('->') && PK[s.slice(0, s.indexOf('.'))] !== undefined) {
        this.embedFilters.push({ path: s.slice(0, last), pred: predicate(op, s.slice(last + 1), val) });
      } else {
        this.filters.push(predicate(op, s, val));
      }
      return this;
    }
    eq(c, v) { return this.addFilter('eq', c, v); }
    neq(c, v) { return this.addFilter('neq', c, v); }
    in(c, v) { return this.addFilter('in', c, v); }
    is(c, v) { return this.addFilter('is', c, v); }
    gt(c, v) { return this.addFilter('gt', c, v); }
    gte(c, v) { return this.addFilter('gte', c, v); }
    lt(c, v) { return this.addFilter('lt', c, v); }
    lte(c, v) { return this.addFilter('lte', c, v); }
    like(c, v) { return this.addFilter('like', c, v); }
    ilike(c, v) { return this.addFilter('ilike', c, v); }
    contains(c, v) { return this.addFilter('cs', c, v); }
    filter(c, op, v) { return this.addFilter(op, c, v); }
    match(obj) { Object.entries(obj || {}).forEach(([c, v]) => this.addFilter('eq', c, v)); return this; }
    order(col, o) { this.orders.push({ col, asc: !o || o.ascending !== false, nullsFirst: !!(o && o.nullsFirst) }); return this; }
    limit(n) { this.limitN = n; return this; }
    range(a, b) { this.rangeAB = [a, b]; return this; }
    single() { this.singleMode = 'single'; return this; }
    maybeSingle() { this.singleMode = 'maybe'; return this; }

    matches(row) { return this.filters.every(p => p(row)); }

    sorted(rows) {
      if (!this.orders.length) return rows;
      return rows.slice().sort((a, b) => {
        for (const o of this.orders) {
          const va = getPath(a, o.col), vb = getPath(b, o.col);
          if (va == null && vb != null) return o.nullsFirst ? -1 : 1;
          if (vb == null && va != null) return o.nullsFirst ? 1 : -1;
          const c = compare(va, vb);
          if (c) return o.asc ? c : -c;
        }
        return 0;
      });
    }

    runSelect() {
      const items = parseSelect(this.sel);
      let rows = this.sorted(rowsOf(this.table).filter(r => this.matches(r)))
        .map(r => project(this.table, r, items, this.embedFilters, ''))
        .filter(Boolean);
      if (this.rangeAB) rows = rows.slice(this.rangeAB[0], this.rangeAB[1] + 1);
      if (this.limitN != null) rows = rows.slice(0, this.limitN);
      return rows;
    }

    withDefaults(row, all) {
      const r = Object.assign({}, clone(row));
      const pk = pkCol(this.table);
      if (pk && r[pk] == null) r[pk] = all.reduce((m, x) => Math.max(m, Number(x[pk]) || 0), 0) + 1;
      if (!NO_SOFT_DELETE.has(this.table) && r.is_deleted == null) r.is_deleted = false;
      if (!NO_CREATED_AT.has(this.table) && r.created_datetime == null) r.created_datetime = new Date().toISOString();
      return r;
    }

    runWrite() {
      const all = rowsOf(this.table).slice();
      const changed = [];
      const list = Array.isArray(this.payload) ? this.payload : [this.payload];
      if (this.op === 'insert') {
        list.forEach(p => { const r = this.withDefaults(p, all); all.push(r); changed.push(r); });
      } else if (this.op === 'update') {
        for (let i = 0; i < all.length; i++) {
          if (!this.matches(all[i])) continue;
          all[i] = Object.assign({}, all[i], clone(this.payload));
          changed.push(all[i]);
        }
      } else if (this.op === 'upsert') {
        const pk = PK[this.table];
        const keys = this.opts.onConflict ? this.opts.onConflict.split(',').map(s => s.trim()) : [].concat(pk);
        list.forEach(p => {
          const i = all.findIndex(r => keys.every(k => same(r[k], p[k])));
          if (i === -1) { const r = this.withDefaults(p, all); all.push(r); changed.push(r); }
          else if (!this.opts.ignoreDuplicates) { all[i] = Object.assign({}, all[i], clone(p)); changed.push(all[i]); }
        });
      } else if (this.op === 'delete') {
        for (let i = all.length - 1; i >= 0; i--) if (this.matches(all[i])) changed.push(all.splice(i, 1)[0]);
      }
      if (changed.length) saveTable(this.table, all);
      if (!this.returnRows) return null;
      const items = parseSelect(this.sel);
      return changed.map(r => project(this.table, r, items, this.embedFilters, '')).filter(Boolean);
    }

    /* Synchronous run — used by the thenable below and by ecmis-app.js's sync case lookup. */
    execSync() {
      try {
        let data;
        if (this.op === 'select') data = this.runSelect();
        else if (demoWriteBlocked(this.table, this.op.toUpperCase())) data = this.returnRows ? [] : null;
        else data = this.runWrite();
        if (this.singleMode) {
          const n = Array.isArray(data) ? data.length : 0;
          if (n > 1 || (n === 0 && this.singleMode === 'single')) {
            return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }, status: 406 };
          }
          data = n ? data[0] : null;
        }
        return { data, error: null, status: 200, count: Array.isArray(data) ? data.length : null };
      } catch (e) {
        return { data: null, error: { message: e.message || String(e) }, status: 500 };
      }
    }
    then(ok, fail) { return Promise.resolve().then(() => this.execSync()).then(ok, fail); }
    catch(fail) { return this.then(undefined, fail); }
  }

  /* ---------- rpc ---------- */
  function rpc(name, args) {
    const a = args || {};
    if (name === 'ecmis_record_notification_read') {
      try {
        const rows = rowsOf('ecmis_notification_read_receipt').slice();
        let r = rows.find(x => same(x.notification_id, a.p_notification_id) && same(x.user_id, a.p_user_id));
        if (!r) {
          r = { notification_id: a.p_notification_id, user_id: a.p_user_id, read_at: new Date().toISOString() };
          rows.push(r);
          saveTable('ecmis_notification_read_receipt', rows);
        }
        return Promise.resolve({ data: r.read_at, error: null });
      } catch (e) {
        return Promise.resolve({ data: null, error: { message: e.message } });
      }
    }
    return Promise.resolve({ data: null, error: { message: 'localdb: ไม่รองรับ rpc ' + name } });
  }

  /* ---------- storage: files go to IndexedDB (too big for localStorage) ---------- */
  function idbDo(mode, fn) {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open(FILE_DB, 1);
      open.onupgradeneeded = () => open.result.createObjectStore('files');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction('files', mode);
        const req = fn(tx.objectStore('files'));
        tx.oncomplete = () => resolve(req && req.result);
        tx.onerror = () => reject(tx.error);
      };
    });
  }
  const storage = {
    from(bucket) {
      const key = p => bucket + '/' + p;
      return {
        upload(path, file) {
          if (demoWriteBlocked('storage/' + bucket, 'POST')) return Promise.resolve({ data: { path }, error: null });
          return idbDo('readwrite', s => s.put(file, key(path)))
            .then(() => ({ data: { path }, error: null }))
            .catch(e => ({ data: null, error: { message: 'เก็บไฟล์ไม่สำเร็จ: ' + (e && e.message) } }));
        },
        download(path) {
          return idbDo('readonly', s => s.get(key(path)))
            .then(blob => (blob ? { data: blob, error: null } : { data: null, error: { message: 'ไม่พบไฟล์' } }))
            .catch(e => ({ data: null, error: { message: String(e && e.message) } }));
        },
        remove(paths) {
          return idbDo('readwrite', s => { (paths || []).forEach(p => s.delete(key(p))); return null; })
            .then(() => ({ data: paths, error: null }))
            .catch(e => ({ data: null, error: { message: String(e && e.message) } }));
        }
      };
    }
  };

  const client = { __local: true, from: table => new Query(table), rpc, storage };

  /* ---------- install ---------- */
  const mode = readMode();
  const enabled = mode !== 'supabase';
  const real = global.supabase;

  global.ECMISLocalDB = {
    enabled,
    mode,
    client,
    tables: () => Object.keys(PK),
    rows: t => clone(rowsOf(t)),
    reset() { wipe(); ensureSeeded(); notifyChange('*'); },
    exportJson() {
      return JSON.stringify({ version: localStorage.getItem(VERSION_KEY), tables: Object.fromEntries(Object.keys(PK).map(t => [t, rowsOf(t)])) });
    }
  };

  /* ---------- app state: business data that has no table of its own ----------
     Board rosters, attendance, board notes, ม.38 reports … used to live in loose localStorage keys,
     outside the DB. They now go to table ecmis_app_state { state_key, state_value (JSON), updated_datetime }
     so they reset/export with the rest of the data. Sync API, because the pages read them synchronously.
     With ?db=supabase (no such table there) it falls back to the old localStorage key. */
  function parseLoose(raw) { try { return JSON.parse(raw); } catch (e) { return raw; } }
  function stateSet(key, value) {
    if (!enabled) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error('appState save failed:', e); }
      return;
    }
    const res = client.from('ecmis_app_state')
      .upsert({ state_key: key, state_value: value, updated_datetime: new Date().toISOString() }, { onConflict: 'state_key' })
      .execSync();
    if (res.error) console.error('appState save failed:', res.error.message);
  }
  function stateGet(key, fallback) {
    if (!enabled) {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : parseLoose(raw);
    }
    const row = rowsOf('ecmis_app_state').find(r => r.state_key === key);
    if (row) return clone(row.state_value);
    const legacy = localStorage.getItem(key); // value saved before this table existed → move it in once
    if (legacy == null) return fallback;
    const v = parseLoose(legacy);
    stateSet(key, v);
    localStorage.removeItem(key);
    return v;
  }
  global.ECMISAppState = { get: stateGet, set: stateSet };

  /* vendor supabase.js declares `var supabase`, so the global can be reassigned but not redefined. */
  if (enabled) {
    global.supabase = Object.assign({}, real || {}, {
      createClient: () => client,
      __realCreateClient: real && real.createClient ? real.createClient.bind(real) : null
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
