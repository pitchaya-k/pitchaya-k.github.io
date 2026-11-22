# -*- coding: utf-8 -*-
"""ทดสอบหน้าจอที่เพิ่มให้ Option B ครบตามผัง V1.0.14 (22/11/2569)
- dir-case-approve.html: ผอ.กบค. เห็นชอบคำสั่ง 6.1.4 / 6.2.1 และหนังสือลงโทษ 7.2.1
- แถบผลการพิจารณาบน order.html / ruling-report.html
- chairman-agenda.html: ประธานฯ มอบหมาย/สั่งการหน่วยงานแล้วสิ้นสุดเรื่อง (3-4) — ไม่มีเรื่อง 7.3 ค้างที่ประธานฯ
  ในฐานข้อมูล จึงแก้ข้อมูลที่อ่านได้ของเรื่อง 2014/2569 ในเบราว์เซอร์ให้เป็นเรื่องทั่วไป (tcc_doc_type = GENERAL)
การเขียนฐานข้อมูลทุกคำขอ (POST/PATCH/PUT/DELETE) ถูกดักไว้ ไม่ส่งออกจริง แล้วตรวจเนื้อหาที่จะเขียน
ใช้: python tests/flow/test_dircase.py http://localhost:8766[/A7-Option-B-03112026]"""
import sys, json
from playwright.sync_api import sync_playwright

BASE = sys.argv[1].rstrip('/')
out = {}
writes = []
errors = []


def route(r, q):
    if 'supabase' in q.url and q.method in ('POST', 'PATCH', 'PUT', 'DELETE'):
        writes.append({'method': q.method, 'url': q.url.split('?')[0].split('/')[-1], 'body': q.post_data or ''})
        return r.fulfill(status=200 if q.method != 'POST' else 201, content_type='application/json', body='[]')
    if 'supabase' in q.url and q.method == 'GET' and 'tbl_res_request' in q.url and '2014%2F2569' in q.url and FORCE73['on']:
        resp = r.fetch()
        data = resp.json()
        rows = data if isinstance(data, list) else [data]
        for row in rows:
            if row and row.get('tbl_cmp_case'):
                row['tbl_cmp_case']['tcc_doc_type'] = 'GENERAL'
        return r.fulfill(response=resp, body=json.dumps(data))
    return r.continue_()


FORCE73 = {'on': False}

