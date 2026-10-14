/**
 * SPARK DOSE HEALTH — API Client & Offline Sync Queue
 * AUTH-FIX 2026-10-08: sem fallback demo, 401 exige login, demo explicita isolada
 */

const API_BASE = '/dosefiel-api';
const OFFLINE_QUEUE_KEY = 'dosefiel_offline_actions_queue';

class SparkDoseAPI {
  static getToken() {
    try { return localStorage.getItem('dosefiel_token') || ''; } catch(e) { return ''; }
  }
  static isDemoSession() {
    try { return localStorage.getItem('dosefiel_demo') === '1'; } catch(e) { return false; }
  }
  static getHeaders() {
    const h = { 'Content-Type': 'application/json' };
    const t = this.getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  }

  static handleUnauthorized(status, errData) {
    if (status === 401) {
      try {
        const msg = (errData && errData.error) || 'Sessão expirada. Entre de novo.';
        if (window.app && window.app.onSessionExpired) window.app.onSessionExpired(msg);
        else {
          try { localStorage.removeItem('dosefiel_token'); } catch(e) {}
          try { localStorage.removeItem('dosefiel_demo'); } catch(e) {}
          alert('Sessão expirada. Entre de novo.');
          if (window.app && window.app.routeTo) window.app.routeTo('screen-login', true);
          else window.location.hash = 'screen-login';
        }
      } catch(e) {}
    }
    if (status === 403) {
      // deixa o chamador mostrar "acesso negado"
    }
  }

