/* กิจกรรมที่ 7 · เครื่องมือกลางของ "ผังกระบวนงานและหน้าจอ" (flow-to-page.html) และ "คู่มือเดิน Flow" (flow-guide.html)
   - ใช้ข้อมูลชุดเดียว window.A7FLOW (assets/a7-flow-data.js สร้างจาก User Flow V1.0.14 + ผลตรวจต้นแบบ)
   - เครื่องเดินผัง: ไล่โหนดตามเส้นในผังจริง ข้ามตัวเชื่อม "ไป x-x" ไปยัง "จาก x-x" ของหน้าปลายทาง
   - สถานะสาธิต (Demo Session) เก็บใน localStorage 'ecmis_a7_demo' — ใช้ร่วมกับหน้าต้นแบบผ่าน ecmis-app.js
   - การสลับบทบาทเป็นของโหมดสาธิตเท่านั้น: เขียน sessionStorage แบบเดียวกับปุ่มเข้าสู่ระบบด่วน ไม่มีการยืนยันตัวตนจริง */
(function (root) {
  'use strict';
  const D = root.A7FLOW;
  if (!D) { console.error('A7FLOW data missing (assets/a7-flow-data.js)'); return; }
  const KEY = 'ecmis_a7_demo';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const STATUS = {
    mapped: { label: 'มีหน้าจอ', icon: 'fa-circle-check', cls: 'st-mapped', desc: 'มีหน้าจอและปุ่มตรงขั้น (ตรวจแล้ว)' },
    partial: { label: 'มีบางส่วน', icon: 'fa-circle-half-stroke', cls: 'st-partial', desc: 'มีหน้าจอแต่ไม่ครบหรือผู้ทำต่างจากผัง' },
    pending: { label: 'รอยืนยัน', icon: 'fa-circle-question', cls: 'st-pending', desc: 'Pending Verification — ไม่มีเรื่องตัวอย่าง หรือรอยืนยันกฎ' },
    missing: { label: 'ยังไม่มีหน้าจอ', icon: 'fa-circle-xmark', cls: 'st-missing', desc: 'Not Implemented / Missing Mapping' },
    external: { label: 'นอกระบบ', icon: 'fa-arrow-up-right-from-square', cls: 'st-external', desc: 'External Process — ทำในระบบอื่น' }
  };
  const ROLE_FALLBACK = { owner: 'ผู้รับผิดชอบสำนวนคดี (นอกระบบ)', any: 'บุคลากรสำนักงาน ป.ป.ท. (ตามสิทธิ์)' };

  /* ---------- Option ---------- */
  /* ต้นแบบใช้โครงกระบวนการ Option B ชุดเดียว (ตัด Option A ออก 25/11/2569) — ฟังก์ชันคงไว้ให้หน้าที่เรียกด้วย opt ทำงานเหมือนเดิม */
  const OPTION = 'B';
  function allowedOptions() { return [OPTION]; }
  function option() { return OPTION; }
  function setOption() { /* มี Option เดียว */ }

  /* ---------- บทบาท (จาก ECMIS.ROLES ของต้นแบบ) ---------- */
  function roles() {
    const E = root.ECMIS;
    const ids = (E && E.LOGIN_ALLOWED_ROLE_IDS) || [];
    return ((E && E.ROLES) || []).filter(r => ids.includes(r.id)).map(r => ({ id: r.id, name: r.name, title: r.title, login: r.login, group: r.group || '' }));
  }
  function roleInfo(id) {
    const r = roles().find(x => x.id === id);
    return r || { id, name: '', title: ROLE_FALLBACK[id] || id, login: '', group: '' };
  }
  function roleLabel(id) { const r = roleInfo(id); return r.title + (r.login ? ` (${r.login})` : ''); }
  function activeRole() { try { return sessionStorage.getItem('ecmis_role') || ''; } catch (e) { return ''; } }

  /* ---------- ข้อมูลผัง ---------- */
  const pagesOf = opt => (D.pages[opt] || []);
  const pageOf = (opt, id) => pagesOf(opt).find(p => p.id === id) || null;
  const nodeOf = (opt, pid, nid) => { const p = pageOf(opt, pid); return p ? p.nodes.find(n => n.id === nid) || null : null; };
  const procOf = id => D.processes.find(p => p.id === id) || null;
  const outEdges = (page, nid) => page.edges.filter(e => e.from === nid);
  const isStop = n => n && (n.type === 'task' || n.type === 'decision' || n.type === 'gateway' || n.type === 'end');
  function connectorTargets(opt, pid, n) {
    const ids = (n.label.match(/\d-\d/g) || []).map(t => (D.aliases && D.aliases[t] && pageOf(opt, D.aliases[t])) ? D.aliases[t] : t);
    return [...new Set(ids)].filter(t => pageOf(opt, t));
  }
  function entryOf(opt, targetPid, fromPid) {
    const tp = pageOf(opt, targetPid);
    if (!tp) return null;
    const viaConn = tp.nodes.find(x => x.type === 'connector' && /^จาก/.test(x.label) && x.label.includes(fromPid));
    if (viaConn) return viaConn.id;
    const st = tp.nodes.find(x => x.type === 'start');
    if (st) return st.id;
    const tos = new Set(tp.edges.map(e => e.to));
    const first = tp.nodes.find(x => !tos.has(x.id) && (x.type === 'connector' || x.type === 'task'));
    return (first || tp.nodes[0]).id;
  }
  /* ทางเลือกของโหนด: จุดตัดสินใจ / เกตเวย์คู่ขนาน / ตัวเชื่อมหลายปลายทาง */
  function choicesOf(opt, pid, nid) {
    const p = pageOf(opt, pid); const n = nodeOf(opt, pid, nid);
    if (!p || !n) return [];
    if (n.type === 'connector' && /^ไป/.test(n.label)) {
      const ts = connectorTargets(opt, pid, n);
      return ts.length > 1 ? ts.map((t, i) => ({ index: i, label: `ไปหน้า ${t}`, toPage: t, describe: (pageOf(opt, t) || {}).title || '' })) : [];
    }
    if (n.type !== 'decision' && n.type !== 'gateway') return [];
    return outEdges(p, nid).map((e, i) => {
      const t = p.nodes.find(x => x.id === e.to) || {};
      return { index: i, label: e.label || (n.type === 'gateway' ? `ทางที่ ${i + 1} (คู่ขนาน)` : `ทางที่ ${i + 1}`), to: e.to, describe: t.label || (t.type === 'merge' ? 'ไปขั้นถัดไป' : '') };
    });
  }
  /* เดินต่อจากโหนดปัจจุบันจนถึงโหนดที่ต้องหยุด (งาน/ตัดสินใจ/สิ้นสุด) — choice = index ทางเลือก */
  function advance(opt, pid, nid, choice) {
    let p = pageOf(opt, pid); let n = nodeOf(opt, pid, nid);
    const passed = [];
    let guard = 0;
    let first = true;
    while (p && n && guard++ < 80) {
      if (!first && isStop(n)) return { pid: p.id, nid: n.id, passed };
      if (!first && n.type === 'connector' && /^ไป/.test(n.label) && connectorTargets(opt, p.id, n).length > 1) return { pid: p.id, nid: n.id, passed };
      first = false;
      if (n.type === 'end') return { pid: p.id, nid: n.id, passed, end: true };
      if (n.type === 'connector' && /^ไป/.test(n.label)) {
        const ts = connectorTargets(opt, p.id, n);
        if (!ts.length) return { pid: p.id, nid: n.id, passed, dead: `ปลายทาง ${n.label} ไม่มีใน Option ${opt}` };
        const t = ts[Math.min(choice || 0, ts.length - 1)];
        passed.push({ pid: p.id, nid: n.id, jump: t });
        const entry = entryOf(opt, t, p.id);
        p = pageOf(opt, t); n = nodeOf(opt, t, entry); choice = 0;
        if (n && isStop(n)) return { pid: p.id, nid: n.id, passed };
        continue;
      }
      const outs = outEdges(p, n.id);
      if (!outs.length) return { pid: p.id, nid: n.id, passed, dead: 'ไม่มีเส้นออกจากโหนดนี้ในผัง' };
      const e = (n.type === 'decision' || n.type === 'gateway') ? outs[Math.min(choice || 0, outs.length - 1)] : outs[0];
      passed.push({ pid: p.id, nid: n.id, label: e.label });
      n = nodeOf(opt, p.id, e.to); choice = 0;
    }
    return { pid: p && p.id, nid: n && n.id, passed, dead: 'ไม่พบโหนดถัดไป' };
  }
  function choiceIndexFor(opt, pid, nid, answers) {
    const ch = choicesOf(opt, pid, nid);
    if (!ch.length || !answers) return 0;
    const a = answers[nid];
    if (a == null) return 0;
    if (typeof a === 'number') return a;
    const byLabel = ch.find(c => c.label === a || c.toPage === a);
    return byLabel ? byLabel.index : 0;
  }
  /* คาดการณ์เส้นทางที่เหลือตามคำตอบตั้งต้น */
  function predict(opt, pid, nid, answers, limit) {
    const out = [];
    let cur = { pid, nid };
    for (let i = 0; i < (limit || 120); i++) {
      const n = nodeOf(opt, cur.pid, cur.nid);
      if (!n) break;
      out.push({ pid: cur.pid, nid: cur.nid });
      if (n.type === 'end') break;
      const nx = advance(opt, cur.pid, cur.nid, choiceIndexFor(opt, cur.pid, cur.nid, answers));
      if (!nx.nid || nx.dead || (nx.pid === cur.pid && nx.nid === cur.nid)) break;
      cur = nx;
    }
    return out;
  }
  function scenarioFor(opt, id) {
    const s = D.scenarios.find(x => x.id === id);
    if (!s || !s.byOption[opt]) return null;
    return Object.assign({}, s, s.byOption[opt]);
  }
  function screenUrl(url, role) {
    if (!url) return '';
    const sep = url.includes('?') ? '&' : '?';
    return role && role !== 'owner' && role !== 'any' ? `${url}${sep}demo_role=${encodeURIComponent(role)}` : url;
  }
  function roleForNode(n) {
    if (!n) return '';
    if (n.role && n.role !== 'owner' && n.role !== 'any') return n.role;
    if (n.role === 'any') return activeRole() || 'secgen';
    return '';
  }
  function statusMeta(s) { return STATUS[s] || { label: '—', icon: 'fa-circle', cls: 'st-none', desc: '' }; }
  function ruleText(code) { return D.rules[code] ? `${code} ${D.rules[code]}` : code; }
  function pendingText(code) { return D.pendingConfirm[code] ? `${code} ${D.pendingConfirm[code]}` : code; }

  /* ---------- Demo Session ---------- */
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } return s; }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  function switchRole(roleId, reason) {
    if (!roleId || roleId === 'owner' || roleId === 'any') return false;
    const r = roleInfo(roleId);
    try {
      sessionStorage.setItem('ecmis_role', roleId);
      sessionStorage.setItem('ecmis_username', r.login || roleId);
      sessionStorage.setItem('ecmis_authed', '1');
    } catch (e) { /* ignore */ }
    const s = load();
    if (s && s.scenario_id) {
      s.active_role = roleId; s.active_account = r.login || roleId;
      (s.workflow_history = s.workflow_history || []).push({ t: new Date().toISOString(), type: 'role-switch', role: roleId, via: reason || 'switcher' });
      save(s);
    }
    root.dispatchEvent(new CustomEvent('a7:role', { detail: { role: roleId, reason } }));
    return true;
  }

  /* ---------- ตัวสลับบทบาท (หัวหน้า) ---------- */
  function mountRoleSwitcher(host, opts) {
    opts = opts || {};
    host.classList.add('a7-rs');
    host.innerHTML = `<button type="button" class="a7-rs-btn" aria-haspopup="listbox" aria-expanded="false" title="เลือกบัญชีเพื่อสลับบทบาทการทำงานทันที โดยไม่ต้องออกจากระบบ">
        <i class="fa-solid fa-user-gear"></i><span class="a7-rs-cur"></span><i class="fa-solid fa-chevron-down small"></i></button>
      <div class="a7-rs-pop" role="dialog" aria-label="สลับบทบาท" hidden>
        <div class="a7-rs-head"><b>สลับบทบาท</b><small>เลือกบัญชีเพื่อสลับบทบาทการทำงานทันที โดยไม่ต้องออกจากระบบ (โหมดสาธิต)</small></div>
        <input type="search" class="form-control form-control-sm a7-rs-q" placeholder="ค้นหาชื่อ ตำแหน่ง หรือหน่วยงาน">
        <ul class="a7-rs-list" role="listbox"></ul>
      </div>`;
    const btn = host.querySelector('.a7-rs-btn'), pop = host.querySelector('.a7-rs-pop'), list = host.querySelector('.a7-rs-list'), q = host.querySelector('.a7-rs-q');
    const paint = () => {
      const cur = activeRole();
      const ri = roleInfo(cur);
      host.querySelector('.a7-rs-cur').innerHTML = cur ? `<b>${esc(ri.title)}</b><small>${esc(ri.name || '')}${ri.login ? ' · ' + esc(ri.login) : ''}</small>` : '<b>ยังไม่ได้เลือกบทบาท</b>';
      const term = q.value.trim().toLowerCase();
      const html = roles().filter(r => !term || [r.title, r.name, r.login, r.group].join(' ').toLowerCase().includes(term)).map(r => `
        <li role="option" aria-selected="${r.id === cur}" class="${r.id === cur ? 'is-cur' : ''}" data-role="${esc(r.id)}" tabindex="0">
          <span class="a7-rs-av">${esc((r.name || r.title).replace(/^(นาย|นางสาว|นาง)/, '').trim().slice(0, 1))}</span>
          <span class="a7-rs-txt"><b>${esc(r.title)}</b><small>${esc(r.name || '')} · ${esc(r.login)}${r.group ? ' · ' + esc(r.group) : ''}</small></span>
          ${r.id === cur ? '<i class="fa-solid fa-check"></i>' : ''}</li>`).join('') || '<li class="a7-rs-empty">ไม่พบบัญชี</li>';
      if (list.dataset.k !== html) { list.dataset.k = html; list.innerHTML = html; }   // ไม่วาดซ้ำถ้าเหมือนเดิม (กันรายการหลุดระหว่างกด)
    };
    const open = on => { pop.hidden = !on; btn.setAttribute('aria-expanded', String(on)); if (on) { paint(); setTimeout(() => q.focus(), 0); } };
    btn.addEventListener('click', () => open(pop.hidden));
    q.addEventListener('input', paint);
    const pick = li => { if (!li || !li.dataset.role) return; open(false); switchRole(li.dataset.role, 'switcher'); paint(); if (opts.onChange) opts.onChange(li.dataset.role); };
    list.addEventListener('click', e => pick(e.target.closest('li')));
    list.addEventListener('keydown', e => { if (e.key === 'Enter') pick(e.target.closest('li')); });
    /* ใช้ composedPath: ปุ่มวาดข้อความใหม่ตอนเปิด ทำให้ e.target หลุดจาก DOM แล้วถูกนับว่าคลิกนอกกล่อง */
    document.addEventListener('click', e => { if (!(e.composedPath ? e.composedPath() : [e.target]).includes(host)) open(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
    root.addEventListener('a7:role', paint);
    paint();
    return { paint };
  }

  /* ---------- Mermaid ---------- */
  const mmText = s => String(s || '').replace(/"/g, "'").replace(/[\r\n]+/g, ' ').replace(/[<>]/g, ' ').replace(/#/g, 'เลข ').trim();
  function mmNode(n, opts) {
    const id = n.id;
    const sub = [];
    if (opts.showRole) { const r = n.role ? roleInfo(n.role).title : (n.lane || ''); if (r) sub.push(r); }
    if (n.step) sub.push(n.step);
    const lab = mmText(n.label) || ' ';
    const html = opts.html !== false && sub.length ? `${lab}<br/><span class='mm-sub'>${mmText(sub.join(' · '))}</span>` : lab;
    switch (n.type) {
      case 'decision': return `${id}{"${lab}"}`;
      case 'gateway': return `${id}{"+"}`;
      case 'start': return `${id}(["${lab}"])`;
      case 'end': return `${id}(["${lab}"])`;
      case 'merge': return `${id}((" "))`;
      case 'connector': return `${id}>"${lab}"]`;
      default: return `${id}("${html}")`;
    }
  }
  function pageMermaid(opt, pid, opts) {
    opts = Object.assign({ showRole: true, html: true }, opts || {});
    const p = pageOf(opt, pid);
    if (!p) return 'flowchart TB\n  x["ไม่พบหน้า"]';
    const lines = ['flowchart TB'];
    const used = new Set(p.edges.flatMap(e => [e.from, e.to]));
    const nodes = p.nodes.filter(n => n.type !== 'note' && (used.has(n.id) || n.type === 'task'));
    nodes.forEach(n => lines.push('  ' + mmNode(n, opts)));
    p.edges.forEach(e => { if (nodes.some(n => n.id === e.from) && nodes.some(n => n.id === e.to)) lines.push(`  ${e.from} -->${e.label ? `|"${mmText(e.label)}"|` : ''} ${e.to}`); });
    const by = {};
    nodes.forEach(n => {
      const c = n.type === 'decision' || n.type === 'gateway' ? 'dec' : n.type === 'connector' ? 'conn' : (n.type === 'start' || n.type === 'end' || n.type === 'merge') ? 'term' : (STATUS[n.status] ? n.status : 'none');
      (by[c] = by[c] || []).push(n.id);
    });
    lines.push('  classDef mapped fill:#ecfdf5,stroke:#10b981,color:#14532d;',
      '  classDef partial fill:#fffbeb,stroke:#f59e0b,color:#78350f;',
      '  classDef pending fill:#eff6ff,stroke:#60a5fa,color:#1e3a8a,stroke-dasharray:5 3;',
      '  classDef missing fill:#fef2f2,stroke:#f87171,color:#7f1d1d,stroke-dasharray:5 3;',
      '  classDef external fill:#f3f4f6,stroke:#9ca3af,color:#374151,stroke-dasharray:5 3;',
      '  classDef dec fill:#fff7e6,stroke:#c9a227,color:#5c4500;',
      '  classDef conn fill:#eef3f8,stroke:#7890a5,color:#082b50;',
      '  classDef term fill:#ffffff,stroke:#334155,color:#0f172a;',
      '  classDef none fill:#ffffff,stroke:#94a3b8;');
    Object.entries(by).forEach(([c, ids]) => lines.push(`  class ${ids.join(',')} ${c};`));
    return lines.join('\n');
  }
  /* ผังภาพรวม: 8 กระบวนการ + ระบบภายนอก — เส้นเชื่อมสรุปจากตัวเชื่อม "ไป x-x" ในผังจริง */
  function overviewData(opt) {
    const edges = {};
    const ends = new Set();
    pagesOf(opt).forEach(p => {
      p.nodes.forEach(n => {
        if (n.type === 'end') ends.add(p.proc);
        if (n.type === 'connector' && /^ไป/.test(n.label)) connectorTargets(opt, p.id, n).forEach(t => {
          const to = 'P' + t[0];
          if (to === p.proc) return;
          const k = p.proc + '>' + to;
          (edges[k] = edges[k] || new Set()).add(`${p.id}→${t}`);
        });
      });
    });
    return { edges, ends };
  }
  function overviewMermaid(opt) {
    const { edges, ends } = overviewData(opt);
    const L = ['flowchart LR', '  START(["เริ่ม"])', '  XCMP>"ระบบกระบวนการดำเนินงานเรื่องร้องเรียนกล่าวหา"]', '  END(["สิ้นสุด"])',
      '  XEOF[/"ระบบงานสารบรรณ (e-office)"/]', '  XFOL[/"กลุ่มงานบริหารติดตามคดี / ป.ป.ช. / อัยการ"/]'];
    D.processes.forEach(p => {
      const n = pagesOf(opt).filter(x => x.proc === p.id).length;
      L.push(`  ${p.id}("<b>${p.id} ${mmText(p.name)}</b><br/><span class='mm-sub'>${p.abbr} · ${n} หน้าผัง</span>")`);
    });
    L.push('  START --> XCMP', '  XCMP -->|"ส่งสำนวน/รายงาน"| P1');
    Object.entries(edges).forEach(([k]) => { const [a, b] = k.split('>'); L.push(`  ${a} --> ${b}`); });
    ends.forEach(p => { if (p !== 'P8') L.push(`  ${p} -.-> END`); });
    L.push('  P1 -.->|"ปฏิเสธการรับ"| XCMP', '  P4 -.->|"ขอเลข"| XEOF', '  P5 -.->|"ขอเลข"| XEOF', '  P6 -.->|"ขอเลข"| XEOF', '  P7 -.->|"ขอเลข"| XEOF', '  P7 -.->|"ส่งต่อ/ติดตาม"| XFOL');
    L.push('  P8 -.-|"ใช้ได้ทุกช่วง"| P5');
    L.push('  classDef proc fill:#ffffff,stroke:#082b50,stroke-width:1.5px,color:#082b50;', '  classDef ext fill:#f3f4f6,stroke:#9ca3af,color:#374151,stroke-dasharray:5 3;',
      '  classDef term fill:#ffffff,stroke:#334155;', `  class ${D.processes.map(p => p.id).join(',')} proc;`, '  class XCMP,XEOF,XFOL ext;', '  class START,END term;');
    return L.join('\n');
  }
  let mmReady = false;
  function initMermaid() {
    if (mmReady || !root.mermaid) return;
    root.mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'base', fontFamily: 'Sarabun, sans-serif',
      themeVariables: { fontFamily: 'Sarabun, sans-serif', fontSize: '14px', primaryColor: '#ffffff', lineColor: '#7890a5', primaryBorderColor: '#082b50' },
      flowchart: { htmlLabels: true, curve: 'basis', nodeSpacing: 34, rankSpacing: 46, padding: 10, useMaxWidth: false } });
    mmReady = true;
  }
  let mmSeq = 0;
  async function renderMermaid(el, def, onNode) {
    initMermaid();
    const { svg } = await root.mermaid.render('a7mm' + (++mmSeq), def);
    el.innerHTML = svg;
    const s = el.querySelector('svg');
    if (s) { s.style.maxWidth = 'none'; s.removeAttribute('height'); }
    el.querySelectorAll('g.node').forEach(g => {
      const m = /^flowchart-(.+)-\d+$/.exec(g.id || '');
      if (!m) return;
      g.dataset.nid = m[1];
      g.style.cursor = 'pointer';
      g.setAttribute('tabindex', '0');
      g.addEventListener('click', () => onNode && onNode(m[1], g));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' && onNode) onNode(m[1], g); });
    });
    return s;
  }

  /* ---------- ซูม / เลื่อน / พอดีจอ ---------- */
  function panZoom(viewport, stage, opts) {
    opts = opts || {};
    let s = 1, x = 0, y = 0, drag = null;
    const apply = () => { stage.style.transform = `translate(${x}px, ${y}px) scale(${s})`; };
    /* พอดีจอ: ผังละเอียดพอดีความกว้าง (ตัวอักษรอ่านได้ เลื่อนลงดูต่อ) · ผังภาพรวมพอดีทั้งกรอบ */
    const fit = () => {
      const svg = stage.querySelector('svg'); if (!svg) return;
      const vb = svg.viewBox && svg.viewBox.baseVal;
      const w = (vb && vb.width) || svg.getBBox().width, h = (vb && vb.height) || svg.getBBox().height;
      svg.setAttribute('width', w); svg.setAttribute('height', h);
      const W = viewport.clientWidth - 24, H = viewport.clientHeight - 24;
      s = opts.fitWhole ? Math.min(W / w, H / h) : Math.max(Math.min(W / w, H / h), Math.min(W / w, 0.95));
      s = Math.max(0.2, Math.min(1.3, s));
      x = Math.max(12, (viewport.clientWidth - w * s) / 2); y = 12; apply();
    };
    const zoom = (f, cx, cy) => {
      const r = viewport.getBoundingClientRect();
      cx = cx == null ? r.width / 2 : cx; cy = cy == null ? r.height / 2 : cy;
      const ns = Math.max(0.15, Math.min(3, s * f));
      x = cx - (cx - x) * (ns / s); y = cy - (cy - y) * (ns / s); s = ns; apply();
    };
    viewport.addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const r = viewport.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    viewport.addEventListener('pointerdown', e => { if (e.target.closest('g.node')) return; drag = { sx: e.clientX - x, sy: e.clientY - y }; viewport.setPointerCapture(e.pointerId); viewport.classList.add('is-drag'); });
    viewport.addEventListener('pointermove', e => { if (!drag) return; x = e.clientX - drag.sx; y = e.clientY - drag.sy; apply(); });
    const up = () => { drag = null; viewport.classList.remove('is-drag'); };
    viewport.addEventListener('pointerup', up); viewport.addEventListener('pointercancel', up);
    const center = el => {
      if (!el) return;
      const vr = viewport.getBoundingClientRect(), er = el.getBoundingClientRect();
      x += vr.left + vr.width / 2 - (er.left + er.width / 2); y += vr.top + vr.height / 3 - (er.top + er.height / 2); apply();
    };
    return { fit, zoomIn: () => zoom(1.2), zoomOut: () => zoom(1 / 1.2), center, reset: () => { s = 1; x = 12; y = 12; apply(); } };
  }

  /* ---------- ส่งออก SVG / PNG ---------- */
  function download(name, blob) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function exportSvg(svg, name) {
    const c = svg.cloneNode(true);
    c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    c.style.background = '#ffffff';
    download(name + '.svg', new Blob([new XMLSerializer().serializeToString(c)], { type: 'image/svg+xml;charset=utf-8' }));
  }
  /* PNG: วาดใหม่ด้วยป้ายข้อความแบบ SVG (ไม่ใช้ foreignObject) เพื่อให้ canvas ส่งออกได้ — ขนาดพอดีกระดาษ A4 */
  async function exportPng(def, name, a4) {
    initMermaid();
    const holder = document.createElement('div'); holder.style.cssText = 'position:fixed;left:-99999px;top:0';
    document.body.appendChild(holder);
    try {
      root.mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'base', fontFamily: 'Sarabun, sans-serif', flowchart: { htmlLabels: false, curve: 'basis', useMaxWidth: false } });
      const { svg } = await root.mermaid.render('a7png' + (++mmSeq), def.replace(/<br\/><span class='mm-sub'>/g, ' · ').replace(/<\/?b>|<\/span>/g, ''));
      holder.innerHTML = svg;
      const s = holder.querySelector('svg'); const vb = s.viewBox.baseVal;
      let w = vb.width, h = vb.height;
      const scale = a4 ? Math.min(3, (a4 === 'landscape' ? 3508 : 2480) / w) : 2;
      const img = new Image();
      s.setAttribute('width', w); s.setAttribute('height', h);
      const data = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(s));
      await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = data; });
      const cv = document.createElement('canvas'); cv.width = Math.ceil(w * scale); cv.height = Math.ceil(h * scale);
      const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
      await new Promise(ok => cv.toBlob(b => { download(name + '.png', b); ok(); }, 'image/png'));
    } finally {
      holder.remove(); mmReady = false; initMermaid();
    }
  }

  root.A7Flow = {
    D, esc, STATUS, statusMeta, ruleText, pendingText,
    allowedOptions, option, setOption, roles, roleInfo, roleLabel, activeRole,
    pagesOf, pageOf, nodeOf, procOf, outEdges, choicesOf, advance, predict, choiceIndexFor, connectorTargets, scenarioFor,
    screenUrl, roleForNode, load, save, reset, switchRole, mountRoleSwitcher,
    pageMermaid, overviewMermaid, overviewData, renderMermaid, panZoom, exportSvg, exportPng, download
  };
})(window);
