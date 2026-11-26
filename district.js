// Each occupied cell is a traversable chamber. Vertical neighbours share a
// stairwell; horizontal neighbours are joined by a short, jumpable street.
const districts = [
  [' R.K', ' .F.', 'P..E'],
  ['K..R ', '.F..E', 'P... '],
  ['  R.E', 'K.F..', '. .. ', 'P..K '],
  ['R..K ', '..F.E', 'K. ..', 'P... '],
  [' E..R', 'K.F .', '. ..K', 'P... '],
  ['.K.. E', '..F...', 'R. ..K', 'P.... '],
  ['E.. R.', '. .K..', 'K.F. .', 'P.....'],
  ['K.. ..E', '..F.. .', '. R..K.', 'P..... ']
];
const roomWidth=154, roomHeight=82;
let district=null, camY=0;
function buildDistrict(){
  const rows=districts[level], cols=Math.max(...rows.map(row=>row.length));
  const mirror=stageRng()<.5, rooms=[], floors=[], fish=[];
  rows.forEach((line,row)=>Array.from(line).forEach((mark,col)=>{
    if(mark===' ')return;
    const column=mirror?cols-1-col:col;
    const x=column*roomWidth+5+Math.floor(stageRng()*6), y=74+row*roomHeight;
    const w=roomWidth-22-Math.floor(stageRng()*8);
    rooms.push({column,row,mark,x,y,w});
  }));
  // Spawn is index zero and the exit is last, matching checkpoint semantics.
  const place=room=>room.mark==='P'?-1:room.mark==='E'?1:0;
  rooms.sort((a,b)=>place(a)-place(b));
  district={rooms,cols,rows:rows.length,width:cols*roomWidth,height:rows.length*roomHeight+58,
    required:rooms.filter(r=>r.mark==='K').length,lit:0};
  for(const room of rooms){
    const {x,y,w,mark,row,column}=room;
    const index=floors.length;
    let style=mark==='F'?'F':'.';
    if(mark==='.' && level>=2 && stageRng()<.24) style=level>=4&&stageRng()<.5?'H':'S';
    room.floor=index;
    floors.push({type:style,base:x,x,y,w,crack:-1,room});
    if(!['P','F','E'].includes(mark)){
      fish.push({index,high:false,taken:false});
      const loot={K:'seal',R:'relic'}[mark];
      if(loot)treasures.push({x:x+w*.67,y:y-14,type:loot,room,taken:false});
      else if(stageRng()<.25)treasures.push({x:x+w*.32,y:y-12,type:'cache',taken:false});
      if(mark==='K'||stageRng()<.42+level*.035){
        const roll=stageRng(),kind=level>1&&roll>.7?'sentry':level&&roll>.38?'bat':'rat';
        enemies.push({kind,home:index,x:x+w*.5,y:y-7,phase:stageRng()*6.28,hp:kind==='sentry'?3:2,fire:1.5,flash:0});
      }
    }
    if(!rooms.some(r=>r.column===column&&r.row===row-1))continue;
    const flip=stageRng()<.5;
    for(let j=1;j<=2;j++){
      const base=x+((j===1)===flip?18:w-62);
      const type=j===2&&level>=3&&stageRng()<.22?'M':'U';
      floors.push({base,x:base,y:y-j*roomHeight/3,w:48,type,crack:-1,host:room,hostStep:j});
    }
  }
  // The exit can have a stairwell above it, so resolve its index explicitly.
  district.exit=rooms.find(r=>r.mark==='E');
  return {platforms:floors,items:fish};
}
function isExit(index){return rogue?index===district.exit.floor:index===platforms.length-1}
function paintChamberWalls(s){
 for(const room of district.rooms){
  const x=room.x-cam,y=room.y,w=room.w;
  if(x+w<0||x>W||y<camY||y-roomHeight>camY+H)continue;
  g.globalAlpha=.68;
  const top=y-67;
  rect(x+4,top,w-8,3,s.wall);
  for(const col of [x+6,x+w-13]){
   rect(col,top,5,64,s.mid);rect(col-2,top+2,9,4,s.wall);
   line(col+2,top+18,col+17,top+4,s.wall);
  }
  if(room.row>0){
   rect(x+20,top+7,w-40,41,s.wall);
   for(let k=27;k<w-31;k+=18){rect(x+k,top+13,11,23,s.mid);rect(x+k+4,top+13,2,23,s.wall)}
  }
  g.globalAlpha=1;
  if(room.mark==='K'||room.mark==='E'){
   const label=room.mark==='K'?'灯芯室':'灯门';
   g.fillStyle=room.mark==='K'?'#ffda99':'#afeccf';g.font='bold 8px sans-serif';g.fillText(label,x+13,top+14);
  }
 }
}
function paintChamber(r,s){
  const {room}=r,x=r.x-cam,y=r.y;
  // Shallow beams leave the passages below visible and playable.
  rect(x,y,r.w,3,s.trim);rect(x+1,y+3,r.w-2,6,s.wall);
  for(let k=6;k<r.w-5;k+=16){rect(x+k,y+4,7,2,s.mid);rect(x+k,y+8,2,4,s.wall)}
  const gx=x+r.w*.67;
  if(r.type==='H')for(let k=-7;k<=7;k+=7)peak(x+r.w*.5+k,y-9,4,9,'#ff807e');
  if(r.type==='S'){rect(x+r.w-37,y-4,21,3,'#8bf0b8');line(x+r.w-34,y-1,x+r.w-22,y-5,s.trim)}
  if(room.mark==='E'){
    const active=district.lit===district.required,c=active?'#a5ffd1':'#e9af87';
    rect(gx-13,y-30,27,30,s.wall);rect(gx-12,y-30,25,2,c);
    rect(gx-12,y-29,2,29,c);rect(gx+11,y-29,2,29,c);
    for(let j=0;j<4;j++)rect(gx-9+j*5,y-27,active?1:3,26,active?s.mid:'#937e88');
    disc(gx,y-34,3,c);
  }else if(room.mark==='F'){
    rect(x+21,y-28,2,28,s.trim);rect(x+23,y-27,14,8,'#c9fc9a');
  }else if(room.mark==='K'||room.mark==='R'){
    const c=room.mark==='K'?'#ffc979':'#d0a4f1';
    rect(gx-9,y-4,18,4,s.mid);rect(gx-7,y-5,14,2,c);
  }else{
    rect(x+4,y-12,2,12,s.far);rect(x+4,y-13,22,1,s.far);rect(x+24,y-13,2,13,s.far);
  }
}
function paintSurvey(){
  const map=$('survey'),ctx=map.getContext('2d');
  const cw=14,ch=9,ox=4,oy=4;
  const width=district.cols*cw+ox*2,height=district.rows*ch+oy*2;
  if(map.width!==width||map.height!==height){map.width=width;map.height=height}
  ctx.clearRect(0,0,width,height);
  for(const r of district.rooms){
    const x=ox+r.column*cw,y=oy+r.row*ch;
    ctx.fillStyle='#736780';ctx.fillRect(x,y,12,6);
    if(r.mark==='E'||r.mark==='K'||r.mark==='F'||r.mark==='R'){
      ctx.fillStyle={E:'#b1f4d1',K:'#ffca7a',F:'#ccee95',R:'#d0a4f1'}[r.mark];
      if(r.mark==='K'&&r.collected)ctx.fillStyle='#907d68';
      ctx.fillRect(x+4,y+1,4,4);
    }
  }
  const x=ox+(player.x/roomWidth)*cw,y=oy+((player.y-74)/roomHeight)*ch+3;
  ctx.fillStyle='#fff';ctx.fillRect(Math.round(x)-1,Math.round(y)-1,3,3);
}
