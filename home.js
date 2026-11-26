let homeTab='room', lastSaveAt=0;
const homeCategories={room:'阁楼',buff:'增益',skin:'毛色',bed:'猫窝',display:'摆件',album:'图鉴'};
function homeMessage(message){$('homeStatus').textContent=storageWarning||message||''}
function encodeObjects(objects){
  return objects.map(o=>({...o,hits:o.hits?Array.from(o.hits,e=>enemies.indexOf(e)):undefined}));
}
function decodeObjects(objects){
  return objects.map(o=>({...o,hits:o.hits?new Set(o.hits.map(i=>enemies[i]).filter(Boolean)):undefined}));
}
function saveExpedition(){
  if(!rogue||!['play','paused','draft','attune','intro'].includes(state)||!player)return;
  run.snapshot={stage:level,phase:state==='draft'?'draft':'field',player:{...player,jumpBuffer:0,attackBuffer:0},
    checkpoint,elapsed,dir,cam,camY,invul,lit:district.lit,
    items:items.map(i=>i.taken),loot:treasures.map(i=>i.taken),
    combat:{shots:encodeObjects(shots),effects:encodeObjects(effects),swung:Array.from(swingHits,e=>enemies.indexOf(e)),rolling,rollDir,rollWait,swipe,chain,chainTime,cool,bladeCool},
    floors:platforms.map(r=>[r.x,r.crack]),foes:enemies.map(e=>({...e}))};
  profile.expedition=run;writeSlot();lastSaveAt=performance.now();
}
function restoreField(){
  const s=run.snapshot;
  if(!s||s.stage!==level||s.foes.length!==enemies.length||s.floors.length!==platforms.length)return;
  Object.assign(player,s.player);checkpoint=s.checkpoint;elapsed=s.elapsed;dir=s.dir;
  cam=s.cam;camY=s.camY;invul=s.invul;district.lit=s.lit;
  platforms.forEach((r,i)=>{[r.x,r.crack]=s.floors[i]});
  items.forEach((item,i)=>item.taken=s.items[i]);
  treasures.forEach((t,i)=>{t.taken=s.loot[i];if(t.type==='seal')t.room.collected=t.taken});
  enemies.forEach((e,i)=>Object.assign(e,s.foes[i]));
  if(s.combat){
    ({rolling,rollDir,rollWait,swipe,chain,chainTime,cool,bladeCool}=s.combat);
    shots=decodeObjects(s.combat.shots);effects=decodeObjects(s.combat.effects);
    for(const i of s.combat.swung)if(enemies[i])swingHits.add(enemies[i]);
  }
  hud();
}
function settleRun(){
  const trip=profile.expedition;
  if(!trip)return null;
  const result={fish:trip.fish,tokens:trip.tokens||0,stage:trip.stage+1,kills:trip.kills};
  profile.fish+=result.fish;profile.tokens+=result.tokens;profile.trips++;
  profile.expedition=null;profile.receipt=result;
  return writeSlot()?result:null;
}
function enterHome(save=true){
  if(save)saveExpedition();
  clearControls();if($('map').open)$('map').close();
  state='home';$('overlay').hidden=true;$('home').hidden=false;
  arena.dataset.home='true';homeTab='room';rogue=true;
  album=profile.album;records=profile.records;renderHome();
}
function depart(){
  rogue=true;run=profile.expedition||freshRun();profile.expedition=run;
  if(!writeSlot())return;
  level=run.stage;arena.dataset.home='false';$('home').hidden=true;
  reset();restoreField();
  if(run.snapshot?.phase==='draft')offerPerks();
  else if(!run.attuned)setRogueIntro();
  else{state='intro';play()}
}
function switchSlot(number){
  if(number===slotNumber)return;
  slotNumber=number;profile=loadSlot(number);album=profile.album;records=profile.records;
  try{localStorage.setItem('mooncat-active-home',JSON.stringify(number))}catch{}
  homeTab='room';renderHome();
}
function equipGood(id){
  const item=goods.find(g=>g.id===id);
  if(!item)return;
  const owned=profile.owned.includes(id);
  if(!owned){
    if(profile.fish<(item.fish||0)||profile.tokens<(item.tokens||0))return;
    profile.fish-=item.fish||0;profile.tokens-=item.tokens||0;profile.owned.push(id);
  }
  if(item.type!=='buff')profile[item.type]=id;
  if(!writeSlot())return;
  renderHome();homeMessage(item.type==='buff'?'已兑换，下次新远征生效。':'已换上「'+item.name+'」。');
}
function renderHome(){
  const trip=profile.expedition,receipt=profile.receipt;
  $('homeBalance').textContent='鱼干 '+profile.fish+'　/　徽片 '+profile.tokens;
  $('slots').innerHTML=[1,2,3].map(n=>'<button data-slot="'+n+'" aria-pressed="'+(n===slotNumber)+'">存档 0'+n+'</button>').join('');
  $('homeTabs').innerHTML=Object.entries(homeCategories).map(([id,label])=>'<button data-page="'+id+'" aria-pressed="'+(id===homeTab)+'">'+label+'</button>').join('');
  const content=$('homePanel');
  if(homeTab==='room'){
    content.innerHTML='<h1>雨巷阁楼</h1><p class="homeLead">'+(trip?'第 '+(trip.stage+1)+' 站 · '+stages[trip.stage].name+'，远征已暂存。':'窗外是夜市。窗内，有一盏为你留的灯。')+'</p>'+
      (receipt?'<p class="receipt">上次带回　'+receipt.fish+' 鱼干 · '+receipt.tokens+' 徽片</p>':'')+
      '<div class="homeActions"><button class="depart" data-action="depart">'+(trip?'继续远征':'出发远征')+'　→</button>'+
      (trip?'<button data-action="retreat">结算本轮</button>':'')+'</div>';
  }else if(homeTab==='album'){
    content.innerHTML='<h2>街区图鉴 <small>'+album.length+' / 8</small></h2><p>找到紫色藏品，可收录图鉴并获得一枚兑换用的徽片。</p><div class="albumGrid">'+relics.map((r,i)=>'<span class="'+(album.includes(i)?'found':'')+'">'+String(i+1).padStart(2,'0')+'　'+(album.includes(i)?r:'待发现')+'</span>').join('')+'</div>';
  }else{
    const titles={buff:'远征增益',skin:'更换毛色',bed:'布置猫窝',display:'窝边陈列'};
    content.innerHTML='<h2>'+titles[homeTab]+'</h2><div class="wares">'+goods.filter(g=>g.type===homeTab).map(item=>{
      const owned=profile.owned.includes(item.id),active=owned&&(item.type==='buff'||profile[item.type]===item.id);
      const price=[item.fish&&item.fish+' 鱼干',item.tokens&&item.tokens+' 徽片'].filter(Boolean).join(' + ');
      const poor=profile.fish<(item.fish||0)||profile.tokens<(item.tokens||0);
      return '<button class="ware" data-item="'+item.id+'" '+(active||(!owned&&poor)?'disabled':'')+'><i style="--chip:'+(item.color||'#eeb679')+'"></i><span><b>'+item.name+'</b><small>'+item.desc+'</small></span><em>'+(active?(item.type==='buff'?'已解锁':'使用中'):owned?'换上':price)+'</em></button>'
    }).join('')+'</div>';
  }
  homeMessage(homeTab==='buff'?'增益在下一次新远征开始时生效。':homeTab==='room'?'远征结束后，剩余鱼干和藏品徽片会带回家。':'');
}
function homeClick(event){
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.slot)switchSlot(+button.dataset.slot);
  if(button.dataset.page){homeTab=button.dataset.page;renderHome()}
  if(button.dataset.item)equipGood(button.dataset.item);
  if(button.dataset.action==='depart')depart();
  if(button.dataset.action==='retreat'){
    $('homePanel').innerHTML='<h2>现在结束这轮远征？</h2><p>带回 '+profile.expedition.fish+' 条鱼干和 '+(profile.expedition.tokens||0)+' 枚徽片。本轮路线与招式随结算结束。</p><div class="homeActions"><button class="depart" data-action="settle">带回战利品</button><button data-page="room">继续保留</button></div>';
  }
  if(button.dataset.action==='settle'){settleRun();renderHome()}
}
