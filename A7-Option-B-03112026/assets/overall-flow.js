/* overall-flow.html — คลิกกล่องในผังแล้วเปิดหน้าจริงด้วยเคสตัวอย่าง (assets/flow-samples.json)
   เคสตัวอย่างสร้างโดย scripts/seed-flow-samples.mjs (เลข 9801–9850/2569)
   - ล็อกอินเป็น role ของกล่องนั้นอัตโนมัติ (sessionStorage แบบเดียวกับ login.html quickLogin)
   - ตรวจสถานะจริงใน Supabase เทียบค่าตั้งต้น ถ้าเพี้ยน (มีคนกดดำเนินการไปแล้ว) ขึ้นเตือน + ปุ่มรีเซ็ต */
(function () {
  'use strict';

  var ROLE_LOGIN = {
    deputy: 'Prasert.T', secgen: 'Apichat.S', support_sub: 'Jiraporn.N', subcommittee: 'Sumet.N',
    chairman: 'Wichai.Y', board_sec: 'Thanakrit.B', board: 'Somboon.T', affairs: 'Siriporn.K',
    case_admin: 'Kannika.W', dir_case: 'Bunlue.S'
  };
  var ROLE_NAME = {
    deputy: 'รองเลขาฯ', secgen: 'เลขาธิการฯ', support_sub: 'คณะอนุสนับสนุนฯ', subcommittee: 'คณะอนุกลั่นกรองฯ',
    chairman: 'ประธานฯ', board_sec: 'ฝ่ายเลขาฯ บอร์ด', affairs: 'กลุ่มงานกิจการฯ', dir_case: 'ผอ.กบค.',
    case_admin: 'กองบริหารคดี'
  };

  /* กล่องที่ไม่มีเคสของตัวเอง (ทางแยก / กล่องซ้ำ) → ใช้เคสของกล่องที่เกี่ยวข้อง */
  var ALIAS = {
    f71: { RET2: 'f71.RET', Q1: 'f71.SG', Q2: 'f71.SG', Q3: 'f71.CH', Q4: 'f71.SCR', Q5: 'f71.MT' },
    a71: { RS: 'f71.RS', L: 'f71.RS', R1: 'f71.RS', R3: 'a71.RS3', OR: 'a71.OC', OQ: 'a71.OC', AG: 'f71.AG' },
    f72: { ST: 'f72.S0', RT2: 'f72.RT', Q1: 'f72.SG', Q2: 'f72.SG', Q3: 'f72.SCR', Q4: 'f72.MT', Q5: 'f72.SR' }
  };

  var samples = {};
  var liveStatus = {};
  var sbConf = null;

  function sampleKey(flow, nodeId) {
    var alias = (ALIAS[flow] || {})[nodeId];
    if (alias) return alias;
    var own = flow + '.' + nodeId;
    return samples[own] ? own : null;
  }

  function openSample(key) {
    var s = samples[key];
    if (!s) return;
    try {
      sessionStorage.setItem('ecmis_role', s.role);
      sessionStorage.setItem('ecmis_username', ROLE_LOGIN[s.role] || s.role);
      sessionStorage.setItem('ecmis_authed', '1');
      if (s.subTeam) sessionStorage.setItem('ecmis_subcommittee_team', s.subTeam);
    } catch (e) {
      window.alert('เบราว์เซอร์ไม่อนุญาตให้บันทึกการเข้าสู่ระบบ — เปิดหน้า login แล้วเลือกบทบาทเอง');
    }
    location.href = s.page + '?case=' + encodeURIComponent(s.caseNo);
  }

  function nodeIdOf(g) {
    var m = /^flowchart-(.+)-\d+$/.exec(g.id || '');
    return m ? m[1] : null;
  }

  function wireDiagram(box) {
    var flow = box.getAttribute('data-flow');
    box.querySelectorAll('g.node').forEach(function (g) {
      var key = sampleKey(flow, nodeIdOf(g));
      if (!key) return;
      var s = samples[key];
      var tip = 'เปิด ' + s.page + ' · เคส ' + s.caseNo + ' · ในบทบาท ' + (ROLE_NAME[s.role] || s.role);
      var title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = tip;
      g.insertBefore(title, g.firstChild);
      g.classList.add('sample-node');
      g.setAttribute('data-sample', key);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'link');
      g.setAttribute('aria-label', tip);
      g.addEventListener('click', function () { openSample(key); });
      g.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openSample(key); }
      });
    });
  }

  function isDrifted(key) {
    var live = liveStatus[samples[key].trrId];
    return live !== undefined && live !== samples[key].status;
  }

  function markDrift() {
    document.querySelectorAll('g.sample-node').forEach(function (g) {
      g.classList.toggle('sample-drift', isDrifted(g.getAttribute('data-sample')));
    });
  }

  /* ---------- Supabase (REST) — ใช้ค่าเดียวกับ assets/ecmis-app.js ---------- */
  function loadSupabaseConf() {
    return fetch('assets/ecmis-app.js', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (js) {
        var url = (js.match(/DEFAULT_SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1];
        var key = (js.match(/DEFAULT_SUPABASE_KEY\s*=\s*'([^']+)'/) || [])[1];
        if (!url || !key) throw new Error('ไม่พบค่า Supabase');
        sbConf = { url: url, key: key };
      });
  }
  function sbFetch(path, opt) {
    opt = opt || {};
    var headers = Object.assign({ apikey: sbConf.key, Authorization: 'Bearer ' + sbConf.key,
      'Content-Type': 'application/json' }, opt.headers || {});
    return fetch(sbConf.url + '/rest/v1/' + path, Object.assign({}, opt, { headers: headers }))
      .then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(t || ('HTTP ' + r.status)); });
        return r.status === 204 ? null : r.json();
      });
  }

  function refreshLive() {
    var ids = Object.keys(samples).map(function (k) { return samples[k].trrId; });
    return sbFetch('tbl_res_request?select=trr_id,trr_status&trr_id=in.(' + ids.join(',') + ')')
      .then(function (rows) {
        liveStatus = {};
        rows.forEach(function (r) { liveStatus[r.trr_id] = r.trr_status; });
        markDrift();
        renderTable();
      });
  }

  function resetSamples(keys) {
    return Promise.all(keys.map(function (k) {
      var s = samples[k];
      return sbFetch('tbl_res_request?trr_id=eq.' + s.trrId, { method: 'PATCH', body: JSON.stringify(s.request) });
    })).then(refreshLive);
  }

  function confirmReset(keys, label) {
    if (!window.confirm('รีเซ็ต' + label + ' กลับเป็นค่าตั้งต้น? (เขียนฐานข้อมูลจริง)')) return;
    resetSamples(keys).catch(function (e) { window.alert('รีเซ็ตไม่สำเร็จ: ' + e.message); });
  }

  /* ---------- ตารางเคสตัวอย่าง ---------- */
  function cell(tr, content) {
    var td = document.createElement('td');
    if (content instanceof Node) td.appendChild(content); else td.textContent = content;
    tr.appendChild(td);
  }
  function sampleRow(key) {
    var s = samples[key];
    var live = liveStatus[s.trrId];
    var tr = document.createElement('tr');
    if (isDrifted(key)) tr.className = 'row-drift';
    var link = document.createElement('a');
    link.href = s.page + '?case=' + encodeURIComponent(s.caseNo);
    link.textContent = s.caseNo;
    link.addEventListener('click', function (ev) { ev.preventDefault(); openSample(key); });
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mini-btn';
    btn.textContent = 'รีเซ็ต';
    btn.disabled = !isDrifted(key);
    btn.addEventListener('click', function () { confirmReset([key], 'เคส ' + s.caseNo); });
    cell(tr, key);
    cell(tr, link);
    cell(tr, ROLE_NAME[s.role] || s.role);
    cell(tr, s.page);
    cell(tr, s.status);
    cell(tr, live === undefined ? '…' : (isDrifted(key) ? live + ' ⚠ เพี้ยน' : live + ' ✓'));
    cell(tr, btn);
    return tr;
  }
  function renderTable() {
    var tbody = document.querySelector('#sampleTable tbody');
    if (!tbody) return;
    tbody.textContent = '';
    var keys = Object.keys(samples);
    keys.forEach(function (k) { tbody.appendChild(sampleRow(k)); });
    var drift = keys.filter(isDrifted).length;
    var sum = document.getElementById('sampleSummary');
    sum.textContent = drift
      ? 'มีเคสตัวอย่างสถานะเพี้ยน ' + drift + ' เคส (กรอบแดงประในผัง) — กดรีเซ็ตเพื่อคืนค่าตั้งต้น'
      : 'เคสตัวอย่างทุกเคสอยู่ในสถานะตั้งต้น';
    sum.className = drift ? 'sample-summary warn' : 'sample-summary';
  }

  function showError(e) {
    var sum = document.getElementById('sampleSummary');
    if (sum) { sum.textContent = 'โหลดข้อมูลเคสตัวอย่างไม่ได้: ' + e.message; sum.className = 'sample-summary warn'; }
  }

  function whenDiagramsReady(cb) {
    var boxes = document.querySelectorAll('.diagram[data-flow]');
    var tries = 0;
    (function check() {
      var ready = Array.prototype.every.call(boxes, function (b) { return b.querySelector('svg'); });
      if (ready || tries++ > 100) { cb(boxes); return; }
      setTimeout(check, 100);
    })();
  }

  function bindButtons() {
    document.getElementById('resetAll').addEventListener('click', function () {
      var drifted = Object.keys(samples).filter(isDrifted);
      if (!drifted.length) { window.alert('ไม่มีเคสที่ต้องรีเซ็ต'); return; }
      confirmReset(drifted, 'เคสที่เพี้ยนทั้งหมด ' + drifted.length + ' เคส');
    });
    document.getElementById('refreshLive').addEventListener('click', function () {
      refreshLive().catch(showError);
    });
  }

  fetch('assets/flow-samples.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) {
      samples = data.samples || {};
      whenDiagramsReady(function (boxes) { boxes.forEach(wireDiagram); markDrift(); });
      renderTable();
      bindButtons();
      return loadSupabaseConf().then(refreshLive);
    })
    .catch(showError);
})();
