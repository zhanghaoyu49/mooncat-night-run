// Keep the wallet, equipment and expedition together so settlement is one write.
const slotPrefix='mooncat-night-home-slot-';
function readLocal(key,fallback){
  try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}
}
function newProfile(){
  return {fish:0,tokens:0,owned:['ginger','mat','empty'],skin:'ginger',bed:'mat',display:'empty',
    album:[],records:[],expedition:null,trips:0,receipt:null,version:0};
}
const volatileSlots=new Map();
function loadSlot(number){
  if(volatileSlots.has(number))return volatileSlots.get(number);
  const stored=readLocal(slotPrefix+number,null);
  if(stored)return Object.assign(newProfile(),stored);
  const slot=newProfile();
  if(number===1){
    slot.album=readLocal('mooncat-album',[]);
    slot.records=readLocal('mooncat-routes-v2',[]);
    const old=readLocal('mooncat-expedition',null);
    if(old&&Number.isInteger(old.seed)&&old.stage>=0&&old.stage<8&&old.hp>0&&old.perks)slot.expedition=old;
  }
  return slot;
}
let slotNumber=Number(readLocal('mooncat-active-home',1));
if(![1,2,3].includes(slotNumber))slotNumber=1;
let profile=loadSlot(slotNumber), storageWarning='';
function writeSlot(){
  try{
    const latest=readLocal(slotPrefix+slotNumber,null);
    if(latest&&latest.version!==profile.version){
      profile=loadSlot(slotNumber);
      enterHome(false);
      homeMessage('另一个标签页已更新这个存档，已载入最新进度。');
      return false;
    }
    profile.version++;
    localStorage.setItem(slotPrefix+slotNumber,JSON.stringify(profile));volatileSlots.delete(slotNumber);storageWarning='';
  }catch{
    profile.version--;volatileSlots.set(slotNumber,profile);
    storageWarning='浏览器未允许保存，当前进度仅在本页有效。';
  }
  return true;
}
const goods=[
  {id:'heart',type:'buff',name:'护心项圈',desc:'每次出发多一颗生命。',fish:8},
  {id:'magnet',type:'buff',name:'寻物铃',desc:'扩大鱼干与街区藏品的拾取范围。',fish:5,tokens:1},
  {id:'claw',type:'buff',name:'磨爪石',desc:'每次出发，爪击伤害加一。',fish:12,tokens:1},
  {id:'ginger',type:'skin',name:'橘色虎斑',desc:'暖橘毛色，奶油色脚掌。',color:'#da8246'},
  {id:'ink',type:'skin',name:'夜墨',desc:'炭黑毛色，银灰色下颌。',fish:6,color:'#454657'},
  {id:'snow',type:'skin',name:'初雪',desc:'象牙白毛色，浅灰色耳尖。',fish:5,tokens:1,color:'#e6dfda'},
  {id:'mat',type:'bed',name:'旧地垫',desc:'第一次回家时留下的软垫。',color:'#89664f'},
  {id:'velvet',type:'bed',name:'莓红绒窝',desc:'圆绒靠枕围着厚厚的床沿。',fish:4,color:'#ad566d'},
  {id:'capsule',type:'bed',name:'月港睡舱',desc:'带青色夜灯的金属猫床。',fish:8,tokens:1,color:'#78d9cf'},
  {id:'empty',type:'display',name:'留白',desc:'把窝边的位置空出来。'},
  {id:'fern',type:'display',name:'蕨类盆栽',desc:'一盆从废弃花房带回的绿意。',fish:3,color:'#80b389'},
  {id:'beacon',type:'display',name:'微型灯塔',desc:'在窗边亮起的一盏港口信标。',fish:3,tokens:1,color:'#ffba72'}
];
function coat(){
  return profile.skin==='ink'?['#494956','#b5b7bb','#32313b']:profile.skin==='snow'?['#ece4d9','#fff3db','#a5a3a4']:['#da8246','#f0cba3','#956143'];
}
