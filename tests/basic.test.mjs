import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import path from 'node:path';
import net from 'node:net';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = relative => readFile(path.join(root, relative), 'utf8');
test('catalogue has exactly 23 unique app slugs', async () => {
  const apps = JSON.parse(await load('site/apps.json'));
  assert.equal(apps.length, 23);
  assert.equal(new Set(apps.map(a => a.id)).size, 23);
  for (const app of apps) {
    assert.match(app.id, /^[a-z][a-z0-9-]+$/);
    assert.ok(['casa','dinheiro','saude','conex'].includes(app.category));
    assert.ok(app.name && app.description);
  }
});
test('shell and family bridge assets are included', async () => {
  for (const file of ['site/index.html','site/app.js','site/style.css','site/config.js','site/catalog.js','site/manifest.webmanifest','site/service-worker.js','site/bridge/spark-bridge.js','site/bridge/spark-family.js','site/bridge/spark-family.css','public-site/index.html','ecosystem.mjs','desktop/main.cjs','desktop/preload.cjs']) {
    assert.ok((await load(file)).length > 100, file);
  }
});
test('all 23 app pages load the shared bridge and carry their app id', async () => {
  const apps = JSON.parse(await load('site/apps.json'));
  for (const app of apps) {
    const html = await load('public-site/' + app.id + '/index.html');
    assert.match(html, /spark-bridge\.js/, app.id + ' bridge');
    assert.match(html, /spark-family\.js/, app.id + ' family panel');
    assert.match(html, new RegExp('data-spark-page=["\\x27]' + app.id + '["\\x27]'), app.id + ' app id');
  }
});
function randomPort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
    s.on('error', reject);
  });
}
test('combined server serves the public site, browser shell and no-cache ecosystem status', async () => {
  const port = await randomPort();
  const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...process.env, PORT: String(port), OPENAI_API_KEY: '' }, stdio: 'ignore' });
  try {
    let response;
    for (let i = 0; i < 40; i++) {
      try { response = await fetch('http://127.0.0.1:' + port + '/navegador/'); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.ok(response, 'server starts');
    assert.equal(response.status, 200);
    assert.match(await response.text(), /SparkBR/);

    response = await fetch('http://127.0.0.1:' + port + '/');
    assert.equal(response.status, 200);
    assert.match(await response.text(), /23 aplicativos/);

    response = await fetch('http://127.0.0.1:' + port + '/spark/');
    assert.equal(response.status, 200);
    assert.match(await response.text(), /spark-family\.js/);

    response = await fetch('http://127.0.0.1:' + port + '/navegador/api/status');
    assert.equal(response.status, 200);
    const status = await response.json();
    assert.equal(status.iaOnline, false);
    assert.equal(status.ecosystem, true);

    response = await fetch('http://127.0.0.1:' + port + '/navegador/api/ecosystem/session');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).authenticated, false);

    response = await fetch('http://127.0.0.1:' + port + '/navegador/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Preciso organizar minhas contas' }) });
    assert.equal(response.status, 503);
  } finally {
    child.kill('SIGTERM');
  }
});
