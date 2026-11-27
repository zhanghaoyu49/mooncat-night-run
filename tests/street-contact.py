"""Run with python tests/street-contact.py after building play.html. Requires Playwright."""
from pathlib import Path
from shutil import which

from playwright.sync_api import sync_playwright


def check_field(page):
    return page.evaluate("""() => {
      const check=(ok,message)=>{if(!ok)throw Error(message)};
      let crossings=0,landings=0;
      function valid(){
        const top=platforms[streetSurfaceAt(player.x)].y;
        check(player.y<=top+.002,'entered street solid at '+[level,player.x,player.y,top]);
      }
      function place(x,y){
        Object.assign(player,{x,y,vx:0,vy:0,ground:true,on:streetRoute.roadIndex,
          skip:-1,land:0,jumps:0,grace:0});
        rolling=rollWait=0;held.clear();stickX=0;state='play';
      }
      mute=true;
      for(const expedition of [true,false])for(level=0;level<8;level++){
        rogue=expedition;run.seed=27;reset();enemies=[];treasures=[];
        // Spring impulses and damage are tested separately from terrain contact.
        for(const r of platforms)if(r.type==='S'||r.type==='H')r.type='.';
        for(const i of streetRoute.solids){
          const r=platforms[i],x=r.x+r.w/2;
          place(x,r.y-65);player.ground=false;player.vy=320;
          for(let t=0;t<140;t++){step(1/120);valid()}
          check(player.ground,'high fall failed to land');landings++;
          if(!platforms[player.on].streetSolid)continue;
          const before=player.on;dropFloor();check(player.on===before,'dropped through solid');
          for(const d of [-1,1]){
            place(d>0?r.x-22:r.x+r.w+22,streetRoute.roadY);
            held.add(d>0?'right':'left');dir=d;
            recoverStreetPosition(player);roll();
            for(let t=0;t<85;t++){step(1/120);valid()}
            crossings++;
          }
        }
      }
      rogue=true;level=3;run=freshRun();run.seed=27;run.attuned=true;profile.expedition=run;
      reset();enemies.forEach(e=>e.hp=0);
      const box=platforms.find(r=>r.site==='container'&&r.streetLevel&&!r.host);
      for(const d of [-1,1]){
        const edge=d>0?box.x:box.x+box.w;
        place(edge-d*19,streetRoute.roadY);held.add(d>0?'right':'left');
        for(let i=0;i<90;i++){step(1/120);valid()}
        check((player.x-edge)*d>18&&player.y<=box.y+.001,'could not cross container');
      }
      place(box.x+box.w/2,streetRoute.roadY);run.fish=17;saveExpedition();
      reset();restoreField();valid();check(player.ground&&run.fish===17,'save recovery failed');

      level=0;run.stage=0;reset();enemies=[];treasures=[];
      const canopy=streetRoute.overhangs.map(i=>platforms[i]).find(r=>
        streetTop(r.x+r.w/2,streetRoute.roadY)-r.underside>streetBodyHeight+3);
      check(canopy,'missing test awning');const x=canopy.x+canopy.w/2;
      place(x,streetTop(x,streetRoute.roadY));leap();
      let nearest=Infinity;
      for(let i=0;i<90;i++){step(1/120);const gap=player.y-streetBodyHeight-canopy.underside;
        nearest=Math.min(nearest,gap);check(gap>=-.002,'passed through awning underside')}
      check(nearest<.01,'jump never contacted awning');return {crossings,landings};
    }""")


if __name__ == '__main__':
    game = Path(__file__).resolve().parents[1] / 'play.html'
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=which('chromium'), args=['--no-sandbox', '--disable-webgl'])
        context = browser.new_context()
        context.route('https://game.test/**', lambda route: route.fulfill(path=game, content_type='text/html'))
        page = context.new_page()
        page.goto('https://game.test')
        page.locator('[data-action=depart]').click()
        page.locator('#draft button').first.click()
        print(check_field(page))
        browser.close()
