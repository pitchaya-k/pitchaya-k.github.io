"""ทดสอบ flow-guide.html: สถานการณ์ เดินขั้น ทางเลือก ส่งต่องาน สลับบทบาท โหมดสาธิตไม่เขียนฐานข้อมูล
route นับคำขอเขียน Supabase ที่หลุดถึงเครือข่าย (ต้องเป็น 0 ในโหมดสาธิต — กันด้วย hook ใน ecmis-app.js) และบล็อกไว้อีกชั้น"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = sys.argv[1]; OUT = Path(sys.argv[2]); OUT.mkdir(exist_ok=True)
leaked = []
def guard(route, req):
    if 'supabase' in req.url and req.method in ('POST', 'PATCH', 'PUT', 'DELETE'):
        leaked.append(req.method + ' ' + req.url.split('?')[0][-50:]); return route.fulfill(status=200, content_type='application/json', body='[]')
    return route.continue_()
res = {}
def state(pg):
    return pg.evaluate("""() => { const s = JSON.parse(localStorage.getItem('ecmis_a7_demo')||'null'); return s && { cur: s.current_step_id, done: s.done && s.done.kind, steps: s.steps.length, role: sessionStorage.getItem('ecmis_role'), handover: !!s.handover, mismatch: !!s.mismatch, mode: s.mode, case: s.case_id, hist: s.workflow_history.map(h => h.type).slice(-6) } }""")
def frame_info(pg):
    fr = pg.frame(name='a7guide-frame')
    if not fr: return None
    try:
        return fr.evaluate("() => ({ url: location.pathname.split('/').pop() + location.search, target: (document.querySelector('.a7g-target')||{}).innerText || null, role: sessionStorage.getItem('ecmis_role') })")
    except Exception as e:
        return str(e)[:100]
def wait(pg, ms=4500): pg.wait_for_timeout(ms)
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True)
    ctx = b.new_context(viewport={'width': 1600, 'height': 950}, locale='th-TH'); ctx.route('**/*', guard)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.goto(f'{BASE}/flow-guide.html'); wait(pg, 2500)
    res['start'] = pg.evaluate("() => ({ cards: document.querySelectorAll('#scenList .a7f-card').length, names: [...document.querySelectorAll('#scenList .hd')].map(h => h.innerText.slice(0, 50)) })")
    pg.screenshot(path=str(OUT / 'g_start.png'))
    # สถานการณ์ 7.1 ปกติ
    pg.click('button[data-sc="S71-normal"]'); wait(pg, 6000)
    res['s1'] = {'state': state(pg), 'frame': frame_info(pg), 'next_disabled': pg.is_disabled('#bNext')}
    pg.screenshot(path=str(OUT / 'g_step1.png'))
    # กดเป้าหมาย (ลิงก์ ดำเนินการ) ในกรอบ → นับว่าทำจริง
    fr = pg.frame(name='a7guide-frame')
    if fr and fr.locator('.a7g-target').count():
        fr.locator('.a7g-target').first.click(); wait(pg, 4000)
    res['s1_after_click'] = {'state': state(pg), 'frame': frame_info(pg), 'next_disabled': pg.is_disabled('#bNext')}
    print(json.dumps(res, ensure_ascii=False)); sys.stdout.flush()
    if not pg.is_disabled('#bNext'): pg.click('#bNext')
    else: pg.click('#bSkip'); wait(pg, 300); pg.click('#bNext')
    wait(pg, 1500)
    res['decision1'] = {'state': state(pg), 'choices': pg.eval_on_selector_all('#guidePanel [data-ch]', 'els => els.map(e => e.innerText.replace(/\\s+/g, " ").slice(0, 60))')}
    pg.screenshot(path=str(OUT / 'g_decision.png'))
    # เลือกทางตั้งต้น (กรอบทอง) ไปเรื่อย ๆ จนถึงงานถัดไป
    for i in range(6):
        st = state(pg)
        if pg.locator('#guidePanel [data-ch].is-def').count():
            pg.click('#guidePanel [data-ch].is-def'); wait(pg, 2500); continue
        if pg.locator('#bHand').count():
            pg.click('#bHand'); wait(pg, 4500); continue
        break
    res['after_decisions'] = {'state': state(pg), 'frame': frame_info(pg)}
    # ขั้นของเลขาธิการฯ (approval-review) — กดเป้าหมายที่เป็นปุ่มดำเนินการในโหมดสาธิต → จำลอง ไม่ส่งคำขอเขียน
    fr = pg.frame(name='a7guide-frame')
    tgt = fr.locator('.a7g-target') if fr else None
    res['target_count'] = tgt.count() if tgt else 0
    # ลองกดปุ่มดำเนินการอื่นที่ไม่ใช่เป้าหมาย → ต้องถูกบล็อก
    if fr:
        other = fr.locator('.action-bar [data-act]:not(.a7g-target)')
        res['other_actions'] = other.count()
        if other.count():
            other.first.click(); wait(pg, 1500)
            res['other_blocked_msg'] = fr.locator('.a7g-blocked').count()
    pg.screenshot(path=str(OUT / 'g_secgen.png'))
    # เดินด้วยปุ่ม "ข้าม (จำลอง)" + ทางตั้งต้น จนเจอการส่งต่องาน
    handover_seen = None
    for i in range(20):
        if pg.locator('#bHand').count():
            handover_seen = pg.inner_text('#guidePanel .a7g-handover')[:300]
            pg.screenshot(path=str(OUT / 'g_handover.png'))
            pg.click('#bHand'); wait(pg, 4500)
            break
        if pg.locator('#guidePanel [data-ch].is-def').count():
            pg.click('#guidePanel [data-ch].is-def'); wait(pg, 2000); continue
        if not pg.is_disabled('#bSkip'): pg.click('#bSkip'); wait(pg, 400)
        if not pg.is_disabled('#bNext'): pg.click('#bNext'); wait(pg, 2500)
    res['handover'] = {'panel': handover_seen, 'state': state(pg), 'frame': frame_info(pg)}
    # สลับบทบาทเองเป็นกรรมการ → ต้องขึ้นแจ้งบทบาทไม่ตรง ไม่นับขั้นว่าทำแล้ว
    pg.click('.a7-rs-btn'); wait(pg, 500)
    res['rs_pop_hidden'] = pg.evaluate("() => document.querySelector('.a7-rs-pop').hidden")
    if res['rs_pop_hidden']: pg.click('.a7-rs-btn'); wait(pg, 500)
    pg.click('.a7-rs-list li[data-role="board"]'); wait(pg, 3500)
    res['mismatch'] = {'state': state(pg), 'panel': pg.locator('.a7g-mismatch').count(), 'next_disabled': pg.is_disabled('#bNext')}
    pg.screenshot(path=str(OUT / 'g_mismatch.png'))
    pg.click('#bRoleBack'); wait(pg, 4000)
    res['role_back'] = state(pg)
    # ย้อนกลับ / ก่อนหน้า
    pg.click('#bPrev'); wait(pg, 3000)
    res['prev'] = state(pg)
    # หน้าต้นแบบนอกคู่มือ: ชิปกลับคู่มือ
    p2 = ctx.new_page(); p2.goto(f'{BASE}/inbox.html'); wait(p2, 3500)
    res['chip_on_mockup'] = p2.locator('#a7GuideChip').count()
    p2.close()
    # เริ่มจาก flow-to-page (deep link)
    pg.goto(f'{BASE}/flow-guide.html?start=B:6-4:p24_t1'); wait(pg, 6000)
    res['deeplink'] = {'state': state(pg), 'frame': frame_info(pg)}
    pg.screenshot(path=str(OUT / 'g_deeplink.png'))
    # จบเส้นทาง: สถานการณ์ปฏิเสธการรับ (สั้น)
    pg.goto(f'{BASE}/flow-guide.html'); wait(pg, 1500)
    pg.click('#bExit') if pg.locator('#bExit').is_visible() else None
    wait(pg, 600)
    pg.click('button[data-sc="S71-reject"]'); wait(pg, 5000)
    for i in range(10):
        if pg.locator('#guidePanel [data-ch].is-def').count(): pg.click('#guidePanel [data-ch].is-def'); wait(pg, 2000); continue
        if pg.locator('#bHand').count(): pg.click('#bHand'); wait(pg, 3000); continue
        if pg.locator('#bAgain').count(): break
        if not pg.is_disabled('#bSkip'): pg.click('#bSkip'); wait(pg, 300)
        if not pg.is_disabled('#bNext'): pg.click('#bNext'); wait(pg, 2500)
    res['end'] = {'state': state(pg), 'end_panel': pg.locator('#bAgain').count(), 'prog': pg.inner_text('#progTxt')}
    pg.screenshot(path=str(OUT / 'g_end.png'))
    res['errors'] = errs
    b.close()
res['leaked_writes'] = leaked
print(json.dumps(res, ensure_ascii=False, indent=1))
