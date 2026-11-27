// The physical scene uses the same X/Y coordinates as the platform simulation.
// Positive Z points out of the city toward the camera. All game state is read-only.
const NeonCity = (() => {
  const themes = [
    ['#6af2bf','#ff9c47','#8eaeb1','夜市','電 器'],
    ['#a4dfc4','#f1b164','#b4999b','後巷','修 理'],
    ['#69edac','#a0d9e7','#81b3a5','溫室','培 養'],
    ['#7ad3ee','#ff9a58','#91b4c8','港口','冷 藏'],
    ['#c89af4','#ed689f','#a998b9','映畫','放 映'],
    ['#ffc278','#e77551','#b7a293','紙坊','製 紙'],
    ['#9cf8e9','#79b9ff','#a8c5d5','製冰','冷 庫'],
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
  uniform sampler2D labels;uniform sampler2D materials;uniform sampler2D alleyMats;uniform sampler2D shops;uniform vec4 subject;uniform bool indoors;uniform vec4 lights[6];uniform vec3 accent;uniform vec3 secondary;uniform vec4 camera;
  out vec4 col;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*4375.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
  void main(){
    vec3 n=normalize(N),v=normalize(vec3(camera.xy-P.xy+vec2(72,-120),610.-P.z));
    float metal=M.x,emit=C.a; vec3 base=C.rgb;
    float grime=noise(P.xy*.31+P.z*.13),grain=h(floor((P.xy+P.z*.52)*3.));
    if(metal>7.5){
      vec2 tile=vec2(mod(M.y,2.),floor(M.y/2.));
      vec3 paint=texture(shops,(tile+.003+.994*U)*.5).rgb;
      base=paint*1.13+.016;metal=.24;emit=.21+smoothstep(.38,.76,max(paint.r,max(paint.g,paint.b)))*.21;
    }else if(metal>5.5){
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
      float size=M.y==2.?12.:M.y==1.?36.:M.y==3.?26.:M.y==4.?42.:M.y==5.?83.:M.y==6.?35.:M.y==7.?28.:55.;
      vec2 tile=vec2(mod(M.y,2.),mod(floor(M.y/2.),2.));
      vec2 st=(tile+.003+.994*fract(coord/size))*.5;
      vec3 sampleCol=M.y>3.5?texture(alleyMats,st).rgb:texture(materials,st).rgb;
      base=sampleCol*(.43+base*.99);metal=M.y==3.||M.y==7.?.52:M.y==4.?.41:M.y==6.?.35:.14;
    }else if(metal>1.5 && metal<2.5){ // tabby fur running with the body
      float stripe=smoothstep(.52,.9,sin(U.x*74.+sin(U.y*15.)*2.));
      base*=1.-.35*stripe*smoothstep(.1,.55,U.y);base*=.96+.045*grain;emit=.24;metal=.02;
    }else if(metal>2.5 && metal<3.5){
      vec3 glyph=texture(labels,vec2(U.x,(U.y+M.y)/16.)).rgb;
      if(metal>3.1){base=mix(base,vec3(.064,.073,.066),glyph.r);emit*=.63*(1.-glyph.r);}
      else{base=mix(base,vec3(.032,.04,.047),1.-glyph.r);emit*=glyph.r;}
      metal=.16;
    }else{
      base*=.83+.18*grime+.07*grain;
    }
    float edge=pow(1.-max(0.,dot(n,v)),3.);
    vec3 key=normalize(vec3(-.42,-.8,.65));
    vec3 light=indoors?vec3(.26,.32,.37)+max(0.,dot(n,key))*vec3(.60,.56,.50):
      vec3(.20,.25,.27)+max(0.,dot(n,key))*vec3(.44,.41,.36);
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
    vec3 glimmer=vec3(0.);
    if(!indoors&&n.y<-.55){
      float ripple=noise(P.xz*vec2(.43,.94))*.14;
      for(int j=0;j<5;j++){
        vec2 d=lights[j].xz-P.xz;float dy=P.y-lights[j].y;
        if(dy>0.&&dy<70.){
          float pool=exp(-abs(d.x+ripple*4.)*.13-abs(d.y)*.014);
          glimmer+=mix(secondary,accent,step(0.,lights[j].w))*pool*wet*.81;
        }
      }
    }
    vec3 lit=glimmer+base*light+spec*(.12+.7*metal)+env*(.12*metal+wet*.52+edge*.24)+edge*accent*.15+base*emit;
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
    if(!indoors){
      vec2 ray=(P.xy-camera.xy+P.z*vec2(-.13,.23))/(1.-P.z/610.);
      for(int j=0;j<5;j++){
        vec3 q=lights[j].xyz;
        vec2 delta=ray-(q.xy-camera.xy+q.z*vec2(-.13,.23))/(1.-q.z/610.);
        float halo=exp(-length(delta*vec2(.85,1.20))*.075)*smoothstep(-2.,10.,q.z-P.z);
        lit+=halo*abs(lights[j].w)*.037*mix(secondary,accent,step(0.,lights[j].w));
      }
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
    box(x,y,z+1.45,w,h,.25,col,tag%2?3.22:3,1.35,0,0,0,tag);
  }
  const street=buildStreetSites({box,ball,part,beam,sign});
  const storefront=buildStreetFronts({box,ball,part,beam,sign});
  function maintenancePier(r){
    const x=r.x+r.w/2,y=r.y,h=r.underside-y;
    // Cladding and cap share the collision slab's top and sides.
    box(x,y+h/2,-4,r.w,h,14,'#526664',4,0,0,0,0,7);
    box(x,y+1,0,r.w,2,9,'#87928a',.68);
    for(const side of [-1,1])box(x+side*4,y+h/2,3.25,1,h-3,.7,'#75c6b4',.45,.3);
    for(let dy=7;dy<h-2;dy+=9){
      box(x,y+dy,3.55,6,.75,1,'#adb5a2',.65);
      beam(x,y+dy,-8,x,y+dy+4,-26,.84,'#687579');
    }
  }
  function marketProps(){
    if(!market)return;
    const panel=market.sign,live=panel.state!=='down',y=live?panel.y:panel.ground-.8;
    for(const off of [-10,10]){
      beam(panel.x+off,panel.anchor-14,-24,panel.x+off,panel.anchor-14,-2,.65,steel);
      beam(panel.x+off,panel.anchor-14,-2,panel.x+off,panel.anchor-(panel.state==='hung'?4:9),-2,.33,aluminum);
    }
    if(live){
      sign(panel.x,y,-3,28,7,'#ff946e',13);
      for(let j=0;j<4;j++)ball(panel.x-10+j*6.5,y+4,-.9,1.2,1.1,.7,'#ffd48e',.25,.8);
    }else{
      box(panel.x,y,-3,29,1.5,7,'#654f4d',.66);
      box(panel.x-5,y-.9,-3,10,.4,5,'#946d60',.5,0,0,.06);
    }
    const f=market.fuse,fy=f.ground-7,col=f.broken?'#3b4748':'#a5d3bd';
    box(f.x,fy,-6,12,14,6,'#5a6461',.68);
    box(f.x,fy,-2.8,10.8,12.3,.85,col,.58,0,f.broken?-.14:0);
    beam(f.x+3,fy-6,-7,f.x+3,fy-14,-16,.7,'#775d50');
    box(f.x-2,fy-3,-2,3.8,1.7,.55,f.broken?'#665958':'#b6f5a1',.35,f.broken?0:1);
    for(let k=0;k<3;k++)box(f.x,fy+k*1.6,-2,6.4,.64,.5,'#394a46',.4);
    const b=market.box,bx=b.x,by=b.ground,closed=player.hiddenBox;
    box(bx,by-7,-21,26,14,1.1,'#ae8457',.22);
    for(const side of [-1,1]){
      box(bx+side*12.5,by-7,-14,1,14,14,'#ad8151',.24);
      box(bx+side*(closed?6.4:14.3),by-(closed?14.1:15.7),-13.6,closed?12.8:7,.8,15,'#c79d6c',.2,0,closed?0:side*-.58);
    }
    box(bx,by-6.5,-6.6,26,13,1,'#bc9061',.24);
    box(bx+3.8,by-6.5,-5.96,3,12.6,.15,'#d4b891',.22);
    box(bx-5.5,by-8.2,-5.9,6.5,3.7,.19,'#dbd2aa',.26);
    for(let i=0;i<4;i++)box(bx-7.6+i*1.1,by-8.1,-5.72,.45,2.1,.12,'#70665c');
    if(closed)for(const side of [-1,1])ball(bx-5+side*1.7,by-3.7,-5.85,1.4,.72,.2,'#e7b775',.3,.44);
  }
  function routeBay(r){
    if(r.marketWall){maintenancePier(r);return}
    // Only the deck of the shuttle or the breakaway planks moves. Its supporting
    // wall, rail and fixings remain part of the static building.
    if(r.shopProp||r.site==='road')return;
    street.structure(r);
    if(r.room||(!rogue&&r.type!=='U'))storefront(r,level);
    if(r.type==='M'||r.type==='C')street.fixedMount(r);
    else street.tread(r);
  }
  let felineVisible=false,texturedCat=false;
  function catModel(p=player,indoors=false){
    const ceiling=!indoors&&rolling>0?streetCeilingAt(p.x,p.y):-Infinity;
    FelineRig.update(p,indoors,ceiling);felineVisible=true;
    const face=(x,y,z)=>FelineRig.transform(3,x,y,z),heading=FelineRig.heading;
    // Keep the facial details in head-bone space even when the neck turns
    // independently to groom, drink or look at the room.
    function oval(x,y,z,sx,sy,sz,color,tilt=0,glow=0,rotation=heading,bone=3,shape='orb'){
      const attach=(a,b,c)=>FelineRig.transform(bone,a,b,c);
      const mesh=target[shape];
      const local=rotation-heading,c=Math.cos(local),s=Math.sin(local),ct=Math.cos(tilt),st=Math.sin(tilt);
      const center=attach(x,y,z);
      const axes=[[c*ct*sx,st*sx,-s*ct*sx],[-c*st*sy,ct*sy,s*st*sy],[s*sz,0,c*sz]];
      for(let i=0;i<3;i++){
        const q=axes[i],end=attach(x+q[0],y+q[1],z+q[2]);
        mesh.push(end[0]-center[0],end[1]-center[1],end[2]-center[2],center[i]);
      }
      mesh.push(...rgb(color),glow,.13,0,0,0);
    }
    if(appearance('skin')==='courier'){
      for(const side of [-1,1]){
        oval(-1,-11.6,side*3.2,1.4,7.5,.55,'#644239',-.55,0,heading,1);
        oval(-2,-10,side*3.45,5.2,4.5,1.5,'#b64c3b',-.08,0,heading,1,'pad');
        oval(-2,-10.6,side*4.18,4.9,2,.42,'#da7d57',0,0,heading,1,'pad');
        oval(-2,-10.2,side*4.43,1,.7,.3,'#e6bf79',0,0,heading,1);
      }
    }else if(appearance('skin')==='welder'){
      oval(8.9,-16.5,0,3.6,2.6,6.6,'#524843');
      for(const side of [-1,1]){
        oval(10.2,-17.6,side*1.64,2.36,2.0,2.2,'#c09c58');
        oval(10.77,-17.74,side*1.71,1.85,1.4,1.65,'#619fa4',0,.25);
      }
    }else if(appearance('skin')==='aurora'){
      oval(-1.8,-13.2,0,8,3.7,5.7,'#364859',0,0,heading,1,'pad');
      for(let j=0;j<3;j++)oval(-4+j*2.3,-14.9,0,1.12,.93,3.9,'#78f3dd',0,.52+.34*Math.sin(clock*5-j),heading,1);
    }else if(appearance('skin')==='orchid'){
      for(const side of [-1,1]){
        oval(6.8,-12,side*2.5,3.4,3.2,2.3,'#915fa5',side*.4,0,heading,2);
        oval(6.9,-12.1,side*3.2,1.7,1.4,1.25,'#d6a7c6',0,0,heading,2);
      }
      oval(7.6,-11.8,0,2.7,2.3,3.9,'#bb88bb',0,0,heading,2);
    }
    if(!texturedCat)oval(12.16,-14.05,0,.62,.65,1.26,'#b67d76');
    if(indoors&&['groom','drink','eat'].includes(p.habit)){
      const lick=Math.max(0,Math.sin(clock*(p.habit==='drink'?11:7)))*p.intensity;
      if(lick>.16)oval(12.1+lick*.35,-13.04+lick*.5,0,.72,.3+lick*.26,.56,'#c88583');
    }
    for(const s of [-1,1]){
      if(!texturedCat){
      const lid=FelineRig.blink,a=heading+s*1.01;
      oval(11.03,-15.38,s*2.25,2.13,1.60*lid+.10,.81,'#624b3e',s*.045,0,a);
      oval(11.24,-15.39,s*2.39,1.87,1.46*lid,.54,'#c69148',0,.13,a);
      oval(11.39,-15.40,s*2.48,.78,1.14*lid,.34,'#30271f',0,0,a);
      if(lid>.5)oval(11.55,-15.78,s*2.49,.34,.29,.27,'#fff3d7',0,.44,a);
      }
      for(let k=0;k<4;k++){
        const x=11.24+.12*k,y=-13.46+k*.15;
        ball(...face(x,y,s*1.87),.17,.16,.13,'#654d40');
        const mid=face(x+.9,y-.22+k*.1,s*3);
        beam(...face(x,y,s*1.86),...mid,.045,'#d0c3a8');beam(...mid,...face(x+2.2,y-.7+k*.37,s*4.9),.026,'#d4c9b7');
      }
    }
  }
  function homeFurniture(w,h){
    const x=w*.72,y=h*.865;
    const resident=updateResident(w,h,clock);observeResident(resident);

    const bed=appearance('bed');
    if(bed==='cratebed'){
      box(x,y-1,0,34,2,19,'#8c674e');
      for(const side of [-1,1])box(x+side*16,y-3.2,0,2,6,19,'#bd9874');
      box(x,y-3.2,-8.5,32,6,2,'#a98260');
      part('pad',x,y-1.8,1,29,3.2,16,'#b85c57');
      for(const off of [-9,-3,3,9])box(x+off,y-3.4,1,.6,.2,13,'#e4ad89');
    }else if(bed==='coilbed'){
      ball(x,y-.8,0,34,3.5,18,'#46756b');
      for(let j=0;j<14;j++){
        const a=Math.PI*.8+j*Math.PI*1.4/14,b=a+Math.PI*.1;
        for(const dy of [2,4])beam(x+16*Math.cos(a),y-dy,8*Math.sin(a),x+16*Math.cos(b),y-dy,8*Math.sin(b),.75,'#b88f61');
      }
    }else if(bed==='capsule'){
      ball(x,y-.6,0,38,5.2,19,'#334752',.78);
      ball(x,y-2.2,0,34,2.2,17,'#71dacf',.2,.38);
    }else if(bed==='velvet'){
      ball(x,y-.6,0,36,4.5,20,'#934958',2);
      for(let i=0;i<11;i++){const a=Math.PI+i*Math.PI/10;ball(x+15*Math.cos(a),y-2,8*Math.sin(a),7,5,6,'#b76675',2)}
    }else ball(x,y,0,34,2.2,17,'#af856d',4,0,0,0,0,2);
    const dx=x+24;
    if(appearance('display')==='radio'){
      part('pad',dx,y-5,-1,15,10,7,'#987451');
      box(dx-2,y-5,2.7,8.7,7,.6,'#423f3a');
      for(let j=0;j<4;j++)box(dx-2,y-7+j*1.3,3.1,8,.45,.4,'#9e927b');
      for(const dy of [3,6.7])ball(dx+5,y-dy,3.1,2,2,1.5,'#e1bd7b');
      beam(dx+5,y-10,0,dx+10,y-22,0,.4,aluminum);
    }else if(appearance('display')==='orrery'){
      part('tube',dx,y-1,0,10,2,8,steel);beam(dx,y-2,0,dx,y-11,0,.85,ochre);
      ball(dx,y-11,0,5,5,5,'#ffca80',.28,.8);
      for(let i=0;i<2;i++){const a=clock*(i?.7:1.4)+i*2,r=6+i*3;
        const xx=dx+Math.cos(a)*r,zz=Math.sin(a)*r;
        beam(dx,y-11,0,xx,y-10-i*3,zz,.27,aluminum);ball(xx,y-10-i*3,zz,2.9,2.9,2.9,i?'#9acdc2':'#d59886')}
    }else if(appearance('display')==='lens'){
      box(dx,y-1,0,13,2,8,'#556169');beam(dx,y-2,0,dx,y-8,0,1.4,steel);
      ball(dx,y-10,0,10,9,8,'#828781',.75);ball(dx,y-10,3.4,6,6,3,'#e28061',.27,.55);
      ball(dx,y-10,4.9,2,2,.8,'#ffcd91',.3,1);
    }else if(appearance('display')==='fern'){
      const px=x+22;
      part('tube',px,y-3,0,6,6,6,'#996c55');
      for(let j=0;j<9;j++){const a=j*2.4;beam(px,y-6,0,px+Math.cos(a)*5,y-11-j%4,Math.sin(a)*3,.27,'#789260');part('orb',px+Math.cos(a)*4,y-10-j%4,Math.sin(a)*3,2.8,6.2,1.4,j%2?'#829b6d':'#506f53',2,0,Math.cos(a)*.8)}
    }else if(appearance('display')==='beacon'){
      const px=x+22;
      ball(px,y,0,9,2,7,'#5e6e6c');part('cone',px,y-5,0,6,10,5,'#d5a882');box(px,y-10.5,0,4,3.8,4,'#ffb267',.22,1.15);part('cone',px,y-13,0,6,3,5,'#506974');
    }

    catModel(resident,true);
  }
  function fixtures(r,i,t){
    const x=r.x,y=r.y,w=r.w,mid=x+w/2,[a,b]=t;
    if(r.type==='S'){
      const ramp=x+w-26;
      box(ramp,y-.9,-4,17,1.1,10,'#8ca594',.61,0,-.07);
      for(const dx of [-6,6]){part('tube',ramp+dx,y-.25,-4,2.5,.65,2.5,steel);box(ramp+dx,y-.64,1.1,2.4,.8,.6,'#99dfac',.27,.42)}
    }else if(r.type==='H')for(let k=-8;k<=8;k+=4){
      beam(mid+k,y,-.5,mid+k+.85,y-7-k%3,-.5,.69,'#ac6c4e');
      part('cone',mid+k+.85,y-7.5-k%3,-.5,1.35,1.7,1.4,'#d99b74',.66,.19);
    }
    if(r.type==='F'){
      box(x+20,y-10,-8,7.2,19,5,'#677b6e',.6);box(x+20,y-11,-5.2,5.6,6,.8,'#aece9a',.32,.55);
      box(x+20,y-17,-5.1,3.4,.9,.6,'#d4f3bf',.25,.85);
    }
    if(isExit(i)){
      const dx=rogue?x+w*.67:x+w-25,open=!rogue||district.lit===district.required,c=open?'#9affca':'#ffac66';
      const gateY=streetTop(dx,y),z=y>=streetRoute.roadY-50?-19:0;
      box(dx,gateY-15,z-5,24,31,4,rubber);box(dx,gateY-14,z-2.6,17,27,1.2,open?'#32645b':'#4e5960');
      for(const off of [-11,11]){box(dx+off,gateY-16,z,3,32,4,steel);box(dx+off,gateY-16,z+2.3,1.1,29,.5,c,.35,1.8)}
      box(dx,gateY-32,z,24,3,5,aluminum);sign(dx,gateY-38,z-4,14,6,c,15);
      if(!open)for(let j=-6;j<8;j+=4)box(dx+j,gateY-14,z-1,1,25,1,steel);
    }
  }
  function robotModel(e){
    const spec=chassis[e.kind],x=e.x,y=e.y;
    const jam=e.stun>0,warning=e.wind>0;
    const d=warning||e.lunge>0?e.aim:Math.sign(player.x-x)||1;
    const recoil=jam?(e.recoil||1)*Math.min(1,e.stun*6):0;
    const shell=e.frozen>0?'#add7eb':e.flash>.07?'#fff4d9':spec.color;
    const lamp=e.frozen>0?'#b3eeff':jam?'#f7fcff':warning?'#ff593e':'#9ef3dd';
    const slant=recoil*.29,ax=x+recoil*1.8,ay=y+(jam?1:0);
    if(e.kind==='rover'){
      part('pad',x,y+2,0,18,5,9,rubber);
      for(const off of [-6,0,6])ball(x+off,y+2,4.2,3.6,3.6,1.6,steel,.7);
      box(ax,ay-2,0,13,5,8,shell,.62,0,slant);
      for(const side of [-1,1])beam(ax+d*4,ay,side*3,ax+d*11,ay+1,side*3,1.1,steel);
    }else if(e.kind==='rotor'){
      ball(ax,ay,0,10,7,7,shell,.72);
      for(const off of [-9,9]){
        beam(ax,ay,0,ax+off,ay-3,0,.85,steel);
        part('tube',ax+off,ay-4,0,7,1.2,7,rubber);
        box(ax+off,ay-5,0,11,.6,1.7,aluminum,.6,0,slant,jam?.5:clock*29);
      }
      box(ax,ay+4,0,4,2.3,3.6,steel);
    }else if(e.kind==='saw'){
      const spin=jam?e.phase:elapsed*(e.lunge>0?19:7)+e.phase;
      part('tube',ax,ay,0,14,5,14,shell,.74,0,0,0,Math.PI/2);
      for(let j=0;j<7;j++){
        const a=spin+j*Math.PI*2/7;
        box(ax+7*Math.cos(a),ay+7*Math.sin(a),0,4.6,2.3,4.6,steel,.78,0,a+.56);
      }
      ball(ax,ay,3.1,7,7,2,rubber);
    }else if(e.kind==='turret'){
      box(x,y+4,0,17,5,11,rubber);part('tube',ax,ay,0,12,6,12,shell,.74,0,slant);
      for(const z of [-2.5,2.5]){
        beam(ax+d*2,ay-1,z,ax+d*12,ay-2+slant*6,z,1.3,steel);
        ball(ax+d*12,ay-2+slant*6,z,1.7,2,2,warning?'#ff7944':rubber,.45,warning?.9:0);
      }
    }else{
      for(const off of [-6,6]){
        box(x+off,y+7,0,5.5,6,8,rubber);
        const hand=ay+(warning?-9:2)+recoil*off*.4;
        beam(ax+off*.7,ay-3,0,ax+off*1.7,hand,0,1.4,steel);
        box(ax+off*1.7,hand,0,6.8,8,8,shell,.67,0,slant);
      }
      part('pad',ax,ay-2,0,15,11,10,shell,.72,0,slant);
    }
    box(ax,ay-1,5.1,6.4,2.1,.7,rubber);
    box(ax,ay-1,5.6,jam?1.4:4.8,1.2,.6,lamp,.22,1.5);
    if(warning){
      const ready=1-Math.max(0,e.wind)/spec.wind,red='#ff926d';
      if(e.kind==='press')arc(x,y+spec.h,2,12+20*ready,Math.PI,Math.PI*2,red,.45);
      else if(e.kind==='rotor')beam(x,y+4,2,x+d*(7+15*ready),y+9+10*ready,2,.45,red,.2,.9);
      else{
        const len=e.kind==='turret'?24:15,yy=y+(e.kind==='turret'?-2:3);
        for(let j=0;j<3;j++)box(x+d*(spec.w+3+j*len/3),yy,3,2+ready*2,.8,.6,red,.22,.9);
      }
    }
    if(weakPoint(e))ball(x+(e.kind==='rover'?-d*6:0),y-(e.kind==='rotor'?5:2),5.8,3.7,2.5,1,'#ffdb78',.24,1.2);
    const barY=y-spec.h-5;
    for(let j=0;j<e.rank;j++)box(x-4+j*3,barY-2.4,4,1.8,1.25,.7,gradeColors[e.rank-1],.2,.8);
    if(e.damageTime>0||warning){
      const w=16*e.hp/e.maxHp;
      box(x,barY,4,17,1.8,.7,rubber);
      box(x-8+w/2,barY,4.5,w,1.15,.5,e.hp/e.maxHp<.4?'#ff947d':gradeColors[e.rank-1],.18,.8);
    }
    if(jam){
      const f=Math.sin(clock*36);
      beam(ax-4,ay-5,5,ax+f*2,ay-8,5,.4,'#c7f9ff',.16,1.1);
      beam(ax+f*2,ay-8,5,ax+4,ay-5.5,5,.4,'#c7f9ff',.16,1.1);
    }
  }
  function liveObjects(t){
    marketProps();
    for(const [i,r] of platforms.entries()){
      if(r.x+r.w<cam-25||r.x>cam+W+25||r.y<camY-10||r.y>camY+H+70)continue;
      fixtures(r,i,t);
      if(r.type==='M'||r.type==='C'){
        if(r.crack===0)continue;
        street.tread(r);
      }
    }
    for(const f of items)if(!f.taken){
      const p=itemPos(f),y=p.y+Math.sin(clock*3+f.index)*1.7;
      ball(p.x,y,1,7.6,3.4,2.5,'#e8b672',.66,.45,0,Math.sin(clock*2)*.45);
      part('cone',p.x-4,y,1,4.5,4.5,2.2,'#c99350',.61,.42,-Math.PI/2);
    }
    {
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
      for(const e of enemies)if(e.hp>0&&e.x>=cam-32&&e.x<=cam+W+32&&e.y>=camY-40&&e.y<=camY+H+40){
        robotModel(e);
      }
      for(const s of shots)ball(s.x,s.y,4,s.enemy?5:8,s.enemy?5:2.8,3,s.enemy?'#ff6e54':'#9bffe9',.25,2);
      for(const f of effects){
        const c=f.color,r=f.r||6;
        if(f.kind==='pulse'){const radius=Math.max(1,r*(1-f.life/f.max));arc(f.x,f.y,3,radius,0,Math.PI*2,c,.45)}
        else if(f.kind==='wreck'){
          const age=1-f.life/f.max;
          if(age<.7)arc(f.x,f.y,5,3+age*16,0,Math.PI*2,'#ffc687',.65*(1-age));
          for(let j=0;j<6;j++){
            const a=j*2.399+.3,speed=10+j*1.6;
            const xx=f.x+Math.cos(a)*age*speed,yy=f.y+Math.sin(a)*age*speed-8*age+12*age*age;
            box(xx,yy,3+j%3,2.7*(1-age)+.4,1.7,1.6,j%2?steel:c,.68,0,a+age*6);
          }
        }else if(f.kind==='impact'){
          const t=1-f.life/f.max;
          if(f.style==='heavy'||f.style==='pulse')arc(f.x,f.y,5,2+9*t,0,Math.PI*2,c,.55);
          for(let j=-1;j<=1;j++)beam(f.x+f.dir*(3+t*7),f.y+j*(2+t*4),5,f.x+f.dir*(9+t*10),f.y+j*(5+t*7),5,.55,f.color,.2,1.2);
        }else ball(f.x,f.y,3,6,f.kind==='ember'?6:9,4,c,.2,.65);
      }
      if(swipe>0){
        const t=1-swipe/clawBeat().active,d=swingDir,reach=clawReach(),y=player.y-9;
        const color=player.counterSwing?'#9cfff1':player.dive>0?'#ffb07f':chain===3?'#ffcd85':'#d7ffea';
        for(let j=0;j<3;j++){
          const xx=player.x+d*(8+j*2),lift=chain===2?-1:1;
          let px=xx,py=y-lift*(6+j);
          for(let k=1;k<=6;k++){
            const u=k/6,x=xx+d*(reach-8-j*3)*Math.sin(u*1.64);
            const yy=y+lift*((18+4*t)*u*u-11*Math.sin(u*Math.PI)+j*2-5+t*5);
            beam(px,py,5,x,yy,5,(1-.45*u)*(.8-.4*t),color,.1,1.4);px=x;py=yy;
          }
        }
      }
    }
    const p=player;
    const floor=platforms.filter(r=>!r.recessed&&r.crack!==0&&p.x>=r.x&&p.x<=r.x+r.w&&r.y>=p.y-.2).reduce((a,r)=>Math.min(a,r.y),Infinity);
    if(!p.hiddenBox&&floor-p.y<50)ball(p.x,floor-.16,1,15/(1+(floor-p.y)*.025),.27,5.3,'#1e2729',.25);
    if(!player.hiddenBox&&(invul<=0||rolling>0||Math.floor(invul*12)%2===0))catModel();
    for(const m of motes)box(m.x,m.y,4,1.1,1.2,1,m.color,.18,.65);
  }
  function arc(x,y,z,r,a,b,c,width){
    for(let k=0;k<14;k++){const t=a+(b-a)*k/14,u=a+(b-a)*(k+1)/14;beam(x+r*Math.cos(t),y+r*Math.sin(t),z,x+r*Math.cos(u),y+r*Math.sin(u),z,width,c,.15,1.75)}
  }

  const geometry=buildScenery({box,ball,part,beam,sign}),names=['box','orb','tube','cone','pad','shade'];
  const sectorCache=new Map();
  let chunks=[],oldPlatforms=null,loftKey='',loftData,portraitBlend=0,cameraTime=0;
  function buildStatic(build){
    target=batch();build();for(const key of names)target[key]=new Float32Array(target[key]);
    return target;
  }
  function sceneFor(cw,ch){
    const indoors=state==='home',roomH=110,roomW=roomH*cw/ch;
    const t=indoors?['#edb282','#75ced6']:themes[level];
    const zoom=.79, vw=W*zoom,vh=H*zoom;
    const follow=(p,center,width)=>Math.max(p-width*.33,Math.min(p+width*.33,center));
    const dt=Math.min(.09,Math.max(0,clock-cameraTime));cameraTime=clock;
    const inspecting=indoors&&homeTab==='skin'?1:0;
    portraitBlend+=(inspecting-portraitBlend)*(1-Math.exp(-6*dt));
    const roomZoom=.82-.32*portraitBlend;
    const roomCenter=roomW*.558+(houseCat.x-roomW*.72)*.05;
    const portraitCenter=houseCat.x-roomW*roomZoom*.21;
    const camera=indoors?[roomCenter+(portraitCenter-roomCenter)*portraitBlend,
      roomH*.57+(houseCat.y-12-roomH*.57)*portraitBlend,roomW*roomZoom,roomH*roomZoom]:
      [follow(player.x,cam+W/2,vw),follow(player.y-12,camY+H/2,vh),vw,vh];
    if(!indoors&&oldPlatforms!==platforms){
      chunks=platforms.map((r,i)=>({r,data:buildStatic(()=>{routeBay(r)})}));
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
      const road=streetRoute.roadY;
      const firstLot=Math.floor((camera[0]-camera[2]*.65-142)/142),lastLot=Math.ceil((camera[0]+camera[2]*.65)/142);
      for(let i=firstLot;i<=lastLot;i++){
        const key=['backstreet',level,road,i].join('/');
        if(!sectorCache.has(key))sectorCache.set(key,buildStatic(()=>geometry.oppositeBlock(i,level,road)));
        visible.push({data:sectorCache.get(key)});
      }
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
      visible.push({data:loftData,near:true});
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
    function loadAtlas(source){
      const tex=texture();
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([151,139,119,255]));
      const img=new Image();
      img.onload=()=>{if(gl.isContextLost())return;gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR)};
      img.src=source;return tex;
    }
    const materials=loadAtlas(canvas3d.dataset.materials),alley=loadAtlas(canvas3d.dataset.alley),shops=loadAtlas(canvas3d.dataset.shops);
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
      texturedCat=drawCat.portraitReady();
      const {indoors,t,camera,visible,front,roomW,roomH}=sceneFor(cw,ch);
      for(const name of names){
        const m=meshes[name],count=visible.reduce((v,o)=>v+o.data[name].length,front[name].length);
        m.instances=count/20;if(!count)continue;if(m.pack.length<count)m.pack=new Float32Array(Math.ceil(count/2048)*2048);
        m.pack.set(front[name],0);let pos=front[name].length;
        for(const o of visible)if(o.r||o.near){m.pack.set(o.data[name],pos);pos+=o.data[name].length}
        m.shadowInstances=pos/20;
        for(const o of visible)if(!o.r&&!o.near){m.pack.set(o.data[name],pos);pos+=o.data[name].length}
        gl.bindVertexArray(m.vao);gl.bindBuffer(gl.ARRAY_BUFFER,m.inst);gl.bufferData(gl.ARRAY_BUFFER,m.pack.subarray(0,count),gl.DYNAMIC_DRAW);

      }
      const shadowView=[camera[0],camera[1],camera[2]*.65+28,camera[3]*.62+55];
      gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFb);gl.viewport(0,0,shadowSize,shadowSize);gl.enable(gl.DEPTH_TEST);gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(depthProgram.id);gl.uniform4fv(depthProgram.u.shadowView,shadowView);
      for(const m of Object.values(meshes))if(m.instances&&m.shadowInstances){gl.bindVertexArray(m.vao);gl.drawArraysInstanced(gl.TRIANGLES,0,m.count,m.shadowInstances)}
      if(felineVisible)drawCat(camera,indoors,shadowView,true);
      gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.viewport(0,0,w,h);gl.clear(gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);
      gl.useProgram(back.id);gl.bindVertexArray(null);gl.uniform1f(back.u.climate,indoors?0:level);gl.uniform3fv(back.u.accent,rgb(t[0]));gl.drawArrays(gl.TRIANGLES,0,3);
      gl.enable(gl.DEPTH_TEST);gl.useProgram(surface.id);gl.uniform4fv(surface.u.camera,camera);gl.uniform4fv(surface.u.shadowView,shadowView);bind(3,shadeDepth);gl.uniform1i(surface.u.shadeDepth,3);gl.uniform1f(surface.u.tick,clock);
      gl.uniform3fv(surface.u.accent,rgb(t[0]));gl.uniform3fv(surface.u.secondary,rgb(t[1]));bind(1,label);gl.uniform1i(surface.u.labels,1);bind(2,materials);gl.uniform1i(surface.u.materials,2);bind(4,alley);gl.uniform1i(surface.u.alleyMats,4);bind(5,shops);gl.uniform1i(surface.u.shops,5);
      const closest=visible.filter(o=>o.r&&o.r.w>70).sort((a,b)=>Math.hypot(a.r.x+a.r.w*.5-camera[0],a.r.y-camera[1])-Math.hypot(b.r.x+b.r.w*.5-camera[0],b.r.y-camera[1]));
      lamps.fill(0);
      closest.slice(0,5).forEach(({r},i)=>{
        const mint=level===1||level===6||r.frontage%3===2;
        lamps.set([r.x+r.w*(mint?.37:.59),r.y-(mint?29:33),-14,mint?(level===1?2.65:4.25):-4.05],i*4);
      });
      if(!indoors&&[1,6].includes(level)&&closest.length){
        const r=closest[0].r;lamps.set([r.x+r.w*.79,r.y-28,-90,-3.8],16);
      }
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
    software||=createSoftwareScene();texturedCat=software.hasPortrait();
    const cw=canvas.clientWidth,ch=canvas.clientHeight;if(!cw||!ch)return true;
    W=Math.max(172,Math.round(H*cw/ch));const scene=sceneFor(cw,ch);
    software(scene,felineVisible,cw,ch);return true;
  };
})();
