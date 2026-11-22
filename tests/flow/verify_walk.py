"""ตรวจขั้นตอนการกดใน walk_data.py กับต้นแบบจริง + ถ่ายภาพหน้าจอพร้อมกรอบแดงที่ปุ่มที่ต้องกด
อ่านอย่างเดียว: บล็อกคำขอเขียน Supabase ทุกคำขอ (POST/PATCH/PUT/DELETE) — ไม่กดปุ่มที่เปลี่ยนข้อมูล"""
import json, sys, re
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).parent))
from walk_data import S

BASE = sys.argv[1]; OUT = Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
blocked = []


def guard(route, req):
    if 'supabase' in req.url and req.method in ('POST', 'PATCH', 'PUT', 'DELETE'):
        blocked.append(req.method)
        return route.fulfill(status=200, content_type='application/json', body='[]')
    return route.continue_()


def wait(pg, ms=3500):
    try: pg.wait_for_load_state('networkidle', timeout=8000)
    except Exception: pass
    pg.wait_for_timeout(ms)


CHECK = """(exp) => {
  const vis = document.body.innerText, all = document.body.textContent;
  return exp.map(e => vis.includes(e) ? 'visible' : all.includes(e) ? 'hidden' : 'missing');
}"""
MARK = """(label) => {
  const norm = s => (s || '').replace(/\\s+/g, ' ').trim();
  const vis = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  const cands = [...document.querySelectorAll('.action-bar button, main button, main a, .action-bar a, label')].filter(vis);
  let el = cands.find(e => norm(e.innerText) === label) || cands.find(e => norm(e.innerText).startsWith(label)) || cands.find(e => norm(e.innerText).includes(label));
  if (!el) return null;
  el.scrollIntoView({ block: 'center' });
  el.style.outline = '4px solid #E11D48'; el.style.outlineOffset = '3px'; el.style.boxShadow = '0 0 0 9px rgba(225,29,72,.25)';
  return norm(el.innerText).slice(0, 60);
}"""


def click_label(txt):
    t = re.split(r' → | \(|/ ', txt)[0].strip()
    return t


res = []
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True)
    ctxs = {}
    def page_for(base, role):
        key = (base, role)
        if key not in ctxs:
            ctx = b.new_context(viewport={'width': 1440, 'height': 900}, locale='th-TH'); ctx.route('**/*', guard)
            pg = ctx.new_page()
            pg.goto(f'{base}/login.html', wait_until='domcontentloaded'); pg.wait_for_timeout(300)
            pg.evaluate("r=>{const ro=ECMIS.getRole(r);sessionStorage.setItem('ecmis_role',r);sessionStorage.setItem('ecmis_username',ro.login||r);sessionStorage.setItem('ecmis_authed','1');}", role)
            ctxs[key] = (ctx, pg)
        return ctxs[key][1]

    meeting_docs = None
    for i, s in enumerate(S, 1):
        r = {'no': i, 'flow': s['flow'], 'role': s['role'], 'url': s['url']}
        if '<' in s['url']:
            r.update(result='ตรวจจากโค้ด', detail=s['note']); res.append(r); continue
        pg = page_for(BASE, s['role'])
        url = s['url']
        if url == '@meeting-docs':
            if not meeting_docs:
                pg.goto(f'{BASE}/agenda-registry.html', wait_until='domcontentloaded'); wait(pg, 3000)
                meeting_docs = pg.evaluate("() => { const a = [...document.querySelectorAll('a[href*=\"meeting-docs.html?meet=\"]')][0]; return a ? a.getAttribute('href') : null; }")
            url = meeting_docs or 'meeting-docs.html'
        pg.goto(f'{BASE}/{url}', wait_until='domcontentloaded'); wait(pg)
        r['url_opened'] = pg.url.replace(BASE + '/', '')
        if 'login.html' in pg.url or (url.split('?')[0] not in pg.url):
            r['redirected'] = True
        found = pg.evaluate(CHECK, s['expect']) if s['expect'] else []
        r['checks'] = dict(zip(s['expect'], found))
        r['h1'] = pg.evaluate("() => { const e = document.querySelector('.page-head h1') || document.querySelector('h1'); return e ? e.innerText.replace(/\\s+/g,' ').trim() : ''; }")
        r['noperm'] = pg.evaluate("() => { const e = document.querySelector('.action-bar .no-permission'); return e ? e.innerText.replace(/\\s+/g,' ').trim().slice(0,140) : ''; }")
        marked = pg.evaluate(MARK, click_label(s['click']))
        if not marked and s['expect']:
            marked = pg.evaluate(MARK, s['expect'][-1])
        r['marked'] = marked
        shot = OUT / f'step_{i:03d}.jpg'
        pg.screenshot(path=str(shot), type='jpeg', quality=70)
        r['shot'] = shot.name
        miss = [k for k, v in r['checks'].items() if v == 'missing']
        r['result'] = 'ผ่าน' if not miss and not r.get('redirected') else ('ไม่ผ่าน' if miss else 'ถูกพาไปหน้าอื่น')
        r['detail'] = ('ไม่พบ: ' + ', '.join(miss)) if miss else ''
        res.append(r)
        print(i, s['flow'], s['role'], r['result'], r['detail'][:80], flush=True)

    # ผู้ลงนามคำสั่ง ม.24 ของเรื่องตัวอย่าง
    signer = {}
    for case in ['9819/2569', '9820/2569']:
        for role in ['chairman', 'secgen']:
            pg = page_for(BASE, role)
            pg.goto(f"{BASE}/order.html?case={case.replace('/', '%2F')}", wait_until='domcontentloaded'); wait(pg)
            signer[f'{case}|{role}'] = pg.evaluate("""() => ({ acts: [...document.querySelectorAll('.action-bar [data-act]')].map(b => b.innerText.trim()),
                signerName: (document.getElementById('signerName')||{}).innerText || '', hint: ((document.getElementById('sigHint')||{}).innerText || '').slice(0,90),
                noperm: ((document.querySelector('.action-bar .no-permission')||{}).innerText || '').replace(/\\s+/g,' ').slice(0,120) })""")

    # Option A / B: เมนูและเอกสารเฉพาะ Option B
    opt = {}
    for folder in ['A7-Option-A-03112026', 'A7-Option-B-03112026']:
        base = f'{BASE}/{folder}'
        pg = page_for(base, 'board_sec')
        pg.goto(f'{base}/meeting-report.html', wait_until='domcontentloaded'); wait(pg)
        has54 = pg.evaluate("() => document.body.textContent.includes('หนังสือคัดแยกผลมติ')")
        pg2 = page_for(base, 'affairs')
        pg2.goto(f'{base}/inbox.html', wait_until='domcontentloaded'); wait(pg2, 2500)
        menu64 = pg2.eval_on_selector_all('a[href="additional-inquiry.html"]', 'e => e.length')
        opt[folder] = {'opt': pg2.evaluate('window.ECMIS_A7_OPTION'), 'meeting_report_5_4': has54, 'menu_6_4': menu64}
    for ctx, _ in ctxs.values(): ctx.close()
    b.close()

out = {'steps': res, 'signer': signer, 'option': opt, 'blocked_writes': len(blocked)}
(OUT / 'verify.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
print('done', len(res), 'blocked', len(blocked))
print(json.dumps({'signer': signer, 'option': opt}, ensure_ascii=False, indent=1))
