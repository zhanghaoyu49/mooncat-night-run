'use strict';
const $=id=>document.getElementById(id),canvas=$('world'),g=canvas.getContext('2d');
const H=224,held=new Set(),dirInput=()=>stickX||(Number(held.has('right'))-Number(held.has('left')));
let W=448,state='intro',level=0,platforms=[],items=[],motes=[],player,cam=0,clock=0,elapsed=0,checkpoint=0,audioCtx,mute=false,dir=1;
let records=profile.records;
function tone(freq,dur=.09){if(mute)return;try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const o=audioCtx.createOscillator(),a=audioCtx.createGain();o.type='triangle';o.frequency.setValueAtTime(freq,audioCtx.currentTime);a.gain.setValueAtTime(.065,audioCtx.currentTime);a.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(a);a.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur)}catch{}}
function burst(x,y,color){for(let i=0;i<8;i++)motes.push({x,y,color,vx:(i-3.5)*12,vy:-12-Math.random()*32,life:.38})}
function reset(){
 $('arena').dataset.adventure=rogue?'expedition':'classic';
 ({platforms,items}=rogue?expeditionStage():buildStage(level));assignStreetSites(platforms,level,rogue);checkpoint=0;elapsed=0;motes=[];dir=rogue&&platforms[0].x>district.width/2?-1:1;respawn();
 $('num').textContent=String(level+1).padStart(2,'0')+' / 08';$('place').textContent=stages[level].name;
 $('surveyBox').hidden=!rogue;$('attack').hidden=!rogue;$('roll').hidden=!rogue;$('roll').setAttribute('aria-disabled','false');$('hint').textContent=rogue?stageTip():stages[level].tip;hud();$('progress').style.width='0%';
}
function respawn(){for(const r of platforms)r.crack=-1;const r=platforms[checkpoint];player={x:r.x+25,y:r.y,vx:0,vy:0,jumps:0,ground:true,on:checkpoint,land:0,grace:0,jumpBuffer:0,attackBuffer:0,skip:-1};cam=Math.min(Math.max(0,player.x-W*.45),Math.max(0,worldWidth()-W));camY=rogue?Math.max(0,Math.min(district.height-H,player.y-H*.55)):0}
function hud(){if(rogue)$('objective').textContent=district.lit===district.required?'灯门已开':'灯芯 '+district.lit+'/'+district.required;$('rack').textContent=rogue?mutations.filter(m=>perk(m.key)).map(m=>m.name).slice(-3).join(' · '):'';$('life').textContent=rogue?'♥ '+run.hp+'/'+run.max:'';if(rogue){$('count').textContent=run.fish;return}$('count').textContent=items.filter(i=>i.taken).length+' / '+items.length}
function modal(mode,label,title,desc,action){state=mode;$('overlay').dataset.mode=mode;clearControls();$('start').hidden=false;$('draft').replaceChildren();$('overlay').hidden=false;$('eyebrow').textContent=label;$('title').textContent=title;$('desc').textContent=desc;$('start').textContent=action}
function intro(){reset();if(rogue){setRogueIntro();return}const s=stages[level];modal('intro',s.en,s.name,s.tip,'▶　'+(level?'进入关卡':'开始冒险'))}
function play(){if(state==='home'||$('map').open)return;if(state==='won'||state==='lost'){enterHome(false);return}if(state==='attune'||state==='draft')return;if(state==='finish'){openMap();return}if(state==='clear'){level++;intro();return}state='play';$('overlay').hidden=true;tone(420)}
function pause(){if(state==='play')modal('paused','PAUSED','稍歇片刻',stages[level].tip,'▶　继续冒险');else if(state==='paused')play()}
function openMap(){if($('map').open)return;if(state==='play')pause();const list=$('choices');list.replaceChildren();$('supplies').textContent='鱼干来自收集、战斗和补给箱。首次抵达检查点时，受伤可自动用 3 条换回 1 颗心。';$('journal').textContent=journalText();$('build').textContent=rogue?'本轮护符 · '+([...abilities,...mutations].filter(a=>perk(a.key)).map(a=>a.name+' ×'+perk(a.key)).join('、')||'尚未装备'):'经典路线';
 const mode=document.createElement('button');mode.textContent=rogue?'返回本轮远征':'进入月影远征';mode.onclick=()=>{$('map').close();if(!rogue){depart()}else if(state==='paused')play()};list.append(mode);stages.forEach((s,i)=>{const b=document.createElement('button');b.disabled=i>records.length;b.textContent=String(i+1).padStart(2,'0')+'　经典 · '+s.name+'　'+(i<records.length?'◆ '+records[i]+'/'+(s.route.length-2):b.disabled?'未解锁':'可挑战');b.onclick=()=>{if(!saveExpedition())return;$('map').close();rogue=false;level=i;intro()};list.append(b)});$('map').show()}
