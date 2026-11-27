// Run with node tests/street-combat.cjs. Use the live generators and model builders.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');
const scope=vm.createContext({assert,console,clock:0,level:0,dir:1,state:'play',profile:{owned:[],album:[],training:{}},
  player:{x:100,y:80},dirInput:()=>0,burst(){},tone(){},hud(){}});
for(const name of ['stages','district','market','expedition','street-sites','street-fronts','scenery']){
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name+'.js'),'utf8'),scope);
}
vm.runInContext(`
  let streetRoute;
  const boxes=[];
  const tools={box:(...b)=>boxes.push(b),part(){},beam(){},ball(){},sign(){}};
  const fronts=buildStreetFronts(tools), scenery=buildScenery(tools);
  function supports(x,y){
    return boxes.some(([cx,cy,z,w,h,d])=>Math.abs(cy-h/2-y)<.001&&Math.abs(x-cx)<=w/2+.001&&Math.abs(z)<=d/2);
  }
  for(const expedition of [true,false])for(level=0;level<8;level++){
    rogue=expedition;
    if(!rogue)startClassicCombat();
    const {platforms:floors}=rogue?expeditionStage():buildStage(level);
    const oldLength=floors.length,originalEnemies=enemies.length;
    assignStreetSites(floors,level,rogue);
    streetRoute=installStreetRoute(floors,level,rogue);globalThis.platforms=floors;
    populatePatrols();
    assert.equal(streetRoute.original,oldLength);
    assert.ok(enemies.length>originalEnemies);
    if(rogue)assert.ok(enemies.every(e=>!['F','P','E'].includes(floors[e.home].room.mark)));
    const road=floors[streetRoute.roadIndex];
    assert.equal(road.y,streetRoute.roadY);assert.equal(road.w,streetRoute.width);
    for(let lot=0;lot*142<road.w;lot++){
      boxes.length=0;scenery.oppositeBlock(lot,level,road.y);
      for(const x of [0,71,142])assert.ok(supports(lot*142+x,road.y),'missing road mesh');
    }
    assert.ok(floors.some(r=>r.shopProp));
    for(const host of floors.filter(r=>r.landings)){
      boxes.length=0;fronts(host,level);
      for(const r of host.landings)for(const x of [r.x,r.x+r.w/2,r.x+r.w]){
        assert.ok(supports(x,r.y),'no mesh under '+r.site);
      }
    }
  }
  run=freshRun();resetCombat();shots=[];cool=bladeCool=0;
  enemies=[145,146,230,60].map(x=>({x,y:71,hp:8,kind:'rover'}));
  strike();assert.deepEqual(enemies.map(e=>e.hp),[7,7,8,8]);assert.equal(shots.length,0);
  meleeContact();assert.equal(enemies[0].hp,7);
  cool=0;strike();cool=0;strike();assert.equal(enemies[0].hp,4);
  run.perks.fan=1;cool=0;strike();assert.equal(shots.length,3);
`,scope);
console.log('Both modes have a supported street, physical shop landings, populated encounters and opt-in ranged combat.');
