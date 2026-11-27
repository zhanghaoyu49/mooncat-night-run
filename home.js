let homeTab='room', lastSaveAt=0;
const homeCategories={room:'阁楼',training:'训练',workshop:'工坊',buff:'增益',skin:'装扮',bed:'猫窝',display:'摆件',album:'图鉴'};
function homeMessage(message){$('homeStatus').textContent=storageWarning||message||''}
function encodeObjects(objects){
  return objects.map(o=>({...o,hits:o.hits?Array.from(o.hits,e=>enemies.indexOf(e)):undefined}));
}
function decodeObjects(objects){
  return objects.map(o=>({...o,hits:o.hits?new Set(o.hits.map(i=>enemies[i]).filter(Boolean)):undefined}));
}
function saveExpedition(){
  if(!rogue||!['play','paused','draft','attune','intro'].includes(state)||!player)return true;
  run.snapshot={layout:3,market:market?{sign:{...market.sign,hits:[...(market.sign.hits||[])]},fuseBroken:market.fuse.broken}:null,stage:level,phase:state==='draft'?'draft':'field',player:{...player,bounced:[...(player.bounced||[])],noticeTime:0,jumpBuffer:0,attackBuffer:0},
    checkpoint,elapsed,dir,cam,camY,invul,lit:district.lit,
    items:items.map(i=>i.taken),loot:treasures.map(i=>i.taken),
    combat:{shots:encodeObjects(shots),effects:encodeObjects(effects),swung:Array.from(swingHits,e=>enemies.indexOf(e)),rolling,rollDir,rollWait,swipe,chain,chainTime,cool,bladeCool,swingDir,lastClawX,lastClawY},
    floors:platforms.map(r=>[r.x,r.crack]),foes:enemies.map(e=>({...e}))};
  profile.expedition=run;lastSaveAt=performance.now();return writeSlot();
}
function restoreField(){
  const s=run.snapshot;
  const legacy=s&&s.layout===undefined;
  const expectedFloors=legacy?streetRoute.original:(s?.layout===2&&market?market.walls[0]:platforms.length);
  if(!s||s.stage!==level||!s.player||!Number.isFinite(s.player.x)||!Number.isFinite(s.player.y)||
    s.foes?.length!==(legacy?legacyFoes:enemies.length)||s.floors?.length!==expectedFloors||
    s.items?.length!==items.length||s.loot?.length!==treasures.length)return;
  Object.assign(player,s.player);checkpoint=s.checkpoint;elapsed=s.elapsed;dir=s.dir;
  cam=s.cam;camY=s.camY;invul=s.invul;district.lit=s.lit;
  s.floors.forEach(([x,crack],i)=>{platforms[i].x=x;platforms[i].crack=crack});
  if(legacy&&player.ground&&platforms[player.on])player.y=platforms[player.on].y;
  if(market&&s.market){
    const sign=s.market.sign;
    if(sign&&['hung','fall','down'].includes(sign.state))Object.assign(market.sign,{state:sign.state,vy:sign.vy,y:sign.y,hits:sign.hits||[]});
    market.fuse.broken=!!s.market.fuseBroken;
  }
  if(player.hiddenBox&&(!market||Math.abs(player.x-market.box.x)>11||Math.abs(player.y-market.box.ground)>2))player.hiddenBox=false;
  recoverStreetPosition(player,true);
  items.forEach((item,i)=>item.taken=s.items[i]);
  treasures.forEach((t,i)=>{t.taken=s.loot[i];if(t.type==='seal')t.room.collected=t.taken});
  s.foes.forEach((saved,i)=>restoreRobot(enemies[i],saved));
  if(s.combat){
    ({rolling,rollDir,rollWait,swipe,chain,chainTime,cool,bladeCool}=s.combat);
    swingDir=s.combat.swingDir??dir;lastClawX=s.combat.lastClawX??player.x;lastClawY=s.combat.lastClawY??player.y;
    if(legacy){swipe=0;cool=0}
    shots=decodeObjects(s.combat.shots);effects=decodeObjects(s.combat.effects);
    for(const i of s.combat.swung)if(enemies[i])swingHits.add(enemies[i]);
  }
  hud();
}
function settleRun(cleared=false){
  const trip=profile.expedition;
  if(!trip)return null;
  const result={fish:trip.fish,tokens:trip.tokens||0,stage:trip.stage+1,kills:trip.kills,scrap:trip.scrap||0};
  profile.scrap+=result.scrap;
  for(const [id,n] of Object.entries(trip.log||{}))profile.machineLog[id]=(profile.machineLog[id]||0)+n;
  profile.fish+=result.fish;profile.tokens+=result.tokens;profile.trips++;
  result.xp=result.kills+2*(trip.stage+Number(cleared))+2*result.tokens;
  const previousTier=Math.floor(profile.trainingXP/8);
  profile.trainingXP+=result.xp;
  result.points=Math.floor(profile.trainingXP/8)-previousTier;
  profile.trainingPoints+=result.points;
  profile.expedition=null;profile.receipt=result;
  return writeSlot()?result:null;
}
function enterHome(save=true){
  if(save&&!saveExpedition())return;
  clearControls();if($('map').open)$('map').close();
  state='home';$('overlay').hidden=true;$('home').hidden=false;
  arena.dataset.home='true';homeTab='room';rogue=true;
  album=profile.album;records=profile.records;renderHome();
}
function depart(){
  previewGood=null;rogue=true;run=profile.expedition||freshRun();profile.expedition=run;
  if(!writeSlot())return;
  level=run.stage;arena.dataset.home='false';$('home').hidden=true;
  reset();restoreField();
  if(run.snapshot?.phase==='draft')offerPerks();
  else if(!run.attuned)setRogueIntro();
  else{state='intro';play()}
}
function switchSlot(number){
  if(number===slotNumber)return;
  previewGood=null;slotNumber=number;profile=loadSlot(number);album=profile.album;records=profile.records;
  try{localStorage.setItem('mooncat-active-home',JSON.stringify(number))}catch{}
  homeTab='room';renderHome();
}
function equipGood(id){
  const item=goods.find(g=>g.id===id);
  if(!item)return;
  const owned=profile.owned.includes(id);
  if(!owned){
    if(cannotAfford(item))return;
    profile.scrap-=item.scrap||0;profile.fish-=item.fish||0;profile.tokens-=item.tokens||0;profile.owned.push(id);
  }
  previewGood=null;if(item.type!=='buff')profile[item.type]=id;
  if(!writeSlot())return;
  renderHome();homeMessage(item.type==='buff'?'已兑换，下次新远征生效。':'已换上「'+item.name+'」。');
}
function cannotAfford(item){
  return profile.fish<(item.fish||0)||profile.tokens<(item.tokens||0)||profile.scrap<(item.scrap||0);
}
const modules=[
  {id:'breaker',name:'断路爪套',color:'#e8ae84',effect:r=>'受击硬直延长 '+(18*r)+'%'},
  {id:'medic',name:'应急修复泵',color:'#a2d8b3',effect:r=>'每击毁 '+(10-2*r)+' 台机器回复 1 颗心'},
  {id:'salvage',name:'磁吸拾件器',color:'#9fc9de',effect:r=>'每击毁 3 台额外回收 '+r+' 个零件'}
];
function moduleAction(id,build){
  const m=modules.find(m=>m.id===id);if(!m)return;
  const rank=profile.workshop[id]||0;
  if(build){
    const cost=4+rank*4;if(rank>=3||profile.scrap<cost)return;
    profile.scrap-=cost;profile.workshop[id]=rank+1;
  }else if(!rank)return;
  profile.module=id;
  if(writeSlot()){renderHome();homeMessage('已装配「'+m.name+'」，下一轮新远征生效。')}
}
function workshopPanel(){
  return '<h2>零件工坊</h2><p>击毁机器可回收 1 至 3 个零件，结算后带回。每次远征可带一件模组。</p>'+
    modules.map(m=>{
      const rank=profile.workshop[m.id]||0,cost=(rank+1)*4,active=profile.module===m.id;
      return '<article class="moduleRow"><strong>'+m.name+'　'+rank+'/3</strong><small>'+
        (rank?'当前 · '+m.effect(rank)+'　':'')+(rank<3?'下一级 · '+m.effect(rank+1):'')+'</small><div>'+
        (rank<3?'<button data-craft="'+m.id+'" '+(profile.scrap<cost?'disabled':'')+'>'+(rank?'改造':'制作')+' · '+cost+' 零件</button>':'')+
        (rank?'<button data-equip="'+m.id+'" '+(active?'disabled':'')+'>'+(active?'已装配':'装配')+'</button>':'')+'</div></article>';
    }).join('');
}
const trainingTracks=[
  {key:'reach',label:'磨爪练习',desc:'每级增加 5% 爪击距离，三段连击都生效。',color:'#eab584'},
  {key:'roll',label:'绕桩折返',desc:'每级缩短翻滚冷却 0.06 秒。',color:'#93cfc0'},
  {key:'supply',label:'巷口觅食',desc:'每级多带 2 份口粮。检查点回血优先消耗口粮。',color:'#b8c98b'}
];
function learnTraining(key){
  if(!trainingTracks.some(track=>track.key===key))return;
  const rank=profile.training[key]||0;
  if(rank>=3||profile.trainingPoints<1)return;
  profile.training[key]=rank+1;profile.trainingPoints--;
  if(writeSlot()){renderHome();homeMessage('训练完成。下一轮新远征生效。')}
}
function renderHome(){
  const trip=profile.expedition,receipt=profile.receipt;
  $('homeBalance').textContent='鱼干 '+profile.fish+'　/　徽片 '+profile.tokens+'　/　零件 '+profile.scrap;
  $('slots').innerHTML=[1,2,3].map(n=>'<button data-slot="'+n+'" aria-pressed="'+(n===slotNumber)+'">存档 0'+n+'</button>').join('');
  $('homeTabs').innerHTML=Object.entries(homeCategories).map(([id,label])=>'<button data-page="'+id+'" aria-pressed="'+(id===homeTab)+'">'+label+'</button>').join('');
  const content=$('homePanel');
  if(homeTab==='room'){
    content.innerHTML='<h1>雨巷阁楼</h1><p>守城网络失控后，各地的机器封锁了街道。这间阁楼是小猫的维修站。窗边电台正等待八座街区信标重新上线。</p><p class="homeLead" id="homeObservation">'+(trip?'第 '+(trip.stage+1)+' 站 · '+stages[trip.stage].name+'，远征已暂存。':'窗外是夜市。窗内，有一盏为你留的灯。')+'</p>'+
      (receipt?'<p class="receipt">上次带回　'+receipt.fish+' 鱼干 · '+receipt.tokens+' 徽片 · '+(receipt.scrap||0)+' 零件'+(receipt.xp?' · '+receipt.xp+' 训练经验':'')+(receipt.points?' · +'+receipt.points+' 训练点':'')+'</p>':'')+
      '<div class="homeActions"><button class="depart" data-action="depart">'+(trip?'继续远征':'出发远征')+'　→</button>'+
      (trip?'<button data-action="retreat">结算本轮</button>':'')+'</div>';
  }else if(homeTab==='workshop'){
    content.innerHTML=workshopPanel();
  }else if(homeTab==='training'){
    const xp=profile.trainingXP%8;
    content.innerHTML='<h2>阁楼训练 <small>'+profile.trainingPoints+' 训练点</small></h2>'+
      '<p>结算时，每击退一敌得 1 经验，每通过一站或带回一枚徽片得 2 经验。每 8 经验获得 1 训练点。</p>'+
      '<div class="trainMeter"><progress max="8" value="'+xp+'"></progress><small>'+xp+' / 8</small></div>'+
      '<div class="wares">'+trainingTracks.map(t=>{
        const rank=profile.training[t.key]||0;
        return '<button class="ware" data-train="'+t.key+'" '+(rank>=3||profile.trainingPoints<1?'disabled':'')+'><i style="--chip:'+t.color+'"></i><span><b>'+t.label+'　'+rank+' / 3</b><small>'+t.desc+'</small></span><em>'+(rank>=3?'已精通':'1 训练点')+'</em></button>'
      }).join('')+'</div>';
  }else if(homeTab==='album'){
    content.innerHTML='<h2>街区图鉴 <small>'+album.length+' / 8</small></h2><p>找到紫色藏品，可收录图鉴并获得一枚兑换用的徽片。</p><div class="albumGrid">'+relics.map((r,i)=>'<span class="'+(album.includes(i)?'found':'')+'">'+String(i+1).padStart(2,'0')+'　'+(album.includes(i)?r:'待发现')+'</span>').join('')+'</div>';
    content.insertAdjacentHTML('beforeend','<h2>机器回收记录</h2>'+Object.entries(chassis).map(([id,m])=>
      '<article class="moduleRow"><strong>'+m.name+' · 已拆解 '+(profile.machineLog[id]||0)+' 台</strong><small>'+m.detail+
      '　Ⅰ / Ⅱ / Ⅲ 级耐久 '+[1,2,3].map(rank=>robotHull(id,rank)).join(' / ')+'</small></article>').join(''));
  }else{
    const titles={buff:'远征增益',skin:'远征装扮',bed:'布置猫窝',display:'窝边陈列'};
    content.innerHTML='<h2>'+titles[homeTab]+'</h2><div class="wares">'+goods.filter(g=>g.type===homeTab).map(item=>{
      const owned=profile.owned.includes(item.id),active=owned&&(item.type==='buff'||profile[item.type]===item.id);
      const price=[item.fish&&item.fish+' 鱼干',item.tokens&&item.tokens+' 徽片',item.scrap&&item.scrap+' 零件'].filter(Boolean).join(' + ');
      const poor=cannotAfford(item);
      const preview=item.type!=='buff'&&!active;
      return '<div class="goodsRow"><button class="ware" data-item="'+item.id+'" '+(active||(!owned&&poor)?'disabled':'')+'><i style="--chip:'+(item.color||'#eeb679')+'"></i><span><b>'+item.name+'</b><small>'+item.desc+'</small></span><em>'+(active?(item.type==='buff'?'已解锁':'使用中'):owned?'换上':price)+'</em></button>'+(preview?'<button class="preview" data-preview="'+item.id+'" aria-label="预览'+item.name+'" aria-pressed="'+(previewGood?.id===item.id)+'">'+(previewGood?.id===item.id?'还原':item.type==='skin'?'试穿':'试摆')+'</button>':'')+'</div>'
    }).join('')+'</div>';
  }
  homeMessage(homeTab==='training'?'各存档独立训练，升级在下一轮新远征生效。':homeTab==='buff'?'增益在下一次新远征开始时生效。':homeTab==='room'?'远征结算后，可在工坊使用回收零件。':'');
}
function homeClick(event){
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.slot)switchSlot(+button.dataset.slot);
  if(button.dataset.preview){const item=goods.find(g=>g.id===button.dataset.preview&&g.type===homeTab);if(item){previewGood=previewGood?.id===item.id?null:item;renderHome();if(previewGood)homeMessage('正在预览「'+item.name+'」。')}}
  if(button.dataset.page){previewGood=null;homeTab=button.dataset.page;renderHome()}
  if(button.dataset.craft)moduleAction(button.dataset.craft,true);
  if(button.dataset.equip)moduleAction(button.dataset.equip,false);
  if(button.dataset.train)learnTraining(button.dataset.train);
  if(button.dataset.item)equipGood(button.dataset.item);
  if(button.dataset.action==='depart')depart();
  if(button.dataset.action==='retreat'){
    $('homePanel').innerHTML='<h2>现在结束这轮远征？</h2><p>带回 '+profile.expedition.fish+' 条鱼干和 '+(profile.expedition.tokens||0)+' 枚徽片和 '+(profile.expedition.scrap||0)+' 个零件。本轮路线与招式随结算结束。</p><div class="homeActions"><button class="depart" data-action="settle">带回战利品</button><button data-page="room">继续保留</button></div>';
  }
  if(button.dataset.action==='settle'){settleRun();renderHome()}
}

