let stickX=0,stickY=0,stickFinger=null;
const stick=document.getElementById('stick');
function centerStick(){
  stickFinger=null;stickX=stickY=0;
  stick.style.setProperty('--dx','0px');stick.style.setProperty('--dy','0px');
}
function steer(x,y){
  const rect=stick.getBoundingClientRect();
  const dx=x-rect.left-rect.width/2,dy=y-rect.top-rect.height/2;
  const rotated=matchMedia('(orientation: portrait)').matches;
  const ax=rotated?dy:dx,ay=rotated?-dx:dy;
  const reach=stick.clientWidth*.36,scale=Math.max(reach,Math.hypot(ax,ay));
  const nx=ax/scale,ny=ay/scale;
  stickX=Math.sign(nx)*Math.max(0,(Math.abs(nx)-.10)/.90);
  const lastY=stickY;stickY=ny;
  stick.style.setProperty('--dx',(nx*reach)+'px');stick.style.setProperty('--dy',(ny*reach)+'px');
  if(lastY<.72&&ny>=.72&&Math.abs(nx)<.6)dropFloor();
}
function grab(id,x,y){
  if(state!=='play'||stickFinger!==null||$('map').open)return false;
  stickFinger=id;steer(x,y);return true;
}
stick.onpointerdown=e=>{
  if(e.button!==0||!grab(e.pointerId,e.clientX,e.clientY))return;
  e.preventDefault();stick.setPointerCapture(e.pointerId);
};
stick.onpointermove=e=>{if(e.pointerId===stickFinger)steer(e.clientX,e.clientY)};
stick.onpointerup=stick.onpointercancel=stick.onlostpointercapture=e=>{if(e.pointerId===stickFinger)centerStick()};
for(const type of ['touchstart','touchmove','touchend','touchcancel']){
  stick.addEventListener(type,e=>{
    if(e.cancelable)e.preventDefault();
    if('PointerEvent' in window)return;
    for(const t of e.changedTouches){
      if(type==='touchstart')grab(t.identifier,t.clientX,t.clientY);
      else if(t.identifier===stickFinger){if(type==='touchmove')steer(t.clientX,t.clientY);else centerStick()}
    }
  },{passive:false});
}
stick.oncontextmenu=stick.ondblclick=e=>e.preventDefault();
