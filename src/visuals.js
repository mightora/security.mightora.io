// Pure, DOM-free and offline-safe visualisation renderers.
export const esc = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label = (text,max=23) => String(text??'').length>max?String(text).slice(0,max-1)+'…':String(text??'');
const node=(x,y,w,h,title,sub,kind,id)=>`<g data-kind="${esc(kind)}" data-id="${esc(id)}" role="button" tabindex="0" aria-label="${esc(title)}" class="graph-node"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${kind==='unit'?'#dcf3ed':kind==='role'?'#e1ecff':kind==='table'?'#fff0da':'#f1f5f9'}" stroke="#8ca7a5"/><text x="${x+13}" y="${y+24}" font-size="13" fill="#12363e" font-weight="700">${esc(label(title))}</text><text x="${x+13}" y="${y+43}" font-size="10" fill="#526c71">${esc(label(sub,28))}</text></g>`;
const svgWrap=(content,height,description)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 ${height}" width="1100" height="${height}" role="img" aria-label="${esc(description)}"><rect width="1100" height="${height}" fill="#ffffff"/>${content}</svg>`;
export function hierarchySVG(model){
 const units=model.businessUnits||[], teams=model.teams||[], roles=model.roles||[];
 const byId=new Map(units.map(u=>[u.id,u]));
 const levels=new Map(); const depth=(id,seen=new Set())=>{if(levels.has(id))return levels.get(id);if(seen.has(id))return 0;seen.add(id);const u=byId.get(id);const d=u?.parentId&&byId.has(u.parentId)?Math.min(8,depth(u.parentId,seen)+1):0;levels.set(id,d);return d;};
 units.forEach(u=>depth(u.id));
 const nodes=units.map((u,i)=>({id:u.id,title:u.name||u.id,sub:'Business unit',depth:levels.get(u.id)||0,parent:u.parentId,index:i}));
 const maxDepth=Math.max(0,...nodes.map(n=>n.depth));const columns=Math.max(1,maxDepth+1);
 const groups=Array.from({length:columns},(_,d)=>nodes.filter(n=>n.depth===d));const most=Math.max(1,...groups.map(g=>g.length));
 const h=Math.max(240,most*90+80);const coords=new Map();
 groups.forEach((group,d)=>group.forEach((n,i)=>coords.set(n.id,{x:28+d*(1040/columns),y:55+i*90})));
 let out='<text x="26" y="27" font-size="17" font-weight="700" fill="#12363e">Business-unit hierarchy</text>';
 for(const n of nodes){const p=coords.get(n.parent);const c=coords.get(n.id);if(p)out+=`<path d="M${p.x+Math.min(230,940/columns)} ${p.y+27} L${c.x-10} ${c.y+27} L${c.x} ${c.y+27}" stroke="#79a59a" stroke-width="2" fill="none"/>`;}
 for(const n of nodes){const p=coords.get(n.id);out+=node(p.x,p.y,Math.min(230,940/columns),57,n.title,n.sub,'unit',n.id);}
 const related=roles.map(r=>`${r.name||r.id} (${r.businessUnit||'Unspecified BU'})`).join('; ');
 out+=`<text x="26" y="${h-12}" font-size="11" fill="#61747a">Roles: ${esc(label(related||'None modelled',125))} · Teams modelled: ${teams.length}</text>`;
 return svgWrap(out,h,'Business-unit parent and child relationships. Roles and teams appear in the summary.');
}
export function relationshipSVG(model,selectedRole='',selectedBU=''){
 const roles=(model.roles||[]).filter(r=>(!selectedRole||r.id===selectedRole)&&(!selectedBU||r.businessUnit===selectedBU));
 const tables=model.tables||[], assignments=model.assignments||[], teams=model.teams||[];
 const edges=[];const nodes=[];let y=70;
 roles.forEach((r,i)=>{const ry=y+i*86;nodes.push(node(310,ry,230,56,r.name,'Role','role',r.id));
   const relevant=tables.filter(t=>Object.values(r.privileges?.[t.id]||{}).some(v=>v>0));
   relevant.forEach(t=>edges.push({fromY:ry+28,toId:t.id,role:r.id}));});
 const visibleTableIds=[...new Set(edges.map(e=>e.toId))];
 const height=Math.max(280,Math.max(roles.length,visibleTableIds.length,assignments.length)*86+110);
 visibleTableIds.forEach((id,i)=>{const t=tables.find(x=>x.id===id);nodes.push(node(760,70+i*86,235,56,t?.name||id,'Table','table',id));});
 const ty=new Map(visibleTableIds.map((id,i)=>[id,70+i*86+28]));
 let out='<text x="30" y="30" fill="#12363e" font-size="17" font-weight="700">Role → table privilege relationships</text>';
 for(const edge of edges)out+=`<path d="M540 ${edge.fromY} C640 ${edge.fromY} 670 ${ty.get(edge.toId)} 760 ${ty.get(edge.toId)}" stroke="#85a69f" opacity=".65" stroke-width="1.5" fill="none"/>`;
 out+=nodes.join('');
 out+=`<text x="30" y="${height-15}" fill="#61747a" font-size="11">Modelled assignments: ${assignments.length} · Teams: ${teams.length}. Links show configured non-zero privileges, not effective access.</text>`;
 return svgWrap(out,height,'Security roles connected to tables where they have configured non-zero privileges.');
}
export function heatmapRows(model,roleFilter='',tableFilter='',actionFilter='Read',minimum=0){
 return (model.roles||[]).filter(r=>!roleFilter||r.id===roleFilter).map(r=>({
 role:r, cells:(model.tables||[]).filter(t=>(t.name+' '+t.id).toLowerCase().includes(tableFilter.toLowerCase())).map(t=>({table:t,level:r.privileges?.[t.id]?.[actionFilter]??0})).filter(c=>c.level>=minimum)
 }));
}
export function heatmapSVG(model,roleFilter='',tableFilter='',actionFilter='Read',minimum=0){
 const rows=heatmapRows(model,roleFilter,tableFilter,actionFilter,minimum);const tables=[...new Map(rows.flatMap(r=>r.cells).map(c=>[c.table.id,c.table])).values()];
 const w=Math.max(1100,230+tables.length*82),h=Math.max(170,100+rows.length*53);
 const colors=['#e8eef0','#bfd7ff','#95ddcb','#f6d18d','#d3a6ed'];
 let out=`<text x="20" y="29" fill="#12363e" font-size="17" font-weight="700">Security heatmap — ${esc(actionFilter)}</text>`;
 tables.forEach((t,j)=>out+=`<text transform="translate(${242+j*82},82) rotate(-45)" font-size="10" fill="#526c71">${esc(label(t.name,17))}</text>`);
 rows.forEach((r,i)=>{out+=`<text x="18" y="${112+i*53}" font-size="12" fill="#12363e">${esc(label(r.role.name,25))}</text>`;tables.forEach((t,j)=>{const level=r.role.privileges?.[t.id]?.[actionFilter]??0;if(level>=minimum)out+=`<rect x="${225+j*82}" y="${94+i*53}" rx="5" width="73" height="35" fill="${colors[level]}"/><text x="${261+j*82}" y="${115+i*53}" text-anchor="middle" font-size="11" font-weight="700" fill="#17353a">${['—','U','BU','PC','ORG'][level]}</text>`;});});
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Security heatmap of ${esc(actionFilter)} privilege depths">${out}</svg>`;
}
