"""Exercise native WebP poses in an isolated Electron renderer, without file deletion."""
import json
import os
import subprocess
import tempfile
from pathlib import Path

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

ROOT = Path(__file__).resolve().parents[1]
MAIN = r'''
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const win = new BrowserWindow({width:1000,height:720,show:false,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),sandbox:false,backgroundThrottling:false,offscreen:true}});
  win.webContents.setFrameRate(30);
  const run = script => win.webContents.executeJavaScript(script);
  try {
    await win.loadFile(path.join(process.env.PET_ROOT,'dist-renderer/index.html'));
    await run(`window.assert = (ok, message) => { if (!ok) throw new Error(message); };
      window.wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      window.expectPose = async pose => {
        for (let index=0;index<150;index++) {
          const image=document.querySelector('.pet-character-image');
          if (image?.dataset.pose===pose && !image.src.includes('default-pet-preview') && image.complete && image.naturalWidth===640) return image;
          await wait(20);
        }
        throw new Error('Pose did not load: '+pose);
      }; undefined;`);
    const geometry = await run(`(async () => {
      const image=await expectPose('idle'); window.originalImage=image;
      const source=image.src;
      assert(!document.querySelector('.pet-character-sheet'), 'Legacy atlas is still mounted');
      const container=document.querySelector('.pet-view');
      for (const size of [50,73,125.5,200,317,400]) {
        container.style.setProperty('--pet-width', size+'px');
        container.style.setProperty('--pet-height', size+'px');
        await wait(20);
        const bounds=image.getBoundingClientRect();
        assert(Math.abs(bounds.width-size)<0.1 && Math.abs(bounds.height-size)<0.1, 'Incorrect image size');
        assert(image===originalImage && image.src===source && image.getAnimations().length===0, 'Resize restarted renderer');
      }
      document.querySelector('.pet-character').click();
      await expectPose('actions');
      const drag=document.querySelector('.pet-character-drag');
      assert(drag && getComputedStyle(drag).getPropertyValue('-webkit-app-region')==='drag', 'Native drag missing');
      return {resizeSizes:[50,73,125.5,200,317,400],nativeDrag:true};
    })()`);
    const bounds = await run(`(() => {const rect=originalImage.getBoundingClientRect();
      return {x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width),height:Math.round(rect.height)};})()`);
    await win.webContents.capturePage(bounds, {stayHidden:true,stayAwake:true});
    await wait(800);
    const capture = async name => {
      win.webContents.invalidate();
      await wait(250);
      const image=await win.webContents.capturePage(bounds, {stayHidden:true,stayAwake:true});
      if (name) fs.writeFileSync(path.join(process.env.PET_ROOT,'docs/pet-assets',name+'.png'),image.toPNG());
      return crypto.createHash('sha256').update(image.toBitmap()).digest('hex');
    };
    const actionsHash=await capture('webp-actions-400px');
    if (actionsHash!==await capture()) throw new Error('Actions pose is not static');
    await run(`(async () => {
      petTest.emit('PetMotion',{x:10,y:0}); await expectPose('right');
      const source=originalImage.src;
      for (let index=0;index<12;index++) {
        petTest.emit('PetMotion',index%3===0 ? null : {x:10,y:index%2 ? 5 : 0}); await wait(12);
        assert(originalImage.src===source,'Direction jitter changed pose');
      }
      petTest.emit('PetMotion',{x:-10,y:0}); await expectPose('left');
      petTest.emit('PetMotion',null); await wait(70);
      assert(originalImage.dataset.pose==='left','Release cleared direction too early');
      await expectPose('restLeft');
      await expectPose('actions');
      const directions=[['right',10,-100],['right',0,100],['left',-10,100],['left',0,-100]];
      for (const [pose,x,y] of directions) {
        petTest.emit('PetMotion',{x,y}); await wait(85); petTest.emit('PetMotion',{x,y});
        await expectPose(pose);
      }
      petTest.emit('PetMotion',null); await expectPose('actions');
      petTest.emit('PetConfirm',[{path:'D:/fixture.txt',targetType:'file',size:1024}],3);
      await expectPose('waiting');
    })()`);
    await run(`petTest.emit('PetMotion',{x:10,y:0});
      window.moveInterval=setInterval(()=>petTest.emit('PetMotion',{x:10,y:20}),100); undefined;`);
    await run(`(async()=>{await expectPose('right');})()`);
    const walkHashes=[];
    for (let index=0;index<4;index++) walkHashes.push(await capture());
    if (new Set(walkHashes).size<2) throw new Error('Right walking WebP did not animate');
    await run(`clearInterval(moveInterval); petTest.emit('PetMotion',null); undefined;`);
    await run(`(async()=>{await expectPose('waiting');})()`);
    const waitingHash=await capture('webp-waiting-400px');
    if (waitingHash!==await capture()) throw new Error('Confirmation pose is not static');
    await run(`(async () => {
      petTest.emit('PetState','working');
      petTest.emit('PetProgress',{path:'D:/fixture.txt',completed:25,total:100,fileIndex:1,fileCount:1,estimatedSeconds:5,stage:'overwriting'});
      await expectPose('working');
      window.loadingSource=originalImage.src;
      petTest.emit('PetProgress',{path:'D:/fixture.txt',completed:50,total:100,fileIndex:1,fileCount:1,estimatedSeconds:3,stage:'overwriting'});
      await wait(50);
      assert(originalImage.src===loadingSource,'Progress replaced the loading image');
    })()`);
    const workingHashes=[];
    for (let index=0;index<4;index++) workingHashes.push(await capture(index===2 ? 'webp-working-400px' : undefined));
    if (new Set(workingHashes).size<3) throw new Error('Native WebP did not animate');
    await run(`(async () => {
      petTest.emit('PetComplete',{succeeded:1,failed:0,durationMs:1000,cancelled:false});
      await expectPose('success');
      assert(originalImage===document.querySelector('.pet-character-image'),'State recreated image node');
      assert(getComputedStyle(document.querySelector('.pet-character'),'::before').content==='none','Result ring still rendered');
    })()`);
    const successHashes=[];
    for (let index=0;index<6;index++) {
      successHashes.push(await capture(index===2 ? 'webp-success-400px' : undefined));
      await wait(450);
    }
    if (new Set(successHashes).size<2) throw new Error('Success expression did not animate');
    await run(`(async () => {
      petTest.emit('PetComplete',{succeeded:0,failed:1,durationMs:1000,cancelled:false}); await expectPose('failure');
    })()`);
    const failureHashes=[];
    for (let index=0;index<6;index++) {
      failureHashes.push(await capture(index===3 ? 'webp-failure-400px' : undefined));
      await wait(450);
    }
    if (new Set(failureHashes).size<2) throw new Error('Failure sigh did not animate');
    await run(`(async () => {
      petTest.emit('PetComplete',{succeeded:0,failed:0,durationMs:1000,cancelled:true}); await expectPose('review');
      petTest.emit('PetState','idle');
      document.querySelector('.pet-character').click(); await expectPose('idle');
      await petTest.custom(); await wait(100);
      const image=document.querySelector('.pet-character-image');
      assert(!image.dataset.pose && image.src.startsWith('data:image/png') && image.getAnimations().length===0,'Custom image overridden');
      petTest.emit('PetMotion',{x:10,y:0}); petTest.emit('PetState','working'); await wait(100);
      assert(!image.dataset.pose && getComputedStyle(image).transform==='none','Custom image animated');
    })()`);
    console.log(JSON.stringify({success:true,...geometry,staticPanels:true,animatedResults:true,nativeWebpAnimated:true,
      stableNode:true,directionJitterFiltered:true,restoredBusinessPose:true,customUnchanged:true}));
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
'''


