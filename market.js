// The market fixtures are deterministic attachments to existing walkable surfaces.
// Append the two maintenance ledges after the original layout to keep old indices valid.
let market=null;
const evolutions={
 flame:{name:'烈焰影猫',key:'trail',rule:'余烬步 · 极限闪避后用强化爪命中',effect:'反击点燃目标脚下并留下延迟爆发的火影'},
 frost:{name:'永冻月轮',key:'quake',rule:'断岳爪 · 第三爪命中露出的弱点',effect:'第三爪命中时放出冰环，冻结附近机器'},
 hunter:{name:'踏月猎手',key:'sweep',rule:'掠风爪 · 借力踩跳后在落地前扑中机器',effect:'踩跳更高，高空扑击击中时震伤周围机器'}
};
function hasEvolution(id){return rogue&&!!run.evolutions?.[id]}
function evolve(id){
 const form=evolutions[id];
 if(!rogue||!perk(form.key)||hasEvolution(id))return;
 (run.evolutions??={})[id]=true;
 marketNotice('招式进化 · '+form.name);tone(1046,.23);hud();
}
function marketNotice(message){
 const label=$('actionNotice');
 if(label){label.textContent=message;label.hidden=false;player.noticeTime=2}
}
function setupMarket(){
 market=null;
 if(level!==0)return;
 const start=platforms[0],awning=start.landings?.find(r=>r.site==='shopAwning');
 const center=awning?awning.x+awning.w/2:start.x+start.w*.50;
 const base=(awning?.y??start.y)-31;
 const walls=[];
 for(const side of [-1,1]){
   const x=center+side*36-5,top=base-(side<0?53:46);
   const n=platforms.length;
   platforms.push({x,base:x,y:top,w:10,underside:base,marketWall:true,site:'marketWall',type:'U',crack:-1});
   walls.push(n);streetRoute.overhangs.push(n);
 }
 const candidates=enemies.slice().sort((a,b)=>Math.abs(a.x-center)+Math.abs(platforms[a.home].y-start.y)*3
   -Math.abs(b.x-center)-Math.abs(platforms[b.home].y-start.y)*3);
 const first=candidates[0],second=candidates.find(e=>e.home!==first?.home)||first;
 function fixture(e,offset){
   const deck=e?platforms[e.home]:start;
   const x=Math.min(deck.x+deck.w-13,Math.max(deck.x+13,(e?.x??center)+offset));
   return {x,ground:streetTop(x,deck.y,7)};
 }
 // Hang the panel over a patrolled strip with a clear drop onto that robot.
 let sign=null,signHost=first;
 for(const e of candidates){
   for(const offset of [0,-10,10,-18,18]){
     const spot=fixture(e,offset);
     const blocked=platforms.some(r=>!r.recessed&&r.crack!==0&&r.x<spot.x+15&&r.x+r.w>spot.x-15&&r.y>spot.ground-34&&r.y<spot.ground-.1);
     if(!blocked){sign=spot;signHost=e;break}
   }
   if(sign)break;
 }
 sign??=fixture(first,0);
 const fuse=fixture(candidates.find(e=>e.home!==signHost?.home)||second,0);
 Object.assign(sign,{y:sign.ground-28,anchor:sign.ground-28,state:'hung',vy:0});
 const x=start.x+start.w*(center>worldWidth()/2?.30:.70);
 market={walls,sign,fuse:{...fuse,broken:false},box:{x,ground:streetTop(x,start.y)}};
}
function toggleCarton(){
 if(!market||!player.ground||rolling>0)return false;
 const box=market.box;
 if(Math.abs(player.x-box.x)>11||Math.abs(player.y-box.ground)>2)return false;
 player.hiddenBox=!player.hiddenBox;player.vx=0;
 player.attackBuffer=0;swipe=0;tone(player.hiddenBox?164:277,.075);
 marketNotice(player.hiddenBox?'纸箱藏身 · 移动或出招离开':'已离开纸箱');
 return true;
}
function wallKick(){
 const p=player;
 if(!market||p.ground||rolling>0||(p.wallKicks||0)>=4)return false;
 for(const i of market.walls){
   const r=platforms[i];
   if(p.y<=r.y+2||p.y-14>=r.underside||p.lastWall===i)continue;
   const direction=p.x<r.x?-1:1;
   const face=direction<0?r.x-streetBodyHalf:r.x+r.w+streetBodyHalf;
   if(Math.abs(p.x-face)>3.0)continue;
   p.wallKicks=(p.wallKicks||0)+1;p.lastWall=i;p.kickTime=.18;p.kickDir=direction;
   p.vx=direction*148;p.vy=-157;p.jumps=Math.max(1,p.jumps);p.jumpBuffer=p.grace=0;dir=direction;
   burst(p.x-direction*9,p.y-8,'#92e0d6');tone(600,.07);return true;
 }
 return false;
}
function attackPathBlocked(x,y,tx,ty){
 const t=(ax,ay,bx,by)=>{
   let lo=0,hi=1;
   for(const [a,b,min,max] of [[x,tx,ax,bx],[y,ty,ay,by]]){
     if(a===b){if(a<=min||a>=max)return false;continue}
     const p=(min-a)/(b-a),q=(max-a)/(b-a);
     lo=Math.max(lo,Math.min(p,q));hi=Math.min(hi,Math.max(p,q));
   }
   return hi>lo+.001;
 };
 return streetRoute.overhangs.some(i=>{const r=platforms[i];return t(r.x,r.y,r.x+r.w,r.underside)})||
 streetRoute.solids.some(i=>{const r=platforms[i];return t(r.x,r.y,r.x+r.w,streetRoute.roadY+1)})||
 platforms.some(r=>!r.recessed&&r.crack!==0&&y<r.y&&ty>r.y&&t(r.x,r.y,r.x+r.w,r.y+.8));
}
function startPounce(){
 const p=player;
 if(p.ground||rolling>0||p.dove||p.kickTime>0)return;
 let best=Infinity;
 for(const e of enemies){
   const dy=e.y-p.y,dx=(e.x-p.x)*swingDir,dist=Math.hypot(dx,dy);
   if(e.hp<=0||dy<9||dy>61||dx< -5||dx>48||dist>=best||attackPathBlocked(p.x,p.y-2,e.x,e.y))continue;
   best=dist;p.diveX=Math.max(-106,Math.min(106,(e.x-p.x)*5));
 }
 if(best===Infinity)return;
 p.dove=true;p.dive=.34;p.vy=Math.max(96,p.vy);tone(255,.08);
}
function robotLanding(p,prev,landing){
 if(p.vy<=0||p.ground||rolling>0||p.hiddenBox)return false;
 let first=null,top=Infinity;
 for(const e of enemies){
   const spec=chassis[e.kind],head=e.y-spec.h;
   if(e.hp<=0||Math.abs(p.x-e.x)>spec.w+3||prev>head+.6||p.y<head||head>=top||
      (landing>=0&&platforms[landing].y<=head+.1)||attackPathBlocked(p.x,prev-.3,e.x,head-.1))continue;
   if(!p.dive&&(p.bounced||[]).includes(enemies.indexOf(e)))continue;
   first=e;top=head;
 }
 if(!first)return false;
 const index=enemies.indexOf(first),dive=p.dive>0;
 if(dive&&p.fromStomp)evolve('hunter');
 if(dive)flameCounter(first);
 hitEnemy(first,dive?3+(p.counterSwing?2:0):1,{style:dive?'heavy':'stomp',stagger:dive?.55:.27,color:dive?'#ffc382':'#acefe1'});
 if(dive&&hasEvolution('hunter'))pulse(p.x,top,26,1,'#bbf2db');
 p.y=top;p.vy=dive?-65:hasEvolution('hunter')?-184:-160;
 p.fromStomp=!dive;p.dive=0;p.kickTime=0;p.jumps=Math.max(1,p.jumps);p.ground=false;p.on=-1;
 (p.bounced??=[]).push(index);
 hitStop=Math.max(hitStop,dive?.042:.018);tone(dive?122:710,.08);
 return true;
}
function strikeFixtures(left,right,top,bottom,facing){
 if(!market)return;
 const touches=(x,y,w,h)=>x*facing+w>=left&&x*facing-w<=right&&y+h>=top&&y-h<=bottom&&!attackPathBlocked(player.x,player.y-9,x,y);
 const {sign,fuse}=market;
 if(sign.state==='hung'&&touches(sign.x,sign.y,15,5)){
   sign.state='fall';sign.vy=18;burst(sign.x,sign.y,'#ffb376');tone(820,.09);
 }
 if(!fuse.broken&&touches(fuse.x,fuse.ground-7,6,7)){
   fuse.broken=true;const y=fuse.ground-7;
   effects.push({kind:'pulse',x:fuse.x,y,r:57,life:.35,max:.35,color:'#9fefff'});
   for(const e of enemies)if(e.hp>0&&Math.hypot(e.x-fuse.x,e.y-y)<=57){
     hitEnemy(e,1,{style:'shock',stagger:1.65,color:'#a9f5ff'});
   }
   tone(78,.27);burst(fuse.x,y,'#afebff');marketNotice('配电箱短路 · 范围内机器瘫痪');
 }
}
function updateSign(dt){
 if(!market||market.sign.state!=='fall')return;
 const s=market.sign,old=s.y;s.vy+=350*dt;s.y=Math.min(s.ground-3,s.y+s.vy*dt);
 for(const [i,e] of enemies.entries())if(e.hp>0&&!(s.hits||[]).includes(i)&&Math.abs(e.x-s.x)<15+chassis[e.kind].w&&
    e.y+chassis[e.kind].h>=old-3&&e.y-chassis[e.kind].h<=s.y+3){
   (s.hits??=[]).push(i);hitEnemy(e,4,{style:'heavy',stagger:.76,color:'#ffaf88'});
 }
 if(s.y===s.ground-3){s.state='down';burst(s.x,s.y,'#f2b685');tone(92,.18)}
}
function enemyAttackContact(){
 if(player.hiddenBox)return;
 if(rolling>.12&&!player.dodged&&player.preciseRoll){
   player.dodged=true;player.counter=1.65;
   effects.push({kind:'pulse',x:player.x,y:player.y-8,r:16,life:.20,max:.20,color:'#b8fff3'});
   tone(920,.09);marketNotice('极限闪避 · 下一爪强化');
 }
 takeHit(false);
}
function flameCounter(e){
 if(!player.counterSwing||player.flameUsed)return;
 evolve('flame');
 if(!hasEvolution('flame'))return;
 player.flameUsed=true;
 effects.push({kind:'ember',x:e.x,y:e.y,life:1.1,max:1.1,color:'#ffa465',hits:new Set()},
   {kind:'shade',x:e.x,y:e.y,life:.33,max:.33,color:'#ff975c'});
}
function weakPoint(e){
 if(e.kind==='rotor')return e.lunge>0&&player.y<e.y+3;
 if(e.kind==='rover')return (e.wind>0||e.lunge>0)&&(player.x-e.x)*e.aim<0;
 if(e.kind==='saw')return e.exposed>0;
 if(e.kind==='turret')return e.wind>0;
 return e.exposed>0;
}

function updateActionNotice(){
 const label=$('actionNotice');
 if(state!=='play'||player.noticeTime>0)return;
 let text='';
 if(player.counter>0)text='反击就绪 · 爪击';
 else if(market){
   const near=(x,y,w,h)=>Math.abs(player.x-x)<w&&Math.abs(player.y-y)<h;
   if(near(market.box.x,market.box.ground,13,3))text=player.hiddenBox?'已藏身 · 移动离开':(isDesktop()?'S / ↓':'方向轴下拉')+' · 藏进纸箱';
   else if(!market.fuse.broken&&near(market.fuse.x,market.fuse.ground,28,16))text='配电箱 · 爪击短路';
   else if(market.sign.state==='hung'&&near(market.sign.x,market.sign.y+12,36,22))text='霓虹招牌 · 爪击击落';
   else if(!player.ground&&market.walls.some(i=>{const r=platforms[i];return near(r.x+r.w/2,(r.y+r.underside)/2+5,24,(r.underside-r.y)/2)}))text='贴墙 · 再按跳跃';
 }
 if(label.textContent!==text)label.textContent=text;
 label.hidden=!text;
}
