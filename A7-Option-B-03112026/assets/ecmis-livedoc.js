/* E-CMIS Live Document — โครงสองฝั่ง (ฟอร์มซ้าย / เอกสารขวา) แก้ได้ทั้งสองฝั่งและ sync กันทันที
   (ตามตัวอย่าง sample-livedoc: activity5-doc-sync.js + ECMISDocSplit)

   วิธีผูกค่า: เทมเพลตเอกสารเรียก ECMIS.mergeField(ค่า, ข้อความแทน, 'idของช่องในฟอร์ม')
   → ค่านั้นในเอกสารถูกติด data-bind="idของช่อง" และกลายเป็นจุดที่แก้ในเอกสารได้
   - ช่องข้อความ (input text / textarea) : พิมพ์ในเอกสาร → เขียนกลับช่องฟอร์ม + ยิง input ให้หน้าวาดเอกสาร/ตรวจความครบใหม่
   - ช่องวันที่ / ตัวเลือก / radio / select : แก้ในเอกสารไม่ได้ กดที่ค่าในเอกสารแล้วพาไปที่ช่องในฟอร์มแทน
   - พิมพ์ในฟอร์ม → หน้าเดิมวาดเอกสารใหม่ (ถ้าไม่วาดใหม่ ตัวนี้อัปเดตข้อความที่ผูกให้เอง)
   - ฟอร์มยังเป็นต้นทางข้อมูลและบันทึกผ่านเส้นทางเดิม (ไม่แตะ onSave / Supabase)
   ไม่ผูก = ไม่เปลี่ยนพฤติกรรมเดิมของหน้า */
