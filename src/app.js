import { ACTIONS, LEVELS, EMPTY_PERMISSIONS, newRole, demoModel, validateModel, compareRoles, reviewRole, privilegeCSV } from './model.js';
import { hierarchySVG, relationshipSVG, heatmapSVG, heatmapRows, esc } from './visuals.js';

const $ = (id) => document.getElementById(id);
const state = { model: demoModel(), roleId: 'claims-handler', comparisonId: 'claims-supervisor', view: 'roles', dirty: false };
const storageKey = 'mightora.security-role-designer.v1';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);

function notification(message, error = false) {
  const n = $('status'); n.textContent = message; n.dataset.error = String(error);
  clearTimeout(notification.timer); notification.timer = setTimeout(() => n.textContent = '', 6500);
}
function persist() {
  state.dirty = true;
  try { localStorage.setItem(storageKey, JSON.stringify(state.model)); $('saved').textContent = 'Saved in this browser'; }
  catch { $('saved').textContent = 'Not saved — export a backup'; notification('Browser storage is unavailable. Export your work as JSON.', true); }
}
function currentRole() { return state.model.roles.find(r => r.id === state.roleId) || state.model.roles[0]; }
function levelLabel(level) { return LEVELS[level] || 'Unknown'; }
function roleOptions(selected) { return state.model.roles.map(r => `<option value="${escape(r.id)}" ${r.id===selected?'selected':''}>${escape(r.name)}</option>`).join(''); }

function render() {
  $('model-name').value = state.model.name;
  $('table-count').textContent = state.model.tables.length;
  $('role-count').textContent = state.model.roles.length;
  $('model-source').textContent = state.model.source?.type === 'synthetic-example' ? 'Synthetic example' : (state.model.source?.type || 'Local model');
  document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('active', b.dataset.view === state.view); b.setAttribute('aria-current', b.dataset.view === state.view ? 'page':'false'); });
  for (const section of document.querySelectorAll('main section[data-page]')) section.hidden = section.dataset.page !== state.view;
  if (state.view === 'roles') renderRoles();
  if (state.view === 'compare') renderCompare();
  if (state.view === 'review') renderReview();
  if (state.view === 'map') renderMap();
  if (state.view === 'visuals') renderVisuals();
  if (state.view === 'export') renderExport();
}
function renderRoles() {
  const role = currentRole();
  $('role-picker').innerHTML = roleOptions(role?.id);
  $('role-details').hidden = !role;
  if (!role) { $('privilege-body').innerHTML = '<tr><td>No roles. Add one to start.</td></tr>'; return; }
  $('role-name').value = role.name;
  $('role-bu').value = role.businessUnit || '';
  $('role-notes').value = role.notes || '';
  const query = $('table-filter').value.trim().toLowerCase();
  const tables = state.model.tables.filter(t => (t.name + ' ' + t.id).toLowerCase().includes(query));
  $('privilege-body').innerHTML = tables.map(t => `<tr><th scope="row"><span>${escape(t.name)}</span><small>${escape(t.id)}</small><small>${t.ownership==='organisation'?'Organisation owned':'User/team owned'}</small></th>${ACTIONS.map(a => {
    const v = role.privileges[t.id]?.[a] ?? 0;
    const choices = (t.ownership === 'organisation' ? [0,4] : [0,1,2,3,4]).map(i => `<option value="${i}" ${v===i?'selected':''}>${escape(levelLabel(i))}</option>`).join('');
    return `<td><select data-table="${escape(t.id)}" data-action="${escape(a)}" aria-label="${escape(t.name)} ${escape(a)}" class="level level-${v}">${choices}</select></td>`;
  }).join('')}</tr>`).join('') || '<tr><td colspan="9">No matching tables.</td></tr>';
}
function renderCompare() {
  $('base-role').innerHTML = roleOptions(state.roleId);
  $('target-role').innerHTML = roleOptions(state.comparisonId);
  const a = currentRole(), b = state.model.roles.find(r => r.id === state.comparisonId);
  const changes = compareRoles(a,b,state.model.tables);
  $('comparison-summary').textContent = `${changes.length} changed permissions · ${changes.filter(c=>c.delta>0).length} increases · ${changes.filter(c=>c.delta<0).length} reductions`;
  $('comparison-body').innerHTML = changes.map(c => `<tr><td>${escape(c.table.name)}</td><td>${escape(c.action)}</td><td>${escape(levelLabel(c.before))}</td><td>${escape(levelLabel(c.after))}</td><td><span class="pill ${c.delta>0?'danger':'good'}">${c.delta>0?'Increased':'Reduced'}</span></td></tr>`).join('') || '<tr><td colspan="5">No privilege differences detected.</td></tr>';
}
function renderReview() {
  const role = currentRole(); $('review-role').textContent = role?.name || 'No role';
  const findings = role ? reviewRole(role,state.model.tables) : [];
  $('finding-count').textContent = findings.length;
  $('findings').innerHTML = findings.map(f => `<article class="finding"><span class="pill ${f.severity==='high'?'danger':f.severity==='medium'?'warning':'neutral'}">${escape(f.severity)}</span><div><strong>${escape(f.table)}</strong><p>${escape(f.message)}</p></div></article>`).join('') || '<div class="empty">No advisory rules were triggered. This is not proof that the role is secure.</div>';
}
function renderMap() {
  const units = state.model.businessUnits || [];
  $('business-units').innerHTML = units.length ? units.map(u => `<li><strong>${escape(u.name)}</strong><small>${u.parentId ? `Parent: ${escape(units.find(x=>x.id===u.parentId)?.name || 'Unknown')}` : 'Root business unit'}</small></li>`).join('') : '<li>No business-unit data included.</li>';
  $('assignments').innerHTML = (state.model.assignments || []).length ? state.model.assignments.map(a=>`<li>${escape(a.principalId)} → ${escape(a.roleId)}</li>`).join('') : '<li>No user/team assignments. Role export data alone cannot establish effective access.</li>';
}
function renderExport() { $('export-role-name').textContent = currentRole()?.name || 'None'; }
function download(name, content, mime) {
  const url = URL.createObjectURL(new Blob([content],{type:mime}));
  const a = document.createElement('a'); a.href=url; a.download=name; document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1500);
}
function safeSlug(s) { return (s || 'security-model').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80); }
function downloadJson() { download(`${safeSlug(state.model.name)}.json`, JSON.stringify(state.model,null,2), 'application/json'); }
function downloadCSV() { const role=currentRole(); if (role) download(`${safeSlug(role.name)}-privileges.csv`, privilegeCSV(state.model,role), 'text/csv;charset=utf-8'); }
function readFile(file) {
  if (!file) return;
  if (file.size > 8*1024*1024) { notification('File exceeds the 8 MB JSON import limit.', true); return; }
  file.text().then(raw => {
    const parsed=validateModel(JSON.parse(raw));
    state.model=parsed; state.roleId=parsed.roles[0]?.id || ''; state.comparisonId=parsed.roles[1]?.id || state.roleId;
    persist(); render(); notification('Model imported and validated locally.');
  }).catch(e=>notification(`Import failed: ${e.message}`,true));
}


