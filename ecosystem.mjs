/**
 * SparkBR Ecosystem API 2.1.
 * Uses the existing SparkBR account token from /spark-api; it does not create a second account system.
 * Family records are stored separately from the apps' sensitive/private data.
 */
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

const WRITE_LIMIT = 180;
const INVITE_MS = 7 * 24 * 60 * 60 * 1000;
const COLLECTION_APPS = {
  'shopping-list': ['spark', 'cardapio'],
  'meal-plan': ['cardapio', 'spark'],
  'family-tasks': ['familia', 'faxina', 'escola', 'sparkmat', 'sparkpet'],
  'calendar': ['agenda', 'escola', 'familia'],
  'household-expenses': ['contas', 'financeiro', 'cofrinho', 'energia', 'posto', 'bico'],
  'home-inventory': ['sparkmat', 'sparkpet', 'energia', 'faxina', 'familia'],
  'pet-care': ['sparkpet'],
  'school-checklist': ['escola'],
  'vehicle-log': ['posto'],
  'water-goals': ['agua'],
  'sleep-habits': ['sono'],
  'ideas': ['ideias', 'mural']
};
const COLLECTIONS = new Set(Object.keys(COLLECTION_APPS));
const FORBIDDEN = /password|secret|token|cpf|cnpj|pix|bank|accountnumber|diagnos|prescri|medication|medicamento|remedio|health|examresult|medical|insurance|\brg\b/i;
const sha = s => createHash('sha256').update(s).digest('hex');
const clean = (s, n = 120) => typeof s === 'string' ? s.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, n) : '';
const emptyDb = () => ({ version: 2, families: [], memberships: [], activeFamilies: [], invites: [], records: [] });

function send(res, status, body, headers = {}) {
  if (res.headersSent) return;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', ...headers });
  res.end(JSON.stringify(body));
}
function cookieToken(req) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === 'sparkbr_session') {
      try { return decodeURIComponent(part.slice(i + 1).trim()).slice(0, 200); } catch { return ''; }
    }
  }
  return '';
}
function sameOrigin(req) {
  const expected = String(req.headers.host || '').toLowerCase();
  const origin = req.headers.origin || req.headers.referer;
  if (!origin || !expected) return false;
  try {
    const u = new URL(origin);
    return u.host.toLowerCase() === expected && (u.protocol === 'https:' || (u.protocol === 'http:' && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(u.host)));
  } catch { return false; }
}
async function bodyJson(req, maxBytes = 16384) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw, 'utf8') > maxBytes) throw Object.assign(new Error('Requisição muito grande.'), { status: 413 });
  }
  if (!raw) return {};
  if (!String(req.headers['content-type'] || '').toLowerCase().includes('application/json')) throw Object.assign(new Error('Envie JSON.'), { status: 415 });
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('shape');
    return value;
  } catch { throw Object.assign(new Error('JSON inválido.'), { status: 400 }); }
}
function safeData(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Object.assign(new Error('Os dados precisam ser um objeto.'), { status: 400 });
  const visit = (v, depth = 0) => {
    if (depth > 5) throw Object.assign(new Error('Estrutura muito profunda.'), { status: 400 });
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) throw Object.assign(new Error('Número inválido.'), { status: 400 });
      return v;
    }
    if (typeof v === 'string') {
      if (v.length > 2000) throw Object.assign(new Error('Texto acima do limite de 2.000 caracteres.'), { status: 400 });
      return v;
    }
    if (Array.isArray(v)) {
      if (v.length > 40) throw Object.assign(new Error('Lista muito grande.'), { status: 400 });
      return v.map(x => visit(x, depth + 1));
    }
    if (typeof v === 'object') {
      const entries = Object.entries(v);
      if (entries.length > 30) throw Object.assign(new Error('Objeto com campos demais.'), { status: 400 });
      const out = {};
      for (const [key, val] of entries) {
        if (!/^[\p{L}\p{N}_ -]{1,60}$/u.test(key) || FORBIDDEN.test(key)) throw Object.assign(new Error('Não compartilhe senhas, documentos, dados bancários ou informações médicas neste espaço familiar.'), { status: 400 });
        out[key] = visit(val, depth + 1);
      }
      return out;
    }
    throw Object.assign(new Error('Tipo de dado não permitido.'), { status: 400 });
  };
  const result = visit(input);
  if (Buffer.byteLength(JSON.stringify(result), 'utf8') > 6000) throw Object.assign(new Error('Registro acima de 6 KB.'), { status: 413 });
  return result;
}
function recordSummary(r) {
  return { id: r.id, collection: r.collection, appId: r.appId, data: r.data, version: r.version, createdAt: r.createdAt, updatedAt: r.updatedAt };
}
function clientIp(req) {
  const ip = req.socket.remoteAddress || 'unknown';
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip) && typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'].slice(0, 64) : ip;
}

