"""Run after build_play.py. Exercise the first stage and its real input handlers."""
from pathlib import Path
from shutil import which
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=which('chromium'), args=['--no-sandbox','--disable-webgl'])
    for touch in (False, True):
        c = browser.new_context(viewport={'width':844,'height':390},has_touch=touch,is_mobile=touch)
        c.route('https://game.test/**',lambda route:route.fulfill(path=root/'play.html',content_type='text/html'))
        page=c.new_page()
        page.goto('https://game.test')
        act=lambda selector: page.locator(selector).tap() if touch else page.locator(selector).click()
        act('[data-action=depart]');act('#draft button:first-child')
        page.evaluate("()=>{window.requestAnimationFrame=()=>{};mute=true}")
        if touch:
            act('#jump');act('#attack');act('#roll')
        else:
            page.keyboard.press('Space');page.locator('#world').click(position={'x':200,'y':170},force=True)
            page.keyboard.press('Shift')
        assert page.evaluate('player.jumps>0 && chain===1 && rolling>0')
        # Both devices use the original jump button to push off the same wall.
        page.evaluate("""()=>{const r=platforms[market.walls[0]];clearControls();rolling=0;
          Object.assign(player,{x:r.x+r.w+streetBodyHalf,y:r.underside-6,jumps:2,ground:false})}""")
        if touch:act('#jump')
        else:page.keyboard.press('Space')
        assert page.evaluate("player.wallKicks===1 && player.vx>0")
        page.evaluate("""()=>{const b=market.box;
          Object.assign(player,{x:b.x,y:b.ground,ground:true,vx:0,hiddenBox:false})}""")
        if touch:
            stick=page.locator('#stick').bounding_box()
            page.touchscreen.tap(stick['x']+stick['width']/2,stick['y']+stick['height']*.87)
        else:page.keyboard.press('s')
        assert page.evaluate("player.hiddenBox")
        print('touch' if touch else 'desktop',page.evaluate((root/'tests/market-core.js').read_text()),flush=True)
        c.close()
    browser.close()
