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
    doc.addEventListener('input', e => { if (inPane(e.target)) onDocInput(e); else onFormInput(e); });
    doc.addEventListener('change', e => { if (!inPane(e.target)) onFormInput(e); });
    doc.addEventListener('focusout', e => { if (inPane(e.target)) onDocFocusOut(e); else onFormFocusOut(e); });
    doc.addEventListener('focusin', e => { if (!inPane(e.target)) onFormFocusIn(e); });
    doc.addEventListener('keydown', e => { if (inPane(e.target)) onDocKeydown(e); });
    doc.addEventListener('paste', e => { if (inPane(e.target)) onDocPaste(e); });
    doc.addEventListener('click', e => { if (inPane(e.target)) onDocClick(e); });
  }

  root.ECMISLiveDoc = { init, decorate, controlFor, bindNodes };
  const start = () => { init(); setTimeout(schedule, 400); };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
  // เอกสารบางหน้าวาดหลังโหลดข้อมูล Supabase เสร็จ — ลองผูกซ้ำเมื่อโหลดเต็มหน้า
  root.addEventListener('load', () => { schedule(); setTimeout(schedule, 800); setTimeout(schedule, 2500); });
})(typeof window !== 'undefined' ? window : globalThis);
