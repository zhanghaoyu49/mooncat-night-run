// The physical scene uses the same X/Y coordinates as the platform simulation.
// Positive Z points out of the city toward the camera. All game state is read-only.
const NeonCity = (() => {
  const themes = [
    ['#61e8dd','#f05651','#8eaeb1','夜市','電 器'],
    ['#ffba72','#ef5652','#b4999b','長街','茶 室'],
    ['#69edac','#a0d9e7','#81b3a5','溫室','培 養'],
    ['#7ad3ee','#ff9a58','#91b4c8','港口','冷 藏'],
    ['#c89af4','#ed689f','#a998b9','天台','放 映'],
    ['#ffc278','#e77551','#b7a293','紙坊','製 紙'],
    ['#9cf8e9','#79b9ff','#a8c5d5','雪嶺','觀 測'],
    ['#ffb88a','#72e4db','#baa6b8','電台','廣 播']
  ];
  const steel='#36444a',aluminum='#839197',rubber='#20282b',ochre='#93573a';
  const colorCache=new Map();
  function rgb(hex){
    if(!colorCache.has(hex)){
      const n=parseInt(hex.slice(1),16);
      colorCache.set(hex,[(n>>16)/255,((n>>8)&255)/255,(n&255)/255]);
    }
    return colorCache.get(hex);
  }
  function meshData(shape){
    const data=[];
    const vertex=(p,n,uv)=>data.push(...p,...n,...uv);
    if(shape==='box'){
      const faces=[[[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,-1,0],[0,0,1]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[0,0,1],[-1,0,0]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]]];
      for(const [n,u,v] of faces)for(const [a,b] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]])vertex(n.map((x,i)=>x*.5+(a-.5)*u[i]+(b-.5)*v[i]),n,[a,b]);
    }else{
      const soft=shape==='pad',shade=shape==='shade',sphere=shape==='orb'||soft,cone=shape==='cone',cols=sphere?16:cone?5:12,rows=sphere?10:1;
      const sample=(i,j)=>{
        const u=i/cols,v=j/rows,a=u*Math.PI*2,b=(v-.5)*Math.PI;
        const r=sphere?Math.cos(b):cone?Math.max(.001,v):shade?.58+.42*v:1;
        const x=Math.cos(a),z=Math.sin(a);
        if(soft){const shape=a=>Math.sign(a)*Math.pow(Math.abs(a),.43);
          return [[shape(x*r)*.5,shape(Math.sin(b))*.5,shape(z*r)*.5],[x*r,Math.sin(b),z*r],[u,v]];
        }
        return [[x*r*.5,sphere?Math.sin(b)*.5:v-.5,z*r*.5],sphere?[x*r,Math.sin(b),z*r]:[x,cone?-.5:0,z],[u,v]];
      };
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)for(const [dx,dy] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]])vertex(...sample(i+dx,j+dy));
      if(!sphere)for(const j of [0,1])for(let i=0;i<cols;i++){
        const n=[0,j?1:-1,0];vertex([0,j-.5,0],n,[.5,.5]);vertex(sample(i,j)[0],n,[0,0]);vertex(sample(i+1,j)[0],n,[1,1]);
      }
    }
    return new Float32Array(data);
  }
  const meshVert=`#version 300 es
  layout(location=0) in vec3 pos;layout(location=1) in vec3 normal;layout(location=2) in vec2 uv;
  layout(location=3) in vec4 ax;layout(location=4) in vec4 ay;layout(location=5) in vec4 az;
  layout(location=6) in vec4 tint;layout(location=7) in vec4 props;
  uniform vec4 camera;
  out vec3 P;out vec3 N;out vec2 U;flat out vec4 C;flat out vec4 M;
  void main(){
    P=mat3(ax.xyz,ay.xyz,az.xyz)*pos+vec3(ax.w,ay.w,az.w);
    N=normalize(ax.xyz*normal.x/dot(ax.xyz,ax.xyz)+ay.xyz*normal.y/dot(ay.xyz,ay.xyz)+az.xyz*normal.z/dot(az.xyz,az.xyz));
    U=uv;C=tint;M=props;
    float w=1.-P.z/610.;
    vec2 xy=P.xy-camera.xy+P.z*vec2(-.13,.23);
    gl_Position=vec4(xy*vec2(2./camera.z,-2./camera.w),(-P.z/500.-.1)*w,w);
  }`;
  const meshFrag=`#version 300 es
  precision highp float;in vec3 P;in vec3 N;in vec2 U;flat in vec4 C;flat in vec4 M;
  ${shadowProjection}
  uniform sampler2D shadeDepth;uniform float tick;
  uniform sampler2D labels;uniform sampler2D materials;uniform vec4 subject;uniform bool indoors;uniform vec4 lights[6];uniform vec3 accent;uniform vec3 secondary;uniform vec4 camera;
  out vec4 col;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*4375.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
  void main(){
    vec3 n=normalize(N),v=normalize(vec3(camera.xy-P.xy+vec2(72,-120),610.-P.z));
    float metal=M.x,emit=C.a; vec3 base=C.rgb;
    float grime=noise(P.xy*.31+P.z*.13),grain=h(floor((P.xy+P.z*.52)*3.));
    if(metal>5.5){
      vec2 facade=vec2(abs(n.z)>.5?P.x:P.z,P.y);
      vec2 grid=facade/vec2(8.,11.);vec2 cell=floor(grid),f=fract(grid);
      float opening=step(.16,f.x)*step(f.x,.79)*step(.21,f.y)*step(f.y,.75);
      float blind=step(.6,h(cell+2.+M.y))*smoothstep(.22,.72,f.y);
      opening*=1.-blind*.55;
      float panes=step(.035,abs(f.x-.48));float lit=step(.48,h(cell+M.y));
      vec3 lamp=mix(vec3(.46,.72,.75),vec3(.96,.65,.40),h(cell*2.+M.y));
      base*=.61+.17*grime;
      base=mix(base,mix(vec3(.09,.16,.20),lamp,lit*.73),opening*panes);
      emit=opening*panes*lit*.46;metal=.27;
    }else if(metal>3.5){
      vec2 coord=abs(n.y)>.63?P.xz:abs(n.x)>.75?P.zy:P.xy;
      float size=M.y==2.?12.:M.y==1.?36.:M.y==3.?26.:55.;
      vec2 tile=vec2(mod(M.y,2.),floor(M.y/2.));
      vec3 sampleCol=texture(materials,(tile+.003+.994*fract(coord/size))*.5).rgb;
      base=sampleCol*(.43+base*.99);metal=M.y==3.?.48:.14;
    }else if(metal>1.5 && metal<2.5){ // tabby fur running with the body
      float stripe=smoothstep(.52,.9,sin(U.x*74.+sin(U.y*15.)*2.));
      base*=1.-.35*stripe*smoothstep(.1,.55,U.y);base*=.96+.045*grain;emit=.24;metal=.02;
    }else if(metal>2.5 && metal<3.5){
      vec3 glyph=texture(labels,vec2(U.x,(U.y+M.y)/16.)).rgb;
      base=mix(base,vec3(.032,.04,.047),1.-glyph.r);emit*=glyph.r;metal=.16;
    }else{
      base*=.83+.18*grime+.07*grain;
    }
    float edge=pow(1.-max(0.,dot(n,v)),3.);
    vec3 key=normalize(vec3(-.42,-.8,.65));
    vec3 light=vec3(.26,.32,.37)+max(0.,dot(n,key))*vec3(.60,.56,.50);
    vec3 spec=vec3(0);
    for(int i=0;i<6;i++){
      vec3 delta=lights[i].xyz-P;float dist=length(delta);vec3 l=delta/max(dist,.01);
      float power=abs(lights[i].w)/(1.+dist*dist*.0017);
      vec3 dye=lights[i].w>0.?accent:secondary;
      light+=dye*(max(dot(n,l),0.)+.09)*power;
      spec+=dye*pow(max(dot(n,normalize(l+v)),0.),mix(13.,68.,metal))*power;
    }
    vec3 reflected=reflect(-v,n);
    vec3 env=mix(vec3(.049,.071,.083),mix(secondary,accent,.46)*.47,clamp(.52-reflected.y*.45,0.,1.));
    float wet=smoothstep(.35,.85,grime)*max(-n.y,0.)*metal;
    vec3 lit=base*light+spec*(.12+.7*metal)+env*(.12*metal+wet*.52+edge*.24)+edge*accent*.15+base*emit;
    if(indoors&&n.y<-.55&&abs(P.y-subject.y)<4.){
      vec2 d=(P.xz-subject.xz)/vec2(11.,4.7);
      lit*=1.-.45*exp(-dot(d,d)*1.4);
    }
    vec3 tex=fromLight(P)*.5+.5;
    if(P.z>-100.&&all(greaterThan(tex,vec3(0.)))&&all(lessThan(tex,vec3(1.)))){
      float shade=0.;for(int k=0;k<4;k++){
        vec2 off=vec2(float(k%2)-.5,float(k/2)-.5)/512.;
        shade+=step(texture(shadeDepth,tex.xy+off).r+.0026,tex.z);
      }
      lit*=1.-shade*.102*(1.-min(1.,emit));
    }
    if(indoors&&P.z< -95.){
      vec2 ray=P.xy-camera.xy+P.z*vec2(-.13,.23);
      vec2 glass=ray*(1.+66./610.)/(1.-P.z/610.)+camera.xy;
      float drops=h(vec2(floor(glass.x*2.5),1.));float trail=fract(glass.y*.09+tick*(.18+drops*.36)+drops);
      lit=mix(lit,vec3(.14,.27,.31),.17)+vec3(.08,.12,.13)*step(.91,drops)*pow(trail,11.);
    }
    lit/=1.+.19*max(0.,max(lit.r,max(lit.g,lit.b))-.65);
    float fog=smoothstep(28.,460.,-P.z)*.64;
    col=vec4(mix(lit,vec3(.102,.18,.20),fog),1.);
  }`;
  const quadVert=`#version 300 es
  out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
  const bgFrag=`#version 300 es
  precision highp float;in vec2 uv;uniform vec3 accent;uniform float climate;
  out vec4 col;void main(){
    float horizon=pow(1.-uv.y,1.6);
    vec3 zenith=vec3(.038,.075,.113),haze=mix(vec3(.18,.26,.32),accent*.45,.28);
    if(climate==7.){zenith=vec3(.13,.17,.27);haze=vec3(.67,.43,.36);}
    float veil=.009*sin(uv.y*16.+uv.x*3.)+.006*sin(uv.y*70.-uv.x*8.);
    col=vec4(mix(zenith,haze,horizon)+veil,1.);
  }`;
  const postFrag=`#version 300 es
  precision highp float;in vec2 uv;uniform sampler2D frame;uniform float time;uniform float weather;uniform float climate;uniform vec2 resolution;out vec4 col;
  float h(vec2 p){return fract(sin(dot(p,vec2(71.3,25.7)))*4375.5);}
  void main(){
    vec3 c=texture(frame,uv).rgb;vec3 bloom=vec3(0.);
    for(int i=0;i<8;i++){
      float a=float(i)*.785398;vec2 d=vec2(cos(a),sin(a))/resolution;
      bloom+=max(texture(frame,uv+d*4.).rgb-.62,0.)+max(texture(frame,uv+d*9.).rgb-.73,0.);
    }
    c+=bloom*.061;
    vec2 p=uv*vec2(resolution.x/resolution.y,1.);p.x+=p.y*.12;p*=vec2(138.,6.);
    p.y+=time*3.3;vec2 id=floor(p);vec2 f=fract(p);
    float rain=(1.-smoothstep(0.,.045,abs(f.x-.5)))*smoothstep(.42,.5,f.y)*(1.-smoothstep(.5,.67,f.y))*step(.88,h(id));
    c+=rain*weather*vec3(.13,.19,.23);
    if(climate==6.){
      vec2 flakes=uv*vec2(resolution.x/resolution.y,1.)*28.;
      flakes+=vec2(time*.85,time*1.4);
      vec2 local=fract(flakes)-.5;
      float snow=(1.-smoothstep(.015,.075,length(local)))*step(.86,h(floor(flakes)));
      c+=snow*vec3(.36,.46,.52);
    }
    float vig=1.-.18*dot(uv-.5,uv-.5)*2.;col=vec4(c*vig,1.);
  }`;
  function program(gl,vs,fs){
    const id=gl.createProgram();
    for(const [src,kind] of [[vs,gl.VERTEX_SHADER],[fs,gl.FRAGMENT_SHADER]]){
      const sh=gl.createShader(kind);gl.shaderSource(sh,src);gl.compileShader(sh);
      if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));
      gl.attachShader(id,sh);gl.deleteShader(sh);
    }
    gl.linkProgram(id);if(!gl.getProgramParameter(id,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(id));
    const u={};for(let n=0;n<gl.getProgramParameter(id,gl.ACTIVE_UNIFORMS);n++){
      const name=gl.getActiveUniform(id,n).name;u[name.replace('[0]','')]=gl.getUniformLocation(id,name);
    }
    return {id,u};
  }
  function batch(){return {box:[],orb:[],tube:[],cone:[],pad:[],shade:[]}}
  let target;
  // Packed affine transform: each basis vector carries one translation component.
  function part(shape,x,y,z,sx,sy,sz,hex,mat=.5,emit=0,rz=0,ry=0,rx=0,tag=0){
    const a=Math.cos(rz),b=Math.sin(rz),c=Math.cos(ry),d=Math.sin(ry),e=Math.cos(rx),f=Math.sin(rx);
    const col=rgb(hex);
    target[shape].push(a*c*sx,b*c*sx,-d*sx,x,(a*d*f-b*e)*sy,(b*d*f+a*e)*sy,c*f*sy,y,(a*d*e+b*f)*sz,(b*d*e-a*f)*sz,c*e*sz,z,...col,emit,mat,tag,0,0);
  }
  const box=(...args)=>part('box',...args),ball=(...args)=>part('orb',...args);
  function beam(x,y,z,X,Y,Z,r,color,mat=.6,emit=0){
    const dx=X-x,dy=Y-y,dz=Z-z,len=Math.hypot(dx,dy,dz);
    if(len<.02)return;
    part('tube',(x+X)/2,(y+Y)/2,(z+Z)/2,r*2,len,r*2,color,mat,emit,Math.atan2(-dx,dy),0,Math.asin(dz/len));
  }
  function sign(x,y,z,w,h,col,tag){
    box(x,y,z,w+2,h+2,2.6,rubber,.7);
    box(x,y,z+1.45,w,h,.25,col,3,1.35,0,0,0,tag);
  }
  function roomKit(r,i,theme){
    const x=r.base,y=r.y,w=r.w,mid=x+w/2,[a,b]=theme;
    const t=r.type,mark=r.room?.mark;
    if(t==='U'||t==='M'||t==='C'){
      box(mid,y+1.1,-3,w,2.2,16,'#74838a',.92);
      for(const side of [-9,4])box(mid,y+4,side,w,4,1.4,steel);
      for(let k=4;k<w-2;k+=10)box(x+k,y-.12,-3,.8,.3,15,rubber);
      box(mid,y+2,5,w*.78,.8,1,t==='M'?'#87dfee':t==='C'?'#e6a581':a,.3,.9);return;
    }
    // Playable catwalk. The upper contact line coincides with the physics floor.
    box(mid,y+2,-4,w,4,24,'#526365',.91);
    box(mid,y+5,7,w,5,2.4,'#45494c',.77);
    for(let k=4;k<w-4;k+=13){
      box(x+k,y+4.8,8.4,4.5,2,.6,'#a78352',.65,.05,-.20);
      box(x+k,y-.05,-5,.6,.17,21,'#232d30',.75);
    }
    for(const k of [5,w-6]){box(x+k,y+2.6,8.5,6,.85,.9,a,.35,1.4);beam(x+k,y+17,-24,x+k,y+4,5,1.4,steel)}
    // Back wall is set behind the running lane. Doors and stairs stay unobscured.
    const rear=-33,variant=(i*7+Math.round(x/60)+level)%7;
    const wall=['#526361','#625b51','#4c5853','#52585f'][i%4];
    const fx=x+(variant%2?w-17:14);
    // Mix open service galleries and recessed shop fronts; their silhouettes
    // stay behind the walkway even when a room is traversed from below.
    if(variant!==1 && variant!==4 && !([2,3,6,7].includes(level)&&variant===3)){
      box(mid,y-29,rear-3,w-5,57,5,wall,.34);
      const tile=variant%2?1:3;
      box(mid,y-29,rear-.3,w-6,55,.65,wall,4,0,0,0,0,tile);
      box(mid,y-59,rear+1,w,2.4,9,steel);
      const doorX=x+w*.29;box(doorX,y-18,rear+2,23,36,2.4,'#394b4b',4,0,0,0,0,3);
      for(let rail=0;rail<9;rail++)box(doorX,y-34+rail*3.6,rear+3.4,21,.6,.8,'#75807c');
      const wx=x+w*.59;box(wx,y-28,rear+2,21,14,2,'#465a5e');box(wx,y-28,rear+3,18.5,11,.9,'#9ea794',.34,.12);
      for(const dx of [-8,0,8])box(wx+dx,y-28,rear+4,.8,12,.8,steel);
      box(wx,y-22,rear+4,22,1.4,4,steel);
      for(let j=0;j<2;j++){
        const off=j*3.2;
        beam(x+3,y-55+off,rear+3,x+w-13,y-55+off,rear+3,j?.62:1.15,j?steel:ochre);
        beam(x+w-13,y-55+off,rear+3,x+w-10+off,y-50,rear+3,.9,steel);
        beam(x+w-10+off,y-50,rear+3,x+w-10+off,y-4,rear+3,.9,steel);
      }
      if(variant===0||variant===5){
        const fy=y-40;
        box(fx,fy,rear+4,16,12,7,'#64716c',.65);
        part('tube',fx-2,fy,rear+7.8,9.8,1,9.8,rubber,.4,0,0,0,Math.PI/2);
        for(let j=0;j<5;j++){
          const ang=j*Math.PI*2/5;
          ball(fx-2+2*Math.sin(ang),fy+2*Math.cos(ang),rear+8.6,1.7,4,.7,'#7b8988',.55,0,-ang);
        }
        for(let j=0;j<4;j++)box(fx+4.8,fy-3.5+j*2,rear+7.8,3,.45,.6,rubber);
      }
      if(variant%2===0)sign(x+w*.78,y-36,rear+8,10,22,(i%2)?a:b,level*2);
      if(variant===2||variant===3){
        const sx=x+w*.4;
        box(sx,y-34,-21,w*.44,1.5,18,variant===2?'#82564d':'#527774',.42,0,0,0,-.16);
        for(const sign of [-1,1])beam(sx+sign*w*.19,y-32,-13,sx+sign*w*.19,y-25,-31,.64,rubber);
        box(sx,y-32,-13,w*.38,.65,.7,b,.3,.92);
      }
    }else{
      for(const k of [4,w-4]){
        box(x+k,y-30,-24,3.2,59,4,steel,.82);
        beam(x+k,y-54,-23,x+k+(k<5?16:-16),y-65,-24,1.1,ochre);
      }
      box(mid,y-66,-24,w,2,7,steel);
      for(const k of [6,w*.36,w*.68,w-6])beam(x+k,y-1,-13,x+k,y-14,-13,.7,aluminum);
      beam(x+5,y-14,-13,x+w-5,y-14,-13,.68,aluminum);
      beam(x+5,y-9,-13,x+w-5,y-9,-13,.42,steel);
      if(level===2||variant===1)for(let j=0;j<5;j++){
        const xx=x+w*.24+j*2.4;
        ball(xx,y-5,-17,3.3,7,2.8,level===6?'#a7c4c6':'#627950',.16,0,j*.7);
      }
    }
    if(level===3||level===7){
      const px=x+w*.35;
      beam(px,y-61,-30,px+29,y-77,-30,.85,aluminum);
      beam(px+1,y-61,-30,px+30,y-68,-30,.65,steel);
      if(level===3)beam(px+29,y-76,-30,px+29,y-53,-30,.36,rubber);
      else for(let n=0;n<4;n++)beam(px+10+n*4,y-64-n*2,-34,px+10+n*4,y-70-n*2,-25,.46,aluminum);
    }
    for(let k=0;k<4;k++){
      const cx=x+4+k*(w-8)/4,nx=cx+(w-8)/4;
      beam(cx,y-64+Math.sin(k*Math.PI/4)*9,-16,nx,y-64+Math.sin((k+1)*Math.PI/4)*9,-16,.52,rubber);
    }
    if(level===1||level===5){
      for(let j=0;j<3;j++){const lx=x+14+j*23;beam(lx,y-58,-17,lx,y-52,-17,.4,rubber);ball(lx,y-48,-17,7,9,6,b,.15,.72)}
    }else if(level===2||level===6){
      for(let j=0;j<5;j++)ball(x+8+j*2,y-9-Math.sin(j)*3,-19,3,7,3,level===2?'#658a5a':'#c1dbd5',.18,0,j*.7);
    }
    if(level===2){
      box(x+w*.64,y-4,-17,23,7,10,'#616958',.45);
      for(let k=0;k<7;k++){const px=x+w*.58+k*2.4;beam(px,y-6,-17,px+2,y-17-k%4,-17,.35,'#708a61');ball(px+1,y-13-k%4,-16,4.2,7,2,'#689755',.15,0,.55-k*.22)}
    }else if(level===4){
      for(let k=0;k<3;k++){const px=x+w*.64+k*4;part('cone',px,y-6-k*2,-17,5,11+k*4,5,'#c69acb',.84,.27,k*.13)}
    }else if(level===5){
      for(let k=0;k<3;k++)part('tube',x+w*.6+k*5,y-5,-15,8,9,8,'#c1ac8a',.18,0,0,0,Math.PI/2);
    }else if(level===6){
      for(let k=0;k<8;k++)part('cone',x+7+k*3,y+7+k%3,7,2,5+(k%4)*2,2,'#a9d5df',.83,.10,Math.PI);
      box(mid,y-.28,-5,w-4,.55,19,'#b6c9cd',.75);
    }
    if(i%3===1){box(x+w-18,y-7,-17,16,13,11,'#77573d',.32);box(x+w-18,y-13,-17,17,1,12,aluminum,.65)}
  }
  let felineVisible=false;
  function catModel(p=player,indoors=false){
    FelineRig.update(p,indoors);felineVisible=true;
    const face=(x,y,z)=>FelineRig.transform(3,x,y,z),heading=FelineRig.heading;
    // Keep the facial details in head-bone space even when the neck turns
    // independently to groom, drink or look at the room.
    function oval(x,y,z,sx,sy,sz,color,tilt=0,glow=0,rotation=heading){
      const local=rotation-heading,c=Math.cos(local),s=Math.sin(local),ct=Math.cos(tilt),st=Math.sin(tilt);
      const center=face(x,y,z);
      const axes=[[c*ct*sx,st*sx,-s*ct*sx],[-c*st*sy,ct*sy,s*st*sy],[s*sz,0,c*sz]];
      for(let i=0;i<3;i++){
        const q=axes[i],end=face(x+q[0],y+q[1],z+q[2]);
        target.orb.push(end[0]-center[0],end[1]-center[1],end[2]-center[2],center[i]);
      }
      target.orb.push(...rgb(color),glow,.13,0,0,0);
    }
    oval(12.44,-14.04,0,.65,.58,1.12,'#ad726a');
    if(indoors&&['groom','drink','eat'].includes(p.habit)){
      const lick=Math.max(0,Math.sin(clock*(p.habit==='drink'?11:7)))*p.intensity;
      if(lick>.16)oval(12.1+lick*.35,-13.04+lick*.5,0,.72,.3+lick*.26,.56,'#c88583');
    }
    for(const s of [-1,1]){
      const lid=FelineRig.blink,a=heading+s*.59;
      oval(10.13,-15.16,s*2.29,1.86,.99*lid+.08,.59,'#453e35',s*.07,0,a);
      oval(10.22,-15.19,s*2.48,1.57,.86*lid,.43,'#a4ac67',0,.09,a);
      oval(10.3,-15.18,s*2.65,.37,.82*lid,.20,'#222624',0,0,a);
      if(lid>.5)oval(10.47,-15.42,s*2.66,.23,.2,.21,'#eee8cf',0,.33,a);
      for(let k=0;k<4;k++){
        const x=11.42+.12*k,y=-13.45+k*.15;
        ball(...face(x,y,s*1.63),.19,.16,.13,'#654d40');
        const mid=face(x+.9,y-.22+k*.1,s*3);
        beam(...face(x,y,s*1.52),...mid,.045,'#d0c3a8');beam(...mid,...face(x+2.2,y-.7+k*.37,s*4.9),.026,'#d4c9b7');
      }
    }
  }
  function homeFurniture(w,h){
    const x=w*.72,y=h*.865;
    const resident=updateResident(w,h,clock);observeResident(resident);

    const bed=profile.bed;
    if(bed==='capsule'){
      ball(x,y-.6,0,38,5.2,19,'#334752',.78);
      ball(x,y-2.2,0,34,2.2,17,'#71dacf',.2,.38);
    }else if(bed==='velvet'){
      ball(x,y-.6,0,36,4.5,20,'#934958',2);
      for(let i=0;i<11;i++){const a=Math.PI+i*Math.PI/10;ball(x+15*Math.cos(a),y-2,8*Math.sin(a),7,5,6,'#b76675',2)}
    }else ball(x,y,0,34,2.2,17,'#af856d',4,0,0,0,0,2);
    if(profile.display==='fern'){
      const px=x+22;
      part('tube',px,y-3,0,6,6,6,'#996c55');
      for(let j=0;j<9;j++){const a=j*2.4;beam(px,y-6,0,px+Math.cos(a)*5,y-11-j%4,Math.sin(a)*3,.27,'#789260');part('orb',px+Math.cos(a)*4,y-10-j%4,Math.sin(a)*3,2.8,6.2,1.4,j%2?'#829b6d':'#506f53',2,0,Math.cos(a)*.8)}
    }else if(profile.display==='beacon'){
      const px=x+22;
      ball(px,y,0,9,2,7,'#5e6e6c');part('cone',px,y-5,0,6,10,5,'#d5a882');box(px,y-10.5,0,4,3.8,4,'#ffb267',.22,1.15);part('cone',px,y-13,0,6,3,5,'#506974');
    }

    catModel(resident,true);
  }
  function fixtures(r,i,t){
    const x=r.x,y=r.y,w=r.w,mid=x+w/2,[a,b]=t;
    if(r.type==='S'){
      for(let j=0;j<3;j++)part('tube',x+w-26,y-2.2-j*1.5,-1,14,.8,9,j%2?steel:'#6cf6a9',.7,.25);
    }else if(r.type==='H')for(let k=-8;k<=8;k+=4){
      part('cone',mid+k,y-4,0,4.5,8,4.5,'#bd6556',.8,.12);
      part('cone',mid+k,y-7,0,1.3,2.4,1.3,'#ff8666',.25,.6);
    }
    if(r.type==='F'){beam(x+20,y,-2,x+20,y-26,-2,.9,aluminum);box(x+23,y-23,-2,7,6,2,'#b9ff98',.3,.85)}
    if(isExit(i)){
      const dx=rogue?x+w*.67:x+w-25,open=!rogue||district.lit===district.required,c=open?'#9affca':'#ffac66';
      box(dx,y-15,-5,24,31,4,rubber);box(dx,y-14,-2.6,17,27,1.2,open?'#32645b':'#4e5960');
      for(const off of [-11,11]){box(dx+off,y-16,0,3,32,4,steel);box(dx+off,y-16,2.3,1.1,29,.5,c,.35,1.8)}
      box(dx,y-32,0,24,3,5,aluminum);sign(dx,y-38,-4,14,6,c,15);
      if(!open)for(let j=-6;j<8;j+=4)box(dx+j,y-14,-1,1,25,1,steel);
    }
  }
  function liveObjects(t){
    for(const [i,r] of platforms.entries()){
      if(r.x+r.w<cam-25||r.x>cam+W+25||r.y<camY-10||r.y>camY+H+70)continue;
      fixtures(r,i,t);
      if(r.type==='M'||r.type==='C'){
        if(r.crack===0)continue;
        roomKit({...r,base:r.x},i,t);
      }
    }
    for(const f of items)if(!f.taken){
      const p=itemPos(f),y=p.y+Math.sin(clock*3+f.index)*1.7;
      ball(p.x,y,1,7.6,3.4,2.5,'#e8b672',.66,.45,0,Math.sin(clock*2)*.45);
      part('cone',p.x-4,y,1,4.5,4.5,2.2,'#c99350',.61,.42,-Math.PI/2);
    }
    if(rogue){
      for(const o of treasures)if(!o.taken){
        const x=o.x,y=o.y+Math.sin(clock*3)*1.5;
        if(o.type==='cache'){
          box(x,y,1,14,8,9,'#997251',.65);box(x,y-4,1,15,1.5,10,'#deab6f',.5);
          box(x,y,6,3.5,3.8,1,'#f8dba1',.6,.4);
        }else{
          const c=o.type==='seal'?'#ffd38a':'#dba7ff';
          part('cone',x,y-2,1,8,8,8,c,.7,.85,.05,clock*1.6);
          part('cone',x,y+4,1,8,5,8,c,.74,.65,Math.PI,clock*1.6);
          for(let k=0;k<3;k++){const a=clock*2+k*Math.PI*2/3;ball(x+6*Math.cos(a),y+2*Math.sin(a),1+6*Math.sin(a),1.5,1.5,1.5,c,.2,1.2)}
        }
      }
      for(const e of enemies)if(e.hp>0){
        const x=e.x,y=e.y,c=e.frozen>0?'#a9dbeb':e.flash>0?'#fff7ce':'#707d80';
        if(e.kind==='sentry'){
          box(x,y+4,0,16,4,10,rubber);ball(x,y,0,12,11,11,c,.88);
          const d=player.x<x?-1:1;
          beam(x+4*d,y-1,2,x+10*d,y-1,2,2,steel);
          ball(x+3*d,y-2,4.4,4.3,3.6,1.6,e.fire<.55?'#ff5138':'#ffc27a',.2,1.8);
        }else if(e.kind==='bat'){
          ball(x,y,0,8,6,6,c,.8);ball(x,y,3,3,2.5,2,'#ff867d',.3,1.2);
          for(const d of [-1,1]){const flap=Math.sin(clock*14)*3;beam(x+d*2,y,0,x+d*7,y-2+flap,1,1.2,steel);box(x+9*d,y-3+flap,0,7,1.2,4,c,.7,.1,-d*.32)}
        }else{
          const d=Math.cos(elapsed*1.1+e.phase)<0?-1:1;
          ball(x,y+1,0,12,6,6,c,.67);ball(x+d*5.7,y-.4,0,6,4.8,4.5,c,.65);
          ball(x+d*5.6,y-3,1.1,2,2.6,1.65,'#896b72',.35);
          ball(x+d*7,y-1.2,2,1.45,1.2,1,'#ff9c78',.12,1.4);
          beam(x-5*d,y+1,0,x-12*d,y-2+Math.sin(clock*6),1,.55,ochre);
          for(const side of [-1,1])ball(x+side*3,y+4,1.6,3.4,2.8,2.2,steel);
        }
      }
      for(const s of shots)ball(s.x,s.y,4,s.enemy?5:8,s.enemy?5:2.8,3,s.enemy?'#ff6e54':'#9bffe9',.25,2);
      for(const f of effects){
        const c=f.color,r=f.r||6;
        if(f.kind==='pulse'){const radius=Math.max(1,r*(1-f.life/f.max));arc(f.x,f.y,3,radius,0,Math.PI*2,c,.45)}
        else ball(f.x,f.y,3,6,f.kind==='ember'?6:9,4,c,.2,.65);
      }
      if(swipe>0){const angle=dir>0?0:Math.PI;arc(player.x,player.y-10,6,chain===3?23:16,angle-1,angle+1,chain===3?'#ffd785':'#cefff0',.64)}
    }
    const p=player;
    const floor=platforms.filter(r=>r.crack!==0&&p.x>=r.x&&p.x<=r.x+r.w&&r.y>=p.y-.2).reduce((a,r)=>Math.min(a,r.y),Infinity);
    if(floor-p.y<50)ball(p.x,floor-.16,1,15/(1+(floor-p.y)*.025),.27,5.3,'#1e2729',.25);
    if(!rogue||invul<=0||rolling>0||Math.floor(invul*12)%2===0)catModel();
    for(const m of motes)box(m.x,m.y,4,1.1,1.2,1,m.color,.18,.65);
  }
  function arc(x,y,z,r,a,b,c,width){
    for(let k=0;k<14;k++){const t=a+(b-a)*k/14,u=a+(b-a)*(k+1)/14;beam(x+r*Math.cos(t),y+r*Math.sin(t),z,x+r*Math.cos(u),y+r*Math.sin(u),z,width,c,.15,1.75)}
  }

  const geometry=buildScenery({box,ball,part,beam,sign}),names=['box','orb','tube','cone','pad','shade'];
  const sectorCache=new Map();
  let chunks=[],oldPlatforms=null,loftKey='',loftData;
  function buildStatic(build){
    target=batch();build();for(const key of names)target[key]=new Float32Array(target[key]);
    return target;
  }
  function sceneFor(cw,ch){
    const indoors=state==='home',roomH=110,roomW=roomH*cw/ch;
    const t=indoors?['#edb282','#75ced6']:themes[level];
    const camera=indoors?[roomW*.522+.035*(houseCat.x-roomW*.72),roomH*.53,roomW*.94,roomH*.94]:[cam+W/2,camY+H/2,W,H];
    if(!indoors&&oldPlatforms!==platforms){
      chunks=platforms.map((r,i)=>({r,data:buildStatic(()=>{if(r.type!=='M'&&r.type!=='C')roomKit(r,i,t)})}));
      oldPlatforms=platforms;
    }
    const visible=[],base=indoors?184:(rogue?district.height+32:230);
    for(const layer of (indoors||![2,3,6].includes(level)?[1,0]:[1])){
      const spacing=layer?100:69,z=layer?-365:-178,center=camera[0]+z*.13;
      const spread=camera[2]*.53*(1-z/610)+spacing;
      for(let i=Math.floor((center-spread)/spacing);i<=Math.floor((center+spread)/spacing);i++){
        const stage=indoors?0:level,key=[base,stage,layer,i].join('/');
        if(!sectorCache.has(key)){
          if(sectorCache.size>120)sectorCache.delete(sectorCache.keys().next().value);
          sectorCache.set(key,buildStatic(()=>geometry.cityBlock(i,layer,stage,base,spacing)));
        }
        visible.push({data:sectorCache.get(key)});
      }
    }
    if(!indoors){
      const start=Math.floor((camera[0]-camera[2]*.64-160)/160),end=Math.ceil((camera[0]+camera[2]*.64+80)/160);
      for(let i=start;i<=end;i++){
        const key=['landmark',level,base,i].join('/');
        if(!sectorCache.has(key))sectorCache.set(key,buildStatic(()=>geometry.landmark(i,level,base)));
        visible.push({data:sectorCache.get(key)});
      }
    }
    if(indoors){
      // Cache the furniture until the room width changes.
      const key=String(roomW);
      if(key!==loftKey){loftData=buildStatic(()=>geometry.loft(roomW,roomH));loftKey=key}
      visible.push({data:loftData});
    }else visible.push(...chunks.filter(({r})=>r.x+r.w>cam-50&&r.x<cam+W+50&&r.y>camY-36&&r.y<camY+H+97));
    target=batch();felineVisible=false;
    if(indoors)homeFurniture(roomW,roomH);else liveObjects(t);
    return {indoors,t,camera,visible,front:target,roomW,roomH};
  }

  function init(canvas3d){
    const gl=canvas3d.getContext('webgl2',{antialias:false,alpha:false,depth:true,powerPreference:'high-performance'});
    if(!gl)return null;
    const depthProgram=program(gl,`#version 300 es
      layout(location=0) in vec3 pos;layout(location=3) in vec4 ax;layout(location=4) in vec4 ay;layout(location=5) in vec4 az;
      ${shadowProjection}
      void main(){vec3 p=mat3(ax.xyz,ay.xyz,az.xyz)*pos+vec3(ax.w,ay.w,az.w);gl_Position=vec4(fromLight(p),1.);}`,
      `#version 300 es
      precision mediump float;out vec4 color;void main(){color=vec4(1.);}`);
    const surface=program(gl,meshVert,meshFrag),back=program(gl,quadVert,bgFrag),post=program(gl,quadVert,postFrag);
    const drawCat=makeCatSurface(gl,program,rgb),meshes={};
    for(const name of names){
      const vao=gl.createVertexArray();gl.bindVertexArray(vao);
      const data=meshData(name);
      gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
      for(const [loc,size,offset] of [[0,3,0],[1,3,12],[2,2,24]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,32,offset)}
      const inst=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,inst);
      for(let j=0;j<5;j++){gl.enableVertexAttribArray(3+j);gl.vertexAttribPointer(3+j,4,gl.FLOAT,false,80,j*16);gl.vertexAttribDivisor(3+j,1)}
      meshes[name]={vao,inst,count:data.length/8,pack:new Float32Array(20480)};
    }
    gl.bindVertexArray(null);
    function texture(){
      const id=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,id);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      return id;
    }
    const materials=texture();
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([151,139,119,255]));
    const materialImage=new Image();
    materialImage.onload=()=>{if(gl.isContextLost())return;gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,materials);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,materialImage);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR)};
    materialImage.src=canvas3d.dataset.materials;
    const atlas=document.createElement('canvas');atlas.width=128;atlas.height=2048;
    const ink=atlas.getContext('2d');ink.fillStyle='#060908';ink.fillRect(0,0,128,2048);ink.textAlign='center';ink.fillStyle='white';
    themes.flatMap(t=>t.slice(3)).forEach((str,i)=>{
      ink.font='bold 48px sans-serif';const text=str.replace(/ /g,'');
      ink.fillText(text[0],64,i*128+56);ink.fillText(text[1],64,i*128+107);
      ink.fillRect(23,i*128+11,82,2);ink.fillRect(23,i*128+116,82,2);
    });
    const label=texture();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    const fb=gl.createFramebuffer(),rt=texture(),depth=gl.createRenderbuffer();
    let width=0,height=0,renderScale=1,frameCount=0,windowStart=performance.now();
    const bind=(unit,tex)=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex)};
    const shadowFb=gl.createFramebuffer(),shadeDepth=texture(),shadowSize=512;
    gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT16,shadowSize,shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_SHORT,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadeDepth,0);
    gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Shadow buffer allocation failed');
    const lamps=new Float32Array(24);
    function drawScene(){
      const cw=canvas3d.clientWidth,ch=canvas3d.clientHeight;
      if(!cw||!ch)return;
      W=Math.max(172,Math.round(H*cw/ch));
      const now=performance.now();frameCount++;
      if(now-windowStart>1800){
        const mean=(now-windowStart)/frameCount;
        if(frameCount>5&&mean>29)renderScale=Math.max(.55,renderScale-.13);
        else if(mean<17.5)renderScale=Math.min(1,renderScale+.06);
        frameCount=0;windowStart=now;
      }
      const factor=renderScale*Math.min(devicePixelRatio||1,1.45,1400/cw,800/ch);
      const w=Math.max(2,Math.round(cw*factor)),h=Math.max(2,Math.round(ch*factor));
      if(w!==width||h!==height){
        width=canvas3d.width=w;height=canvas3d.height=h;
        bind(0,rt);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
        gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);
        gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,rt,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
        if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('3D viewport allocation failed');
      }
      const {indoors,t,camera,visible,front,roomW,roomH}=sceneFor(cw,ch);
      for(const name of names){
        const m=meshes[name],count=visible.reduce((v,o)=>v+o.data[name].length,front[name].length);
        m.instances=count/20;if(!count)continue;if(m.pack.length<count)m.pack=new Float32Array(Math.ceil(count/2048)*2048);
        let pos=0;for(const o of visible){m.pack.set(o.data[name],pos);pos+=o.data[name].length}m.pack.set(front[name],pos);
        gl.bindVertexArray(m.vao);gl.bindBuffer(gl.ARRAY_BUFFER,m.inst);gl.bufferData(gl.ARRAY_BUFFER,m.pack.subarray(0,count),gl.DYNAMIC_DRAW);

      }
      const shadowView=[camera[0],camera[1],camera[2]*.65+28,camera[3]*.62+55];
      gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFb);gl.viewport(0,0,shadowSize,shadowSize);gl.enable(gl.DEPTH_TEST);gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(depthProgram.id);gl.uniform4fv(depthProgram.u.shadowView,shadowView);
      for(const m of Object.values(meshes))if(m.instances){gl.bindVertexArray(m.vao);gl.drawArraysInstanced(gl.TRIANGLES,0,m.count,m.instances)}
      if(felineVisible)drawCat(camera,indoors,shadowView,true);
      gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.viewport(0,0,w,h);gl.clear(gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);
      gl.useProgram(back.id);gl.bindVertexArray(null);gl.uniform1f(back.u.climate,indoors?0:level);gl.uniform3fv(back.u.accent,rgb(t[0]));gl.drawArrays(gl.TRIANGLES,0,3);
      gl.enable(gl.DEPTH_TEST);gl.useProgram(surface.id);gl.uniform4fv(surface.u.camera,camera);gl.uniform4fv(surface.u.shadowView,shadowView);bind(3,shadeDepth);gl.uniform1i(surface.u.shadeDepth,3);gl.uniform1f(surface.u.tick,clock);
      gl.uniform3fv(surface.u.accent,rgb(t[0]));gl.uniform3fv(surface.u.secondary,rgb(t[1]));bind(1,label);gl.uniform1i(surface.u.labels,1);bind(2,materials);gl.uniform1i(surface.u.materials,2);
      const closest=visible.filter(o=>o.r&&o.r.w>70).sort((a,b)=>Math.hypot(a.r.x+a.r.w*.5-camera[0],a.r.y-camera[1])-Math.hypot(b.r.x+b.r.w*.5-camera[0],b.r.y-camera[1]));
      lamps.fill(0);closest.slice(0,5).forEach(({r},i)=>lamps.set([r.x+r.w*.59,r.y-32,-12,i%2?2.6:-2.8],i*4));
      if(indoors){
        lamps.set([roomW*.82,47,-49,2.3],0);lamps.set([roomW*.66,37,-62,-1.65],4);
        lamps.set([roomW*.2,31,-28,1.1],8);lamps.set([roomW*.94,65,-39,.8],12);
      }
      const subject=indoors?houseCat:player;
      gl.uniform1i(surface.u.indoors,indoors?1:0);gl.uniform4fv(surface.u.subject,[subject.x,subject.y,subject.z||0,0]);lamps.set([subject.x+7,subject.y-24,20,indoors?.7:.98],20);gl.uniform4fv(surface.u.lights,lamps);
      for(const m of Object.values(meshes))if(m.instances){gl.bindVertexArray(m.vao);gl.drawArraysInstanced(gl.TRIANGLES,0,m.count,m.instances)}
      if(felineVisible)drawCat(camera,indoors,shadowView);
      gl.bindVertexArray(null);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.DEPTH_TEST);gl.useProgram(post.id);
      bind(0,rt);gl.uniform1i(post.u.frame,0);gl.uniform1f(post.u.time,clock);gl.uniform1f(post.u.weather,indoors?0:[.9,.25,.12,1.,.5,.2,0.,.45][level]);gl.uniform1f(post.u.climate,indoors?-1:level);gl.uniform2f(post.u.resolution,w,h);gl.drawArrays(gl.TRIANGLES,0,3);
      if(!indoors&&rogue)paintSurvey();
    }
    return drawScene;
  }
  let render=null,software=null,started=false;
  function activate(){
    const el=document.getElementById('scene3d');if(!el)return;
    try{render=init(el)}catch(error){console.warn('3D scene unavailable:',error.message);render=null}
    el.hidden=!render;
  }
  return function(){
    if(!started){
      started=true;const el=document.getElementById('scene3d');
      if(!el)return false;
      el.addEventListener('webglcontextlost',e=>{e.preventDefault();render=null;el.hidden=true});
      el.addEventListener('webglcontextrestored',activate);activate();
    }
    if(render)try{render();return true}catch(error){console.warn('Switched to software 3D:',error.message);render=null;document.getElementById('scene3d').hidden=true}
    software||=createSoftwareScene();
    const cw=canvas.clientWidth,ch=canvas.clientHeight;if(!cw||!ch)return true;
    W=Math.max(172,Math.round(H*cw/ch));const scene=sceneFor(cw,ch);
    software(scene,felineVisible,cw,ch);return true;
  };
})();