function leap(){if(state!=='play')return;if(player.jumps>=2+(rogue?perk('feather'):0)){player.jumpBuffer=.12;return}player.jumpBuffer=0;player.grace=0;player.vy=player.jumps?-136:-147;player.jumps++;airborneSkill();player.ground=false;player.on=-1;burst(player.x,player.y,player.jumps===2?'#aff1d4':'#c6ac9d');tone(player.jumps===1?450:620)}
$('start').onclick=play;$('pause').onclick=pause;$('routes').onclick=openMap;$('close').onclick=()=>$('map').close();
$('sound').onclick=()=>{mute=!mute;$('sound').textContent=mute?'♩̸':'♪';$('sound').setAttribute('aria-pressed',String(!mute));tone(550)};
const controls = ['jump','attack','roll'];
const activeInputs = new Map();

function pressControl(action, source) {
  if (state !== 'play' || $('map').open || activeInputs.has(source)) return;
  activeInputs.set(source, action);
  held.add(action);
  if (controls.includes(action)) $(action).classList.add('on');
  if (action === 'jump') leap();
  if (action === 'attack' && rogue) {if(cool>0)player.attackBuffer=.14;else strike()}
  if (action === 'roll') roll();
}

function releaseControl(source) {
  const action = activeInputs.get(source);
  if (!action) return;
  activeInputs.delete(source);
  if ([...activeInputs.values()].includes(action)) return;
  held.delete(action);
  if (controls.includes(action)) $(action).classList.remove('on');
}

function clearControls() {
  centerStick();
  activeInputs.clear();
  held.clear();
  for (const id of controls) $(id).classList.remove('on');
}

function pauseOnLeave() {
  if (state === 'play') pause();
  saveExpedition();
  clearControls();
}

for (const id of controls) {
  const button = $(id);
  // Cancel Safari's native tap gesture on the controls, including the second
  // touchend. Each changed touch still triggers its own game action.
  const onTouch = event => {
    if (event.cancelable) event.preventDefault();
    if ('PointerEvent' in window) return;
    for (const touch of event.changedTouches) {
      const source = 'touch-' + touch.identifier;
      if (event.type === 'touchstart') pressControl(id, source);
      else releaseControl(source);
    }
  };
  for (const type of ['touchstart','touchend','touchcancel']) {
    button.addEventListener(type, onTouch, {passive:false});
  }
  button.addEventListener('dblclick', event => event.preventDefault());
  button.addEventListener('contextmenu', event => event.preventDefault());
  button.onpointerdown = event => {
    if (event.button !== 0) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    pressControl(id, 'pointer-' + event.pointerId);
  };
  const endPointer = event => releaseControl('pointer-' + event.pointerId);
  if (id==='roll') button.onpointermove = e => {
    const source='pointer-'+e.pointerId;
    if (activeInputs.get(source)==='roll' && rolling>0 && document.elementFromPoint(e.clientX,e.clientY)===$('attack')) {
      releaseControl(source);pressControl('attack',source);
    }
  };
  button.onpointerup = endPointer;
  button.onpointercancel = endPointer;
  button.onlostpointercapture = endPointer;
}

const arena = $('arena');
const desktopPointer = matchMedia('(hover: hover) and (pointer: fine)');
function defaultInputMode() {
  return desktopPointer.matches || !navigator.maxTouchPoints ? 'desktop' : 'touch';
}
function setInputMode(mode) {
  if (arena.dataset.input === mode) return;
  clearControls();
  arena.dataset.input = mode;
  if (state === 'attune') $('desc').textContent = openingTip();
  if (rogue && state === 'intro') $('desc').textContent = stageTip();
  if (rogue) $('hint').textContent = stageTip();
}
function isDesktop(){return arena.dataset.input === 'desktop'}
setInputMode(defaultInputMode());
desktopPointer.addEventListener('change', () => setInputMode(defaultInputMode()));
window.addEventListener('pointerdown', e => {
  setInputMode(e.pointerType === 'mouse' ? 'desktop' : 'touch');
}, true);

