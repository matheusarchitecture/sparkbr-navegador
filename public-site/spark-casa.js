/* SPARK-CASA v1: helpers compartilhados dos apps da casa. Sem dependencias. */
(function(){
"use strict";
var S = window.SparkCasa = window.SparkCasa || {};
S.get = function(k, d){ try{ var v = localStorage.getItem("casa:"+k); return v==null?d:JSON.parse(v); }catch(e){ return d; } };
S.set = function(k, v){ try{ localStorage.setItem("casa:"+k, JSON.stringify(v)); }catch(e){} };
S.esc = function(s){ try{ return String(s==null?"":s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }catch(e){ return ""; } };
S.brl = function(v){ try{ return Number(v||0).toFixed(2).replace(".", ","); }catch(e){ return "0,00"; } };
S.num = function(t){ try{ var m = String(t||"").replace(/\./g,"").replace(",", ".").match(/(\d+(?:\.\d+)?)/); return m?parseFloat(m[1]):0; }catch(e){ return 0; } };
S.today = function(){ try{ var d=new Date(); return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2); }catch(e){ return ""; } };
S.uid = function(){ return "id"+Date.now().toString(36)+Math.floor(Math.random()*9999); };
S.toast = function(t){ try{ var d=document.getElementById("casa-toast"); if(!d){ d=document.createElement("div"); d.id="casa-toast"; d.style.cssText="position:fixed;left:50%;bottom:110px;transform:translateX(-50%);background:#0f172a;color:#fff;font-size:13px;font-weight:700;padding:10px 16px;border-radius:12px;z-index:99999;max-width:88vw;text-align:center;border:1px solid #334155;"; document.body.appendChild(d);} d.textContent=String(t==null?"":t); d.style.display="block"; if(d._t)clearTimeout(d._t); d._t=setTimeout(function(){ try{d.style.display="none";}catch(_){} },3000);}catch(e){} };
S.token = function(){ try{ return localStorage.getItem("spark_token")||""; }catch(e){ return ""; } };
S.shareZap = function(texto){ try{ var u="https://wa.me/?text="+encodeURIComponent(texto); window.open(u,"_blank"); }catch(e){} };
S.postDespesa = function(cat, desc, valor, cb){ try{
  var tk=S.token(); if(!tk){ if(cb)cb(false,"sem login"); return; }
  fetch("/spark-api/despesas",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+tk},body:JSON.stringify({categoria:cat,descricao:desc,valor:valor})}).then(function(r){return r.json();}).then(function(j){ if(cb)cb(!!(j&&j.ok)); }).catch(function(){ if(cb)cb(false); });
}catch(e){ if(cb)cb(false); } };
S.addMercado = function(itens, cb){ try{
  var tk=S.token();
  function done(ok){ if(cb)cb(ok); }
  if(!tk){ S.set("pend-mercado", itens); location.href="/spark/"; return; }
  fetch("/spark-api/minha-lista?app=spark",{headers:{"Authorization":"Bearer "+tk},cache:"no-store"}).then(function(r){return r.json();}).then(function(g){
    var cur=(g&&g.itens)||[];
    itens.forEach(function(n){ cur.push({nome:n,qtd:1,unit:"un",basePrice:0,checked:false,ean:"",precoReal:null}); });
    if(cur.length>500)cur=cur.slice(0,500);
    return fetch("/spark-api/minha-lista?app=spark",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+tk},body:JSON.stringify({itens:cur,app:"spark",ts:0})});
  }).then(function(r){return r.json();}).then(function(sj){ done(!!(sj&&sj.ok)); }).catch(function(){ done(false); });
}catch(e){ if(cb)cb(false); } };
/* streak com perdao: falta 1 dia nao quebra (congela 1x/semana) */
S.streakTouch = function(ns){
  try{
    var t=S.today(), st=S.get("streak:"+ns,{last:"",dias:0,freezeWk:""});
    var wk=(function(){var d=new Date();var o=new Date(d.getFullYear(),0,1);return d.getFullYear()+"-"+Math.ceil((((d-o)/864e5)+o.getDay()+1)/7);})();
    if(st.last===t) return st;
    var y=(function(){var d=new Date(Date.now()-864e5);return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);})();
    if(st.last===y){ st.dias=(st.dias||0)+1; }
    else if(!st.last){ st.dias=1; }
    else {
      var gap=0; try{ gap=Math.round((new Date(t)-new Date(st.last))/864e5); }catch(_){ gap=99; }
      if(gap===2 && st.freezeWk!==wk){ st.freezeWk=wk; /* congela: mantem dias */ }
      else st.dias=1;
    }
    st.last=t; S.set("streak:"+ns,st); return st;
  }catch(e){ return {last:"",dias:0}; }
};
S.streakGet = function(ns){ return S.get("streak:"+ns,{last:"",dias:0}); };
/* voz: segure o botao e fale (usa transcricao do Spark) */
S.holdMic = function(btn, cb){
  try{
    var rec=null, chunks=[], holding=false;
    function mime(){ try{ var c=["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus"]; for(var i=0;i<c.length;i++){ try{ if(window.MediaRecorder&&MediaRecorder.isTypeSupported(c[i]))return c[i]; }catch(_){}} }catch(e){} return ""; }
    btn.addEventListener("pointerdown", function(ev){ try{ev.preventDefault();}catch(_){}
      holding=true; chunks=[]; S.toast("Ouvindo... solte para enviar.");
      navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
        if(!holding) return;
        var m=mime(); rec=m?new MediaRecorder(stream,{mimeType:m}):new MediaRecorder(stream);
        rec.ondataavailable=function(e){ try{ if(e.data&&e.data.size)chunks.push(e.data); }catch(_){} };
        rec.onstop=function(){ envia(); };
        rec.start(); btn.textContent="🔴";
      }).catch(function(){ holding=false; S.toast("Microfone bloqueado. Libere no cadeado."); });
    });
    function fim(){ if(!holding)return; holding=false; btn.textContent="🎤"; try{ if(rec&&rec.state!=="inactive")rec.stop(); else envia(); }catch(_){} }
    btn.addEventListener("pointerup", fim);
    btn.addEventListener("pointerleave", function(){ try{fim();}catch(_){} });
    function envia(){
      try{
        if(!chunks.length){ S.toast("Nada gravado. Segure e fale."); return; }
        var blob=new Blob(chunks,{type:(rec&&rec.mimeType)||"audio/webm"});
        if(blob.size<8000){ S.toast("Audio curto: segure e fale 2 segundos."); return; }
        var ext="webm"; try{ var mt=(rec&&rec.mimeType)||""; if(mt.indexOf("mp4")>=0)ext="m4a"; else if(mt.indexOf("ogg")>=0)ext="ogg"; }catch(_){}
        S.toast("Transcrevendo...");
        fetch("/spark-api/ia/transcrever?ext="+ext,{method:"POST",headers:{"Content-Type":blob.type||"audio/webm"},body:blob}).then(function(r){return r.json();}).then(function(j){
          if(j&&j.ok&&j.texto){ cb(j.texto); } else S.toast("Nao entendi. Fale de novo.");
        }).catch(function(){ S.toast("Falha de rede no audio."); });
      }catch(e){}
    }
  }catch(e){}
};
/* v2: dados da conta + familia + despensa + financeiro (com cache, sem login = null) */
S.apiGet = function(path, cb){ try{
  var tk=S.token();
  var h=tk?{"Authorization":"Bearer "+tk}:{};
  fetch(path,{headers:h,cache:"no-store"}).then(function(r){return r.json();}).then(function(j){ cb(j); }).catch(function(){ cb(null); });
}catch(e){ cb(null); } };
S.cached = function(key, ms, fn, cb){ try{
  var c=S.get("cache:"+key,null), now=Date.now();
  if(c&&c.exp>now){ cb(c.data); return; }
  fn(function(data){ try{ S.set("cache:"+key,{exp:now+ms,data:data}); }catch(e){} cb(data); });
}catch(e){ cb(null); } };
S.perfil = function(cb){ S.cached("perfil",600000,function(done){ S.apiGet("/spark-api/perfil",function(j){ done(j&&j.ok?j.perfil:null); }); },cb); };
S.familia = function(cb){ S.cached("familia",600000,function(done){ S.apiGet("/spark-api/familia/membros",function(j){ done(j&&j.ok?j.membros:null); }); },cb); };
S.validades = function(cb){ S.cached("validades",300000,function(done){ S.apiGet("/spark-api/validades",function(j){ done(j&&j.ok?j.validades:null); }); },cb); };
S.despesas = function(cb){ S.cached("despesas",300000,function(done){ S.apiGet("/spark-api/despesas",function(j){ done(j&&j.ok?j.despesas:null); }); },cb); };
S.gastoMes = function(cat, cb){ S.despesas(function(arr){
  try{
    var m=(function(){var d=new Date();return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2);})();
    var tot=0;
    (arr||[]).forEach(function(x){
      try{
        var dx=new Date((x.criado||0)*1000), mk=dx.getFullYear()+"-"+("0"+(dx.getMonth()+1)).slice(-2);
        if(mk===m&&(!cat||x.categoria===cat)) tot+=Number(x.valor||0);
      }catch(e){}
    });
    cb(tot);
  }catch(e){ cb(0); }
}); };
})();
window.S = window.SparkCasa;
