"""ทดสอบ flow-to-page.html — บล็อกการเขียน Supabase"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = sys.argv[1]; OUT = Path(sys.argv[2]); OUT.mkdir(exist_ok=True)
blocked = []
def guard(route, req):
    if 'supabase' in req.url and req.method in ('POST', 'PATCH', 'PUT', 'DELETE'):
        blocked.append(req.method); return route.fulfill(status=200, content_type='application/json', body='[]')
    return route.continue_()
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True)
    ctx = b.new_context(viewport={'width': 1500, 'height': 950}, locale='th-TH'); ctx.route('**/*', guard)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.on('console', lambda m: errs.append('console: ' + m.text[:200]) if m.type == 'error' and '404' not in m.text else None)
    pg.goto(f'{BASE}/flow-to-page.html'); pg.wait_for_timeout(3500)
    res['overview'] = pg.evaluate("() => ({ nodes: document.querySelectorAll('#ovStage g.node').length, cards: document.querySelectorAll('.a7f-proc').length, tabs: document.querySelectorAll('#procTabs button').length, role: document.querySelector('.a7-rs-cur')?.innerText })")
    pg.screenshot(path=str(OUT / 'ftp_overview.png'), full_page=True)
    pg.click('#ovStage g.node[data-nid="P1"]'); pg.wait_for_timeout(2500)
    res['p1'] = pg.evaluate("() => ({ hash: location.hash, nodes: document.querySelectorAll('#stage g.node').length, chips: [...document.querySelectorAll('#pageChips button')].map(b=>b.textContent) })")
    pg.goto(f'{BASE}/flow-to-page.html#P1/1-2/p2_t4'); pg.wait_for_timeout(2500)
    res['node'] = pg.evaluate("() => ({ panel: document.getElementById('panelBody').innerText.slice(0, 600), sel: !!document.querySelector('#stage g.node.is-sel'), next: document.querySelectorAll('#stage g.node.is-next').length, btns: [...document.querySelectorAll('#panelBody .a7f-actions a, #panelBody .a7f-actions button')].map(x=>x.innerText.trim()) })")
    pg.screenshot(path=str(OUT / 'ftp_node.png'))
    pg.select_option('#roleFilter', 'chairman'); pg.wait_for_timeout(500)
    pg.goto(f'{BASE}/flow-to-page.html#P6/6-1'); pg.wait_for_timeout(2500)
    pg.select_option('#roleFilter', 'affairs'); pg.wait_for_timeout(700)
    res['role'] = pg.evaluate("() => ({ dim: document.querySelectorAll('#stage g.is-dim').length, hit: document.querySelectorAll('#stage g.is-role').length, panel: document.getElementById('panelBody').innerText.slice(0, 200) })")
    pg.screenshot(path=str(OUT / 'ftp_role.png'))
    pg.fill('#q', 'คำสั่ง'); pg.wait_for_timeout(400)
    res['search'] = pg.evaluate("() => document.querySelectorAll('#qRes button').length")
    pg.click('#qRes button'); pg.wait_for_timeout(2500)
    res['search_go'] = pg.evaluate('location.hash')
    # preview
    pg.goto(f'{BASE}/flow-to-page.html#P3/3-6/p13_t2'); pg.wait_for_timeout(2500)
    pg.click('#btnPreview'); pg.wait_for_timeout(6000)
    fr = pg.frame(name='a7guide-frame')
    res['preview'] = fr.evaluate("() => ({ url: location.pathname + location.search, h1: (document.querySelector('.page-head h1')||{}).innerText, role: sessionStorage.getItem('ecmis_role') })") if fr else None
    pg.screenshot(path=str(OUT / 'ftp_preview.png'))
    pg.goto(f'{BASE}/flow-to-page.html#report'); pg.wait_for_timeout(1500)
    res['report'] = pg.evaluate("() => ({ rows: document.querySelectorAll('#repTable tbody tr').length, screens: document.querySelectorAll('#scrTable tbody tr').length, sum: document.getElementById('repSummary').innerText.slice(0, 300) })")
    pg.screenshot(path=str(OUT / 'ftp_report.png'))
    # mobile
    pg.set_viewport_size({'width': 390, 'height': 860}); pg.goto(f'{BASE}/flow-to-page.html#P1/1-1'); pg.wait_for_timeout(2500)
    res['mobile_overflow'] = pg.evaluate('document.documentElement.scrollWidth - innerWidth')
    pg.screenshot(path=str(OUT / 'ftp_mobile.png'))
    res['errors'] = errs
    b.close()
res['blocked'] = len(blocked)
print(json.dumps(res, ensure_ascii=False, indent=1))