const visualState={type:'hierarchy',role:'',bu:'',action:'Read',depth:0,table:''};
function renderVisuals(){
 const model=state.model;
 const roleSelect=$('visual-role'), buSelect=$('visual-bu');
 const oldRole=visualState.role,oldBU=visualState.bu;
 roleSelect.innerHTML='<option value="">All roles</option>'+model.roles.map(r=>`<option value="${escape(r.id)}">${escape(r.name)}</option>`).join('');
 buSelect.innerHTML='<option value="">All units</option>'+(model.businessUnits||[]).map(u=>`<option value="${escape(u.name)}">${escape(u.name)}</option>`).join('');
 roleSelect.value=model.roles.some(r=>r.id===oldRole)?oldRole:'';buSelect.value=(model.businessUnits||[]).some(u=>u.name===oldBU)?oldBU:'';
 visualState.role=roleSelect.value;visualState.bu=buSelect.value;
 document.querySelectorAll('[data-visual]').forEach(b=>{b.classList.toggle('active',b.dataset.visual===visualState.type);b.setAttribute('aria-pressed',String(b.dataset.visual===visualState.type));});
 const canvas=$('visual-canvas');
 const scoped={...model,roles:model.roles.filter(r=>(!visualState.role||r.id===visualState.role)&&(!visualState.bu||r.businessUnit===visualState.bu))};
 let svg='';
 if(visualState.type==='hierarchy'){svg=hierarchySVG(model);$('visual-summary').textContent=(model.businessUnits||[]).length+' business units · '+(model.teams||[]).length+' teams';}
 if(visualState.type==='relationships'){svg=relationshipSVG(scoped);$('visual-summary').textContent=scoped.roles.length+' roles · '+model.tables.length+' tables';}
 if(visualState.type==='heatmap'){svg=heatmapSVG(scoped,'',visualState.table,visualState.action,visualState.depth);const rows=heatmapRows(scoped,'',visualState.table,visualState.action,visualState.depth);$('visual-summary').textContent=rows.reduce((n,r)=>n+r.cells.length,0)+' matching cells';}
 canvas.innerHTML=svg;
 canvas.dataset.svg=svg;
 $('visual-details').textContent='Select a business unit, role or table node to inspect the available model details. Nodes are representations of configured metadata.';
}
function saveVisualSVG(){
 const source=$('visual-canvas').dataset.svg;if(!source)return;
 download('mightora-security-'+visualState.type+'.svg',source,'image/svg+xml;charset=utf-8');
}
document.querySelectorAll('[data-visual]').forEach(b=>b.addEventListener('click',()=>{visualState.type=b.dataset.visual;renderVisuals();}));
for(const [id,key] of [['visual-role','role'],['visual-bu','bu'],['visual-action','action'],['visual-depth','depth'],['visual-table-search','table']]){
 $(id).addEventListener(id==='visual-table-search'?'input':'change',e=>{visualState[key]=key==='depth'?Number(e.target.value):e.target.value;renderVisuals();});
}
$('visual-svg').addEventListener('click',saveVisualSVG);
function inspectNode(node){
 const kind=node.dataset.kind,id=node.dataset.id,m=state.model;
 if(kind==='role'){const r=m.roles.find(x=>x.id===id);visualState.role=id;visualState.type='relationships';renderVisuals();$('visual-details').textContent=r?'Role: '+r.name+' · Business unit: '+(r.businessUnit||'not specified')+' · Permissions are configured, not effective access.':'Role not found';}
 else if(kind==='unit'){const u=m.businessUnits?.find(x=>x.id===id);visualState.bu=u?.name||'';visualState.type='relationships';renderVisuals();$('visual-details').textContent='Business unit: '+(u?.name||id)+' · Parent: '+(u?.parentId||'root')+' · Role matches use stored business-unit names.';}
 else if(kind==='table'){const t=m.tables.find(x=>x.id===id);$('visual-details').textContent=t?'Table: '+t.name+' ('+t.id+') · Ownership: '+t.ownership:'Table not found';}
}
$('visual-canvas').addEventListener('click',e=>{const node=e.target.closest('.graph-node');if(node)inspectNode(node);});
$('visual-canvas').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const node=e.target.closest('.graph-node');if(node){e.preventDefault();inspectNode(node);}}});

