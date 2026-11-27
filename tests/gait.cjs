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

// Read touchdown from the posed ankles, rather than from the phase generator.
for(const [speed,order] of [[14,[15,19,7,11]],[128,[15,7,19,11]]]){
  const cat={x:0,y:50,vx:speed,vy:0,ground:true,land:0};
  let before=[],touches=[],suspended=0,wasSuspended=false;
  for(let frame=0;frame<960;frame++){
    const on=pose(cat,1/240).map(paw=>Math.abs(paw[1]-49.04)<.001);
    if(frame>240){
      on.forEach((down,i)=>{if(down&&!before[i])touches.push([7,11,15,19][i])});
      if(on.every(down=>!down)&&!wasSuspended)suspended++;
    }
    wasSuspended=on.every(down=>!down);before=on;
  }
  assert.ok(touches.length>=8);
  const first=order.indexOf(touches[0]);
  touches.forEach((joint,i)=>assert.equal(joint,order[(first+i)%4]));
  if(speed===14)assert.equal(suspended,0);
  else assert.ok(suspended>=Math.floor(touches.length/4)*2-1,'Expected both gallop suspensions');
}
vm.runInContext(`
  {
    const cat={x:0,y:50,vx:0,vy:-147,ground:false,land:0};
    const ankle=i=>FelineRig.transform(i,...tabbyAsset.bones[i][0]);
    function sample(vy,dt){clock+=dt;cat.vy=vy;FelineRig.update(cat,false);return [ankle(15),ankle(19)]}
    const launch=sample(-147,.016);
    for(let i=0;i<20;i++)sample(-100+i*5,.01);
    const apex=sample(0,.01),descent=sample(120,.04);
    if(!(launch[0][0]<apex[0][0]-3 && descent[1][0]>apex[1][0]+1.8))throw Error('Missing hind push or forepaw reach');
    cat.ground=true;cat.land=.115;cat.impactSpeed=135;
    const [rear,front]=sample(0,.01);
    if(!(rear[1]<front[1]-2 && Math.abs(front[1]-49.04)<.01))throw Error('Forepaws should land first');
  }
`,scope);
vm.runInContext(`
  {
    const cat={x:50,y:30,vx:0,vy:0,on:0,ground:true,land:0};
    globalThis.platforms=[{type:'M',x:50}];
    let previous=null;
    for(let k=0;k<120;k++){
      clock+=1/60;platforms[0].x+=.1;cat.x+=.1;FelineRig.update(cat,false);
      const foot=FelineRig.transform(7,...tabbyAsset.bones[7][0]);
      if(previous&&Math.abs(foot[0]-previous[0]-.1)>.001)throw Error('False step on carried deck');
      previous=foot;
    }
    dir=-1;let lifted=false;
    for(let k=0;k<36;k++){
      clock+=1/120;FelineRig.update(cat,false);
      lifted ||= [7,11,15,19].some(i=>FelineRig.transform(i,...tabbyAsset.bones[i][0])[1]<28.5);
    }
    if(!lifted||Math.cos(FelineRig.heading)>-.99)throw Error('Pivot failed to step and face the new direction');
    dir=1;delete globalThis.platforms;
  }
`,scope);
console.log('Walk footfall order, two gallop suspensions, hind push-off and forepaw-first landing passed.');

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