export function createEcosystemApi({ prefix = '/navegador/', dataDir, appsPath, authMeUrl = process.env.SPARK_AUTH_ME_URL || 'https://sparkbr.online/spark-api/perfil' }) {
  const base = prefix.replace(/\/$/, '') + '/api/ecosystem';
  const dataFile = path.join(dataDir, 'ecosystem.json');
  let dbPromise;
  let writeChain = Promise.resolve();
  const hits = new Map();
  const appIdsPromise = readFile(appsPath, 'utf8').then(s => new Set(JSON.parse(s).map(x => x.id))).catch(() => new Set());

  async function getDb() {
    if (!dbPromise) dbPromise = (async () => {
      await mkdir(dataDir, { recursive: true });
      try {
        const raw = JSON.parse(await readFile(dataFile, 'utf8'));
        const db = emptyDb();
        for (const key of Object.keys(db)) if (Array.isArray(db[key]) && Array.isArray(raw[key])) db[key] = raw[key];
        return db;
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
        return emptyDb();
      }
    })();
    return dbPromise;
  }
  async function persist(db) {
    const tmp = dataFile + '.' + process.pid + '.tmp';
    await writeFile(tmp, JSON.stringify(db), { mode: 0o600 });
    await rename(tmp, dataFile);
  }
  async function mutate(fn) {
    const task = writeChain.then(async () => {
      const db = await getDb();
      const result = await fn(db);
      await persist(db);
      return result;
    });
    writeChain = task.catch(() => {});
    return task;
  }
  async function readDb() { await writeChain; return getDb(); }
  function limited(req, bucket, max, windowMs) {
    const key = bucket + ':' + clientIp(req), now = Date.now();
    let x = hits.get(key);
    if (!x || x.until < now) x = { count: 0, until: now + windowMs };
    x.count++; hits.set(key, x);
    if (hits.size > 3000) for (const [k, v] of hits) if (v.until < now) hits.delete(k);
    return x.count <= max;
  }
  async function allowedApp(collection, appId) {
    const appIds = await appIdsPromise;
    return !!COLLECTION_APPS[collection]?.includes(appId) && (appIds.size === 0 || appIds.has(appId));
  }
  function viewFor(db, user, familyId) {
    const family = db.families.find(f => f.id === familyId);
    if (!family) return { authenticated: false };
    const memberships = db.memberships.filter(m => m.userId === user.id).map(m => {
      const f = db.families.find(x => x.id === m.familyId);
      return f ? { familyId: f.id, name: f.name, role: m.role } : null;
    }).filter(Boolean);
    const membership = db.memberships.find(m => m.userId === user.id && m.familyId === familyId);
    return {
      authenticated: true,
      user: { id: user.id, name: user.name, email: user.email },
      family: { id: family.id, name: family.name, memberCount: db.memberships.filter(m => m.familyId === family.id).length },
      role: membership?.role || 'member',
      memberships,
      mode: 'existing-spark-account'
    };
  }
  async function auth(req, createFamily = true) {
    const token = cookieToken(req);
    if (!token) return null;
    let body;
    try {
      const response = await fetch(authMeUrl, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(7000) });
      if (!response.ok) return null;
      body = await response.json();
    } catch { return null; }
    const rawUser = body && (body.perfil || body.user || body.usuario);
    if (!body || body.ok === false || !rawUser) return null;
    const id = String(rawUser.id ?? rawUser.user_id ?? rawUser.uid ?? rawUser.email ?? '').trim().slice(0, 120);
    if (!id) return null;
    const user = { id, name: clean(rawUser.nome || rawUser.name || rawUser.nome_completo || 'Usuário', 60), email: clean(rawUser.email || '', 254).toLowerCase() };
    const now = Date.now();
    let db = await readDb();
    let active = db.activeFamilies.find(x => x.userId === id)?.familyId;
    let membership = active && db.memberships.find(x => x.userId === id && x.familyId === active);
    if (!membership) membership = db.memberships.find(x => x.userId === id);
    if (!membership) {
      if (!createFamily) return { user, familyId: null, db, view: { authenticated: true, user, family: null, role: 'member', memberships: [], mode: 'existing-spark-account' }, token };
      active = await mutate(store => {
        let m = store.memberships.find(x => x.userId === id);
        if (!m) {
          const familyId = randomUUID();
          store.families.push({ id: familyId, name: 'Família de ' + user.name, createdAt: now });
          store.memberships.push({ id: randomUUID(), userId: id, familyId, role: 'owner', createdAt: now });
          m = store.memberships[store.memberships.length - 1];
        }
        const a = store.activeFamilies.find(x => x.userId === id);
        if (a) a.familyId = m.familyId; else store.activeFamilies.push({ userId: id, familyId: m.familyId });
        return m.familyId;
      });
      db = await readDb();
    } else {
      active = membership.familyId;
      const current = db.activeFamilies.find(x => x.userId === id);
      if (!current || current.familyId !== active) {
        await mutate(store => {
          const a = store.activeFamilies.find(x => x.userId === id);
          if (a) a.familyId = active; else store.activeFamilies.push({ userId: id, familyId: active });
        });
        db = await readDb();
      }
    }
    return { user, familyId: active, db, view: viewFor(db, user, active), token };
  }
  async function ensureAuth(req, res, createFamily = true) {
    const a = await auth(req, createFamily);
    if (!a) send(res, 401, { error: 'Entre na conta principal do SparkBR para usar o compartilhamento familiar.' });
    return a;
  }

  return async function handleEcosystem(req, res, url) {
    if (!url.pathname.startsWith(base)) return false;
    const route = url.pathname.slice(base.length).replace(/^\/+/, '');
    const mutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    if (mutation && !sameOrigin(req)) { send(res, 403, { error: 'Origem não permitida.' }); return true; }
    try {
      if (route === 'session' && req.method === 'GET') {
        const a = await auth(req);
        send(res, 200, a ? a.view : { authenticated: false, authRequired: true });
        return true;
      }
      if (route === 'logout' && req.method === 'POST') {
        const token = cookieToken(req);
        if (token) {
          try { await fetch(process.env.SPARK_LOGOUT_URL || 'https://sparkbr.online/spark-api/auth/sair', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(5000) }); } catch {}
        }
        const secure = String(req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https' || !!req.socket.encrypted;
        send(res, 200, { ok: true }, { 'Set-Cookie': 'sparkbr_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' + (secure ? '; Secure' : '') });
        return true;
      }
      if (route === 'family/select' && req.method === 'POST') {
        const a = await ensureAuth(req, res, false); if (!a) return true;
        const b = await bodyJson(req), familyId = clean(b.familyId, 64);
        const result = await mutate(db => {
          if (!db.memberships.some(m => m.userId === a.user.id && m.familyId === familyId)) return { error: 'Você não participa desta família.' };
          const active = db.activeFamilies.find(x => x.userId === a.user.id);
          if (active) active.familyId = familyId; else db.activeFamilies.push({ userId: a.user.id, familyId });
          return { ok: true };
        });
        if (result.error) { send(res, 403, { error: result.error }); return true; }
        const db = await readDb();
        send(res, 200, viewFor(db, a.user, familyId));
        return true;
      }
      if (route === 'invite' && req.method === 'POST') {
        const a = await ensureAuth(req, res); if (!a) return true;
        if (!limited(req, 'invite', 10, 60 * 60 * 1000)) { send(res, 429, { error: 'Limite de convites atingido. Tente novamente mais tarde.' }); return true; }
        const code = randomBytes(5).toString('hex').toUpperCase(), now = Date.now();
        await mutate(db => db.invites.push({ id: randomUUID(), codeHash: sha(code), familyId: a.familyId, createdBy: a.user.id, createdAt: now, expiresAt: now + INVITE_MS, usedAt: null, usedBy: null }));
        send(res, 201, { code, expiresAt: now + INVITE_MS, uses: 1 });
        return true;
      }
      if (route === 'join' && req.method === 'POST') {
        const a = await ensureAuth(req, res, false); if (!a) return true;
        if (!limited(req, 'join', 20, 60 * 60 * 1000)) { send(res, 429, { error: 'Muitas tentativas de convite. Tente novamente mais tarde.' }); return true; }
        const b = await bodyJson(req), code = clean(b.code, 24).toUpperCase(), now = Date.now();
        const result = await mutate(db => {
          const invite = db.invites.find(x => x.codeHash === sha(code) && !x.usedAt && x.expiresAt > now);
          if (!invite) return { error: 'Convite inválido, vencido ou já utilizado.' };
          if (db.memberships.some(m => m.userId === a.user.id && m.familyId === invite.familyId)) return { error: 'Você já participa desta família.' };
          invite.usedAt = now; invite.usedBy = a.user.id;
          db.memberships.push({ id: randomUUID(), userId: a.user.id, familyId: invite.familyId, role: 'member', createdAt: now });
          const active = db.activeFamilies.find(x => x.userId === a.user.id);
          if (active) active.familyId = invite.familyId; else db.activeFamilies.push({ userId: a.user.id, familyId: invite.familyId });
          return { familyId: invite.familyId };
        });
        if (result.error) { send(res, 400, { error: result.error }); return true; }
        const db = await readDb();
        send(res, 200, viewFor(db, a.user, result.familyId));
        return true;
      }
      if (route === 'shopping-sync' && req.method === 'POST') {
        const a = await ensureAuth(req, res); if (!a) return true;
        if (!limited(req, 'write', WRITE_LIMIT, 60 * 60 * 1000)) { send(res, 429, { error: 'Limite de gravações atingido. Tente mais tarde.' }); return true; }
        const b = await bodyJson(req, 32000), appId = clean(b.appId, 60);
        if (appId !== 'spark' || !await allowedApp('shopping-list', appId) || !Array.isArray(b.items) || b.items.length > 200) { send(res, 400, { error: 'Lista de compras ou aplicativo não permitido.' }); return true; }
        const deduped = new Map();
        for (const raw of b.items) {
          if (!raw || typeof raw !== 'object') continue;
          const item = clean(raw.item || raw.nome || raw.name, 160);
          if (!item) continue;
          const key = item.toLocaleLowerCase('pt-BR');
          const quantity = Math.max(1, Math.min(999, Number(raw.quantity ?? raw.qtd ?? raw.qty ?? 1) || 1));
          const unit = clean(raw.unit || 'un', 12) || 'un';
          const prior = deduped.get(key);
          if (prior) prior.quantity = Math.min(999, prior.quantity + quantity);
          else deduped.set(key, { item, quantity, unit, checked: !!raw.checked, origin: 'spark-local' });
        }
        const items = Array.from(deduped.values()).map(safeData);
        const now = Date.now();
        const result = await mutate(db => {
          let created = 0, updated = 0;
          for (const data of items) {
            const key = String(data.item).trim().toLocaleLowerCase('pt-BR');
            const existing = db.records.find(r => r.familyId === a.familyId && r.collection === 'shopping-list' && String(r.data.item || '').trim().toLocaleLowerCase('pt-BR') === key);
            if (existing) {
              const next = { ...existing.data, item: existing.data.item || data.item, quantity: data.quantity, unit: data.unit, checked: data.checked, origin: existing.data.origin || 'spark-local' };
              if (JSON.stringify(existing.data) !== JSON.stringify(next)) { existing.data = next; existing.version++; existing.updatedAt = now; updated++; }
            } else {
              db.records.push({ id: randomUUID(), familyId: a.familyId, createdBy: a.user.id, collection: 'shopping-list', appId: 'spark', data, version: 1, createdAt: now, updatedAt: now });
              created++;
            }
          }
          return { created, updated, processed: items.length };
        });
        send(res, 200, { ok: true, ...result });
        return true;
      }
      if (route === 'data' && req.method === 'GET') {
        const a = await ensureAuth(req, res); if (!a) return true;
        const collection = url.searchParams.get('collection') || '', appId = url.searchParams.get('appId') || '';
        if (!COLLECTIONS.has(collection) || !await allowedApp(collection, appId)) { send(res, 400, { error: 'Coleção ou aplicativo não permitido.' }); return true; }
        const records = a.db.records.filter(r => r.familyId === a.familyId && r.collection === collection).sort((x, y) => y.updatedAt - x.updatedAt).slice(0, 200);
        send(res, 200, { records: records.map(recordSummary), collection });
        return true;
      }
      if (route === 'data' && req.method === 'POST') {
        const a = await ensureAuth(req, res); if (!a) return true;
        if (!limited(req, 'write', WRITE_LIMIT, 60 * 60 * 1000)) { send(res, 429, { error: 'Limite de gravações atingido. Tente mais tarde.' }); return true; }
        const b = await bodyJson(req), collection = clean(b.collection, 60), appId = clean(b.appId, 60);
        if (!COLLECTIONS.has(collection) || !await allowedApp(collection, appId)) { send(res, 400, { error: 'Coleção ou aplicativo não permitido.' }); return true; }
        const data = safeData(b.data), now = Date.now();
        const record = { id: randomUUID(), familyId: a.familyId, createdBy: a.user.id, collection, appId, data, version: 1, createdAt: now, updatedAt: now };
        const outcome = await mutate(db => {
          if (collection === 'shopping-list' && String(data.item || '').trim()) {
            const key = String(data.item).trim().toLocaleLowerCase('pt-BR');
            const existing = db.records.find(r => r.familyId === a.familyId && r.collection === collection && String(r.data.item || '').trim().toLocaleLowerCase('pt-BR') === key);
            if (existing) {
              const quantity = Math.max(1, Math.min(999, Number(existing.data.quantity) || 1)) + Math.max(1, Math.min(999, Number(data.quantity) || 1));
              existing.data = { ...existing.data, ...data, item: existing.data.item || data.item, quantity: Math.min(999, quantity), origin: existing.data.origin || data.origin || 'family-panel' };
              existing.version++; existing.updatedAt = now;
              return { record: existing, created: false };
            }
          }
          db.records.push(record);
          return { record, created: true };
        });
        send(res, outcome.created ? 201 : 200, { record: recordSummary(outcome.record), deduplicated: !outcome.created });
        return true;
      }
      if (route.startsWith('data/') && ['PUT', 'DELETE'].includes(req.method)) {
        const a = await ensureAuth(req, res); if (!a) return true;
        if (!limited(req, 'write', WRITE_LIMIT, 60 * 60 * 1000)) { send(res, 429, { error: 'Limite de gravações atingido. Tente mais tarde.' }); return true; }
        const id = decodeURIComponent(route.slice(5));
        if (req.method === 'DELETE') {
          const b = await bodyJson(req), appId = clean(b.appId, 60);
          const result = await mutate(db => {
            const r = db.records.find(x => x.id === id && x.familyId === a.familyId);
            if (!r) return { error: 'Registro não encontrado.' };
            if (!COLLECTION_APPS[r.collection]?.includes(appId)) return { error: 'Aplicativo não autorizado para esta coleção.' };
            db.records = db.records.filter(x => x.id !== id);
            return { ok: true };
          });
          if (result.error) { send(res, 404, { error: result.error }); return true; }
          send(res, 200, { ok: true }); return true;
        }
        const b = await bodyJson(req), appId = clean(b.appId, 60), data = safeData(b.data);
        const result = await mutate(db => {
          const r = db.records.find(x => x.id === id && x.familyId === a.familyId);
          if (!r) return { error: 'Registro não encontrado.' };
          if (!COLLECTION_APPS[r.collection]?.includes(appId)) return { error: 'Aplicativo não autorizado para esta coleção.' };
          if (Number(b.expectedVersion) !== r.version) return { conflict: true, record: recordSummary(r) };
          r.data = data; r.version++; r.updatedAt = Date.now();
          return { record: recordSummary(r) };
        });
        if (result.error) { send(res, 404, { error: result.error }); return true; }
        if (result.conflict) { send(res, 409, { error: 'O registro foi alterado por outra pessoa. Atualize a lista.', record: result.record }); return true; }
        send(res, 200, { record: result.record }); return true;
      }
      if (route === 'collections' && req.method === 'GET') {
        send(res, 200, { collections: COLLECTION_APPS, privateApps: ['saude', 'dose', 'farmacia', 'carteirinha', 'astromatch'], note: 'Use a conta principal do SparkBR. Dados de saúde, medicação e relacionamentos não são sincronizados automaticamente.' });
        return true;
      }
      send(res, 404, { error: 'Rota do ecossistema não encontrada.' });
      return true;
    } catch (error) {
      send(res, error.status || 500, { error: error.status ? error.message : 'Erro interno do ecossistema.' });
      if (!error.status) console.error('SparkBR ecosystem:', error);
      return true;
    }
  };
}