document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click',()=> { state.view=b.dataset.view; render(); }));
$('role-picker').addEventListener('change',e=>{state.roleId=e.target.value;render();});
$('base-role').addEventListener('change',e=>{state.roleId=e.target.value;render();});
$('target-role').addEventListener('change',e=>{state.comparisonId=e.target.value;render();});
$('table-filter').addEventListener('input',renderRoles);
$('privilege-body').addEventListener('change',e=>{
  const el=e.target;if(!el.matches('select[data-table]'))return;
  const role=currentRole();if(!role)return;
  role.privileges[el.dataset.table] ||= EMPTY_PERMISSIONS();
  role.privileges[el.dataset.table][el.dataset.action]=Number(el.value);
  el.className=`level level-${el.value}`;persist();notification('Privilege updated.');
});
$('add-role').addEventListener('click',()=>{const r=newRole(`New role ${state.model.roles.length+1}`);state.model.roles.push(r);state.roleId=r.id;persist();render();$('role-name').focus();});
$('clone-role').addEventListener('click',()=>{const role=currentRole();if(!role)return;const clone=structuredClone(role);clone.id=crypto.randomUUID();clone.name+= ' (copy)';state.model.roles.push(clone);state.roleId=clone.id;persist();render();});
$('delete-role').addEventListener('click',()=>{const role=currentRole();if(!role||!confirm(`Delete the role "${role.name}" from this local model?`))return;state.model.roles=state.model.roles.filter(r=>r.id!==role.id);state.roleId=state.model.roles[0]?.id||'';persist();render();});
for(const [id,key] of [['role-name','name'],['role-bu','businessUnit'],['role-notes','notes']]) $(id).addEventListener('input',e=>{const role=currentRole();if(role){role[key]=e.target.value;persist(); if(key==='name')$('role-picker').selectedOptions[0].textContent=role.name;}});
$('model-name').addEventListener('change',e=>{state.model.name=e.target.value.trim()||'Untitled model';persist();render();});
$('add-table').addEventListener('click',()=>{
  const id=prompt('Table logical name (for example: contoso_request)');if(!id)return;
  if(!/^[a-zA-Z][\w]{0,99}$/.test(id)||state.model.tables.some(t=>t.id===id)){notification('Enter a unique logical name using letters, numbers and underscores.',true);return;}
  const name=prompt('Display name',id)||id;
  const organisation=confirm('Is this an organisation-owned table? Click Cancel for user/team-owned.');
  state.model.tables.push({id,name,ownership:organisation?'organisation':'user-team'});persist();render();
});
$('export-json').addEventListener('click',downloadJson);
$('export-csv').addEventListener('click',downloadCSV);
$('import-json').addEventListener('change',e=>{readFile(e.target.files[0]);e.target.value='';});
$('new-model').addEventListener('click',()=>{
  if(!confirm('Start a blank model? Export your current model first if you want a separate backup.'))return;
  state.model={schemaVersion:'1.0.0',modelType:'mightora.security',name:'Untitled security model',source:{type:'manual'},tables:[],roles:[],businessUnits:[],teams:[],assignments:[],findings:[]};state.roleId='';state.comparisonId='';persist();render();
});
$('demo-model').addEventListener('click',()=>{if(!confirm('Load the demonstration model and replace the current local workspace?'))return;state.model=demoModel();state.roleId=state.model.roles[0].id;state.comparisonId=state.model.roles[1].id;persist();render();});
try { const saved=localStorage.getItem(storageKey);if(saved){state.model=validateModel(JSON.parse(saved));state.roleId=state.model.roles[0]?.id||'';state.comparisonId=state.model.roles[1]?.id||state.roleId;$('saved').textContent='Restored from this browser';} } catch {notification('Saved model could not be restored. The example is loaded.',true);}
render();
