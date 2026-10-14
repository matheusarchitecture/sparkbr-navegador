/* spark conta v1 - login + minha-lista + excluir + qtd + exemplo + tour. Mesmo padrao visual, nada do layout muda. */
(function () {
  'use strict';
  if (window._sparkConta) return; window._sparkConta = true;
  var API = '/spark-api';
  var APP = window.SPARK_APP || 'spark';
  var LS_TK = 'spark_token', LS_USER = 'spark_user';
  window.SPARK_GOOGLE_ID = window.SPARK_GOOGLE_ID || '';
  var EXEMPLO = [
    { id: 1, name: 'Leite Integral Piracanjuba 1L', qty: 2, unit: 'cx', basePrice: 4.89, checked: false, ean: '7898215150012' },
    { id: 2, name: 'Café Torrado Pilão Tradicional 500g', qty: 1, unit: 'pct', basePrice: 18.90, checked: false, ean: '7891000245100' },
    { id: 3, name: 'Arroz Branco Tio João Tipo 1 5kg', qty: 1, unit: 'pct', basePrice: 28.50, checked: false, ean: '7896006711102' },
    { id: 4, name: 'Manteiga com Sal Aviação 200g', qty: 1, unit: 'pote', basePrice: 14.50, checked: false, ean: '7896084700010' },
    { id: 5, name: 'Sabão em Pó OMO Lavagem Perfeita 1.6kg', qty: 1, unit: 'cx', basePrice: 21.90, checked: false, ean: '7891150047321' },
    { id: 6, name: 'Ovos Brancos Mantiqueira c/ 20 un', qty: 1, unit: 'bandeja', basePrice: 15.90, checked: false, ean: '7898912301099' }
  ];
  function esc(s) { try { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); } catch (_) { return ''; } }
  function ST() { try { return state; } catch (_) { try { return window.state; } catch (_) { return null; } } }
  function tk() { try { return localStorage.getItem(LS_TK) || ''; } catch (_) { return ''; } }
  function api(path, body, method) {
    var opt = { method: method || (body === undefined ? 'GET' : 'POST'), cache: 'no-store', headers: {} };
    if (tk()) opt.headers['Authorization'] = 'Bearer ' + tk();
    if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    return fetch(API + path, opt).then(function (r) { return r.json().then(function (j) { return { st: r.status, j: j }; }); });
  }
  /* ---------- sync PERSISTENTE v2 (selecao+preco+mercado, backup local, flush) ---------- */
  var syncT = null, listaPronta = false;
  var LS_BAK = 'spark_lista_' + APP, LS_MKT = 'spark_market_' + APP;
  function getMult() { try { var st = ST(); return (st.markets[st.activeMarket] || {}).multiplier || 1; } catch (_) { return 1; } }
  function snap() {
    try {
      var st = ST(); if (!st) return [];
      return (st.items || []).map(function (x) { var pr = parseFloat(x.precoReal); return { nome: x.name, qtd: x.qty, unit: x.unit || 'un', basePrice: Math.round((parseFloat(x.basePrice) || 0) * 100) / 100, checked: !!x.checked, ean: x.ean || '', precoReal: (x.precoReal != null && !isNaN(pr)) ? Math.round(pr * 100) / 100 : null }; });
    } catch (_) { return []; }
  }
  function saveLocal() {
    try {
      var st = ST(); if (!st) return;
      localStorage.setItem(LS_BAK, JSON.stringify({ itens: snap(), ts: Math.floor(Date.now() / 1000) }));
      try { localStorage.setItem(LS_MKT, st.activeMarket); } catch (_) {}
    } catch (_) {}
  }
  function loadLocal() { try { var j = JSON.parse(localStorage.getItem(LS_BAK) || 'null'); return (j && j.itens) || []; } catch (_) { return []; } }
  function restauraMarket() {
    try {
      var st = ST(); if (!st) return;
      var m = null; try { m = localStorage.getItem(LS_MKT); } catch (_) {}
      if (m && st.markets && st.markets[m]) {
        st.activeMarket = m;
        try { document.querySelectorAll('.market-chip').forEach(function (c) { c.classList.remove('active'); }); } catch (_) {}
      }
    } catch (_) {}
  }
  window._listaTs = 0;
  function enviaAgora() {
    try {
      if (!tk() || !listaPronta) return;
      api('/minha-lista?app=' + APP, { itens: snap(), app: APP, ts: window._listaTs || 0 }).then(function (rr) {
        try {
          if (rr && rr.j && rr.j.ok && window.SparkBR && window.SparkBR.ecosystem && window.SparkBR.ecosystem.syncShopping) {
            window.SparkBR.ecosystem.syncShopping(snap()).catch(function () {});
          }
        } catch (_) {}
        try {
          if (rr && rr.j && rr.j.atualizado) { try { window._listaTs = parseFloat(rr.j.atualizado) || window._listaTs; } catch (_) {} }
          if (rr && rr.j && rr.j.kept) setTimeout(function () { try { window.sparkResolveConflict(); } catch (_) {} }, 800);
        } catch (_) {}
      }).catch(function () {});
    } catch (_) {}
  }
  window.sparkSync = function (agora) {
    try { saveLocal(); } catch (_) {}
    if (!tk() || !listaPronta) return;
    try { if (syncT) clearTimeout(syncT); } catch (_) {}
    if (agora) { try { enviaAgora(); } catch (_) {} return; }
    syncT = setTimeout(function () { try { enviaAgora(); } catch (_) {} }, 600);
  };
  window.sparkSyncFlush = function () { try { if (syncT) clearTimeout(syncT); } catch (_) {} try { saveLocal(); } catch (_) {} try { enviaAgora(); } catch (_) {} };
  function sparkMapSrv(itens) {
    var n = Date.now();
    return (itens || []).map(function (x, i) { var _p = parseFloat(x.precoReal); return { id: n + i, name: x.nome, qty: x.qtd || 1, unit: x.unit || 'un', basePrice: parseFloat(x.basePrice) || 0, checked: !!x.checked, ean: x.ean || '', precoReal: (x.precoReal != null && !isNaN(_p)) ? _p : null }; });
  }
  window.sparkResolveConflict = function () {
    try {
      api('/minha-lista?app=' + APP, undefined, 'GET').then(function (r) {
        try {
          if (!(r.st === 200 && r.j.ok)) return;
          var srv = r.j.itens || [];
          var srvTs = parseFloat(r.j.atualizado) || 0;
          var bak = null;
          try { bak = JSON.parse(localStorage.getItem(LS_BAK) || 'null'); } catch (_) {}
          var bakTs = (bak && bak.ts) || 0; try { if (bakTs > 4102444800) bakTs = bakTs / 1000; } catch (_) {}
          var st = ST(); if (!st) return;
          if (bakTs + 30 >= srvTs) {
            var seen = {};
            srv.forEach(function (x) { seen[String(x.nome || '').toLowerCase()] = true; });
            var merged = []; try { srv.forEach(function (x) { if (!isDel(x.nome)) merged.push(x); }); } catch (_) {}
            (st.items || []).forEach(function (x) {
              var k = String(x.name || '').toLowerCase();
              if (k && !seen[k]) { merged.push({ nome: x.name, qtd: x.qty, unit: x.unit || 'un', basePrice: x.basePrice || 0, checked: !!x.checked, ean: x.ean || '', precoReal: (x.precoReal != null ? x.precoReal : null) }); seen[k] = true; }
            });
            window._listaTs = srvTs;
            try { api('/minha-lista?app=' + APP, { itens: merged, app: APP, ts: srvTs }); } catch (_) {}
            st.items = sparkMapSrv(merged);
            renderPlus(); if (window.updateKPIs) window.updateKPIs();
          } else {
            st.items = sparkMapSrv(srv);
            window._listaTs = srvTs;
            try { restauraMarket(); } catch (_) {}
            renderPlus(); if (window.updateKPIs) window.updateKPIs();
            try { saveLocal(); } catch (_) {}
          }
        } catch (_) {}
      }).catch(function () {});
    } catch (_) {}
  };
  /* ---------- render com excluir + qtd (mesmo markup) ---------- */
  function renderPlus() {
    try {
      var container = document.getElementById('shopping-list-items');
      var st = ST();      if (!container || !st) return;
      var mult = st.markets[st.activeMarket].multiplier;
      container.innerHTML = st.items.map(function (item) {
        var _pr = parseFloat(item.precoReal);
        var _eff = (item.precoReal != null && !isNaN(_pr)) ? _pr : (item.basePrice * mult);
        var itemPrice = (_eff * item.qty).toFixed(2).replace('.', ',');
        var unitPrice = (_eff).toFixed(2).replace('.', ',');
        return '' +
          '<div class="list-item">' +
          '<div class="item-left">' +
          '<div class="item-checkbox ' + (item.checked ? 'checked' : '') + '" onclick="toggleCheck(' + item.id + ')">' + (item.checked ? '✓' : '') + '</div>' +
          '<div class="item-info">' +
          '<span class="item-name ' + (item.checked ? 'checked' : '') + '" onclick="sparkRename(' + item.id + ')" style="cursor:pointer" title="Toque p/ renomear">' + esc(item.name) + '</span>' +
          '<span class="item-meta"><span>' + esc(item.qty) + ' ' + esc(item.unit) + '</span><span>•</span><span>R$ ' + unitPrice + '/' + esc(item.unit) + '</span></span>' +
          '</div></div>' +
          '<div style="display:flex;align-items:center;gap:4px">' +
          '<button onclick="sparkQty(' + item.id + ',-1)" style="border:1px solid #e2e8f0;background:#fff;border-radius:8px;min-width:26px;height:26px;font-size:14px;line-height:1">−</button>' +
          '<button onclick="sparkQty(' + item.id + ',1)" style="border:1px solid #e2e8f0;background:#fff;border-radius:8px;min-width:26px;height:26px;font-size:14px;line-height:1">+</button>' +
          '<button onclick="sparkDel(' + item.id + ')" style="border:1px solid #fecaca;background:#fff;border-radius:8px;min-width:26px;height:26px;font-size:12px;line-height:1">🗑</button>' +
          '<div class="item-price" onclick="sparkPrice(' + item.id + ')" style="cursor:pointer" title="Toque p/ corrigir o pre\u00e7o">R$ ' + itemPrice + '</div>' +
          '</div></div>';
      }).join('');
    } catch (_) {}
    try { saveLocal(); } catch (_) {}
    try { window.sparkSync(); } catch (_) {}
    try { document.dispatchEvent(new Event('spark-list')); } catch (_) {}
  }
  var LS_DEL = 'spark_del_' + APP;
  function delTomb(nome) {
    try {
      var a = []; try { a = JSON.parse(localStorage.getItem(LS_DEL) || '[]'); } catch (_) {}
      if (!Array.isArray(a)) a = [];
      a.push({ n: String(nome || '').toLowerCase(), ts: Date.now() / 1000 });
      var cut = Date.now() / 1000 - 7 * 86400;
      a = a.filter(function (x) { return x && x.ts > cut; }).slice(-200);
      localStorage.setItem(LS_DEL, JSON.stringify(a));
    } catch (_) {}
  }
  function isDel(nome) {
    try {
      var a = JSON.parse(localStorage.getItem(LS_DEL) || '[]');
      if (!Array.isArray(a)) return false;
      var k = String(nome || '').toLowerCase();
      var cut = Date.now() / 1000 - 7 * 86400;
      for (var i = 0; i < a.length; i++) { if (a[i] && a[i].n === k && a[i].ts > cut) return true; }
    } catch (_) {}
    return false;
  }
  window.sparkDel = function (id) {
    try {
      var st = ST(); if (!st) return;
      try { st.items.forEach(function (i) { if (i.id === id) delTomb(i.name); }); } catch (_) {}
      st.items = st.items.filter(function (i) { return i.id !== id; });
      renderPlus(); if (window.updateKPIs) window.updateKPIs();
      try { window.sparkSync(true); } catch (_) {}
    } catch (_) {}
  };
  window.sparkQty = function (id, d) {
    try {
      var st = ST(); if (!st) return;
      var it = null;
      st.items.forEach(function (i) { if (i.id === id) it = i; });
      if (!it) return;
      it.qty = Math.max(1, (parseFloat(it.qty) || 1) + d);
      renderPlus(); if (window.updateKPIs) window.updateKPIs();
      try { window.sparkSync(); } catch (_) {}
    } catch (_) {}
  };
  window.sparkPrice = function (id) {
    try {
      var st = ST(); if (!st) return;
      var it = null;
      st.items.forEach(function (i) { if (i.id === id) it = i; });
      if (!it) return;
      var cur = String(it.basePrice).replace('.', ',');
      var v = prompt('Pre\u00e7o pago por ' + it.name + ':', cur);
      if (v === null || v === undefined) return;
      v = parseFloat(String(v).replace('R$', '').replace(',', '.').trim());
      if (isNaN(v) || v < 0 || v > 99999) return;
      var mult = 1; try { mult = getMult(); } catch (_) { mult = 1; }
      if (!(mult > 0)) mult = 1;
      it.basePrice = Math.round((v / mult) * 100) / 100;
      it.precoReal = Math.round(v * 100) / 100;
      renderPlus(); if (window.updateKPIs) window.updateKPIs();
      try { window.sparkSync(true); } catch (_) {}
    } catch (_) {}
  };
  window.sparkRename = function (id) {
    try {
      var st = ST(); if (!st) return;
      var it = null;
      st.items.forEach(function (i) { if (i.id === id) it = i; });
      if (!it) return;
      var v = prompt('Renomear item:', it.name);
      if (v === null || v === undefined) return;
      v = String(v).trim().slice(0, 80);
      if (v.length < 2) return;
      it.name = v;
      renderPlus(); if (window.updateKPIs) window.updateKPIs();
      try { window.sparkSync(true); } catch (_) {}
    } catch (_) {}
  };
  window.instalaRenderPlus = function () {
    try {
      if (window.renderShoppingList && !window._renderPlusOn) {
        window._renderOrig = window.renderShoppingList;
        window.renderShoppingList = renderPlus;
        window._renderPlusOn = true;
      }
      if (window._renderPlusOn) renderPlus();
    } catch (_) {}
  };
  try {
    window.instalaRenderPlus();
    window.addEventListener('DOMContentLoaded', window.instalaRenderPlus);
    window.addEventListener('load', window.instalaRenderPlus);
  } catch (_) {}
  /* ---------- exemplo ---------- */
  window.sparkExemplo = function () {
    try {
      var st = ST(); if (!st) return;
      var n = Date.now();
      st.items = (window.SPARK_EXEMPLO || EXEMPLO).map(function (x, i) { return { id: n + i, name: x.name, qty: x.qty, unit: x.unit, basePrice: x.basePrice, checked: false, ean: x.ean }; });
      renderPlus(); if (window.updateKPIs) window.updateKPIs();
      var b = document.getElementById('spark-ex-banner'); if (b) b.style.display = 'none';
    } catch (_) {}
  };
  function bannerEx() {
    try {
      if (document.getElementById('spark-ex-banner')) return;
      var host = document.getElementById('tab-lista') || document.body;
      var d = document.createElement('div');
      d.id = 'spark-ex-banner';
      d.innerHTML = '<div style="border:1px dashed #93c5fd;background:#eff6ff;border-radius:12px;padding:10px;margin:8px;font-size:12px;color:#1e40af">Sua lista começa <b>vazia</b>. Toque em <b>Ver exemplo</b> pra aprender, ou fale/digite os itens.<div style="margin-top:8px;display:flex;gap:6px"><button onclick="sparkExemplo()" style="flex:1;background:#0284c7;color:#fff;border:none;border-radius:8px;padding:8px;font-weight:700">Ver exemplo</button><button onclick="sparkTour(true)" style="flex:1;background:#fff;border:1px solid #93c5fd;border-radius:8px;padding:8px">Passo a passo</button></div></div>';
      host.insertBefore(d, host.firstChild);
    } catch (_) {}
  }
  /* ---------- tour passo a passo (override por app via window.SPARK_TOUR) ---------- */
  var TOUR = window.SPARK_TOUR || [
    { t: 'Passo 1 de 4 — Fale ou digite', d: 'Segure o microfone e fale a lista ("2kg de arroz e leite") ou digite no campo rápido. A IA entende sozinha.' },
    { t: 'Passo 2 de 4 — Agente otimiza', d: 'Toque em Agente otimizar: ele cruza sua lista com preços médios reais e mostra onde fica mais barato.' },
    { t: 'Passo 3 de 4 — Onde comprar', d: 'Veja mercados perto de você, com distância e preço médio de cada item. Toque em preço médio pra conferir.' },
    { t: 'Passo 4 de 4 — Leve e compartilhe', d: 'Gere o PDF, imprima, mande no WhatsApp ou mostre o QR no caixa. Sua lista fica salva na sua conta.' }
  ];
  window.sparkTour = function (force) {
    try {
      var k = 'spark_tour_' + ((JSON.parse(localStorage.getItem(LS_USER) || '{}').id) || 'anon');
      if (!force) { try { if (localStorage.getItem(k)) return; } catch (_) {} }
      var i = 0;
      var ov = document.createElement('div');
      ov.id = 'spark-tour';
      function draw() {
        ov.innerHTML = '<div style="position:fixed;inset:0;background:rgba(2,6,23,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px" id="spark-tour-bg"><div style="background:#fff;border-radius:16px;padding:18px;max-width:340px;width:100%"><div style="font-weight:800;font-size:14px">' + TOUR[i].t + '</div><div style="font-size:12px;color:#475569;margin:8px 0 12px">' + TOUR[i].d + '</div><div style="display:flex;gap:6px"><button id="spark-tour-no" style="flex:1;background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:10px">Pular</button><button id="spark-tour-ok" style="flex:2;background:#0284c7;color:#fff;border:none;border-radius:8px;padding:10px;font-weight:700">' + (i === TOUR.length - 1 ? 'Começar' : 'Próximo') + '</button></div></div></div>';
        document.getElementById('spark-tour-ok').onclick = function () { i++; if (i >= TOUR.length) { close(); } else draw(); };
        document.getElementById('spark-tour-no').onclick = close;
      }
      function close() { try { localStorage.setItem(k, '1'); } catch (_) {} try { ov.remove(); } catch (_) {} }
      document.body.appendChild(ov); draw();
    } catch (_) {}
  };
  /* ---------- conta modal ---------- */
  function modal(html) {
    try { var o = document.getElementById('spark-conta-ov'); if (o) o.remove(); } catch (_) {}
    var ov = document.createElement('div'); ov.id = 'spark-conta-ov';
    ov.innerHTML = '<div style="position:fixed;inset:0;background:rgba(2,6,23,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px"><div style="background:#fff;border-radius:16px;padding:18px;max-width:340px;width:100%;max-height:88vh;overflow:auto">' + html + '</div></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov.firstChild) closeModal(); });
    document.body.appendChild(ov);
  }
  window.sparkContaFechar = function () { try { document.getElementById('spark-conta-ov').remove(); } catch (_) {} };
  function closeModal() { window.sparkContaFechar(); }
  function telaLogin(msg) {
    modal('<div style="font-weight:800;font-size:15px">👤 Minha conta</div>' +
      (msg ? '<div style="font-size:12px;color:#b91c1c;margin-top:6px">' + esc(msg) + '</div>' : '') +
      '<div id="spark-gbtn" style="margin-top:10px"></div>' +
      '<input id="sc-email" type="email" placeholder="Seu e-mail" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-top:8px;font-size:13px">' +
      '<input id="sc-senha" type="password" placeholder="Senha" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-top:8px;font-size:13px">' +
      '<button onclick="sparkDoLogin()" style="width:100%;background:#0284c7;color:#fff;border:none;border-radius:8px;padding:11px;margin-top:8px;font-weight:800">Entrar</button>' +
      '<div style="display:flex;gap:6px;margin-top:8px"><button onclick="sparkTelaCriar()" style="flex:1;background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font-size:12px">Criar conta</button>' +
      '<button onclick="sparkTelaRec()" style="flex:1;background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font-size:12px">Esqueci a senha</button></div>' +
      '<button onclick="sparkContaFechar()" style="width:100%;background:none;border:none;color:#64748b;margin-top:8px;font-size:12px">Fechar</button>');
    googleBtn();
  }
  window.sparkTelaCriar = function () {
    modal('<div style="font-weight:800;font-size:15px">✨ Criar conta grátis</div><div style="font-size:12px;color:#475569">Sua lista começa vazia e fica salva. Tem exemplo pra aprender.</div>' +
      '<input id="sc-nome" placeholder="Seu nome" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-top:8px;font-size:13px">' +
      '<input id="sc-email" type="email" placeholder="Seu e-mail" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-top:8px;font-size:13px">' +
      '<input id="sc-senha" type="password" placeholder="Senha (mínimo 6)" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-top:8px;font-size:13px">' +
      '<button onclick="sparkDoCriar()" style="width:100%;background:#16a34a;color:#fff;border:none;border-radius:8px;padding:11px;margin-top:8px;font-weight:800">Criar e entrar</button>' +
      '<button onclick="sparkContaFechar()" style="width:100%;background:none;border:none;color:#64748b;margin-top:8px;font-size:12px">Fechar</button>');
  };
  window.sparkTelaRec = function () {
    modal('<div style="font-weight:800;font-size:15px">🔑 Recuperar senha</div><div style="font-size:12px;color:#475569">Mandamos um código de 6 dígitos pro seu e-mail.</div>' +
      '<input id="sc-email" type="email" placeholder="Seu e-mail" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-top:8px;font-size:13px">' +
      '<button onclick="sparkDoRec()" style="width:100%;background:#0284c7;color:#fff;border:none;border-radius:8px;padding:11px;margin-top:8px;font-weight:800">Enviar código</button>' +
      '<button onclick="sparkContaFechar()" style="width:100%;background:none;border:none;color:#64748b;margin-top:8px;font-size:12px">Fechar</button>');
  };
  window.sparkTelaNova = function (email) {
    modal('<div style="font-weight:800;font-size:15px">🔑 Nova senha</div><div style="font-size:12px;color:#475569">Digite o código que chegou em ' + esc(email) + '.</div>' +
      '<input id="sc-cod" inputmode="numeric" placeholder="Código de 6 dígitos" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-top:8px;font-size:13px">' +
      '<input id="sc-senha" type="password" placeholder="Nova senha (mínimo 6)" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-top:8px;font-size:13px">' +
      '<button onclick="sparkDoNova(\'' + esc(email).replace(/'/g, '') + '\')" style="width:100%;background:#16a34a;color:#fff;border:none;border-radius:8px;padding:11px;margin-top:8px;font-weight:800">Trocar e entrar</button>' +
      '<button onclick="sparkContaFechar()" style="width:100%;background:none;border:none;color:#64748b;margin-top:8px;font-size:12px">Fechar</button>');
  };
  function val(id) { try { return (document.getElementById(id) || {}).value || ''; } catch (_) { return ''; } }
  function entrarComum(j) {
    try {
      localStorage.setItem(LS_TK, j.token);
      localStorage.setItem(LS_USER, JSON.stringify(j.user));
    } catch (_) {}
    closeModal(); barra();
    carregarLista(j.user, true);
  }
  window.sparkDoLogin = function () {
    api('/auth/login', { email: val('sc-email'), senha: val('sc-senha') }).then(function (r) {
      if (r.st === 200 && r.j.ok) entrarComum(r.j);
      else telaLogin((r.j && r.j.error === 'email ou senha invalidos') ? 'E-mail ou senha inválidos.' : 'Falhou. Tente de novo. (' + r.st + ')');
    }).catch(function () { telaLogin('Falha de rede.'); });
  };
  window.sparkDoCriar = function () {
    api('/auth/register', { nome: val('sc-nome'), email: val('sc-email'), senha: val('sc-senha') }).then(function (r) {
      if (r.st === 200 && r.j.ok) { entrarComum(r.j); return; }
      var e = (r.j && r.j.error) || '';
      telaLogin(e === 'email ja cadastrado' ? 'Esse e-mail já tem conta. Toque em Entrar.' : e === 'senha minima 6' ? 'Senha mínima de 6 caracteres.' : e === 'email invalido' ? 'Confira o e-mail.' : 'Falhou. Tente de novo.');
      if (e === 'email ja cadastrado') window.sparkTelaRec && null;
    }).catch(function () { telaLogin('Falha de rede.'); });
  };
  window.sparkDoRec = function () {
    var em = val('sc-email');
    api('/auth/recuperar', { email: em }).then(function (r) {
      if (r.st === 200 && r.j.ok) window.sparkTelaNova(em);
      else telaLogin('Não consegui enviar. Confira o e-mail.');
    }).catch(function () { telaLogin('Falha de rede.'); });
  };
  window.sparkDoNova = function (email) {
    api('/auth/nova-senha', { email: email, codigo: val('sc-cod'), senha: val('sc-senha') }).then(function (r) {
      if (r.st === 200 && r.j.ok) entrarComum(r.j);
      else window.sparkTelaNova(email);
    }).catch(function () { telaLogin('Falha de rede.'); });
  };
  window.sparkSair = function () {
    try { api('/auth/sair', {}); } catch (_) {}
    try { localStorage.removeItem(LS_TK); localStorage.removeItem(LS_USER); } catch (_) {}
    barra();
  };
  window.sparkConta = function () {
    if (tk()) {
      var u = {}; try { u = JSON.parse(localStorage.getItem(LS_USER) || '{}'); } catch (_) {}
      modal('<div style="font-weight:800;font-size:15px">👤 ' + esc(u.nome || 'Minha conta') + '</div><div style="font-size:12px;color:#475569">' + esc(u.email || '') + '</div><div style="font-size:12px;color:#475569;margin-top:8px">CPF na nota (NFP-SP)</div><div style="display:flex;gap:6px"><input id="spark-cpf" placeholder="000.000.000-00" style="flex:1;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font-size:13px"><button onclick="sparkCPF()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:9px 12px;font-weight:800">OK</button></div>' + '<button onclick="sparkSair();sparkContaFechar()" style="width:100%;background:#fff;border:1px solid #fecaca;color:#b91c1c;border-radius:8px;padding:11px;margin-top:10px;font-weight:700">Sair da conta</button><button onclick="sparkContaFechar()" style="width:100%;background:none;border:none;color:#64748b;margin-top:8px;font-size:12px">Fechar</button>');
      try { var _ci = document.getElementById('spark-cpf'); if (_ci && !_ci.value) _ci.value = localStorage.getItem('spark_cpf') || ''; } catch (_) {}
    } else telaLogin();
  };
  /* ---------- google ---------- */
  function googleBtn() {
    try {
      var box = document.getElementById('spark-gbtn');
      if (!box) return;
      if (!window.SPARK_GOOGLE_ID) { box.innerHTML = '<div style="font-size:11px;color:#64748b;text-align:center">Login com Google em breve (ativando).</div>'; return; }
      box.innerHTML = '<div id="g_id_onload" data-client_id="' + esc(window.SPARK_GOOGLE_ID) + '" data-callback="sparkGoogleCb"></div><div class="g_id_signin" data-type="standard" data-size="large" data-width="280"></div>';
      var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
      document.head.appendChild(s);
    } catch (_) {}
  }
  window.sparkCPF = function () {
    try {
      var v = (document.getElementById('spark-cpf') || {}).value || '';
      api('/cpf', { cpf: v }).then(function (r) {
        var ok = !!(r && r.j && r.j.ok);
        var num = String(v).replace(/\D/g, '');
        try { if (ok) localStorage.setItem('spark_cpf', num); } catch (_) {}
        try { var fe = document.getElementById('spark-final-cpf'); if (fe && ok) fe.textContent = num.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); } catch (_) {}
        alert(ok ? ('CPF ' + (r.j.cpf || num) + ' salvo! Peca CPF na nota.') : ((r.j && r.j.error) || 'CPF invalido. Confira os 11 digitos.'));
      });
    } catch (_) {}
  };
  window.sparkGoogleCb = function (resp) {
    try {
      api('/auth/google', { id_token: resp.credential }).then(function (r) {
        if (r.st === 200 && r.j.ok) entrarComum(r.j);
        else telaLogin('Google falhou aqui. Tente e-mail e senha.');
      });
    } catch (_) {}
  };
  /* ---------- barra conta ---------- */
  function barra() {
    try {
      var b = document.getElementById('spark-conta-btn');
      var u = {}; try { u = JSON.parse(localStorage.getItem(LS_USER) || '{}'); } catch (_) {}
      if (!b) {
        var nav = document.querySelector('.bottom-nav') || document.body;
        b = document.createElement('button');
        b.id = 'spark-conta-btn';
        b.onclick = window.sparkConta;
        try { nav.appendChild(b); } catch (_) {}
      }
      if (tk() && u.nome) { b.innerHTML = '👤 ' + esc(String(u.nome).split(' ')[0]); }
      else { b.innerHTML = '👤 Entrar'; }
      b.style.cssText = 'position:fixed;bottom:96px;right:10px;z-index:9000;background:#0f172a;color:#fff;border:none;border-radius:20px;padding:8px 14px;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.25)';
    } catch (_) {}
  }
  /* ---------- carregar lista ---------- */
  function carregarLista(user, novaConta) {
    api('/minha-lista?app=' + APP, undefined, 'GET').then(function (r) {
      try {
        if (r.st === 200 && r.j.ok) {
          listaPronta = true;
          try { window._listaTs = parseFloat(r.j.atualizado) || 0; } catch (_) {}
          var itens = r.j.itens || [];
          var st = ST();
          if (st) {
            if (itens.length) {
              var n = Date.now();
              st.items = itens.map(function (x, i) { var _pr0 = parseFloat(x.precoReal); return { id: n + i, name: x.nome, qty: x.qtd || 1, unit: x.unit || 'un', basePrice: parseFloat(x.basePrice) || 0, checked: !!x.checked, ean: x.ean || '', precoReal: (x.precoReal != null && !isNaN(_pr0)) ? _pr0 : null }; });
              try { restauraMarket(); } catch (_) {}
              renderPlus(); if (window.updateKPIs) window.updateKPIs();
              try { saveLocal(); } catch (_) {}
              var b = document.getElementById('spark-ex-banner'); if (b) b.style.display = 'none';
            } else {
              st.items = [];
              renderPlus(); if (window.updateKPIs) window.updateKPIs();
              bannerEx();
            }
          }
          if (novaConta) window.sparkTour(false);
        }
      } catch (_) {}
    }).catch(function () {});
  }
  /* ---------- boot ---------- */
  function boot() {
    try {
      barra();
      try { restauraMarket(); } catch (_) {}
      try { embrulhaToggle(); } catch (_) {}
      if (tk()) {
        api('/auth/me', undefined, 'GET').then(function (r) {
          if (r.st === 200 && r.j.ok) {
            try { localStorage.setItem(LS_USER, JSON.stringify(r.j.user)); } catch (_) {}
            barra();
            carregarLista(r.j.user, false);
          } else { try { localStorage.removeItem(LS_TK); localStorage.removeItem(LS_USER); } catch (_) {} barra(); }
        }).catch(function () {});
      }
      renderPlus(); if (window.updateKPIs) try { window.updateKPIs(); } catch (_) {}
    } catch (_) {}
  }
  // toggleCheck com persistencia imediata (a selecao NAO some ao fechar/abrir)
  function embrulhaToggle() {
    try {
      if (window._sparkTgWrap || !window.toggleCheck) return;
      window._sparkTgWrap = true;
      var _tgOrig = window.toggleCheck;
      window.toggleCheck = function (id) {
        try { _tgOrig(id); } catch (_) {
          try { var st = ST(); (st.items || []).forEach(function (i) { if (i.id === id) i.checked = !i.checked; }); renderPlus(); if (window.updateKPIs) window.updateKPIs(); } catch (_) {}
        }
        try { saveLocal(); } catch (_) {}
        try { window.sparkSync(true); } catch (_) {}
      };
    } catch (_) {}
  }
  try { embrulhaToggle(); } catch (_) {}
  try { setTimeout(embrulhaToggle, 1500); } catch (_) {}
  try { setTimeout(embrulhaToggle, 4000); } catch (_) {}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  try {
    document.addEventListener('visibilitychange', function () {
      try {
        if (document.hidden) { try { window.sparkSyncFlush(); } catch (_) {} }
        else boot();
      } catch (_) {}
    });
  } catch (_) {}
  try { window.addEventListener('pagehide', function () { try { window.sparkSyncFlush(); } catch (_) {} }); } catch (_) {}
  try { window.addEventListener('beforeunload', function () { try { window.sparkSyncFlush(); } catch (_) {} }); } catch (_) {}
})();
