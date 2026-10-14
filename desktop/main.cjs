/** SparkBR Desktop — shell Chromium/Electron.
 * Protótipo de navegação com abas. Não substitui as proteções avançadas de
 * um navegador maduro (anti-phishing, perfis isolados, atualização automática etc.). */
'use strict';
const {app,BrowserWindow,ipcMain,shell,session,dialog}=require('electron');
const path=require('node:path');
const START_URL=process.env.SPARK_START_URL||'https://sparkbr.online/';
const REMOTE_AI='https://sparkbr.online/spark-api/ia/chat';
let mainWindow;
let authWindow=null;
function isGoogleAuth(url){try{const u=new URL(url);return u.protocol==='https:'&&(u.hostname==='accounts.google.com'||u.hostname.endsWith('.accounts.google.com'))}catch{return false}}
function openAuthWindow(url){ /* LOGIN-GOOGLE: popup do Google em janela propria com UA Chrome */
  try{
    if(authWindow&&!authWindow.isDestroyed()){authWindow.loadURL(url);authWindow.focus();return}
    authWindow=new BrowserWindow({parent:mainWindow,modal:false,width:520,height:700,minWidth:400,minHeight:500,autoHideMenuBar:true,title:'Entrar com o Google',backgroundColor:'#ffffff',webPreferences:{partition:'persist:sparkbr-apps',nodeIntegration:false,contextIsolation:true,sandbox:true}});
    try{authWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36')}catch{}
    const done=(url2)=>{try{const u=new URL(url2);if(u.hostname==='sparkbr.online'){setTimeout(()=>{try{authWindow&&!authWindow.isDestroyed()&&authWindow.close()}catch{};try{mainWindow&&!mainWindow.isDestroyed()&&mainWindow.webContents.reload()}catch{}},800)}}catch{}};
    authWindow.webContents.on('did-navigate',(_e,url2)=>done(url2));
    authWindow.webContents.on('did-redirect-navigation',(_e,url2)=>done(url2));
    authWindow.on('closed',()=>{authWindow=null;try{mainWindow&&!mainWindow.isDestroyed()&&mainWindow.webContents.reload()}catch{}});
    authWindow.loadURL(url);
  }catch{}
}
function securePermission(wc,permission,cb,details){
  let origin;try{origin=new URL(details?.requestingUrl||wc.getURL())}catch{return cb(false)}
  if(origin.protocol!=='https:'||origin.hostname!=='sparkbr.online')return cb(false);
  const labels={media:'câmera ou microfone',geolocation:'localização',notifications:'notificações'};
  if(!labels[permission])return cb(false);
  dialog.showMessageBox(mainWindow,{type:'question',buttons:['Não permitir','Permitir uma vez'],defaultId:0,cancelId:0,title:'Permissão do SparkBR',message:`Permitir ${labels[permission]} para ${origin.hostname}?`,detail:'Ative apenas quando um aplicativo precisar deste recurso.'}).then(r=>cb(r.response===1)).catch(()=>cb(false));
}
function createWindow(){
  app.on('web-contents-created',(_event,contents)=>{
    contents.on('will-attach-webview',(event,preferences,params)=>{
      delete preferences.preload;
      preferences.nodeIntegration=false;
      preferences.contextIsolation=true;
      preferences.sandbox=true;
      preferences.webSecurity=true;
      // HTTPS em produção; HTTP é permitido apenas para localhost em modo de desenvolvimento.
      let url;try{url=new URL(params.src)}catch{event.preventDefault();return}
      const localDev=!!process.env.SPARK_START_URL&&url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname);
      if(url.protocol!=='https:'&&!localDev)event.preventDefault();
    });
    contents.on('will-navigate',(event,url)=>{try{if(contents.getType()==='webview'){const u=new URL(url);const localDev=!!process.env.SPARK_START_URL&&u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname);if(u.protocol!=='https:'&&!localDev)event.preventDefault()}}catch{event.preventDefault()}});
    contents.setWindowOpenHandler(({url})=>{
      try{
        if(isGoogleAuth(url)){openAuthWindow(url);return{action:'deny'}}
        const u=new URL(url);if(u.protocol==='https:')shell.openExternal(u.href)}catch{}
      return{action:'deny'};
    });
  });
  mainWindow=new BrowserWindow({title:'SparkBR — navegador da família',width:1450,height:920,minWidth:900,minHeight:620,backgroundColor:'#f7f8f5',icon:path.join(__dirname,'../site/assets/icon-512.png'),autoHideMenuBar:true,webPreferences:{partition:'persist:sparkbr-apps',preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,webviewTag:true}});
  mainWindow.loadURL(START_URL);
  mainWindow.on('closed',()=>{mainWindow=null});
}
app.whenReady().then(()=>{
  // EXE221-STRIP: remove travas de incorporacao p/ navegar 100% dentro do app
  try{
    const strip=(details,callback)=>{
      try{
        const h={...details.responseHeaders};
        Object.keys(h).forEach(k=>{
          const kl=String(k).toLowerCase();
          if(kl==='x-frame-options'||kl==='content-security-policy')delete h[k];
        });
        callback({cancel:false,responseHeaders:h});
      }catch{callback({});}
    };
    session.defaultSession.webRequest.onHeadersReceived({urls:['https://*/*','http://localhost/*','http://127.0.0.1/*']},strip);
    session.fromPartition('persist:sparkbr-apps').webRequest.onHeadersReceived({urls:['https://*/*','http://localhost/*','http://127.0.0.1/*']},strip);
  }catch{}
  session.defaultSession.setPermissionRequestHandler(securePermission);
  session.fromPartition('persist:sparkbr-apps').setPermissionRequestHandler(securePermission);
  createWindow();
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
function authorized(event){return mainWindow&&!mainWindow.isDestroyed()&&event.sender===mainWindow.webContents}
ipcMain.handle('spark:open-external',async(event,url)=>{if(!authorized(event))return false;try{const u=new URL(url);if(u.protocol==='https:'&&u.href.length<2000){await shell.openExternal(u.href);return true}}catch{}return false});
ipcMain.handle('spark:ask-ai',async(event,message)=>{if(!authorized(event))throw Error('Acesso negado');if(typeof message!=='string'||message.length>2000||message.trim().length<2)throw Error('Mensagem inválida');const url=process.env.SPARK_API_URL||REMOTE_AI;const u=new URL(url);if(u.protocol!=='https:')throw Error('Endpoint HTTPS obrigatório');const response=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message}),signal:AbortSignal.timeout(16000)});if(!response.ok)throw Error('IA offline');const data=await response.json();return {text:String(data.text||'').slice(0,5000),apps:Array.isArray(data.apps)?data.apps.slice(0,5):[],mode:'Spark IA · online'}});