const catHabits={watch:'小猫竖起耳朵，望向窗外。',walk:'小猫离开原地，在阁楼里踱步。',sniff:'小猫低下头，沿着地板嗅闻。',scratch:'小猫把前爪搭上抓柱，交替磨爪。',stretch:'小猫伸出前爪，舒展背脊。',drink:'小猫正在碗边舔水。',groom:'小猫舔着前爪，慢慢梳洗。',hunt:'小猫压低身子，盯住了玩具球。',pounce:'小猫纵身扑向玩具球。',knead:'小猫在窝里交替踩着软垫。',sleep:'小猫收起尾巴，在窝里打盹。',eat:'小猫正在吃碗里的食物。',zoom:'小猫刚刚跑过阁楼，停下来张望。',sit:'小猫坐下来，安静地看了一会儿。',dig:'小猫在砂盆里刨了个小坑。',bury:'小猫用前爪把砂拨了回去。',perch:'小猫跳上矮凳，朝窗外张望。',rub:'小猫侧过头，蹭了蹭抓柱。'};
function observeResident(p){
  if(profile.expedition||homeTab!=='room')return;
  const label=$('homeObservation');
  if(label&&label.dataset.habit!==p.habit){label.dataset.habit=p.habit;label.textContent=catHabits[p.habit]}
}
