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
 {key:'fan',name:'三日月',desc:'月刃分成三路，扇形扫过前方。'},
 {key:'quake',name:'断岳爪',desc:'连续第三爪震地，击中前后两侧的敌人。'},
 {key:'trail',name:'余烬步',desc:'翻滚留下火痕，灼伤追过来的敌人。'},
 {key:'returning',name:'回旋月',desc:'月刃折返，再次击中沿途敌人。'},
 {key:'needles',name:'骤雨羽',desc:'空中再跳时，向斜下方撒出三枚羽刃。'},
 {key:'mirror',name:'镜面爪',desc:'挥爪可以反弹迎面而来的哨兵飞弹。'},
 {key:'bloom',name:'星火印',desc:'击败敌人时引爆星火，波及附近敌人。'},
 {key:'frost',name:'霜纹刃',desc:'月刃冻结目标，暂时阻止移动、开火和碰撞伤害。'},
 {key:'shade',name:'影返步',desc:'翻滚起点留下猫影，稍后替你斩击一次。'},
 {key:'vault',name:'踏风翼',desc:'二段跳时向两侧释放一圈风刃。'}
];
let rolling=0,rollWait=0,rollDir=1,chain=0,chainTime=0,effects=[];
function resetCombat(){rolling=rollWait=chain=chainTime=0;effects=[]}
function pulse(x,y,r,damage,color){
 effects.push({kind:'pulse',x,y,r,life:.24,max:.24,color});
 for(const e of enemies)if(e.hp>0&&Math.hypot(e.x-x,e.y-y)<r)hitEnemy(e,damage);
}
function projectile(x,y,v,vy=0,kind='moon'){
 return {x,y,v,vy,kind,life:1.05,age:0,enemy:false,hits:new Set()};
}
function roll(){
 if(!rogue||state!=='play'||rollWait>0)return;
 rollDir=dirInput()||dir;dir=rollDir;rolling=.22;rollWait=.8;invul=Math.max(invul,.24);swipe=0;
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
const readSaved=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const saveValue=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
function freshRun(){return {seed:Math.floor(Math.random()*4294967295),hp:4,max:4,fish:0,kills:0,perks:{},stage:0}}
function randomStream(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
let rogue=true,run=freshRun(),album=readSaved('mooncat-album',[]),enemies=[],shots=[],treasures=[],invul=0,swipe=0,cool=0,bladeCool=0,stageRng;
if(!Array.isArray(album))album=[];
const savedRun=readSaved('mooncat-expedition',null);
if(savedRun&&Number.isInteger(savedRun.seed)&&Number.isInteger(savedRun.stage)&&savedRun.stage>=0&&savedRun.stage<8&&savedRun.hp>0&&savedRun.perks)run=savedRun;
function perk(key){return run.perks[key]||0}
function expeditionStage(base){
 resetCombat();stageRng=randomStream(run.seed+Math.imul(level+1,173755));enemies=[];shots=[];treasures=[];cool=bladeCool=swipe=invul=0;
 // Insert differently shaped encounters on both sides of the checkpoint.
 const route=base.platforms.slice(),mid=route.findIndex(r=>r.type==='F');
 for(const at of [mid+1,1]){
   const layouts=level<2?['..','...']:['.C.','..M','.S.','...'];
   const pattern=layouts[Math.floor(stageRng()*layouts.length)];
   route.splice(at,0,...Array.from(pattern,(type,i)=>({type,w:type==='.'?97+Math.floor(stageRng()*34):78,y:151+Math.round(stageRng()*12)-i*2,crack:-1})));
 }
 let x=0;
 for(const p of route){p.base=p.x=x;p.w+=Math.floor(stageRng()*11);x+=p.w+32+Math.floor(stageRng()*(12+level*2))}
 const end=route.pop(),ground=route.slice(),fish=[],highways=[];
 for(let i=1;i<ground.length;i++){
   const r=ground[i];fish.push({index:i,high:false,taken:false});
   if(i%3===1&&i<ground.length-1){
     const next=ground[i+1],first=r.x+12,top=r.y-27-stageRng()*4;
     const bridgeStart=first+69,bridgeEnd=next.x+36;
     const upper=[{x:first,y:top,w:45},{x:bridgeStart,y:top-20,w:Math.max(48,bridgeEnd-bridgeStart)},{x:bridgeEnd+19,y:next.y-27,w:46}];
     for(const [k,u] of upper.entries()){
       route.push({...u,base:u.x,type:'U',crack:-1});
       if(k===1)highways.push(route.length-1);
     }
   }
   if(r.type==='F'||r.type==='S'||r.type==='H'||i%2!==1)continue;
   const roll=stageRng(),kind=level>1&&roll>.7?'sentry':level>0&&roll>.37?'bat':'rat';
   enemies.push({kind,home:i,x:r.x+r.w*.6,y:r.y-6,phase:stageRng()*6.28,hp:kind==='sentry'?3:2,fire:1.4,flash:0})
 }
 const chosen=highways[Math.floor(stageRng()*highways.length)];
 for(const i of highways){
   const r=route[i];treasures.push({x:r.x+r.w*.5,y:r.y-12,type:i===chosen?'relic':'cache',taken:false});
 }
 route.push(end);return {platforms:route,items:fish};
}
function journalText(){return '街区藏品 '+album.length+' / 8　·　'+(album.map(i=>relics[i]).join('、')||'沿高架支路寻找紫色徽章')}
function stageTip(){return level===0?'沿屋顶前进，长按攻击挥爪并发射月刃。双跳可上高架，寻找街区藏品。':stages[level].tip+' 高架藏有补给或徽章。'}
function setRogueIntro(){
 if(!run.attuned){showMutations(true);return}
 modal('intro','MOONCAT  /  EXPEDITION',stages[level].name,stageTip(),'进入战斗')
}
function showMutations(opening){
 modal(opening?'attune':'draft',opening?'MOONCAT  /  FIRST SIGIL':'MOONCAT  /  MUTATION',opening?'月影远征':'招式变异',opening?'选一种起手招式，立即进入横屏战斗。左右移动，长按爪击，翻滚闪避。':'回复一颗心。选一种新招式，与本轮已有能力叠加。','');
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
 if(!opening){level++;run.stage=level;reset()}
 saveValue('mooncat-expedition',run);state='intro';hud();play()
}
function finishExpedition(dead){
 saveValue('mooncat-expedition',null);modal(dead?'lost':'won',dead?'EXPEDITION OVER':'EXPEDITION CLEAR',dead?'今夜暂歇':'黎明已至',
 '抵达第 '+(level+1)+' 站 · 击退 '+run.kills+' 名敌人 · 藏品图鉴 '+album.length+'/8。下一轮将生成新路线。','再开一轮')
}
function takeHit(fall){
 if(!fall&&invul>0)return;
 run.hp--;tone(115);burst(player.x,player.y-8,'#ff919b');hud();
 if(run.hp<=0){finishExpedition(true);return}
 if(fall)respawn();invul=1.5;
}
function hitEnemy(e,damage){
 if(e.hp<=0)return;e.hp-=damage;e.flash=.13;burst(e.x,e.y,'#f9ac93');
 if(e.hp<=0){run.kills++;run.fish++;tone(630);hud();if(perk('bloom'))pulse(e.x,e.y,34,1,'#ffc57e')}
}
function strike(){
 if(!rogue||state!=='play'||cool>0||rolling>0)return;
 chain=chainTime>0?(chain%3)+1:1;chainTime=.8;cool=(chain===3?.39:.27)/(1+perk('haste')*.2);swipe=.15;tone(210+chain*55,.06);
 if(chain===3&&perk('quake'))pulse(player.x+dir*12,player.y-5,48,2,'#ffcf87');
 for(const e of enemies){const dx=(e.x-player.x)*dir;if(dx>=-5&&dx<34&&Math.abs(e.y-player.y+9)<18)hitEnemy(e,1+perk('claw'))}
 if(bladeCool<=0){
  for(const vy of perk('fan')?[-52,0,52]:[0])shots.push(projectile(player.x+7*dir,player.y-10,220*dir,vy));
  bladeCool=.95/(1+perk('haste')*.18);
 }
}
function fight(dt){
 rolling=Math.max(0,rolling-dt);rollWait=Math.max(0,rollWait-dt);chainTime=Math.max(0,chainTime-dt);
 $('roll').disabled=rollWait>0;updateEffects(dt);
 invul=Math.max(0,invul-dt);swipe=Math.max(0,swipe-dt);cool-=dt;bladeCool-=dt;
 if(held.has('attack'))strike();
 for(const e of enemies){if(e.hp<=0)continue;if(e.frozen>0){e.frozen-=dt;continue}const r=platforms[e.home],a=elapsed*(e.kind==='bat'?1.8:1.1)+e.phase;
   e.x=r.x+r.w*.5+Math.sin(a)*(e.kind==='sentry'?0:r.w*.32);e.y=r.y-(e.kind==='bat'?24+Math.sin(a*1.7)*10:7);e.flash-=dt;
   if(e.kind==='sentry'&&Math.abs(player.x-e.x)<148){e.fire-=dt;if(e.fire<=0){shots.push({x:e.x,y:e.y-2,v:82*Math.sign(player.x-e.x||1),life:1.9,enemy:true});e.fire=2.2}}
   if(Math.abs(player.x-e.x)<11&&Math.abs(player.y-9-e.y)<11){takeHit(false);if(state!=='play')return}
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
   if(t.type==='relic'){if(!album.includes(level)){album.push(level);saveValue('mooncat-album',album)}$('hint').textContent='图鉴已收录 · '+relics[level]}
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
   if(t.type==='relic'){disc(x,y,7,'#57396e');disc(x,y,5,'#ca9cef');rect(x-1,y-3,3,6,'#fff0ca');rect(x-3,y-1,7,2,'#fff0ca')}
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
