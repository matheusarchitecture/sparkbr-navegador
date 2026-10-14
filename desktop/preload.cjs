'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('sparkDesktop',Object.freeze({
  version:'2.0.0',
  askAI:(message)=>ipcRenderer.invoke('spark:ask-ai',String(message).slice(0,2000)),
  openExternal:(url)=>ipcRenderer.invoke('spark:open-external',String(url).slice(0,2000))
}));
