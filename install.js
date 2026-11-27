if(location.protocol==='https:'&&'serviceWorker' in navigator)navigator.serviceWorker.register('./worker.js').catch(()=>{});

const screenButton = document.getElementById('fullscreen');
const screenTip = document.getElementById('screenHelp');
const root = document.documentElement;
const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const activeScreen = () => document.fullscreenElement || document.webkitFullscreenElement;
let tipTimer;
function syncScreenButton() {
  const active = Boolean(activeScreen()) || standalone();
  screenButton.textContent = active ? (standalone() ? '已全屏' : '退出全屏') : '全屏';
  screenButton.setAttribute('aria-pressed', String(active));
}
function showScreenHelp(message) {
  screenTip.textContent = message;
  screenTip.hidden = false;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => {screenTip.hidden = true}, 8500);
}
screenButton.onclick = async () => {
  try {
    if (activeScreen()) {
      await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else if (standalone()) {
      showScreenHelp('你已从主屏幕打开游戏。');
    } else {
      const enter = root.requestFullscreen || root.webkitRequestFullscreen;
      if (!enter) throw new Error('unsupported');
      await enter.call(root);
    }
  } catch {
    if(/MicroMessenger/i.test(navigator.userAgent)){
      showScreenHelp('游戏已适配横屏，可直接用方向轴和右侧按键游玩。');return;
    }
    showScreenHelp('iPhone 请用 Safari 打开，点「分享」→「添加到主屏幕」，再从游戏图标启动。');
  }
  syncScreenButton();
};
document.addEventListener('fullscreenchange', syncScreenButton);
document.addEventListener('webkitfullscreenchange', syncScreenButton);
syncScreenButton();
