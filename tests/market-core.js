// Runs inside the live first-stage page via market-check.py.
() => {
  const check=(v,msg)=>{if(!v)throw Error(msg)};
  const tick=(n)=>{for(let i=0;i<n&&state==='play';i++){clock+=1/120;step(1/120)}};
  function start(seed=27){
    level=0;rogue=true;run=freshRun();run.seed=seed;run.attuned=true;profile.expedition=run;
    state='play';reset();clearControls();mute=true;
  }
  function place(x,y,ground=false){
    Object.assign(player,{x,y,vx:0,vy:0,jumps:ground?0:2,on:-1,skip:-1,ground,dive:0,
      dove:false,fromStomp:false,bounced:[],lastWall:-1,wallKicks:0,kickTime:0,hiddenBox:false});
    clearControls();rolling=rollWait=cool=swipe=0;
  }
  function dummy(kind,x,y,hp=12){
    return {kind,x,y,hp,maxHp:hp,rank:1,home:0,lane:.5,span:0,phase:0,wind:0,lunge:0,rest:1,aim:1};
  }
  const orientations=new Set();
  for(const seed of [1,27,4096,90000,123456,2097152,4000000000]){
    start(seed);
    orientations.add(platforms[0].x>worldWidth()/2);
    check(market.walls.every(i=>platforms[i].x>0&&platforms[i].x+platforms[i].w<worldWidth()),'wall outside map');
    const box=market.box;place(box.x,box.ground,true);recoverStreetPosition(player);
    check(toggleCarton()&&player.hiddenBox,'carton unreachable for seed '+seed);
  }
  check(orientations.size===2,'missing mirrored district');
  start();
  // Use the real sweep/collision code and regular jump input in the service shaft.
  const [L,R]=market.walls.map(i=>platforms[i]);
  const left=L.x+L.w+streetBodyHalf,right=R.x-streetBodyHalf;
  place(left,L.underside+1);leap();check(player.vx>0&&player.wallKicks===1,'left kick');
  leap();check(player.wallKicks===1,'same wall repeated');
  held.add('right');for(let i=0;i<60&&player.x<right-.1;i++)tick(1);
  check(Math.abs(player.x-right)<1,'opposite facade not reachable');
  leap();check(player.vx<0&&player.wallKicks===2,'opposite kick');
  const high=player.y;tick(15);check(player.y<high-10,'second kick gained no height');
  place(left,L.underside+1);player.wallKicks=4;leap();check(player.vy===0,'extra wall kick');
  // Single and double jump arcs on a clear stretch, with actual landing.
  function arc(double){
    let x=16;
    while(x<worldWidth()-16&&Number.isFinite(streetCeilingAt(x,platforms[streetSurfaceAt(x)].y)))x++;
    place(x,platforms[streetSurfaceAt(x)].y,true);const y=player.y;leap();let min=y;
    for(let i=0;i<250;i++){if(double&&i===46)leap();tick(1);min=Math.min(min,player.y);if(i>4&&player.ground)break}
    check(player.ground,'jump failed to land');return y-min;
  }
  const single=arc(false),double=arc(true);check(single>20&&double>single+12,'jump heights '+[single,double]);
  // Exercise collision on descent and the same opening mutation as the draft.
  run.perks.sweep=1;
  const ex=platforms[0].x+5,ey=platforms[0].y-5;
  let e=dummy('rover',ex,ey);enemies=[e];place(ex,ey-4);player.vy=180;
  check(robotLanding(player,ey-12,-1)&&player.vy<0&&e.hp===11,'stomp');
  player.vy=150;check(!robotLanding(player,ey-12,-1),'repeat stomp on one machine');
  player.y=ey-23;dir=swingDir=1;strike();check(player.dive>0,'pounce acquisition');
  player.y=ey-5;player.vy=150;check(robotLanding(player,ey-8,-1)&&hasEvolution('hunter'),'hunter evolution');
  // Live collision during an actual enemy projectile attack, with normal roll and attack timers.
  start();const b=market.box;place(b.x,b.ground,true);dropFloor();check(player.hiddenBox,'hide');
  let h=run.hp;shots=[{enemy:true,x:player.x,y:player.y-9,v:0,life:1}];fight(.008);
  check(run.hp===h&&!shots.length,'carton failed to intercept');
  dropFloor();check(!player.hiddenBox,'leave carton');run.perks.trail=1;
  shots=[{enemy:true,x:player.x,y:player.y-9,v:0,life:1}];roll();fight(.008);
  check(player.counter>0,'perfect dodge');
  enemies=[dummy('rover',player.x+7,player.y-6)];dir=rollDir=1;strike();
  check(hasEvolution('flame')&&enemies[0].hp<=9,'empowered claw');
  rollWait=0;const recovery=cool;roll();check(cool===recovery,'roll reset attack recovery');
  clearControls();held.add('attack');const sequence=chain;for(let k=0;k<60;k++)fight(.01);
  check(chain===sequence,'held attack repeated');
  start();run.perks.quake=1;place(ex,ey+5,true);enemies=[dummy('saw',ex+8,ey)];e=enemies[0];
  chain=2;chainTime=.5;e.exposed=.45;dir=1;strike();
  check(hasEvolution('frost')&&e.frozen>0,'recovery punish / ice evolution');
  // Hit each prop through the regular claw, advance the falling sign, and round-trip its state.
  start();let s=market.sign;place(s.x-8,s.ground,true);dir=1;strike();check(s.state==='fall','sign trigger');
  updateSign(.03);saveExpedition();const fallingY=s.y;
  reset();restoreField();s=market.sign;check(s.state==='fall'&&s.y===fallingY,'mid-fall save');
  const shield=platforms[market.walls[0]],mid=(shield.y+shield.underside)/2;
  check(attackPathBlocked(shield.x-5,mid,shield.x+shield.w+5,mid),'strike through facade');
  check(attackPathBlocked(shield.x+4,shield.y-3,shield.x+4,shield.underside+3),'pounce through roof');
  const idx=enemies.findIndex(e=>e.hp>0);e=enemies[idx];e.x=s.x;e.y=s.ground-6;e.hp=e.maxHp=10;
  for(let i=0;i<60;i++)updateSign(.008);
  check(s.state==='down'&&s.hits.includes(idx)&&e.hp<=6,'falling collision');
  const fuse=market.fuse;place(fuse.x-5,fuse.ground,true);dir=1;
  e.x=fuse.x+22;e.y=fuse.ground-7;e.hp=10;strike();
  check(fuse.broken&&e.stun>1,'paralysis');
  run.fish=19;run.evolutions={flame:true};check(saveExpedition(),'save');
  const saved=JSON.parse(localStorage.getItem(slotPrefix+slotNumber)).expedition;
  run=saved;profile.expedition=run;reset();restoreField();
  check(market.sign.state==='down'&&market.fuse.broken&&hasEvolution('flame')&&run.fish===19&&enemies[idx].stun>1,'new save restore');
  const old=run.snapshot;old.layout=2;delete old.market;old.floors.length-=2;delete old.player.bounced;
  reset();restoreField();check(market.sign.state==='hung'&&!market.fuse.broken&&player.x===old.player.x,'v2 restore');
  delete old.layout;old.floors.length=streetRoute.original;old.foes.length=legacyFoes;
  reset();restoreField();check(player.x===old.player.x&&run.fish===19,'legacy restore');
  level=1;reset();check(!market&&!platforms.some(p=>p.marketWall),'fixture outside night market');
  start();run.perks.sweep=1;
  const seal=treasures.find(t=>t.type==='seal'),gate=district.exit;
  const px=gate.x+gate.w*.67;
  // Recorded route for the fixed seed. Cross the street, ascend the end bay,
  // collect its seal, then descend the same maintenance stair to the gate.
  for(let frame=0;frame<2400&&state==='play';frame++){
    const goal=seal.taken?px:seal.x,dx=goal-player.x;
    held.clear();
    if(Math.abs(dx)>2)held.add(dx>0?'right':'left');
    if(frame%38===0)strike();
    if(Math.abs(dx)<7){
      if(seal.taken){if(player.ground)dropFloor()}
      else if(player.ground||(player.vy>-25&&player.jumps===1))leap();
    }
    tick(1);
  }
  check(state==='draft'&&seal.taken,'first stage route '+[state,player.x,player.y,player.on,run.hp,seal.taken]);
  const fieldKills=run.kills;
  rogue=false;level=0;reset();state='play';held.clear();held.add('right');
  for(let i=0;i<2400&&state==='play';i++){
    if(i%33===0)strike();if(i%95===0&&player.ground)leap();tick(1);
  }
  check(state==='clear','classic market exit '+[state,player.x,player.y]);
  return {single,double,expedition:'draft',classic:state,fieldKills};
}
