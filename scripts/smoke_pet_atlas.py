"""Check the production renderer in Electron without real file operations."""
import json
import os
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PRELOAD = r'''
const {contextBridge} = require('electron');
const fs = require('fs');
const handlers = {};
let custom = false;
const image = 'data:image/png;base64,' + fs.readFileSync(process.env.PET_PREVIEW).toString('base64');
const api = {
  getSettings: async () => ({petSize:400, passes:3}),
  getPetImage: async () => ({image, isDefault:!custom}),
  setPetExpanded() {}, setPetBubbleBounds() {}, setPetImageSize() {},
  getHistory: async () => [], getPetTemplates: async () => [], getBubbleAppIcon: async () => '',
};
for (const event of ['PetMotion','SettingsChanged','OpenSettings','PetState','PetConfirm','PetProgress','PetComplete']) {
  api['on'+event] = callback => { (handlers[event] ??= new Set()).add(callback); return () => handlers[event].delete(callback); };
}
contextBridge.exposeInMainWorld('shredderApi',api);
contextBridge.exposeInMainWorld('petTest', {
  emit: (event, ...args) => {for (const callback of handlers[event] ?? []) callback(...args);},
  custom: async () => {custom=true; for (const callback of handlers.SettingsChanged ?? []) await callback();},
});
'''

