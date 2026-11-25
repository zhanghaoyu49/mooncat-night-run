// Each route describes its rises, rests and encounters in travel order.
// S = spring, M = ferry, C = cracked platform, H = rooftop thorns, F = checkpoint.
const stages = [
  {name:'霓虹街区', en:'NEON QUARTER', landmark:'city', sky:['#171a3b','#765781','#f3ad93'], far:'#625678', mid:'#3f395b', wall:'#2c283f', trim:'#f49ba5', moon:'#ffe5b9', tip:'按住方向键奔跑，轻点跳跃跨过屋顶。', route:'...F...', heights:[161,161,157,157,161,153,158], gaps:[24,30,33,27,38,35]},
  {name:'灯笼长街', en:'LANTERN LANE', landmark:'lantern', sky:['#34213e','#a04e60','#ffa976'], far:'#895363',mid:'#713b4d',wall:'#472d40',trim:'#ffb270',moon:'#ffcf93',tip:'跳起后再点一次跳跃，可以越过更宽的巷口。',route:'....F...',heights:[161,157,155,145,157,147,153,155],gaps:[31,42,56,39,48,90,47]},
  {name:'云上温室', en:'GLASS GARDENS', landmark:'garden', sky:['#123341','#488e87','#c6d7a5'],far:'#58928c',mid:'#2d696c',wall:'#284c51',trim:'#a8dfb4',moon:'#e5efbb',tip:'踩过青绿色弹簧垫会自动弹起，空中还能补跳。',route:'.S..F.S..',heights:[160,161,139,146,155,159,159,134,148],gaps:[36,75,41,41,44,54,79,48]},
  {name:'潮汐码头', en:'TIDAL DOCKS', landmark:'harbor',sky:['#163349','#437894','#eab69e'],far:'#658899',mid:'#3a6174',wall:'#293f52',trim:'#94d2d6',moon:'#ffdda6',tip:'蓝色货台会往返移动。等它靠近，再起跳。',route:'..M..F.M..',heights:[159,155,149,151,154,157,155,145,150,151],gaps:[39,40,44,46,42,53,40,47,53]},
  {name:'紫雾天台', en:'VIOLET SPIRES', landmark:'spires',sky:['#292046','#745a9f','#d4aac6'],far:'#756398',mid:'#51446e',wall:'#372c4d',trim:'#d9afea',moon:'#f4d9f5',tip:'带裂纹的屋顶踩上后会坍塌。保持移动即可通过。',route:'..C.S.F.C..',heights:[162,154,150,151,159,136,150,154,148,144,148],gaps:[42,46,45,47,82,49,43,44,53,55]},
  {name:'晚风纸坊', en:'PAPER MILLS', landmark:'mills',sky:['#41354c','#b47877','#ffcf91'],far:'#ae817f',mid:'#85636a',wall:'#51414e',trim:'#edc896',moon:'#ffe3a3',tip:'红色刺丛会送你回到检查点。靠近时起跳，越过再落地。',route:'..H.M.F.H..',heights:[164,155,157,151,145,151,157,150,152,145,150],gaps:[43,49,42,47,43,52,52,44,48,59]},
  {name:'极光雪岭', en:'AURORA RIDGE', landmark:'snow',sky:['#122e51','#466780','#a6c6bf'],far:'#708caa',mid:'#4a6d87',wall:'#344858',trim:'#e1f0e9',moon:'#e1fff2',tip:'先看好货台的位置。连续踏过薄冰时，留一次空中跳跃。',route:'.S.M.C.F.CM..',heights:[165,159,138,145,147,147,149,156,149,146,142,148,154],gaps:[45,85,40,45,53,48,46,55,50,41,44,58]},
  {name:'黎明电台', en:'DAWN STATION', landmark:'radio',sky:['#384564','#c28b92','#ffdb9d'],far:'#b78d93',mid:'#826f80',wall:'#494052',trim:'#ffce96',moon:'#ffe5a5',tip:'串起弹簧、货台和裂纹踏板，登上最后的广播塔。',route:'..H.S.M.F.CH.S..',heights:[160,153,155,153,159,138,146,149,156,153,147,147,155,159,135,142],gaps:[47,48,50,49,87,43,46,52,53,52,49,49,52,88,54]}
];
function buildStage(index){
  const s=stages[index], platforms=[],items=[];
  let x=0;
  Array.from(s.route).forEach((type,i)=>{
    const last=i===s.route.length-1;
    const w=i===0?150:last?136:type==='H'?174:type==='M'?65:type==='C'?66:104+(i*17%30);
    platforms.push({type,base:x,x,y:s.heights[i],w,crack:-1});
    if(i>0&&!last)items.push({index:i,high:i%4===2, taken:false});
    x+=w+(s.gaps[i]||0);
  });
  return {platforms,items};
}
