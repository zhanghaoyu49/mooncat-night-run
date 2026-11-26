const shadowProjection=`
  uniform vec4 shadowView;
  vec3 fromLight(vec3 p){
    vec3 d=p-vec3(shadowView.xy,-18.);
    return vec3(dot(d,vec3(.843,0.,.538))/shadowView.z,
      dot(d,vec3(.422,.620,-.661))/shadowView.w,dot(d,vec3(.334,-.785,-.522))/-240.);
  }`;
function readCatSurface(low=false){
  const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  const data=decode(low?tabbyAsset.lowVertices:tabbyAsset.vertices),view=new DataView(data.buffer);
  const vertices=new Float32Array(data.length/17*14);
  for(let a=0,i=0;a<data.length;a+=17,i+=14){
    for(let n=0;n<3;n++){vertices[i+n]=view.getInt16(a+n*2,true)/256;vertices[i+3+n]=view.getInt8(a+6+n)/127}
    for(let n=0;n<4;n++){vertices[i+6+n]=data[a+9+n];vertices[i+10+n]=data[a+13+n]/255}
  }
  return {vertices,indices:new Uint16Array(decode(low?tabbyAsset.lowIndices:tabbyAsset.indices).buffer)};
}
function makeCatSurface(gl,program,rgb){
  const vert=`#version 300 es
  layout(location=0) in vec3 pos;layout(location=1) in vec3 normal;
  layout(location=2) in vec4 joints;layout(location=3) in vec4 weights;
  uniform float earTime;uniform mat4 bones[28];uniform vec4 camera;uniform bool shadowPass;
  ${shadowProjection}
  out vec3 N;out vec3 rest;out vec3 P;out vec3 restN;
  void main(){
    mat4 skin=bones[int(joints.x)]*weights.x+bones[int(joints.y)]*weights.y+bones[int(joints.z)]*weights.z+bones[int(joints.w)]*weights.w;
    vec3 local=pos;float earTip=smoothstep(16.8,19.9,-pos.y);
    float flick=pow(max(0.,sin(earTime*2.2+sign(pos.z)*1.94)),26.);
    local.x-=earTip*flick*.57;local.z+=sign(pos.z)*earTip*flick*.46;
    P=(skin*vec4(local,1.)).xyz;N=normalize(mat3(skin)*normal);rest=pos;restN=normal;
    if(shadowPass){gl_Position=vec4(fromLight(P),1.);return;}
    float w=1.-P.z/610.;gl_Position=vec4((P.xy-camera.xy+P.z*vec2(-.13,.23))*vec2(2./camera.z,-2./camera.w),(-P.z/500.-.1)*w,w);
  }`;
  const frag=`#version 300 es
  precision highp float;in vec3 N;in vec3 rest;in vec3 P;in vec3 restN;
  uniform vec3 fur;uniform vec3 bib;uniform vec3 stripes;uniform vec3 keyColor;out vec4 col;
  float hash(vec2 a){return fract(sin(dot(a,vec2(127.1,311.7)))*43758.5453);}
  void main(){
    vec3 p=rest;float cheek=smoothstep(6.8,9.,p.x);
    float spine=1.-smoothstep(-10.8,-6.7,p.y);
    float phase=p.x*2.5+sin(abs(p.z)*1.25+p.x*.63)*1.0+sin(p.y*1.35+p.x*.44)*.92;
    float brow=p.y*4.3+abs(p.z)*2.8+sin(p.x*2.3)*.68;
    float stripe=smoothstep(.25,.89,cos(mix(phase,brow,cheek)));
    float cap=1.-smoothstep(-14.4,-12.7,p.y);
    float mask=mix(.72*spine+.18,cap,cheek);
    if(p.x< -10.2){stripe=smoothstep(.15,.65,cos(p.x*2.6));mask=.92;}
    float white=max(smoothstep(-7.7,-5.5,p.y)*(1.-smoothstep(2.1,3.5,abs(p.z)))*.6,
      smoothstep(9.5,11.3,p.x)*smoothstep(-15.25,-13.5,p.y)*(1.-smoothstep(1.1,2.4,abs(p.z))));
    white=max(white,smoothstep(-2.2,-1.,p.y)*.85);
    vec3 base=mix(mix(fur,stripes,stripe*mask*.94),bib,white);
    if(p.y< -16.45 && p.x>6.8 && restN.x>.28){float inner=(1.-smoothstep(-17.1,-16.5,p.y));base=mix(base,vec3(.65,.40,.36),inner*.86);}
    float fiber=hash(floor(vec2(p.x*22.+p.y*5.,p.y*63.+abs(p.z)*24.)));
    float guard=sin(p.x*46.+sin(p.y*3.+p.z*2.5)*9.+p.y*15.);
    float hair=(1.-smoothstep(.1,1.6,fwidth(guard)))*guard;
    base*=.935+.09*fiber+.032*hair;
    vec3 n=normalize(N);float key=max(0.,dot(n,normalize(vec3(.38,-.69,.61))));
    float fill=max(0.,dot(n,normalize(vec3(-.68,-.38,-.5))));
    float rim=pow(1.-abs(n.z),3.);
    col=vec4(base*(vec3(.48,.48,.51)+key*keyColor*.65+fill*vec3(.12,.20,.26))+.075*rim*vec3(.82,.85,.79),1.);
  }`;
  const model=program(gl,vert,frag),mesh=readCatSurface(),vao=gl.createVertexArray();
  gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);
  for(const [i,size,off] of [[0,3,0],[1,3,3],[2,4,6],[3,4,10]]){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,size,gl.FLOAT,false,56,off*4)}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return (camera,indoors,shadowView,shadowPass=false)=>{
    gl.useProgram(model.id);gl.bindVertexArray(vao);
    const [fur,bib,stripes]=coat();
    gl.uniform1f(model.u.earTime,clock);gl.uniform1i(model.u.shadowPass,shadowPass?1:0);gl.uniform4fv(model.u.shadowView,shadowView);
    gl.uniformMatrix4fv(model.u.bones,false,FelineRig.mats);gl.uniform4fv(model.u.camera,camera);
    gl.uniform3fv(model.u.fur,rgb(fur));gl.uniform3fv(model.u.bib,rgb(bib));gl.uniform3fv(model.u.stripes,rgb(stripes));
    gl.uniform3fv(model.u.keyColor,indoors?[1.08,.91,.78]:[.93,.99,1.04]);
    gl.drawElements(gl.TRIANGLES,mesh.indices.length,gl.UNSIGNED_SHORT,0);
  };
}
