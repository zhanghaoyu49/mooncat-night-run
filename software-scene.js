// A painter's renderer for browsers without WebGL. Geometry, rig, camera and
// behaviour come from the same scene as the accelerated renderer.
function createSoftwareScene(){
  const cat=readCatSurface(true),unitMeshes={};
  const cube=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]];
  unitMeshes.box={points:cube,faces:[[4,5,6,7],[1,0,3,2],[0,4,7,3],[5,1,2,6],[0,1,5,4],[7,6,2,3]]};
  for(const name of ['orb','cone','tube']){
    const points=[],faces=[],n=8,rings=name==='orb'?4:1;
    for(let k=0;k<=rings;k++)for(let i=0;i<n;i++){
      const t=k/rings,a=i/n*Math.PI*2,b=(t-.5)*Math.PI;
      const r=name==='orb'?Math.cos(b):name==='cone'?Math.max(.001,t):1;
      points.push([Math.cos(a)*r*.5,(name==='orb'?Math.sin(b):2*t-1)*.5,Math.sin(a)*r*.5]);
      if(k){const j=k*n+i,next=k*n+(i+1)%n;faces.push([j-n,j,next,next-n])}
    }
    if(name!=='orb')faces.push(Array.from({length:n},(_,i)=>i),Array.from({length:n},(_,i)=>n+i));
    unitMeshes[name]={points,faces};
  }
  unitMeshes.pad=unitMeshes.box;unitMeshes.shade=unitMeshes.tube;
  const color=(c,l)=>'rgb('+c.map(x=>Math.round(Math.min(255,x*l*255))).join(',')+')';
  const tone=(c)=>[0,1,2].map(i=>parseInt(c.slice(1+i*2,3+i*2),16)/255);
  let surface,lastStatic='';
  return function(scene,showCat,cw,ch){
    const {camera,front,visible,indoors}=scene,scale=Math.min(1,680/cw,410/ch);
    const width=Math.round(cw*scale),height=Math.round(ch*scale);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
    const project=(x,y,z)=>[(.5+(x-camera[0]-.13*z)/(camera[2]*(1-z/610)))*width,(.5+(y-camera[1]+.23*z)/(camera[3]*(1-z/610)))*height,z];
    function paint(context,batches,withCat){
      const polys=[];
      function polygon(pts,c,l){
        const z=pts.reduce((v,p)=>v+p[2],0)/pts.length;
        if(pts.every(p=>p[0]<0)||pts.every(p=>p[0]>width)||pts.every(p=>p[1]<0)||pts.every(p=>p[1]>height))return;
        polys.push([z,pts,color(c,l)]);
      }
      for(const data of batches)for(const name of Object.keys(unitMeshes)){
        const rows=data[name],shape=unitMeshes[name];
        for(let k=0;k<rows.length;k+=20){
          const trans=(x,y,z)=>project(rows[k+3]+rows[k]*x+rows[k+4]*y+rows[k+8]*z,rows[k+7]+rows[k+1]*x+rows[k+5]*y+rows[k+9]*z,rows[k+11]+rows[k+2]*x+rows[k+6]*y+rows[k+10]*z);
          const pts=shape.points.map(p=>trans(...p)),c=[rows[k+12],rows[k+13],rows[k+14]];
          shape.faces.forEach((face,i)=>polygon(face.map(j=>pts[j]),c,.51+.08*(i%5)+Math.min(.8,rows[k+15])));
          if(rows[k+16]===6){
            for(let row=1;row<12;row++)for(let col=1;col<6;col++){
              if((row*7+col*3+k)%5>2)continue;
              const x=col/6-.53,y=row/12-.53;
              polygon([[x,y],[x+.043,y],[x+.043,y+.032],[x,y+.032]].map(([a,b])=>trans(a,b,.505)),row%2?[.6,.78,.76]:[.89,.70,.48],.93);
            }
          }
        }
      }
      if(withCat){
        const transformed=[],mat=FelineRig.mats,v=cat.vertices,palette=coat().map(tone);
        for(let i=0;i<v.length;i+=14){
          let x=0,y=0,z=0;
          for(let j=0;j<4;j++){const w=v[i+10+j];if(!w)continue;const k=v[i+6+j]*16;
            x+=w*(mat[k]*v[i]+mat[k+4]*v[i+1]+mat[k+8]*v[i+2]+mat[k+12]);
            y+=w*(mat[k+1]*v[i]+mat[k+5]*v[i+1]+mat[k+9]*v[i+2]+mat[k+13]);
            z+=w*(mat[k+2]*v[i]+mat[k+6]*v[i+1]+mat[k+10]*v[i+2]+mat[k+14]);
          }
          transformed.push(project(x,y,z));
        }
        for(let i=0;i<cat.indices.length;i+=3){
          const ids=cat.indices.subarray(i,i+3),k=ids[0]*14;
          const shade=v[k+1]>-2.4||v[k]>11?1:Math.sin(v[k]*2.4+v[k+1]*.8)>.6?2:0;
          polygon(Array.from(ids,j=>transformed[j]),palette[shade],.81-.18*v[k+4]+.08*v[k+5]);
        }
      }
      polys.sort((a,b)=>a[0]-b[0]);
      for(const [,points,fill] of polys){context.fillStyle=fill;context.beginPath();context.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)context.lineTo(points[i][0],points[i][1]);context.closePath();context.fill()}
    }
    const key=[width,height,indoors,level,...camera,platforms[0]?.x,rogue,run.seed].join('/');
    if(key!==lastStatic){
      surface||=document.createElement('canvas');surface.width=width;surface.height=height;
      const c=surface.getContext('2d'),sky=c.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#13212c');sky.addColorStop(1,'#526670');c.fillStyle=sky;c.fillRect(0,0,width,height);
      paint(c,visible.map(v=>v.data),false);lastStatic=key;
    }
    g.drawImage(surface,0,0);paint(g,[front],showCat);if(!indoors&&rogue)paintSurvey();
  };
}
