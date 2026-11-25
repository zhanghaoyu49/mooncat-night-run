'use strict';
const $=id=>document.getElementById(id),canvas=$('world'),g=canvas.getContext('2d');
const H=224,held=new Set(),dirInput=()=>Number(held.has('right'))-Number(held.has('left'));
let W=448,state='intro',level=0,platforms=[],items=[],motes=[],player,cam=0,clock=0,elapsed=0,checkpoint=0,audioCtx,mute=false,dir=1;
let records=[];
try{const saved=JSON.parse(localStorage.getItem('mooncat-routes-v2'));if(Array.isArray(saved))for(let i=0;i<Math.min(stages.length,saved.length);i++){if(!Number.isInteger(saved[i])||saved[i]<0)break;records.push(Math.min(saved[i],stages[i].route.length-2))}}catch{}
function tone(freq,dur=.09){if(mute)return;try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const o=audioCtx.createOscillator(),a=audioCtx.createGain();o.type='triangle';o.frequency.setValueAtTime(freq,audioCtx.currentTime);a.gain.setValueAtTime(.065,audioCtx.currentTime);a.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(a);a.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur)}catch{}}
function burst(x,y,color){for(let i=0;i<8;i++)motes.push({x,y,color,vx:(i-3.5)*12,vy:-12-Math.random()*32,life:.38})}
function reset(){
 const base=buildStage(level);({platforms,items}=rogue?expeditionStage(base):base);checkpoint=0;elapsed=0;motes=[];dir=1;respawn();
 $('num').textContent=String(level+1).padStart(2,'0')+' / 08';$('place').textContent=stages[level].name;
 $('attack').hidden=!rogue;$('roll').hidden=!rogue;$('roll').disabled=false;$('hint').textContent=rogue?stageTip():stages[level].tip;hud();$('progress').style.width='0%';
}
function respawn(){for(const r of platforms)r.crack=-1;const r=platforms[checkpoint];player={x:r.x+25,y:r.y,vy:0,jumps:0,ground:true,on:checkpoint,land:0};cam=Math.max(0,player.x-W*.32)}
function hud(){$('rack').textContent=rogue?mutations.filter(m=>perk(m.key)).map(m=>m.name).slice(-3).join(' · '):'';$('life').textContent=rogue?'♥ '+run.hp+'/'+run.max:'';if(rogue){$('count').textContent=run.fish;return}$('count').textContent=items.filter(i=>i.taken).length+' / '+items.length}
function modal(mode,label,title,desc,action){state=mode;clearControls();$('start').hidden=false;$('draft').replaceChildren();$('overlay').hidden=false;$('eyebrow').textContent=label;$('title').textContent=title;$('desc').textContent=desc;$('start').textContent=action}
function intro(){reset();if(rogue){setRogueIntro();return}const s=stages[level];modal('intro',s.en,s.name,s.tip,'▶　'+(level?'进入关卡':'开始冒险'))}
function play(){if($('map').open)return;if(state==='won'||state==='lost'){run=freshRun();level=0;saveValue('mooncat-expedition',run);intro();return}if(state==='attune'||state==='draft')return;if(state==='finish'){openMap();return}if(state==='clear'){level++;intro();return}state='play';$('overlay').hidden=true;tone(420)}
function pause(){if(state==='play')modal('paused','PAUSED','稍歇片刻',stages[level].tip,'▶　继续冒险');else if(state==='paused')play()}
function openMap(){if($('map').open)return;if(state==='play')pause();const list=$('choices');list.replaceChildren();$('supplies').textContent='鱼干来自收集、战斗和补给箱。首次抵达检查点时，受伤可自动用 3 条换回 1 颗心。';$('journal').textContent=journalText();$('build').textContent=rogue?'本轮护符 · '+([...abilities,...mutations].filter(a=>perk(a.key)).map(a=>a.name+' ×'+perk(a.key)).join('、')||'尚未装备'):'经典路线';
 const mode=document.createElement('button');mode.textContent=rogue?'返回本轮远征':'进入月影远征';mode.onclick=()=>{$('map').close();if(!rogue){run=readSaved('mooncat-expedition',null)||freshRun();rogue=true;level=run.stage;intro()}else if(state==='paused')play()};list.append(mode);stages.forEach((s,i)=>{const b=document.createElement('button');b.disabled=i>records.length;b.textContent=String(i+1).padStart(2,'0')+'　经典 · '+s.name+'　'+(i<records.length?'◆ '+records[i]+'/'+(s.route.length-2):b.disabled?'未解锁':'可挑战');b.onclick=()=>{$('map').close();rogue=false;level=i;intro()};list.append(b)});$('map').show()}
function leap(){if(state!=='play'||player.jumps>=2+(rogue?perk('feather'):0))return;player.vy=player.jumps?-136:-147;player.jumps++;airborneSkill();player.ground=false;player.on=-1;burst(player.x,player.y,player.jumps===2?'#aff1d4':'#c6ac9d');tone(player.jumps===1?450:620)}
$('start').onclick=play;$('pause').onclick=pause;$('routes').onclick=openMap;$('close').onclick=()=>$('map').close();
$('sound').onclick=()=>{mute=!mute;$('sound').textContent=mute?'♩̸':'♪';$('sound').setAttribute('aria-pressed',String(!mute));tone(550)};
const controls = ['left','right','jump','attack','roll'];
const activeInputs = new Map();

function pressControl(action, source) {
  if (state !== 'play' || $('map').open || activeInputs.has(source)) return;
  activeInputs.set(source, action);
  held.add(action);
  $(action).classList.add('on');
  if (action === 'jump') leap();
  if (action === 'attack') strike();
  if (action === 'roll') roll();
}

