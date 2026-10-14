/* spark AGENTE REAL v1 - tudo funcional (voz, GPS, onde comprar, QR, PDF, WhatsApp, visao) */
(function () {
  'use strict';
  if (document.getElementById('spark-real')) return;
  var API = '/spark-api';
  function esc(s) { try { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); } catch (_) { return ''; } }
  async function api(path, body) {
    var opt = { method: body === undefined ? 'GET' : 'POST', cache: 'no-store' };
    if (body !== undefined) { opt.headers = { 'Content-Type': 'application/json' }; opt.body = JSON.stringify(body); }
    var r = await fetch(API + path, opt);
    return r.json();
  }
  function toast(m) { try { var b = document.getElementById('spark-msg'); if (b) { b.textContent = m; } } catch (_) {} try { var f = document.getElementById('spark-final-msg'); if (f) f.textContent = m; } catch (_) {} }
  function _mult() { try { var st = window.state; if (st && st.markets && st.markets[st.activeMarket]) return st.markets[st.activeMarket].multiplier || 1; } catch (_) {} try { if (window.getMult) return window.getMult(); } catch (_) {} return 1; }
  function _norm(s) { try { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); } catch (_) { return String(s || '').toLowerCase(); } }
  // mescla item da nota na lista: se ja existe atualiza preco/qtd (preco REAL pago), senao adiciona. Marca como pego.
  function _mergeNota(nome, qtd, valorUnitReal) {
    try {
      var st = window.state; if (!st || !Array.isArray(st.items)) return false;
      var mult = _mult(); if (!(mult > 0)) mult = 1;
      var base = Math.round((parseFloat(valorUnitReal) / mult) * 100) / 100;
      var real = Math.round(parseFloat(valorUnitReal) * 100) / 100;
      var alvo = null, nk = _norm(nome);
      st.items.forEach(function (x) { try { if (_norm(x.name) === nk) alvo = x; } catch (_) {} });
      if (!alvo) {
        st.items.forEach(function (x) { try { var a = _norm(x.name), b = nk; if (!alvo && a && b && (a.indexOf(b) >= 0 || b.indexOf(a) >= 0)) alvo = x; } catch (_) {} });
      }
      if (alvo) {
        alvo.qty = parseFloat(qtd) || alvo.qty || 1;
        alvo.basePrice = base;
        alvo.precoReal = real;
        alvo.checked = true;
      } else {
        st.items.unshift({ id: Date.now() + Math.random(), name: String(nome).slice(0, 60), qty: parseFloat(qtd) || 1, unit: 'un', basePrice: base, precoReal: real, checked: true, ean: '' });
      }
      return true;
    } catch (_) { return false; }
  }
  async function _posNota(msgCompra) {
    try { if (typeof renderShoppingList === 'function') renderShoppingList(); } catch (_) {}
    try { if (typeof updateKPIs === 'function') updateKPIs(); } catch (_) {}
    try { if (window.sparkSync) window.sparkSync(true); } catch (_) {}
    try { if (window.sparkCarregaValidades) window.sparkCarregaValidades(); } catch (_) {}
    try {
      var tk = ''; try { tk = localStorage.getItem('spark_token') || ''; } catch (_) {}
      if (tk && window.state && Array.isArray(window.state.items)) {
        var its = window.state.items.filter(function (x) { return x.checked; }).map(function (x) { return { nome: x.name, qtd: x.qty || 1 }; });
        if (its.length) await fetch(API + '/validades', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tk }, body: JSON.stringify({ itens: its }) });
      }
    } catch (_) {}
    try { toast(msgCompra); } catch (_) {}
  }
  function listaAtual() {
    try {
      if (window.state && Array.isArray(window.state.items) && window.state.items.length) return window.state.items.map(function (x) { return { nome: x.name || x.nome || '', qtd: x.qty || x.qtd || 1 }; });
    } catch (_) {}
    try {
      var t = (document.getElementById('quick-input') || {}).value || '';
      if (t.trim()) return [{ nome: t.trim(), qtd: 1 }];
    } catch (_) {}
    return [];
  }
  /* GPS */
  async function usarGPS() {
    toast('Pegando GPS...');
    if (!navigator.geolocation) { toast('GPS indisponivel neste aparelho.'); return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      try {
        window._sparkGeo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        toast('GPS ok: ' + pos.coords.latitude.toFixed(3) + ', ' + pos.coords.longitude.toFixed(3));
        carregarLocais();
      } catch (_) {}
    }, function () { toast('GPS negado. Escolha a cidade.'); }, { timeout: 12000 });
  }
  /* ONDE COMPRAR */
  async function carregarLocais() {
    try {
      if (window.SPARK_APP === 'pet') {
        var boxp = document.getElementById('spark-locais');
        var rpp = null;
        try {
          var gpp = window._sparkGeo || {};
          var cidpp = ''; try { cidpp = (document.getElementById('spark-cidade') || {}).value || ''; } catch (_) {}
          var qpp = ''; try { qpp = (document.getElementById('spark-busca') || {}).value || ''; } catch (_) {}
          var urlpp = '/estabelecimentos?tipo=petshop&cidade=' + encodeURIComponent(cidpp) + '&q=' + encodeURIComponent(qpp);
          if (gpp.lat) urlpp += '&lat=' + gpp.lat + '&lng=' + gpp.lng;
          rpp = await api(urlpp);
        } catch (_) { rpp = null; }
        if (rpp && rpp.ok && (rpp.locais || []).length) {
          var hpp = '<p style="font-size:10px;color:#64748b">' + rpp.total + ' pet shops' + ((window._sparkGeo && window._sparkGeo.lat) ? ' (perto de voce)' : '') + '</p>';
          (rpp.locais || []).forEach(function (l) {
            var mqp = (l.lat && l.lng) ? (l.lat + ',' + l.lng) : ((l.nome || '') + ' ' + (l.cidade || ''));
            var tagpp = l.verificado ? '<span style="background:#dcfce7;color:#15803d;border-radius:8px;padding:1px 6px;font-size:9px">verificado</span>' : '<span style="background:#fef9c3;color:#854d0e;border-radius:8px;padding:1px 6px;font-size:9px">confira o endereco</span>';
            var distpp = (l.dist_km !== undefined && l.dist_km < 9000) ? ' \u00b7 ' + l.dist_km + ' km' : '';
            hpp += '<div style="border-bottom:1px solid #f1f5f9;padding:6px 0;font-size:11px"><b>' + esc(l.nome) + '</b> <span style="color:#64748b">' + esc(l.bairro || '') + ' \u00b7 ' + esc(l.cidade || '') + distpp + '</span> ' + tagpp + ' <a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mqp) + '" target="_blank" style="font-size:9px;color:#0284c7">ver no mapa</a>' + ((l.lat && l.lng) ? ' <a href="https://www.google.com/maps/dir/?api=1&destination=' + l.lat + ',' + l.lng + '" target="_blank" style="font-size:9px;color:#0284c7">rota</a>' : '') + '</div>';
          });
          if (boxp) boxp.innerHTML = hpp;
          try { window._sparkPets = rpp.locais || []; } catch (_) {}
          return;
        }
        if (rpp && rpp.ok) {
          if (boxp) boxp.innerHTML = '<p style="font-size:11px;color:#64748b">0 pet shops para este filtro. Limpe a busca ou troque a cidade.</p>';
          try { window._sparkPets = []; } catch (_) {}
          return;
        }
        if (window.SPARK_PETSHOPS) {
          var hp = '<p style="font-size:10px;color:#64748b">' + window.SPARK_PETSHOPS.length + ' pet shops</p>';
          window.SPARK_PETSHOPS.forEach(function (l) {
            hp += '<div style="border-bottom:1px solid #f1f5f9;padding:6px 0;font-size:11px"><b>' + esc(l.nome) + '</b> <span style="color:#64748b">' + esc(l.cidade) + '</span> <a href="' + l.maps + '" target="_blank" style="font-size:9px;color:#0284c7">ver no mapa</a></div>';
          });
          if (boxp) boxp.innerHTML = hp;
          return;
        }
      }
    } catch (_) {}
    var box = document.getElementById('spark-locais');
    try { if (box) box.innerHTML = '<p style="font-size:11px;color:#64748b">Buscando mercados e depositos...</p>'; } catch (_) {}
    try {
      var g = window._sparkGeo || {};
      var cid = ''; try { cid = (document.getElementById('spark-cidade') || {}).value || ''; } catch (_) {}
      var q = ''; try { q = (document.getElementById('spark-busca') || {}).value || ''; } catch (_) {}
      var url = '/estabelecimentos?cidade=' + encodeURIComponent(cid) + '&q=' + encodeURIComponent(q);
      if (g.lat) url += '&lat=' + g.lat + '&lng=' + g.lng;
      var r = await api(url);
      if (!r || !r.ok) { if (box) box.innerHTML = '<p style="font-size:11px">Falhou. Tente de novo.</p>'; return; }
      var h = '<p style="font-size:10px;color:#64748b">' + r.total + ' locais' + (g.lat ? ' (perto de voce)' : '') + '</p>';
      (r.locais || []).slice(0, 30).forEach(function (l) {
        var tag = l.verificado ? '<span style="background:#dcfce7;color:#15803d;border-radius:8px;padding:1px 6px;font-size:9px">verificado</span>' : '<span style="background:#fef9c3;color:#854d0e;border-radius:8px;padding:1px 6px;font-size:9px">confira o endereco</span>';
        var dist = (l.dist_km !== undefined && l.dist_km < 9000) ? ' · ' + l.dist_km + ' km' : '';
        h += '<div style="border-bottom:1px solid #f1f5f9;padding:6px 0;font-size:11px"><b>' + esc(l.nome) + '</b> <span style="color:#64748b">' + esc(l.tipo) + ' · ' + esc(l.bairro) + ' · ' + esc(l.cidade) + dist + '</span> ' + tag + ' <button onclick="sparkPreco(\'' + esc(l.nome).replace(/'/g, '') + '\')" style="font-size:9px;color:#0284c7">preco medio</button></div><div id="spark-preco-' + l.id + '"></div>';
      });
      if (box) box.innerHTML = h;
    } catch (_) { try { if (box) box.innerHTML = '<p style="font-size:11px">Erro de rede.</p>'; } catch (_) {} }
  }
  window.sparkPreco = async function (nome) {
    try {
      var r = await api('/precos?item=' + encodeURIComponent((nome || '').toLowerCase()));
      toast(r && r.media ? ('Media ' + nome + ': R$ ' + r.media + ' (' + r.n + ' registros)') : 'Sem preco registrado para ' + nome + ' ainda. Seja o primeiro!');
    } catch (_) { toast('Falhou.'); }
  };
  /* AGENTE */
  window.sparkAgente = async function () {
    try {
      if (window.SPARK_APP === 'pet') {
        var itensp = listaAtual();
        if (!itensp.length) { toast('Lista vazia. Fale ou digite itens.'); return; }
        var cached = [];
        try { cached = window._sparkPets || []; } catch (_) {}
        if (cached.length) {
          var rkc = cached.slice().sort(function (a, b) { var da = (a.dist_km === undefined ? 9999 : parseFloat(a.dist_km)); var db = (b.dist_km === undefined ? 9999 : parseFloat(b.dist_km)); return da - db; });
          var hp2 = '<p style="font-size:11px"><b>' + itensp.length + ' itens pet \u00b7 ' + cached.length + ' pet shops</b></p>';
          rkc.slice(0, 6).forEach(function (r, ix) {
            var ddx = (r.dist_km !== undefined && r.dist_km < 9000) ? ' <span style="color:#64748b">\u00b7 ' + r.dist_km + ' km</span>' : '';
            hp2 += '<div style="font-size:11px">' + (ix === 0 ? '🏆 ' : '🐾 ') + '<b>' + esc(r.nome) + '</b><span style="color:#64748b"> \u00b7 ' + esc(r.bairro || '') + ' \u00b7 ' + esc(r.cidade || '') + '</span>' + ddx + '</div>';
          });
          var boxp2 = document.getElementById('spark-agente-box');
          if (boxp2) boxp2.innerHTML = hp2;
          toast('Plano pet pronto!');
          return;
        }
        if (window.SPARK_PETSHOPS) {
          var base = 0;
          try {
            var st = window.state || {};
            (st.items || []).forEach(function (x) { if (!x.checked) base += (x.basePrice || 0) * (x.qty || x.qtd || 1); });
          } catch (_) {}
          var rk = window.SPARK_PETSHOPS.map(function (l) { return { nome: l.nome, total: base * (l.mult || 1) }; }).sort(function (a, b) { return a.total - b.total; });
          var hp2b = '<p style="font-size:11px"><b>' + itensp.length + ' itens pet</b></p>';
          rk.slice(0, 6).forEach(function (r, ix) { hp2b += '<div style="font-size:11px">' + (ix === 0 ? '🏆 ' : '🐾 ') + '<b>' + esc(r.nome) + '</b> <span style="color:#64748b">~ R$ ' + r.total.toFixed(2).replace('.', ',') + '</span></div>'; });
          var boxp2b = document.getElementById('spark-agente-box');
          if (boxp2b) boxp2b.innerHTML = hp2b;
          toast('Plano pet pronto!');
          return;
        }
      }
    } catch (_) {}
    toast('Agente otimizando...');
    try {
      var g = window._sparkGeo || {};
      var cid = ''; try { cid = (document.getElementById('spark-cidade') || {}).value || ''; } catch (_) {}
      var itens = listaAtual();
      if (!itens.length) { toast('Lista vazia. Fale ou digite itens.'); return; }
      var r = await api('/agente/comprar', { itens: itens, cidade: cid, lat: g.lat, lng: g.lng });
      if (!r || !r.ok) { toast('Agente falhou.'); return; }
      window._sparkZap = r.zap_texto || '';
      var h = '<p style="font-size:11px"><b>' + r.total_itens + ' itens</b> · ' + r.com_preco_medio + ' com preco medio</p>';
      (r.mercados || []).forEach(function (m) { var mq=(m.lat&&m.lng)?(m.lat+','+m.lng):((m.nome||'')+' '+(m.cidade||'')); var lk=' <a href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(mq)+'">mapa</a>'; if(m.lat&&m.lng)lk+=' · <a href="https://www.google.com/maps/dir/?api=1&destination='+m.lat+','+m.lng+'">rota 🧭</a>'; h += '<div style="font-size:11px">🏪 <b>' + esc(m.nome) + '</b> <span style="color:#64748b">' + esc(m.bairro) + (m.dist_km < 9000 ? ' · ' + m.dist_km + ' km' : '') + '</span><br>'+lk+'</div>'; });
      (r.bebidas || []).forEach(function (m) { var mq2=(m.lat&&m.lng)?(m.lat+','+m.lng):((m.nome||'')+' '+(m.cidade||'')); var lk2=' <a href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(mq2)+'">mapa</a>'; if(m.lat&&m.lng)lk2+=' · <a href="https://www.google.com/maps/dir/?api=1&destination='+m.lat+','+m.lng+'">rota 🧭</a>'; h += '<div style="font-size:11px">🥤 <b>' + esc(m.nome) + '</b> <span style="color:#64748b">' + esc(m.bairro) + (m.dist_km < 9000 ? ' · ' + m.dist_km + ' km' : '') + '</span><br>'+lk2+'</div>'; });
      var box = document.getElementById('spark-agente-box');
      if (box) box.innerHTML = h;
      toast('Plano pronto! Compartilhe no WhatsApp ou gere o PDF.');
    } catch (_) { toast('Agente falhou (rede).'); }
  };
  /* WHATSAPP / PDF / PRINT / QR */
  window.sparkZap = function () {
    try {
      var t = window._sparkZap || listaAtual().map(function (x) { return '- ' + x.nome + ' x' + x.qtd; }).join('\n');
      if (!t) { toast('Lista vazia.'); return; }
      window.open('https://wa.me/?text=' + encodeURIComponent('Lista spark market:\n' + t), '_blank');
    } catch (_) {}
  };
  window.sparkPrint = function () { try { window.print(); } catch (_) {} };
  window.sparkPDF = async function () {
    toast('Gerando PDF...');
    try {
      var itens = listaAtual();
      if (!itens.length) { toast('Lista vazia.'); return; }
      var r = await fetch(API + '/lista/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itens: itens }) });
      if (!r.ok) { toast('PDF falhou.'); return; }
      var b = await r.blob();
      var u = URL.createObjectURL(b);
      var a = document.createElement('a'); a.href = u; a.download = 'lista-spark-market.pdf'; a.click();
      setTimeout(function () { URL.revokeObjectURL(u); }, 5000);
      toast('PDF baixado!');
    } catch (_) { toast('PDF falhou (rede).'); }
  };
  window.sparkNota = async function (inp) {
    try {
      var f = inp.files && inp.files[0];
      if (!f) return;
      toast('Lendo notinha...');
      var tk = ''; try { tk = localStorage.getItem('spark_token') || ''; } catch (_) {}
      if (!tk) { toast('Entre na conta primeiro.'); return; }
      var rd = await new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(f); });
      var r = await fetch(API + '/nota/ocr', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tk }, body: JSON.stringify({ image_base64: rd }) });
      var j = await r.json();
      if (!j || !j.ok || !(j.itens || []).length) { toast('Não li nada. Tenta foto mais nítida.'); return; }
      var n = 0;
      try {
        j.itens.forEach(function (it) {
          try {
            var vu = parseFloat(it.valor) || 0;
            if (_mergeNota(it.nome, it.qtd || 1, vu)) n++;
          } catch (_) {}
        });
        if (typeof renderShoppingList === 'function') renderShoppingList();
        if (typeof updateKPIs === 'function') updateKPIs();
      } catch (_) {}
      try {
        var totN = 0;
        (j.itens || []).forEach(function (it) { totN += (it.valor || 0) * (it.qtd || 1); });
        totN = Math.round(totN * 100) / 100;
        if (tk && totN > 0) {
          await fetch(API + '/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tk }, body: JSON.stringify({ mercado: 'Nota fiscal', total: totN, itens: j.itens }) });
          await _posNota(n + ' itens da nota! Lista corrigida com o preço real + gasto de R$ ' + totN.toFixed(2).replace('.', ',') + ' no Financeiro + geladeira ✅');
        } else {
          await _posNota(n + ' itens da nota na lista com preço real! Confira e toque em Finalizar compra.');
        }
      } catch (_) {
        toast(n + ' itens da nota na lista! Confira e finalize.');
      }
    } catch (_) { toast('Falhou. Tenta de novo.'); }
  };
  window.sparkXML = async function (inp) {
    try {
      var f = inp.files && inp.files[0];
      if (!f) return;
      toast('Lendo XML da nota...');
      var tx = await new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsText(f); });
      var doc = new DOMParser().parseFromString(tx, 'text/xml');
      var dets = doc.getElementsByTagName('det');
      if (!dets.length) { toast('XML sem itens.'); return; }
      var tk = ''; try { tk = localStorage.getItem('spark_token') || ''; } catch (_) {}
      var n = 0, tot = 0; var itens = [];
      for (var i = 0; i < dets.length && i < 100; i++) {
        try {
          var p = dets[i].getElementsByTagName('prod')[0];
          var gv = function (t) { var e = p.getElementsByTagName(t)[0]; return e ? (e.textContent || '') : ''; };
          var nome = gv('xProd').slice(0, 60);
          var qtd = parseFloat((gv('qCom') || '1').replace(',', '.')) || 1;
          var vu = parseFloat((gv('vUnCom') || '0').replace(',', '.')) || 0;
          if (!nome || !(vu > 0)) continue;
          itens.push({ nome: nome, qtd: qtd, valor: Math.round(vu * qtd * 100) / 100 });
          tot += vu * qtd; n++;
        } catch (_) {}
      }
      tot = Math.round(tot * 100) / 100;
      if (!n) { toast('Nada legível no XML.'); return; }
      try {
        itens.forEach(function (it) { try { var vu = it.qtd ? it.valor / it.qtd : it.valor; _mergeNota(it.nome, it.qtd, vu); } catch (_) {} });
        if (typeof renderShoppingList === 'function') renderShoppingList();
        if (typeof updateKPIs === 'function') updateKPIs();
        if (tk && tot > 0) {
          await fetch(API + '/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tk }, body: JSON.stringify({ mercado: 'NFP-SP (XML)', total: tot, itens: itens }) });
          await _posNota(n + ' itens do XML! Lista corrigida com preço real + R$ ' + tot.toFixed(2).replace('.', ',') + ' no Financeiro + geladeira ✅');
        } else { await _posNota(n + ' itens do XML na lista com preço real!'); }
      } catch (_) { toast(n + ' itens lidos!'); }
    } catch (_) { toast('XML inválido.'); }
  };
  window.sparkQR = function () {
    try {
      var t = window._sparkZap || listaAtual().map(function (x) { return '- ' + x.nome + ' x' + x.qtd; }).join('\n');
      var img = document.getElementById('spark-qr-img');
      if (img) { img.src = API + '/qr?texto=' + encodeURIComponent(('Lista spark market:\n' + t).slice(0, 400)); img.style.display = 'block'; }
      toast('QR gerado!');
    } catch (_) {}
  };
  /* VOZ push-to-talk */
  var rec = null, chunks = [], holding = false, recLock = false, holdT0 = 0;
  function pickMime() {
    try {
      var cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
      for (var i = 0; i < cands.length; i++) { try { if (window.MediaRecorder && MediaRecorder.isTypeSupported(cands[i])) return cands[i]; } catch (_) {} }
    } catch (_) {}
    return '';
  }
  function micState(rec) { try { var m = document.getElementById('spark-mic'); if (!m) return; if (rec) { m.textContent = '\uD83D\uDD34 Gravando... TOQUE PARA ENVIAR'; m.style.background = '#dc2626'; } else { m.textContent = '\uD83C\uDFA4 SEGURE PARA FALAR'; m.style.background = '#0284c7'; } } catch (_) {} }
  async function vozFim() {
    if (!holding) return; holding = false;
    if (!recLock && (Date.now() - holdT0 < 350)) { recLock = true; micState(true); try { toast('Gravando... TOQUE DE NOVO para enviar.'); } catch (_) {} return; }
    recLock = false;
    try { if (rec && rec.state !== 'inactive') rec.stop(); } catch (_) {}
  }
  async function vozIni(ev) {
    if (ev) { try { ev.preventDefault(); } catch (_) {} }
    if (recLock && rec && rec.state !== 'inactive') { recLock = false; holding = false; try { rec.stop(); } catch (_) {} return; }
    holding = true; chunks = []; holdT0 = Date.now();
    toast('Ouvindo... solte para enviar.');
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      var mime = pickMime();
      rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      rec.ondataavailable = function (e) { try { if (e.data && e.data.size) chunks.push(e.data); } catch (_) {} };
      rec.onstop = async function () {
        try { micState(false); } catch (_) {}
        try { stream.getTracks().forEach(function (t) { try { t.stop(); } catch (_) {} }); } catch (_) {}
        if (!chunks.length) { toast('Nada gravado. Segure e fale.'); return; }
        try {
          var blob = new Blob(chunks, { type: (rec.mimeType || 'audio/webm') });
          var ext = 'webm';
          try { if ((rec.mimeType || '').indexOf('mp4') >= 0) ext = 'm4a'; else if ((rec.mimeType || '').indexOf('ogg') >= 0) ext = 'ogg'; } catch (_) {}
          toast('Transcrevendo...');
          var tr = await fetch(API + '/ia/transcrever?ext=' + ext, { method: 'POST', headers: { 'Content-Type': blob.type || 'audio/webm' }, body: blob });
          var tj = await tr.json();
          if (!tj || !tj.ok) { toast('Fale de novo: 1 toque, fale a lista, 1 toque p/ enviar.'); return; }
          toast('Entendendo lista...');
          var en = await api((window.SPARK_APP === 'pet') ? '/ia/entender-pet' : '/ia/entender', { texto: tj.texto });
          if (!en || !en.ok || !en.itens || !en.itens.length) { toast('Disse: "' + (tj.texto || '').slice(0, 80) + '" — sem itens.'); return; }
          try {
            window.pendingEntities = en.itens.map(function (o) { return { name: o.nome, qty: o.qtd, unit: 'un', basePrice: 0 }; });
            try {
              window.pendingEntities.forEach(function (o) {
                fetch(API + '/precos?item=' + encodeURIComponent(String(o.name || '').toLowerCase())).then(function (rr) { return rr.json(); }).then(function (jj) {
                  try { if (jj && jj.media) { o.basePrice = parseFloat(jj.media) || 0; var cb = document.getElementById('parsed-entities-code'); if (cb) cb.textContent = JSON.stringify(window.pendingEntities, null, 2); } } catch (_) {}
                }).catch(function () {});
              });
            } catch (_) {}
            var codeBox = document.getElementById('parsed-entities-code');
            var jsonContainer = document.getElementById('ai-parsed-json');
            var tbox = document.getElementById('audio-transcript-box');
            if (tbox) tbox.textContent = '"' + tj.texto + '"';
            if (codeBox) codeBox.textContent = JSON.stringify(window.pendingEntities, null, 2);
            if (jsonContainer) jsonContainer.style.display = 'block';
            try { var _navs = document.querySelectorAll('.nav-item'); if (_navs && _navs[1]) switchTab('ia', _navs[1]); } catch (_) {}
            try { var _jb = document.getElementById('ai-parsed-json'); if (_jb) _jb.scrollIntoView({ block: 'center' }); } catch (_) {}
          } catch (_) {}
          toast(en.itens.length + ' itens! Toque Inserir.');
        } catch (_) { toast('Falha de rede no audio.'); }
      };
      rec.start();
    } catch (_) { holding = false; toast('Microfone bloqueado. Libere no cadeado.'); }
  }
  /* VISAO */
  window.sparkVerFoto = async function (input) {
    try {
      var f = input.files && input.files[0];
      if (!f) return;
      toast('Analisando foto...');
      var b64 = await new Promise(function (res, rej) {
        var r = new FileReader();
        r.onload = function () { try { res(String(r.result).split(',')[1]); } catch (e) { rej(e); } };
        r.onerror = rej; r.readAsDataURL(f);
      });
      var r = await api('/ia/ver', { foto_b64: b64 });
      if (!r || !r.ok) { toast('Visao nao viu nada.'); return; }
      var txt = r.descricao_pt || r.descricao || '';
      var en = await api((window.SPARK_APP === 'pet') ? '/ia/entender-pet' : '/ia/entender', { texto: txt });
      if (en && en.ok && en.itens && en.itens.length) {
        window.pendingEntities = en.itens.map(function (o) { return { name: o.nome, qty: o.qtd, unit: 'un', basePrice: 0 }; });
            try {
              window.pendingEntities.forEach(function (o) {
                fetch(API + '/precos?item=' + encodeURIComponent(String(o.name || '').toLowerCase())).then(function (rr) { return rr.json(); }).then(function (jj) {
                  try { if (jj && jj.media) { o.basePrice = parseFloat(jj.media) || 0; var cb = document.getElementById('parsed-entities-code'); if (cb) cb.textContent = JSON.stringify(window.pendingEntities, null, 2); } } catch (_) {}
                }).catch(function () {});
              });
            } catch (_) {}
        var codeBox = document.getElementById('parsed-entities-code');
        var jsonContainer = document.getElementById('ai-parsed-json');
        if (codeBox) codeBox.textContent = JSON.stringify(window.pendingEntities, null, 2);
        if (jsonContainer) jsonContainer.style.display = 'block';
        try { var _navs = document.querySelectorAll('.nav-item'); if (_navs && _navs[1]) switchTab('ia', _navs[1]); } catch (_) {}
        try { var _jb = document.getElementById('ai-parsed-json'); if (_jb) _jb.scrollIntoView({ block: 'center' }); } catch (_) {}
        toast('Foto: ' + en.itens.length + ' itens. Toque Inserir.');
      } else { toast('Vi: ' + txt.slice(0, 100)); }
    } catch (_) { toast('Foto falhou.'); }
    try { input.value = ''; } catch (_) {}
  };
  /* IA CONTINUA: cesta + predicao + rotina (com conta: personalizado; sem conta: geral) */
  async function sparkIA(path) {
    try {
      var tk = ''; try { tk = localStorage.getItem('spark_token') || ''; } catch (_) {}
      var hd = {}; if (tk) hd = { 'Authorization': 'Bearer ' + tk };
      var r = await fetch(API + path, { headers: hd });
      return await r.json();
    } catch (_) { return null; }
  }
  function sparkIABox(html) { try { var b = document.getElementById('spark-agente-box'); if (b) b.innerHTML = html; } catch (_) {} }
  window.sparkIACesta = async function () {
    toast('Montando sua cesta...');
    var j = await sparkIA('/ia/cesta-personalizada');
    var c = (j && j.cesta) || {};
    if (!j || !j.ok || !(c.itens || []).length) { toast('Cesta indisponivel.'); return; }
    var h = '<p style="font-size:11px"><b>Cesta classe ' + esc(c.classe || '') + '</b> <span style="color:#64748b">' + esc(c.nome || '') + (c.custo_familia ? ' · ~R$ ' + c.custo_familia + '/mes' : '') + '</span></p>';
    (c.itens || []).slice(0, 12).forEach(function (it) {
      var nm = (it && (it.item || it.nome)) || it;
      var qt = (it && it.qtd) ? ' <span style="color:#64748b">· ' + esc(it.qtd) + '</span>' : '';
      h += '<div style="font-size:11px;border-bottom:1px solid #f1f5f9;padding:3px 0">🧺 ' + esc(nm) + qt + '</div>';
    });
    sparkIABox(h);
    toast('Cesta pronta!');
  };
  window.sparkIARepo = async function () {
    toast('Prevendo reposicao...');
    var j = await sparkIA('/ia/predicao-reposicao');
    var L = (j && j.predicoes) || [];
    if (!j || !j.ok) { toast('Falhou.'); return; }
    if (!L.length) { sparkIABox('<p style="font-size:11px">Nada a repor nos proximos 7 dias. Estoque em dia! ✅</p>'); return; }
    var h = '<p style="font-size:11px"><b>' + L.length + ' para repor (7 dias)</b></p>';
    L.slice(0, 15).forEach(function (o) {
      var cor = o.urgencia === 'alta' ? '#dc2626' : '#b45309';
      h += '<div style="font-size:11px;border-bottom:1px solid #f1f5f9;padding:3px 0"><b style="color:' + cor + '">●</b> ' + esc(o.item) + ' <span style="color:#64748b">· ' + esc(o.motivo || '') + '</span></div>';
    });
    sparkIABox(h);
    toast('Predicao pronta!');
  };
  window.sparkIARot = async function () {
    toast('Montando rotina...');
    var hnow = 12; try { hnow = new Date().getHours(); } catch (_) {}
    var j = await sparkIA('/ia/rotina-diaria?hora=' + hnow);
    var r = (j && j.rotina) || {};
    if (!j || !j.ok) { toast('Falhou.'); return; }
    sparkIABox('<p style="font-size:11px"><b>Agora: ' + esc(r.bloco || '') + '</b><br>' + esc(r.texto || '') + '</p><p style="font-size:11px;color:#64748b">Depois (' + esc(r.proximo || '') + '): ' + esc(r.proximo_texto || '') + '</p>');
    toast('Rotina pronta!');
  };
  /* monta painel */
  var cidades = ['', 'Ribeirao Preto', 'Bonfim Paulista', 'Cravinhos', 'Sertaozinho', 'Jardinopolis', 'Serrana', 'Serra Azul', 'Cajuru', 'Dumont', 'Barrinha', 'Jaboticabal', 'Brodowski', 'Batatais'];
  var opts = cidades.map(function (c) { return '<option value="' + c + '">' + (c || 'Todas as cidades') + '</option>'; }).join('');
  var d = document.createElement('div');
  d.id = 'spark-real';
  d.innerHTML =
    '<div style="border:2px solid #0ea5e9;border-radius:16px;padding:14px;margin:12px 0;background:#f0f9ff">'
    + '<div style="font-weight:800;font-size:14px;margin-bottom:2px">⚡ spark Agente Real</div>'
    + '<div id="spark-msg" style="font-size:11px;color:#0369a1;margin-bottom:8px">Tudo funcional. Segure o microfone e fale a lista.</div>'
    + '<button id="spark-mic" style="width:100%;background:#0284c7;color:#fff;font-weight:800;border:none;border-radius:12px;padding:14px;font-size:14px">🎤 SEGURE PARA FALAR</button>'
    + '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><select id="spark-cidade" style="flex:1;border:1px solid #bae6fd;border-radius:8px;padding:8px;font-size:12px">' + opts + '</select></div>'
    + '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><label for="spark-ver-foto" style="flex:1;background:#fff;border:1px solid #bae6fd;border-radius:8px;padding:8px;font-size:12px;text-align:center;cursor:pointer">📷 Foto da despensa</label>'
    + '<label for="spark-ver-galeria" style="flex:1;background:#fff;border:1px solid #bae6fd;border-radius:8px;padding:8px;font-size:12px;text-align:center;cursor:pointer">🖼 Galeria</label></div>'
    + '<input type="file" id="spark-ver-foto" accept="image/*" capture="environment" style="position:absolute;width:1px;height:1px;opacity:0" onchange="sparkVerFoto(this)">'
    + '<input type="file" id="spark-ver-galeria" accept="image/*" style="position:absolute;width:1px;height:1px;opacity:0" onchange="sparkVerFoto(this)">'
    + '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><input id="spark-busca" placeholder="Buscar mercado, adega, bairro..." style="flex:1;border:1px solid #bae6fd;border-radius:8px;padding:8px;font-size:12px">'
    + '<button id="spark-gps" style="background:#fff;border:1px solid #bae6fd;border-radius:8px;padding:8px;font-size:12px">📍 GPS</button></div>'
    + '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button id="spark-loc-btn" style="flex:1;background:#0ea5e9;color:#fff;border:none;border-radius:8px;padding:10px;font-size:12px;font-weight:700">Onde comprar</button>'
    + '<button id="spark-ag-btn" style="flex:1;background:#16a34a;color:#fff;border:none;border-radius:8px;padding:10px;font-size:12px;font-weight:700">Agente otimizar</button></div>'
    + '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button id="spark-ia-cesta" style="flex:1;background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:10px;font-size:11px;font-weight:700">Cesta da minha classe</button>'
    + '<button id="spark-ia-repo" style="flex:1;background:#0369a1;color:#fff;border:none;border-radius:8px;padding:10px;font-size:11px;font-weight:700">Reposicao IA</button>'
    + '<button id="spark-ia-rot" style="flex:1;background:#b45309;color:#fff;border:none;border-radius:8px;padding:10px;font-size:11px;font-weight:700">Rotina de hoje</button></div>'
    + '<div id="spark-agente-box" style="margin-top:8px"></div>'
    + '<div id="spark-locais" style="margin-top:8px;max-height:260px;overflow:auto"></div>'
    + '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button onclick="sparkZap()" style="flex:1;background:#25D366;color:#fff;border:none;border-radius:8px;padding:10px;font-size:12px;font-weight:700">WhatsApp</button>'
    + '<button onclick="sparkPDF()" style="flex:1;background:#0f172a;color:#fff;border:none;border-radius:8px;padding:10px;font-size:12px;font-weight:700">PDF</button>'
    + '<button onclick="sparkPrint()" style="flex:1;background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:10px;font-size:12px">Imprimir</button>'
    + '<button onclick="sparkQR()" style="flex:1;background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:10px;font-size:12px">QR</button></div>'
    + '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button onclick="document.getElementById(\'spark-nota\').click()" style="flex:1;background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:10px;font-size:12px;font-weight:700">🧾 Ler notinha</button></div>'
    + '<input type="file" id="spark-nota" accept="image/*" style="display:none" onchange="sparkNota(this)">'
    + '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button onclick="document.getElementById(\'spark-xml\').click()" style="flex:1;background:#0f172a;color:#fff;border:none;border-radius:8px;padding:10px;font-size:12px;font-weight:700">🧾 XML da NFP-SP</button></div>'
    + '<input type="file" id="spark-xml" accept=".xml,text/xml" style="display:none" onchange="sparkXML(this)">'
    + '<img id="spark-qr-img" style="display:none;max-width:200px;margin:8px auto" alt="QR da lista">'
    + '</div>';
  function boot() {
    try {
      var host = document.querySelector('.interaction-box') || document.body;
      if (host && host.parentNode) host.parentNode.insertBefore(d, host.nextSibling);
      else document.body.appendChild(d);
      var mic = document.getElementById('spark-mic');
      mic.addEventListener('pointerdown', vozIni);
      mic.addEventListener('pointerup', vozFim);
      mic.addEventListener('pointerleave', function () { try { if (recLock) return; } catch (_) {} vozFim(); });
      mic.addEventListener('contextmenu', function (e) { try { e.preventDefault(); } catch (_) {} });
      document.getElementById('spark-gps').addEventListener('click', usarGPS);
      document.getElementById('spark-loc-btn').addEventListener('click', carregarLocais);
      document.getElementById('spark-ag-btn').addEventListener('click', window.sparkAgente);
      document.getElementById('spark-ia-cesta').addEventListener('click', window.sparkIACesta);
      document.getElementById('spark-ia-repo').addEventListener('click', window.sparkIARepo);
      document.getElementById('spark-ia-rot').addEventListener('click', window.sparkIARot);
      var cb = document.getElementById('spark-cidade');
      if (cb) cb.addEventListener('change', carregarLocais);
      try { carregarLocais(); } catch (_) {}
    } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
