const hash=n=>{const a=Math.sin(9.1+n*91.73)*43758.54;return a-Math.floor(a)};
function rect(x,y,w,h,color){g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),w,h)}
function line(x,y,X,Y,color){const n=Math.max(1,Math.ceil(Math.max(Math.abs(X-x),Math.abs(Y-y))));for(let i=0;i<=n;i++)rect(x+(X-x)*i/n,y+(Y-y)*i/n,1,1,color)}
function disc(x,y,r,color){for(let j=-r;j<=r;j++){let w=Math.floor(Math.sqrt(r*r-j*j));rect(x-w,y+j,w*2+1,1,color)}}
function peak(x,y,r,h,c){for(let j=0;j<h;j+=2){const w=Math.round(r*(j+2)/h);rect(x-w,y+j,2*w,2,c)}}
function skyline(s){
  const grad=g.createLinearGradient(0,0,0,178);
  s.sky.forEach((c,i)=>grad.addColorStop(i/2,c));g.fillStyle=grad;g.fillRect(0,0,W,H);
  for(let i=0;i<74;i++){const x=hash(i+3)*W,y=hash(i+113)*102;rect(x,y,1,1,s.moon);if(i%14===0){rect(x-1,y,3,1,s.moon);rect(x,y-1,1,3,s.moon)}}
  const mx=W*.71,my=46;
  disc(mx,my,23,s.moon);
  for(let i=0;i<15;i++){const x=mx-30+hash(i+1)*51,y=my+8+i*1.6;rect(x,y,10+hash(i+39)*24,1,s.sky[1])}
  if(s.landmark==='snow')for(let i=0;i<W;i+=3){const y=26+14*Math.sin(i/54+clock*.09);g.globalAlpha=.25;rect(i,y,3,6+hash(i)*13,'#93ffc9');g.globalAlpha=1}
  for(let i=0;i<15;i++){const x=(i*79-cam*.07)%(W+78),y=39+hash(i+77)*64;rect(x,y,14+hash(i)*32,1,s.sky[2]);rect(x+8,y-1,12,1,s.sky[2])}
  for(let j=0;j<2;j++){const pitch=j?50:33,shift=cam*(j?.23:.09),c=j?s.mid:s.far;
    for(let i=Math.floor(shift/pitch)-1;i*pitch<W+shift+pitch;i++){
      const x=i*pitch-shift,n=i+31*j+level*31,y=115+j*16-hash(n)*43,w=pitch-2;
      switch(s.landmark){
        case 'snow':case 'mills':
          peak(x+w/2,y-14,w+18,85,c);if(s.landmark==='snow')peak(x+w/2,y-14,10,15,j?'#a8bbce':'#b9cada');
          if(s.landmark==='mills'&&j&&i%2===0){rect(x+16,y+1,7,53,c);const angle=clock*.45+i;for(let k=0;k<4;k++){const a=angle+k*Math.PI/2;line(x+19,y+4,x+19+21*Math.cos(a),y+4+21*Math.sin(a),s.trim);line(x+19+7*Math.cos(a)-2*Math.sin(a),y+4+7*Math.sin(a)+2*Math.cos(a),x+19+21*Math.cos(a),y+4+21*Math.sin(a),s.trim)}}
          break;
        case 'garden':
          disc(x+w/2,y+16,Math.floor(w*.57),c);rect(x-2,y+16,w+6,100,c);
          for(let k=5;k<w;k+=8){rect(x+k,y+15,w>40?2:1,34,s.sky[1]);line(x+w/2,y-7,x+k,y+15,s.sky[1])}rect(x,y+24,w,2,s.sky[1]);break;
        case 'harbor':
          if(j&&i%2===0){rect(x+5,y-13,3,71,c);line(x+5,y-13,x+38,y-3,c);rect(x-4,y-3,44,2,c);rect(x+32,y-2,1,19,c);rect(x+28,y+17,10,6,c)}
          for(let k=0;k<3;k++){rect(x+2*k,140-k*9,w-k*5,8,c);for(let b=2;b<w-k*5;b+=5)rect(x+b+2*k,141-k*9,1,6,s.sky[1])}break;
        case 'lantern':
          rect(x+5,y+12,w-8,82,c);peak(x+w/2,y-3,w*.57,15,c);rect(x-3,y+10,w+6,3,c);rect(x-3,y+8,3,2,c);
          if(j){line(x,y+19,x+w,y+23,c);for(let k=4;k<w;k+=15){rect(x+k,y+20,1,5,c);rect(x+k-2,y+25,5,6,'#ffb674');rect(x+k,y+31,1,2,'#ffcc8c')}}break;
        default:
          rect(x,y,w,136,c);rect(x+5,y-5,w-11,6,c);
          if(s.landmark==='radio'&&i%2===0){line(x+w/2,y-27,x+8,y,c);line(x+w/2,y-27,x+w-8,y,c);rect(x+w/2,y-30,1,29,c);rect(x+w/2,y-30,2,2,'#ffd39d')}
          if(s.landmark==='spires'){peak(x+w/2,y-19,w*.32,19,c);rect(x+w/2,y-24,1,9,c)}
          for(let a=4;a<w-2;a+=7)for(let b=5;b<68;b+=8)if(hash(n*55+a+b)>.46)rect(x+a,y+b,2,3,s.sky[1]);
          if(j&&i%3===1&&s.landmark==='city'){rect(x+w-10,y-9,11,25,'#ea94a5');g.fillStyle='#693a55';g.font='bold 9px sans-serif';g.fillText('夜',x+w-9,y+2);g.fillText('市',x+w-9,y+12)}
      }
    }
  }
}
function paintPlatform(r,i,s){
 const x=r.x-cam,y=r.y,w=r.w;if(x>W||x+w<0)return;
 if(r.room){paintChamber(r,s);return}
 if(r.type==='U'){rect(x,y,w,2,'#a9d7c6');rect(x,y+2,w,4,s.mid);for(let k=2;k<w-3;k+=12){line(x+k,y+2,x+k+4,y+5,s.trim)}return}
 if(r.type==='M'){rect(r.base-cam-15,y+8,w+30,1,'#75adbc');rect(x,y,w,3,'#9de3e9');rect(x+2,y+3,w-4,8,'#365d73');for(let k=4;k<w-4;k+=9)rect(x+k,y+5,4,2,'#72b9ca');return}
 if(r.type==='C'){if(r.crack===0)return;const c=r.crack>0?'#ffbea5':s.trim;rect(x,y,w,3,c);rect(x+1,y+3,w-2,8,s.wall);for(let k=9;k<w;k+=18){line(x+k,y,x+k-4,y+5,s.wall);line(x+k-4,y+5,x+k+1,y+9,c)}return}
 rect(x,y,w,H-y,s.wall);rect(x-1,y,w+2,2,s.trim);rect(x,y+3,w,3,s.mid);rect(x+2,y+8,w-4,1,s.far);
 for(let k=8;k<w-6;k+=17){rect(x+k,y+15,9,12,s.mid);rect(x+k+1,y+16,3,7,s.far);rect(x+k+5,y+16,2,4,s.far)}
 // Silhouettes on the roof belong to the district and sit behind the runner.
 if(r.type==='.'&&i%2===0){
   const a=Math.floor(x+w*.58);
   if(s.landmark==='city'){
     rect(a,y-23,2,23,s.mid);rect(a+31,y-23,2,23,s.mid);
     rect(a-3,y-34,40,18,'#352941');rect(a-2,y-33,38,1,s.trim);rect(a-2,y-18,38,1,s.trim);
     g.font='bold 10px sans-serif';g.fillStyle='#ffb9b0';g.fillText('月 見',a+3,y-21)
   }else if(s.landmark==='garden'){
     rect(a-7,y-5,14,5,'#ae826a');rect(a,y-21,2,16,s.trim);
     for(let k=0;k<4;k++){rect(a+(k%2?-5:2),y-10-k*3,5,3,'#81c590')}
   }else if(s.landmark==='lantern'){
     rect(a,y-33,2,33,s.mid);rect(a-9,y-33,23,2,s.mid);
     for(let k=-7;k<12;k+=14){rect(a+k,y-32,1,4,s.trim);disc(a+k,y-25,4,'#ffae68');rect(a+k,y-21,1,3,s.trim)}
   }else if(s.landmark==='spires'){
     for(let k=-10;k<=10;k+=7){const h=8+Math.abs(k);peak(a+k,y-h-4,3,5,s.trim);rect(a+k-2,y-h+1,5,h-1,s.mid);rect(a+k-2,y-h+1,1,h-1,s.trim)}
   }else if(s.landmark==='radio'){
     line(a-8,y,a,y-35,s.trim);line(a+8,y,a,y-35,s.trim);rect(a,y-39,1,39,s.mid);
     for(let k=0;k<3;k++){line(a-5+k,y-3-8*k,a+4-k,y-10-8*k,s.trim)}disc(a,y-39,1,clock%2<1?'#ff957d':s.mid)
   }else if(s.landmark==='snow'){peak(a,y-20,10,20,s.mid);peak(a,y-20,4,8,s.trim);rect(a-1,y-3,3,3,s.wall)}
   else if(s.landmark==='harbor'){rect(a-9,y-10,23,10,s.mid);for(let k=-7;k<14;k+=4)rect(a+k,y-8,1,7,s.far);rect(a-10,y-11,25,2,s.trim)}
   else if(s.landmark==='mills'){rect(a,y-25,2,25,s.mid);line(a-9,y-30,a+11,y-20,s.trim);line(a+10,y-32,a-8,y-17,s.trim)}
 }
 if(r.type==='H')for(let k=-7;k<=7;k+=7)peak(x+w*.5+k,y-9,4,9,'#ff807e');
 if(r.type==='S'){const a=x+w-26;rect(a-9,y-2,19,2,'#66cdaf');line(a-6,y-2,a+5,y-4,'#c4ffcd');line(a+5,y-4,a-5,y-6,'#c4ffcd');rect(a-9,y-7,19,3,'#7af7be')}
 if(r.type==='F'||isExit(i)){const a=x+(r.type==='F'?20:w-24);rect(a,y-28,2,28,'#f5d0a8');rect(a+2,y-27,14,8,i===checkpoint||r.type!=='F'?'#cefc86':'#9fc5de');rect(a+15,y-22,2,5,'#bde99a')}
}
const fur='#f89952',dark='#322a3b',cream='#ffe4b0';
function draw(){NeonCity()}
