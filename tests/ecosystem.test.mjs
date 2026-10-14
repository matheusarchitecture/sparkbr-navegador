import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEcosystemApi } from '../ecosystem.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profiles = {
  'account-a': { id: 101, nome: 'Ana', email: 'ana@example.com' },
  'account-b': { id: 202, nome: 'Bruno', email: 'bruno@example.com' },
  'account-c': { id: 303, nome: 'Caio', email: 'caio@example.com' }
};
async function listen(server) {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return server.address().port;
}
function request(base, route, { token, method = 'GET', body, origin = true } = {}) {
  const headers = {};
  if (token) headers.Cookie = 'sparkbr_session=' + token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (origin && method !== 'GET') headers.Origin = new URL(base).origin;
  return fetch(base + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

test('family API reuses existing SparkBR account, one-use invites and shared records', async t => {
  const authServer = createServer((req, res) => {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/, '');
    const user = profiles[token];
    res.writeHead(user ? 200 : 401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(user ? { ok: true, perfil: user } : { ok: false }));
  });
  const authPort = await listen(authServer);
  const dataDir = await mkdtemp(path.join(tmpdir(), 'sparkbr-ecosystem-'));
  const api = createEcosystemApi({
    prefix: '/navegador/',
    dataDir,
    appsPath: path.join(root, 'site', 'apps.json'),
    authMeUrl: 'http://127.0.0.1:' + authPort + '/profile'
  });
  const appServer = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://' + req.headers.host);
    if (await api(req, res, url)) return;
    res.writeHead(404); res.end();
  });
  const appPort = await listen(appServer);
  const base = 'http://127.0.0.1:' + appPort + '/navegador/api/ecosystem';
  t.after(async () => {
    appServer.closeAllConnections?.(); authServer.closeAllConnections?.();
    await Promise.all([new Promise(r => appServer.close(r)), new Promise(r => authServer.close(r))]);
    await rm(dataDir, { recursive: true, force: true });
  });

  let response = await request(base, '/session');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).authenticated, false);

  response = await request(base, '/session', { token: 'account-a' });
  assert.equal(response.status, 200);
  const owner = await response.json();
  assert.equal(owner.authenticated, true);
  assert.equal(owner.user.email, 'ana@example.com');
  assert.equal(owner.family.memberCount, 1);

  response = await request(base, '/invite', { token: 'account-a', method: 'POST', body: {} });
  assert.equal(response.status, 201);
  const invite = await response.json();
  assert.match(invite.code, /^[A-F0-9]{10}$/);

  response = await request(base, '/session', { token: 'account-b' });
  assert.equal(response.status, 200);
  const bOwnFamily = await response.json();
  assert.notEqual(bOwnFamily.family.id, owner.family.id);

  response = await request(base, '/join', { token: 'account-b', method: 'POST', body: { code: invite.code } });
  assert.equal(response.status, 200);
  const joined = await response.json();
  assert.equal(joined.family.id, owner.family.id);
  assert.equal(joined.family.memberCount, 2);
  assert.equal(joined.memberships.length, 2);

  response = await request(base, '/family/select', { token: 'account-b', method: 'POST', body: { familyId: bOwnFamily.family.id } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).family.id, bOwnFamily.family.id);
  response = await request(base, '/family/select', { token: 'account-b', method: 'POST', body: { familyId: owner.family.id } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).family.id, owner.family.id);

  response = await request(base, '/data', {
    token: 'account-a', method: 'POST',
    body: { collection: 'shopping-list', appId: 'spark', data: { item: 'Leite', checked: false } }
  });
  assert.equal(response.status, 201);
  const created = (await response.json()).record;
  assert.equal(created.version, 1);

  response = await request(base, '/data?collection=shopping-list&appId=cardapio', { token: 'account-b' });
  assert.equal(response.status, 200);
  const records = (await response.json()).records;
  assert.equal(records.length, 1);
  assert.equal(records[0].data.item, 'Leite');

  response = await request(base, '/data/' + created.id, {
    token: 'account-b', method: 'PUT',
    body: { appId: 'cardapio', expectedVersion: 1, data: { item: 'Leite', checked: true } }
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).record.version, 2);

  response = await request(base, '/data/' + created.id, {
    token: 'account-b', method: 'PUT',
    body: { appId: 'cardapio', expectedVersion: 1, data: { item: 'Leite', checked: false } }
  });
  assert.equal(response.status, 409);

  response = await request(base, '/data', {
    token: 'account-a', method: 'POST',
    body: { collection: 'shopping-list', appId: 'spark', data: { password: 'never-share' } }
  });
  assert.equal(response.status, 400);

  response = await request(base, '/data', {
    token: 'account-a', method: 'POST', origin: false,
    body: { collection: 'shopping-list', appId: 'spark', data: { item: 'Pão' } }
  });
  assert.equal(response.status, 403);

  response = await request(base, '/shopping-sync', {
    token: 'account-a', method: 'POST',
    body: { appId: 'spark', items: [{ nome: 'Leite', qtd: 3, unit: 'cx', checked: true }, { nome: 'Arroz', qtd: 1, unit: 'pct', checked: false }] }
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).processed, 2);

  response = await request(base, '/data?collection=shopping-list&appId=cardapio', { token: 'account-b' });
  assert.equal(response.status, 200);
  const synced = (await response.json()).records;
  assert.equal(synced.length, 2);
  assert.equal(synced.find(r => r.data.item === 'Leite').data.quantity, 3);
  assert.equal(synced.find(r => r.data.item === 'Leite').data.checked, true);
  assert.equal(synced.find(r => r.data.item === 'Arroz').data.unit, 'pct');

  response = await request(base, '/data?collection=shopping-list&appId=spark', { token: 'account-c' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).records.length, 0);

  response = await request(base, '/join', { token: 'account-c', method: 'POST', body: { code: invite.code } });
  assert.equal(response.status, 400);
});

test('health, medication and relationship data are excluded from automatic family sharing', async () => {
  const data = await (await import('node:fs/promises')).readFile(path.join(root, 'ecosystem.mjs'), 'utf8');
  assert.match(data, /privateApps/);
  assert.match(data, /medication\|medicamento\|remedio\|health/);
});
