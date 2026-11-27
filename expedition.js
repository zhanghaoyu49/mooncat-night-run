const relics=['霓虹铃','灯笼结','玻璃叶','潮汐锚','紫晶簇','纸风车','雪花针','电台徽章'];
const abilities=[
 {name:'钢爪',desc:'爪击伤害 +1',key:'claw'},
 {name:'月牙回响',desc:'月刃可多穿过一个敌人',key:'pierce'},
 {name:'轻羽',desc:'增加一次空中跳跃',key:'feather'},
 {name:'护心铃',desc:'生命上限 +1，并回复两颗心',key:'heart'},
 {name:'疾风爪',desc:'缩短爪击与月刃的间隔',key:'haste'},
 {name:'招财铃',desc:'扩大鱼干与藏品的拾取范围',key:'magnet'}
];
const mutations=[
 {key:'sweep',name:'掠风爪',desc:'第二爪向上挑击，能打到高处的敌人，并使其短暂失衡。'},
 {key:'quake',name:'断岳爪',desc:'连续第三爪震地，击中前后两侧的敌人。'},
 {key:'trail',name:'余烬步',desc:'翻滚留下火痕，灼伤追过来的敌人。'},
 {key:'fan',name:'三日月',desc:'解锁远程月刃，挥爪时可向前发出三枚飞刃。'},
 {key:'returning',name:'回旋月',desc:'解锁回旋月刃，飞出后折返，可再次命中。'},
 {key:'needles',name:'骤雨羽',desc:'空中再跳时，向斜下方撒出三枚羽刃。'},
 {key:'mirror',name:'镜面爪',desc:'挥爪可以反弹迎面而来的哨兵飞弹。'},
 {key:'bloom',name:'星火印',desc:'击败敌人时引爆星火，波及附近敌人。'},
 {key:'frost',name:'霜纹刃',desc:'解锁冰月刃，命中后冻结目标，打断移动与攻击。'},
 {key:'shade',name:'影返步',desc:'翻滚起点留下猫影，稍后替你斩击一次。'},
 {key:'vault',name:'踏风翼',desc:'二段跳时向两侧释放一圈风刃。'}
];
let rolling=0,rollWait=0,rollDir=1,chain=0,chainTime=0,effects=[];
const swingHits=new Set();
let swingDir=1,lastClawX=0,lastClawY=0,hitStop=0,legacyFoes=0;
const clawBeats=[
 {reach:43,above:17,below:12,active:.125,recovery:.205,stagger:.17},
 {reach:48,above:21,below:14,active:.15,recovery:.23,stagger:.20},
 {reach:55,above:23,below:17,active:.19,recovery:.32,stagger:.32}
];
function clawBeat(){return clawBeats[Math.max(0,chain-1)]}
function clawReach(){return clawBeat().reach*(1+.05*trainingRank('reach'))}
function trainingRank(key){return run.training?.[key]||0}
function resetCombat(){hitStop=0;swingHits.clear();rolling=rollWait=chain=chainTime=0;effects=[]}
function pulse(x,y,r,damage,color){
 effects.push({kind:'pulse',x,y,r,life:.24,max:.24,color});
 for(const e of enemies)if(e.hp>0&&Math.hypot(e.x-x,e.y-y)<r)hitEnemy(e,damage);
}
function projectile(x,y,v,vy=0,kind='moon'){
 return {x,y,v,vy,kind,life:1.05,age:0,enemy:false,hits:new Set()};
}
function roll(){
 if(state!=='play'||rollWait>0)return;
 rollDir=Math.sign(dirInput())||dir;dir=rollDir;rolling=.22;rollWait=.8-trainingRank('roll')*.06;invul=Math.max(invul,.24);cool=0;
 if(perk('shade'))effects.push({kind:'shade',x:player.x,y:player.y-8,life:.40,max:.40,color:'#dfb7fa'});
 if(perk('trail'))for(let i=0;i<4;i++)effects.push({kind:'ember',x:player.x+i*13*dir,y:player.y-3,life:1.5,max:1.5,color:'#ffab65',hits:new Set()});
 burst(player.x,player.y,'#c7daf6');tone(310,.06)
}
function airborneSkill(){
 if(!rogue||player.jumps<2)return;
 if(perk('needles'))for(const dx of [-100,0,100])shots.push(projectile(player.x,player.y,dx,140,'needle'));
 if(perk('vault'))pulse(player.x,player.y-9,38,1,'#a6eed8');
}
function updateEffects(dt){
 const active=effects;effects=[];
 for(const f of active){f.life-=dt;
  if(f.kind==='ember')for(const e of enemies)if(e.hp>0&&!f.hits.has(e)&&Math.hypot(e.x-f.x,e.y-f.y)<13){f.hits.add(e);hitEnemy(e,1)}
  if(f.life>0)effects.push(f);
  else if(f.kind==='shade')pulse(f.x,f.y,36,2,'#dbb2fd');
 }
}
function freshRun(){
 const max=profile.owned.includes('heart')?5:4,perks={};
 for(const id of ['claw','magnet'])if(profile.owned.includes(id))perks[id]=1;
 return {seed:Math.floor(Math.random()*4294967295),hp:max,max,fish:0,rations:(profile.training.supply||0)*2,tokens:0,kills:0,perks,training:{...profile.training},stage:0}
}
function randomStream(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
let rogue=true,run=profile.expedition||freshRun(),album=profile.album,enemies=[],shots=[],treasures=[],invul=0,swipe=0,cool=0,bladeCool=0,stageRng;
function perk(key){return run.perks[key]||0}
function expeditionStage(){
 resetCombat();stageRng=randomStream(run.seed+Math.imul(level+1,173755));enemies=[];shots=[];treasures=[];cool=bladeCool=swipe=invul=0;
 return buildDistrict();
}
function startClassicCombat(){
 resetCombat();shots=[];enemies=[];treasures=[];invul=swipe=cool=bladeCool=0;
 run={hp:4,max:4,kills:0,fish:0,perks:{},seed:level};
}
function populatePatrols(){
 legacyFoes=enemies.length;
 const rng=randomStream(run.seed+Math.imul(level+13,7919));
 let group=0;
 for(let i=0;i<streetRoute.original;i++){
  const r=platforms[i];
  if(rogue?(!r.room||['P','F','E'].includes(r.room.mark)):(i===0||isExit(i)||['M','C','F'].includes(r.type)))continue;
  const squad=enemies.filter(e=>e.home===i);
  const wanted=1+Number(group++%(level<2?3:2)===0||level>=5&&r.room?.mark==='K');
  while(squad.length<wanted){
   const pick=rng();
   const kind=level>=2&&pick>.81&&!squad.some(e=>e.kind==='sentry')?'sentry':level>0&&pick>.45?'bat':'rat';
   const e={kind,home:i,phase:rng()*6.28,hp:kind==='sentry'?3:2,fire:1.25+rng(),flash:0};
   enemies.push(e);squad.push(e);
  }
  squad.forEach((e,j)=>{
    e.lane=squad.length===1?.5:j===0?.28:.73;e.span=squad.length===1?.28:.16;
    e.x=r.x+r.w*e.lane;e.y=streetTop(e.x,r.y,7)-(e.kind==='bat'?24:7);e.wind=0;e.rest=0;
  });
 }
}
function journalText(){return '街区藏品 '+album.length+' / 8　·　'+(album.map(i=>relics[i]).join('、')||'沿高架支路寻找紫色徽章')}
function stageTip(){return isDesktop()?'寻找金色灯芯，点亮青色出口。按 S 或 ↓ 落到下一层。':'寻找金色灯芯，点亮青色出口。拖动方向轴移动，下拉可落到下一层。'}
function openingTip(){return isDesktop()?'点击招式或按 1–3 开局。收集金色灯芯，前往青色出口。':'选一种起手招式，立即进入横屏战斗。拖动方向轴，下拉落层。收集金色灯芯，前往青色出口。'}
function setRogueIntro(){
 if(!run.attuned){showMutations(true);return}
 modal('intro','MOONCAT  /  EXPEDITION',stages[level].name,stageTip(),'进入战斗')
}
function showMutations(opening){
 modal(opening?'attune':'draft',opening?'MOONCAT  /  FIRST SIGIL':'MOONCAT  /  MUTATION',opening?'月影远征':'招式变异',opening?openingTip():'回复一颗心。选一种新招式，与本轮已有能力叠加。','');
 $('start').hidden=true;
 const available=mutations.filter(m=>!perk(m.key));
 const picks=opening?mutations.slice(0,3):Array.from({length:Math.min(3,available.length)},()=>available.splice(Math.floor(stageRng()*available.length),1)[0]);
 for(const m of picks){
  const button=document.createElement('button'),name=document.createElement('strong'),info=document.createElement('small');
  name.textContent=m.name;info.textContent=m.desc;button.append(name,info);button.onclick=()=>choosePerk(m);$('draft').append(button)
 }
}
function offerPerks(){showMutations(false)}
function choosePerk(m){
 if(state!=='attune'&&state!=='draft')return;
 const opening=state==='attune';run.perks[m.key]=1;run.attuned=true;
 if(!opening){level++;run.stage=level;delete run.snapshot;reset()}
 state='intro';hud();play();saveExpedition()
}
function finishExpedition(dead){
 const result=settleRun(!dead);if(!result)return;
 modal(dead?'lost':'won',dead?'EXPEDITION OVER':'EXPEDITION CLEAR',dead?'今夜暂歇':'黎明已至',
 '抵达第 '+result.stage+' 站，击退 '+result.kills+' 名敌人。带回 '+result.fish+' 条鱼干、'+result.tokens+' 枚徽片和 '+result.xp+' 训练经验。','回到猫窝')

}
function takeHit(fall){
 if(!fall&&invul>0)return;
 run.hp--;tone(115);burst(player.x,player.y-8,'#ff919b');hud();
 if(run.hp<=0){
  if(rogue)finishExpedition(true);
  else{respawn();run.hp=run.max;invul=1.5;hud()}
  return;
 }
 if(fall)respawn();invul=1.5;
}
function hitEnemy(e,damage){
 if(e.hp<=0)return;e.hp-=damage;e.flash=.13;burst(e.x,e.y,'#f9ac93');
 if(e.hp<=0){run.kills++;run.fish++;tone(630);hud();if(perk('bloom'))pulse(e.x,e.y,34,1,'#ffc57e')}
}
function meleeContact(){
 const beat=clawBeat(),reach=clawReach(),facing=swingDir;
 const above=beat.above+(chain===2&&perk('sweep')?12:0);
 const fromX=lastClawX*facing,toX=player.x*facing;
 const left=Math.min(fromX,toX)-4,right=Math.max(fromX,toX)+reach;
 const top=Math.min(lastClawY,player.y)-9-above,bottom=Math.max(lastClawY,player.y)-9+beat.below;
 let impact=false;
 for(const e of enemies){
  if(e.hp<=0||swingHits.has(e))continue;
  const ex=e.x*facing,halfW=e.kind==='bat'?6:7,halfH=e.kind==='rat'?4:6;
  if(ex+halfW<left||ex-halfW>right||e.y+halfH<top||e.y-halfH>bottom)continue;
  swingHits.add(e);impact=true;
  e.stun=beat.stagger+(chain===2&&perk('sweep')?.14:0);e.wind=0;e.offset=(e.offset||0)+facing*(chain===3?9:4);
  hitEnemy(e,1+perk('claw')+Number(chain===3));
  effects.push({kind:'impact',x:e.x,y:e.y,dir:facing,life:.13,max:.13,color:chain===3?'#ffbe73':'#fff1c4'});
 }
 lastClawX=player.x;lastClawY=player.y;
 if(impact){hitStop=Math.max(hitStop,chain===3?.044:.024);tone(chain===3?112:155,.045)}
}
function strike(){
 if(state!=='play'||cool>0)return;
 chain=chainTime>0?(chain%3)+1:1;chainTime=.75;
 swingDir=rolling>0?rollDir:Math.sign(dirInput())||dir;
 const beat=clawBeat();cool=beat.recovery/(1+perk('haste')*.2);swipe=beat.active;
 lastClawX=player.x;lastClawY=player.y;swingHits.clear();meleeContact();tone(210+chain*55,.055);
 if(chain===3&&perk('quake'))pulse(player.x+swingDir*12,player.y-5,48,2,'#ffcf87');
 if(bladeCool<=0&&(perk('fan')||perk('returning')||perk('frost'))){
  for(const vy of perk('fan')?[-52,0,52]:[0])shots.push(projectile(player.x+7*swingDir,player.y-10,220*swingDir,vy));
  bladeCool=.95/(1+perk('haste')*.18);
 }
}
function fight(dt){
 rolling=Math.max(0,rolling-dt);rollWait=Math.max(0,rollWait-dt);chainTime=Math.max(0,chainTime-dt);
 $('roll').setAttribute('aria-disabled',String(rollWait>0));updateEffects(dt);
 invul=Math.max(0,invul-dt);swipe=Math.max(0,swipe-dt);cool-=dt;bladeCool-=dt;
 if(swipe>0)meleeContact();
 if(held.has('attack')||player.attackBuffer>0){if(cool<=0){strike();player.attackBuffer=0}}
 player.attackBuffer=Math.max(0,player.attackBuffer-dt);
 for(const e of enemies){
   if(e.hp<=0)continue;
   e.flash=Math.max(0,e.flash-dt);
   if(e.frozen>0){e.frozen-=dt;continue}
   const r=platforms[e.home],speed=e.kind==='bat'?1.8:1.1;
   const stunned=e.stun>0;
   e.stun=Math.max(0,(e.stun||0)-dt);e.rest=Math.max(0,(e.rest||0)-dt);
   if(stunned||e.wind>0)e.phase-=dt*speed;
   const a=elapsed*speed+e.phase;
   e.offset=(e.offset||0)*Math.exp(-dt*5);
   const patrol=r.w*(e.lane+Math.sin(a)*(e.kind==='sentry'?0:e.span))+e.offset;
   e.x=r.x+Math.max(6,Math.min(r.w-6,patrol));e.y=Math.min(r.y-(e.kind==='bat'?24+Math.sin(a*1.7)*10:7),streetTop(e.x,r.y,7)-7);
   if(stunned)continue;
   const dx=Math.abs(player.x-e.x),dy=Math.abs(player.y-9-e.y);
   if(e.kind==='sentry'&&dx<148&&dy<23){
     e.fire-=dt;if(e.fire<=0){shots.push({x:e.x,y:e.y-2,v:82*Math.sign(player.x-e.x||1),life:1.9,enemy:true});e.fire=2.2}
   }
   if(e.wind>0){
     e.wind-=dt;
     if(e.wind<=0){if(dx<19&&dy<13)takeHit(false);e.rest=.75;if(state!=='play')return}
   }else if(e.rest<=0&&dx<15&&dy<12)e.wind=.17;
 }
 for(const b of shots){b.life-=dt;b.age=(b.age||0)+dt;
   if(b.kind==='moon'&&perk('returning')&&!b.turned&&b.age>.39){b.turned=true;b.v*=-1;b.vy*=-1;b.hits.clear()}
   b.x+=b.v*dt;b.y+=(b.vy||0)*dt;
   if(b.enemy&&perk('mirror')&&swipe>0&&(b.x-player.x)*dir>=-3&&(b.x-player.x)*dir<38&&Math.abs(b.y-player.y+9)<16){b.enemy=false;b.kind='mirror';b.v=dir*225;b.hits=new Set();b.life=.9;burst(b.x,b.y,'#b6fffc')}
   if(b.enemy){if(Math.abs(b.x-player.x)<8&&Math.abs(b.y-player.y+9)<9){b.life=0;takeHit(false);if(state!=='play')return}}
   else for(const e of enemies){if(e.hp>0&&!b.hits.has(e)&&Math.abs(b.x-e.x)<10&&Math.abs(b.y-e.y)<10){b.hits.add(e);hitEnemy(e,b.kind==='mirror'?2:1);if(b.kind==='moon'&&perk('frost'))e.frozen=.88;if(!(b.kind==='moon'&&perk('returning'))&&b.hits.size>perk('pierce')){b.life=0;break}}}
 }
 shots=shots.filter(b=>b.life>0);
 for(const t of treasures){if(t.taken||Math.hypot(player.x-t.x,player.y-9-t.y)>14+perk('magnet')*6)continue;t.taken=true;
   if(t.type==='seal'){district.lit++;t.room.collected=true;if(district.lit===district.required)tone(1240,.2)}
   else if(t.type==='relic'){run.tokens=(run.tokens||0)+1;if(!album.includes(level))album.push(level);$('hint').textContent='图鉴已收录 · '+relics[level]}
   else{run.fish+=3;$('hint').textContent='打开补给箱 · 获得 3 条鱼干'}
   burst(t.x,t.y,'#ead0ff');tone(970);hud()
 }
}
function paintExpedition(){
 for(const f of effects){const x=f.x-cam,y=f.y;
  if(f.kind==='pulse'){const r=f.r*(1-f.life/f.max);g.strokeStyle=f.color;g.lineWidth=2;g.beginPath();g.arc(x,y,Math.max(1,r),0,Math.PI*2);g.stroke()}
  else if(f.kind==='ember'){rect(x-5,y-1,10,2,'#ff816a');rect(x-2,y-2-Math.floor(2*Math.sin(clock*15+x)),3,4,f.color)}
  else{rect(x-7,y-3,13,7,'#a587be');rect(x+3,y-7,7,6,f.color)}
 }
 for(const t of treasures){if(t.taken)continue;const x=t.x-cam,y=t.y+Math.sin(clock*3)*1.5;
   if(t.type==='seal'){disc(x,y,6,'#806044');disc(x,y,4,'#ffd684');rect(x-1,y-8,3,5,'#fff5c5');rect(x-2,y+5,5,2,'#d99b61')}
   else if(t.type==='relic'){disc(x,y,7,'#57396e');disc(x,y,5,'#ca9cef');rect(x-1,y-3,3,6,'#fff0ca');rect(x-3,y-1,7,2,'#fff0ca')}
   else{rect(x-7,y-3,14,9,'#724661');rect(x-7,y-4,14,4,'#e6ac75');rect(x-1,y-2,3,5,'#fff2b4')}
 }
 for(const e of enemies){if(e.hp<=0)continue;const x=e.x-cam,y=e.y,c=e.frozen>0?'#aee8ff':e.flash>0?'#fff6de':e.kind==='sentry'?'#9fb6ca':'#b88bb5';
   if(e.kind==='rat'){line(x-6,y+1,x-13,y-3,'#da99ad');rect(x-7,y-3,13,7,c);rect(x+3,y-6,4,4,c);rect(x+6,y-1,5,3,c);rect(x+5,y-2,2,2,'#ffdd95');rect(x-5,y+4,2,2,dark);rect(x+4,y+4,2,2,dark)}
   else if(e.kind==='bat'){const flap=Math.round(3*Math.sin(clock*13));for(const d of [-1,1]){line(x+d*3,y,x+d*12,y-4+flap,c);line(x+d*3,y+2,x+d*9,y-1+flap,c)}disc(x,y,4,c);rect(x-2,y,4,1,'#ffe495')}
   else{rect(x-7,y-5,14,11,c);rect(x-8,y+4,16,3,'#455069');rect(x-5,y-2,10,3,e.fire<.55?'#ff837b':'#ffd19d')}
 }
 for(const b of shots){const x=b.x-cam;if(b.kind==='needle'){line(x,b.y,x-b.v*.035,b.y-5,'#efc0ff')}else if(b.enemy)disc(x,b.y,3,'#ff886e');else{rect(x-4,b.y,8,2,'#bafbe3');rect(x-1,b.y-2,3,6,'#efffc8')}}
 if(swipe>0){const x=player.x-cam;g.strokeStyle=chain===3?'#ffce86':'#d9ffe9';g.lineWidth=2;g.beginPath();g.arc(x,player.y-10,chain===3?23:16,dir>0?-1.1:2,dir>0?1.0:4.3);g.stroke();for(let i=0;i<3;i++)line(x+dir*(8+i*3),player.y-3,x+dir*(22+i*3),player.y-16+i*2,'#fff1bd')}
}
