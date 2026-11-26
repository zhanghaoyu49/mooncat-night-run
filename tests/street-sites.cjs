// Run with node tests/street-sites.cjs. Exercise the actual mesh builders using
// the dimensions of the actual collision surfaces in both game modes.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const sandbox=vm.createContext({assert});
for(const file of ['stages','district','street-sites'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file+'.js'),'utf8'),sandbox);
const result=vm.runInContext(`(()=>{
  let count=0;
  const sites=new Set(),types=new Set(),rows=[];
  const api={box:(...a)=>rows.push(a),part:(kind,...a)=>{if(kind==='pad')rows.push(a)},ball(){},beam(){},sign(){}};
  const models=buildStreetSites(api);
  function check(floors,index,expedition){
    assignStreetSites(floors,index,expedition);
    for(const r of floors){
      assert.ok(r.site);sites.add(r.site);types.add(r.type);rows.length=0;
      models.tread(r);const spans=[];
      for(const [x,y,z,w,h,d] of rows){
        assert.ok([x,y,z,w,h,d].every(Number.isFinite));
        if(Math.abs(y-h/2-r.y)<.26 && z-d/2<=0 && z+d/2>=0)spans.push([x-w/2,x+w/2]);
      }
      let to=r.x;
      for(const [a,b] of spans.sort((a,b)=>a[0]-b[0])){if(b<to)continue;assert.ok(a-to<=.65,r.site+' has a gap at '+to);to=Math.max(to,b)}
      assert.ok(to>=r.x+r.w-.65,r.site+' ends before its collision surface');
      rows.length=0;models.structure(r);models.fixedMount(r);
      assert.ok(rows.length>=1);count++;
    }
  }
  for(level=0;level<8;level++){
    check(buildStage(level).platforms,level,false);
    for(let seed=1;seed<=32;seed++){
      let s=seed;stageRng=()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
      enemies=[];treasures=[];check(buildDistrict().platforms,level,true);
    }
  }
  return {platforms:count,objects:sites.size,types:[...types].sort().join('')};
})()`,Object.assign(sandbox,{level:0,stageRng:null,enemies:[],treasures:[]}));
console.log(result);
