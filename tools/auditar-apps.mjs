/** Executar na VPS: node tools/auditar-apps.mjs
 * Verifica somente a disponibilidade HTTP das 23 rotas inferidas do HTML Claude.
 * 200 não prova que a aplicação correta está naquela rota.
 */
import {readFile,writeFile} from 'node:fs/promises';
const apps=JSON.parse(await readFile(new URL('../site/apps.json',import.meta.url),'utf8'));
const origin=process.env.SPARK_APPS_ORIGIN||'https://sparkbr.online';
const result=[];
for(const app of apps){const url=new URL('/'+app.id+'/',origin).href;let status='erro',finalUrl=url,error='';try{const res=await fetch(url,{method:'GET',redirect:'follow',signal:AbortSignal.timeout(9000),headers:{'User-Agent':'SparkBR-Route-Audit/2.0'}});status=res.status;finalUrl=res.url;await res.body?.cancel()}catch(e){error=String(e.message).slice(0,120)}const item={app:app.name,url,httpStatus:status,finalUrl,error};result.push(item);console.log(`${String(status).padEnd(5)} ${app.name.padEnd(24)} ${url}${error?' | '+error:''}`)}
await writeFile(new URL('../relatorio-rotas.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),origin,result},null,2));
console.log('Relatório salvo: relatorio-rotas.json. CONFIRA MANUALMENTE os redirecionamentos e o conteúdo.');
