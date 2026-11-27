// Surround the traversable objects with full-depth service alleys and shop bays.
// Foreground furniture sits behind the cat's running plane (Z = 0).
// The same dimensions place the collision surface and the mesh in the running lane.
function shopLayout(r,stage){
  const k=r.frontage, spawn=r.room?.mark==='P'||(!r.room&&r.base===0);
  const darkLane=stage===1||stage===6||(!spawn&&(k+stage)%4===2);
  const openBay=(!spawn&&(k+stage)%3===1)||darkLane;
  const faceW=openBay?r.w*.61:r.w+3,faceX=r.base+(openBay?faceW:r.w)/2;
  const storefrontWidth=Math.min(faceW-9,stage===1?46:78),cx=faceX+(openBay?0:(k%2?8:-8));
  return {darkLane,openBay,faceW,faceX,storefrontWidth,cx};
}
function installStreetRoute(floors,stage,expedition){
  const original=floors.length,end=floors[original-1];
  const width=expedition?district.width:end.x+end.w;
  const roadY=expedition?district.height-66:Math.max(...floors.map(r=>r.y))+8;
  const heights={counter:14,bench:18,potting:18,press:18,container:19,case:13,pallet:10};
  for(const r of floors.slice()){
    if(r.host)continue;
    if(r.streetLevel && r.type!=='M' && r.type!=='C'){
      const old=r.y;
      r.y=roadY-(heights[r.site]||0);
      if(r.room){
        for(const t of treasures)if(t.x>=r.x&&t.x<=r.x+r.w&&Math.abs(t.y-old)<20)t.y+=r.y-old;
        r.room.y=r.y;
      }
    }
    if(r.type==='M'||r.type==='C')continue;
    const {darkLane,cx,storefrontWidth}=shopLayout(r,stage);
    const surfaces=[];
    if(!darkLane||stage===6)surfaces.push(['shopAwning',cx,storefrontWidth+6,r.y-(stage===6?39:44)-1.625]);
    if(!darkLane&&stage<2)surfaces.push(['shopCounter',cx-5,20,r.y-9.75]);
    if(darkLane&&stage!==6)surfaces.push(['serviceUnit',r.x+r.w*.24,30,r.y-22]);
    for(const [site,mid,w,y] of surfaces){
      const x=mid-w/2;
      // Leave clearance over the existing stair so a decorative canopy cannot
      // catch the cat again immediately after a deliberate drop.
      if(floors.some(s=>s.host&&Math.abs(s.y-y)<12&&s.base<x+w+4&&s.base+s.w>x-4))continue;
      const prop={site,x,base:x,w,y,type:'U',crack:-1,shopProp:true};
      (r.landings??=[]).push(prop);floors.push(prop);
    }
  }
  floors.push({site:'road',type:'.',base:0,x:0,y:roadY,w:width,crack:-1});
  return {original,roadY,width,roadIndex:floors.length-1};
}
function buildStreetFronts({box,ball,part,beam,sign}){
  const iron='#394a48',zinc='#92998a',umber='#8c6246',mint='#9cdbbb',amber='#ffc483';
  const facadeTiles=[[0,3],[0,2],[1,1],[2,2],[0,3],[2,0],[2,1],[0,2]];
  function slab(x,y,z,w,h,d,color,tile){box(x,y,z,w,h,d,color,4,0,0,0,0,tile)}
  function cable(a,b,sag,color,r=.37){
    let prev=a;
    for(let j=1;j<=6;j++){const t=j/6;
      const pt=a.map((v,k)=>v+(b[k]-v)*t+(k===1?4*t*(1-t)*sag:0));
      beam(...prev,...pt,r,color);prev=pt;
    }
  }
  function lantern(x,y,z){
    beam(x,y-6,z,x,y-3,z,.25,iron);
    part('pad',x,y,z,5.2,6.6,4.3,'#f7b064',.21,.69);
    for(const dy of [-3,3])box(x,y+dy,z,3.8,.55,3.3,iron);
    box(x,y+.3,z+2.2,.6,2.5,.25,'#855940');
  }
  function drain(x,y,z){
    beam(x,y-72,z,x,y-49,z,1.12,zinc);
    beam(x,y-49,z,x+3.5,y-45,z+1,1.12,zinc);
    beam(x+3.5,y-45,z+1,x+3.5,y+4,z+1,1.12,zinc);
    for(let j=0;j<3;j++)part('tube',x+3.5,y-36+j*16,z+1,2.7,.85,2.7,iron);
  }
  function crate(x,y,z,color){
    box(x,y-3.1,z,9,6.2,6.8,color,.36);
    for(const dy of [-5.4,-2])for(const dx of [-2.4,1.7])box(x+dx,y+dy,z+3.45,2.3,.8,.35,iron);
    box(x,y-6.35,z,9.8,.9,7.3,color);
  }
  function stool(x,y,z){
    part('pad',x,y-5.9,z,5.6,.8,5.2,'#c0b79c',.39);
    for(const dx of [-2,2])for(const dz of [-1.8,1.8])beam(x+dx,y-5.6,z+dz,x+dx*1.2,y,z+dz*1.21,.34,zinc);
    box(x,y-10,z-2.3,5.3,.9,.9,'#b7b39b');for(const dx of [-2.1,2.1])beam(x+dx,y-6,z-2.1,x+dx,y-10,z-2.3,.28,zinc);
  }
  function passage(x,y,w,rear,stage){
    // Return walls recede towards a lit door at the other end of the lane.
    const back=rear-69,mid=x+w/2;
    slab(mid,y+1.5,rear-30,w,3,84,'#92958d',4);
    for(const s of [-1,1]){
      const xx=mid+s*(w*.5-1.5);
      slab(xx,y-30,rear-32,3,78,76,s===1?'#8d9a84':'#607d74',5);
      box(xx-s*1.8,y-20,rear-46,.6,34,17,iron);
      for(let k=0;k<5;k++)box(xx-s*2.3,y-20,rear-53+k*3,.6,32,.6,zinc);
      beam(xx-s*2.1,y-53,rear-64,xx-s*2.1,y-53,rear+2,.8,iron);
    }
    slab(mid,y-29,back,w,64,4,'#a49a77',5);
    box(mid+w*.09,y-15,back+2.5,13,31,2,'#6f604b');
    box(mid+w*.09,y-15,back+3.65,10,28,.4,'#edb371',.28,.35);
    box(mid+w*.09,y-32,back+4.4,11,1.15,2,'#ffd995',.20,1.65);
    for(let j=0;j<3;j++)cable([x,y-53-j*4,rear-j*16],[x+w,y-50-j*4,rear-j*16],5+j*.6,iron,.28);
    for(let j=0;j<2;j++)slab(x+6+j*3,y-8,rear-32,2,16,8,'#a4a78f',7);
  }
  function storefront(r,stage){
    const x=r.x,y=r.y,w=r.w,m=x+w/2,k=r.frontage, rear=-34;
    const {darkLane,openBay,faceW,faceX,storefrontWidth,cx}=shopLayout(r,stage);
    // The upper rear wall meets the next storey. Narrow reveals between
    // neighbouring buildings show the distant city and its separate skyline.

    const tile=facadeTiles[stage][k%2];
    const brick=stage===5||stage===4,colour=darkLane?'#829785':'#b1a28b';
    slab(faceX,y-33,rear-5,faceW,87,11,colour,brick?1:5);
    if(openBay)passage(x+faceW,y,w-faceW,rear,stage);
    if(r.streetLevel||!r.room){
      slab(m,y+36,rear-12,w+3,65,28,'#797970',5);
      slab(m,y+9,-19,w,17,33,'#8a9084',4);
    }
    const awning=r.landings?.find(a=>a.site==='shopAwning');
    const counter=r.landings?.find(a=>a.site==='shopCounter');
    const unit=r.landings?.find(a=>a.site==='serviceUnit');
    if(unit){
      const mid=unit.x+unit.w/2;
      slab(mid,unit.y+5,-12,unit.w,10,32,'#8e9b8b',7);
      for(let k=0;k<6;k++)box(mid-9+k*3.5,unit.y+5,4.2,1.1,6,.5,iron);
      for(const dx of [-10,10])beam(mid+dx,unit.y+10,1,mid+dx,unit.y+18,rear+1,.85,zinc);
    }
    // Atlas supplies the worn paint, small printed notices and shelf contents;
    // the reveals, canopy, counter, side walls and equipment have their own depth.
    if(!darkLane||stage===6){
      const hh=stage===6?39:44;
      box(cx,y-hh/2,rear+1.6,storefrontWidth+3,hh+2,4.1,iron);
      box(cx,y-hh/2,rear+3.9,storefrontWidth,hh,.8,'#c1b5a3',8,0,0,0,0,tile);
      for(const d of [-1,1])slab(cx+d*(storefrontWidth*.5+1),y-hh/2,rear+4.7,2.1,hh,5.2,colour,stage===1?5:6);
      const top=awning?awning.y:y-hh-1.625;
      slab(cx,top+.925,awning?-14:rear+7,storefrontWidth+6,1.85,awning?37:13,'#8d8773',7);
      if(awning)for(const d of [-1,1])beam(cx+d*storefrontWidth*.4,top+1,3,cx+d*storefrontWidth*.4,top+13,rear+3,.8,zinc);
      for(const dx of [-1,1])beam(cx+dx*storefrontWidth*.38,y-hh+1,rear+11,cx+dx*storefrontWidth*.38,y-hh+6,rear+1,.63,zinc);
    }else if(k%3===1){
      // Some back doors are bricked in and occupied by a tiled wash station.
      slab(faceX,y-16,rear+2,faceW*.79,31,3,'#91a195',6);
      for(let j=0;j<2;j++){
        const xx=faceX-13+j*15;
        box(xx,y-8,rear+6.5,12,14,7,'#a8afa4',.48);
        part('tube',xx,y-8,rear+10.1,9.4,1.2,9.4,iron,.65,0,0,0,Math.PI/2);
        ball(xx,y-8,rear+10.8,6.6,6.6,.8,'#526764',.77);
      }
      box(faceX,y-34,rear+4,23,1.25,1.8,'#b7dfc5',.25,.95);
    }else if(k%3===0){
      const px=faceX+4;
      slab(px,y-18,rear+2,28,34,3,'#627a73',7);
      for(let j=0;j<8;j++)box(px,y-32+j*3.9,rear+3.8,26,.48,.55,iron);
      for(const xx of [x+5.5,x+9])beam(xx,y-48,rear+5,xx,y-2,rear+5,.8,umber);
      box(px+11,y-12,rear+4.1,1.2,4.5,.9,zinc);
      sign(px-15,y-27,rear+5,4,7,'#c0c6a9',3);
    }else{
      // A recessed sliding security gate with folded metal latticework.
      const dx=faceX+3;
      box(dx,y-18,rear+1,29,36,3,iron);
      for(let j=0;j<7;j++)box(dx-12+j*4,y-18,rear+3.2,.85,34,.8,'#78887b');
      for(let j=0;j<5;j++){beam(dx-13,y-33+j*5,rear+3.5,dx,y-21+j*5,rear+3.5,.34,zinc);
        beam(dx,y-21+j*5,rear+3.5,dx+13,y-33+j*5,rear+3.5,.34,zinc)}
      box(dx+1,y-39,rear+6,22,2.6,4.3,iron);
      box(dx+1,y-38.7,rear+8.4,20,1.0,.8,'#c5ffe3',.23,1.7);
    }
    drain(x+3.8,y,rear+3.7);
    // Windows, lintels and a utility trunk belong to the same building stack.
    const windows=Math.max(1,Math.floor(faceW/32));
    for(let j=0;j<windows;j++){
      const xx=x+(j+.53)*faceW/windows;
      box(xx,y-59,rear+1,15.3,12,2.4,'#45544f');
      box(xx,y-59,rear+2.4,12.9,9.8,.8,(j+k)%3?'#4f6862':'#c6a87a',.49,(j+k)%3?.03:.25);
      box(xx,y-59,rear+3,.75,10.8,.55,zinc);box(xx,y-53.2,rear+4.1,16,1.4,5,zinc);
    }
    for(let j=0;j<3;j++)cable([x-2,y-63-j*2,rear+7+j],[x+w+6,y-66-j*1.7,rear+8+j],7+(k+j)%4,'#373b35',.27+j*.10);
    if(!darkLane){
      const sx=x+faceW*.81, sy=y-42;
      beam(sx,y-55,rear+2,sx,y-55,-15,.62,iron);
      beam(sx,y-54,-15,sx,sy-8,-15,.45,zinc);
      sign(sx,sy,-15,7.9,17.8,k%2?'#eab27c':'#94e3bd',stage*2+(k%2));
    }
    // Dress the actual workspace, keeping the front edge clear to land on.
    if(stage===0||stage===1){
      if(!darkLane){
        for(let j=0;j<3;j++)lantern(cx-storefrontWidth*.34+j*11,y-36,-23);
        const sx=cx-5;
        slab(sx,(counter?.y??y-9.75)+.75,counter?-9:-20,20,1.5,counter?27:8,'#b39269',0);
        for(const dx of [-8,8])for(const z of (counter?[-20,2]:[-20]))box(sx+dx,y-4.2,z,1.3,8.4,2,iron);
        for(let j=0;j<3;j++)part('shade',sx-6+j*5,y-10.5,-19,3.1,1.8,3.1,'#c4c2a9',.38,0,Math.PI);
        stool(sx+16,y,-18);
      }else{
        slab(x+faceW*.18,y-9,-26,7,18,6,'#7e9384',3);
        box(x+faceW*.18,y-12,-22.6,4.2,.55,.6,'#ccd0a5',.25,.52);
      }
      crate(x+9,y,-20,'#687c63');crate(x+10,y-6.6,-20,'#a07652');
    }else if(stage===2){
      slab(m-6,y-4,-20,26,8,11,'#817d65',0);
      for(let j=0;j<7;j++){
        const xx=m-17+j*3.4,h=8+j%4*1.5;
        beam(xx,y-7,-20,xx+1.8,y-7-h,-20,.3,'#799263');
        part('orb',xx+1.1,y-8-h*.5,-20,3.8,h*.87,2.4,j%2?'#719661':'#52816a',.2,0,(j%3-1)*.53);
      }
    }else if(stage===3||stage===5){
      for(let j=0;j<3;j++){
        if(stage===3)crate(x+12+j*9,y,-21,j%2?'#9a7c58':'#637d77');
        else part('tube',x+12+j*6.4,y-4.1,-20,8.2,8.5,8.2,'#ccbaa0',.23,0,0,0,Math.PI/2);
      }
      beam(faceX,y-50,rear+8,faceX+23,y-50,rear+8,1.05,zinc);
      beam(faceX+20,y-50,rear+8,faceX+20,y-25,rear+8,.37,iron);
    }else if(stage===4){
      for(let j=0;j<2;j++){
        const xx=x+9+j*9;box(xx,y-17,-26,7.5,11.5,1.6,umber);box(xx,y-17,-25.1,6.6,10.2,.4,j%2?'#bc806d':'#7fb3ae',.34);
        ball(xx,y-18,-24.7,3,4.2,.35,'#ddc49a');box(xx,y-13,-24.7,4.4,.5,.3,iron);
      }
    }else{
      for(let j=0;j<2;j++){
        const xx=x+14+j*12;slab(xx,y-7,-22,10.5,14,7,'#80948e',3);
        for(let k=0;k<4;k++)box(xx,y-11+k*1.8,-18.3,7,.55,.45,iron);
      }
    }
  }
  return storefront;
}