MAIN = r'''
const {app,BrowserWindow} = require('electron');
const path = require('path');
const fs = require('fs');
app.whenReady().then(async () => {
  const win = new BrowserWindow({width:1000,height:700,show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),sandbox:false,backgroundThrottling:false}});
  win.webContents.on('console-message', event => {if(event.level==='error') console.error(event.message);});
  try {
    await win.loadFile(path.join(process.env.PET_ROOT,'dist-renderer/index.html'));
    const result = await win.webContents.executeJavaScript(`(async () => {
      const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
      const assert = (value,message) => {if(!value) throw new Error(message);};
      for(let i=0;i<100 && !document.querySelector('.pet-character-sheet')?.complete;i++) await wait(50);
      const sheet = document.querySelector('.pet-character-sheet');
      assert(sheet && sheet.naturalWidth === 7680 && sheet.naturalHeight===7680,'Atlas decode failed');
      const src = sheet.src;
      const viewport = sheet.parentElement.getBoundingClientRect();
      assert(viewport.width===400 && viewport.height===400,'Maximum size incorrect');
      // 非整百尺寸和小数尺寸缩放不得改变帧号或重启动画。
      const resizingAnimation=sheet.getAnimations()[0];
      resizingAnimation.pause();
      const container=document.querySelector('.pet-view');
      for(const size of [50,73,125.5,200,317,400]) {
        container.style.setProperty('--pet-width',size+'px');
        container.style.setProperty('--pet-height',size+'px');
        await wait(20);
        assert(sheet.getAnimations()[0]===resizingAnimation,'Resizing restarted animation');
        for(const [time,frame] of [[0,0],[43,1],[625,15],[1250,30],[1960,47]]) {
          resizingAnimation.currentTime=time;
          const matrix=new DOMMatrixReadOnly(getComputedStyle(sheet).transform);
          assert(Math.abs(matrix.m41+(frame%15)*size)<0.1 && Math.abs(matrix.m42+Math.floor(frame/15)*size)<0.1,'Frame offset incorrect at size '+size+', frame '+frame);
          const bounds=sheet.getBoundingClientRect();
          assert(Math.abs(bounds.width-size*15)<0.1 && Math.abs(bounds.height-size*15)<0.1,'Atlas scaling incorrect');
        }
      }
      resizingAnimation.currentTime=0; resizingAnimation.play();
      const transforms = [];
      // 相邻方向噪声、短暂空事件和同向更新不得重建跑步动画。
      window.petTest.emit('PetMotion',{x:10,y:0}); await wait(30);
      const running = sheet.getAnimations()[0];
      running.pause(); running.currentTime=230;
      for(let i=0;i<18;i++) {
        window.petTest.emit('PetMotion',i%3===0 ? null : {x:10,y:i%2===0 ? 5 : 0}); await wait(12);
        assert(sheet.getAnimations()[0]===running,'Jitter restarted running animation');
      }
      window.petTest.emit('PetMotion',{x:-10,y:0}); await wait(20);
      const reversed=sheet.getAnimations()[0];
      assert(reversed!==running && Number(reversed.currentTime)>=230 && Number(reversed.currentTime)<310,'Reversal lost foot phase');
      window.petTest.emit('PetMotion',null); await wait(60);
      assert(sheet.getAnimations()[0]===reversed,'Release immediately restored idle');
      await wait(150);
      const resting=sheet.getAnimations()[0];
      assert(resting!==reversed && resting.effect.getTiming().duration===650,'Missing settle stage');
      await wait(300);
      assert(sheet.getAnimations()[0]===resting,'Rest ended too early');
      window.petTest.emit('PetMotion',{x:-10,y:0}); await wait(30);
      assert(sheet.getAnimations()[0].effect.getTiming().iterations===Infinity,'New drag did not interrupt rest');
      window.petTest.emit('PetMotion',null); await wait(900);
      const idle=sheet.getAnimations()[0];
      assert(idle.effect.getKeyframes().length>12,'Idle 48-frame sequence missing');
      assert(Math.abs(idle.effect.getTiming().duration-2000)<0.01,'Idle 24fps duration incorrect');
      for(const motion of [{x:5,y:0},{x:-5,y:0},{x:0,y:-5},{x:0,y:5},{x:5,y:-5},{x:-5,y:5},null]) {
        window.petTest.emit('PetMotion',motion); await wait(85);
        window.petTest.emit('PetMotion',motion); await wait(20);
        assert(document.querySelector('.pet-character-sheet')===sheet && sheet.src===src,'State recreated image');
        const animation = sheet.getAnimations()[0];
        if(motion?.y===0) {
          assert(animation,'Missing walking cycle');
          animation.pause(); animation.currentTime=0;
          const before=getComputedStyle(sheet).transform;
          animation.currentTime=180;
          assert(getComputedStyle(sheet).transform!==before,'Feet do not animate');
        }
        transforms.push(getComputedStyle(sheet).transform);
      }
      await wait(850);
      for(const state of ['working','idle','working','idle']) {
        window.petTest.emit('PetState',state); await wait(20);
        assert(document.querySelector('.pet-character-sheet')===sheet && sheet.complete,'State switch blank');
      }
      document.querySelector('.pet-character').click(); await wait(50);
      assert(sheet.getAnimations()[0]===idle || sheet.getAnimations()[0].effect.getKeyframes().length===49,'Action menu suppressed idle hands');
      const drag=document.querySelector('.pet-character-drag');
      assert(drag && getComputedStyle(drag).getPropertyValue('-webkit-app-region')==='drag','Native drag missing');
      document.querySelector('.pet-character').click(); await wait(50);
      return {success:true,dimensions:[sheet.naturalWidth,sheet.naturalHeight],transforms,resizeSizes:[50,73,125.5,200,317,400],stableRunning:true,phasePreserved:true,delayedRestore:true,interruptibleRest:true,idleHands:true};
    })()`);
    const bounds = await win.webContents.executeJavaScript(`(async()=>{window.petTest.emit('PetMotion',null); await new Promise(r=>setTimeout(r,30)); const rect=document.querySelector('.pet-character-sprite').getBoundingClientRect(); return {x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width),height:Math.round(rect.height)};})()`);
    const capture = await win.webContents.capturePage(bounds);
    fs.writeFileSync(path.join(process.env.PET_ROOT,'docs/pet-assets/atlas-v2-400px.png'),capture.toPNG());
    await win.webContents.executeJavaScript(`{const animation=document.querySelector('.pet-character-sheet').getAnimations()[0]; animation.pause(); animation.currentTime=1450;}`);
    fs.writeFileSync(path.join(process.env.PET_ROOT,'docs/pet-assets/atlas-v2-hands-400px.png'),(await win.webContents.capturePage(bounds)).toPNG());
    await win.webContents.executeJavaScript(`(async()=>{await window.petTest.custom(); await new Promise(r=>setTimeout(r,60)); const image=document.querySelector('.pet-character-image'); if(document.querySelector('.pet-character-sheet') || !image || image.getAnimations().length || getComputedStyle(image).transform!=='none') throw new Error('Custom picture animated');})()`);
    console.log(JSON.stringify({...result,customUnchanged:true,nativeDrag:true}));
    app.exit(0);
  } catch(error) {console.error(error); app.exit(1);}
});
'''


def main() -> None:
    """Use an isolated temporary Electron harness and capture structured output."""
    try:
        with tempfile.TemporaryDirectory(prefix='pet-atlas-smoke-') as directory:
            fixture = Path(directory)
            (fixture / 'preload.cjs').write_text(PRELOAD, encoding='utf-8')
            (fixture / 'main.cjs').write_text(MAIN, encoding='utf-8')
            environment = dict(os.environ)
            environment.pop('ELECTRON_RUN_AS_NODE', None)
            environment.update(PET_ROOT=str(ROOT), PET_PREVIEW=str(ROOT / 'src/assets/pet-templates/default-pet-preview.png'))
            result = subprocess.run([str(ROOT / 'node_modules/electron/dist/electron.exe'), str(fixture / 'main.cjs')], cwd=ROOT, env=environment, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=45)
            print(json.dumps({'success': result.returncode == 0, 'return_code': result.returncode, 'output': result.stdout, 'errors': result.stderr}))
            raise SystemExit(result.returncode)
    except (OSError, subprocess.TimeoutExpired) as error:
        print(json.dumps({'success': False, 'errors': str(error)}))
        raise SystemExit(1) from error


if __name__ == '__main__':
    main()
