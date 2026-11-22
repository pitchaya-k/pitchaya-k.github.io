import sys, json
from playwright.sync_api import sync_playwright
BASE=sys.argv[1]; res={}
with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True)
    for o in ['A7-Option-A-03112026','A7-Option-B-03112026']:
        ctx=b.new_context(viewport={'width':1500,'height':900}); errs=[]
        ctx.route('**/*', lambda r,q: r.fulfill(status=200, content_type='application/json', body='[]') if ('supabase' in q.url and q.method in ('POST','PATCH','PUT','DELETE')) else r.continue_())
        pg=ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto(f'{BASE}/{o}/flow-to-page.html'); pg.wait_for_timeout(3000)
        a=pg.evaluate("() => ({opts:[...document.querySelectorAll('#optToggle button')].map(b=>b.textContent+(b.disabled?'(off)':'')), pages: document.querySelectorAll('#ovStage g.node').length})")
        pg.goto(f'{BASE}/{o}/flow-guide.html'); pg.wait_for_timeout(2000)
        g=pg.evaluate("() => document.querySelectorAll('#scenList .a7f-card').length")
        pg.goto(f'{BASE}/{o}/inbox.html?demo_role=affairs'); pg.wait_for_timeout(3000)
        m=pg.evaluate("() => ({role: sessionStorage.getItem('ecmis_role'), menu: [...document.querySelectorAll('#appSidebar a')].map(a=>a.innerText.trim()).filter(t=>/ผังกระบวนงาน|คู่มือเดิน|ไต่สวนเพิ่มเติม/.test(t))})")
        res[o]={'ftp':a,'scenarios':g,'mockup':m,'errors':errs}; ctx.close()
    b.close()
print(json.dumps(res,ensure_ascii=False,indent=1))
