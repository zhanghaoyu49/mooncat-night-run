// One stance travels backwards by exactly the distance the shoulder advances.
function pawCycle(phase,length,duty){
  const t=phase-Math.floor(phase), span=length*duty;
  if(t<duty)return [span*.5-length*t,0];
  const u=(t-duty)/(1-duty),ease=u*u*(3-2*u);
  return [span*(ease-.5)-length*(1-duty)*u*(1-u)*(1-2*u),Math.sin(Math.PI*u)**1.45];
}
const houseCat={x:0,y:0,z:0,vx:0,vy:0,ground:true,land:0,yaw:-.75,habit:'watch',intensity:0};
const homeRoutines=[
  ['watch',.72,0,2.5],['sniff',.63,2,3],['scratch',.89,-13,4],['stretch',.81,3,3],
  ['drink',.565,-6,4],['groom',.73,1,5],['hunt',.81,6,3],['pounce',.85,6,1.5],
  ['knead',.72,0,4],['sleep',.72,0,10],['stretch',.72,0,3],['watch',.65,-11,4],
  ['eat',.59,-6,4],['zoom',.88,6,1.2],['sit',.78,-4,4],
  ['dig',.595,-17.5,3],['bury',.595,-17.5,2.5],['perch',.69,-24,5],['rub',.89,-12,3]
];
// Shuffle outings, retaining the natural sequences of stalking, pouncing and
// resting. Vary the sniffing and lookout spots between visits.
function outings(){
  const groups=[[1],[2,18],[3,4],[5],[6,7],[8,9,10],[11],[12],[13,14],[15,16],[17]];
  for(let n=groups.length-1;n>0;n--){const j=Math.floor(Math.random()*(n+1));[groups[n],groups[j]]=[groups[j],groups[n]]}
  return groups.flat();
}
let homeMotion=null;
function updateResident(w,h,now){
  const p=houseCat;
  if(!homeMotion||now-homeMotion.last>.2){
    homeMotion={index:0,queue:outings(),active:true,age:0,last:now,w,offset:0,raised:0};p.x=w*.72;p.z=0;p.yaw=-1.12;p.vx=0;
  }
  const m=homeMotion,dt=Math.min(.05,Math.max(0,now-m.last));m.last=now;
  p.x*=w/m.w;m.w=w;
  const [habit,u,z,duration]=homeRoutines[m.index];
  const meal=habit==='drink'||habit==='eat',scratching=habit==='scratch';
  const tx=w*u+m.offset+(habit==='pounce'?-3:0)+(meal?11.2:scratching?-3.5:habit==='rub'?-6:0),tz=z+(meal?3.6:scratching?.3:0);
  const dx=tx-p.x,dz=tz-p.z,dist=Math.hypot(dx,dz);
  if(!m.active){
    const step=Math.min(dist,dt*(habit==='zoom'?55:9.5));
    if(dist>.1){p.x+=dx/dist*step;p.z+=dz/dist*step;p.yaw=Math.atan2(-dz,dx)}
    p.vx=dt?step/dt:0;p.habit='walk';p.intensity=0;
    if(dist<.15){m.active=true;m.age=0}
  }else{
    m.age+=dt;p.vx=0;p.habit=habit;
    p.intensity=Math.max(0,Math.min(1,m.age/.55,(duration-m.age)/.55));
    const desired=habit==='scratch'?.19:habit==='eat'||habit==='drink'?Math.PI-.30:habit==='sleep'?-.62:habit==='hunt'||habit==='pounce'?-.08:habit==='watch'?-1.12:-.94;
    const diff=Math.atan2(Math.sin(desired-p.yaw),Math.cos(desired-p.yaw));p.yaw+=diff*(1-Math.exp(-4*dt));
    if(m.age>=duration){
      if(!m.queue.length)m.queue=outings();
      m.index=m.queue.shift();const next=homeRoutines[m.index][0];
      m.offset=['sniff','watch','sit','zoom'].includes(next)?(Math.random()-.5)*w*.046:0;
      m.active=false;m.age=0;
    }
  }
  const onBed=Math.max(0,1-Math.hypot((p.x-w*.72)/15,p.z/8));
  const bedHeight=profile.bed==='capsule'?3.2:profile.bed==='velvet'?2.85:1.05;
  p.y=h*.865-bedHeight*Math.min(1,onBed*3);
  const lift=habit==='perch'&&dist<13?Math.max(0,1-dist/13):0;
  m.raised+=(lift-m.raised)*(1-Math.exp(-11*dt));
  p.y-=10*m.raised+Math.sin(Math.PI*m.raised)*4;
  p.ground=true;p.vy=0;p.land=0;
  if(p.habit==='pounce'){
    const u=Math.min(1,m.age/.76),arc=Math.sin(Math.PI*u);
    p.x=tx+arc*3.2;p.y-=arc*5.3;p.ground=u>=1;
    p.vy=u<1?-Math.cos(Math.PI*u)*Math.PI*5.3/.76:0;
    if(u>=1)p.land=Math.max(0,.115-(m.age-.76));
  }
  return p;
}
const FelineRig=(()=>{
  const rest=tabbyAsset.bones,mats=new Float32Array(rest.length*16);
  const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]);
  const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  const unit=a=>{const n=Math.hypot(...a)||1;return a.map(x=>x/n)};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const yaw=(v,a)=>[Math.cos(a)*v[0]+Math.sin(a)*v[2],v[1],-Math.sin(a)*v[0]+Math.cos(a)*v[2]];
  const pitch=(v,a)=>[v[0]*Math.cos(a)-v[1]*Math.sin(a),v[0]*Math.sin(a)+v[1]*Math.cos(a),v[2]];
  function basis(a,b,guide){const x=unit(sub(b,a)),y=unit(cross(guide,x));return [x,y,cross(x,y)]}
  const restBasis=rest.map(([a,b])=>basis(a,b,[0,0,1]));
  function bind(id,a,b,guide){
    const [start,end]=rest[id],src=restBasis[id],dst=basis(a,b,guide);
    const stretch=Math.hypot(...sub(a,b))/Math.hypot(...sub(start,end));
    const i=id*16;
    for(let c=0;c<3;c++)for(let r=0;r<3;r++)mats[i+c*4+r]=dst[0][r]*src[0][c]*stretch+dst[1][r]*src[1][c]+dst[2][r]*src[2][c];
    for(let r=0;r<3;r++)mats[i+12+r]=a[r]-mats[i+r]*start[0]-mats[i+4+r]*start[1]-mats[i+8+r]*start[2];
    mats[i+15]=1;
  }
  function transform(id,x,y,z){
    const i=id*16;return [0,1,2].map(r=>mats[i+r]*x+mats[i+4+r]*y+mats[i+8+r]*z+mats[i+12+r]);
  }
  let subject,last=-1,angle=0,phase=0,travel=0,previous;
  let eyelid=1;
  function update(p,indoors){
    const dt=Math.max(0,Math.min(.07,clock-last));last=clock;
    const spinning=!indoors&&rolling>0;
    const speed=Math.abs(p.vx),direction=spinning?rollDir:!indoors&&swipe>0?swingDir:Math.abs(p.vx)>4?Math.sign(p.vx):dir;
    const target=indoors?p.yaw:direction<0?Math.PI:0;
    if(subject!==p){subject=p;angle=target;previous=[p.x,p.z||0];travel=0;phase=0}
    let diff=Math.atan2(Math.sin(target-angle),Math.cos(target-angle));
    angle+=Math.max(-dt*22,Math.min(dt*22,diff));
    const distance=Math.min(Math.hypot(p.x-previous[0],(p.z||0)-previous[1]),speed*dt*1.6+.08);
    previous=[p.x,p.z||0];
    const gallop=Math.max(0,Math.min(1,(speed-49)/75));
    const stride=12+gallop*9,duty=.64-.16*gallop;
    if(p.ground&&!spinning)phase+=distance/stride;
    const activity=p.ground&&!spinning&&speed>.4?1:0;
    travel+=(activity-travel)*(1-Math.exp(-16*dt));
    const habit=n=>indoors&&p.habit===n?p.intensity:0;
    const sleep=habit('sleep'),sit=habit('sit')+habit('groom'),stretch=habit('stretch'),scratch=habit('scratch');
    const digging=habit('dig')+habit('bury'),rub=habit('rub');
    const sniff=habit('sniff')+habit('eat')+habit('drink')+habit('hunt')+digging*.6,knead=habit('knead');
    const grooming=habit('groom'),attack=indoors?0:swipe>0?Math.sin(Math.PI*swipe/clawBeat().active):0;
    const breath=Math.sin(clock*(sleep?1.65:2.9))*.13;
    const air=p.ground?0:Math.tanh(p.vy/120), landing=(p.land||0)/.115;
    const wave=Math.sin(phase*Math.PI*4)*travel;
    const hipDrop=sit*6+sleep*7+landing*1.3+breath+wave*.42;
    const chestDrop=sit*.55+sleep*6.6+stretch*4.8+sniff*2.3-scratch*3.8+breath-wave*.23;
    const rollAngle=spinning?(1-rolling/.22)*Math.PI*2:air*.23;
    const pos=pt=>add([p.x,p.y-8,p.z||0],yaw(pitch([pt[0],pt[1]+8,pt[2]],rollAngle),angle));
    const guide=yaw([0,0,1],angle);
    function bone(i,a,b,zGuide=guide){bind(i,pos(a),pos(b),zGuide)}
    const hips=[-6,-10+hipDrop,0],middle=[-1,-10.7+(hipDrop+chestDrop)*.48,0];
    const chest=[4.4,-11+chestDrop,0],neck=[7.5+attack*.8,-14.2+chestDrop+sniff*5.3+sleep*.7+rub*.65*Math.sin(clock*3),rub*1.4];
    bone(0,hips,middle);bone(1,middle,chest);bone(2,chest,neck);
    const look=indoors?(.22*Math.sin(clock*.83)-.22)*(habit('watch')+habit('perch'))-sleep*1.38-grooming*.62+rub*.56*Math.sin(clock*3):0;
    const nod=sniff*(.70+.09*Math.sin(clock*4))+sleep*.48+grooming*(.5+.18*Math.sin(clock*5))+attack*.09;
    bone(3,neck,add(neck,yaw(pitch([3.5,0,0],nod),look)),yaw([0,0,1],angle+look));
    for(let leg=0;leg<4;leg++){
      const i=4+leg*4,rear=leg%2===0,far=leg<2,z=rest[i][0][2];
      const hip=rest[i][0][0],root=[hip,rest[i][0][1]+(rear?hipDrop:chestDrop),z];
      const offset=(far?(1-gallop)*.5+gallop*.13:0)+(rear?0:.23+.28*gallop);
      const [offsetX,lift]=pawCycle(phase+offset,stride,duty);
      const ankle=rest[i+3][0];let x=ankle[0]+offsetX*travel,y=ankle[1]-lift*(2.9+gallop)*travel;
      if(!p.ground){x+=rear?air*3:2+air*2;y-=2.5+(1-Math.abs(air))*2}
      if(spinning){x=hip*.63;y=-4.8}
      if(rear){x+=sit*2.5+sleep*3}else{
        x+=digging*2.2*Math.sin(clock*8+leg*1.6)+stretch*4+scratch*(2.1+Math.cos(clock*8+leg)*1.3)+sleep*.9;
        y-=digging*(.8+Math.sin(clock*8+leg*1.6))*.92+scratch*(8+Math.sin(clock*8+leg)*1.8)+knead*(1+Math.sin(clock*7+leg*2))*.95;
        if(!far){x+=grooming*2.8;y-=grooming*(7+.6*Math.cos(clock*5))}
        if((chain%2===0)===far){x+=attack*7;y-=attack*5}
      }
      const foot=[x,y,z],hock=[x+(rear?-1.12:-.17),y-(rear?2.6:1.8),z];
      const dx=hock[0]-root[0],dy=hock[1]-root[1],len=Math.max(.1,Math.hypot(dx,dy));
      const L=rear?4.7:3.9,bend=Math.sqrt(Math.max(.09,L*L-len*len/4))*(rear?1:-1);
      const knee=[(root[0]+hock[0])*.5+dy/len*bend,(root[1]+hock[1])*.5-dx/len*bend,z];
      const toe=add(foot,[1.72,.28-lift*travel*.65,0]);
      bone(i,root,knee);bone(i+1,knee,hock);bone(i+2,hock,foot);bone(i+3,foot,toe);
    }
    let tail=[-9.25,-10.25+hipDrop,0];
    for(let j=0;j<8;j++){
      const curl=sleep+sit*.72,t=j/7;
      const up=(indoors?1.05:.68)*(1-curl)*(1-travel*.48)+.32*t+air*.19;
      const a=1.1*t+up-.17*Math.sin(clock*2.1-t*3);
      const sideCurl=curl*(1.1+t*2.9);
      const end=add(tail,[-1.98*Math.cos(a)*Math.cos(sideCurl),-1.98*Math.sin(a)*(1-curl)+curl*.23,1.98*Math.sin(sideCurl)+Math.sin(clock*2.1-t*2)*.23]);
      bone(20+j,tail,end);tail=end;
    }
    eyelid=(1-sleep*.97)*(clock%4.35<.16?.12:1);
  }
  return {mats,update,transform,get blink(){return eyelid},get heading(){return angle}};
})();
