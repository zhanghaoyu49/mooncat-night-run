// Each district has a street-level route, an upper route and two ways up a facade.
// These assignments do not consume the expedition random stream, so existing
// saves keep the same rooms, enemies and pickup locations.
const sitePlans=[
  {ground:['paving','counter','paving'],upper:['awning','balcony','kiosk'],steps:['condenser','lightbox','sill','awning']},
  {ground:['stoop','paving','stoop'],upper:['balcony','awning','roof'],steps:['sill','condenser','service','duct']},
  {ground:['bench','potting','paving'],upper:['potting','greenwalk','roof'],steps:['potShelf','sill','bench','greenwalk']},
  {ground:['quay','container','quay'],upper:['container','pallet','gantry'],steps:['pallet','service','cableTray','gantry']},
  {ground:['stoop','case','paving'],upper:['marquee','roof','balcony'],steps:['lightbox','service','awning','sill']},
  {ground:['press','pallet','paving'],upper:['press','pallet','gantry'],steps:['paperShelf','duct','pallet','service']},
  {ground:['dock','pallet','dock'],upper:['chiller','duct','roof'],steps:['condenser','duct','pallet','service']},
  {ground:['dock','case','stoop'],upper:['gantry','roof','case'],steps:['cableTray','service','duct','sill']}
];
function assignStreetSites(floors,stage,expedition){
  const plan=sitePlans[stage];
  for(const [i,r] of floors.entries()){
    const host=r.room||r.host, col=host?.column??i,row=host?.row??0;
    const ground=expedition?host?.row===district.rows-1:i===0||i%4===3;
    const approach=host?col+row:i;
    const pool=ground?plan.ground:plan.upper;
    r.site=r.type==='M'?'shuttle':r.type==='C'?'planks':r.type==='U'?plan.steps[(r.hostStep-1+2*(col%2)+row)%plan.steps.length]:
      r.room?.mark==='P'||i===0?plan.ground[0]:pool[approach%pool.length];
    r.streetLevel=ground;r.frontage=approach;
  }
}
function buildStreetSites({box,ball,part,beam,sign}){
  const zinc='#727e7c',iron='#3b4949',wood='#a57952',ivory='#c3bda7',rust='#8d5741';
  const material=(x,y,z,w,h,d,c,tile)=>box(x,y,z,w,h,d,c,4,0,0,0,0,tile);
  function brackets(x,y,w,reach=-34){
    for(const xx of [x+w*.15,x+w*.84]){
      box(xx,y+6,reach,2.4,17,1.7,iron);
      beam(xx,y+13,reach,xx,y+1,-.5,.77,zinc);
      beam(xx,y+1,reach,xx,y+1,1,.65,zinc);
    }
  }
  function grille(x,y,z,diameter){
    part('tube',x,y,z,diameter,1.1,diameter,'#323b3a',.56,0,0,0,Math.PI/2);
    for(let k=0;k<4;k++){
      const a=k*Math.PI/2+.44;
      part('pad',x+Math.sin(a)*diameter*.19,y+Math.cos(a)*diameter*.19,z+.68,diameter*.20,diameter*.39,.6,'#92958b',.42,0,-a-.46);
    }
    for(let k=-2;k<=2;k++){const h=diameter*Math.sqrt(1-(k*.32)**2);
      box(x+k*diameter*.16,y,z+1.12,.26,h,.3,iron)}
  }
  function condensers(x,y,w){
    const count=Math.max(1,Math.round(w/33)),unit=w/count;
    for(let j=0;j<count;j++){
      const xx=x+unit*(j+.5),h=Math.min(15,unit*.52);
      part('pad',xx,y+h*.5,-5,unit-.25,h,14,'#b0b2a0',.34);
      box(xx,y+.55,-4,unit,1.1,15,'#bac0b0',.47);
      grille(xx-unit*.14,y+h*.53,2.2,h*.76);
      for(let k=0;k<4;k++)box(xx+unit*.28,y+h*.3+k*1.45,2.05,unit*.18,.52,.35,iron);
      beam(xx+unit*.43,y+h-2,-7,xx+unit*.43,y+h+5,-7,.66,'#ac9271');
      beam(xx+unit*.43,y+h+5,-7,xx+unit*.47,y+h+5,-29,.66,'#ac9271');
    }brackets(x,y+1,w);
  }
  function pallets(x,y,w,stack){
    const count=Math.max(1,Math.round(w/34)),u=w/count;
    for(let j=0;j<count;j++)for(let h=0;h<stack;h++){
      const xx=x+j*u,yy=y+h*5;
      material(xx+u/2,yy+.65,-4,u,1.3,15,wood,0);
      for(const f of [.13,.50,.87])material(xx+u*f,yy+2.55,-4,3,2.8,13,'#896445',0);
      box(xx+u/2,yy+4.45,-4,u,1.1,14,'#9d7352');
    }
  }
  function tread(r){
    const {x,y,w,site}=r,m=x+w/2,k=r.frontage||0;
    switch(site){
    case 'paving':case 'stoop':case 'quay':case 'dock':{
      const quay=site==='quay',deep=site==='dock'?16:site==='stoop'?8:12;
      material(m,y+deep/2,-8,w,deep,25,quay?'#968e78':'#a1a398',4);
      material(m,y+deep+19,-16,w-1,38,16,'#76796c',5);
      for(let j=0;j<w;j+=17){const width=Math.min(17,w-j);box(x+j+width/2,y+1.0,4.2,width-.22,2,.9,'#918f7c',.47)}
      if(quay){for(const xx of [x+8,x+w-8]){part('tube',xx,y-1.7,-14,3.6,3.4,3.6,iron);ball(xx,y-3.45,-14,4.5,1.6,4.5,iron)}}
      else{
        box(x+w*.73,y+.02,-4,11,.16,6,iron);
        for(let j=-4;j<=4;j+=2)box(x+w*.73+j,y-.07,-4,.7,.24,5,zinc);
      }
      break;
    }
    case 'condenser':case 'chiller':condensers(x,y,w);break;
    case 'counter':case 'kiosk':case 'awning':case 'marquee':{
      const canopy=site!=='counter',cloth=site==='awning',color=site==='marquee'?'#8a524c':cloth?(k%2?'#b08067':'#69887d'):'#6f8580';
      if(canopy)material(m,y+.66,-5,w,1.32,19,color,cloth?2:7);
      else material(m,y+1,-5,w,2,19,'#b2a184',0);
      const h=canopy?4.2:14;
      if(site==='marquee'){
        material(m,y+h/2,2,w,h,1.6,'#c3a77c',2);
        for(let j=3;j<w;j+=6)ball(x+j,y+2.2,3.3,.88,.88,.64,'#ffe0a7',.22,.84);
      }else if(cloth){
        for(let j=0;j<w;j+=8){const ww=Math.min(8,w-j);
          part('pad',x+j+ww/2,y+1.9,4,ww,3.7,1.2,Math.floor(j/8)%2?color:'#c6ac89',.22)}
      }else material(m,y+h/2,-3,w,h,12,site==='counter'?'#885e45':color,site==='counter'?0:7);
      if(site==='kiosk'||site==='counter')for(const xx of [x+4,x+w-4]){
        material(xx,y+14,-6,2.7,28,9,wood,0);box(xx,y+28,-7,6,2,12,iron)}
      brackets(x,y,w);break;
    }
    case 'balcony':case 'sill':case 'roof':{
      material(m,y+2,-6,w,4,21,'#a9aba0',site==='roof'?7:6);
      material(m,y+7,-26,w-2,14,7,'#8b988a',5);
      box(m,y+2.6,4.7,w,2.4,.85,site==='roof'?zinc:'#cabfa6');
      if(site==='balcony'){
        for(let j=2;j<w;j+=15)beam(x+j,y,-12,x+j,y-10,-12,.52,zinc);
        beam(x+1,y-10,-12,x+w-1,y-10,-12,.75,iron);
      }
      brackets(x,y+2,w);break;
    }
    case 'potting':case 'bench':case 'press':case 'potShelf':case 'paperShelf':{
      const full=site==='press'||site==='bench'||site==='potting';
      material(m,y+.9,-4,w,1.8,15,site==='press'?'#5b7973':wood,site==='press'?3:0);
      const h=full?18:8;
      for(const xx of [x+3,x+w-3]){box(xx,y+h/2,-7,2,h,9,full?iron:wood);beam(xx,y+h,-8,xx,y+2,-25,.69,zinc)}
      if(full){
        box(m,y+h-2,-8,w-4,1.1,10,wood);
        for(let j=0;j<3;j++){const xx=x+w*(.23+.23*j);
          if(site==='press'||site==='paperShelf')part('tube',xx,y+h-6,-9,8.3,9,8.3,'#c1ac88',.25,0,0,0,Math.PI/2);
          else {part('tube',xx,y+h-5.6,-8,5.5,6.2,5.5,'#a47456');ball(xx,y+h-9,-8,4.8,4.2,4.6,'#6d8f65')}}
      }else brackets(x,y,w);
      break;
    }
    case 'container':case 'case':{
      const count=Math.max(1,Math.round(w/(site==='case'?27:44))),u=w/count,h=site==='case'?13:19;
      for(let j=0;j<count;j++){const xx=x+u*(j+.5),col=['#927460','#687f7d','#947068'][(j+k)%3];
        material(xx,y+h/2,-5,u-.25,h,16,col,site==='case'?3:7);
        for(const dx of [-u*.47,u*.47])box(xx+dx,y+h/2,3.3,1.4,h,1.2,zinc);
        box(xx,y+.6,3.4,u,1.2,1.4,zinc);box(xx,y+h-.7,3.4,u,1.4,1.4,iron);
        if(site==='case')for(const dx of [-u*.28,u*.28])box(xx+dx,y+3.5,3.7,2,2,1,'#b9aa8b');
        else for(const dx of [u*.18,u*.36])beam(xx+dx,y+2,3.6,xx+dx,y+h-2,3.6,.56,zinc);
      }brackets(x,y+h,w);break;
    }
    case 'pallet':pallets(x,y,w,2);brackets(x,y+10,w);break;
    case 'duct':case 'cableTray':{
      const h=site==='duct'?8:4;
      material(m,y+h/2,-5,w,h,14,site==='duct'?'#b9bdad':'#777d75',3);
      for(let j=3;j<w;j+=14)box(x+j,y+h/2,-5,.7,h+.3,14.4,zinc);
      brackets(x,y+h,w);
      break;
    }
    case 'lightbox':{
      box(m,y+3.2,-5,w,6.4,14,iron);box(m,y+3.2,2.25,w-1.7,4.7,.8,k%2?'#e7bb81':'#9bd3b6',.32,.36);
      for(let j=5;j<w-4;j+=5)box(x+j,y+3.4,2.85,2.4,1.3,.6,iron);
      brackets(x,y,w);break;
    }
    case 'gantry':case 'greenwalk':case 'service':{
      for(const z of [-11,2])box(m,y+2,z,w,4,1.7,iron,.7);
      box(m,y+.72,-4,w,1.44,14,site==='greenwalk'?'#6e7e70':zinc,.68);
      for(let j=2;j<w;j+=5)box(x+j,y+.12,-3,.8,.27,12,iron);
      for(const xx of [x+3,m,x+w-3])beam(xx,y,-12,xx,y-9,-12,.55,zinc);
      beam(x+2,y-9,-12,x+w-2,y-9,-12,.73,zinc);brackets(x,y+2,w);break;
    }
    case 'shuttle':{
      material(m,y+.8,-5,w,1.6,14,wood,0);
      box(m,y+2.15,-5,w,1.5,14,'#777c68');for(const xx of [x+5,x+w-5])part('tube',xx,y+4,-4,4.5,11,4.5,iron,.78,0,0,0,Math.PI/2);
      break;
    }
    case 'planks':{
      const n=Math.ceil(w/10);
      for(let j=0;j<n;j++){const width=w/n;
        material(x+(j+.5)*width,y+1,-4,width-.35,2,16,j%2?wood:'#93745f',0)}
      for(const z of [-9,2])box(m,y+2.9,z,w-1,2.2,1.6,'#77614f');
      if(r.crack>0)for(let j=0;j<3;j++){const xx=m+(j-1)*3;beam(xx,y-.12,-7+j*3,xx+2.6,y-.12,-4+j*3,.32,'#423c36')}
      break;
    }
    default:throw Error('Unknown route surface '+site);
    }
  }
  function structure(r){
    if(r.host){
      // The twin channels carry the air conditioner, sign or shuttle bearings
      // down to the storey where this ascent begins.
      for(const f of [.16,.84]){
        const xx=r.base+r.w*f,hh=r.host.y-r.y+2;
        box(xx,r.y+hh/2,-32,1.9,hh,4.6,iron);
        box(xx,r.host.y-1,-29.5,4.2,2,6.2,zinc);
      }
    }else{
      box(r.base+r.w/2,r.y+6.2,-32,r.w,14,7,'#738079',4,0,0,0,0,5);
      for(const f of [.12,.88]){
        const xx=r.base+r.w*f;beam(xx,r.y+1,-7,xx,r.y+12,-31,1.1,iron);
      }
    }
  }
  function fixedMount(r){
    if(r.site==='shuttle'){
      const m=r.base+r.w/2;
      for(const z of [-9,1])box(m,r.y+6.4,z,r.w+35,1.3,1.55,iron);
      for(const dx of [-r.w/2-14,r.w/2+14])box(m+dx,r.y+4.8,-4,1.5,4,14,rust);
      brackets(r.base-17,r.y+7,r.w+34);
    }else if(r.site==='planks')brackets(r.base,r.y+3,r.w);
  }
  return {tread,fixedMount,structure};
}