function releaseControl(source) {
  const action = activeInputs.get(source);
  if (!action) return;
  activeInputs.delete(source);
  if ([...activeInputs.values()].includes(action)) return;
  held.delete(action);
  $(action).classList.remove('on');
}

function clearControls() {
  activeInputs.clear();
  held.clear();
  for (const id of controls) $(id).classList.remove('on');
}

function pauseOnLeave() {
  if (state === 'play') pause();
  else clearControls();
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
  button.onpointerup = endPointer;
  button.onpointercancel = endPointer;
  button.onlostpointercapture = endPointer;
}

const keys={KeyK:'roll',ShiftLeft:'roll',KeyJ:'attack',KeyX:'attack',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',ArrowUp:'jump',KeyW:'jump'};
onkeydown = event => {
  if ($('map').open) return;
  if (event.code === 'Escape' && !event.repeat) pause();
  const action = keys[event.code];
  if (!action || state !== 'play') return;
  event.preventDefault();
  if (!event.repeat) pressControl(action,'key-' + event.code);
};
onkeyup = event => releaseControl('key-' + event.code);
onblur = pauseOnLeave;
window.addEventListener('pagehide', pauseOnLeave);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseOnLeave();
});
function itemPos(f){const r=platforms[f.index];return {x:r.x+r.w*.5,y:r.y-(f.high||r.type==='H'?43:17)}}
function complete(){if(rogue){tone(990,.3);$('progress').style.width='100%';if(level===7)finishExpedition(false);else{run.hp=Math.min(run.max,run.hp+1);hud();offerPerks()}return}const score=items.filter(f=>f.taken).length;records[level]=Math.max(records[level]||0,score);try{localStorage.setItem('mooncat-routes-v2',JSON.stringify(records))}catch{}tone(990,.3);$('progress').style.width='100%';
 if(level===stages.length-1){const total=stages.reduce((n,s)=>n+s.route.length-2,0);modal('finish','JOURNEY COMPLETE','天亮了！','八站全部抵达，各关最佳收集共 '+records.reduce((n,v)=>n+v,0)+' / '+total+' 条小鱼干。','查看旅程')}
 else modal('clear','STAGE CLEAR','抵达终点','本关小鱼干 '+score+' / '+items.length+'　·　下一站 '+stages[level+1].name,'前往下一站')}
function step(dt){
 const p=player,move=dirInput();elapsed+=dt;p.land=Math.max(0,p.land-dt);
 for(const [i,r] of platforms.entries()){if(r.type==='M'){const next=r.base+14*Math.sin(elapsed*1.55+i);if(p.on===i)p.x+=next-r.x;r.x=next}if(r.crack>0)r.crack=Math.max(0,r.crack-dt)}
 const inRoll=rogue&&rolling>0;if(move&&!inRoll)dir=move;p.x=Math.max(4,p.x+(inRoll?rollDir*255:move*115)*dt);const prev=p.y,wasGround=p.ground;p.vy+=362*dt;p.y+=p.vy*dt;p.ground=false;p.on=-1;
 for(const [i,r] of platforms.entries()){
   if(r.crack===0||p.vy<0||prev>r.y+.1||p.y<r.y||p.x+3<=r.x||p.x-3>=r.x+r.w)continue;
   if(!wasGround){p.land=.115;burst(p.x,r.y,'#c5b6a8')}
   p.y=r.y;p.vy=0;p.ground=true;p.jumps=0;p.on=i;
   if(r.type==='F'&&checkpoint!==i){checkpoint=i;if(rogue&&run.hp<run.max&&run.fish>=3){run.fish-=3;run.hp++;hud();$('hint').textContent='检查点补给 · 3 条鱼干换回 1 颗心'}tone(740);burst(r.x+20,r.y-22,'#d6fd97')}
   if(r.type==='C'&&r.crack<0)r.crack=1.05;
   if(r.type==='S'&&Math.abs(p.x-(r.x+r.w-26))<10){p.vy=-210;p.jumps=1;p.ground=false;p.on=-1;burst(p.x,p.y,'#85ffce');tone(710,.18)}
   break;
 }
 if(!p.ground&&p.jumps===0)p.jumps=1;
 const hit=platforms.some(r=>r.type==='H'&&Math.abs(p.x-(r.x+r.w*.5))<12&&p.y>r.y-8&&p.y<r.y+10);
 if(hit||p.y>H+18){if(rogue)takeHit(true);else{respawn();tone(115)}return}
 if(rogue){fight(dt);if(state!=='play')return}
 for(const f of items){const a=itemPos(f);if(!f.taken&&Math.abs(a.x-p.x)<11+(rogue?perk('magnet')*6:0)&&Math.abs(a.y-(p.y-9))<13+(rogue?perk('magnet')*6:0)){f.taken=true;if(rogue)run.fish++;burst(a.x,a.y,'#ffe58d');tone(860);hud()}}
 const end=platforms.at(-1);cam=Math.max(0,Math.min(p.x-W*.32,end.x+end.w-W+28));$('progress').style.width=Math.min(100,p.x/(end.x+end.w-25)*100)+'%';
 motes=motes.filter(q=>q.life>0);for(const q of motes){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=105*dt;q.life-=dt}
 if(p.on===platforms.length-1&&p.x>=end.x+end.w-25)complete();
}
level=run.stage;saveValue('mooncat-expedition',run);intro();
let last=0;function frame(t){const dt=Math.min(.035,(t-last)/1000);last=t;if(state!=='paused')clock+=dt;if(state==='play'){step(dt/2);if(state==='play')step(dt/2)}draw();requestAnimationFrame(frame)}requestAnimationFrame(frame);
