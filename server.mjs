/** SparkBR 2.1 — root app site + browser shell + family ecosystem API + optional AI proxy. */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createEcosystemApi } from './ecosystem.mjs';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const shellRoot = path.join(baseDir, 'site');
const publicRoot = path.join(baseDir, 'public-site');
const port = Number(process.env.PORT || 3080);
const prefix = '/navegador/';
const dataDir = process.env.SPARK_DATA_DIR || path.join(baseDir, 'data');
const ecosystem = createEcosystemApi({ prefix, dataDir, appsPath: path.join(shellRoot, 'apps.json') });
const rate = new Map();
const MIME = {
  '.html':'text/html; charset=utf-8','.htm':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp',
  '.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf',
  '.pdf':'application/pdf','.mp4':'video/mp4','.webm':'video/webm','.wasm':'application/wasm',
  '.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'
};
function json(res, code, data) {
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(data));
}
function corsGuard(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const o = new URL(origin), h = String(req.headers.host || '').toLowerCase();
    return o.host.toLowerCase() === h && (o.protocol === 'https:' || (o.protocol === 'http:' && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(o.host)));
  } catch { return false; }
}
function limiter(req) {
  const now = Date.now(), remote = req.socket.remoteAddress || 'unknown';
  const trusted = ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote);
  const key = trusted && typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'].slice(0,64) : remote;
  let item = rate.get(key);
  if (!item || item.until < now) item = { hits:0, until:now + 60000 };
  item.hits++; rate.set(key,item);
  if (rate.size > 2000) for (const [k,v] of rate) if (v.until < now) rate.delete(k);
  return item.hits <= 15;
}
function suggestApps(text) {
  const rules = [
    [/mercado|lista|compr|feira/i,['spark','cardapio']],
    [/luz|energia|boleto|conta|g[aá]s/i,['contas','energia']],
    [/dinheiro|d[ií]vida|econom/i,['financeiro','cofrinho']],
    [/dose|rem[eé]dio|medic/i,['dose','farmacia']],
    [/escola|crian[cç]|filh/i,['escola','agenda']],
    [/obra|reforma/i,['sparkmat']], [/pet|gato|cachorro/i,['sparkpet']]
  ];
  return rules.find(pair => pair[0].test(text))?.[1] || ['familia','ideias'];
}
async function askAI(req, res) {
  if (!corsGuard(req)) return json(res,403,{error:'Origem não permitida'});
  if (!limiter(req)) return json(res,429,{error:'Muitas solicitações. Tente novamente mais tarde.'});
  if (!process.env.OPENAI_API_KEY) return json(res,503,{error:'IA online não configurada. Configure OPENAI_API_KEY no servidor.'});
  let raw = '';
  try {
    for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw,'utf8') > 8192) return json(res,413,{error:'Mensagem muito grande.'}); }
    const body = JSON.parse(raw), message = body && body.message;
    if (typeof message !== 'string' || message.trim().length < 2 || message.length > 2000) return json(res,400,{error:'Mensagem inválida'});
    const instructions = 'Você é o Spark IA, assistente brasileiro de rotina familiar do navegador SparkBR. Escreva em português brasileiro com gentileza e objetividade. Ajude a organizar tarefas, contas, compras, estudos e hábitos. Você pode sugerir um app, mas não afirme que seus dados estão sincronizados ou que executou ações. Não invente preços de mercados ou informações de medicamentos. Em saúde, seja informativo sem substituir profissional; em dinheiro, evite prometer resultados. Não solicite CPF, senhas nem registros sensíveis.';
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method:'POST',
      headers:{Authorization:'Bearer ' + process.env.OPENAI_API_KEY,'Content-Type':'application/json'},
      signal:AbortSignal.timeout(20000),
      body:JSON.stringify({model:process.env.SPARK_AI_MODEL || 'gpt-4.1-mini',store:false,max_output_tokens:500,instructions,input:message.trim()})
    });
    if (!upstream.ok) { console.error('IA upstream',upstream.status); return json(res,502,{error:'Provedor IA indisponível'}); }
    const data = await upstream.json();
    const answer = (data.output || []).flatMap(x => x.content || []).filter(x => x.type === 'output_text').map(x => x.text).join('\n').trim();
    if (!answer) return json(res,502,{error:'Sem resposta da IA'});
    return json(res,200,{text:answer,apps:suggestApps(message),mode:'Spark IA · online'});
  } catch (error) {
    console.error('Falha IA:',error.message);
    return json(res,400,{error:'Não foi possível processar a solicitação.'});
  }
}
async function serveFile(req, res, root, relative, isShell) {
  let target;
  try { target = path.resolve(root, relative || 'index.html'); } catch { return json(res,400,{error:'Endereço inválido'}); }
  if (!(target === root || target.startsWith(root + path.sep))) return json(res,403,{error:'Acesso negado'});
  try {
    let info = await stat(target);
    if (info.isDirectory()) { target = path.join(target,'index.html'); info = await stat(target); }
    if (!info.isFile()) throw new Error('not file');
    const buffer = await readFile(target), ext = path.extname(target).toLowerCase();
    const headers = {
      'Content-Type':MIME[ext] || 'application/octet-stream',
      'Content-Length':buffer.length,
      'Cache-Control':['.html','.htm','.js','.mjs','.css','.json','.webmanifest'].includes(ext) ? 'no-cache' : 'public, max-age=86400',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'strict-origin-when-cross-origin',
      'Permissions-Policy':'camera=(self), microphone=(self), geolocation=(self)'
    };
    if (isShell) {
      headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self' https://sparkbr.online; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";
    }
    res.writeHead(200,headers);
    if (req.method === 'HEAD') return res.end();
    return res.end(buffer);
  } catch {
    return json(res,404,{error:'Arquivo não encontrado'});
  }
}
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  if (url.pathname === '/navegador') { res.writeHead(301,{Location:prefix}); return res.end(); }
  if (url.pathname === prefix + 'api/status') return json(res,200,{ok:true,iaOnline:!!process.env.OPENAI_API_KEY,ecosystem:true,version:'2.1.0'});
  if (url.pathname === prefix + 'api/ai/chat') {
    if (req.method !== 'POST') return json(res,405,{error:'Use POST'});
    return askAI(req,res);
  }
  if (url.pathname.startsWith(prefix + 'api/ecosystem')) {
    const handled = await ecosystem(req,res,url);
    if (handled) return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res,405,{error:'Método não permitido'});
  if (url.pathname.startsWith(prefix)) {
    let relative;
    try { relative = decodeURIComponent(url.pathname.slice(prefix.length)); } catch { return json(res,400,{error:'Endereço inválido'}); }
    if (!relative) relative = 'index.html';
    return serveFile(req,res,shellRoot,relative,true);
  }
  let relative;
  try { relative = decodeURIComponent(url.pathname.replace(/^\/+/,'')); } catch { return json(res,400,{error:'Endereço inválido'}); }
  if (!relative || url.pathname.endsWith('/')) relative = path.join(relative,'index.html');
  return serveFile(req,res,publicRoot,relative,false);
});
server.listen(port,() => console.log('SparkBR 2.1 em http://localhost:' + port + ' — site público + navegador + ecossistema'));
