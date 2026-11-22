"""ทดสอบฟีเจอร์ livedoc ใหม่ (ป้ายความครบ, แถบเครื่องมือฟอร์ม, เติมตัวอย่าง, ตรวจความครบ, เมนูกระโดด, mergeBound) — บล็อกการเขียน Supabase"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = sys.argv[1]; OUT = Path(sys.argv[2]); OUT.mkdir(exist_ok=True)
blocked = []
def guard(route, req):
    if 'supabase' in req.url and req.method in ('POST', 'PATCH', 'PUT', 'DELETE'):
        blocked.append(req.method); return route.fulfill(status=200, content_type='application/json', body='[]')
    return route.continue_()
def open_page(b, role, url):
    ctx = b.new_context(viewport={'width': 1440, 'height': 950}, locale='th-TH'); ctx.route('**/*', guard)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'{BASE}/login.html'); pg.wait_for_timeout(300)
    pg.evaluate("r=>{const ro=ECMIS.getRole(r);sessionStorage.setItem('ecmis_role',r);sessionStorage.setItem('ecmis_username',ro.login||r);sessionStorage.setItem('ecmis_authed','1');}", role)
    pg.goto(f'{BASE}/{url}')
    try: pg.wait_for_load_state('networkidle', timeout=8000)
    except Exception: pass
    pg.wait_for_timeout(3500)
    return ctx, pg, errs
STATE = """() => ({
  badges: [...document.querySelectorAll('.ld-badge')].map(b => b.dataset.label),
  tools: (document.querySelector('.ld-form-tools .ld-ft-msg') || {}).innerText || null,
  jump: document.querySelector('.ld-doc-jump') ? document.querySelector('.ld-doc-jump').options.length - 1 : 0,
  headerTexts: [...document.querySelectorAll('#docLeftCol .ws-card > .card-header, .ld-form-pane .ws-card > .card-header')].slice(0,3).map(h => h.textContent.trim().slice(0,40))
})"""
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True)
    for role, url, key in [('affairs', 'affairs-opinion.html?case=9308%2F2569', 'affairs_opinion'),
                           ('affairs', 'additional-inquiry.html?case=9422%2F2569', 'additional_inquiry'),
                           ('secgen', 'approval-review.html?case=9205%2F2569', 'approval_review'),
                           ('board_sec', 'meeting-docs.html?meet=94', 'meeting_docs'),
                           ('affairs', 'order.html?case=1189%2F2569', 'order'),
                           ('chairman', 'ruling-report.html?case=1402%2F2565', 'ruling_chair')]:
        ctx, pg, errs = open_page(b, role, url)
        r = {'before': pg.evaluate(STATE)}
        vis = True
        try: pg.locator('.ld-form-tools [data-ld-act="validate"]').wait_for(state='visible', timeout=12000)
        except Exception: vis = False
        r['tools_visible'] = vis
        if vis:
            pg.click('.ld-form-tools [data-ld-act="validate"]', timeout=8000); pg.wait_for_timeout(600)
            r['invalid_after_validate'] = pg.evaluate("() => document.querySelectorAll('.is-invalid-ecmis').length")
            pg.click('.ld-form-tools [data-ld-act="sample"]', timeout=8000); pg.wait_for_timeout(900)
            r['after_sample'] = pg.evaluate(STATE)
        pg.screenshot(path=str(OUT / f'ld_{key}.png'))
        if key == 'meeting_docs' and r['before']['jump']:
            pg.select_option('.ld-doc-jump', '2'); pg.wait_for_timeout(600)
            r['jump_active'] = pg.evaluate("() => (document.querySelector('.ws-doc-tab.active')||{}).innerText")
        r['errors'] = errs
        res[key] = r
        ctx.close()

    # mergeBound: แก้ทั้งเอกสาร → บันทึก → พิมพ์ในฟอร์ม (หน้าวาดเอกสารใหม่) → ข้อความที่แก้ยังอยู่ และค่าที่ผูกอัปเดต
    ctx, pg, errs = open_page(b, 'affairs', 'additional-inquiry.html?case=9423%2F2569')
    pg.click('#btnDocEdit'); pg.wait_for_timeout(300)
    chip1 = pg.evaluate("() => (document.querySelector('.ld-save-chip')||{}).innerText")
    pg.evaluate("""() => { const p = document.querySelector('#docPaper .doc-paper'); const d = document.createElement('div'); d.id='ldTestEdit'; d.textContent = 'ข้อความทดสอบที่แก้ทั้งเอกสาร'; p.appendChild(d); p.dispatchEvent(new Event('input', {bubbles:true})); }""")
    pg.wait_for_timeout(200)
    chip2 = pg.evaluate("() => (document.querySelector('.ld-save-chip')||{}).innerText")
    pg.click('#btnSaveDocEdit'); pg.wait_for_timeout(500)
    chip3 = pg.evaluate("() => (document.querySelector('.ld-save-chip')||{}).innerText")
    pg.fill('#aiIssues', 'ประเด็นใหม่หลังแก้เอกสาร'); pg.wait_for_timeout(900)
    merge = pg.evaluate("""() => ({ kept: !!document.getElementById('ldTestEdit'), bound: document.getElementById('docPaper').innerText.includes('ประเด็นใหม่หลังแก้เอกสาร'),
        note: (document.querySelector('.ld-edit-note')||{}).innerText || null })""")
    pg.screenshot(path=str(OUT / 'ld_merge.png'))
    pg.click('.ld-reset-edit'); pg.wait_for_timeout(700)
    after_reset = pg.evaluate("() => ({ kept: !!document.getElementById('ldTestEdit'), bound: document.getElementById('docPaper').innerText.includes('ประเด็นใหม่หลังแก้เอกสาร'), note: !!document.querySelector('.ld-edit-note') })")
    res['merge'] = {'chips': [chip1, chip2, chip3], 'after_form_input': merge, 'after_reset': after_reset, 'errors': errs}
    ctx.close(); b.close()
res['blocked'] = len(blocked)
print(json.dumps(res, ensure_ascii=False, indent=1))
