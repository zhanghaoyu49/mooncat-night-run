// All dimensions are in the same world units as the cat and walkable platforms.
function buildScenery({box,ball,part,beam,sign}){
  const steel='#43565b',brass='#a48454',wood='#8f6244',dark='#293337';
  const random=(n)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v)};
  function cityBlock(id,layer,stage,base,spacing){
    const salt=id*29+stage*59+layer*13,r=random(salt),far=layer===1;
    const x=(id+.48)*spacing,y=base,z=far?-365:-178;
    const w=spacing*(.61+.35*r),h=(far?150:104)+(far?200:145)*random(salt+1);
    const depth=far?40:32,face=z+depth*.5;
    box(x,y-h/2,z,w,h,depth,far?'#354e60':'#48555a',6,0,0,0,0,salt);
    box(x,y-h-1,z,w+2,2,depth+2,'#445259',.63);
    box(x+w*.16,y-h-6,z,w*.34,11,depth*.7,steel,.6);
    if(far){beam(x,y-h-5,z,x,y-h-22-r*26,z,.55,'#547081');return}
    for(let k=1;k<4;k++)box(x,y-k*h/4,face,w+1,1.15,3,'#778384',.58);
    const neon=stages[stage].trim;
    // Deep foundations continue through street level below the lowest catwalk.
    box(x,y+105,z,w,210,depth,'#354448',4,0,0,0,0,3);
    box(x,y+13,face+6,w+10,6,21,'#52615e',.65);
    if((id&1)===0){
      for(let j=0;j<3;j++){const by=y-h*.25-j*19,bx=x-w*.19;
        box(bx,by,face+3,w*.38,1.4,7,'#556462',.56);
        for(const k of [-1,0,1])box(bx+k*w*.17,by-2.5,face+5,.55,4.5,.6,'#647a78');
        box(bx,by-4.6,face+5,w*.38,.55,.65,'#82918a');
      }
      const panels=['#ec9e70','#81d3d7','#d48294','#84acab'];
      box(x-w*.37,y-h*.4,face+2.5,1.15,h*.34,1,panels[Math.abs(id+stage)%4],.28,1.4);
    }
    if(id%3!==0){
      box(x+w*.45,y-h*.55,face+2,5.5,h*.32,3,dark);
      sign(x+w*.45,y-h*.55,face+4,4.8,h*.23,id%2?neon:'#ed8978',stage*2);
    }
    const px=x-w*.33;
    if(stage===2){
      for(let k=0;k<6;k++){const a=k*Math.PI/5,b=(k+1)*Math.PI/5;beam(x+Math.cos(a)*w*.43,y-h-1-Math.sin(a)*19,z,x+Math.cos(b)*w*.43,y-h-1-Math.sin(b)*19,z,1.4,'#95ba9f')}
      for(let k=0;k<3;k++)ball(x+(k-1)*8,y-h-7,z,11,17,10,'#587d60');
    }else if(stage===3){
      box(px,y-h-19,z,3,38,5,'#9b7750');beam(px-7,y-h-30,z,px+38,y-h-48,z,1.75,'#ceb080');beam(px,y-h-38,z,px+38,y-h-48,z,.85,steel);beam(px+35,y-h-47,z,px+35,y-h-18,z,.34,dark);
    }else if(stage===4||stage===7){
      for(const side of [-1,1])beam(px+side*6,y-h,z,px,y-h-35,z,.9,steel);
      for(let k=0;k<4;k++)beam(px-8+k,y-h-15-k*6,z,px+8-k,y-h-15-k*6,z,.55,'#a8af9e');
      ball(px,y-h-38,z,1.8,2,1.8,'#f28a65',.2,1.3);
    }else if(stage===5){
      for(let k=0;k<2;k++){part('tube',x+k*9,y-h-14,z,6,30,6,'#90735f');part('tube',x+k*9,y-h-30,z,7,2,7,brass)}
    }else if(stage===6){part('cone',x,y-h-15,z,w*.94,30,depth,'#b3cacf',.4)}
    else{
      part('tube',px,y-h-8,z,15,15,15,'#846e5a');part('cone',px,y-h-18,z,17,6,17,'#5e7174');
      if(stage===1)for(let j=0;j<4;j++)ball(x-w*.4+j*w*.25,y-h*.71,face+2,3.3,4.8,3.2,'#e49c6f',.3,.6);
    }
    for(let k=0;k<4;k++){
      const xx=x+k*spacing/4;
      beam(xx,y-h*.62+Math.sin(k*Math.PI/4)*7,face+2,xx+spacing/4,y-h*.62+Math.sin((k+1)*Math.PI/4)*7,face+2,.42,'#343f43');
    }
  }
  function loft(w,h){
    const floor=h*.865,back=-66,wx=w*.63,windowW=w*.62;
    box(w/2,floor+2,1,w*2,4,177,'#936c50',4,0,0,0,0,0);
    // Return walls and overhead rafters enclose the loft. The opening is empty
    // space: the skyline and its lights are visible through the actual frame.
    const left=wx-windowW/2,right=wx+windowW/2;
    box(left/2-10,35,back,left+20,130,5,'#946e5c',4,0,0,0,0,1);
    box((right+w+15)/2,35,back,w+15-right,130,5,'#876653',4,0,0,0,0,1);
    box(wx,86,back,windowW,33,5,'#795a4e',4,0,0,0,0,1);
    box(wx,-17,back,windowW,38,5,'#725d50',4,0,0,0,0,1);
    for(const side of [-1,1])box(side<0?-4:w+4,39,-37,5,114,62,wood,4,0,0,0,0,0);
    for(let i=0;i<6;i++){
      const x=left+i*windowW/5;box(x,35,back+3,1.7,70,3.7,'#565c55',.78);
      beam(x-2,0,back+4,x,2,back+4,.4,'#aaa083');
    }
    for(const y of [1,22,67])box(wx,y,back+3,windowW+2,1.6,4,'#62675a',.8);
    box(wx,69,back+5,windowW+5,2.6,10,wood,4,0,0,0,0,0);
    for(let i=0;i<7;i++)box(i*w/5-9,-1,-35,3.4,6,82,wood,4,0,0,0,0,0);
    box(w/2,1,back+7,w+12,5,8,wood,4,0,0,0,0,0);
    // Credenza, ceramic planters, records, stereo and two steel speaker grilles.
    const cabinetX=w*.49,cabW=w*.31;
    box(cabinetX,81,-48,cabW,23,14,wood,4,0,0,0,0,0);
    for(let j=0;j<3;j++){const x=cabinetX+cabW*(j-1)/3;
      box(x,81,-40.7,cabW*.305,20,.7,'#80583e',4,0,0,0,0,0);box(x,76,-40,4,.65,1,brass)}
    box(cabinetX,67,-47,14,4.5,7,'#494e4c',.63);box(cabinetX,67,-43,5,1,.6,'#f2b77c',.18,.6);
    for(const s of [-1,1]){box(cabinetX+s*10,65,-47,4.4,8,6,'#625047',.63);ball(cabinetX+s*10,66,-43.7,3.1,3.1,.6,'#272d2f')}
    for(let j=0;j<3;j++){
      const xx=w*.31+j*3.5;part('tube',xx,67,-57,2.3,3.2,2.3,'#a68a70',.48);
    }
    // A roof sign across the lane is visible through the wet window.
    const sx=w*.66,sy=43,sz=-100;
    box(sx,sy,sz,9.4,30,3,'#334746',4,0,0,0,0,3);
    sign(sx,sy,sz+2,7.8,27,'#e79883',0);
    beam(sx+5,sy-12,sz,sx+16,sy-16,sz-12,.9,steel);
    beam(sx+5,sy+12,sz,sx+16,sy+8,sz-12,.9,steel);
    for(let j=0;j<6;j++){
      const x=left+j*windowW/6,nx=left+(j+1)*windowW/6;
      beam(x,19+Math.sin(j*Math.PI/6)*7,-78,nx,19+Math.sin((j+1)*Math.PI/6)*7,-78,.31,'#384348');
      if(j%2)ball(x,20+Math.sin(j*Math.PI/6)*7,-78,1.1,1.5,1.1,'#edbb79',.28,.84);
    }
    const trayX=w*.595;
    box(trayX,floor-.7,-20,13,1.5,8,'#82665b');box(trayX,floor-1.5,-20,11.5,.65,6.6,'#c8ac8b');
    for(const dz of [-3.8,3.8])box(trayX,floor-1.7,-20+dz,13,2,.7,'#967d6c');
    for(const dx of [-6,6])box(trayX+dx,floor-1.7,-20,.7,2,8,'#967d6c');
    const perch=w*.69;
    for(const dx of [-4,4])for(const dz of [-2.8,2.8])box(perch+dx,floor-4,-24+dz,1.3,8,1.3,wood);
    part('pad',perch,floor-9,-24,14,2,10,'#927762',4,0,0,0,0,0);
    const plant=(x,y,z,size)=>{
      part('tube',x,y-size*2,z,size*5.3,size*4,size*5.3,'#a17758',.38);
      for(let j=0;j<11;j++){const a=j*2.4,l=(5+j%4)*size;
        beam(x,y-3*size,z,x+Math.sin(a)*l*.55,y-size*4-l,z+Math.cos(a)*l*.5,.2*size,'#708158');
        part('orb',x+Math.sin(a)*l*.5,y-size*4-l,z+Math.cos(a)*l*.5,3*size,5.2*size,1.4*size,j%2?'#74945d':'#446e50',.12,0,Math.sin(a)*.75,a)}
    };
    plant(right-7,67,-60,1.4);plant(left+10,67,-61,.9);
    // Wall-mounted shelves hold books with separate spines and pottery.
    for(let s=0;s<2;s++){
      const y=34+s*19;box(w*.18,y,back+7,w*.22,1.4,10,wood,4,0,0,0,0,0);
      for(let k=0;k<8;k++){const bh=5+random(k+6*s)*5;box(w*.095+k*2,y-bh/2-1,back+8,1.8,bh,5,['#976b52','#647f72','#bf9676'][k%3],.32,0,k===7?.17:0)}
      plant(w*.245,y-1,back+6,.72);
    }
    // Upholstered armchair: legs, seed-stitch fabric, arms and loose cushion.
    const ax=w*.91,az=-37;
    for(const dx of [-8,8])for(const dz of [-5,5])box(ax+dx,floor-3,az+dz,2,6,2,wood,4,0,0,0,0,0);
    box(ax,floor-8,az,23,8,16,'#955641',4,0,0,0,0,2);
    part('pad',ax,floor-19,az-6.7,23,20,6.5,'#ad6c4a',4,0,0,-.12,-.12,2);
    for(const dx of [-10.5,10.5])part('pad',ax+dx,floor-12.4,az,4.8,8,18,'#a96d52',4,0,0,-.12,0,2);
    part('pad',ax,floor-12.1,az,18.5,4.4,16,'#b28262',4,0,0,-.12,0,2);
    box(ax+4,floor-13.5,az+3,7.7,.9,10,'#839a87',4,0,0,0,0,2);
    box(ax+4,floor-10.8,az+8,7.7,5.5,.9,'#839a87',4,0,0,0,0,2);
    // A bulb nested inside the folded shade casts warm local light.
    const lx=w*.82;part('tube',lx,floor-.7,-49,8,1.4,8,brass);beam(lx,floor-1,-49,lx,41,-49,.6,brass);
    part('shade',lx,42,-49,15,9,15,'#d9b18a',.26,.42);ball(lx,47,-49,5,1.4,5,'#ffd598',.1,1);
    for(const [x,r] of [[.565,2.8],[.59,2.45]]){
      part('tube',w*x,floor-1,-6,r*2,2,r*2,'#a99d85',.7);
      ball(w*x,floor-2,-6,r*1.65,.35,r*1.65,x===.565?'#8ac5c8':'#876545',.55);
    }
    const px=w*.89+4;box(px,floor-.8,-14,7,1.6,6,wood,4,0,0,0,0,0);
    part('tube',px,floor-9,-14,3.7,17,3.7,'#bc9c79',4,0,0,0,0,2);
    for(let k=0;k<9;k++)part('tube',px,floor-2-k*1.7,-14,3.95,.42,3.95,'#927451',.38);
    ball(w*.85+3,floor-1.05,6,2.2,2.2,2.2,'#d09178',.4);
  }
  function landmark(id,stage,base){
    const x=(id+.45)*160,z=-109,ground=base-38,rand=random(id*39+stage);
    const y=ground-20-rand*36;
    if(stage===0){
      const sx=x+12;
      box(sx,y-42,z,2.2,87,3,steel);beam(sx,y-75,z,sx+17,y-75,z,.95,steel);
      sign(sx+14,y-55,z+1,9,38,id%2?'#db8873':'#77c6bf',0);
    }else if(stage===1){
      for(const dx of [-42,42])box(x+dx,y-31,z,3.7,65,5,'#965844',4,0,0,0,0,0);
      box(x,y-62,z,95,3.7,8,'#b78455',4,0,0,0,0,0);
      for(let k=0;k<8;k++){
        const xx=x-43+k*12,yy=y-61+7*Math.sin(Math.PI*k/7);
        beam(xx,yy,z,xx+12,y-61+7*Math.sin(Math.PI*(k+1)/7),z,.48,steel);
        if(k%2===0){beam(xx,yy,z,xx,yy+3,z,.28,wood);ball(xx,yy+7,z,7.6,9,6.8,'#d98766',.18,.62);box(xx,yy+12,z,.8,3.5,.7,brass)}
      }
    }else if(stage===2){
      for(const zz of [z-32,z]){
        for(let j=0;j<8;j++){const a=Math.PI*j/8,b=Math.PI*(j+1)/8;
          beam(x+Math.cos(a)*61,y-26-Math.sin(a)*44,zz,x+Math.cos(b)*61,y-26-Math.sin(b)*44,zz,1.35,'#87aca1');
          if(zz===z)beam(x+Math.cos(a)*61,y-26-Math.sin(a)*44,z,x+Math.cos(a)*61,y-26-Math.sin(a)*44,z-32,.7,'#71988e');
        }
        for(const d of [-61,61])box(x+d,y-10,zz,2.7,34,4,'#66877b');
      }
      for(let j=0;j<7;j++){
        const xx=x-44+j*14,yy=y-20-random(id*19+j)*15;
        beam(xx,y,z-13,xx+3,yy,z-13,1.3,'#5b7151');
        for(let k=0;k<4;k++)part('orb',xx+(k%2?5:-3),yy+k*3,z-13,5.5,13,5,'#5c8a68',.19,0,k%2?.75:-.7);
      }
    }else if(stage===3){
      box(x-27,y-40,z,5,90,6,'#a28a68',4,0,0,0,0,3);
      beam(x-39,y-80,z,x+51,y-113,z,1.8,'#b5a17d');beam(x-33,y-91,z,x+51,y-113,z,1.15,'#9d9169');
      for(let j=0;j<8;j++)beam(x-36+j*10,y-83-j*3.7,z,x-26+j*10,y-92-j*2.5,z,.72,brass);
      beam(x+48,y-111,z,x+48,y-56,z,.47,steel);
      for(let j=0;j<4;j++){const xx=x-47+(j%3)*30,yy=y-Math.floor(j/3)*13;
        box(xx,yy,z+3,28,12,14,j%2?'#917163':'#62797a',4,0,0,0,0,3);
        for(let k=-11;k<13;k+=4)box(xx+k,yy,z+10.2,.8,10,.62,steel)}
    }else if(stage===4){
      for(let j=0;j<3;j++){const xx=x-33+j*30,ht=64+random(id*4+j)*65;
        box(xx,y-ht/2,z-j*8,18,ht,19,'#5b5266',6,0,0,0,0,id+j);
        part('cone',xx,y-ht-20,z-j*8,21,42,22,'#8c7299',.77,.08);
        box(xx+8,y-ht*.5,z+9-j*8,1,ht,1,'#ce8bc7',.35,.9)}
    }else if(stage===5){
      for(let j=0;j<3;j++){const xx=x-29+j*26;
        part('tube',xx,y-13,z,24,36,24,'#a89a89',.67);
        part('cone',xx,y-33,z,25,8,25,'#6d7880',.72);
        if(j!==1)part('tube',xx,y-49,z,5,35,5,'#896f5f',.72);
      }
      beam(x-44,y-11,z+13,x+49,y-11,z+13,2.6,'#9c8d70');
    }else if(stage===6){
      box(x,y-30,z-8,109,62,44,'#9aa89d',4,0,0,0,0,7);
      for(let j=0;j<3;j++){
        const xx=x-33+j*32;box(xx,y-18,z+14,22,33,3,'#77938e',4,0,0,0,0,3);
        part('tube',xx,y-67,z,17,14,17,'#85918a',.64);part('tube',xx,y-74,z,18,1.8,18,'#b8c3ba',.68);
      }
      beam(x-52,y-48,z+16,x+52,y-48,z+16,1.6,'#a6b5aa');
    }else{
      const height=94+rand*29;
      for(const zz of [z,z-13]){
        for(const side of [-1,1])beam(x+side*15,y,zz,x+side*1.5,y-height,zz,1.25,'#9d9681');
        for(let j=0;j<8;j++){const r=15-j*1.7;
          beam(x-r,y-j*height/8,zz,x+r-1.7,y-(j+1)*height/8,zz,.85,steel);
          beam(x+r,y-j*height/8,zz,x-r+1.7,y-(j+1)*height/8,zz,.73,steel);}
      }
      beam(x,y-height,z,x,y-height-18,z,.6,brass);ball(x,y-height-19,z,2.2,2.2,2.2,'#ff845e',.16,1.5);
      for(let j=0;j<2;j++){const xx=x-8+j*14,yy=y-height*.66-j*14;ball(xx,yy,z+3,12,10,3,'#a9a799',.77,0,.28,.46);beam(xx,yy,z+4,xx+3,yy-3,z+8,.38,brass)}
    }
  }
  function oppositeBlock(id,stage,road){
    const lot=142,x=id*lot,seed=random(id*31+stage*7),z=-119-seed*17;
    const industrial=[2,3,5,6,7].includes(stage);
    const w=lot*(.73+seed*.18),m=x+w/2,h=industrial?70+seed*96:135+seed*110;
    // A single paved plane runs from the opposite shop doors through Z=0.
    box(x+lot/2,road+2,-66,lot,4,166,'#888e84',4,0,0,0,0,4);
    box(x+lot/2,road+3.1,17,lot,6,1.4,'#697674');
    for(const offset of [18,88])box(x+offset,road-.12,-10,18,.16,1.1,'#ada688');
    box(x+lot*.44,road-.1,10,10,.18,4,'#475553');
    for(let j=-4;j<=4;j+=2)box(x+lot*.44+j,road-.21,10,.6,.1,3.4,'#95a09a');
    box(m,road-h/2,z-16,w,h,33,'#838979',4,0,0,0,0,industrial?7:5);
    box(m,road+43,z-12,w,86,24,'#606b62',4,0,0,0,0,1);
    box(m,road-h,z,w+3,2.7,10,'#75786c',.54);
    const entranceX=x+w*.55;
    box(entranceX,road-18,z+1.8,w*.67,36,2.7,'#ada48c',8,0,0,0,0,industrial?2:Math.abs(id)%2?3:0);
    box(entranceX,road-37,z+5,w*.70,2,10,'#647468',4,0,0,0,0,7);
    const rows=Math.floor((h-44)/27);
    for(let k=0;k<rows;k++){
      const yy=road-51-k*27;
      for(let j=0;j<3;j++){
        const xx=x+w*(.18+.29*j);
        box(xx,yy,z+1,15,12,2,'#324544');
        box(xx,yy,z+2.2,13,10,1,(j+k+id)%3?'#748b84':'#d2aa75',.38,(j+k+id)%3?.04:.27);
        box(xx,yy,z+3,.75,10.8,.75,'#65716a');
      }
      if(k%2===0){
        box(x+w*.28,yy+8,z+5,w*.41,1.3,9,steel);
        for(const xx of [x+w*.09,x+w*.28,x+w*.47])box(xx,yy+4,z+8.3,.65,7,.7,steel);
        box(x+w*.28,yy+.9,z+8.3,w*.4,.65,.7,'#829085');
      }
    }
    const sx=x+w*.88;
    beam(sx,road-82,z+2,sx,road-82,z+20,.78,steel);
    sign(sx,road-60,z+19,10,38,id%2?'#67dcbc':'#eda16c',(stage*2+1)%16);
    beam(x+4,road-h+1,z+3,x+4,road+4,z+3,1.4,'#84988a');
    for(let j=0;j<4;j++){
      const xx=x+lot*j/4,yy=road-76+Math.sin(j*Math.PI/4)*8;
      beam(xx,yy,z+13,xx+lot/4,road-76+Math.sin((j+1)*Math.PI/4)*8,z+13,.48,steel);
    }
  }
  return {loft,cityBlock,landmark,oppositeBlock};
}
