// Run with node tests/gait.cjs. Check contact in world coordinates, after skinning.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const scope = vm.createContext({atob,clock:0,rollDir:1,dir:1,rogue:true,rolling:0,swipe:0,chain:0});
for (const file of ['tabby-mesh.js','cat-surface.js','cat-life.js']){
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

// Check the final, weighted vertices, including the tail, in both renderers.
vm.runInContext(`
  const cat={x:60,y:80,vx:0,vy:0,ground:true,land:0};
  for(const mesh of [readCatSurface(true),readCatSurface(false)]){
    const v=mesh.vertices;
    for(rollDir of [-1,1])for(let frame=0;frame<48;frame++){
      clock+=1/220;rolling=.22*(1-frame/48);
      const ceiling=cat.y-24;
      FelineRig.update(cat,false,ceiling);
      const m=FelineRig.mats;
      for(let i=0;i<v.length;i+=14){
        let y=0;
        for(let j=0;j<4;j++){
          const joint=v[i+6+j]*16;
          y+=v[i+10+j]*(v[i]*m[joint+1]+v[i+1]*m[joint+5]+v[i+2]*m[joint+9]+m[joint+13]);
        }
        if(y>cat.y+.002||y<ceiling-.002)throw Error('roll intersects scenery at frame '+frame);
      }
    }
  }
`,scope);
console.log('Both skinned meshes stay inside floor and overhead clearances throughout a roll.');
