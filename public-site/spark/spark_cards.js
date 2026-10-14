/* spark cards v1 - economia viciante: recorde + bom momento. Mesmo padrao, so adiciona. */
(function () {
  'use strict';
  if (window._sparkCards) return; window._sparkCards = true;
  var LS_REC = 'spark_eco_recorde';
  var cacheMedia = {};
  function ST() { try { return state; } catch (_) { try { return window.state; } catch (_) { return null; } } }
  function fmt(v) { try { return 'R$ ' + v.toFixed(2).replace('.', ','); } catch (_) { return ''; } }
  function totais() {
    var st = ST(); if (!st || !st.items || !st.items.length) return null;
    var mults = Object.keys(st.markets).map(function (k) { return { k: k, m: st.markets[k].multiplier, n: st.markets[k].name.split(' ')[0] }; });
    var cur = st.markets[st.activeMarket];
    var tCur = 0, base = 0;
    st.items.forEach(function (i) { if (!i.checked) { var v = (parseFloat(i.basePrice) || 0) * (parseFloat(i.qty) || 0); tCur += v * cur.multiplier; base += v; } });
    if (!base) return null;
    var best = mults.slice().sort(function (a, b) { return a.m - b.m; })[0];
    return { atual: tCur, min: base * best.m, eco: Math.max(0, tCur - base * best.m), melhor: best.n, atualNome: cur.name.split(' ')[0] };
  }
  function recorde() { try { return parseFloat(localStorage.getItem(LS_REC) || '0') || 0; } catch (_) { return 0; } }
  function card() {
    try {
      var t = totais();
      var box = document.getElementById('spark-eco-card');
      if (!t || t.eco < 0.05) { if (box) box.style.display = 'none'; return; }
      var rec = recorde();
      var novoRec = false;
      if (t.eco > rec) { try { localStorage.setItem(LS_REC, String(Math.round(t.eco * 100) / 100)); } catch (_) {} rec = t.eco; novoRec = true; }
      if (!box) {
        var ref = document.getElementById('savings-tip') || document.getElementById('shopping-list-items');
        if (!ref || !ref.parentNode) return;
        box = document.createElement('div');
        box.id = 'spark-eco-card';
        ref.parentNode.insertBefore(box, ref.nextSibling);
      }
      box.style.display = 'block';
      box.innerHTML = '<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border-radius:12px;padding:10px 12px;margin:8px;font-size:12px;box-shadow:0 2px 10px rgba(5,150,105,.35)">' +
        '<div style="font-weight:800;font-size:14px">🔥 <span id="spark-eco-num">' + fmt(t.eco) + '</span> de economia</div>' +
        '<div style="opacity:.92">trocando ' + t.atualNome + ' pelo ' + t.melhor + ' nesta lista</div>' +
        '<div style="margin-top:4px;font-size:11px;opacity:.92">🏆 Seu recorde: <b>' + fmt(rec) + '</b>' + (novoRec ? ' — NOVO! 🎉' : '') + ' <span id="spark-bommomento"></span></div></div>';
      var el = document.getElementById('spark-eco-num');
      if (el) {
        var v0 = 0, v1 = t.eco, p0 = null;
        try {
          p0 = performance.now();
          (function step(p) { var k = Math.min(1, (p - p0) / 600); el.textContent = fmt(v1 * (0.2 + 0.8 * k)); if (k < 1) requestAnimationFrame(step); })(p0);
        } catch (_) {}
      }
      bomMomento();
    } catch (_) {}
  }
  function bomMomento() {
    try {
      var st = ST(); if (!st || !st.items) return;
      var nomes = st.items.filter(function (i) { return !i.checked && i.name && cacheMedia[i.name] === undefined; }).slice(0, 10).map(function (i) { return i.name; });
      if (!nomes.length) { pintaBom(); return; }
      var um = nomes[0];
      fetch('/spark-api/precos?item=' + encodeURIComponent(um.toLowerCase())).then(function (r) { return r.json(); }).then(function (j) {
        try { cacheMedia[um] = (j && j.media) || null; } catch (_) { cacheMedia[um] = null; }
        setTimeout(bomMomento, 400);
      }).catch(function () { try { cacheMedia[um] = null; } catch (_) {} });
      function pintaBom() {
        try {
          var n = 0;
          st.items.forEach(function (i) {
            try { if (!i.checked && cacheMedia[i.name] && (parseFloat(i.basePrice) || 0) < cacheMedia[i.name]) n++; } catch (_) {}
          });
          var el = document.getElementById('spark-bommomento');
          if (el) el.textContent = n ? '· 👍 ' + n + ' em bom momento' : '';
        } catch (_) {}
      }
      pintaBom();
    } catch (_) {}
  }
  var ct = null;
  function agenda() { try { if (ct) clearTimeout(ct); } catch (_) {} ct = setTimeout(card, 800); }
  function envolve() {
    try {
      var cur = window.renderShoppingList;
      if (cur && !cur._cardsOn) {
        var w = function () { try { if (cur) cur.apply(this, arguments); } catch (_) {} agenda(); };
        w._cardsOn = true;
        window.renderShoppingList = w;
      }
    } catch (_) {}
  }
  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', agenda);
    else agenda();
    window.addEventListener('load', function () { envolve(); agenda(); });
    document.addEventListener('spark-list', agenda);
    envolve();
  } catch (_) {}
})();
