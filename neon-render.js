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
      const sphere=shape==='orb',cone=shape==='cone',cols=sphere?16:cone?5:12,rows=sphere?10:1;
      const sample=(i,j)=>{
        const u=i/cols,v=j/rows,a=u*Math.PI*2,b=(v-.5)*Math.PI;
        const r=sphere?Math.cos(b):cone?Math.max(.001,v):1;
        const x=Math.cos(a),z=Math.sin(a);
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
  uniform sampler2D labels;uniform sampler2D city;uniform sampler2D facades;uniform vec4 lights[6];uniform vec3 accent;uniform vec3 secondary;uniform vec4 camera;
  out vec4 col;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*4375.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
  void main(){
    vec3 n=normalize(N),v=normalize(vec3(camera.xy-P.xy+vec2(72,-120),610.-P.z));
    float metal=M.x,emit=C.a; vec3 base=C.rgb;
    float grime=noise(P.xy*.31+P.z*.13),grain=h(floor((P.xy+P.z*.52)*3.));
    if(metal>3.5){
      vec2 tile=vec2(mod(M.y,2.),floor(M.y/2.));
      vec3 patina=texture(facades,(tile+clamp(U,.004,.996))*.5).rgb;
      base=mix(base,patina,.94);emit=max(0.,max(max(patina.r,patina.g),patina.b)-.59)*1.4;
      metal=.17+grime*.15;
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
    vec3 env=textureLod(city,clamp(vec2(.5+.47*reflected.x,.52-.44*reflected.y)+grime*.012,.001,.999),2.4).rgb;
    float wet=smoothstep(.35,.85,grime)*max(-n.y,0.)*metal;
    vec3 lit=base*light+spec*(.12+.7*metal)+env*(.12*metal+wet*.52+edge*.24)+edge*accent*.15+base*emit;
    float fog=smoothstep(4.,160.,-P.z)*.52;
    col=vec4(mix(lit,vec3(.102,.18,.20),fog),1.);
  }`;
  const quadVert=`#version 300 es
  out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
  const bgFrag=`#version 300 es
  precision highp float;in vec2 uv;uniform sampler2D city;uniform vec4 camera;uniform vec3 accent;uniform float imageRatio;uniform bool indoors;
  out vec4 col;void main(){
    vec2 q=vec2(uv.x,1.-uv.y)-.5;float ratio=camera.z/camera.w;
    if(indoors){q*=vec2(min(1.,ratio/imageRatio),min(1.,imageRatio/ratio));col=texture(city,q+.5);return;}
    q*=vec2(min(1.,ratio/imageRatio),min(1.,imageRatio/ratio))*.83;
    q+=.5+vec2(.07*sin(camera.x*.0018),.065*sin(camera.y*.003));
    vec3 sky=texture(city,q).rgb;
    col=vec4(sky*vec3(.68,.74,.81)+accent*.028+vec3(.018,.025,.035),1.);
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
  function batch(){return {box:[],orb:[],tube:[],cone:[]}}
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
    if(variant!==1 && variant!==4){
      box(mid,y-29,rear-3,w-5,57,5,wall,.34);
      const tile=[0,3,1,2,0,3,2,0][level];
      box(mid,y-29,rear-.3,w-6,55,.65,wall,4,0,0,0,0,(tile+variant%3)%4);
      box(mid,y-59,rear+1,w,2.4,9,steel);
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
  let gaitPhase=0,gaitWeight=0,heading=0,lastPose=-1,trackedCat;
  function catModel(p=player,facing=dir,atHome=false){
    const dt=Math.max(0,Math.min(.06,clock-lastPose));lastPose=clock;
    const targetYaw=atHome?-.32:facing<0?Math.PI:0;
    if(trackedCat!==p){trackedCat=p;heading=targetYaw;gaitWeight=0}
    heading+=Math.max(-dt*19,Math.min(dt*19,targetYaw-heading));
    const side=Math.cos(heading),depth=Math.sin(heading),speed=Math.abs(p.vx);
    const desired=p.ground?Math.min(1,speed/108):0;
    gaitWeight+=(desired-gaitWeight)*(1-Math.exp(-14*dt));
    gaitPhase+=dt*(5+speed*.106);
    const gallop=Math.max(0,Math.min(1,(speed-64)/62));
    const inRoll=!atHome&&rogue&&rolling>0;
    const attack=!atHome&&rogue&&swipe>0?Math.sin(Math.PI*(1-swipe/.15)):0;
    const air=p.ground?0:Math.tanh(p.vy/115);
    const landing=(p.land||0)/.115;
    const arch=Math.cos(gaitPhase*2)*gaitWeight;
    const angle=inRoll?(1-rolling/.22)*Math.PI*2:air*.26+arch*.044*gallop-attack*.08;
    const bob=arch*.59+landing*1.8+Math.sin(clock*2.2)*.14;
    const co=Math.cos(angle),si=Math.sin(angle);
    function point(x,y,z){
      const fwd=co*x-si*(y+7);
      return [p.x+side*fwd+depth*z,p.y-7+si*x+co*(y+7)+bob,z*side-depth*fwd];
    }
    const [ginger,cream,stripe]=coat(),saddle='#384148';
    const ell=(x,y,z,w,h,dep,color,mat=2,tilt=0,emit=0)=>part('orb',...point(x,y,z),w,h,dep,color,mat,emit,(angle+tilt)*side,heading);
    const bone=(a,b,r,col)=>beam(...point(...a),...point(...b),r,col,.15);
    let tail=[-7,-8,-.4];
    for(let j=0;j<8;j++){
      const lift=(1-gaitWeight)*.55;
      const next=[tail[0]-1.6+Math.max(0,j-4)*.32,tail[1]-.45-j*.1-lift+Math.sin(clock*3.5-j*.42)*.42+air*.45,tail[2]+Math.sin(clock*2-j*.3)*.38+depth*.72];
      const r=1.25-j*.079;
      bone(tail,next,r,j%3===1?stripe:ginger);ell(...next,r*2,r*2,r*2,ginger);tail=next;
    }
    // Move each planted paw backwards through stance, then lift it for recovery.
    for(const z of [-2.3,2.3])for(const hip of [-5.2,4.4]){
      const rear=hip<0,far=z<0;
      const walkOffset=(far?Math.PI:0)+(rear?0:Math.PI*.52);
      const runOffset=(far?.86:0)+(rear?0:Math.PI);
      const phase=gaitPhase+walkOffset*(1-gallop)+runOffset*gallop;
      const lift=Math.max(0,Math.sin(phase))*gaitWeight;
      let fx=hip+Math.cos(phase)*(3.7+gallop*1.65)*gaitWeight,fy=-.85-lift*(2.8+gallop)-bob;
      if(!p.ground){fx=hip+(rear?air*3.2:1.2+air*2);fy=-2.3-(1-Math.abs(air))*2.7-(rear?Math.max(0,air):Math.max(0,-air))*1.4}
      if(inRoll){fx=hip*.48;fy=-5}
      if(!rear&&((chain%2===0)===far)&&attack){fx+=attack*7.7;fy-=attack*5.8}
      const root=[hip,-8.1+(rear?arch*.45:-arch*.25),z],foot=[fx,fy,z];
      const dx=fx-root[0],dy=fy-root[1],len=Math.max(.01,Math.hypot(dx,dy));
      const bend=Math.sqrt(Math.max(.1,4.35*4.35-len*len*.25))*(rear?1:-1);
      const knee=[(hip+fx)*.5+dy/len*bend,(root[1]+fy)*.5-dx/len*bend,z];
      ell(hip,-7.8,z,rear?5:3.6,6.8,2.7,ginger);
      bone(root,knee,rear?1.38:1.05,ginger);
      if(rear){
        const hock=[fx-1.25,(knee[1]+fy)*.5,z];bone(knee,hock,.95,ginger);bone(hock,foot,.68,cream);
      }else bone(knee,foot,.75,cream);
      ell(fx+.58,fy,z,2.9,1.55,1.85,cream);
    }
    ell(-1,-8.6,0,16.6+gallop*arch,7.7,7.2,ginger,2,-.035);
    ell(4.6,-10.3,.05,6.9,7.9,6.3,ginger,2,-.35);
    const hx=attack*1.6+gaitWeight*.4,hy=landing*.7-arch*.35+Math.sin(clock*1.6)*.16;
    ell(8.3+hx,-14+hy,.1,7.5,6.7,6.4,ginger,2,-.08);
    const blink=clock%4.7<.15?.15:1;
    for(const z of [-1.95,1.95]){
      const tilt=-.15+Math.pow(Math.max(0,Math.sin(clock*2.3+z)),18)*.18-attack*.17;
      part('cone',...point(7+hx,-17.3+hy,z),3.7,4.6,2.4,ginger,.18,0,(angle+tilt)*side,heading);
      part('cone',...point(7.3+hx,-17.35+hy,z+.18),2.45,3.15,1.5,'#b2786f',.2,0,(angle+tilt)*side,heading);
      const s=Math.sign(z);
      ell(10.65+hx,-13.35+hy,s*1.4,2.9,2.3,2.25,cream,.2);
      ell(9.68+hx,-14.92+hy,s*3.04,1.72,1.10*blink,.62,'#a8d791',.22,.03,.36);
      ell(9.86+hx,-14.95+hy,s*3.38,.38,.89*blink,.23,'#273527',.22);
      for(let j=0;j<3;j++)bone([10.3+hx,-13.55+hy+j*.23,s*2],[13+hx+j*.35,-14.1+hy+j*.8,s*4],.065,cream);
    }
    ell(12+hx,-13.95+hy,.1,1.15,.88,1.4,'#aa776c',.15);
    ell(-.2,-8.8,.1,5.6,8.25,7.45,saddle,.63);
    ell(-1.3,-12,0,6.7,3.4,5.8,'#465154',.67);
    for(const z of [-3.25,3.25])part('box',...point(-1.5,-11.3,z),3.4,1.1,.35,'#7efffc',.18,1,angle*side,heading);
  }
  const resident={x:0,y:0,ground:true,vx:0,vy:0,land:0};
  function homeFurniture(w,h){
    const x=w*.72,y=h*.865;
    resident.x=x;resident.y=y-1.7;
    ball(x,y+1.5,0,40,1.8,21,'#302620',.8);
    const bed=profile.bed;
    if(bed==='capsule'){
      ball(x,y-.6,0,38,5.2,19,'#334752',.78);
      ball(x,y-2.2,0,34,2.2,17,'#71dacf',.2,.38);
    }else if(bed==='velvet'){
      ball(x,y-.6,0,36,4.5,20,'#934958',2);
      for(let i=0;i<11;i++){const a=Math.PI+i*Math.PI/10;ball(x+15*Math.cos(a),y-2,8*Math.sin(a),7,5,6,'#b76675',2)}
    }else ball(x,y,0,34,2.2,17,'#8a6350',2);
    if(profile.display==='fern'){
      const px=x+22;
      part('tube',px,y-3,0,6,6,6,'#996c55');
      for(let j=0;j<9;j++){const a=j*2.4;beam(px,y-6,0,px+Math.cos(a)*5,y-11-j%4,Math.sin(a)*3,.27,'#789260');part('orb',px+Math.cos(a)*4,y-10-j%4,Math.sin(a)*3,2.8,6.2,1.4,j%2?'#829b6d':'#506f53',2,0,Math.cos(a)*.8)}
    }else if(profile.display==='beacon'){
      const px=x+22;
      ball(px,y,0,9,2,7,'#5e6e6c');part('cone',px,y-5,0,6,10,5,'#d5a882');box(px,y-10.5,0,4,3.8,4,'#ffb267',.22,1.15);part('cone',px,y-13,0,6,3,5,'#506974');
    }
    catModel(resident,1,true);
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

  function init(canvas3d){
    const gl=canvas3d.getContext('webgl2',{antialias:false,alpha:false,depth:true,powerPreference:'high-performance'});
    if(!gl)return null;
    const surface=program(gl,meshVert,meshFrag),back=program(gl,quadVert,bgFrag),post=program(gl,quadVert,postFrag);
    const meshes={},names=['box','orb','tube','cone'];
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
    const city=texture();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([32,48,53,255]));
    let imageRatio=1.7778;
    const image=new Image();
    image.onload=()=>{if(gl.isContextLost())return;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,city);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);imageRatio=image.width/image.height};
    image.src=canvas3d.dataset.city;
    const indoor=texture();let homeRatio=1.7778;
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([31,43,43,255]));
    const roomImage=new Image();
    roomImage.onload=()=>{if(gl.isContextLost())return;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,indoor);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,roomImage);gl.generateMipmap(gl.TEXTURE_2D);homeRatio=roomImage.width/roomImage.height};
    roomImage.src=canvas3d.dataset.homeImage;
    const facade=texture();
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([68,76,74,255]));
    const shopImage=new Image();
    shopImage.onload=()=>{if(gl.isContextLost())return;gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,facade);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,shopImage);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR)};
    shopImage.src=canvas3d.dataset.shops;
    const atlas=document.createElement('canvas');atlas.width=128;atlas.height=2048;
    const ink=atlas.getContext('2d');ink.fillStyle='#060908';ink.fillRect(0,0,128,2048);ink.textAlign='center';ink.fillStyle='white';
    themes.flatMap(t=>t.slice(3)).forEach((str,i)=>{
      ink.font='bold 48px sans-serif';const text=str.replace(/ /g,'');
      ink.fillText(text[0],64,i*128+56);ink.fillText(text[1],64,i*128+107);
      ink.fillRect(23,i*128+11,82,2);ink.fillRect(23,i*128+116,82,2);
    });
    const label=texture();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    const fb=gl.createFramebuffer(),rt=texture(),depth=gl.createRenderbuffer();
    let oldPlatforms=null,chunks=[],width=0,height=0,renderScale=1,frameCount=0,windowStart=performance.now();
    const bind=(unit,tex)=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex)};
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
      const indoors=state==="home",roomH=110,roomW=roomH*cw/ch;
      const t=themes[level],camera=indoors?[roomW/2,roomH/2,roomW,roomH]:[cam+W/2,camY+H/2,W,H];
      if(!indoors&&oldPlatforms!==platforms){
        chunks=platforms.map((r,i)=>{
          target=batch();if(r.type!=='M'&&r.type!=='C')roomKit(r,i,t);
          for(const key of names)target[key]=new Float32Array(target[key]);
          return {r,data:target};
        });oldPlatforms=platforms;
      }
      const visible=indoors?[]:chunks.filter(({r})=>r.x+r.w>cam-50&&r.x<cam+W+50&&r.y>camY-36&&r.y<camY+H+97);
      target=batch();if(indoors)homeFurniture(roomW,roomH);else liveObjects(t);
      const front=target;
      gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.viewport(0,0,w,h);gl.clear(gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);
      gl.useProgram(back.id);gl.bindVertexArray(null);bind(0,indoors?indoor:city);gl.uniform1i(back.u.indoors,indoors?1:0);gl.uniform1i(back.u.city,0);gl.uniform4fv(back.u.camera,camera);gl.uniform3fv(back.u.accent,rgb(t[0]));gl.uniform1f(back.u.imageRatio,indoors?homeRatio:imageRatio);gl.drawArrays(gl.TRIANGLES,0,3);
      gl.enable(gl.DEPTH_TEST);gl.useProgram(surface.id);gl.uniform4fv(surface.u.camera,camera);
      gl.uniform3fv(surface.u.accent,rgb(t[0]));gl.uniform3fv(surface.u.secondary,rgb(t[1]));gl.uniform1i(surface.u.city,0);bind(1,label);gl.uniform1i(surface.u.labels,1);bind(2,facade);gl.uniform1i(surface.u.facades,2);
      const closest=visible.filter(o=>o.r.w>70).sort((a,b)=>Math.hypot(a.r.x+a.r.w*.5-camera[0],a.r.y-camera[1])-Math.hypot(b.r.x+b.r.w*.5-camera[0],b.r.y-camera[1]));
      lamps.fill(0);closest.slice(0,5).forEach(({r},i)=>lamps.set([r.x+r.w*.59,r.y-32,-12,i%2?2.6:-2.8],i*4));
      const subject=indoors?resident:player;lamps.set([subject.x+7,subject.y-24,20,indoors?.7:.98],20);gl.uniform4fv(surface.u.lights,lamps);
      for(const name of names){
        const m=meshes[name],count=visible.reduce((v,o)=>v+o.data[name].length,front[name].length);
        if(!count)continue;if(m.pack.length<count)m.pack=new Float32Array(Math.ceil(count/2048)*2048);
        let pos=0;for(const o of visible){m.pack.set(o.data[name],pos);pos+=o.data[name].length}m.pack.set(front[name],pos);
        gl.bindVertexArray(m.vao);gl.bindBuffer(gl.ARRAY_BUFFER,m.inst);gl.bufferData(gl.ARRAY_BUFFER,m.pack.subarray(0,count),gl.DYNAMIC_DRAW);
        gl.drawArraysInstanced(gl.TRIANGLES,0,m.count,count/20);
      }
      gl.bindVertexArray(null);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.DEPTH_TEST);gl.useProgram(post.id);
      bind(0,rt);gl.uniform1i(post.u.frame,0);gl.uniform1f(post.u.time,clock);gl.uniform1f(post.u.weather,indoors?0:[.9,.25,.12,1.,.5,.2,0.,.45][level]);gl.uniform1f(post.u.climate,indoors?-1:level);gl.uniform2f(post.u.resolution,w,h);gl.drawArrays(gl.TRIANGLES,0,3);
      if(!indoors&&rogue)paintSurvey();
    }
    return drawScene;
  }
  let render=null,started=false;
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
    if(!render)return false;
    try{render();return true}catch(error){console.warn('Switched to compatibility artwork:',error.message);render=null;document.getElementById('scene3d').hidden=true;return false}
  };
})();
