/* sparkmat conta v1 - conta unica (mesmo login do Spark) + lista obra + excluir + qtd + exemplo + tour. Mesmo padrao. */
(function () {
  'use strict';
  if (window._matConta) return; window._matConta = true;
  var AUTH = '/spark-api';
  var LS_TK = 'spark_token', LS_USER = 'spark_user';
  window.SPARK_GOOGLE_ID = window.SPARK_GOOGLE_ID || '';
  var EXEMPLO_MAT = [
    { name: 'Cimento Votoran Todas as Obras CP-II E-32 50kg', qty: 50, unit: 'sacos', basePrice: 34.90, sku: 'VOT-CP2-50' },
    { name: 'Areia Média Lavada para Reboco/Concreto', qty: 4, unit: 'm³', basePrice: 110.00, sku: 'AREIA-MED-01' },
    { name: 'Brita 1 Calcária para Concreto Estrutural', qty: 3, unit: 'm³', basePrice: 115.00, sku: 'BRITA-01-M3' },
    { name: 'Aço Vergalhão CA-50 Gerdau 10mm (3/8) 12m', qty: 25, unit: 'barras', basePrice: 42.50, sku: 'GER-CA50-10' },
    { name: 'Bloco Cerâmico 8 Furos 14x19x39cm Estrutural', qty: 1200, unit: 'un', basePrice: 2.10, sku: 'BLOC-CER-14' },
    { name: 'Tubo Esgoto PVC 100mm Tigre Barra 6m', qty: 8, unit: 'barras', basePrice: 78.90, sku: 'TIG-ESG-100' },
    { name: 'Argamassa Votoran AC-III Cinza 20kg', qty: 20, unit: 'sacos', basePrice: 36.90, sku: 'VOT-AC3-20' }
  ];
  function MST() { try { return matState; } catch (_) { try { return window.matState; } catch (_) { return null; } } }
  function esc(s) { try { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); } catch (_) { return ''; } }
  function tk() { try { return localStorage.getItem(LS_TK) || ''; } catch (_) { return ''; } }
  function api(path, body, method) {
    var opt = { method: method || (body === undefined ? 'GET' : 'POST'), cache: 'no-store', headers: {} };
    if (tk()) opt.headers['Authorization'] = 'Bearer ' + tk();
    if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    return fetch(AUTH + path, opt).then(function (r) { return r.json().then(function (j) { return { st: r.status, j: j }; }); });
  }
  var syncT = null, matPronta = false;
  window.matSync = function () {
    if (!tk() || !matPronta) return;
    try { if (syncT) clearTimeout(syncT); } catch (_) {}
    syncT = setTimeout(function () {
      try {
        var st = MST(); if (!st) return;
        var itens = (st.items || []).map(function (x) { return { nome: x.name, qtd: x.qty, unit: x.unit || 'un', basePrice: parseFloat(x.basePrice) || 0 }; });
        api('/minha-lista?app=mat', { itens: itens, app: 'mat' });
      } catch (_) {}
    }, 1500);
  };
  /* render com excluir + qtd (mesmo markup do app) */
  function renderPlus() {
    try {
      var st = MST();
      var container = document.getElementById('materials-list-container');
      if (!container || !st) return;
      var mult = st.stores[st.activeStore].multiplier;
      container.innerHTML = st.items.map(function (item) {
        var itemTotal = (item.basePrice * mult * item.qty).toFixed(2).replace('.', ',');
        var unitPrice = (item.basePrice * mult).toFixed(2).replace('.', ',');
        return '' +
          '<div class="mat-item"><div class="mat-left">' +
          '<div class="mat-checkbox ' + (item.checked ? 'checked' : '') + '" onclick="toggleMatCheck(' + item.id + ')">' + (item.checked ? '✓' : '') + '</div>' +
          '<div class="mat-info"><span class="mat-name ' + (item.checked ? 'checked' : '') + '">' + esc(item.name) + '</span>' +
          '<span class="mat-meta"><span>' + esc(item.qty) + ' ' + esc(item.unit) + '</span><span>•</span><span>R$ ' + unitPrice + '/' + esc(item.unit) + '</span><span>•</span><span class="pill pill-blue" style="font-size:9px; padding:1px 5px;">SKU: ' + esc(item.sku) + '</span></span>' +
          '</div></div>' +
          '<div style="display:flex;align-items:center;gap:4px">' +
          '<button onclick="matQty(' + item.id + ',-1)" style="border:1px solid #e2e8f0;background:#fff;border-radius:8px;min-width:26px;height:26px;font-size:14px">−</button>' +
          '<button onclick="matQty(' + item.id + ',1)" style="border:1px solid #e2e8f0;background:#fff;border-radius:8px;min-width:26px;height:26px;font-size:14px">+</button>' +
          '<button onclick="matDel(' + item.id + ')" style="border:1px solid #fecaca;background:#fff;border-radius:8px;min-width:26px;height:26px;font-size:12px">🗑</button>' +
          '<div class="mat-price">R$ ' + itemTotal + '</div>' +
          '</div></div>';
      }).join('');
    } catch (_) {}
    try { window.matSync(); } catch (_) {}
  }
  window.matDel = function (id) {
    try { var st = MST(); if (!st) return; st.items = st.items.filter(function (i) { return i.id !== id; }); renderPlus(); if (window.updateMatKPIs) window.updateMatKPIs(); } catch (_) {}
  };
  window.matQty = function (id, d) {
    try {
      var st = MST(); if (!st) return; var it = null;
      st.items.forEach(function (i) { if (i.id === id) it = i; });
      if (!it) return;
      it.qty = Math.max(1, (parseFloat(it.qty) || 1) + d);
      renderPlus(); if (window.updateMatKPIs) window.updateMatKPIs();
    } catch (_) {}
  };
  window.instalaRenderMat = function () {    try {
      if (window.renderMaterialsList && !window._renderMatOn) {
        window._renderMatOrig = window.renderMaterialsList;
        window.renderMaterialsList = renderPlus;
        window._renderMatOn = true;
      }
      if (window._renderMatOn) renderPlus();
    } catch (_) {}
  };
  try {
    window.instalaRenderMat();
    window.addEventListener('DOMContentLoaded', window.instalaRenderMat);
    window.addEventListener('load', window.instalaRenderMat);
  } catch (_) {}
  /* exemplo obra */
  window.matExemplo = function () {
    try {
      var st = MST(); if (!st) return;
      var n = Date.now();
      st.items = EXEMPLO_MAT.map(function (x, i) { return { id: n + i, name: x.name, qty: x.qty, unit: x.unit, basePrice: x.basePrice, checked: false, sku: x.sku }; });
      renderPlus(); if (window.updateMatKPIs) window.updateMatKPIs();
      var b = document.getElementById('mat-ex-banner'); if (b) b.style.display = 'none';
    } catch (_) {}
  };
  function bannerEx() {
    try {
      if (document.getElementById('mat-ex-banner')) return;
      var host = document.getElementById('tab-cesta') || document.body;
      var d = document.createElement('div');
      d.id = 'mat-ex-banner';
      d.innerHTML = '<div style="border:1px dashed #fdba74;background:#fff7ed;border-radius:12px;padding:10px;margin:8px;font-size:12px;color:#9a3412">Sua ordem começa <b>vazia</b>. Toque em <b>Ver exemplo</b> pra aprender, ou mande o áudio do mestre.<div style="margin-top:8px;display:flex;gap:6px"><button onclick="matExemplo()" style="flex:1;background:#ea580c;color:#fff;border:none;border-radius:8px;padding:8px;font-weight:700">Ver exemplo</button><button onclick="matTour(true)" style="flex:1;background:#fff;border:1px solid #fdba74;border-radius:8px;padding:8px">Passo a passo</button></div></div>';
      host.insertBefore(d, host.firstChild);
    } catch (_) {}
  }
  /* tour obra 4 passos */
  var TOUR = [
    { t: 'Passo 1 de 4 — Áudio do mestre', d: 'Grave o áudio da obra ("40 sacos de cimento, 15 barras de ferro"). A IA transcreve e separa os materiais com fase e unidade.' },
    { t: 'Passo 2 de 4 — NBR de olho', d: 'O consultor técnico avisa na hora se o material fere norma (ex: AC-I em porcelanato, NBR 14081) e sugere a correção.' },
    { t: 'Passo 3 de 4 — Radar + split', d: 'O agente compara lojas com frete e sugere o split: básicos no depósito, acabamentos no homecenter.' },
    { t: 'Passo 4 de 4 — Ordem e relatório', d: 'Emita a ordem, mande no WhatsApp da loja, baixe o PDF ou gere o relatório de economia pro cliente.' }
  ];
  window.matTour = function (force) {
    try {
      var k = 'mat_tour_' + ((JSON.parse(localStorage.getItem(LS_USER) || '{}').id) || 'anon');
      if (!force) { try { if (localStorage.getItem(k)) return; } catch (_) {} }
      var i = 0, ov = document.createElement('div'); ov.id = 'mat-tour';
      function draw() {
        ov.innerHTML = '<div style="position:fixed;inset:0;background:rgba(2,6,23,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px"><div style="background:#fff;border-radius:16px;padding:18px;max-width:340px;width:100%"><div style="font-weight:800;font-size:14px">' + TOUR[i].t + '</div><div style="font-size:12px;color:#475569;margin:8px 0 12px">' + TOUR[i].d + '</div><div style="display:flex;gap:6px"><button id="mat-tour-no" style="flex:1;background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:10px">Pular</button><button id="mat-tour-ok" style="flex:2;background:#ea580c;color:#fff;border:none;border-radius:8px;padding:10px;font-weight:700">' + (i === TOUR.length - 1 ? 'Começar' : 'Próximo') + '</button></div></div></div>';
        document.getElementById('mat-tour-ok').onclick = function () { i++; if (i >= TOUR.length) close(); else draw(); };
        document.getElementById('mat-tour-no').onclick = close;
      }
      function close() { try { localStorage.setItem(k, '1'); } catch (_) {} try { ov.remove(); } catch (_) {} }
      document.body.appendChild(ov); draw();
    } catch (_) {}
  };
  /* conta modal (mesma conta do Spark) */
  function modal(html) {
    try { var o = document.getElementById('mat-conta-ov'); if (o) o.remove(); } catch (_) {}
    var ov = document.createElement('div'); ov.id = 'mat-conta-ov';
    ov.innerHTML = '<div style="position:fixed;inset:0;background:rgba(2,6,23,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px"><div style="background:#fff;border-radius:16px;padding:18px;max-width:340px;width:100%;max-height:88vh;overflow:auto">' + html + '</div></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov.firstChild) window.matContaFechar(); });
    document.body.appendChild(ov);
  }
  window.matContaFechar = function () { try { document.getElementById('mat-conta-ov').remove(); } catch (_) {} };
  function val(id) { try { return (document.getElementById(id) || {}).value || ''; } catch (_) { return ''; } }
  window.matTelaConta = function (msg) {
    modal('<div style="font-weight:800;font-size:15px">👤 Minha conta</div>' +
      (msg ? '<div style="font-size:12px;color:#b91c1c;margin-top:6px">' + esc(msg) + '</div>' : '') +
      '<div style="font-size:11px;color:#64748b">A mesma conta do Spark mercado vale aqui.</div>' +
      '<input id="mc-email" type="email" placeholder="Seu e-mail" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-top:8px;font-size:13px">' +
      '<input id="mc-senha" type="password" placeholder="Senha" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-top:8px;font-size:13px">' +
      '<button onclick="matDoLogin()" style="width:100%;background:#ea580c;color:#fff;border:none;border-radius:8px;padding:11px;margin-top:8px;font-weight:800">Entrar</button>' +
      '<div style="display:flex;gap:6px;margin-top:8px"><button onclick="matTelaCriar()" style="flex:1;background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font-size:12px">Criar conta</button>' +
      '<button onclick="matTelaRec()" style="flex:1;background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font-size:12px">Esqueci a senha</button></div>' +
      '<button onclick="matContaFechar()" style="width:100%;background:none;border:none;color:#64748b;margin-top:8px;font-size:12px">Fechar</button>');
  };
  window.matTelaCriar = function () {
    modal('<div style="font-weight:800;font-size:15px">✨ Criar conta grátis</div><div style="font-size:12px;color:#475569">Sua ordem começa vazia e fica salva. Tem exemplo pra aprender.</div>' +
      '<input id="mc-nome" placeholder="Seu nome" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-top:8px;font-size:13px">' +
      '<input id="mc-email" type="email" placeholder="Seu e-mail" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-top:8px;font-size:13px">' +
      '<input id="mc-senha" type="password" placeholder="Senha (mínimo 6)" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-top:8px;font-size:13px">' +
      '<button onclick="matDoCriar()" style="width:100%;background:#16a34a;color:#fff;border:none;border-radius:8px;padding:11px;margin-top:8px;font-weight:800">Criar e entrar</button>' +
      '<button onclick="matContaFechar()" style="width:100%;background:none;border:none;color:#64748b;margin-top:8px;font-size:12px">Fechar</button>');
  };
  window.matTelaRec = function () {
    modal('<div style="font-weight:800;font-size:15px">🔑 Recuperar senha</div><div style="font-size:12px;color:#475569">Mandamos um código de 6 dígitos pro seu e-mail.</div>' +
      '<input id="mc-email" type="email" placeholder="Seu e-mail" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-top:8px;font-size:13px">' +
      '<button onclick="matDoRec()" style="width:100%;background:#ea580c;color:#fff;border:none;border-radius:8px;padding:11px;margin-top:8px;font-weight:800">Enviar código</button>' +
      '<button onclick="matContaFechar()" style="width:100%;background:none;border:none;color:#64748b;margin-top:8px;font-size:12px">Fechar</button>');
  };
  window.matTelaNova = function (email) {
    modal('<div style="font-weight:800;font-size:15px">🔑 Nova senha</div><div style="font-size:12px;color:#475569">Código enviado para ' + esc(email) + '.</div>' +
      '<input id="mc-cod" inputmode="numeric" placeholder="Código de 6 dígitos" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-top:8px;font-size:13px">' +
      '<input id="mc-senha" type="password" placeholder="Nova senha (mínimo 6)" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-top:8px;font-size:13px">' +
      '<button onclick="matDoNova(\'' + esc(email).replace(/'/g, '') + '\')" style="width:100%;background:#16a34a;color:#fff;border:none;border-radius:8px;padding:11px;margin-top:8px;font-weight:800">Trocar e entrar</button>' +
      '<button onclick="matContaFechar()" style="width:100%;background:none;border:none;color:#64748b;margin-top:8px;font-size:12px">Fechar</button>');
  };
  function entrar(j) {
    try { localStorage.setItem(LS_TK, j.token); localStorage.setItem(LS_USER, JSON.stringify(j.user)); } catch (_) {}
    window.matContaFechar(); barra(); carregar(j.user, true);
  }
  window.matDoLogin = function () {
    api('/auth/login', { email: val('mc-email'), senha: val('mc-senha') }).then(function (r) {
      if (r.st === 200 && r.j.ok) entrar(r.j); else window.matTelaConta('E-mail ou senha inválidos.');
    }).catch(function () { window.matTelaConta('Falha de rede.'); });
  };
  window.matDoCriar = function () {
    api('/auth/register', { nome: val('mc-nome'), email: val('mc-email'), senha: val('mc-senha') }).then(function (r) {
      if (r.st === 200 && r.j.ok) { entrar(r.j); return; }
      var e = (r.j && r.j.error) || '';
      window.matTelaConta(e === 'email ja cadastrado' ? 'Esse e-mail já tem conta. Toque em Entrar.' : 'Confira os dados (senha mínima 6).');
    }).catch(function () { window.matTelaConta('Falha de rede.'); });
  };
  window.matDoRec = function () {
    var em = val('mc-email');
    api('/auth/recuperar', { email: em }).then(function (r) {
      if (r.st === 200 && r.j.ok) window.matTelaNova(em); else window.matTelaConta('Não consegui enviar. Confira o e-mail.');
    }).catch(function () { window.matTelaConta('Falha de rede.'); });
  };
  window.matDoNova = function (email) {
    api('/auth/nova-senha', { email: email, codigo: val('mc-cod'), senha: val('mc-senha') }).then(function (r) {
      if (r.st === 200 && r.j.ok) entrar(r.j); else window.matTelaNova(email);
    }).catch(function () { window.matTelaConta('Falha de rede.'); });
  };
  window.matSair = function () {
    try { api('/auth/sair', {}); } catch (_) {}
    try { localStorage.removeItem(LS_TK); localStorage.removeItem(LS_USER); } catch (_) {}
    barra();
  };
  window.matConta = function () {
    if (tk()) {
      var u = {}; try { u = JSON.parse(localStorage.getItem(LS_USER) || '{}'); } catch (_) {}
      modal('<div style="font-weight:800;font-size:15px">👤 ' + esc(u.nome || 'Minha conta') + '</div><div style="font-size:12px;color:#475569">' + esc(u.email || '') + '</div><button onclick="matSair();matContaFechar()" style="width:100%;background:#fff;border:1px solid #fecaca;color:#b91c1c;border-radius:8px;padding:11px;margin-top:10px;font-weight:700">Sair da conta</button><button onclick="matContaFechar()" style="width:100%;background:none;border:none;color:#64748b;margin-top:8px;font-size:12px">Fechar</button>');
    } else window.matTelaConta();
  };
  function barra() {
    try {
      var b = document.getElementById('mat-conta-btn');
      var u = {}; try { u = JSON.parse(localStorage.getItem(LS_USER) || '{}'); } catch (_) {}
      if (!b) {
        b = document.createElement('button');
        b.id = 'mat-conta-btn';
        b.onclick = window.matConta;
        try { document.body.appendChild(b); } catch (_) {}
      }
      b.textContent = (tk() && u.nome) ? ('👤 ' + String(u.nome).split(' ')[0]) : '👤 Entrar';
      b.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9000;background:#0f172a;color:#fff;border:none;border-radius:20px;padding:8px 14px;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.25)';
    } catch (_) {}
  }
  function carregar(user, novaConta) {
    api('/minha-lista?app=mat', undefined, 'GET').then(function (r) {
      try {
        if (r.st === 200 && r.j.ok) {
          matPronta = true;
          var itens = r.j.itens || [];
          var st = MST();
          if (st) {
            if (itens.length) {
              var n = Date.now();
              st.items = itens.map(function (x, i) { return { id: n + i, name: x.nome, qty: x.qtd || 1, unit: x.unit || 'un', basePrice: parseFloat(x.basePrice) || 0, checked: false, sku: 'MAT-' + (n + i) }; });
              renderPlus(); if (window.updateMatKPIs) window.updateMatKPIs();
              var b = document.getElementById('mat-ex-banner'); if (b) b.style.display = 'none';
            } else {
              st.items = [];
              renderPlus(); if (window.updateMatKPIs) window.updateMatKPIs();
              bannerEx();
            }
          }
          if (novaConta) window.matTour(false);
        }
      } catch (_) {}
    }).catch(function () {});
  }
  /* foto real da obra (troca o stub simulateMemorialOCR) */
  window.simulateMemorialOCR = function () {
    try {
      var old = document.getElementById('mat-ver-foto');
      if (old) old.remove();
      var inp = document.createElement('input');
      inp.type = 'file'; inp.id = 'mat-ver-foto';
      inp.accept = 'image/*'; inp.setAttribute('capture', 'environment');
      inp.style.cssText = 'position:fixed;bottom:10px;left:10px;z-index:9999;font-size:12px';
      inp.onchange = function () { window.matVerFotoReal(inp); };
      document.body.appendChild(inp);
      try { inp.click(); } catch (_) {}
    } catch (_) {}
  };
  window.matVerFotoReal = function (input) {
    try {
      var pill = document.getElementById('brain-status-pill');
      var box = document.getElementById('brain-transcript-box');
      var f = input.files && input.files[0];
      if (!f) return;
      if (pill) pill.textContent = 'Analisando foto...';
      if (box) box.textContent = 'Lendo materiais da foto...';
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var b64 = String(rd.result).split(',')[1];
          fetch('/sparkmat-api/ia/ver', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ foto_b64: b64 }) }).then(function (r) { return r.json(); }).then(function (vj) {
            if (!vj || !vj.ok) { if (pill) pill.textContent = 'Foto sem itens.'; return; }
            var txt = vj.descricao_pt || vj.descricao || '';
            return fetch('/sparkmat-api/ia/entender-mat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: txt }) }).then(function (r) { return r.json(); }).then(function (en) {
              if (en && en.ok && en.itens && en.itens.length) {
                window.pendingMatEntities = en.itens.map(function (o) { return { name: o.nome, qty: o.qtd, unit: o.unidade || 'un', basePrice: 0, sku: 'FOTO-' + Math.floor(Math.random() * 9000 + 1000) }; });
                var codeBox = document.getElementById('brain-json-code');
                var jsonBox = document.getElementById('brain-extracted-box');
                if (box) box.textContent = '"' + txt.slice(0, 120) + '"';
                if (codeBox) codeBox.textContent = JSON.stringify(window.pendingMatEntities, null, 2);
                if (jsonBox) jsonBox.style.display = 'block';
                if (pill) pill.textContent = 'Foto lida: ' + en.itens.length + ' itens';
              } else if (pill) pill.textContent = 'Foto sem itens.';
            });
          }).catch(function () { if (pill) pill.textContent = 'Foto falhou (rede).'; });
        } catch (_) { if (pill) pill.textContent = 'Foto falhou.'; }
      };
      rd.readAsDataURL(f);
    } catch (_) {}
    try { setTimeout(function () { try { input.remove(); } catch (_) {} }, 1000); } catch (_) {}
  };
  function boot() {
    try {
      barra();
      if (tk()) {
        api('/auth/me', undefined, 'GET').then(function (r) {
          if (r.st === 200 && r.j.ok) {
            try { localStorage.setItem(LS_USER, JSON.stringify(r.j.user)); } catch (_) {}
            barra(); carregar(r.j.user, false);
          } else { try { localStorage.removeItem(LS_TK); localStorage.removeItem(LS_USER); } catch (_) {} barra(); }
        }).catch(function () {});
      }
    } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
