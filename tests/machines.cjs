// Run with node tests/machines.cjs. Exercise the attack timers and the actual home wallet.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');
const storage=new Map();
const scope=vm.createContext({assert,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},
  clock:1,elapsed:0,level:3,state:'play',held:new Set(),player:{x:100,y:100,attackBuffer:0},
  platforms:[{x:0,w:200,y:100}],streetTop:(x,y)=>y,$:()=>({setAttribute(){}}),dir:1,
  burst(){},tone(){},hud(){},renderHome(){},homeMessage(){}});
for(const name of ['profiles','expedition','home']){
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name+'.js'),'utf8'),scope);
}
vm.runInContext(`
 renderHome=()=>{};homeMessage=()=>{};
 function encounter(kind,rank){
   run=freshRun();profile.expedition=run;invul=0;shots=[];treasures=[];resetCombat();
   const e={kind,rank,hp:robotHull(kind,rank),maxHp:robotHull(kind,rank),phase:0,home:0,
     x:100,y:93,wind:0,lunge:0,lane:.5,span:0,rest:0,offset:0,flash:0};
   enemies=[e];return e;
 }
 for(const id of Object.keys(chassis)){
   assert.ok(robotHull(id,3)>robotHull(id,2)&&robotHull(id,2)>robotHull(id,1));
   const e=encounter(id,3);player.x=id==='press'?100:117;
   if(id==='rotor')player.y=97;else player.y=100;
   for(let i=0;i<260&&run.hp===run.max;i++){elapsed+=1/120;fight(1/120)}
   assert.ok(run.hp<run.max,id+' did not attack');
   for(const style of ['claw','heavy','bolt','ember','pulse']){
     e.hp=e.maxHp;e.wind=.3;e.lunge=.2;hitEnemy(e,1,{style});
     assert.ok(e.stun>0&&e.wind===0&&e.lunge===0&&e.flash>0,id+' stagger');
   }
   e.hp=1;hitEnemy(e,1);hitEnemy(e,4);
   assert.equal(run.scrap,3);assert.equal(run.log[id],1);assert.ok(effects.some(f=>f.kind==='wreck'));
 }
 const e=encounter('turret',2);
 restoreRobot(e,{kind:'sentry',hp:1});
 assert.equal(e.kind,'turret');assert.equal(e.hp,Math.ceil(e.maxHp/3));
 restoreRobot(e,{kind:'sentry',hp:0});assert.equal(e.hp,0);
 run.scrap=12;run.log={saw:4};settleRun();assert.equal(settleRun(),null);
 assert.equal(profile.scrap,12);assert.equal(profile.machineLog.saw,4);
 moduleAction('breaker',true);moduleAction('breaker',true);moduleAction('breaker',true);
 assert.equal(profile.scrap,0);assert.equal(profile.workshop.breaker,2);
 run=freshRun();assert.equal(moduleRank('breaker'),2);
 profile.module='';assert.equal(moduleRank('breaker'),2);
 assert.equal(loadSlot(1).workshop.breaker,2);assert.equal(loadSlot(2).scrap,0);
`,scope);
console.log('Five attack patterns, all damage sources, grade scaling, legacy health, settlement and workshop passed.');