(function (root) {
  'use strict';
  if (root.ECMISLiveDoc) return;
  const doc = root.document;
  const TEXT_TYPES = new Set(['text', 'search', 'tel', 'email', 'url', 'number', '']);
  const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';
  const q = v => String(v == null ? '' : v).replace(/["\\]/g, '\\$&');
  const arabic = s => String(s).replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d)));
  const thai = s => String(s).replace(/[0-9]/g, d => THAI_DIGITS[Number(d)]);
  const visible = el => Boolean(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const LS_KEY = 'ecmis.livedoc.split';
  let pending = null;          // ตำแหน่งเคอร์เซอร์ที่ต้องคืนหลังเอกสารถูกวาดใหม่
  let paneRoot = null;
  let frame = 0;

  const paneEl = () => paneRoot && paneRoot.isConnected ? paneRoot : (paneRoot = doc.querySelector('.ws-doc-pane'));
  const inPane = el => Boolean(el && el.closest && el.closest('.ws-doc-pane'));

  /* ---------- ช่องฟอร์มของ bind ---------- */
  function controlFor(bind) {
    if (!bind) return null;
    let el = doc.getElementById(bind);
    if (el && inPane(el)) el = null;
    if (!el) {
      const named = [...doc.querySelectorAll(`[name="${q(bind)}"]`)].filter(n => !inPane(n));
      el = named.find(n => n.checked) || named[0] || null;
    }
    return el;
  }
  function textEditable(c) {
    return Boolean(c && !c.disabled && !c.readOnly && visible(c)
      && (c.tagName === 'TEXTAREA' || (c.tagName === 'INPUT' && TEXT_TYPES.has(c.type))));
  }
  function labelOf(c) {
    if (!c) return 'ข้อความ';
    const lab = c.id ? doc.querySelector(`label[for="${q(c.id)}"]`) : null;
    const wrap = c.closest('.mb-3, .mb-2, .form-group, div');
    const txt = (lab && lab.textContent) || (wrap && wrap.querySelector('.form-label') && wrap.querySelector('.form-label').textContent) || c.getAttribute('aria-label') || c.getAttribute('placeholder') || '';
    return txt.replace(/\*/g, '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'ข้อความ';
  }
  function bindNodes(bind) {
    const p = paneEl();
    return p ? [...p.querySelectorAll(`[data-bind="${q(bind)}"]`)] : [];
  }

  /* ---------- ติดสถานะให้ค่าที่ผูกในเอกสาร ---------- */
  function decorate() {
    const p = paneEl();
    if (!p) return;
    let linked = 0, editable = 0;
    p.querySelectorAll('[data-bind]').forEach(node => {
      const c = controlFor(node.dataset.bind);
      const ed = textEditable(c);
      node.classList.add('ld-bind');
      node.classList.toggle('is-linked', Boolean(c));
      node.classList.toggle('is-editable', ed);
      if (c) linked++;
      if (ed) editable++;
      if (ed) {
        if (node.getAttribute('contenteditable') == null) {
          node.setAttribute('contenteditable', 'plaintext-only');
          if (node.contentEditable !== 'plaintext-only') node.setAttribute('contenteditable', 'true');
          node.dataset.ldCe = '1';
        }
        node.setAttribute('spellcheck', 'false');
        node.setAttribute('role', 'textbox');
        node.dataset.ph = labelOf(c);
        node.title = 'แก้ข้อความตรงนี้ได้ ระบบเขียนกลับฟอร์มให้ทันที';
      } else {
        if (node.dataset.ldCe) { node.removeAttribute('contenteditable'); delete node.dataset.ldCe; }
        node.removeAttribute('role');
        node.title = c ? 'กดเพื่อไปแก้ที่ช่องในฟอร์ม' : '';
      }
    });
    updateBar(p, linked, editable);
    restoreCaret();
    try { enhance(); } catch (err) { if (root.console) console.warn('ECMISLiveDoc enhance:', err); }
  }
  function schedule() {
    // ใช้ setTimeout แทน requestAnimationFrame: แท็บเบื้องหลัง/แผงที่ซ่อนอยู่ไม่เรียก rAF
    clearTimeout(frame);
    frame = setTimeout(decorate, 24);
  }

  /* ---------- เคอร์เซอร์: จำ / คืนหลังวาดเอกสารใหม่ ---------- */
  function caretOffset(node) {
    const sel = root.getSelection && root.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const r = sel.getRangeAt(0);
    if (!node.contains(r.startContainer)) return null;
    const pre = r.cloneRange();
    pre.selectNodeContents(node);
    pre.setEnd(r.startContainer, r.startOffset);
    return pre.toString().length;
  }
  function placeCaret(node, offset) {
    const sel = root.getSelection();
    const range = doc.createRange();
    const walker = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let left = offset, n, done = false;
    while ((n = walker.nextNode())) {
      if (left <= n.nodeValue.length) { range.setStart(n, left); range.collapse(true); done = true; break; }
      left -= n.nodeValue.length;
    }
    if (!done) { range.selectNodeContents(node); range.collapse(false); }
    sel.removeAllRanges();
    sel.addRange(range);
  }
  function restoreCaret() {
    if (!pending || Date.now() - pending.t > 800) { pending = null; return; }
    const nodes = bindNodes(pending.bind);
    const node = nodes[Math.min(pending.idx, nodes.length - 1)];
    if (!node || !node.isConnected || !node.classList.contains('is-editable')) return;
    // หน้าที่ trim() ค่าก่อนวาด จะกินช่องว่างท้ายที่ผู้ใช้เพิ่งพิมพ์ — คืนข้อความตามที่พิมพ์
    if (pending.text != null && node.textContent !== pending.text && node.textContent.trim() === pending.text.trim()) node.textContent = pending.text;
    if (doc.activeElement !== node) node.focus({ preventScroll: true });
    placeCaret(node, pending.off == null ? node.textContent.length : pending.off);
    pending = null;
  }

  /* ---------- เอกสาร → ฟอร์ม ---------- */
  function flash(el) {
    if (!el) return;
    el.classList.remove('ld-flash');
    void el.offsetWidth;
    el.classList.add('ld-flash');
    setTimeout(() => el.classList.remove('ld-flash'), 1300);
  }
  function fieldBox(c) { return (c && (c.closest('.mb-3, .mb-2, .form-group') || c)) || null; }

  function onDocInput(e) {
    const node = e.target.closest && e.target.closest('.ld-bind.is-editable');
    if (!node || e.isComposing) return;
    const bind = node.dataset.bind;
    const c = controlFor(bind);
    if (!c) return;
    const idx = bindNodes(bind).indexOf(node);
    const off = caretOffset(node);
    let text = node.textContent.replace(/\u00a0/g, ' ');
    if (c.tagName === 'INPUT') text = text.replace(/\s*\n\s*/g, ' ');
    c.value = arabic(text);
    pending = { bind, idx, off, text: thai(c.value), t: Date.now() };
    const ev = new Event('input', { bubbles: true });
    ev.ldFromDoc = true;
    c.dispatchEvent(ev);
    c.classList.remove('is-invalid-ecmis');
    const vm = doc.querySelector(`.val-msg[data-for="${q(c.id)}"]`);
    if (vm && c.value.trim()) vm.classList.remove('show');
    flash(fieldBox(c));
    if (node.isConnected) {
      // หน้าไม่ได้วาดเอกสารใหม่ → อัปเดตค่าเดียวกันที่อื่นในเอกสารให้เอง
      const shown = thai(c.value);
      bindNodes(bind).forEach(n => { if (n !== node && n.textContent !== shown) n.textContent = shown; });
      pending = null;
    } else {
      schedule();
    }
  }
  function onDocFocusOut(e) {
    const node = e.target.closest && e.target.closest('.ld-bind.is-editable');
    if (!node) return;
    const c = controlFor(node.dataset.bind);
    if (c) c.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function onDocKeydown(e) {
    const node = e.target.closest && e.target.closest('.ld-bind.is-editable');
    if (!node || e.key !== 'Enter') return;
    const c = controlFor(node.dataset.bind);
    if (c && c.tagName === 'INPUT') e.preventDefault();
  }
  function onDocPaste(e) {
    const node = e.target.closest && e.target.closest('.ld-bind.is-editable');
    if (!node) return;
    e.preventDefault();
    doc.execCommand('insertText', false, (e.clipboardData && e.clipboardData.getData('text/plain')) || '');
  }
  function onDocClick(e) {
    const node = e.target.closest && e.target.closest('.ld-bind.is-linked:not(.is-editable)');
    if (!node || !inPane(node)) return;
    const c = controlFor(node.dataset.bind);
    if (!c) return;
    const box = fieldBox(c);
    if (visible(c)) {
      c.scrollIntoView({ block: 'center', behavior: 'smooth' });
      try { c.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
    } else if (box) {
      box.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    flash(box);
  }

  /* ---------- ฟอร์ม → เอกสาร ---------- */
  function scrollHost(el) {
    let n = el && el.parentElement;
    while (n && n !== doc.body) {
      const s = getComputedStyle(n);
      if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 4) return n;
      n = n.parentElement;
    }
    return null;
  }
  function bringIntoPane(el) {
    const host = scrollHost(el);
    if (!host) return;
    const b = host.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (r.top < b.top + 30 || r.bottom > b.bottom - 30) host.scrollTop += r.top - b.top - b.height / 3;
  }
  function bindOfControl(c) {
    if (!c || inPane(c)) return null;
    return c.id && bindNodes(c.id).length ? c.id : (c.name && bindNodes(c.name).length ? c.name : null);
  }
  function onFormInput(e) {
    if (e.ldFromDoc) return;
    const c = e.target;
    if (!c || !c.tagName || inPane(c)) return;
    setTimeout(() => {
      const bind = bindOfControl(c);
      if (!bind) return;
      const nodes = bindNodes(bind);
      if (!nodes.length) return;
      if (c.type !== 'radio' && c.type !== 'checkbox' && c.tagName !== 'SELECT' && c.type !== 'date') {
        const shown = thai(c.value);
        nodes.forEach(n => { if (doc.activeElement !== n && n.textContent !== shown) n.textContent = shown; });
      }
      nodes.forEach(flash);
    }, 0);
  }
  function onFormFocusIn(e) {
    const c = e.target;
    if (!c || !c.tagName || inPane(c)) return;
    const p = paneEl();
    if (!p) return;
    p.querySelectorAll('.is-focus-linked').forEach(n => n.classList.remove('is-focus-linked'));
    const bind = bindOfControl(c);
    if (!bind) return;
    const nodes = bindNodes(bind);
    nodes.forEach(n => n.classList.add('is-focus-linked'));
    if (nodes[0]) bringIntoPane(nodes[0]);
  }
  function onFormFocusOut(e) {
    if (inPane(e.target)) return;
    const p = paneEl();
    if (p) p.querySelectorAll('.is-focus-linked').forEach(n => n.classList.remove('is-focus-linked'));
  }

  /* ---------- แถบสถานะบนแผงเอกสาร ---------- */
  function updateBar(p, linked, editable) {
    let bar = p.querySelector(':scope > .ld-sync-bar');
    if (!bar) {
      bar = doc.createElement('div');
      bar.className = 'ld-sync-bar no-print';
      bar.setAttribute('role', 'status');
      const stage = p.querySelector('.ws-paper-stage');
      if (stage) p.insertBefore(bar, stage); else p.appendChild(bar);
    }
    const msg = linked
      ? `<i class="fa-solid fa-arrows-left-right"></i><span><b>ซิงก์สองทาง</b> · เชื่อมกับฟอร์ม ${linked} จุด (พิมพ์แก้ในเอกสารได้ ${editable} จุด) · จุดที่มีเส้นประแก้ได้ตรงนี้ จุดอื่นกดเพื่อไปที่ช่องในฟอร์ม</span>`
      : `<i class="fa-solid fa-circle-info"></i><span>เอกสารนี้ไม่มีค่าที่เชื่อมกับฟอร์มในสถานะปัจจุบัน</span>`;
    if (bar.dataset.k !== msg) { bar.dataset.k = msg; bar.innerHTML = msg; }
  }

  /* ---------- โครงสองฝั่ง: เส้นแบ่งลากปรับความกว้าง + ขยายเต็มหน้า ---------- */
  function mountSplit() {
    const ws = doc.querySelector('.document-workspace');
    if (!ws || ws.querySelector(':scope > .ld-divider')) return;
    const pane = ws.querySelector(':scope > .ws-doc-pane');
    const form = pane && pane.previousElementSibling;
    if (!pane || !form) return;
    ws.classList.add('ld-split');
    form.classList.add('ld-form-pane');
    const div = doc.createElement('div');
    div.className = 'ld-divider no-print';
    div.setAttribute('role', 'separator');
    div.setAttribute('aria-orientation', 'vertical');
    div.setAttribute('tabindex', '0');
    div.title = 'ลากเพื่อปรับความกว้าง · ดับเบิลคลิกเพื่อคืนค่า';
    div.innerHTML = `<button type="button" class="ld-exp" data-ld-full="form" title="ขยายฟอร์มเต็มหน้า" aria-label="ขยายฟอร์มเต็มหน้า"><i class="fa-solid fa-angles-left"></i></button>
      <span class="ld-grip" aria-hidden="true"></span>
      <button type="button" class="ld-exp" data-ld-full="doc" title="ขยายเอกสารเต็มหน้า" aria-label="ขยายเอกสารเต็มหน้า"><i class="fa-solid fa-angles-right"></i></button>`;
    ws.insertBefore(div, pane);

    const setRatio = r => {
      r = Math.max(0.25, Math.min(0.75, r));
      ws.style.setProperty('--ld-left', r + 'fr');
      ws.style.setProperty('--ld-right', (1 - r) + 'fr');
      ws.dataset.ldRatio = String(r);
      try { localStorage.setItem(LS_KEY, String(r)); } catch (_) { /* ignore */ }
    };
    const reset = () => {
      ws.style.removeProperty('--ld-left'); ws.style.removeProperty('--ld-right'); delete ws.dataset.ldRatio;
      try { localStorage.removeItem(LS_KEY); } catch (_) { /* ignore */ }
    };
    try { const s = parseFloat(localStorage.getItem(LS_KEY)); if (s > 0.2 && s < 0.8) setRatio(s); } catch (_) { /* ignore */ }

    div.addEventListener('pointerdown', e => {
      if (e.target.closest('.ld-exp')) return;
      e.preventDefault();
      div.setPointerCapture(e.pointerId);
      ws.classList.add('ld-dragging');
      const move = ev => {
        const b = ws.getBoundingClientRect();
        setRatio((ev.clientX - b.left) / Math.max(1, b.width));
      };
      const up = () => {
        ws.classList.remove('ld-dragging');
        div.removeEventListener('pointermove', move);
        div.removeEventListener('pointerup', up);
        div.removeEventListener('pointercancel', up);
      };
      div.addEventListener('pointermove', move);
      div.addEventListener('pointerup', up);
      div.addEventListener('pointercancel', up);
    });
    div.addEventListener('dblclick', e => { if (!e.target.closest('.ld-exp')) reset(); });
    div.addEventListener('keydown', e => {
      const cur = parseFloat(ws.dataset.ldRatio || '0.5');
      if (e.key === 'ArrowLeft') { e.preventDefault(); setRatio(cur - 0.03); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setRatio(cur + 0.03); }
      else if (e.key === 'Home' || e.key === 'Escape') { e.preventDefault(); reset(); }
    });
    div.addEventListener('click', e => {
      const b = e.target.closest('.ld-exp');
      if (!b) return;
      const which = b.dataset.ldFull;
      const cls = which === 'form' ? 'ld-full-form' : 'ld-full-doc';
      const other = which === 'form' ? 'ld-full-doc' : 'ld-full-form';
      ws.classList.remove(other);
      const on = ws.classList.toggle(cls);
      div.querySelectorAll('.ld-exp').forEach(x => x.classList.toggle('is-on', on && x === b));
      if (on) setTimeout(() => { try { root.dispatchEvent(new Event('resize')); } catch (_) { /* ignore */ } }, 60);
    });
  }

  /* =====================================================================
     ส่วนที่เพิ่มตาม sample-livedoc (ก5 รายงาน 213) — 22/11/2569
     1) เก็บข้อความที่แก้ทั้งเอกสารไว้ แม้หน้าวาดเอกสารใหม่จากฟอร์ม (mergeBound)
     2) ป้ายความครบของแต่ละการ์ดในฟอร์ม + แถบ "ตรวจสอบความครบ" / "เติมข้อมูลตัวอย่างเฉพาะช่องว่าง"
     3) เมนูกระโดด "ดูเอกสารทั้งหมด" เมื่อมีแท็บเอกสารหลายแท็บ
     4) ป้าย "บันทึกแล้ว / ยังไม่บันทึก" ในแถบแก้ไขเอกสาร
     ไม่แตะข้อมูลในฐานข้อมูล: ข้อความที่แก้ทั้งเอกสารเก็บใน sessionStorage ของแท็บนี้เท่านั้น
     ===================================================================== */
  const toastOk = (a, b) => { try { root.ECMIS && root.ECMIS.toastOk ? root.ECMIS.toastOk(a, b) : 0; } catch (_) { /* ignore */ } };
  const toastWarn = (a, b) => { try { root.ECMIS && root.ECMIS.toastWarn ? root.ECMIS.toastWarn(a, b) : 0; } catch (_) { /* ignore */ } };
  const hiddenByClass = el => Boolean(el.closest('.d-none, [hidden]'));

  function formColEl() {
    const ws = doc.querySelector('.document-workspace');
    if (!ws) return null;
    return ws.querySelector(':scope > .ld-form-pane') || ws.querySelector('#docLeftCol') || null;
  }
  function stageEl() {
    const p = paneEl();
    if (!p) return null;
    /* เลือกกล่องที่มีกระดาษเอกสารจริง — แถบแก้ไข (#docEditBar) ถูกแทรกไว้ใน .ws-paper-stage ด้วย ห้ามเลือก */
    const cands = [...p.querySelectorAll('.ws-paper-stage > [id]')].filter(e => !e.classList.contains('doc-edit-bar'));
    return cands.find(e => e.querySelector('.doc-paper, .a4-paper, .a4-page')) || p.querySelector('#docPaper') || cands[0] || null;
  }
  function activeDocLabel() {
    const p = paneEl();
    const t = p && p.querySelector('.ws-doc-tab.active');
    return t ? t.textContent.replace(/\s+/g, ' ').trim() : 'doc';
  }

  /* ---------- 1) เก็บข้อความที่แก้ทั้งเอกสาร (mergeBound) ---------- */
  const EDIT_KEY = () => `ecmis.livedoc.edit::${location.pathname.split('/').pop()}${location.search}::${activeDocLabel()}`;
  const MARK_HTML = '<i data-ld-merged hidden></i>';
  let lastCanonical = '';
  function readEdit() { try { return sessionStorage.getItem(EDIT_KEY()); } catch (_) { return null; } }
  function writeEdit(html) { try { html == null ? sessionStorage.removeItem(EDIT_KEY()) : sessionStorage.setItem(EDIT_KEY(), html); } catch (_) { /* ignore */ } }
  const stripMark = html => String(html || '').replace(/<i data-ld-merged(="")? hidden(="")?><\/i>/g, '');
  /* นำข้อความที่แก้ทั้งเอกสารมาใช้ แล้วเติมค่าล่าสุดจากฟอร์มลงจุดที่ผูกไว้ (data-bind) ตามลำดับที่พบ */
  function mergeBound(savedHtml, canonicalHtml) {
    const cur = doc.createElement('template'); cur.innerHTML = canonicalHtml;
    const values = {};
    cur.content.querySelectorAll('[data-bind]').forEach(n => { (values[n.dataset.bind] = values[n.dataset.bind] || []).push(n.textContent); });
    const out = doc.createElement('template'); out.innerHTML = stripMark(savedHtml);
    const seen = {};
    out.content.querySelectorAll('[data-bind]').forEach(n => {
      const list = values[n.dataset.bind];
      if (!list || !list.length) return;
      const i = seen[n.dataset.bind] = (seen[n.dataset.bind] || 0);
      seen[n.dataset.bind] = i + 1;
      n.textContent = list[Math.min(i, list.length - 1)];
    });
    return out.innerHTML;
  }
  function inEditMode(stage) { return Boolean(stage && stage.querySelector('[contenteditable="true"].doc-paper, [contenteditable="true"].a4-paper, [contenteditable="true"].a4-page')); }
  function applySavedEdit() {
    const stage = stageEl();
    if (!stage || inEditMode(stage) || stage.querySelector(':scope > [data-ld-merged]')) return;
    lastCanonical = stage.innerHTML;
    const saved = readEdit();
    if (!saved) return;
    stage.innerHTML = mergeBound(saved, lastCanonical) + MARK_HTML;
    try { root.ECMIS && root.ECMIS.updateDocPaginationUI && root.ECMIS.updateDocPaginationUI(stage.id); } catch (_) { /* ignore */ }
    schedule();
  }
  function resetSavedEdit() {
    const stage = stageEl();
    writeEdit(null);
    if (stage && lastCanonical) stage.innerHTML = lastCanonical;
    try { root.ECMIS && root.ECMIS.updateDocPaginationUI && stage && root.ECMIS.updateDocPaginationUI(stage.id); } catch (_) { /* ignore */ }
    toastOk('คืนเอกสารตามแบบฟอร์มแล้ว', 'ข้อความที่แก้ทั้งเอกสารถูกล้าง');
    schedule();
  }
  function watchStage() {
    const stage = stageEl();
    if (!stage || stage.dataset.ldWatch) return;
    stage.dataset.ldWatch = '1';
    new MutationObserver(() => setTimeout(applySavedEdit, 0)).observe(stage, { childList: true });
    applySavedEdit();
  }

  /* ---------- 4) ป้ายบันทึกแล้ว/ยังไม่บันทึก ในแถบแก้ไขเอกสาร ---------- */
  function setSaveChip(state) {
    const bar = doc.querySelector('.doc-edit-bar');
    if (!bar) return;
    let chip = bar.querySelector('.ld-save-chip');
    if (!chip) {
      chip = doc.createElement('span');
      chip.className = 'ld-save-chip';
      chip.setAttribute('role', 'status');
      const cancel = bar.querySelector('#btnCancelDocEdit, .btn-doc-edit-cancel');
      if (cancel) bar.insertBefore(chip, cancel); else bar.appendChild(chip);
    }
    const txt = { clean: 'ยังไม่มีการแก้ไข', dirty: 'ยังไม่บันทึก', saved: 'บันทึกแล้ว' }[state] || '';
    chip.dataset.state = state;
    chip.innerHTML = `<i class="fa-solid ${state === 'saved' ? 'fa-circle-check' : state === 'dirty' ? 'fa-pen' : 'fa-circle'}"></i>${txt}`;
  }
  function onEditBarClick(e) {
    if (e.target.closest('#btnDocEdit, #docEditBtn')) setTimeout(() => { if (inEditMode(stageEl())) setSaveChip('clean'); }, 0);
    if (e.target.closest('#btnSaveDocEdit')) {
      setTimeout(() => {
        const stage = stageEl();
        if (!stage) return;
        writeEdit(stripMark(stage.innerHTML));
        if (!stage.querySelector(':scope > [data-ld-merged]')) stage.insertAdjacentHTML('beforeend', MARK_HTML);
        setSaveChip('saved');
        schedule();
      }, 0);
    }
  }
  function onStageEditInput(e) {
    const stage = stageEl();
    if (stage && stage.contains(e.target) && inEditMode(stage) && !e.target.closest('.ld-bind')) setSaveChip('dirty');
  }

  /* ---------- 2) ความครบของฟอร์ม ---------- */
  const SKIP_TYPES = new Set(['hidden', 'button', 'submit', 'reset', 'file', 'image', 'search', 'range', 'color']);
  function controlsOf(card) {
    return [...card.querySelectorAll('input, textarea, select')].filter(c => !inPane(c) && !SKIP_TYPES.has(c.type) && !hiddenByClass(c)
      && !c.closest('.swal2-container, .modal, [data-ld-ignore]'));
  }
  const editableCtl = c => !c.disabled && !c.readOnly;
  function filled(c) {
    if (c.type === 'radio') return Boolean(c.name && doc.querySelector(`input[type="radio"][name="${q(c.name)}"]:checked`));
    if (c.type === 'checkbox') return c.checked;
    return String(c.value || '').trim() !== '';
  }
  function requiredOf(card) {
    const set = new Set();
    card.querySelectorAll('[required]').forEach(c => set.add(c));
    card.querySelectorAll('label.field-req, .form-label.field-req').forEach(l => {
      let c = l.htmlFor ? doc.getElementById(l.htmlFor) : null;
      if (!c) c = l.parentElement && l.parentElement.querySelector('input, textarea, select');
      if (!c) { let s = l.nextElementSibling; while (s && !c) { c = s.matches('input, textarea, select') ? s : s.querySelector('input, textarea, select'); s = s.nextElementSibling; } }
      if (c && card.contains(c)) set.add(c);
    });
    return [...set].filter(c => !SKIP_TYPES.has(c.type) && !hiddenByClass(c));
  }
  function cardState(card) {
    const ctls = controlsOf(card);
    if (!ctls.length) return { state: 'system' };
    const ed = ctls.filter(editableCtl);
    if (!ed.length) return { state: 'readonly' };
    const req = requiredOf(card).filter(editableCtl);
    const pool = req.length ? req : ed.filter(c => c.type !== 'checkbox' && c.type !== 'radio');
    if (!pool.length) return { state: 'optional', total: 0, done: 0 };
    const done = pool.filter(filled).length;
    const state = done === pool.length ? 'complete' : done ? 'partial' : (req.length ? 'empty' : 'optional');
    return { state, total: pool.length, done, req: req.length, missing: (req.length ? req : []).filter(c => !filled(c)) };
  }
  const BADGE = {
    complete: '✓ ครบ', partial: '◐ กรอกบางส่วน', empty: '○ ยังไม่ครบ',
    optional: 'ไม่บังคับ', system: 'ข้อมูลจากระบบ', readonly: 'ดูอย่างเดียว'
  };
  function formCards() {
    const col = formColEl();
    if (!col) return [];
    return [...col.querySelectorAll('.ws-card')].filter(card => card.querySelector(':scope > .card-header') && !hiddenByClass(card));
  }
  let ccTimer = 0;
  function scheduleCompleteness() { clearTimeout(ccTimer); ccTimer = setTimeout(updateCompleteness, 60); }
  function updateCompleteness() {
    const cards = formCards();
    let editableCards = 0, complete = 0, needed = 0;
    cards.forEach(card => {
      const st = cardState(card);
      const header = card.querySelector(':scope > .card-header');
      let badge = header.querySelector(':scope > .ld-badge');
      if (!badge) {
        badge = doc.createElement('span');
        badge.className = 'ld-badge';
        badge.setAttribute('aria-hidden', 'true');   // ข้อความมาจาก CSS attr() — ไม่เปลี่ยน textContent ของหัวการ์ด (ใช้เป็น key ย่อการ์ด)
        header.appendChild(badge);
      }
      badge.dataset.state = st.state;
      badge.dataset.label = BADGE[st.state] + (st.total && st.state === 'partial' ? ` ${st.done}/${st.total}` : '');
      header.title = st.state === 'empty' || st.state === 'partial' ? `ช่องบังคับที่ยังว่าง: ${(st.missing || []).map(labelOf).join(', ')}` : header.title;
      if (!['system', 'readonly'].includes(st.state)) editableCards++;
      if (st.req) { needed++; if (st.state === 'complete') complete++; }
    });
    mountFormTools(editableCards, complete, needed);
  }

  function mountFormTools(editableCards, complete, needed) {
    const col = formColEl();
    if (!col) return;
    let bar = col.querySelector(':scope > .ld-form-tools');
    if (!editableCards) { if (bar) bar.remove(); return; }
    if (!bar) {
      bar = doc.createElement('div');
      bar.className = 'ld-form-tools no-print';
      bar.innerHTML = `<span class="ld-ft-msg" role="status"></span>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-ld-act="validate"><i class="fa-solid fa-list-check me-1"></i>ตรวจสอบความครบ</button>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-ld-act="sample"><i class="fa-solid fa-wand-magic-sparkles me-1"></i>เติมข้อมูลตัวอย่างเฉพาะช่องว่าง</button>`;
      col.insertBefore(bar, col.firstElementChild);
      bar.addEventListener('click', e => {
        const b = e.target.closest('[data-ld-act]');
        if (!b) return;
        if (b.dataset.ldAct === 'validate') validateForm();
        if (b.dataset.ldAct === 'sample') fillSample();
      });
    }
    const msg = needed
      ? `<i class="fa-solid fa-clipboard-check"></i>ส่วนที่มีช่องบังคับ กรอกครบ <b>${complete}/${needed}</b> ส่วน`
      : '<i class="fa-solid fa-clipboard-check"></i>ฟอร์มนี้ไม่มีช่องบังคับ';
    const m = bar.querySelector('.ld-ft-msg');
    if (m.dataset.k !== msg) { m.dataset.k = msg; m.innerHTML = msg; }
    bar.dataset.state = needed && complete === needed ? 'complete' : 'pending';
  }

  function validateForm() {
    const rows = formCards().map(card => ({ card, st: cardState(card) })).filter(x => x.st.state === 'empty' || x.st.state === 'partial');
    if (!rows.length) { toastOk('ฟอร์มครบทุกช่องบังคับแล้ว', 'ส่งต่อหรือบันทึกได้'); return; }
    rows.forEach(({ st }) => (st.missing || []).forEach(c => c.classList.add('is-invalid-ecmis')));
    const first = rows[0];
    first.card.classList.remove('card-collapsed');
    const target = (first.st.missing || [])[0];
    const names = rows.map(({ card }) => card.querySelector(':scope > .card-header').textContent.replace(/\s+/g, ' ').trim()).slice(0, 3).join(', ');
    toastWarn(`ยังไม่ครบ ${rows.length} ส่วน`, names);
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      try { target.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
      flash(fieldBox(target));
    } else {
      first.card.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  function sampleFor(c) {
    const lab = labelOf(c);
    const now = new Date(); const pad = n => String(n).padStart(2, '0');
    switch (c.type) {
      case 'date': return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      case 'time': return '09:30';
      case 'datetime-local': return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T09:30`;
      case 'number': return c.min && Number(c.min) > 0 ? c.min : '1';
      case 'tel': return '0 2141 1234';
      case 'email': return 'example@pacc.go.th';
      case 'url': return 'https://www.pacc.go.th';
      default: break;
    }
    if (c.tagName === 'SELECT') { const o = [...c.options].find(x => x.value !== '' && !x.disabled); return o ? o.value : ''; }
    if (c.tagName === 'TEXTAREA') return `(ข้อความตัวอย่าง) ${lab}`;
    return `(ตัวอย่าง) ${lab}`.slice(0, Math.max(10, Number(c.maxLength) > 0 ? Number(c.maxLength) : 60));
  }
  function fillSample() {
    const col = formColEl();
    if (!col) return;
    let n = 0;
    formCards().forEach(card => controlsOf(card).forEach(c => {
      if (!editableCtl(c) || c.type === 'checkbox' || c.type === 'radio' || filled(c)) return;
      const v = sampleFor(c);
      if (!v) return;
      c.value = v;
      c.dispatchEvent(new Event('input', { bubbles: true }));
      c.dispatchEvent(new Event('change', { bubbles: true }));
      c.classList.remove('is-invalid-ecmis');
      n++;
    }));
    if (n) toastOk(`เติมข้อมูลตัวอย่าง ${n} ช่อง`, 'ยังไม่บันทึก — ตรวจข้อความแล้วกดบันทึกร่างเพื่อเก็บ');
    else toastOk('ไม่มีช่องว่างให้เติม', 'ทุกช่องที่แก้ได้มีข้อมูลแล้ว');
    scheduleCompleteness();
  }

  /* ---------- 3) เมนูกระโดด "ดูเอกสารทั้งหมด" ---------- */
  function mountDocJump() {
    const p = paneEl();
    if (!p) return;
    const tabs = [...p.querySelectorAll('.ws-doc-tab')].filter(t => !hiddenByClass(t));
    let sel = p.querySelector('.ld-doc-jump');
    if (tabs.length < 4) { if (sel) sel.remove(); return; }
    if (!sel) {
      sel = doc.createElement('select');
      sel.className = 'form-select form-select-sm ld-doc-jump no-print';
      sel.setAttribute('aria-label', 'ดูเอกสารทั้งหมด');
      const host = p.querySelector('.ws-doc-tabs');
      if (host && host.parentElement) host.parentElement.insertBefore(sel, host.nextSibling); else p.insertBefore(sel, p.firstChild);
      sel.addEventListener('change', () => { const t = tabs[Number(sel.value)]; if (t) { t.click(); t.scrollIntoView({ block: 'nearest', inline: 'center' }); } });
    }
    const html = `<option value="" disabled>ดูเอกสารทั้งหมด (${tabs.length})</option>` + tabs.map((t, i) => `<option value="${i}">${t.textContent.replace(/\s+/g, ' ').trim()}</option>`).join('');
    if (sel.dataset.k !== html) { sel.dataset.k = html; sel.innerHTML = html; }
    const ai = tabs.findIndex(t => t.classList.contains('active'));
    sel.value = ai >= 0 ? String(ai) : '';
  }

  /* ต่อเติมแถบสถานะ: บอกว่ากำลังใช้ข้อความที่แก้ทั้งเอกสาร + ปุ่มคืนเอกสารตามแบบ */
  function updateEditNotice() {
    const p = paneEl();
    const bar = p && p.querySelector(':scope > .ld-sync-bar');
    if (!bar) return;
    const on = Boolean(readEdit());
    let note = bar.querySelector('.ld-edit-note');
    if (!on) { if (note) note.remove(); return; }
    if (!note) {
      note = doc.createElement('span');
      note.className = 'ld-edit-note';
      note.innerHTML = '<i class="fa-solid fa-file-pen"></i>ใช้ข้อความที่แก้ทั้งเอกสาร (ค่าจากฟอร์มยังอัปเดต) <button type="button" class="ld-reset-edit">คืนเอกสารตามแบบ</button>';
      note.querySelector('button').addEventListener('click', resetSavedEdit);
    }
    if (note.parentNode !== bar) bar.appendChild(note);   // ย้ายเฉพาะตอนยังไม่อยู่ในแถบ — กัน MutationObserver วนไม่จบ
  }

  function enhance() {
    watchStage();
    mountDocJump();
    updateCompleteness();
    updateEditNotice();
  }

  /* ---------- เริ่มทำงาน ---------- */
  let started = false;
  function init() {
    const p = paneEl();
    if (!p) {
      // บางหน้าสร้างแผงเอกสารด้วย JS ภายหลัง — รอจนเจอแล้วค่อยเริ่ม
      if (!init.waiting) {
        init.waiting = true;
        const w = new MutationObserver(() => { if (doc.querySelector('.ws-doc-pane')) { w.disconnect(); init.waiting = false; init(); } });
        w.observe(doc.documentElement, { childList: true, subtree: true });
      }
      return;
    }
    if (started) return;
    started = true;
    mountSplit();
    decorate();
    const obs = new MutationObserver(muts => {
      if (muts.some(m => m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length))) schedule();
    });
    obs.observe(p, { childList: true, subtree: true });
    // กล่องฟอร์มซ้ายเปิด/ปิดตามบทบาท (d-none) ทำให้ช่องแก้ได้เปลี่ยน
    const formCol = p.previousElementSibling && p.previousElementSibling.classList.contains('ld-divider')
      ? p.previousElementSibling.previousElementSibling : p.previousElementSibling;
    if (formCol) new MutationObserver(() => schedule()).observe(formCol, { attributes: true, subtree: true, attributeFilter: ['class', 'disabled', 'readonly', 'style'] });
    doc.addEventListener('input', e => { if (inPane(e.target)) { onDocInput(e); onStageEditInput(e); } else onFormInput(e); scheduleCompleteness(); });
    doc.addEventListener('change', e => { if (!inPane(e.target)) onFormInput(e); scheduleCompleteness(); });
    doc.addEventListener('click', onEditBarClick, true);
    doc.addEventListener('click', e => { if (e.target.closest && e.target.closest('.ws-doc-tab')) setTimeout(() => { mountDocJump(); updateEditNotice(); }, 0); });
    doc.addEventListener('focusout', e => { if (inPane(e.target)) onDocFocusOut(e); else onFormFocusOut(e); });
    doc.addEventListener('focusin', e => { if (!inPane(e.target)) onFormFocusIn(e); });
    doc.addEventListener('keydown', e => { if (inPane(e.target)) onDocKeydown(e); });
    doc.addEventListener('paste', e => { if (inPane(e.target)) onDocPaste(e); });
    doc.addEventListener('click', e => { if (inPane(e.target)) onDocClick(e); });
  }

  root.ECMISLiveDoc = { init, decorate, controlFor, bindNodes, mergeBound, cardState, validateForm, fillSample, resetSavedEdit, updateCompleteness };
  const start = () => { init(); setTimeout(schedule, 400); };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
  // เอกสารบางหน้าวาดหลังโหลดข้อมูล Supabase เสร็จ — ลองผูกซ้ำเมื่อโหลดเต็มหน้า
  root.addEventListener('load', () => { schedule(); setTimeout(schedule, 800); setTimeout(schedule, 2500); });
})(typeof window !== 'undefined' ? window : globalThis);
