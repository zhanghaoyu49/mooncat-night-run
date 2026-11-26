// Run with node tests/gait.cjs. Check contact in world coordinates, after skinning.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const scope = vm.createContext({clock:0,dir:1,rogue:true,rolling:0,swipe:0,chain:0});
for (const file of ['tabby-mesh.js','cat-life.js']){
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),scope);
}
const pose=vm.runInContext(`(p,dt)=>{
  clock+=dt;p.x+=p.vx*dt;FelineRig.update(p,false);
  return [7,11,15,19].map(bone=>FelineRig.transform(bone,...tabbyAsset.bones[bone][0]));
}`,scope);
for(const fps of [30,60,120])for(const speed of [14,64,128])for(const facing of [-1,1]){
  const cat={x:0,y:50,vx:facing*speed,vy:0,ground:true,land:0};
  let before;const samples=[0,0,0,0];
  for(let frame=0;frame<fps*4;frame++){
    const paws=pose(cat,1/fps);
    for(let i=0;i<paws.length;i++){
      const grounded = paw=>Math.abs(paw[1]-(cat.y-.96))<.0001;
      if(frame>fps&&grounded(paws[i])&&grounded(before[i])){
        assert.ok(Math.abs(paws[i][0]-before[i][0])<.012,
          'Planted paw slid at '+speed+' units/s, facing '+facing+' at '+fps+' fps');
        samples[i]++;
      }
    }
    before=paws;
  }
  assert.ok(samples.every(n=>n>=fps*.3),'Expected each foot to plant during the test');
}
console.log('All four paws maintain ground contact in both directions at three speeds and frame rates.');
