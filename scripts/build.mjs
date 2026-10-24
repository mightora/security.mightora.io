import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
const root = new URL('../', import.meta.url);
const file = async name => readFile(new URL(name, root),'utf8');
const dist = new URL('../dist/',import.meta.url);
await mkdir(dist,{recursive:true});
await mkdir(new URL('src/',dist),{recursive:true});
const html = await file('index.html');
const css = await file('src/styles.css');
const app = await file('src/app.js');
const model = await file('src/model.js');
const visuals = await file('src/visuals.js');
await writeFile(new URL('index.html',dist),html);
await writeFile(new URL('src/styles.css',dist),css);
await writeFile(new URL('src/app.js',dist),app);
await writeFile(new URL('src/model.js',dist),model);
await writeFile(new URL('src/visuals.js',dist),visuals);
await writeFile(new URL('.nojekyll',dist),'');
await copyFile(new URL('../LICENSE',import.meta.url),new URL('LICENSE',dist));
await copyFile(new URL('../CNAME',import.meta.url),new URL('CNAME',dist));
await copyFile(new URL('../footer.yaml',import.meta.url),new URL('footer.yaml',dist));
const offline = html
  .replace('<meta name="theme-color"', '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; connect-src \'none\'; form-action \'none\'; base-uri \'none\'">\n  <meta name="theme-color"')
  .replace(/\s*<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr[^>]+>/g,'')
  .replace('<link rel="stylesheet" href="./src/styles.css">',`<style>${css}</style>`)
  .replace(/<script src="https:\/\/cdn\.jsdelivr[^>]+><\/script>/g,'')
  .replace(/<script type="module" src="\.\/src\/app\.js"><\/script>/,`<script>${model.replace(/^export /gm,'')}\n${visuals.replace(/^export /gm,'')}\n${app.replace(/^import .*?;\s*$/gm,'')}</script>`)
  .replace(/<img src="https:\/\/techtweedie\.github\.io[^>]+>/g,'<span aria-hidden="true" class="offline-avatar">IT</span>')
  .replace(/<img src="https:\/\/raw\.githubusercontent\.com\/TechTweedie[^>]+>/g,'')
  .replace(/<mightora-header[^>]+><\/mightora-header>/,'<div style="background:#092a32;color:white;padding:15px 24px;font-weight:800;letter-spacing:.15em">MIGHTORA <span style="color:#ffc67e">/ Security Role Designer</span></div>')
  .replace(/<mightora-footer[^>]*>([\s\S]*?)<\/mightora-footer>/,'<footer class="offline-footer">$1</footer>')
  .replace(/<mightora-author>([\s\S]*?)<\/mightora-author>/,'<div>$1</div>')
  .replace('<div class="eyebrow">MIGHTORA / POWER PLATFORM TOOLKIT</div>','<div class="eyebrow">OFFLINE EDITION – NO INTERNET CONNECTION REQUIRED</div>');
await writeFile(new URL('security-role-designer-offline.html',dist),offline);
console.log('Built dist/ and standalone offline HTML');