  static async request(endpoint, options = {}) {
    const url = API_BASE + endpoint;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      }
    };

    if (!navigator.onLine && options.method && options.method !== 'GET') {
      console.warn('[Spark Dose API] Dispositivo offline. Enfileirando ação localmente...');
      return this.enqueueOfflineAction(endpoint, options);
    }

    let response;
    try {
      response = await fetch(url, config);
    } catch (err) {
      if (options.method && options.method !== 'GET') {
        // rede falhou: enfileira, mas nunca para 401/403 (esses vêm de response, não de catch)
        console.warn('[Spark Dose API] Falha na rede, enfileirando ação para sincronização futura:', err);
        return this.enqueueOfflineAction(endpoint, options);
      }
      throw err;
    }
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      this.handleUnauthorized(response.status, errData);
      const e = new Error(errData.error || ('Erro HTTP ' + response.status));
      e.status = response.status;
      e.code = errData.code || '';
      throw e;
    }
    return await response.json();
  }

  // Fila Offline
  static enqueueOfflineAction(endpoint, options) {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    const actionItem = {
      local_id: 'offline-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      endpoint,
      method: options.method,
      body: options.body,
      queued_at: new Date().toISOString()
    };
    queue.push(actionItem);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

    // Notificar UI de sincronização pendente
    window.dispatchEvent(new CustomEvent('dosefiel:offline_action_queued', { detail: actionItem }));

    return {
      status: 'pending_offline',
      local_id: actionItem.local_id,
      message: 'Ação salva localmente com segurança. Será sincronizada assim que a internet retornar.'
    };
  }

  static async flushOfflineQueue() {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    if (queue.length === 0) return;

    console.log('[Spark Dose API] Sincronizando ' + queue.length + ' ações offline pendentes...');
    const remaining = [];

    for (const item of queue) {
      try {
        const r = await fetch(API_BASE + item.endpoint, {
          method: item.method,
          headers: this.getHeaders(),
          body: item.body
        });
        if (r.status === 401 || r.status === 403) {
          console.warn('[Spark Dose API] Ação ' + item.local_id + ' recusada (' + r.status + '), descartando fila.');
          continue;
        }
        console.log('[Spark Dose API] Ação ' + item.local_id + ' sincronizada com sucesso!');
      } catch (err) {
        console.error('[Spark Dose API] Falha ao sincronizar ' + item.local_id + ':', err);
        remaining.push(item);
      }
    }

    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    window.dispatchEvent(new CustomEvent('dosefiel:queue_flushed', { detail: { remaining: remaining.length } }));
  }

  // Auth
  static async loginAccount(email, password, remember) {
    const body = { email, password };
    if (remember !== undefined) body.remember = !!remember;
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
  }
  static async demoLogin() {
    return this.request('/auth/demo', { method: 'POST', body: JSON.stringify({}) });
  }
  static logoutLocal() {
    try { localStorage.removeItem('dosefiel_token'); } catch(e) {}
    try { localStorage.removeItem('dosefiel_demo'); } catch(e) {}
  }

  // Métodos Específicos
  static async getMe() {
    return this.request('/auth/me');
  }

  static async getTodaySchedule(profileId) {
    return this.request('/schedule/today?profile_id=' + encodeURIComponent(profileId));
  }

  static async getCalendar(profileId, fromDate, toDate) {
    return this.request('/schedule/calendar?profile_id=' + encodeURIComponent(profileId) + '&from=' + encodeURIComponent(fromDate) + '&to=' + encodeURIComponent(toDate));
  }

  static async getAssistedMemory(profileId) {
    return this.request('/schedule/assisted-memory?profile_id=' + encodeURIComponent(profileId));
  }

  static async confirmDose(occurrenceId, status, notes, requestId) {
    status = status || 'taken_on_time';
    notes = notes || '';
    const rid = requestId || (crypto.randomUUID ? crypto.randomUUID() : 'req-'+Date.now()+'-'+Math.random().toString(36).slice(2));
    return this.request('/occurrences/' + encodeURIComponent(occurrenceId) + '/confirm', {
      method: 'POST',
      body: JSON.stringify({ status, notes, request_id: rid })
    });
  }

  static async snoozeDose(occurrenceId, minutes) {
    minutes = minutes === undefined ? 15 : minutes;
    return this.request('/occurrences/' + encodeURIComponent(occurrenceId) + '/snooze', {
      method: 'POST',
      body: JSON.stringify({ minutes })
    });
  }

  static async skipDose(occurrenceId, reason, notes) {
    reason = reason || 'forgot';
    notes = notes || '';
    return this.request('/occurrences/' + encodeURIComponent(occurrenceId) + '/skip', {
      method: 'POST',
      body: JSON.stringify({ reason, notes })
    });
  }

  static async deleteOccurrence(occurrenceId) {
    return this.request('/occurrences/' + encodeURIComponent(occurrenceId), { method: 'DELETE' });
  }

  static async getRegimens(profileId) {
    if (profileId) return this.request('/regimens?profile_id=' + encodeURIComponent(profileId));
    return this.request('/regimens');
  }

  static async deleteRegimen(regId) {
    return this.request('/regimens/' + encodeURIComponent(regId), { method: 'DELETE' });
  }

  static async searchCatalogoBusca(q) {
    return this.request('/catalogo/publico?q=' + encodeURIComponent(q));
  }

  static async updateRegimen(regId, data) {
    return this.request('/regimens/' + encodeURIComponent(regId), {method:'PUT', body: JSON.stringify(data)});
  }

  static async acceptInvite(token) {
    return this.request('/caregivers/accept', {method:'POST', body: JSON.stringify({token})});
  }

  static async searchCatalog(query, options) {
    options = options || {};
    let url = '/catalog/search?q=' + encodeURIComponent(query);
    if (options.controlled !== undefined) url += '&controlled=' + encodeURIComponent(options.controlled);
    if (options.specialty) url += '&specialty=' + encodeURIComponent(options.specialty);
    if (options.form) url += '&form=' + encodeURIComponent(options.form);
    return this.request(url);
  }

  static async getDrugDetails(drugId) {
    return this.request('/catalog/drugs/' + encodeURIComponent(drugId));
  }

  static async createRegimen(regimenData) {
    return this.request('/regimens', {
      method: 'POST',
      body: JSON.stringify(regimenData)
    });
  }

  static async getInventory(profileId) {
    return this.request('/inventory?profile_id=' + encodeURIComponent(profileId));
  }

  static async getSymptoms(profileId) {
    return this.request('/symptoms?profile_id=' + encodeURIComponent(profileId));
  }

  static async recordSymptom(symptomData) {
    return this.request('/symptoms', {
      method: 'POST',
      body: JSON.stringify(symptomData)
    });
  }

  static async getDocuments(profileId) {
    return this.request('/documents?profile_id=' + encodeURIComponent(profileId));
  }

  static async getAdherenceReport(profileId, days) {
    days = days || 30;
    return this.request('/reports/adherence?profile_id=' + encodeURIComponent(profileId) + '&days=' + encodeURIComponent(days));
  }

  static async downloadAdherencePDF(profileId, days) {
    days = days || 30;
    const url = API_BASE + '/reports/adesao.pdf?profile_id=' + encodeURIComponent(profileId) + '&days=' + encodeURIComponent(days);
    const heads = this.getToken() ? { 'Authorization': 'Bearer ' + this.getToken() } : {};
    const r = await fetch(url, { headers: heads });
    if (r.status === 401) { this.handleUnauthorized(401, {}); throw new Error('Sessao expirada. Entre de novo.'); }
    if (!r.ok) throw new Error('Falha PDF (' + r.status + ')');
    const blob = await r.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dosefiel-adesao.pdf';
    document.body.appendChild(a); a.click();
    setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch(e) {} }, 4000);
    return true;
  }

    static async _baixarArquivo(url, filename, mime) {
    const heads = this.getToken() ? { Authorization: "Bearer " + this.getToken() } : {};
    const r = await fetch(url, { headers: heads });
    if (r.status === 401) { this.handleUnauthorized(401, {}); throw new Error("Sessao expirada. Entre de novo."); }
    if (!r.ok) { let e = {}; try { e = await r.clone().json(); } catch(_e) {} throw new Error((e && e.error) || ("Falha " + r.status)); }
    const blob = await r.blob();
    const file = new File([blob], filename, { type: mime || blob.type || "application/octet-stream" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: filename }); return true; }
    } catch(_e) {}
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch(e) {} }, 4000);
    return true;
  }
  static async baixeConsultaPDF(id) {
    const url = API_BASE + "/consultas/" + encodeURIComponent(id) + ".pdf";
    return this._baixarArquivo(url, "dosefiel-consulta-" + id + ".pdf", "application/pdf");
  }
  static async baixeConsultaPNG(id) {
    const url = API_BASE + "/consultas/" + encodeURIComponent(id) + ".png";
    return this._baixarArquivo(url, "dosefiel-consulta-" + id + ".png", "image/png");
  }
  static async baixeDiaPDF(profileId, data) {
    let url = API_BASE + "/relatorio/dia.pdf?profile_id=" + encodeURIComponent(profileId);
    if (data) url += "&data=" + encodeURIComponent(data);
    return this._baixarArquivo(url, "dosefiel-dia-" + (data || "hoje") + ".pdf", "application/pdf");
  }
  static async baixeDiaPNG(profileId, data) {
    let url = API_BASE + "/relatorio/dia.png?profile_id=" + encodeURIComponent(profileId);
    if (data) url += "&data=" + encodeURIComponent(data);
    return this._baixarArquivo(url, "dosefiel-dia-" + (data || "hoje") + ".png", "image/png");
  }
  static _urlConsultaPDF(id) { return API_BASE + "/consultas/" + encodeURIComponent(id) + ".pdf"; }
  static _urlConsultaPNG(id) { return API_BASE + "/consultas/" + encodeURIComponent(id) + ".png"; }
  static _urlDiaPDF(profileId, data) { let u = API_BASE + "/relatorio/dia.pdf?profile_id=" + encodeURIComponent(profileId); if (data) u += "&data=" + encodeURIComponent(data); return u; }
  static _urlDiaPNG(profileId, data) { let u = API_BASE + "/relatorio/dia.png?profile_id=" + encodeURIComponent(profileId); if (data) u += "&data=" + encodeURIComponent(data); return u; }

  static async receitaFotoIA(profileId, imageBase64) {
    try {
      return await this.request('/receita/foto', {method:'POST', body: JSON.stringify({profile_id: profileId, image_base64: imageBase64})});
    } catch(e) { throw e; }
  }
  static async criarRegimenFromReceita(profileId, opts) {
    opts = opts || {};
    try {
      const body = {profile_id: profileId};
      if (opts.draft_id) body.draft_id = opts.draft_id;
      if (opts.text) body.text = opts.text;
      if (opts.document_id) body.document_id = opts.document_id;
      return await this.request('/prescriptions/from-ocr', {method:'POST', body: JSON.stringify(body)});
    } catch(e) { throw e; }
  }
  static async getDocumentText(docId) {
    try { return await this.request('/documents/' + encodeURIComponent(docId) + '/text'); }
    catch(e) { throw e; }
  }
  static async listarConsultas(profileId) {
    try {
      const q = profileId ? '?profile_id=' + encodeURIComponent(profileId) : '';
      return await this.request('/consultas' + q);
    } catch(e) { throw e; }
  }
  static async criarConsulta(data) {
    try { return await this.request('/consultas', {method:'POST', body: JSON.stringify(data)}); }
    catch(e) { throw e; }
  }
  static async atualizarConsulta(id, data) {
    try { return await this.request('/consultas/' + encodeURIComponent(id), {method:'PUT', body: JSON.stringify(data)}); }
    catch(e) { throw e; }
  }
  static async excluirConsulta(id) {
    try { return await this.request('/consultas/' + encodeURIComponent(id), {method:'DELETE'}); }
    catch(e) { throw e; }
  }
  static async prontuario(profileId) {
    try { return await this.request('/prontuario?profile_id=' + encodeURIComponent(profileId)); }
    catch(e) { throw e; }
  }
  static async ocrImage(profileId, imageBase64) {
    return this.request('/documents/ocr', {
      method: 'POST',
      body: JSON.stringify({ profile_id: profileId, image_base64: imageBase64 })
    });
  }

  static async askAssistant(message, profileId) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, profile_id: profileId })
    });
  }

  static async getNotificationDiagnostics(profileId) {
    return this.request('/notifications/diagnostics?profile_id=' + encodeURIComponent(profileId));
  }

  static async sendTestNotification(profileId) {
    return this.request('/notifications/test', {
      method: 'POST',
      body: JSON.stringify({ profile_id: profileId })
    });
  }

  static async subscribePush(profileId, subscription, platform) {
    platform = platform || 'web';
    const rawKey = subscription.getKey ? subscription.getKey('p256dh') : null;
    const rawAuth = subscription.getKey ? subscription.getKey('auth') : null;
    const p256dh = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : 'mock-key';
    const auth = rawAuth ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuth))) : 'mock-auth';

    return this.request('/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        profile_id: profileId,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        platform
      })
    });
  }

  static async registerAccount(email, password, fullName, phone, birthOrObj, photoUrl) {
    let payload = {email, password, full_name: fullName, phone};
    if (birthOrObj && typeof birthOrObj === 'object') {
      payload = {email, password, ...birthOrObj};
      if (fullName && !payload.full_name) payload.full_name = fullName;
      if (phone && !payload.phone) payload.phone = phone;
    } else {
      if (birthOrObj) payload.birth_date = birthOrObj;
      if (photoUrl) payload.photo_url = photoUrl;
    }
    return this.request('/auth/register', {method:'POST', body: JSON.stringify(payload)});
  }
  static async recoverPassword(email) {
    return this.request('/auth/recover-password', {method:'POST', body: JSON.stringify({email})});
  }
  static async resetPassword(token, newPassword) {
    return this.request('/auth/reset-password', {method:'POST', body: JSON.stringify({token, new_password: newPassword})});
  }
  static async updateMe(data) {
    return this.request('/auth/me', {method:'PUT', body: JSON.stringify(data)});
  }
  static async deleteMe() {
    return this.request('/auth/me', {method:'DELETE'});
  }
  static async getAdminMetrics() {
    return this.request('/admin/metrics');
  }

  static async exportPersonalData(profileId) {
    return this.request('/privacy/export?profile_id=' + encodeURIComponent(profileId));
  }
}

// Ouvir retorno de conexão
window.addEventListener('online', () => {
  console.log('[Spark Dose] Conexão restabelecida! Sincronizando dados...');
  SparkDoseAPI.flushOfflineQueue();
});
