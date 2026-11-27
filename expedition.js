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
const chassis={
 rover:{name:'巡轨冲车',hp:2,w:8,h:5,speed:1.35,range:37,wind:.26,rest:1.1,color:'#e8b063',detail:'履带亮起后向前冲撞。'},
 rotor:{name:'旋翼截击机',hp:2,w:9,h:5,speed:1.7,range:45,wind:.35,rest:1.3,color:'#83cfce',detail:'悬停锁定后俯冲。'},
 turret:{name:'双管哨塔',hp:3,w:8,h:7,speed:0,range:130,wind:.55,rest:2.2,color:'#ec9484',detail:'双管交替发射脉冲弹。'},
 saw:{name:'切割轮',hp:3,w:8,h:8,speed:1.5,range:43,wind:.30,rest:1.15,color:'#c6c37c',detail:'竖直锯盘加速后横切。'},
 press:{name:'重锤机甲',hp:5,w:11,h:10,speed:.7,range:32,wind:.58,rest:1.65,color:'#b495d2',detail:'抬起双臂，落锤震击地面。'}
};
let lastMachine=null,lastImpactAt=0;
const gradeColors=['#9bc9bd','#ffbd69','#df9cff'];
function robotRank(stage,group,j){
 return stage>=5&&(group+j)%3===0?3:stage>=2&&(group+j)%2===0?2:1;
}
function robotHull(kind,rank){return chassis[kind].hp+2*(rank-1)}
function moduleRank(id){return run.module?.id===id?run.module.rank:0}
function restoreRobot(e,saved){
 const kind=e.kind,rank=e.rank,maxHp=e.maxHp;
 Object.assign(e,saved,{kind,rank,maxHp});
 if(!saved.maxHp){
   const oldMax=saved.kind==='sentry'?3:2;
   e.hp=saved.hp<=0?0:Math.max(1,Math.ceil(maxHp*Math.min(1,saved.hp/oldMax)));
   e.wind=e.lunge=0;
 }
}
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
function resetCombat(){lastMachine=null;hitStop=0;swingHits.clear();rolling=rollWait=chain=chainTime=0;effects=[]}
function pulse(x,y,r,damage,color){
 effects.push({kind:'pulse',x,y,r,life:.24,max:.24,color});
 for(const e of enemies)if(e.hp>0&&Math.hypot(e.x-x,e.y-y)<r)hitEnemy(e,damage,{style:'pulse',color});
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
  if(f.kind==='ember')for(const e of enemies)if(e.hp>0&&!f.hits.has(e)&&Math.hypot(e.x-f.x,e.y-f.y)<13){f.hits.add(e);hitEnemy(e,1,{style:'ember',color:f.color})}
  if(f.life>0)effects.push(f);
  else if(f.kind==='shade')pulse(f.x,f.y,36,2,'#dbb2fd');
 }
}
function freshRun(){
 const max=profile.owned.includes('heart')?5:4,perks={};
 for(const id of ['claw','magnet'])if(profile.owned.includes(id))perks[id]=1;
 return {seed:Math.floor(Math.random()*4294967295),hp:max,max,fish:0,scrap:0,log:{},module:{id:profile.module||'',rank:profile.workshop?.[profile.module]||0},rations:(profile.training.supply||0)*2,tokens:0,kills:0,perks,training:{...profile.training},stage:0}
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
   const kind=level>=2&&pick>.81&&!squad.some(e=>e.kind==='turret')?'turret':level>0&&pick>.45?'rotor':'rover';
   const e={kind,home:i,phase:rng()*6.28,fire:1.25+rng(),flash:0};
   enemies.push(e);squad.push(e);
  }
  squad.forEach((e,j)=>{
    if(group%3===0&&j===0)e.kind=level>=3?'press':'rotor';
    else if((group+j)%3===1)e.kind='saw';
    e.rank=robotRank(level,group,j);e.hp=e.maxHp=robotHull(e.kind,e.rank);
    e.lunge=0;e.aim=1;e.recoil=0;e.stun=0;
    e.lane=squad.length===1?.5:j===0?.28:.73;e.span=squad.length===1?.28:.16;
    e.x=r.x+r.w*e.lane;e.y=streetTop(e.x,r.y,7)-(e.kind==='rotor'?24:chassis[e.kind].h);e.wind=0;e.rest=0;
  });
 }
}
const distressCalls=[
 '夜市的送货车开始冲撞摊位。鱼铺老板把第一枚灯芯的位置留在了卷帘门上。',
 '后巷的门禁只认机器。住户把求救字条系在晾衣绳上。',
 '花房的灌溉机仍在浇水，接管屋顶的旋翼机却把园丁挡在门外。',
 '码头发来一段短波：起重机还在装船，船员已经撤离。',
 '影院的银幕一遍遍播放疏散路线，巡逻机守在出口。',
 '印坊把机器的巡逻时刻印成小报，塞进每扇门缝。',
 '冷库藏着最后一批药品。守门哨塔切断了运药的通道。',
 '广播塔收到了海峡另一端的求救。重启信标，就能把解除封锁的频率传出去。'
];
function journalText(){return '街区广播 · '+distressCalls[level]+'　｜　街区藏品 '+album.length+' / 8　·　'+(album.map(i=>relics[i]).join('、')||'沿高架支路寻找紫色徽章')}
function stageTip(){return isDesktop()?'寻找金色灯芯，点亮青色出口。按 S 或 ↓ 落到下一层。':'寻找金色灯芯，点亮青色出口。拖动方向轴移动，下拉可落到下一层。'}
function openingTip(){return isDesktop()?'守城机群已失控。选招式或按 1–3 出击，夺回灯芯，重启街区出口。':'守城机群已失控。选择起手招式，用方向轴追击机器，夺回灯芯并重启出口。'}
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
 modal(dead?'lost':'won',dead?'EXPEDITION OVER':'EXPEDITION CLEAR',dead?'返回维修站':'八座信标已重启',
 (dead?'':'解除封锁的频率已向海峡另一端播出。')+'抵达第 '+result.stage+' 站，击退 '+result.kills+' 台机器，回收 '+result.scrap+' 个零件。带回 '+result.fish+' 条鱼干、'+result.tokens+' 枚徽片和 '+result.xp+' 训练经验。','回到猫窝')

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
function hitEnemy(e,damage,{style='claw',stagger=.19,facing=0,color='#a8efff'}={}){
 if(e.hp<=0)return;
 lastMachine=e;lastImpactAt=clock;
 const d=facing||Math.sign(e.x-player.x)||1,heavy=style==='heavy';
 e.hp=Math.max(0,e.hp-damage);e.flash=.15;e.damageTime=1.25;
 e.stun=Math.max(e.stun||0,stagger*(1+.18*moduleRank('breaker'))/(1+.12*((e.rank||1)-1)));
 e.recoil=d;e.wind=0;e.lunge=0;e.rest=Math.max(e.rest||0,.24);
 e.offset=Math.max(-15,Math.min(15,(e.offset||0)+d*(heavy?9:4)));
 effects.push({kind:'impact',x:e.x,y:e.y,dir:d,style,life:heavy?.23:.16,max:heavy?.23:.16,color});
 burst(e.x,e.y,color);
 if(e.hp>0)return;
 effects.push({kind:'wreck',x:e.x,y:e.y,life:.44,max:.44,color:chassis[e.kind].color,dir:d});
 run.kills++;run.fish++;
 if(rogue){
   run.log??={};run.log[e.kind]=(run.log[e.kind]||0)+1;
   e.salvaged=(e.rank||1)+(moduleRank('salvage')&&run.kills%3===0?moduleRank('salvage'):0);
   run.scrap=(run.scrap||0)+e.salvaged;
   const medic=moduleRank('medic');if(medic&&run.kills%(10-2*medic)===0)run.hp=Math.min(run.hp+1,run.max);
 }
 tone(heavy?360:490,.08);hud();
 if(perk('bloom'))pulse(e.x,e.y,34,1,'#ffc57e');
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
  const ex=e.x*facing,halfW=chassis[e.kind].w,halfH=chassis[e.kind].h;
  if(ex+halfW<left||ex-halfW>right||e.y+halfH<top||e.y-halfH>bottom)continue;
  swingHits.add(e);impact=true;
  hitEnemy(e,1+perk('claw')+Number(chain===3),{style:chain===3?'heavy':'claw',facing,
    stagger:beat.stagger+(chain===2&&perk('sweep')?.14:0),color:chain===3?'#ffbe73':'#fff1c4'});
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
   const r=platforms[e.home],spec=chassis[e.kind],speed=spec.speed,stunned=e.stun>0;
   e.damageTime=Math.max(0,(e.damageTime||0)-dt);
   e.stun=Math.max(0,(e.stun||0)-dt);e.rest=Math.max(0,(e.rest||0)-dt);
   if(stunned||e.wind>0||e.lunge>0)e.phase-=dt*speed;
   const a=elapsed*speed+e.phase;
   let travel=0,lift=0;
   if(e.lunge>0){
     e.lunge=Math.max(0,e.lunge-dt);
     const arc=Math.sin(Math.PI*e.lunge/.36);
     travel=e.aim*arc*(e.kind==='saw'?34:26);lift=e.kind==='rotor'?arc*16:0;
   }
   e.offset=(e.offset||0)*Math.exp(-dt*5);
   const patrol=r.w*(e.lane+Math.sin(a)*(speed?e.span:0))+e.offset+travel;
   e.x=r.x+Math.max(spec.w,Math.min(r.w-spec.w,patrol));
   const ground=streetTop(e.x,r.y,spec.w);
   e.y=Math.min(r.y-(e.kind==='rotor'?26+Math.sin(a*1.7)*5-lift:spec.h),ground-spec.h);
   if(stunned)continue;
   const dx=Math.abs(player.x-e.x),dy=Math.abs(player.y-9-e.y);
   if(e.lunge>0&&dx<spec.w+7&&dy<spec.h+8&&!e.struck){e.struck=true;takeHit(false);if(state!=='play')return}
   if(e.wind>0){
     e.wind-=dt;
     if(e.wind<=0){
       if(e.kind==='turret'){
         for(const speed of [75,105])shots.push({x:e.x+e.aim*8,y:e.y-2,v:e.aim*speed,life:1.7,enemy:true});
       }else if(e.kind==='press'){
         effects.push({kind:'pulse',x:e.x,y:ground-2,r:32,life:.25,max:.25,color:'#ee9869'});
         if(dx<32&&Math.abs(player.y-ground)<12)takeHit(false);
       }else{e.lunge=.36;e.struck=false}
       e.rest=spec.rest;if(state!=='play')return;
     }
   }else if(e.rest<=0&&e.lunge<=0&&dx<spec.range&&dy<(e.kind==='rotor'?32:20)){
     e.aim=Math.sign(player.x-e.x)||1;e.wind=spec.wind;
   }
 }
 for(const b of shots){b.life-=dt;b.age=(b.age||0)+dt;
   if(b.kind==='moon'&&perk('returning')&&!b.turned&&b.age>.39){b.turned=true;b.v*=-1;b.vy*=-1;b.hits.clear()}
   b.x+=b.v*dt;b.y+=(b.vy||0)*dt;
   if(b.enemy&&perk('mirror')&&swipe>0&&(b.x-player.x)*dir>=-3&&(b.x-player.x)*dir<38&&Math.abs(b.y-player.y+9)<16){b.enemy=false;b.kind='mirror';b.v=dir*225;b.hits=new Set();b.life=.9;burst(b.x,b.y,'#b6fffc')}
   if(b.enemy){if(Math.abs(b.x-player.x)<8&&Math.abs(b.y-player.y+9)<9){b.life=0;takeHit(false);if(state!=='play')return}}
   else for(const e of enemies){if(e.hp>0&&!b.hits.has(e)&&Math.abs(b.x-e.x)<10&&Math.abs(b.y-e.y)<10){b.hits.add(e);hitEnemy(e,b.kind==='mirror'?2:1,{style:'bolt',facing:Math.sign(b.v),color:perk('frost')?'#a4dfff':'#7ff7d4'});if(b.kind==='moon'&&perk('frost'))e.frozen=.88;if(!(b.kind==='moon'&&perk('returning'))&&b.hits.size>perk('pierce')){b.life=0;break}}}
 }
 shots=shots.filter(b=>b.life>0);
 for(const t of treasures){if(t.taken||Math.hypot(player.x-t.x,player.y-9-t.y)>14+perk('magnet')*6)continue;t.taken=true;
   if(t.type==='seal'){district.lit++;t.room.collected=true;if(district.lit===district.required)tone(1240,.2)}
   else if(t.type==='relic'){run.tokens=(run.tokens||0)+1;if(!album.includes(level))album.push(level);$('hint').textContent='图鉴已收录 · '+relics[level]}
   else{run.fish+=3;$('hint').textContent='打开补给箱 · 获得 3 条鱼干'}
   burst(t.x,t.y,'#ead0ff');tone(970);hud()
 }
}