def main() -> None:
    """Run a hidden Electron fixture with bounded execution and structured results."""
    try:
        with tempfile.TemporaryDirectory(prefix='pet-webp-smoke-') as directory:
            fixture = Path(directory)
            (fixture / 'preload.cjs').write_text(PRELOAD, encoding='utf-8')
            (fixture / 'main.cjs').write_text(MAIN, encoding='utf-8')
            environment = dict(os.environ)
            environment.pop('ELECTRON_RUN_AS_NODE', None)
            environment.update(PET_ROOT=str(ROOT), PET_PREVIEW=str(ROOT / 'src/assets/pet-templates/default-pet-preview.png'))
            executable = ROOT / 'node_modules/electron/dist/electron.exe'
            if os.name != 'nt':
                executable = ROOT / 'node_modules/electron/dist/electron'
            result = subprocess.run([str(executable), str(fixture / 'main.cjs')], cwd=ROOT,
                                    env=environment, capture_output=True, text=True,
                                    encoding='utf-8', errors='replace', timeout=60)
            print(json.dumps({'success': result.returncode == 0, 'return_code': result.returncode,
                              'output': result.stdout, 'errors': result.stderr}))
            raise SystemExit(result.returncode)
    except (OSError, subprocess.TimeoutExpired) as error:
        print(json.dumps({'success': False, 'errors': str(error)}))
        raise SystemExit(1) from error


if __name__ == '__main__':
    main()
