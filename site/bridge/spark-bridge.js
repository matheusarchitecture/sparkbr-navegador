/* SparkBR Bridge SDK 2.1 — authenticated by the existing HttpOnly SparkBR session cookie. */
(() => {
  'use strict';
  if (window.SparkBR && window.SparkBR.ecosystem) return;
  const API = '/navegador/api/ecosystem';
  const APP_IDS = new Set(['spark','sparkmat','sparkpet','saude','agua','posto','familia','financeiro','farmacia','dose','astromatch','contas','cardapio','agenda','cofrinho','faxina','escola','carteirinha','energia','bico','sono','mural','ideias']);
  function currentApp() {
    const fromBody = document.body && document.body.dataset ? document.body.dataset.sparkPage : '';
    if (APP_IDS.has(fromBody)) return fromBody;
    const slug = location.pathname.split('/').filter(Boolean)[0] || 'familia';
    return APP_IDS.has(slug) ? slug : 'familia';
  }
  async function request(route, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    const response = await fetch(API + '/' + route, {
      method: options.method || 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    let result = {};
    try { result = await response.json(); } catch {}
    if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a solicitação.');
    return result;
  }
  const api = {
    get appId() { return currentApp(); },
    session: () => request('session'),
    selectFamily: familyId => request('family/select', { method: 'POST', body: { familyId } }),
    invite: () => request('invite', { method: 'POST', body: {} }),
    join: code => request('join', { method: 'POST', body: { code } }),
    collections: () => request('collections'),
    list: (collection, appId = currentApp()) => request('data?collection=' + encodeURIComponent(collection) + '&appId=' + encodeURIComponent(appId)),
    save: (collection, data, appId = currentApp()) => request('data', { method: 'POST', body: { collection, appId, data } }),
    update: (id, data, expectedVersion, appId = currentApp()) => request('data/' + encodeURIComponent(id), { method: 'PUT', body: { appId, data, expectedVersion } }),
    remove: (id, appId = currentApp()) => request('data/' + encodeURIComponent(id), { method: 'DELETE', body: { appId } }),
    subscribe(collection, callback, appId = currentApp()) {
      let stopped = false, running = false;
      const timer = window.setInterval(async () => {
        if (stopped || running || document.hidden) return;
        running = true;
        try { const result = await api.list(collection, appId); callback({ collection, records: result.records || [], action: 'poll' }); }
        catch {}
        finally { running = false; }
      }, 8000);
      return () => { stopped = true; window.clearInterval(timer); };
    },
    share(collection, data, appId = currentApp()) {
      return api.save(collection, data, appId).then(result => {
        window.dispatchEvent(new CustomEvent('sparkbr:shared', { detail: { collection, record: result.record } }));
        return result;
      });
    },
    shoppingAdd(item) {
      const value = typeof item === 'string' ? item.trim() : String(item && (item.item || item.name || item.title) || '').trim();
      if (!value) return Promise.reject(new Error('Informe o item da lista.'));
      return api.share('shopping-list', { item: value, quantity: 1, unit: 'un', checked: false, origin: 'family-panel' }, 'spark');
    },
    syncShopping(items) {
      const normalized = (Array.isArray(items) ? items : []).slice(0, 200).map(x => ({
        item: String(x && (x.item || x.nome || x.name) || '').trim().slice(0, 160),
        quantity: Math.max(1, Math.min(999, Number(x && (x.quantity ?? x.qtd ?? x.qty ?? 1)) || 1)),
        unit: String(x && x.unit || 'un').trim().slice(0, 12),
        checked: !!(x && x.checked)
      })).filter(x => x.item);
      return request('shopping-sync', { method: 'POST', body: { appId: 'spark', items: normalized } });
    },
    emit(action, detail = {}) { window.dispatchEvent(new CustomEvent('sparkbr:' + action, { detail })); }
  };
  window.SparkBR = Object.assign(window.SparkBR || {}, { ecosystem: api, share: api.share });
  window.addEventListener('sparkbr:share', event => {
    const d = event.detail || {};
    if (!d.collection || !d.data) return;
    api.share(d.collection, d.data, d.appId || currentApp()).then(
      result => window.dispatchEvent(new CustomEvent('sparkbr:share-result', { detail: { ok: true, result } })),
      error => window.dispatchEvent(new CustomEvent('sparkbr:share-result', { detail: { ok: false, error: error.message } }))
    );
  });
  window.dispatchEvent(new CustomEvent('sparkbr:bridge-ready', { detail: { appId: currentApp() } }));
})();