const isBattlefield = target => target === arena || target === canvas || target === $('scene3d');
arena.addEventListener('mousedown', e => {
  if (!isDesktop() || !rogue || state !== 'play' || $('map').open || !isBattlefield(e.target)) return;
  const action = e.button === 0 ? 'attack' : e.button === 2 ? 'roll' : null;
  if (action) {
    e.preventDefault();
    pressControl(action, 'mouse-' + e.button);
  }
});
window.addEventListener('mouseup', e => releaseControl('mouse-' + e.button));
window.addEventListener('mousemove', e => {
  if (!(e.buttons & 1)) releaseControl('mouse-0');
  if (!(e.buttons & 2)) releaseControl('mouse-2');
});
arena.addEventListener('contextmenu', e => {
  if (isDesktop() && state === 'play' && !$('map').open && isBattlefield(e.target)) e.preventDefault();
});

const keys={KeyK:'roll',ShiftLeft:'roll',ShiftRight:'roll',KeyJ:'attack',KeyX:'attack',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',ArrowUp:'jump',KeyW:'jump'};
onkeydown = event => {
  if (state==='home'||event.ctrlKey || event.metaKey || event.altKey) return;
  const code=event.code, action=keys[code], down=code==='ArrowDown'||code==='KeyS';
  const choice=/^(Digit|Numpad)([1-3])$/.exec(code);
  if (!action && !down && !choice && code!=='Escape' && code!=='Enter') return;
  setInputMode('desktop');
  if ($('map').open) {
    if(code==='Escape'){event.preventDefault();$('map').close()}
    return;
  }
  if (choice && (state==='attune'||state==='draft')) {
    event.preventDefault();
    if (!event.repeat) $('draft').children[Number(choice[2])-1]?.click();
    return;
  }
  if (code==='Escape') {
    event.preventDefault();
    if (!event.repeat) pause();
    return;
  }
  if (code==='Enter' && !$('overlay').hidden && !$('start').hidden && !event.target.closest?.('button')) {
    event.preventDefault();
    if (!event.repeat) play();
    return;
  }
  if (state!=='play'||(!action&&!down)) return;
  event.preventDefault();
  if(event.repeat)return;
  if(down)dropFloor();
  else pressControl(action,'key-'+code);
};
onkeyup = event => releaseControl('key-' + event.code);
onblur = pauseOnLeave;
window.addEventListener('pagehide', pauseOnLeave);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseOnLeave();
});
function itemPos(f){const r=platforms[f.index];return {x:r.x+r.w*.5,y:r.y-(f.high||r.type==='H'?43:17)}}
function complete(){if(rogue){tone(990,.3);$('progress').style.width='100%';if(level===7)finishExpedition(false);else{run.hp=Math.min(run.max,run.hp+1);hud();offerPerks();saveExpedition()}return}const score=items.filter(f=>f.taken).length;records[level]=Math.max(records[level]||0,score);writeSlot();tone(990,.3);$('progress').style.width='100%';
 if(level===stages.length-1){const total=stages.reduce((n,s)=>n+s.route.length-2,0);modal('finish','JOURNEY COMPLETE','天亮了！','八站全部抵达，各关最佳收集共 '+records.reduce((n,v)=>n+v,0)+' / '+total+' 条小鱼干。','查看旅程')}
 else modal('clear','STAGE CLEAR','抵达终点','本关小鱼干 '+score+' / '+items.length+'　·　下一站 '+stages[level+1].name,'前往下一站')}