with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True)
    ctx = b.new_context(viewport={'width': 1500, 'height': 950})
    ctx.route('**/*', route)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)[:200]))

    # 1) รายการ + เมนูของ ผอ.กบค.
    pg.goto(f'{BASE}/dir-case-approve.html?demo_role=dir_case'); pg.wait_for_timeout(3500)
    out['list'] = pg.evaluate("""() => ({
        role: sessionStorage.getItem('ecmis_role'),
        menu: [...document.querySelectorAll('#appSidebar a')].map(a => a.innerText.trim()).filter(t => /เห็นชอบเอกสาร/.test(t)),
        rows: [...document.querySelectorAll('#listBody tbody tr')].map(tr => tr.innerText.replace(/\\s+/g, ' ').slice(0, 60))
    })""")

    # 2) เห็นชอบแต่ละขั้น
    for case, stage in [('9819/2569', '6.1'), ('9820/2569', '6.2'), ('1355/2566', '7.2')]:
        n0 = len(writes)
        pg.goto(f'{BASE}/dir-case-approve.html?case={case.replace("/", "%2F")}&stage={stage}'); pg.wait_for_timeout(3500)
        info = pg.evaluate("""() => ({
            buttons: [...document.querySelectorAll('.action-bar [data-act]')].map(b => b.innerText.trim()),
            banner: (document.querySelector('#docInfo .a7dca-banner') || {}).innerText || '',
            paper: !!document.querySelector('#docPaper .doc-paper')
        })""")
        # ส่งกลับโดยไม่ใส่เหตุผลต้องถูกกัน
        pg.click('.action-bar [data-act="return"]'); pg.wait_for_timeout(400)
        info['returnWithoutNoteBlocked'] = len(writes) == n0 and pg.locator('.swal2-popup').count() == 0
        pg.fill('#dcaNote', 'เห็นชอบตามเสนอ (ทดสอบ)')
        pg.click('.action-bar [data-act="approve"]'); pg.wait_for_timeout(500)
        pg.click('.swal2-confirm'); pg.wait_for_timeout(1500)
        w = [x for x in writes[n0:] if x['url'] == 'tbl_res_request']
        body = json.loads(w[0]['body']) if w else {}
        rec = ((body.get('trr_resolution_data') or {}).get('dirCaseApproval') or {})
        ev = [x for x in writes[n0:] if x['url'] == 'tbl_res_request_event']
        evb = json.loads(ev[0]['body']) if ev else {}
        info['write'] = {'keys': list(body.keys()), 'record': rec, 'statusChanged': 'trr_status' in body,
                         'event': evb.get('trre_type'), 'eventFromEqTo': evb.get('trre_from_status') == evb.get('trre_to_status')}
        info['afterBanner'] = (pg.locator('#docInfo .a7dca-banner').inner_text() if pg.locator('#docInfo .a7dca-banner').count() else '')
        info['buttonsAfter'] = pg.evaluate("() => [...document.querySelectorAll('.action-bar [data-act]')].map(b => b.innerText.trim())")
        out[stage] = info

    # 3) แถบบนหน้าผู้ลงนาม (ฐานข้อมูลไม่ถูกเขียนจริง จึงต้องเป็น "รอ ผอ.กบค.")
    pg.goto(f'{BASE}/order.html?case=9819%2F2569&demo_role=chairman'); pg.wait_for_timeout(4000)
    out['orderBanner'] = pg.locator('#a7dcaBanner').inner_text() if pg.locator('#a7dcaBanner').count() else None
    pg.goto(f'{BASE}/ruling-report.html?case=1355%2F2566&demo_role=affairs'); pg.wait_for_timeout(4000)
    out['rulingBanner'] = pg.locator('#a7dcaBanner').inner_text() if pg.locator('#a7dcaBanner').count() else None
    pg.goto(f'{BASE}/order.html?case=1189%2F2569&demo_role=affairs'); pg.wait_for_timeout(3500)
    out['orderBannerOtherStatus'] = pg.locator('#a7dcaBanner').count()

    # 4) 3-4 ประธานฯ มอบหมาย/สั่งการหน่วยงาน
    FORCE73['on'] = True
    n0 = len(writes)
    pg.goto(f'{BASE}/chairman-agenda.html?case=2014%2F2569&demo_role=chairman'); pg.wait_for_timeout(4000)
    c = {'buttons': pg.evaluate("() => [...document.querySelectorAll('.action-bar [data-act]')].map(b => b.innerText.trim())")}
    pg.click('.action-bar [data-act="assign_unit_73"]'); pg.wait_for_timeout(500)
    pg.click('.swal2-confirm'); pg.wait_for_timeout(400)
    c['validation'] = pg.locator('.swal2-validation-message').inner_text() if pg.locator('.swal2-validation-message').is_visible() else ''
    pg.check('#u73_0'); pg.fill('#u73_note', 'ให้สำนักงาน ป.ป.ท. เขต ตรวจสอบและรายงานผล (ทดสอบ)')
    pg.click('.swal2-confirm'); pg.wait_for_timeout(800)
    c['signDialog'] = pg.locator('.swal2-popup').inner_text()[:80] if pg.locator('.swal2-popup').count() else ''
    box = pg.locator('#swal-sig-canvas').bounding_box()
    pg.mouse.move(box['x'] + 40, box['y'] + 60); pg.mouse.down()
    for i in range(1, 12): pg.mouse.move(box['x'] + 40 + i * 25, box['y'] + 60 + (i % 3) * 20)
    pg.mouse.up(); pg.wait_for_timeout(200)
    pg.click('.swal2-confirm'); pg.wait_for_timeout(2000)
    w = [x for x in writes[n0:] if x['url'] == 'tbl_res_request']
    body = json.loads(w[0]['body']) if w else {}
    ev = [json.loads(x['body']) for x in writes[n0:] if x['url'] == 'tbl_res_request_event']
    c['write'] = {'keys': list(body.keys()), 'chairAssign73': (body.get('trr_resolution_data') or {}).get('chairAssign73'),
                  'statusChanged': 'trr_status' in body, 'event': [e.get('trre_type') for e in ev]}
    c['box'] = pg.locator('#unitAssign73Box').inner_text()[:160]
    c['buttonsAfter'] = pg.evaluate("() => [...document.querySelectorAll('.action-bar [data-act]')].map(b => b.innerText.trim())")
    out['chair73'] = c
    FORCE73['on'] = False

    out['errors'] = errors
    out['blockedWrites'] = len(writes)
    b.close()
print(json.dumps(out, ensure_ascii=False, indent=1))
