// Keep the wallet, equipment and expedition together so settlement is one write.
const slotPrefix='mooncat-night-home-slot-';
function readLocal(key,fallback){
  try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}
}
function newProfile(){
  return {fish:0,tokens:0,scrap:0,workshop:{},module:'',machineLog:{},owned:['ginger','mat','empty'],skin:'ginger',bed:'mat',display:'empty',
    training:{reach:0,roll:0,supply:0},trainingXP:0,trainingPoints:1,album:[],records:[],expedition:null,trips:0,receipt:null,version:0};
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
    if(old&&Number.isInteger(old.seed)&&Number.isInteger(old.stage)&&old.stage>=0&&old.stage<8&&old.hp>0&&old.perks)slot.expedition=old;
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
  {id:'ginger',type:'skin',name:'杏橘短毛',desc:'杏橘色细斑纹，浅奶油色下巴。',color:'#e6ae70'},
  {id:'ink',type:'skin',name:'夜墨',desc:'炭黑毛色，银灰色下颌。',fish:6,color:'#454657'},
  {id:'snow',type:'skin',name:'初雪',desc:'象牙白毛色，浅灰色耳尖。',fish:5,tokens:1,color:'#e6dfda'},
  {id:'courier',type:'skin',name:'末班信使',desc:'奶油毛色、朱红信差包，替失联街区送信。',scrap:6,color:'#d66a49'},
  {id:'welder',type:'skin',name:'黄铜焊工',desc:'烟灰虎斑，额头戴着一副黄铜护目镜。',scrap:10,color:'#cd9c55'},
  {id:'aurora',type:'skin',name:'极光巡夜',desc:'蓝灰短毛，青色信标沿背脊依次亮起。',scrap:15,color:'#7de5db'},
  {id:'orchid',type:'skin',name:'兰花电台',desc:'淡紫银斑，领间系着旧电台的紫罗兰领结。',scrap:12,color:'#bc91d4'},
  {id:'cratebed',type:'bed',name:'邮务周转箱',desc:'拆下箱盖，铺上厚厚的红格软垫。',scrap:5,color:'#c67463'},
  {id:'coilbed',type:'bed',name:'线圈暖窝',desc:'铜线圈围住墨绿色圆垫，边缘留出入口。',scrap:12,color:'#ae956a'},
  {id:'radio',type:'display',name:'短波收音机',desc:'黄铜旋钮和伸缩天线，接收远处的街区广播。',scrap:4,color:'#dcaa6b'},
  {id:'orrery',type:'display',name:'齿轮星仪',desc:'用废弃转子制作，两颗小行星绕灯芯公转。',scrap:9,color:'#8acbc8'},
  {id:'lens',type:'display',name:'退役光眼',desc:'从机壳拆下的红镜头，装在回收支架上。',scrap:6,color:'#e39583'},
  {id:'mat',type:'bed',name:'旧地垫',desc:'第一次回家时留下的软垫。',color:'#89664f'},
  {id:'velvet',type:'bed',name:'莓红绒窝',desc:'圆绒靠枕围着厚厚的床沿。',fish:4,color:'#ad566d'},
  {id:'capsule',type:'bed',name:'月港睡舱',desc:'带青色夜灯的金属猫床。',fish:8,tokens:1,color:'#78d9cf'},
  {id:'empty',type:'display',name:'留白',desc:'把窝边的位置空出来。'},
  {id:'fern',type:'display',name:'蕨类盆栽',desc:'一盆从废弃花房带回的绿意。',fish:3,color:'#80b389'},
  {id:'beacon',type:'display',name:'微型灯塔',desc:'在窗边亮起的一盏港口信标。',fish:3,tokens:1,color:'#ffba72'}
];
let previewGood=null;
function appearance(type){return previewGood?.type===type?previewGood.id:profile[type]}
function coat(){
  const colors={courier:['#e2c299','#fbdfae','#957052'],welder:['#716e6d','#cac1a9','#393d42'],
    aurora:['#607789','#afcbd3','#334455'],orchid:['#b29cb4','#e7d4da','#77637f']};
  return colors[appearance('skin')]||(appearance('skin')==='ink'?['#494956','#b5b7bb','#32313b']:appearance('skin')==='snow'?['#ece4d9','#fff3db','#a5a3a4']:['#e6ae70','#f1d4a6','#bb8857']);
}