function worldWidth(){return rogue?district.width:platforms.at(-1).x+platforms.at(-1).w}
function dropFloor(){
 if(state!=='play'||!rogue||!player.ground)return;
 const below=platforms.some(r=>r.y>player.y+5&&r.x<=player.x+3&&r.x+r.w>=player.x-3&&r.crack!==0);
 if(!below)return;
 player.skip=player.on;player.on=-1;player.ground=false;player.grace=0;player.jumps=1;player.y+=2;player.vy=55;
}
function step(dt){
 const p=player,move=dirInput();elapsed+=dt;p.land=Math.max(0,p.land-dt);
 for(const [i,r] of platforms.entries()){if(r.type==='M'){const next=r.base+14*Math.sin(elapsed*1.55+i);if(p.on===i)p.x+=next-r.x;r.x=next}if(r.crack>0)r.crack=Math.max(0,r.crack-dt)}
 const inRoll=rogue&&rolling>0;if(move&&!inRoll)dir=Math.sign(move);
 const target=move*128,accel=!move?1900:Math.sign(p.vx)!==Math.sign(move)?2100:1500;
 p.vx+=Math.max(-accel*dt,Math.min(accel*dt,target-p.vx));
 p.x=Math.min(worldWidth()-3,Math.max(3,p.x+(inRoll?rollDir*255:p.vx)*dt));const prev=p.y,wasGround=p.ground;p.vy+=362*dt;p.y+=p.vy*dt;p.ground=false;p.on=-1;
 for(const [i,r] of platforms.entries()){
   if(i===p.skip||r.crack===0||p.vy<0||prev>r.y+.1||p.y<r.y||p.x+3<=r.x||p.x-3>=r.x+r.w)continue;
   if(!wasGround){p.land=.115;burst(p.x,r.y,'#c5b6a8')}
   p.y=r.y;p.vy=0;p.ground=true;p.jumps=0;p.on=i;p.skip=-1;p.grace=.085;
   if(r.type==='F'&&checkpoint!==i){checkpoint=i;if(rogue&&run.hp<run.max&&run.fish>=3){run.fish-=3;run.hp++;hud();$('hint').textContent='检查点补给 · 3 条鱼干换回 1 颗心'}tone(740);burst(r.x+20,r.y-22,'#d6fd97')}
   if(r.type==='C'&&r.crack<0)r.crack=1.05;
   if(r.type==='S'&&Math.abs(p.x-(r.x+r.w-26))<10){p.vy=-210;p.jumps=1;p.ground=false;p.on=-1;burst(p.x,p.y,'#85ffce');tone(710,.18)}
   break;
 }
 if(!p.ground){p.grace=Math.max(0,p.grace-dt);if(!p.grace&&p.jumps===0)p.jumps=1}
 if(p.ground&&p.jumpBuffer>0)leap();p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);
 const hit=platforms.some(r=>r.type==='H'&&Math.abs(p.x-(r.x+r.w*.5))<12&&p.y>r.y-8&&p.y<r.y+10);
 if(hit||p.y>(rogue?district.height:H)+18){if(rogue)takeHit(true);else{respawn();tone(115)}return}
 if(rogue){fight(dt);if(state!=='play')return}
 for(const f of items){const a=itemPos(f);if(!f.taken&&Math.abs(a.x-p.x)<11+(rogue?perk('magnet')*6:0)&&Math.abs(a.y-(p.y-9))<13+(rogue?perk('magnet')*6:0)){f.taken=true;if(rogue)run.fish++;burst(a.x,a.y,'#ffe58d');tone(860);hud()}}
 const end=rogue?platforms[district.exit.floor]:platforms.at(-1);
 const targetX=Math.max(0,Math.min(p.x-W*.45,worldWidth()-W));
 cam+=(targetX-cam)*(1-Math.exp(-14*dt));
 if(rogue)camY+=(Math.max(0,Math.min(p.y-H*.55,district.height-H))-camY)*(1-Math.exp(-12*dt));
 $('progress').style.width=(rogue?district.lit/district.required*100:Math.min(100,p.x/(end.x+end.w-25)*100))+'%';
 motes=motes.filter(q=>q.life>0);for(const q of motes){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=105*dt;q.life-=dt}
 if(isExit(p.on)&&(rogue?district.lit===district.required&&Math.abs(p.x-(end.x+end.w*.67))<15:p.x>=end.x+end.w-25))complete();
}
$('home').onclick=homeClick;$('toHome').onclick=()=>enterHome();$('homeScreen').onclick=()=>$('fullscreen').click();enterHome(false);
let last=0;
function frame(t){
 const dt=last?Math.min(.09,(t-last)/1000):0;last=t;
 if(state!=='paused')clock+=dt;
 if(state==='play'){
   const slices=Math.max(1,Math.ceil(dt*120));
   for(let i=0;i<slices&&state==='play';i++)step(dt/slices);
   if(state==='play'&&t-lastSaveAt>5000)saveExpedition();
 }
 draw();requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
