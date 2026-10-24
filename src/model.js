export const ACTIONS = ['Create', 'Read', 'Write', 'Delete', 'Append', 'Append To', 'Assign', 'Share'];
export const LEVELS = ['None', 'User', 'Business Unit', 'Parent:Child', 'Organisation'];
export const EMPTY_PERMISSIONS = () => Object.fromEntries(ACTIONS.map(a => [a, 0]));

export function newRole(name = 'New role', id = crypto.randomUUID()) {
  return { id, name, businessUnit: 'Root', notes: '', privileges: {}, miscellaneous: {} };
}

export function demoModel() {
  const handler = newRole('Claims Handler', 'claims-handler');
  handler.businessUnit = 'Marine Claims';
  handler.privileges = {
    apptech_claim: { Create: 2, Read: 2, Write: 2, Delete: 0, Append: 1, 'Append To': 1, Assign: 0, Share: 0 },
    contact: { Create: 0, Read: 2, Write: 0, Delete: 0, Append: 0, 'Append To': 0, Assign: 0, Share: 0 },
    account: { Create: 0, Read: 2, Write: 0, Delete: 0, Append: 0, 'Append To': 0, Assign: 0, Share: 0 }
  };
  const supervisor = structuredClone(handler);
  supervisor.id = 'claims-supervisor'; supervisor.name = 'Claims Supervisor';
  supervisor.privileges.apptech_claim.Read = 4;
  supervisor.privileges.apptech_claim.Assign = 2;
  supervisor.privileges.apptech_claim.Share = 2;
  return {
    schemaVersion: '1.0.0', modelType: 'mightora.security', name: 'Claims Handling — example',
    source: { type: 'synthetic-example', importedAt: new Date().toISOString() },
    tables: [
      { id: 'apptech_claim', name: 'Claim', ownership: 'user-team' },
      { id: 'contact', name: 'Contact', ownership: 'user-team' },
      { id: 'account', name: 'Account', ownership: 'user-team' }
    ],
    roles: [handler, supervisor],
    businessUnits: [{ id: 'root', name: 'Root', parentId: null }, { id: 'marine', name: 'Marine Claims', parentId: 'root' }],
    teams: [], assignments: [], findings: [], notes: 'Synthetic data for learning and demonstration.'
  };
}

export function validateModel(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected a JSON model object.');
  if (input.modelType !== 'mightora.security' || input.schemaVersion !== '1.0.0') throw new Error('Unsupported Mightora Security Model schema.');
  if (!Array.isArray(input.roles) || !Array.isArray(input.tables) || input.roles.length > 2000 || input.tables.length > 5000) throw new Error('Invalid or oversized role/table collections.');
  if (typeof input.name !== 'string' || input.name.length > 300) throw new Error('Invalid model name.');
  const tableIds = new Set();
  for (const t of input.tables) {
    if (!t || typeof t.id !== 'string' || !/^[\w.:-]{1,200}$/.test(t.id) || tableIds.has(t.id) || typeof t.name !== 'string') throw new Error('Invalid or duplicate table.');
    if (!['user-team','organisation'].includes(t.ownership)) throw new Error('Invalid table ownership.');
    tableIds.add(t.id);
  }
  const roleIds = new Set();
  for (const r of input.roles) {
    if (!r || typeof r.id !== 'string' || r.id.length > 200 || roleIds.has(r.id) || typeof r.name !== 'string' || r.name.length > 300) throw new Error('Invalid or duplicate role.');
    roleIds.add(r.id);
    if (!r.privileges || typeof r.privileges !== 'object' || Array.isArray(r.privileges)) throw new Error('Invalid role privileges.');
    for (const [tableId, perms] of Object.entries(r.privileges)) {
      if (!tableIds.has(tableId)) throw new Error(`Unknown table in role: ${tableId}`);
      if (!perms || typeof perms !== 'object') throw new Error('Invalid privilege matrix.');
      for (const [action, value] of Object.entries(perms)) {
        if (!ACTIONS.includes(action) || !Number.isInteger(value) || value < 0 || value > 4) throw new Error('Invalid privilege level.');
        if (input.tables.find(t => t.id === tableId).ownership === 'organisation' && ![0,4].includes(value)) throw new Error('Organisation-owned tables support None or Organisation only.');
      }
    }
  }
  return structuredClone(input);
}

export function compareRoles(a, b, tables) {
  return tables.flatMap(table => ACTIONS.map(action => {
    const before = a?.privileges?.[table.id]?.[action] ?? 0;
    const after = b?.privileges?.[table.id]?.[action] ?? 0;
    return { table, action, before, after, delta: Math.sign(after - before) };
  })).filter(x => x.delta !== 0);
}

export function reviewRole(role, tables) {
  const findings = [];
  for (const table of tables) {
    const p = role.privileges[table.id] || {};
    if ((p.Delete ?? 0) === 4) findings.push({ severity: 'high', table: table.name, message: 'Organisation-wide Delete privilege. Confirm business need.' });
    if ((p.Assign ?? 0) === 4 || (p.Share ?? 0) === 4) findings.push({ severity: 'medium', table: table.name, message: 'Broad Assign or Share privilege. Review access boundaries.' });
    if ((p.Read ?? 0) === 4) findings.push({ severity: 'info', table: table.name, message: 'Organisation-wide Read privilege. Confirm intended visibility.' });
  }
  return findings;
}

export function csvEscape(value) { const s = String(value ?? ''); return /[",\r\n]/.test(s) ? `"${s.replaceAll('"','""')}"` : s; }
export function privilegeCSV(model, role) {
  const data = [['Table', 'Logical Name', 'Ownership', ...ACTIONS]];
  for (const t of model.tables) data.push([t.name, t.id, t.ownership, ...ACTIONS.map(a => LEVELS[role.privileges[t.id]?.[a] ?? 0])]);
  return data.map(row => row.map(csvEscape).join(',')).join('\r\n');
}
