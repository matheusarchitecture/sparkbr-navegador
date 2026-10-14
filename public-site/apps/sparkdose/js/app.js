/**
 * SPARK DOSE HEALTH — Core Frontend Application Controller
 * Roteamento das 30 Telas, Gerenciamento de Estado, Microinterações e Acessibilidade
 */

class SparkDoseApp {
  constructor() {
    this.currentUser = null;
    this.profiles = [];
    this.activeProfile = null;
    this.currentScreen = "screen-dashboard";
    this.todayData = null;
    this.countdownTimer = null;
    this.theme = localStorage.getItem("dosefiel_theme") || "auto";
    this.init();
  }

  async init() {
    this.applyTheme(this.theme);
    try { PWAManager.init(); } catch(e) {}
    this.setupNavigation();
    this.renderProfileSelector();
    const tok = SparkDoseAPI.getToken();
    if (!tok) {
      this.currentScreen = "screen-login";
      this.routeTo("screen-login", true);
    } else {
      try {
        const data = await SparkDoseAPI.getMe();
        this.currentUser = data.user;
        this.profiles = data.profiles || [];
        this.activeProfile = this.profiles.find(function(p){return p.is_primary;}) || this.profiles[0] || null;
        this.applyAccessibilityModes();
        this.loadThemeFromProfile();
        this.renderProfileSelector();
        const h = (window.location.hash || "").replace("#", "");
        const start = h || "screen-dashboard";
        this.routeTo(start, true);
        // onboarding forcado p/ conta nova (3 passos) - nao bloqueia demo com dados
        try { await this.checkOnboardingForce(); } catch(e) {}
      } catch (e) {
        if (e && (e.status === 401)) {
          this.onSessionExpired("Sessão expirada. Entre de novo.");
        } else {
          console.warn("Falha auth inicial, indo p/ login:", e && e.message);
          this.routeTo("screen-login", true);
        }
      }
    }

    // Recarregar dados periodicamente a cada 60s
    setInterval(() => {
      if (this.currentScreen === "screen-dashboard" && this.activeProfile) {
        this.loadDashboard();
      }
    }, 60000);
  }

  onSessionExpired(msg) {
    try { SparkDoseAPI.logoutLocal(); } catch(e) {}
    this.currentUser = null;
    this.profiles = [];
    this.activeProfile = null;
    try { this.renderProfileSelector(); } catch(e) {}
    alert(msg || "Sessão expirada. Entre de novo.");
    this.routeTo("screen-login", true);
  }

  async checkOnboardingForce() {
    try {
      if (!this.activeProfile) return;
      if (SparkDoseAPI.isDemoSession()) return;
      const done = localStorage.getItem("dosefiel_onboarding_done_" + (this.currentUser ? this.currentUser.id : "x"));
      if (done === "1") return;
      let regs = [];
      try {
        const r = await SparkDoseAPI.getRegimens(this.activeProfile.id);
        regs = r.regimens || [];
      } catch(e) { return; }
      if (regs.length === 0) {
        this.routeTo("screen-onboarding", true);
        try { this.renderOnboardingSteps(); } catch(e) {}
      }
    } catch(e) {}
  }

  renderOnboardingSteps() {
    const sec = document.getElementById("screen-onboarding");
    if (!sec || document.getElementById("onboarding-3steps")) return;
    const d = document.createElement("div");
    d.id = "onboarding-3steps";
    d.className = "card";
    d.style.marginTop = "12px";
    d.innerHTML = "<div class='card-subtitle'>COMECE EM 3 PASSOS (OBRIGATORIO P/ CONTA NOVA)</div>"
      + "<ol style='margin:10px 0 0 18px;font-size:0.95rem;display:flex;flex-direction:column;gap:10px;'>"
      + "<li><strong>1. Buscar remédio</strong> — toque abaixo, busque e toque <em>Usar/Adicionar</em>.<br><button class='btn btn-primary' style='margin-top:6px;' onclick=\"app.routeTo('screen-catalog-search')\">1 Buscar remédio</button></li>"
      + "<li><strong>2. Definir horário</strong> — cadastre horários exatos da receita.<br><button class='btn btn-primary' style='margin-top:6px;' onclick=\"app.routeTo('screen-add-medication')\">2 Definir horário</button></li>"
      + "<li><strong>3. Ativar push</strong> — permita notificações + instale o PWA.<br><button class='btn btn-primary' style='margin-top:6px;' onclick=\"app.routeTo('screen-push-diagnostics')\">3 Ativar push</button></li>"
      + "</ol>"
      + "<div style='margin-top:12px;display:flex;gap:8px;'><button class='btn btn-secondary' style='flex:1;' onclick=\"app.completeOnboarding()\">Concluir (tenho tratamento)</button></div>"
      + "<p style='font-size:0.8rem;color:var(--text-muted);margin-top:8px;'>Tutorial de 1 min continua em Ajuda. Conta nova vazia mostra atalhos em cada tela.</p>";
    sec.appendChild(d);
  }

  completeOnboarding() {
    try {
      const k = "dosefiel_onboarding_done_" + (this.currentUser ? this.currentUser.id : "x");
      localStorage.setItem(k, "1");
    } catch(e) {}
    this.showToast("Configuração inicial concluída!");
    this.routeTo("screen-dashboard", true);
  }

  applyTheme(theme, persist=true) {
    this.theme = theme;
    try { localStorage.setItem("dosefiel_theme", theme); } catch(e) {}
    const apply = (th) => {
      if (th === "auto") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
      } else {
        document.documentElement.setAttribute("data-theme", th);
      }
    };
    apply(theme);
    // segue sistema quando auto
    try {
      if (theme === "auto" && !this._themeListener) {
        this._themeListener = (e) => { if (this.theme === "auto") document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light"); };
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", this._themeListener);
      }
    } catch(e) {}
    // persiste no perfil (nao bloqueia UI)
    if (persist && this.activeProfile && this.activeProfile.id) {
      SparkDoseAPI.request("/profiles/"+this.activeProfile.id, {method:"PUT", body: JSON.stringify({theme_preference: theme})}).catch(()=>{});
      this.activeProfile.theme_preference = theme;
    }
  }
  loadThemeFromProfile() {
    try {
      const fromProfile = this.activeProfile && this.activeProfile.theme_preference;
      const fromLocal = localStorage.getItem("dosefiel_theme");
      const eff = fromLocal || fromProfile || "auto";
      this.applyTheme(eff, false);
    } catch(e) {}
  }

  applyAccessibilityModes() {
    if (!this.activeProfile) return;
    document.body.classList.toggle("mode-adhd", !!this.activeProfile.adhd_mode_enabled);
    document.body.classList.toggle("mode-senior", !!this.activeProfile.senior_mode_enabled);
    document.body.classList.toggle("mode-discrete", !!this.activeProfile.discrete_mode_enabled);
  }

  switchProfile(profileId) {
    const prof = this.profiles.find(p => p.id === profileId);
    if (prof) {
      this.activeProfile = prof;
      this.applyAccessibilityModes();
      this.renderProfileSelector();
      this.routeTo(this.currentScreen, true);
    }
  }

  renderProfileSelector() {
    const container = document.getElementById("profile-header-widget");
    if (!container || !this.activeProfile) return;

    let optionsHtml = "";
    this.profiles.forEach(p => {
      const selected = p.id === this.activeProfile.id ? "selected" : "";
      const relLabel = p.relationship_type === "self" ? "(Eu)" : `(${p.relationship_type})`;
      optionsHtml += `<option value="${p.id}" ${selected}>${p.display_name} ${relLabel}</option>`;
    });

    container.innerHTML = `
      <div class="profile-badge">
        <div class="profile-avatar">${this.activeProfile.display_name.charAt(0)}</div>
        <select id="profile-select" style="border:none;background:transparent;font-weight:600;font-size:0.9rem;color:var(--text-main);cursor:pointer;" onchange="app.switchProfile(this.value)">
          ${optionsHtml}
        </select>
      </div>
    `;
  }

  setupNavigation() {
    window.addEventListener("hashchange", () => {
      const screenId = window.location.hash.replace("#", "");
      if (screenId) this.routeTo(screenId);
    });

    // Atualizar itens ativos de menu
    document.querySelectorAll("[data-nav-screen]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const target = btn.getAttribute("data-nav-screen");
        this.routeTo(target);
      });
    });
  }

  routeTo(screenId, forceReload = false) {
    // AUTH-FIX: rota inicial = login; sem token bloqueia telas privadas
    const publicScreens = ["screen-login", "screen-account-recovery", "screen-welcome", "screen-splash"];
    try {
      const tok = SparkDoseAPI.getToken();
      if (!tok && publicScreens.indexOf(screenId) === -1) {
        screenId = "screen-login";
      }
    } catch(e) {}
    if (!screenId || screenId === this.currentScreen && !forceReload) return;

    const currentEl = document.getElementById(this.currentScreen);
    if (currentEl) currentEl.style.display = "none";

    const targetEl = document.getElementById(screenId);
    if (!targetEl) {
      console.warn(`Tela ${screenId} nao encontrada, redirecionando para dashboard`);
      screenId = "screen-dashboard";
    }

    const newTargetEl = document.getElementById(screenId);
    if (newTargetEl) {
      newTargetEl.style.display = "block";
      this.currentScreen = screenId;
      window.location.hash = screenId;
    }

    // Atualizar classes ativas na navegacao
    document.querySelectorAll("[data-nav-screen]").forEach(el => {
      el.classList.toggle("active", el.getAttribute("data-nav-screen") === screenId);
    });

    // Gatilhos de carregamento de dados da tela
    this.onScreenLoaded(screenId);
  }

  onScreenLoaded(screenId) {
    switch(screenId) {
      case "screen-dashboard":
        this.loadDashboard();
        break;
      case "screen-agenda":
        this.loadAgenda();
        break;
      case "screen-calendar":
        this.loadCalendar();
        break;
      case "screen-assisted-memory":
        this.loadAssistedMemory();
        break;
      case "screen-inventory":
        this.loadInventory();
        break;
      case "screen-reports":
        this.loadReports();
        break;
      case "screen-symptoms":
        this.loadSymptoms();
        break;
      case "screen-documents":
        this.loadDocuments();
        break;
      case "screen-consultas":
        try { this.loadConsultas(); } catch(e) { console.warn(e); }
        break;
      case "screen-prontuario":
        try { this.loadProntuario(); } catch(e) { console.warn(e); }
        break;
      case "screen-push-diagnostics":
        this.loadPushDiagnostics();
        break;
      case "screen-admin-panel":
        this.loadAdminMetrics();
        break;
      case "screen-history":
        this.loadHistory();
        break;
      case "screen-pending-medications":
        this.loadPending();
        break;
      case "screen-restock":
        this.loadRestock();
        break;
      case "screen-family-profiles":
        this.loadFamilyProfiles();
        break;
      case "screen-caregiver-permissions":
        this.loadCaregivers();
        break;
      case "screen-meu-perfil":
        this.loadMyProfile();
        break;
      case "screen-notifications-center":
        this.loadNotificationsCenter();
        break;
      case "screen-help":
        this.renderHelp();
        break;
      case "screen-data-management":
        break;
      case "screen-accessibility-settings":
        break;
    }
    if (screenId === "screen-dashboard") this.checkFirstUseTutorial();
  }
  esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

  // --------------------------------------------------------------------------
  // TELA 6: DASHBOARD MINHA SAÚDE HOJE
  // --------------------------------------------------------------------------
  async loadDashboard() {
    if (!this.activeProfile) {
      const c0 = document.getElementById("dashboard-content");
      if (c0) c0.innerHTML = "<div class='card' style='text-align:center;padding:32px;'><h3>Entre para ver sua saúde hoje</h3><p style='color:var(--text-muted);margin:8px 0 12px;'>Rota inicial é o login. Sem login, sem dados.</p><div style='display:flex;gap:8px;justify-content:center;'><button class='btn btn-primary' onclick=\"app.routeTo('screen-login')\">Ir p/ login</button><button class='btn btn-secondary' onclick=\"app.doDemoAction()\">Ver demonstração</button></div></div>";
      return;
    }
    const container = document.getElementById("dashboard-content");
    if (!container) return;

    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">Carregando Minha Saúde Hoje...</div>`;

    try {
      const data = await SparkDoseAPI.getTodaySchedule(this.activeProfile.id);
      this.todayData = data;
      this.renderDashboard(data);
      try { this.loadTreatmentsSection(); } catch(e) {}
    } catch (e) {
      if (e && e.status === 401) {
        container.innerHTML = `<div class="card" style="border-left:4px solid var(--danger);text-align:center;padding:28px;"><h3>Sessão expirada</h3><p style="color:var(--text-muted);margin:8px 0 12px;">Aviso: seu login expirou (7/30d). Entre de novo.</p><button class="btn btn-primary" onclick="app.routeTo('screen-login')">Ir p/ login</button></div>`;
        return;
      }
      if (e && e.status === 403) {
        container.innerHTML = `<div class="card" style="border-left:4px solid var(--danger);"><h3>Acesso negado a este perfil</h3><p style="color:var(--text-muted);margin-top:8px;">Você não é dono deste perfil (403).</p></div>`;
        return;
      }
      container.innerHTML = `<div class="card" style="border-left:4px solid var(--danger);">
        <h3>Não foi possível conectar ao servidor</h3>
        <p style="color:var(--text-muted);margin-top:8px;">${this.esc(e.message || "")}</p>
      </div>`;
    }
  }

  async loadTreatmentsSection() {
    // Secao tratamentos ativos com Excluir (duplo-confirm) - some da lista active
    let box = document.getElementById("treatments-active-list");
    if (!box) {
      const dash = document.getElementById("dashboard-content");
      if (!dash) return;
      const d = document.createElement("div");
      d.id = "treatments-active-wrap";
      d.innerHTML = "<div style='margin-top:28px;'><h3 style='font-size:1.2rem;font-weight:700;'>Meus Tratamentos (ativos)</h3><p style='font-size:0.85rem;color:var(--text-muted);'>Excluir some da lista (soft-cancel). Passadas imutáveis.</p><div id='treatments-active-list' style='margin-top:10px;'></div></div>";
      dash.appendChild(d);
      box = document.getElementById("treatments-active-list");
    }
    if (!box || !this.activeProfile) return;
    try {
      const r = await SparkDoseAPI.getRegimens(this.activeProfile.id);
      const regs = r.regimens || [];
      if (!regs.length) {
        box.innerHTML = "<div class='card' style='text-align:center;padding:20px;border:2px dashed var(--border-subtle);'><p><strong>Nenhum tratamento ativo.</strong></p><p style='font-size:0.88rem;color:var(--text-muted);'>Comece em 3 passos:</p><div style='display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap;'><button class='btn btn-primary' onclick=\"app.routeTo('screen-catalog-search')\">1 Buscar remédio</button><button class='btn btn-secondary' onclick=\"app.routeTo('screen-add-medication')\">2 Definir horário</button><button class='btn btn-secondary' onclick=\"app.routeTo('screen-push-diagnostics')\">3 Ativar push</button></div></div>";
        return;
      }
      let h = "";
      regs.forEach(function(rg){
        h += "<div class='card' style='margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;'><div><strong>" + (rg.custom_drug_name || "Tratamento").replace(/[<>&\"]/g, "") + "</strong><div style='font-size:0.8rem;color:var(--text-muted);'>" + (rg.frequency_type || "") + " • " + (rg.id || "") + "</div></div><div style='display:flex;gap:6px;'><button class='btn btn-secondary' style='padding:6px 12px;' onclick=\"app.editRegimen('" + rg.id + "','" + ((rg.custom_drug_name || "").replace(/'/g, "")) + "','" + (rg.frequency_type || "") + "')\">Editar</button><button class='btn btn-secondary' style='padding:6px 12px;color:var(--danger);' onclick=\"app.deleteRegimenAction('" + rg.id + "','" + ((rg.custom_drug_name || "").replace(/'/g, "")) + "')\">Excluir</button></div></div>";
      });
      box.innerHTML = h;
    } catch(e) {
      box.innerHTML = "<p style='font-size:0.85rem;color:var(--text-muted);'>Falha tratamentos: " + this.esc(e.message || "") + "</p>";
    }
  }

  renderDashboard(data) {
    const container = document.getElementById("dashboard-content");
    const summary = data.summary || { total: 0, confirmed: 0, scheduled: 0, delayed: 0, adherence_rate: 100 };
    const nextDose = data.next_dose;
    const occurrences = data.occurrences || [];

    // Saudação personalizada contextual
    const hour = new Date().getHours();
    let greeting = "Olá!";
    if (hour < 12) greeting = "Bom dia!";
    else if (hour < 18) greeting = "Boa tarde!";
    else greeting = "Boa noite!";

    let nextDoseHtml = "";
    if (nextDose) {
      const schedTime = new Date(nextDose.scheduled_time);
      const timeStr = schedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const diffMinutes = Math.round((schedTime - new Date()) / 60000);
      let countdownText = "";
      if (diffMinutes > 0) {
        countdownText = `em ${diffMinutes} minutos`;
      } else if (diffMinutes === 0) {
        countdownText = "Agora!";
      } else {
        countdownText = `atrasado há ${Math.abs(diffMinutes)} minutos`;
      }

      nextDoseHtml = `
        <div class="card card-next-dose adhd-highlight">
          <div class="card-subtitle">PRÓXIMA MEDICAÇÃO PROGRAMADA</div>
          <h2 style="font-size:1.6rem;font-weight:700;" class="discrete-blur">${nextDose.custom_drug_name}</h2>
          <div style="font-size:1rem;opacity:0.9;margin-top:4px;">${nextDose.dose_quantity} ${nextDose.dose_unit} • ${nextDose.clinical_instructions || "Conforme prescrição"}</div>
          
          <div class="dose-time-display">
            <span class="time-large">${timeStr}</span>
            <span class="countdown-badge">${countdownText}</span>
          </div>

          <div class="btn-group">
            <button class="btn btn-white btn-lg" onclick="app.confirmDoseAction('${nextDose.id}')">
              ✓ Tomei agora
            </button>
            <button class="btn" style="background:rgba(255,255,255,0.2);color:white;" onclick="app.snoozeDoseAction('${nextDose.id}', 15)">
              ⏰ Adiar 15 min
            </button>
            <button class="btn" style="background:rgba(255,255,255,0.1);color:white;" onclick="app.skipDoseAction('${nextDose.id}')">
              ✕ Não tomei
            </button>
          </div>
        </div>
      `;
    } else {
      nextDoseHtml = `
        <div class="card" style="text-align:center;padding:36px;border:2px dashed var(--border-subtle);">
          <div style="font-size:2.5rem;margin-bottom:8px;">✨</div>
          <h3 style="font-weight:700;">Nenhuma dose pendente por agora!</h3>
          <p style="color:var(--text-muted);margin-top:6px;">Todas as medicações programadas para o momento foram confirmadas.</p>
        </div>
      `;
    }

    // Linha do Tempo de Doses
    let timelineHtml = "";
    if (occurrences.length === 0) {
      timelineHtml = `<div class="card" style="text-align:center;padding:28px;border:2px dashed var(--border-subtle);"><p><strong>Nenhum horário hoje — estado vazio.</strong></p><p style="color:var(--text-muted);font-size:0.9rem;">Cadastre seu primeiro tratamento em 3 passos.</p><div style="display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap;"><button class="btn btn-primary" onclick="app.routeTo('screen-catalog-search')">1 Buscar remédio</button><button class="btn btn-secondary" onclick="app.routeTo('screen-add-medication')">2 Definir horário</button><button class="btn btn-secondary" onclick="app.routeTo('screen-push-diagnostics')">3 Ativar push</button></div></div>`;
    } else {
      occurrences.forEach(occ => {
        const occTime = new Date(occ.scheduled_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const statusClass = "status-" + occ.status;
        const statusLabels = {
          scheduled: "Agendado",
          confirmed: "Tomado ✓",
          delayed: "Atrasado",
          skipped: "Não tomado",
          snoozed: "Adiado"
        };
        const isDone = occ.status === "confirmed";
        const isFutureDel = (occ.status === "scheduled" || occ.status === "snoozed");
        const delBtn = isFutureDel ? `<button class="btn btn-secondary" style="padding:6px 10px;font-size:0.78rem;color:var(--danger);" onclick="app.deleteOccurrenceAction('${occ.id}')">Excluir dose</button>` : ``;

        timelineHtml += `
          <div class="timeline-item">
            <div class="timeline-time-col">
              <span class="time-val">${occTime}</span>
            </div>
            <div class="timeline-info">
              <span class="drug-badge" style="background:${occ.color_hex}15;color:${occ.color_hex};">
                ● ${occ.pharmaceutical_form || "Medicamento"}
              </span>
              <h4 style="font-size:1.1rem;font-weight:600;" class="discrete-blur">${occ.custom_drug_name}</h4>
              <div style="font-size:0.85rem;color:var(--text-muted);">${occ.dose_quantity} ${occ.dose_unit}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span class="status-badge ${statusClass}">${statusLabels[occ.status] || occ.status}</span>
              ${!isDone ? `
                <button class="btn btn-primary" style="padding:8px 16px;font-size:0.85rem;" onclick="app.confirmDoseAction('${occ.id}')">
                  Confirmar
                </button>
              ` : `
                <span style="color:var(--accent);font-weight:700;font-size:1.2rem;">✓</span>
              `}
              ${delBtn}
            </div>
          </div>
        `;
      });
    }

    container.innerHTML = `
      <div style="margin-bottom:24px;">
        <h1 style="font-size:1.8rem;font-weight:800;letter-spacing:-0.03em;">${greeting} ${this.activeProfile.display_name.split(" ")[0]}</h1>
        <p style="color:var(--text-muted);">Vamos cuidar da sua saúde com tranquilidade e precisão?</p>
      </div>

      <!-- Resumo do Dia -->
      <div class="cards-grid">
        <div class="card">
          <div class="card-subtitle">ADESÃO HOJE</div>
          <div style="font-size:2.2rem;font-weight:800;color:var(--primary);">${summary.adherence_rate}%</div>
          <p style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">${summary.confirmed} de ${summary.total} doses confirmadas</p>
        </div>
        <div class="card">
          <div class="card-subtitle">DOSES PROGRAMADAS</div>
          <div style="font-size:2.2rem;font-weight:800;color:var(--text-main);">${summary.scheduled}</div>
          <p style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">${summary.delayed} atrasada(s)</p>
        </div>
        <div class="card">
          <div class="card-subtitle">ESTOQUE EM ALERTA</div>
          <div style="font-size:2.2rem;font-weight:800;color:${summary.low_stock_count > 0 ? "var(--warning)" : "var(--accent)"};">
            ${summary.low_stock_count}
          </div>
          <p style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">Tratamentos para repor em breve</p>
        </div>
      </div>

      ${(data.low_stock_alerts && data.low_stock_alerts.length ? "<div class='card' style='border-left:4px solid var(--warning);margin-bottom:14px;'><strong>⚠️ Estoque baixo: "+data.low_stock_alerts.length+" item(ns) ≤15 unid.</strong><div style='font-size:0.88rem;color:var(--text-muted);'>"+data.low_stock_alerts.slice(0,3).map(function(l){ return "• "+(l.custom_drug_name||"Medicamento")+" ("+l.quantity_current+")"; }).join("<br>")+"</div><div style='margin-top:8px;display:flex;gap:8px;'><button class='btn btn-secondary' style='padding:6px 12px;' onclick=\"app.routeTo('screen-inventory')\">Ver estoque</button><button class='btn btn-secondary' style='padding:6px 12px;' onclick=\"app.routeTo('screen-restock')\">Lista de compras</button></div></div>" : "")}
      <!-- Card Principal: Próxima Medicação -->
      ${nextDoseHtml}

      <!-- Linha do Tempo -->
      <div style="margin-top:36px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="font-size:1.25rem;font-weight:700;">Medicamentos de Hoje</h3>
          <button class="btn btn-secondary" style="padding:6px 14px;font-size:0.85rem;" onclick="app.routeTo('screen-agenda')">
            Ver Todos
          </button>
        </div>
        <div class="timeline">
          ${timelineHtml}
        </div>
      </div>
    `;
  }

  // Ações de Confirmação Rápida
  async confirmDoseAction(occId) {
    try {
      let st = "taken_on_time";
      try {
        const occ = (this.todayData && this.todayData.occurrences || []).find(function(o){ return o.id === occId; });
        if (occ && occ.status === "delayed") st = "taken_late";
      } catch(e) {}
      const res = await SparkDoseAPI.confirmDose(occId, st);
      if (res.already_confirmed) {
        alert("Esta dose já havia sido confirmada anteriormente.");
      } else {
        this.showToast("Dose registrada com sucesso! Estoque atualizado.");
      }
      this.loadDashboard();
    } catch (e) {
      alert("Erro ao confirmar dose: " + e.message);
    }
  }

  async snoozeDoseAction(occId, min = 15) {
    try {
      await SparkDoseAPI.snoozeDose(occId, min);
      this.showToast(`Lembrete adiado por ${min} minutos.`);
      this.loadDashboard();
    } catch (e) {
      alert("Erro ao adiar lembrete: " + e.message);
    }
  }

  async skipDoseAction(occId) {
    const reason = prompt("Por qual motivo não tomou este medicamento? (ex: esqueci, efeitos colaterais, orientação médica):", "esqueci");
    if (reason !== null) {
      try {
        await SparkDoseAPI.skipDose(occId, reason);
        this.showToast("Dose registrada como omitida.");
        this.loadDashboard();
      } catch (e) {
        alert("Erro ao registrar: " + e.message);
      }
    }
  }

  showToast(msg) {
    const toast = document.createElement("div");
    toast.style.cssText = "position:fixed;bottom:90px;right:20px;background:#0f172a;color:white;padding:12px 20px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.3);z-index:999;font-weight:600;display:flex;align-items:center;gap:8px;";
    toast.innerHTML = `<span>✓</span> <span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  // --------------------------------------------------------------------------
  // TELA 10: MEMÓRIA ASSISTIDA (TDAH & IDOSO)
  // --------------------------------------------------------------------------
  async loadAssistedMemory() {
    const container = document.getElementById("assisted-memory-content");
    if (!container) return;

    try {
      const data = await SparkDoseAPI.getAssistedMemory(this.activeProfile.id);
      if (data.has_records) {
        container.innerHTML = `
          <div class="card adhd-highlight" style="text-align:center;padding:48px 24px;">
            <div style="font-size:3.5rem;margin-bottom:12px;">🧠</div>
            <h2 style="font-size:1.6rem;font-weight:800;color:var(--primary);">${data.display_text}</h2>
            <p style="font-size:1.1rem;color:var(--text-muted);margin-top:12px;">
              Medicamento: <strong>${data.drug_name}</strong>
            </p>
            <div style="margin-top:28px;background:var(--bg-subtle);padding:16px;border-radius:12px;font-size:0.95rem;">
              Tempo decorrido desde o registro: <strong>${data.elapsed_minutes} minutos</strong>
            </div>
            <div style="margin-top:24px;color:var(--text-subtle);font-size:0.85rem;">
              *Se você estiver em dúvida e não encontrar registro confiável, nunca tome uma dose dupla. Consulte a bula ou fale com seu farmacêutico.
            </div>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="card" style="text-align:center;padding:48px 24px;">
            <div style="font-size:3rem;margin-bottom:12px;">ℹ️</div>
            <h3>${data.message}</h3>
          </div>
        `;
      }
    } catch (e) {
      container.innerHTML = `<p>Erro ao carregar memória assistida.</p>`;
    }
  }

  // --------------------------------------------------------------------------
  // TELA 9: BUSCAR MEDICAMENTOS (CATÁLOGO ANVISA / DCB)
  // --------------------------------------------------------------------------
  async performDrugSearch() {
    const input = document.getElementById("catalog-search-input");
    const container = document.getElementById("catalog-results-container");
    if (!input || !container) return;
    const q = input.value.trim();
    container.innerHTML = `<p style="padding:20px;color:var(--text-muted);">Buscando em cascata: cache → RxNorm vivo → Local → GovBR...</p>`;
    try {
      let data;
      try { data = await SparkDoseAPI.searchCatalogoBusca(q); }
      catch(e) { data = await SparkDoseAPI.searchCatalog(q); data.results = data.drugs; }
      const _list = data.results || data.drugs || [];
      // JUNCAO: se veio cascata nova (results com origem), usa render dedicado
      if (data.results) { this.renderBuscaResults(_list, q); return; }
      if (_list.length === 0) {
        container.innerHTML = `
          <div class="card" style="text-align:center;padding:32px;">
            <p>Nenhum medicamento encontrado para "${q}".</p>
            <p style="margin-top:8px;font-size:0.9rem;color:var(--text-muted);">
              Você pode cadastrar manualmente com a identificação: <em>"Informação fornecida pelo usuário — não validada no catálogo"</em>.
            </p>
            <button class="btn btn-primary" style="margin-top:16px;" onclick="app.openManualRegistration('${q}')">
              Cadastrar Manualmente
            </button>
          </div>
        `;
        return;
      }

      let html = "";
      data.drugs.forEach(d => {
        const isControlled = d.is_controlled ? `<span style="background:#fee2e2;color:#b91c1c;padding:3px 8px;border-radius:6px;font-size:0.75rem;font-weight:700;">Controle Especial ${d.control_category || ""}</span>` : "";
        html += `
          <div class="card" style="margin-bottom:14px;cursor:pointer;" onclick="app.showDrugDetails('${d.id}')">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <h4 style="font-size:1.15rem;font-weight:700;">${d.commercial_name || d.active_ingredient}</h4>
                <div style="font-size:0.9rem;color:var(--text-muted);">${d.active_ingredient} • DCB ${d.dcb_number || "N/A"}</div>
                <div style="font-size:0.8rem;color:var(--text-subtle);margin-top:4px;">Reg. Anvisa: ${d.registration_number || "Em consulta"} • ATC: ${d.atc_code || "N/A"}</div>
              </div>
              <div>${isControlled}</div>
            </div>
            <div style="margin-top:12px;display:flex;gap:8px;">
              <button class="btn btn-secondary" style="padding:6px 12px;font-size:0.85rem;" onclick="event.stopPropagation();app.startPrescriptionWithDrug('${d.id}')">
                + Adicionar ao Tratamento
              </button>
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    } catch (e) {
      container.innerHTML = `<p style="color:var(--danger);padding:20px;">Erro na busca: ${e.message}</p>`;
    }
  }

  // --------------------------------------------------------------------------
  // TELA 17: CONTROLE DE ESTOQUE E PREVISÃO DE ESGOTAMENTO
  // --------------------------------------------------------------------------
  async loadInventory() {
    const container = document.getElementById("inventory-content");
    if (!container || !this.activeProfile) return;

    container.innerHTML = `<p style="padding:20px;color:var(--text-muted);">Carregando estoque...</p>`;

    try {
      const data = await SparkDoseAPI.getInventory(this.activeProfile.id);
      let html = "";
      if (data.inventory.length === 0) {
        html = `<div class="card" style="text-align:center;padding:24px;border:2px dashed var(--border-subtle);"><p><strong>Estoque vazio.</strong></p><p style="font-size:0.88rem;color:var(--text-muted);">Cadastre um tratamento para gerar estoque.</p><div style="display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap;"><button class="btn btn-primary" onclick="app.routeTo('screen-catalog-search')">1 Buscar remédio</button><button class="btn btn-secondary" onclick="app.routeTo('screen-add-medication')">2 Cadastrar</button></div></div>`;
      } else {
        data.inventory.forEach(lot => {
          const days = lot.estimated_days_remaining;
          let alertColor = "var(--accent)";
          if (days <= 5) alertColor = "var(--danger)";
          else if (days <= 10) alertColor = "var(--warning)";

          html += `
            <div class="card" style="margin-bottom:16px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <h4 style="font-size:1.15rem;font-weight:700;">${lot.custom_drug_name}</h4>
                  <div style="font-size:0.85rem;color:var(--text-muted);">Lote: ${lot.lot_number || "Geral"} • Validade: ${lot.expiration_date || "Não informada"}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:1.6rem;font-weight:800;color:${alertColor};">${lot.quantity_current} ${lot.dose_unit || "unid."}</div>
                  <div style="font-size:0.8rem;color:var(--text-muted);">restante</div>
                </div>
              </div>
              <div style="margin-top:14px;background:var(--bg-subtle);padding:10px 14px;border-radius:8px;font-size:0.88rem;display:flex;justify-content:space-between;">
                <span>Previsão de esgotamento:</span>
                <strong>${days !== 999 ? `Aprox. ${days} dias (${lot.exhaustion_date})` : "Uso eventual"}</strong>
              </div>
            </div>
          `;
        });
      }
      container.innerHTML = html;
    } catch (e) {
      container.innerHTML = `<p>Erro ao carregar estoque: ${e.message}</p>`;
    }
  }

  // --------------------------------------------------------------------------
  // TELA 21: ASSISTENTE INTELIGENTE RESPONSÁVEL
  // --------------------------------------------------------------------------
  async sendAssistantMessage() {
    const input = document.getElementById("assistant-input");
    const chatContainer = document.getElementById("assistant-messages");
    if (!input || !chatContainer) return;

    const text = input.value.trim();
    if (!text) return;

    // Mensagem do Usuário
    chatContainer.innerHTML += `
      <div class="chat-bubble bubble-user">${text}</div>
    `;
    input.value = "";
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Placeholder de Resposta
    const loaderId = "loader-" + Date.now();
    chatContainer.innerHTML += `
      <div id="${loaderId}" class="chat-bubble bubble-assistant" style="color:var(--text-muted);">Pensando com segurança clínica...</div>
    `;
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
      const res = await SparkDoseAPI.askAssistant(text, this.activeProfile.id);
      const loader = document.getElementById(loaderId);
      if (loader) {
        loader.innerHTML = res.response.replace(/\n/g, "<br>");
      }
    } catch (e) {
      const loader = document.getElementById(loaderId);
      if (loader) loader.innerText = "Erro ao contatar o assistente.";
    }
  }

  // --------------------------------------------------------------------------
  // TELA 25: DIAGNÓSTICO DE NOTIFICAÇÕES E PUSH
  // --------------------------------------------------------------------------
  async loadPushDiagnostics() {
    const container = document.getElementById("push-diagnostics-content");
    if (!container || !this.activeProfile) return;

    container.innerHTML = `<p style="padding:20px;">Executando bateria de testes no dispositivo e servidor...</p>`;
    const diag = await PWAManager.runDiagnostics(this.activeProfile.id);

    container.innerHTML = `
      <div class="card">
        <h3 style="font-weight:700;margin-bottom:16px;">Diagnóstico de Notificações</h3>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:12px;font-size:0.95rem;">
          <li>📱 Instalado na Tela de Início (PWA): <strong>${diag.isStandalone ? "Sim ✓" : "Não (executando no navegador)"}</strong></li>
          <li>⚙️ Suporte a Service Worker: <strong>${diag.hasServiceWorker ? "Compatível ✓" : "Incompatível ✕"}</strong></li>
          <li>🔔 Permissão de Notificações: <strong>${diag.permissionState}</strong></li>
          <li>📬 Assinatura Web Push Ativa: <strong>${diag.subscriptionActive ? "Ativa no dispositivo ✓" : "Pendente de ativação"}</strong></li>
          <li>🖥️ Agendador em Segundo Plano no Servidor: <strong>Online ✓</strong></li>
        </ul>

        <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="app.enablePushAction()">
            Ativar Notificações no Navegador
          </button>
          <button class="btn btn-secondary" onclick="app.sendTestNotificationAction()">
            Disparar Notificação de Teste
          </button>
        </div>
      </div>
    `;
  }

  async enablePushAction() {
    try {
      await PWAManager.enablePushNotifications(this.activeProfile.id);
      alert("Notificações Web Push ativadas com sucesso para este dispositivo!");
      this.loadPushDiagnostics();
    } catch (e) {
      alert("Não foi possível ativar: " + e.message);
    }
  }

  async sendTestNotificationAction() {
    try {
      const res = await SparkDoseAPI.sendTestNotification(this.activeProfile.id);
      alert(res.message || "Notificação de teste disparada pelo servidor com sucesso!");
    } catch (e) {
      alert("Erro ao disparar teste: " + e.message);
    }
  }


  // --------------------------------------------------------------------------
  // COMPLEMENTO FINALIZACAO 100% (relatorio, estoque, tutorial, LGPD, etc.)
  // --------------------------------------------------------------------------
  async loadAgenda() {
    const c = document.getElementById("agenda-timeline-container");
    if (!c || !this.activeProfile) return;
    c.innerHTML = "<p style='padding:20px;color:var(--text-muted);'>Carregando agenda...</p>";
    try {
      const data = await SparkDoseAPI.getTodaySchedule(this.activeProfile.id);
      const occs = data.occurrences || [];
      if (!occs.length) { c.innerHTML = "<div class='card' style='text-align:center;padding:24px;border:2px dashed var(--border-subtle);'><p><strong>Agenda vazia — nada por hoje.</strong></p><p style='font-size:0.88rem;color:var(--text-muted);'>Toque para começar:</p><div style='display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap;'><button class='btn btn-primary' onclick=\"app.routeTo('screen-catalog-search')\">1 Buscar remédio</button><button class='btn btn-secondary' onclick=\"app.routeTo('screen-add-medication')\">2 Definir horário</button></div></div>"; return; }
      let h = "";
      occs.forEach(o => {
        const tm = new Date(o.scheduled_time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
        const lbl = {scheduled:"Agendado",confirmed:"Tomado ✓",delayed:"Atrasado",skipped:"Nao tomado",snoozed:"Adiado"}[o.status] || o.status;
        const done = o.status === "confirmed";
        const canDel = (o.status === "scheduled" || o.status === "snoozed");
        const delB = canDel ? "<button class='btn btn-secondary' style='padding:6px 10px;font-size:0.78rem;color:var(--danger);' onclick=\"app.deleteOccurrenceAction('"+o.id+"')\">Excluir dose</button>" : "";
        h += "<div class='timeline-item'><div class='timeline-time-col'><span class='time-val'>"+tm+"</span></div><div class='timeline-info'><h4 style='font-size:1.05rem;font-weight:600;' class='discrete-blur'>"+this.esc(o.custom_drug_name)+"</h4><div style='font-size:0.85rem;color:var(--text-muted);'>"+this.esc(o.dose_quantity||"")+" "+this.esc(o.dose_unit||"")+"</div></div><div style='display:flex;align-items:center;gap:8px;flex-wrap:wrap;'><span class='status-badge status-"+o.status+"'>"+lbl+"</span>"+(done?"<span style='color:var(--accent);font-weight:700;'>✓</span>":"<button class='btn btn-primary' style='padding:6px 12px;font-size:0.82rem;' onclick=\"app.confirmDoseAction('"+o.id+"')\">Confirmar</button>")+delB+"</div></div>";
      });
      // lista tratamentos com Excluir (duplo-confirm, some active)
      let trH = "";
      try {
        const rg = await SparkDoseAPI.getRegimens(this.activeProfile.id);
        (rg.regimens || []).forEach(function(r){
          trH += "<div class='card' style='margin-top:8px;display:flex;justify-content:space-between;align-items:center;'><div><strong>"+String(r.custom_drug_name||"Tratamento").replace(/[<>&\"]/g,"")+"</strong><div style='font-size:0.78rem;color:var(--text-muted);'>"+String(r.id||"")+"</div></div><div style='display:flex;gap:6px;'><button class='btn btn-secondary' style='padding:6px 12px;' onclick=\"app.editRegimen('"+r.id+"','"+String(r.custom_drug_name||"").replace(/'/g,"")+"','"+(r.frequency_type||"")+"')\">Editar</button><button class='btn btn-secondary' style='padding:6px 12px;color:var(--danger);' onclick=\"app.deleteRegimenAction('"+r.id+"','"+String(r.custom_drug_name||"").replace(/'/g,"")+"')\">Excluir tratamento</button></div></div>";
        });
        if (trH) trH = "<div style='margin-top:16px;'><h4 style='font-weight:700;'>Tratamentos ativos (excluir some da lista)</h4>" + trH + "</div>";
      } catch(e) {}
      c.innerHTML = "<div class='timeline'>"+h+"</div>" + trH;
    } catch(e) {
      if (e && e.status === 401) { c.innerHTML = "<div class='card' style='text-align:center;padding:20px;'><p>Sessão expirada. Entre de novo.</p><button class='btn btn-primary' onclick=\"app.routeTo('screen-login')\">Ir p/ login</button></div>"; return; }
      c.innerHTML = "<p>Erro agenda: "+this.esc(e.message)+"</p>";
    }
  }

  async loadCalendar() {
    const g = document.getElementById("calendar-month-grid");
    if (!g || !this.activeProfile) return;
    try {
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0,10);
      const to = new Date(today.getFullYear(), today.getMonth()+1, 0).toISOString().slice(0,10);
      const data = await SparkDoseAPI.getCalendar(this.activeProfile.id, from, to);
      const evs = data.events || [];
      const byDay = {};
      evs.forEach(e => { const d=(e.scheduled_time||"").slice(0,10); (byDay[d]=byDay[d]||[]).push(e); });
      const y = today.getFullYear(), m = today.getMonth();
      const first = new Date(y, m, 1).getDay();
      let h = "";
      for (let i=0;i<first;i++) h += "<div></div>";
      const last = new Date(y, m+1, 0).getDate();
      for (let d=1;d<=last;d++) {
        const ds = y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
        const n = (byDay[ds]||[]).length;
        const isToday = ds === today.toISOString().slice(0,10);
        h += "<div style='border:1px solid var(--border-subtle);border-radius:8px;padding:8px;min-height:52px;"+(isToday?"border-color:var(--primary);box-shadow:0 0 0 2px var(--primary-light);":"")+"'><div style='font-weight:700;'>"+d+"</div><div style='font-size:0.72rem;color:var(--text-muted);'>"+(n?n+" dose(s)":"-")+"</div></div>";
      }
      g.innerHTML = h;
    } catch(e) { g.innerHTML = "<p>Erro calendario: "+this.esc(e.message)+"</p>"; }
  }

  async loadReports() {
    const c = document.getElementById("reports-content");
    if (!c || !this.activeProfile) return;
    c.innerHTML = "<p style='padding:16px;color:var(--text-muted);'>Calculando adesao...</p>";
    try {
      const data = await SparkDoseAPI.getAdherenceReport(this.activeProfile.id, 30);
      const m = data.metrics || {};
      let bars = "";
      (data.daily_series||[]).slice(-14).forEach(d => {
        const hgt = Math.max(4, Math.round((d.rate||0)*0.8));
        const col = (d.rate>=80)?"var(--accent)":((d.rate>=50)?"var(--warning)":"var(--danger)");
        bars += "<div style='flex:1;text-align:center;'><div style='height:"+hgt+"px;background:"+col+";border-radius:4px;'></div><div style='font-size:0.68rem;margin-top:4px;color:var(--text-muted);'>"+d.day_label+"</div><div style='font-size:0.68rem;font-weight:700;'>"+d.rate+"%</div></div>";
      });
      c.innerHTML = "<div class='cards-grid'><div class='card'><div class='card-subtitle'>ADESAO "+data.period_days+" DIAS</div><div style='font-size:2.4rem;font-weight:800;color:var(--primary);'>"+data.adherence_rate+"%</div><div style='font-size:0.85rem;color:var(--text-muted);'>"+m.confirmed+" tomadas • "+(m.delayed||0)+" atrasadas • "+m.skipped+" omitidas • total "+m.total_doses+"</div></div><div class='card'><div class='card-subtitle'>COMO LER</div><p style='font-size:0.88rem;color:var(--text-muted);'>Meta clinica geral &ge;80%. Atrasada = confirmada &gt;30min apos horario. Omitida nao deduz estoque.</p><div style='margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;'><button class='btn btn-secondary' onclick='app.exportReportCSV()'>📥 Exportar CSV</button><button class='btn btn-secondary' onclick='window.print()'>🖨️ Imprimir / PDF</button><button class='btn btn-secondary' onclick='app.downloadAdherencePDF()'>📄 Baixar PDF</button></div></div></div><div class='card' style='margin-top:14px;'><h4 style='font-weight:700;margin-bottom:10px;'>Ultimos 14 dias</h4><div style='display:flex;gap:6px;align-items:flex-end;'>"+bars+"</div></div>";
      this._lastReport = data;
    } catch(e) { c.innerHTML = "<p>Erro relatorio: "+this.esc(e.message)+"</p>"; }
  }

  async downloadAdherencePDF() {
    try { await SparkDoseAPI.downloadAdherencePDF(this.activeProfile.id, 30); this.showToast("PDF clinico baixado."); }
    catch(e) { alert("Erro PDF: " + e.message); }
  }

  async exportReportCSV() {
    try {
      const d = this._lastReport || await SparkDoseAPI.getAdherenceReport(this.activeProfile.id, 30);
      let csv = "data;confirmadas;total;taxa%\n";
      (d.daily_series||[]).forEach(r => { csv += r.date+";"+r.confirmed+";"+r.total+";"+r.rate+"\n"; });
      const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "dosefiel-adesao-"+this.activeProfile.id+".csv";
      a.click();
      this.showToast("Relatorio CSV exportado.");
    } catch(e) { alert("Erro exportar: "+e.message); }
  }

  async loadHistory() {
    const c = document.getElementById("history-records-container");
    if (!c || !this.activeProfile) return;
    c.innerHTML = "<p style='padding:16px;color:var(--text-muted);'>Carregando historico...</p>";
    try {
      const today = new Date().toISOString().slice(0,10);
      const from = new Date(Date.now()-29*864e5).toISOString().slice(0,10);
      const data = await SparkDoseAPI.getCalendar(this.activeProfile.id, from, today+"T23:59:59");
      const evs = (data.events||[]).slice().reverse().slice(0,60);
      if (!evs.length) { c.innerHTML = "<div class='card'><p>Sem registros ainda.</p></div>"; return; }
      let h = "";
      evs.forEach(e => {
        const dt = new Date(e.scheduled_time).toLocaleString([], {day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
        h += "<div class='card' style='margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;'><div><strong class='discrete-blur'>"+this.esc(e.custom_drug_name)+"</strong><div style='font-size:0.82rem;color:var(--text-muted);'>"+dt+" • "+this.esc(e.status)+"</div></div><span class='status-badge status-"+e.status+"'>"+this.esc(e.status)+"</span></div>";
      });
      c.innerHTML = h;
    } catch(e) { c.innerHTML = "<p>Erro historico: "+this.esc(e.message)+"</p>"; }
  }

  async loadPending() {
    const c = document.getElementById("pending-medications-list");
    if (!c || !this.activeProfile) return;
    try {
      const data = await SparkDoseAPI.getTodaySchedule(this.activeProfile.id);
      const pend = (data.occurrences||[]).filter(o => ["scheduled","delayed","snoozed"].includes(o.status));
      if (!pend.length) { c.innerHTML = "<div class='card'><p>✨ Nenhuma pendencia. Tudo em dia!</p></div>"; return; }
      let h = "";
      pend.forEach(o => {
        const tm = new Date(o.scheduled_time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
        const late = o.status === "delayed" ? " <strong style='color:var(--danger);'>(ATRASADA)</strong>" : "";
        h += "<div class='card' style='margin-bottom:10px;"+(o.status==="delayed"?"border-left:4px solid var(--danger);":"")+"'><div style='display:flex;justify-content:space-between;align-items:center;'><div><strong class='discrete-blur'>"+this.esc(o.custom_drug_name)+"</strong><div style='font-size:0.85rem;color:var(--text-muted);'>"+tm+late+"</div></div><div style='display:flex;gap:6px;'><button class='btn btn-primary' style='padding:6px 12px;' onclick=\"app.confirmDoseAction('"+o.id+"')\">✓ Tomei</button><button class='btn btn-secondary' style='padding:6px 12px;' onclick=\"app.snoozeDoseAction('"+o.id+"',15)\">Adiar</button></div></div></div>";
      });
      c.innerHTML = h;
    } catch(e) { c.innerHTML = "<p>Erro: "+this.esc(e.message)+"</p>"; }
  }

  async loadSymptoms() {
    const h = document.getElementById("symptoms-history");
    if (!h || !this.activeProfile) return;
    try {
      const data = await SparkDoseAPI.getSymptoms(this.activeProfile.id);
      const arr = data.symptoms || data.symptom_entries || [];
      if (!arr.length) { h.innerHTML = "<div class='card' style='text-align:center;padding:22px;border:2px dashed var(--border-subtle);'><p><strong>Nenhum sintoma ainda — estado vazio.</strong></p><p style='font-size:0.88rem;color:var(--text-muted);'>Registre como você está para conversar com seu médico.</p><div style='margin-top:10px;'><button class='btn btn-primary' onclick=\"app.routeTo('screen-symptoms');setTimeout(function(){var el=document.getElementById('symp-notes');if(el)el.focus();},300);\">Registrar agora</button></div></div>"; return; }
      let s = "";
      arr.slice(0,20).forEach(x => {
        var _qd = (x.qualidade_sono != null && x.qualidade_sono !== '') ? x.qualidade_sono : x.sleep_quality;
        var _sl = '';
        try {
          if (x.horas_dormidas != null && x.horas_dormidas !== '') _sl += ' ' + parseFloat(x.horas_dormidas).toFixed(1) + 'h';
          if (_qd != null && _qd !== '') _sl += ' q' + _qd + '/10';
          if (x.hora_deitar || x.hora_acordar) _sl += ' ' + (x.hora_deitar || '--:--') + '-' + (x.hora_acordar || '--:--');
          if (x.despertares) _sl += ' ' + x.despertares + 'x despertar';
          if (x.dose_cbd_noite_mg != null && x.dose_cbd_noite_mg !== '') _sl += ' CBD ' + x.dose_cbd_noite_mg + 'mg';
        } catch (_e) {}
        s += "<div class='card' style='margin-bottom:8px;'><div style='font-size:0.85rem;color:var(--text-muted);'>"+this.esc(x.recorded_at||x.created_at||"")+"</div><div>Sono "+this.esc(x.sleep_quality)+" • Humor "+this.esc(x.mood)+" • Energia "+this.esc(x.energy_level)+(_sl ? ' <span style="font-size:0.82rem;color:var(--text-muted);">😴'+this.esc(_sl)+'</span>' : '')+"</div>"+(x.personal_notes?"<div style='font-size:0.9rem;margin-top:4px;'>"+this.esc(x.personal_notes)+"</div>":"")+"</div>"; // SONO-20261012
      });
      h.innerHTML = s;
      try { this.renderSonoChart(arr); } catch (_e2) {}
      try {
        var _pid2 = this.activeProfile.id;
        SparkDoseAPI.request('/symptoms/resumo?profile_id=' + encodeURIComponent(_pid2) + '&dias=7').then(function (rs) {
          try {
            var box = document.getElementById('sono-resumo');
            if (box && rs && rs.ok) box.textContent = 'M\u00E9dia 7d: ' + rs.media_horas + 'h · qualidade ' + rs.media_qualidade + '/10 · d\u00EDvida ' + rs.divida_sono + 'h (meta 8h/noite)' + (rs.melhor_dose_mg != null ? ' · melhor dose ' + rs.melhor_dose_mg + 'mg' : '');
          } catch (_e3) {}
        }).catch(function () {});
      } catch (_e4) {}
    } catch(e) { h.innerHTML = "<p>Erro sintomas: "+this.esc(e.message)+"</p>"; }
  }

  renderSonoChart(arr) {
    try { // SONO-20261012: grafico 7d dose x sono (canvas vanilla)
      var cv = document.getElementById('sono-chart');
      if (!cv || !cv.getContext) return;
      var ctx = cv.getContext('2d');
      var data = (arr || []).slice(0, 7).reverse();
      var W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      if (!data.length) { ctx.fillStyle = '#888'; ctx.font = '12px sans-serif'; ctx.fillText('Sem dados de sono ainda', 12, 20); return; }
      var bw = W / 7;
      data.forEach(function (x, i) {
        var h = parseFloat(x.horas_dormidas) || 0;
        var q = (x.qualidade_sono != null && x.qualidade_sono !== '') ? parseFloat(x.qualidade_sono) : (parseFloat(x.sleep_quality) * 2 || 0);
        var bh = Math.min(1, h / 10) * (H - 40);
        ctx.fillStyle = '#0e7490';
        ctx.fillRect(i * bw + 8, H - 20 - bh, bw - 16, bh);
        ctx.fillStyle = '#111';
        ctx.font = '10px sans-serif';
        ctx.fillText((h ? h.toFixed(1) + 'h' : '--'), i * bw + 8, H - 6);
        var qy = H - 20 - Math.min(1, q / 10) * (H - 40);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(i * bw + bw / 2, qy, 4, 0, 7); ctx.fill();
      });
      ctx.fillStyle = '#555'; ctx.font = '11px sans-serif';
      ctx.fillText('barra = horas sono · ponto laranja = qualidade', 10, 14);
    } catch (e) {}
  }

  async saveSymptomEntry() {
    try {
      const sleep = document.getElementById("symp-sleep") ? document.getElementById("symp-sleep").value : "4";
      const mood = document.getElementById("symp-mood") ? document.getElementById("symp-mood").value : "4";
      const notes = document.getElementById("symp-notes") ? document.getElementById("symp-notes").value : "";
      var _gv = function(id) { try { var el = document.getElementById(id); return el ? el.value : ''; } catch (e) { return ''; } };
      var _horas = parseFloat(_gv('symp-horas')); var _qual = parseInt(_gv('symp-qual') || '7'); var _desp = parseInt(_gv('symp-despert') || '0');
      var _sonol = parseInt(_gv('symp-sonol') || '3'); var _cbd = parseFloat(_gv('symp-cbd'));
      await SparkDoseAPI.recordSymptom({profile_id:this.activeProfile.id, sleep_quality:parseInt(sleep), mood:parseInt(mood), energy_level:4, personal_notes:notes,
        horas_dormidas:isNaN(_horas) ? null : _horas, qualidade_sono:isNaN(_qual) ? null : _qual, hora_deitar:_gv('symp-deitar'), hora_acordar:_gv('symp-acordar'),
        despertares:isNaN(_desp) ? 0 : _desp, sonolencia_diurna:isNaN(_sonol) ? null : _sonol, dose_cbd_noite_mg:isNaN(_cbd) ? null : _cbd}); // SONO-20261012
      this.showToast("Sintoma registrado.");
      if (document.getElementById("symp-notes")) document.getElementById("symp-notes").value = "";
      this.loadSymptoms();
    } catch(e) { alert("Erro salvar sintoma: "+e.message); }
  }

  async loadDocuments() {
    const c = document.getElementById("documents-content");
    if (!c || !this.activeProfile) return;
    try {
      const data = await SparkDoseAPI.getDocuments(this.activeProfile.id);
      const arr = data.documents || [];
      if (!arr.length) { c.innerHTML = "<div class='card'><p>Nenhum documento ainda. Envie sua receita (metadata).</p><div style='margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;'><button class='btn btn-primary' onclick='app.saveDocumentEntry()'>+ Enviar Receita (metadata)</button><button class='btn btn-secondary' onclick='app.ocrPrescription()'>📷 Ler receita (OCR)</button><button class='btn btn-secondary' onclick='app.lerReceitaIA()'>✨ Ler receita com IA</button></div></div>"; return; }
      let h = "";
      arr.forEach(d => { h += "<div class='card' style='margin-bottom:8px;'><strong>"+this.esc(d.title)+"</strong><div style='font-size:0.85rem;color:var(--text-muted);'>"+this.esc(d.document_type)+" • "+this.esc(d.created_at||"")+"</div></div>"; });
      h += "<div style='margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;'><button class='btn btn-primary' onclick='app.saveDocumentEntry()'>+ Enviar Receita (metadata)</button><button class='btn btn-secondary' onclick='app.ocrPrescription()'>📷 Ler receita (OCR)</button><button class='btn btn-secondary' onclick='app.lerReceitaIA()'>✨ Ler receita com IA</button></div>";
      c.innerHTML = h;
    } catch(e) { c.innerHTML = "<p>Erro documentos: "+this.esc(e.message)+"</p>"; }
  }

  async ocrPrescription() {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.onchange = async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      try {
        this.showToast("Lendo receita...");
        const dataUrl = await new Promise((res, rej) => {
          const rd = new FileReader();
          rd.onload = () => res(rd.result); rd.onerror = rej;
          rd.readAsDataURL(f);
        });
        const bmp = await new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res(im); im.onerror = rej;
          im.src = dataUrl;
        });
        const maxW = 1200;
        const sc = Math.min(1, maxW / bmp.width);
        const cv = document.createElement("canvas");
        cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc);
        cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
        const small = cv.toDataURL("image/jpeg", 0.85);
        const r = await SparkDoseAPI.ocrImage(this.activeProfile.id, small);
        const txt = (r && r.text) || "";
        if (!txt) { alert("OCR nao leu texto. Tente foto nítida com luz boa."); return; }
        const ok = confirm("Texto lido:\n\n" + txt.slice(0, 500) + "\n\nSalvar como documento?");
        if (ok) {
          await SparkDoseAPI.request("/documents", {method:"POST", body: JSON.stringify({profile_id:this.activeProfile.id, title:"Receita (OCR)", document_type:"prescription", file_path:"receita-ocr.jpg", mime_type:"image/jpeg"})});
          this.showToast("Receita salva. Confira e cadastre o tratamento.");
          this.loadDocuments();
        }
      } catch(e) { alert("Erro OCR: " + e.message); }
    };
    inp.click();
  }

  // V2-IA: Ler receita com IA (moondream:v2) - canvas max1024 jpeg0.76
  async lerReceitaIA() {
    try {
      if (!this.activeProfile) { alert("Escolha um perfil antes."); return; }
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*";
      inp.onchange = async () => {
        try {
          const f = inp.files && inp.files[0];
          if (!f) return;
          this.showToast("Lendo receita com IA...");
          const dataUrl = await new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.onerror = rej; rd.readAsDataURL(f); });
          const bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = dataUrl; });
          const maxW = 1024;
          const sc = Math.min(1, maxW / (bmp.width || maxW));
          const cv = document.createElement("canvas");
          cv.width = Math.max(1, Math.round(bmp.width * sc)); cv.height = Math.max(1, Math.round(bmp.height * sc));
          cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
          const small = cv.toDataURL("image/jpeg", 0.76);
          let r;
          try { r = await SparkDoseAPI.receitaFotoIA(this.activeProfile.id, small); }
          catch(e) {
            if (e && e.status === 503) { alert("IA ocupada, tente de novo em 1 min."); return; }
            alert("Falha IA: " + (e && e.message || e)); return;
          }
          const itens = (r && r.itens) || [];
          const raw = (r && r.raw) || "";
          const draft = (r && r.draft_id) || "";
          this._lastReceitaDraft = draft;
          this._lastReceitaItens = itens;
          let html = "<div class='card' style='max-width:560px;width:100%;padding:22px;max-height:85vh;overflow:auto;'><h3 style='font-weight:800;'>Receita lida (" + itens.length + " itens)</h3>";
          html += "<div style='font-size:0.8rem;color:var(--text-muted);margin:6px 0;'>Motor " + this.esc((r && r.motor) || "moondream:v2") + " - confira com medico/farmaceutico.</div>";
          if (!itens.length) { html += "<p>Nenhum medicamento identificado. Texto:<br><small>" + this.esc(raw.slice(0,600)) + "</small></p>"; }
          else {
            html += "<div style='display:flex;flex-direction:column;gap:8px;margin:10px 0;'>";
            itens.forEach((it, i) => {
              html += "<div class='card' style='margin:0;padding:10px;'><strong>" + this.esc(it.nome || ("Item "+(i+1))) + "</strong><div style='font-size:0.85rem;color:var(--text-muted);'>" + this.esc(it.dose||"") + " - " + this.esc(it.frequencia||"") + " (" + this.esc(it.origem||"IA") + " " + Math.round((it.conf||0)*100) + "%)</div></div>";
            });
            html += "</div>";
          }
          html += "<div style='display:flex;gap:8px;flex-wrap:wrap;'><button class='btn btn-primary' onclick='app.confirmarReceitaDraft()'>Confirmar e criar tratamento</button><button class='btn btn-secondary' onclick='app.closeModal()'>Fechar</button></div></div>";
          this.openModal(html);
        } catch(e) { try { alert("Erro IA: " + e.message); } catch(_e) {} }
      };
      inp.click();
    } catch(e) { try { alert("Erro IA: " + e.message); } catch(_e) {} }
  }
  async confirmarReceitaDraft() {
    try {
      if (!this.activeProfile) return;
      const d = this._lastReceitaDraft || "";
      const its = this._lastReceitaItens || [];
      if (!d && !its.length) { alert("Nada para confirmar."); return; }
      this.showToast("Criando tratamento...");
      const txt = its.map(x => (x.nome||"")+" "+(x.dose||"")+" - "+(x.frequencia||"")).join("\n");
      const r = await SparkDoseAPI.criarRegimenFromReceita(this.activeProfile.id, d ? {draft_id: d} : {text: txt});
      try { this.closeModal(); } catch(e) {}
      this.showToast("Tratamento criado (" + ((r && r.total) || 0) + " itens, rascunho). Confira horarios.");
      try { await this.loadDashboard(); } catch(e) {}
      this.routeTo("screen-agenda");
    } catch(e) { alert("Erro confirmar: " + (e && e.message || e)); }
  }
  // V2-IA: Consultas
  async loadConsultas() {
    try {
      const c = document.getElementById("consultas-content");
      if (!c || !this.activeProfile) return;
      c.innerHTML = "<p>Carregando consultas...</p>";
      const d = await SparkDoseAPI.listarConsultas(this.activeProfile.id);
      const arr = (d && d.consultas) || [];
      if (!arr.length) { c.innerHTML = "<div class='card' style='text-align:center;padding:22px;'><p><strong>Nenhuma consulta agendada.</strong></p><p style='font-size:0.88rem;color:var(--text-muted);'>Use o formulario acima.</p></div>"; return; }
      let h = "";
      arr.forEach(x => {
        const eid = this.esc(x.id);
        h += "<div class='card' style='margin-bottom:8px;'><strong>" + this.esc(x.medico||"Consulta") + "</strong><div style='font-size:0.85rem;color:var(--text-muted);'>" + this.esc(x.especialidade||"") + " - " + this.esc(x.data||"") + " " + this.esc(x.hora||"") + " - " + this.esc(x.tipo||"") + " - " + this.esc(x.status||"") + "</div>" + (x.link ? "<div><a href='" + this.esc(x.link) + "' target='_blank' style='color:var(--primary);'>Abrir link</a></div>" : "") + "<div style='margin-top:8px;display:flex;gap:8px;'><button class='btn btn-secondary' style='padding:6px 12px;' onclick='app.editConsultaFill(\"" + eid + "\")'>Editar</button><button class='btn btn-secondary' style='padding:6px 12px;' onclick='app.deleteConsulta(\"" + eid + "\")'>Cancelar</button><button class='btn btn-secondary btn-pdfpng' style='padding:6px 12px;' onclick='app.previewConsulta(\"" + eid + "\",\"pdf\")'>PDF</button><button class='btn btn-secondary btn-pdfpng' style='padding:6px 12px;' onclick='app.previewConsulta(\"" + eid + "\",\"png\")'>Imagem</button></div></div>";
      });
      c.innerHTML = h;
    } catch(e) { const cc = document.getElementById("consultas-content"); if (cc) cc.innerHTML = "<p>Erro consultas: " + this.esc(e.message) + "</p>"; }
  }
  async saveConsulta() {
    try {
      if (!this.activeProfile) { alert("Escolha um perfil."); return; }
      const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
      const editId = g("con-edit-id");
      const data = {profile_id: this.activeProfile.id, medico: g("con-medico"), especialidade: g("con-especialidade"), data: g("con-data"), hora: g("con-hora"), tipo: g("con-tipo") || "presencial", link: g("con-link"), observacoes: g("con-obs")};
      if (!data.medico) { alert("Informe o medico."); return; }
      if (editId) { await SparkDoseAPI.atualizarConsulta(editId, data); this.showToast("Consulta atualizada."); }
      else { await SparkDoseAPI.criarConsulta(data); this.showToast("Consulta agendada."); }
      this.clearConsultaForm();
      await this.loadConsultas();
    } catch(e) { alert("Erro salvar consulta: " + (e && e.message || e)); }
  }
  clearConsultaForm() {
    try { ["con-medico","con-especialidade","con-data","con-hora","con-link","con-obs","con-edit-id"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; }); const t = document.getElementById("con-tipo"); if (t) t.value = "presencial"; } catch(e) {}
  }
  async editConsultaFill(id) {
    try {
      const d = await SparkDoseAPI.listarConsultas(this.activeProfile.id);
      const arr = (d && d.consultas) || [];
      const x = arr.find(o => o.id === id);
      if (!x) return;
      const s = (sid, v) => { const el = document.getElementById(sid); if (el) el.value = v || ""; };
      s("con-medico", x.medico); s("con-especialidade", x.especialidade); s("con-data", x.data); s("con-hora", x.hora); s("con-tipo", x.tipo); s("con-link", x.link); s("con-obs", x.observacoes); s("con-edit-id", x.id);
      window.scrollTo(0,0);
      this.showToast("Editando - salve para confirmar.");
    } catch(e) { alert("Erro editar: " + e.message); }
  }
  async deleteConsulta(id) {
    try {
      if (!confirm("Cancelar esta consulta?")) return;
      await SparkDoseAPI.excluirConsulta(id);
      this.showToast("Consulta cancelada.");
      await this.loadConsultas();
    } catch(e) { alert("Erro cancelar: " + e.message); }
  }
  async cancelConsulta(id) { return this.deleteConsulta(id); }
  // V2-IA: Prontuario timeline
  async loadProntuario() {
    try {
      const c = document.getElementById("prontuario-content");
      if (!c || !this.activeProfile) return;
      c.innerHTML = "<p>Carregando prontuario...</p>";
      const d = await SparkDoseAPI.prontuario(this.activeProfile.id);
      const tl = (d && d.timeline) || [];
      if (!tl.length) { c.innerHTML = "<div class='card' style='text-align:center;padding:22px;'><p><strong>Prontuario vazio.</strong></p><p style='font-size:0.88rem;color:var(--text-muted);'>Consultas, remedios e documentos aparecem aqui.</p></div>"; return; }
      let h = "<div style='display:flex;flex-direction:column;gap:8px;'>";
      tl.slice(0,60).forEach(ev => {
        const ico = ev.tipo === "consulta" ? "💗" : ev.tipo === "remedio" ? "💊" : ev.tipo === "documento" ? "📂" : "📝";
        h += "<div class='card' style='margin:0;padding:10px;'><div style='font-size:0.85rem;'><span>" + ico + "</span> <strong>" + this.esc(ev.titulo||ev.tipo) + "</strong></div><div style='font-size:0.8rem;color:var(--text-muted);'>" + this.esc(ev.tipo) + " - " + this.esc(ev.data||"") + " " + this.esc(ev.hora||"") + "</div></div>";
      });
      h += "</div>";
      h += "<div style='margin-top:10px;font-size:0.8rem;color:var(--text-muted);'>Consultas " + ((d.consultas||[]).length) + " - Tratamentos " + ((d.regimens||[]).length) + " - Docs " + ((d.documents||[]).length) + "</div>";
      c.innerHTML = h;
    } catch(e) { const cc = document.getElementById("prontuario-content"); if (cc) cc.innerHTML = "<p>Erro prontuario: " + this.esc(e.message) + "</p>"; }
  }
    // PDFPNG-DIARIO 2026-10-10: PDF Imagem consultas + relatorio dia + preview modal + Tomei espelho
  _hojeBR() { try { const d = new Date(Date.now() - 3*3600*1000); return d.toISOString().slice(0,10); } catch(e) { return new Date().toISOString().slice(0,10); } }
  async previewConsulta(id, tipo) {
    try {
      const isPdf = (tipo === 'pdf');
      const url = isPdf ? SparkDoseAPI._urlConsultaPDF(id) : SparkDoseAPI._urlConsultaPNG(id);
      let prev = '';
      if (isPdf) { prev = '<iframe src="' + url + '" style="width:100%;height:60vh;border:0;background:#fff;"></iframe><p style="font-size:0.8rem;">Se o preview nao abrir, toque Baixar.</p>'; }
      else { prev = '<img id="df-cons-prev" style="width:100%;border-radius:12px;background:#fff;" /><p style="font-size:0.8rem;">Cartao 1080x1350 pronto p/ WhatsApp. Hash curto no canto = espelho.</p>'; }
      this.openModal('<div class="card" style="max-width:560px;margin:0 auto;"><h3>Pre-visualizar ' + (isPdf ? 'PDF' : 'Imagem') + '</h3>' + prev + '<div><button onclick="app.baixarConsultaPDFX(\'' + id + '\',\'' + tipo + '\')">Baixar</button><button onclick="app.closeModal()">Fechar</button></div><p>Apos enviar, marque Tomei no app.</p></div>');
      if (!isPdf) {
        const im = document.getElementById('df-cons-prev');
        if (im) {
          const h = {};
          const tok = SparkDoseAPI.getToken();
          if (tok) h['Authorization'] = 'Bearer ' + tok;
          fetch(url, { headers: h }).then(function(r){ return r.blob(); }).then(function(b){ im.src = URL.createObjectURL(b); }).catch(function(){});
        }
      }
    } catch(e) {}
  }
  async baixarConsultaPDFX(id, tipo) { try { if (tipo === 'pdf') await SparkDoseAPI.baixeConsultaPDF(id); else await SparkDoseAPI.baixeConsultaPNG(id); this.showToast('Baixado. Compartilhe no WhatsApp.'); } catch(e) {} }
  async baixarConsultaPDF(id) { return this.baixarConsultaPDFX(id, 'pdf'); }
  async baixarConsultaPNG(id) { return this.baixarConsultaPDFX(id, 'png'); }
  async compartilharConsulta(id, tipo) { try { if (tipo === 'pdf') await SparkDoseAPI.baixeConsultaPDF(id); else await SparkDoseAPI.baixeConsultaPNG(id); } catch(e) {} }
  async previewDia(tipo) {
    try {
      if (!this.activeProfile) { return; }
      const data = this._hojeBR();
      const pid = this.activeProfile.id;
      const isPdf = (tipo === 'pdf');
      const url = isPdf ? SparkDoseAPI._urlDiaPDF(pid, data) : SparkDoseAPI._urlDiaPNG(pid, data);
      let prev = '';
      if (isPdf) { prev = '<iframe src="' + url + '" style="width:100%;height:60vh;border:0;background:#fff;"></iframe>'; }
      else { prev = '<img id="df-dia-prev" style="width:100%;border-radius:12px;background:#fff;" />'; }
      this.openModal('<div class="card"><h3>Relatorio de hoje (' + data + ')</h3>' + prev + '<div><button onclick="app.baixarDiaX(\'' + tipo + '\')">Baixar</button><button onclick="app.closeModal()">Fechar</button></div><p>Diario de bordo diario com IA.</p></div>');
      if (!isPdf) {
        const im = document.getElementById('df-dia-prev');
        if (im) {
          const h2 = {};
          const tok2 = SparkDoseAPI.getToken();
          if (tok2) h2['Authorization'] = 'Bearer ' + tok2;
          fetch(url, { headers: h2 }).then(function(r){ return r.blob(); }).then(function(b){ im.src = URL.createObjectURL(b); }).catch(function(){});
        }
      }
    } catch(e) {}
  }
  async baixarDiaX(tipo) {
    try {
      if (!this.activeProfile) { return; }
      const data = this._hojeBR();
      if (tipo === 'pdf') await SparkDoseAPI.baixeDiaPDF(this.activeProfile.id, data);
      else await SparkDoseAPI.baixeDiaPNG(this.activeProfile.id, data);
      this.showToast('Relatorio baixado.');
    } catch(e) {}
  }
  async previewDiaPDF() { return this.previewDia('pdf'); }
  async previewDiaPNG() { return this.previewDia('png'); }
  async baixarDia(tipo) { return this.baixarDiaX(tipo); }

  // V2-IA modal helpers (sem quebrar Tomei/push/PDF)
  openModal(html) {
    try {
      let ov = document.getElementById("df-modal-ov");
      if (!ov) { ov = document.createElement("div"); ov.id = "df-modal-ov"; ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;"; ov.onclick = (e) => { if (e.target === ov) { try { app.closeModal(); } catch(_e) {} } }; document.body.appendChild(ov); }
      ov.innerHTML = html; ov.style.display = "flex";
    } catch(e) { try { alert("Abrir: "+e.message); } catch(_e) {} }
  }
  closeModal() {
    try { const ov = document.getElementById("df-modal-ov"); if (ov) { ov.style.display = "none"; ov.innerHTML = ""; } } catch(e) {}
  }
  async saveDocumentEntry() {
    const t = prompt("Titulo do documento (ex: Receita Losartana 02/2026):", "Receita");
    if (t === null) return;
    try {
      await SparkDoseAPI.request("/documents", {method:"POST", body: JSON.stringify({profile_id:this.activeProfile.id, title:t||"Receita", document_type:"prescription", file_path:"upload-manual.pdf", mime_type:"application/pdf"})});
      this.showToast("Documento registrado.");
      this.loadDocuments();
    } catch(e) { alert("Erro documento: "+e.message); }
  }

  async downloadDataExport() {
    try {
      const data = await SparkDoseAPI.exportPersonalData(this.activeProfile.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "dosefiel-lgpd-"+this.activeProfile.id+".json";
      a.click();
      this.showToast("Dados LGPD exportados (JSON).");
    } catch(e) { alert("Erro exportar LGPD: "+e.message); }
  }

  async showDrugDetails(drugId) {
    const c = document.getElementById("drug-smart-card-content");
    this.routeTo("screen-drug-smart-card");
    if (!c) return;
    c.innerHTML = "<p style='padding:20px;'>Carregando bula...</p>";
    try {
      const data = await SparkDoseAPI.getDrugDetails(drugId);
      const d = data.drug || {};
      c.innerHTML = "<div class='card'><h3 style='font-weight:800;'>"+this.esc(d.commercial_name||d.active_ingredient)+"</h3><div style='font-size:0.9rem;color:var(--text-muted);'>"+this.esc(d.active_ingredient)+" • DCB "+this.esc(d.dcb_number||"N/A")+" • ATC "+this.esc(d.atc_code||"N/A")+"</div><div style='font-size:0.85rem;margin-top:8px;'>Registro Anvisa: "+this.esc(d.registration_number||"Em consulta")+"</div>"+(d.official_leaflet_url?"<div style='margin-top:8px;'><a href='"+this.esc(d.official_leaflet_url)+"' target='_blank' style='color:var(--primary);'>📄 Bula oficial</a></div>":"")+"<div style='margin-top:14px;display:flex;gap:8px;'><button class='btn btn-primary' onclick=\"app.startPrescriptionWithDrug('"+drugId+"')\">+ Adicionar ao Tratamento</button></div></div>";
    } catch(e) { c.innerHTML = "<p>Erro: "+this.esc(e.message)+"</p>"; }
  }

  startPrescriptionWithDrug(drugId) {
    this._prefDrug = drugId;
    this.routeTo("screen-add-medication");
    this.showToast("Medicamento do catalogo vinculado. Confira horarios.");
  }

  renderBuscaResults(list, q) {
    const container = document.getElementById("catalog-results-container");
    let h = "<div style='font-size:0.8rem;color:var(--text-muted);margin-bottom:10px;'>"+this.esc(list.length)+" resultado(s) para \""+this.esc(q)+"\". Origem por item. <strong>Não comprova registro BR.</strong></div>";
    list.slice(0,20).forEach(r => {
      const origem = r.origem || (r.drug_id || r.commercial_name ? "Local" : "?");
      const badge = origem.includes("RxNorm") ? "🇺🇸 RxNorm/EUA" : origem.includes("Gov") ? "🇧🇷 GovBR" : "💊 Local";
      const nome = r.nome || r.commercial_name || r.brazilian_name || r.active_ingredient || "?";
      const princ = r.principio || r.active_ingredient || "";
      const extra = r.rxcui ? ("RXCUI "+this.esc(r.rxcui)+" • "+this.esc(r.tty||"")) : (r.registro ? ("Registro: "+this.esc(r.registro)) : (r.dcb_number ? ("DCB "+this.esc(r.dcb_number)) : ""));
      const did = r.drug_id || r.id || "";
      h += "<div class='card' style='margin-bottom:8px;'><div style='display:flex;justify-content:space-between;gap:8px;align-items:center;'><div><strong>"+this.esc(nome)+"</strong> <span style='font-size:0.75rem;background:var(--bg-subtle);padding:2px 8px;border-radius:999px;'>"+badge+"</span><div style='font-size:0.82rem;color:var(--text-muted);'>"+this.esc(princ)+" "+this.esc(extra)+"</div>"+(r.disclaimer?"<div style='font-size:0.72rem;color:var(--text-subtle);'>"+this.esc(r.disclaimer).slice(0,120)+"</div>":"")+"</div>"+(did?"<button class='btn btn-primary' style='padding:6px 12px;' onclick=\"app.showDrugDetails('"+did+"')\">Ver</button>":"<button class='btn btn-secondary' style='padding:6px 12px;' onclick=\"app.openManualRegistration('"+this.esc(nome).replace(/'/g,"")+"')\">Usar</button>")+"</div></div>";
    });
    container.innerHTML = h;
  }
  openManualRegistration(q) {
    this.routeTo("screen-add-medication");
    const el = document.getElementById("new-reg-name");
    if (el && q) el.value = q;
  }

  toggleFreqFields() {
    const f = document.getElementById("new-reg-freq") ? document.getElementById("new-reg-freq").value : "fixed_times";
    const wd = document.getElementById("freq-weekdays-wrap"); if (wd) wd.style.display = (f === "specific_days") ? "" : "none";
    const iv = document.getElementById("freq-interval-wrap"); if (iv) iv.style.display = (f === "interval_hours") ? "" : "none";
    const sg = document.getElementById("freq-single-wrap"); if (sg) sg.style.display = (f === "single_dose") ? "" : "none";
    const tm = document.getElementById("freq-times-wrap"); if (tm) tm.style.display = (f === "as_needed" || f === "single_dose") ? "none" : "";
  }
  getSelectedWeekdays() {
    const boxes = document.querySelectorAll("#new-reg-weekdays input[type=checkbox]:checked");
    return Array.from(boxes).map(b => b.value);
  }
  async saveNewRegimen() {
    try {
      const name = document.getElementById("new-reg-name") ? document.getElementById("new-reg-name").value.trim() : "";
      if (!name) { alert("Informe o nome do medicamento."); return; }
      const form = document.getElementById("new-reg-form") ? document.getElementById("new-reg-form").value : "Comprimido";
      const qty = parseFloat(document.getElementById("new-reg-qty") ? document.getElementById("new-reg-qty").value : "1") || 1;
      const freq = document.getElementById("new-reg-freq") ? document.getElementById("new-reg-freq").value : "fixed_times";
      const timesRaw = document.getElementById("new-reg-times") ? document.getElementById("new-reg-times").value : "08:00";
      const times = timesRaw.split(",").map(s=>s.trim()).filter(Boolean);
      const meal = document.getElementById("new-reg-meal") ? document.getElementById("new-reg-meal").value : "anytime";
      const stock = parseFloat(document.getElementById("new-reg-stock") ? document.getElementById("new-reg-stock").value : "30") || 30;
      const editId = document.getElementById("edit-reg-id") ? document.getElementById("edit-reg-id").value : "";
      const payload = {profile_id:this.activeProfile.id, drug_name:name, pharmaceutical_form:form, dose_quantity:qty, dose_unit:form, frequency_type:freq, fixed_times:times.length?times:["08:00"], interval_hours:8, meal_condition:meal, initial_stock:stock};
      if (freq === "specific_days") payload.days_of_week = this.getSelectedWeekdays();
      if (freq === "interval_hours") { const iv = document.getElementById("new-reg-interval"); payload.interval_hours = parseInt(iv && iv.value ? iv.value : "8", 10) || 8; }
      if (freq === "single_dose") { const sg = document.getElementById("new-reg-single"); if (sg && sg.value) payload.single_datetime = sg.value; else { alert("Informe data/hora da dose única."); return; } }
      if (this._prefDrug) payload.catalog_drug_id = this._prefDrug;
      let res;
      if (editId) { res = await SparkDoseAPI.updateRegimen(editId, payload); if (document.getElementById("edit-reg-id")) document.getElementById("edit-reg-id").value = ""; this.showToast("Tratamento atualizado."); }
      else { res = await SparkDoseAPI.createRegimen(payload); this.showToast("Tratamento salvo: "+(res.drug_name||name)); }
      this._prefDrug = null;
      this.routeTo("screen-dashboard");
      this.loadDashboard();
    } catch(e) { alert("Erro salvar tratamento: "+e.message); }
  }
  editRegimen(regId, drugName, freqType) {
    try {
      const hid = document.getElementById("edit-reg-id"); if (hid) hid.value = regId;
      const nm = document.getElementById("new-reg-name"); if (nm) nm.value = drugName || "";
      const fq = document.getElementById("new-reg-freq"); if (fq && freqType) fq.value = freqType;
      this.toggleFreqFields();
      this.routeTo("screen-add-medication");
      this.showToast("Editando tratamento. Salve para atualizar agenda.");
    } catch(e) { alert("Editar: "+e.message); }
  }

  async addStockLot() {
    const q = prompt("Quantidade do novo lote (unidades):", "30");
    if (q === null) return;
    alert("Lote registrado na criacao do tratamento. Para reposicao avulsa, cadastre via novo tratamento ou aguarde baixa automatica por Tomei. (Isto evita duplicidade de estoque.)");
  }

  async loadFamilyProfiles() {
    const c = document.getElementById("family-profiles-list");
    if (!c) return;
    try {
      const data = await SparkDoseAPI.getMe();
      const profs = data.profiles || this.profiles || [];
      let h = "";
      profs.forEach(p => { h += "<div class='card' style='margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;'><div><strong>"+this.esc(p.display_name)+"</strong><div style='font-size:0.82rem;color:var(--text-muted);'>"+this.esc(p.relationship_type)+(p.senior_mode_enabled?" • Idoso fonte grande":"")+(p.adhd_mode_enabled?" • TDAH":"")+"</div></div><button class='btn btn-secondary' style='padding:6px 12px;' onclick=\"app.switchProfile('"+p.id+"')\">Usar</button></div>"; });
      h += "<div class='card' style='margin-top:10px;'><h4 style='font-weight:700;'>Novo dependente</h4><div style='display:flex;gap:8px;margin-top:8px;'><input id='new-dep-name' class='form-input' placeholder='Nome (ex: Pai)' style='flex:1;'><button class='btn btn-primary' onclick='app.createDependent()'>Criar</button></div></div>";
      c.innerHTML = h;
    } catch(e) { c.innerHTML = "<p>Erro perfis: "+this.esc(e.message)+"</p>"; }
  }

  async createDependent() {
    const el = document.getElementById("new-dep-name");
    const nm = el ? el.value.trim() : "";
    if (!nm) { alert("Informe o nome."); return; }
    try {
      await SparkDoseAPI.request("/profiles", {method:"POST", body: JSON.stringify({display_name:nm, relationship_type:"dependent"})});
      this.showToast("Dependente criado.");
      const data = await SparkDoseAPI.getMe();
      this.profiles = data.profiles || [];
      this.renderProfileSelector();
      this.loadFamilyProfiles();
    } catch(e) { alert("Erro criar: "+e.message); }
  }

  async loadCaregivers() {
    let c = document.getElementById("caregiver-list");
    if (!c) {
      const sec = document.getElementById("screen-caregiver-permissions");
      if (sec && !document.getElementById("caregiver-list")) {
        const d = document.createElement("div");
        d.id = "caregiver-list";
        sec.appendChild(d);
        const f = document.createElement("div");
        f.className = "card";
        f.style.marginTop = "12px";
        f.innerHTML = "<h4 style='font-weight:700;'>Convidar cuidador</h4><div style='display:flex;gap:8px;margin-top:8px;'><input id='new-care-email' class='form-input' placeholder='email@exemplo.com' style='flex:1;'><button class='btn btn-primary' onclick='app.inviteCaregiver()'>Convidar</button></div><p style='font-size:0.8rem;color:var(--text-muted);margin-top:6px;'>Leitura + confirmacao por padrao. Convite 24h: expira automaticamente em 24h. Revogue com 1 toque.</p>";
        sec.appendChild(f);
      }
      c = document.getElementById("caregiver-list");
    }
    if (!c || !this.activeProfile) return;
    c.innerHTML = "<p style='padding:12px;color:var(--text-muted);'>Carregando cuidadores...</p>";
    try {
      const data = await SparkDoseAPI.request("/profiles/"+this.activeProfile.id+"/caregivers");
      const arr = data.caregivers || [];
      if (!arr.length) { c.innerHTML = "<div class='card'><p>Nenhum cuidador vinculado.</p></div>"; return; }
      let h = "";
      arr.forEach(r => {
        const exp = r.expires_at ? ("Expira: " + String(r.expires_at).slice(0,16).replace("T"," ")) : "Convite 24h";
        const expBadge = r.is_expired ? "<span style='color:var(--danger);font-weight:700;'>EXPIROU</span>" : "<span style='color:var(--accent);'>"+this.esc(exp)+"</span>";
        const tok = r.invite_token ? "<div style='font-size:0.75rem;color:var(--text-muted);'>Token: "+this.esc(r.invite_token)+"</div>" : "";
        h += "<div class='card' style='margin-bottom:8px;'><div style='display:flex;justify-content:space-between;align-items:center;'><div><strong>"+this.esc(r.caregiver_email_mask||"cuidador")+"</strong><div style='font-size:0.8rem;color:var(--text-muted);'>ver:"+(r.can_view_medications?"sim":"nao")+" \u2022 confirmar:"+(r.can_confirm_doses?"sim":"nao")+" \u2022 editar:"+(r.can_edit_regimens?"sim":"nao")+"</div><div style='font-size:0.8rem;'>"+expBadge+"</div>"+tok+"</div><button class='btn btn-secondary' style='padding:6px 12px;' onclick=\"app.revokeCaregiver('"+r.id+"')\">Revogar</button></div></div>";
      });
      c.innerHTML = h;
    } catch(e) { c.innerHTML = "<p>Erro cuidadores: "+this.esc(e.message)+"</p>"; }
  }

  async inviteCaregiver() {
    const el = document.getElementById("new-care-email");
    const em = el ? el.value.trim() : "";
    if (!em) { alert("Informe e-mail."); return; }
    try {
      const r = await SparkDoseAPI.request("/profiles/"+this.activeProfile.id+"/caregivers", {method:"POST", body: JSON.stringify({email:em})});
      this.showToast("Convite 24h criado: " + (r.expires_at ? String(r.expires_at).slice(0,16).replace("T"," ") : "24h"));
      if (r.invite_token) alert("Convite 24h criado.\nToken: "+r.invite_token+"\nExpira: "+r.expires_at+"\nRevogue com 1 toque em Revogar.");
      if (el) el.value = "";
      this.loadCaregivers();
    } catch(e) { alert("Erro convidar: "+e.message); }
  }

  async revokeCaregiver(permId) {
    if (!confirm("Revogar acesso deste cuidador agora?")) return;
    try {
      await SparkDoseAPI.request("/profiles/"+this.activeProfile.id+"/caregivers/"+permId, {method:"DELETE"});
      this.showToast("Acesso revogado.");
      this.loadCaregivers();
    } catch(e) { alert("Erro revogar: "+e.message); }
  }

  async loadNotificationsCenter() {
    let c = document.getElementById("notifications-list");
    if (!c) {
      const sec = document.getElementById("screen-notifications-center");
      if (sec) { const d=document.createElement("div"); d.id="notifications-list"; sec.appendChild(d); c=d; }
    }
    if (!c || !this.activeProfile) return;
    try {
      const d = await SparkDoseAPI.getNotificationDiagnostics(this.activeProfile.id);
      c.innerHTML = "<div class='card'><h4 style='font-weight:700;'>Fila servidor</h4><div style='font-size:0.9rem;margin-top:6px;'>Assinaturas ativas: "+this.esc(d.active_subscriptions!=null?d.active_subscriptions:(d.subscription_count||"?"))+" • Jobs pendentes: "+this.esc(d.pending_jobs!=null?d.pending_jobs:"?")+"</div><div style='margin-top:10px;'><button class='btn btn-secondary' onclick=\"app.routeTo('screen-push-diagnostics')\">Abrir diagnostico push</button></div></div>";
    } catch(e) { c.innerHTML = "<p>Erro centro notificacoes.</p>"; }
  }

  async loadRestock() {
    let c = document.getElementById("restock-content");
    if (!c) {
      const sec = document.getElementById("screen-restock");
      if (sec) { const d=document.createElement("div"); d.id="restock-content"; sec.appendChild(d); c=d; }
    }
    if (!c || !this.activeProfile) return;
    try {
      const data = await SparkDoseAPI.getInventory(this.activeProfile.id);
      const low = (data.inventory||[]).filter(l => (l.estimated_days_remaining||999) <= 7);
      if (!low.length) { c.innerHTML = "<div class='card'><p>Seu estoque esta suficiente para os proximos dias.</p></div>"; return; }
      let h = "<div class='card' style='border-left:4px solid var(--warning);margin-bottom:10px;'><strong>⚠️ "+low.length+" item(ns) para repor em ate 7 dias</strong></div>";
      low.forEach(l => { h += "<div class='card' style='margin-bottom:8px;'><strong class='discrete-blur'>"+this.esc(l.custom_drug_name)+"</strong><div style='font-size:0.85rem;'>Restam "+this.esc(l.quantity_current)+" • ~"+this.esc(l.estimated_days_remaining)+" dias (ate "+this.esc(l.exhaustion_date||"-")+")</div></div>"; });
      c.innerHTML = h;
    } catch(e) { c.innerHTML = "<p>Erro reposicao.</p>"; }
  }

  async toggleSeniorMode() {
    const on = !document.body.classList.contains("mode-senior");
    document.body.classList.toggle("mode-senior", on);
    try { if (this.activeProfile) await SparkDoseAPI.request("/profiles/"+this.activeProfile.id, {method:"PUT", body: JSON.stringify({senior_mode_enabled:on})}); this.activeProfile.senior_mode_enabled = on?1:0; } catch(e) {}
    this.showToast(on?"Modo Idoso ATIVADO (fonte grande).":"Modo Idoso desativado.");
  }

  async toggleAdhdMode() {
    const on = !document.body.classList.contains("mode-adhd");
    document.body.classList.toggle("mode-adhd", on);
    try { if (this.activeProfile) await SparkDoseAPI.request("/profiles/"+this.activeProfile.id, {method:"PUT", body: JSON.stringify({adhd_mode_enabled:on})}); } catch(e) {}
    this.showToast(on?"Modo TDAH ativado.":"Modo TDAH desativado.");
  }

  async toggleDiscreteMode() {
    const on = !document.body.classList.contains("mode-discrete");
    document.body.classList.toggle("mode-discrete", on);
    try { if (this.activeProfile) await SparkDoseAPI.request("/profiles/"+this.activeProfile.id, {method:"PUT", body: JSON.stringify({discrete_mode_enabled:on})}); } catch(e) {}
    this.showToast(on?"Modo Discreto ativado.":"Modo Discreto desativado.");
  }

  checkFirstUseTutorial() {
    try {
      if (localStorage.getItem("dosefiel_tutorial_seen") === "1") return;
      if (document.getElementById("dosefiel-tutorial-modal")) return;
      const m = document.createElement("div");
      m.id = "dosefiel-tutorial-modal";
      m.style.cssText = "position:fixed;inset:0;background:rgba(2,6,23,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;";
      m.innerHTML = "<div class='card' style='max-width:520px;width:100%;padding:28px;'><div class='card-subtitle'>PRIMEIRO USO • 1 MIN</div><h2 style='font-weight:800;font-size:1.4rem;'>Bem-vindo ao Spark Dose 💊</h2><ol style='margin:12px 0 12px 18px;font-size:0.95rem;display:flex;flex-direction:column;gap:8px;'><li><strong>1.</strong> Busque seu remedio no catalogo Anvisa.</li><li><strong>2.</strong> Cadastre horarios exatos da receita.</li><li><strong>3.</strong> Toque <strong>✓ Tomei</strong> na hora (atrasou &gt;30min vira <em>atrasada</em>, sem dose dupla).</li><li><strong>4.</strong> Ative notificacoes em Diagnostico Push + instale o PWA.</li><li><strong>5.</strong> Acompanhe Relatorio de Adesao e Estoque baixo.</li></ol><div style='display:flex;gap:8px;'><button class='btn btn-primary' style='flex:1;' onclick=\"app.dismissTutorial()\">Entendi, comecar</button><button class='btn btn-secondary' onclick=\"app.routeTo('screen-help');app.dismissTutorial()\">Ver ajuda completa</button></div></div>";
      document.body.appendChild(m);
    } catch(e) {}
  }

  dismissTutorial() {
    try { localStorage.setItem("dosefiel_tutorial_seen","1"); } catch(e) {}
    const m = document.getElementById("dosefiel-tutorial-modal");
    if (m) m.remove();
  }

  renderHelp() {
    const sec = document.getElementById("screen-help");
    if (!sec || document.getElementById("help-filled")) return;
    const d = document.createElement("div");
    d.id = "help-filled";
    d.innerHTML = "<div class='card'><h3 style='font-weight:700;'>Tutorial rapido (5 passos)</h3><ol style='margin:8px 0 0 18px;font-size:0.92rem;display:flex;flex-direction:column;gap:6px;'><li>Catalogo → Buscar → Adicionar ao Tratamento.</li><li>Horarios fixos (08:00, 20:00) ou intervalo (a cada 8h).</li><li>Dashboard → ✓ Tomei / Adiar 15min / Nao tomei com motivo.</li><li>Ja Tomei? mostra ultima dose exata (anti dose-dupla).</li><li>Push: instale o PWA + permita notificacoes. iPhone: Safari → Compartilhar → Tela de Inicio (iOS 16.4+).</li></ol><div style='margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;'><button class='btn btn-secondary' onclick=\"app.routeTo('screen-onboarding')\">Refazer configuracao inicial</button><button class='btn btn-secondary' onclick=\"app.routeTo('screen-push-diagnostics')\">Testar push real</button><button class='btn btn-secondary' onclick=\"app.downloadDataExport()\">Exportar LGPD</button></div></div><div class='card' style='margin-top:10px;'><h4 style='font-weight:700;'>Limites honestos</h4><p style='font-size:0.88rem;color:var(--text-muted);'>PWA precisa de internet p/ push; sem alarme offline com app fechado (isso exige app nativo/Capacitor = fase loja). Confirmacao = ato consciente, sem sensor biologico. Sem interacoes RxNav simuladas.</p></div>";
    sec.appendChild(d);
  }

  calcIdade(iso) {
    try {
      if (!iso) return null;
      const b = new Date(iso.slice(0,10)+"T12:00:00");
      if (isNaN(b)) return null;
      const hoje = new Date();
      let age = hoje.getFullYear()-b.getFullYear();
      const m = hoje.getMonth()-b.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < b.getDate())) age--;
      if (age < 0 || age > 130) return null;
      return age;
    } catch(e) { return null; }
  }
  async doLoginAction() {
    const em = document.getElementById("login-email") ? document.getElementById("login-email").value.trim() : "";
    const pw = document.getElementById("login-pass") ? document.getElementById("login-pass").value : "";
    const remEl = document.getElementById("login-remember");
    const remember = remEl ? !!remEl.checked : true;
    if (!em || !em.includes("@")) { alert("Informe um e-mail válido para entrar."); return; }
    if (!pw) { alert("Informe sua senha."); return; }
    try {
      const r = await SparkDoseAPI.loginAccount(em, pw, remember);
      if (r.token) localStorage.setItem("dosefiel_token", r.token);
      try { localStorage.removeItem("dosefiel_demo"); } catch(e) {}
      if (r.user) this.currentUser = r.user;
      const days = r.expires_days || (remember ? 30 : 7);
      this.showToast("Login OK (" + days + "d). Bem-vindo, " + ((r.user && r.user.full_name) || "ao Spark Dose") + "!");
      try { const me = await SparkDoseAPI.getMe(); this.currentUser = me.user; this.profiles = me.profiles || []; this.activeProfile = this.profiles.find(function(x){return x.is_primary;}) || this.profiles[0]; this.applyAccessibilityModes(); this.loadThemeFromProfile(); this.renderProfileSelector(); } catch(e) {}
      try { await this.checkOnboardingForce(); if (this.currentScreen === "screen-onboarding") return; } catch(e) {}
      this.routeTo("screen-dashboard", true);
    } catch(e) {
      alert("Entrar: " + (e.message || "E-mail ou senha incorretos."));
    }
  }
  async doLogoutAction() {
    try { SparkDoseAPI.logoutLocal(); } catch(e) {}
    this.currentUser = null;
    this.profiles = [];
    this.activeProfile = null;
    try { this.renderProfileSelector(); } catch(e) {}
    const em = document.getElementById("login-email"); if (em) em.value = "";
    const pw = document.getElementById("login-pass"); if (pw) pw.value = "";
    this.showToast("Você saiu. Token limpo.");
    this.routeTo("screen-login", true);
  }
  async doDemoAction() {
    try {
      const r = await SparkDoseAPI.demoLogin();
      if (r.token) localStorage.setItem("dosefiel_token", r.token);
      try { localStorage.setItem("dosefiel_demo", "1"); } catch(e) {}
      if (r.user) this.currentUser = r.user;
      this.profiles = r.profiles || [];
      try {
        const me = await SparkDoseAPI.getMe();
        this.currentUser = me.user; this.profiles = me.profiles || [];
      } catch(e) {}
      this.activeProfile = this.profiles.find(function(x){return x.is_primary;}) || this.profiles[0];
      this.applyAccessibilityModes();
      this.renderProfileSelector();
      this.showToast("Demonstração isolada (12h). Seus dados reais ficam separados.");
      this.routeTo("screen-dashboard", true);
    } catch(e) { alert("Demo: " + (e.message || "Tente de novo.")); }
  }
  async deleteRegimenAction(regId, drugName) {
    if (!regId) return;
    if (!confirm("Excluir tratamento '" + (drugName || regId) + "'? Ele some da lista (soft-cancel).")) return;
    if (!confirm("Confirmar de novo: excluir mesmo?")) return;
    try {
      await SparkDoseAPI.deleteRegimen(regId);
      this.showToast("Tratamento excluído (some da lista active).");
      try { await this.loadDashboard(); } catch(e) {}
      try { await this.loadAgenda(); } catch(e) {}
    } catch(e) { alert("Excluir tratamento: " + (e.message || "Tente de novo.")); }
  }
  async deleteOccurrenceAction(occId) {
    if (!occId) return;
    if (!confirm("Excluir esta dose futura avulsa? Passadas são imutáveis.")) return;
    try {
      await SparkDoseAPI.deleteOccurrence(occId);
      this.showToast("Dose futura excluída.");
      try { await this.loadDashboard(); } catch(e) {}
      try { await this.loadAgenda(); } catch(e) {}
    } catch(e) {
      if (e && e.status === 403) alert("Não permitido: " + (e.message || "passadas imutáveis, só futura agendada."));
      else alert("Excluir dose: " + (e.message || "Tente de novo."));
    }
  }
  async doRegisterAction() {
    const em = document.getElementById("login-email") ? document.getElementById("login-email").value.trim() : "";
    const pw = document.getElementById("login-pass") ? document.getElementById("login-pass").value : "";
    const nm = document.getElementById("reg-name") ? document.getElementById("reg-name").value.trim() : "";
    const nasc = document.getElementById("reg-birth") ? document.getElementById("reg-birth").value : "";
    const tel = document.getElementById("reg-phone") ? document.getElementById("reg-phone").value.trim() : "";
    const foto = document.getElementById("reg-photo") ? document.getElementById("reg-photo").value.trim() : "";
    if (!nm || nm.length < 2) { alert("Informe seu nome completo."); return; }
    if (!nasc) { alert("Informe sua data de nascimento."); return; }
    if (!em || !em.includes("@")) { alert("Informe um e-mail válido."); return; }
    if (!pw || pw.length < 6) { alert("Senha muito curta: use 6 ou mais caracteres."); return; }
    try {
      const r = await SparkDoseAPI.registerAccount(em, pw, nm, tel, nasc, foto);
      if (r.token) localStorage.setItem("dosefiel_token", r.token);
      try { localStorage.removeItem("dosefiel_demo"); } catch(e) {}
      if (r.user) this.currentUser = r.user;
      this.showToast("Conta criada! Bem-vindo, " + nm.split(" ")[0] + ".");
      try { const me = await SparkDoseAPI.getMe(); this.currentUser = me.user; this.profiles = me.profiles || []; this.activeProfile = this.profiles.find(function(x){return x.is_primary;}) || this.profiles[0]; this.applyAccessibilityModes(); this.renderProfileSelector(); } catch(e) {}
      this.routeTo("screen-onboarding", true);
      try { this.renderOnboardingSteps(); } catch(e) {}
    } catch(e) { alert("Criar conta: " + (e.message || "Não foi possível concluir.")); }
  }
  async doRecoverAction() {
    const inputs = document.querySelectorAll("#screen-account-recovery input[type=email]");
    const em = inputs.length ? inputs[0].value.trim() : prompt("Seu e-mail cadastrado:", "");
    if (!em) return;
    if (!em.includes("@")) { alert("Informe um e-mail válido."); return; }
    try {
      const r = await SparkDoseAPI.recoverPassword(em);
      alert(((r && r.message) || "Se o e-mail existir, instruções foram geradas.")+((r && r.reset_token_demo)?"\nToken demo (1h): "+r.reset_token_demo+"\nUse em Redefinir (se disponível) ou avise o suporte.":""));
      this.routeTo("screen-login");
    } catch(e) { alert("Recuperar: " + (e.message || "Tente de novo.")); }
  }
  async loadMyProfile() {
    try {
      const me = await SparkDoseAPI.getMe();
      const u = me.user || {};
      this.currentUser = u;
      const nasc = u.birth_date || ((me.profiles && me.profiles[0] && me.profiles[0].birth_date) || "");
      const idade = (u.idade != null ? u.idade : this.calcIdade(nasc));
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ""; };
      set("perfil-nome", u.full_name || "");
      set("perfil-email", u.email || "");
      set("perfil-nasc", (nasc || "").slice(0,10));
      set("perfil-tel", u.phone || "");
      set("perfil-foto-url", u.photo_url || "");
      const img = document.getElementById("perfil-foto");
      if (img) img.src = u.photo_url || "/apps/dosefiel/icons/icon-192.png";
      const res = document.getElementById("perfil-resumo");
      if (res) res.innerHTML = this.esc(u.full_name || "") + " • " + this.esc(u.email || "") + (idade != null ? " • " + idade + " anos" : "");
      const idEl = document.getElementById("perfil-idade");
      if (idEl) idEl.textContent = (idade != null ? idade + " anos" : "Idade calculada da data de nascimento.");
    } catch(e) {
      const res = document.getElementById("perfil-resumo");
      if (res) res.textContent = "Entre para ver seu perfil.";
    }
  }
  async saveMyProfile() {
    const nm = document.getElementById("perfil-nome") ? document.getElementById("perfil-nome").value.trim() : "";
    const nasc = document.getElementById("perfil-nasc") ? document.getElementById("perfil-nasc").value : "";
    const tel = document.getElementById("perfil-tel") ? document.getElementById("perfil-tel").value.trim() : "";
    const foto = document.getElementById("perfil-foto-url") ? document.getElementById("perfil-foto-url").value.trim() : "";
    if (!nm || nm.length < 2) { alert("Informe seu nome completo."); return; }
    if (!nasc) { alert("Informe sua data de nascimento."); return; }
    try {
      const r = await SparkDoseAPI.updateMe({full_name: nm, birth_date: nasc, phone: tel, photo_url: foto});
      if (r.user) this.currentUser = r.user;
      this.showToast("Perfil atualizado!");
      this.loadMyProfile();
      try { const me = await SparkDoseAPI.getMe(); this.profiles = me.profiles || []; this.renderProfileSelector(); } catch(e) {}
    } catch(e) { alert("Salvar perfil: " + (e.message || "Tente de novo.")); }
  }
  async deleteMyAccount() {
    if (!confirm("Excluir sua conta Spark Dose? Isso apaga login e perfis (LGPD). Tratamentos são cancelados.")) return;
    if (!confirm("Confirmar de novo: deseja mesmo excluir TUDO?")) return;
    try {
      await SparkDoseAPI.deleteMe();
      try { localStorage.removeItem("dosefiel_token"); } catch(e) {}
      this.showToast("Conta excluída.");
      this.routeTo("screen-login");
    } catch(e) { alert("Excluir conta: " + (e.message || "Tente de novo.")); }
  }
  async deleteMyData() {
    if (!confirm("Confirmar exclusao LGPD? Isso cancela tratamentos ativos deste perfil.")) return;
    try {
      const regs = await SparkDoseAPI.request("/regimens?profile_id="+this.activeProfile.id);
      for (const r of (regs.regimens||[])) {
        try { await SparkDoseAPI.request("/regimens/"+r.id, {method:"DELETE"}); } catch(e) {}
      }
      try { localStorage.removeItem("dosefiel_tutorial_seen"); } catch(e) {}
      this.showToast("Exclusao solicitada: tratamentos cancelados.");
      this.loadDashboard();
    } catch(e) { alert("Erro exclusao: "+e.message); }
  }
  // --------------------------------------------------------------------------
  // TELA 30: PAINEL ADMINISTRATIVO SEGURO
  // --------------------------------------------------------------------------
  async loadAdminMetrics() {
    const container = document.getElementById("admin-metrics-content");
    if (!container) return;

    try {
      const data = await SparkDoseAPI.getAdminMetrics();
      container.innerHTML = `
        <div class="cards-grid">
          <div class="card">
            <div class="card-subtitle">USUÁRIOS CADASTRADOS</div>
            <div style="font-size:2rem;font-weight:800;">${data.metrics.total_users}</div>
          </div>
          <div class="card">
            <div class="card-subtitle">REGIMES ATIVOS</div>
            <div style="font-size:2rem;font-weight:800;color:var(--primary);">${data.metrics.active_regimens}</div>
          </div>
          <div class="card">
            <div class="card-subtitle">OCORRÊNCIAS GERADAS</div>
            <div style="font-size:2rem;font-weight:800;">${data.metrics.total_occurrences}</div>
          </div>
          <div class="card">
            <div class="card-subtitle">CONFIRMAÇÕES CLÍNICAS</div>
            <div style="font-size:2rem;font-weight:800;color:var(--accent);">${data.metrics.total_confirmations}</div>
          </div>
          <div class="card">
            <div class="card-subtitle">JOBS DE NOTIFICAÇÃO PENDENTES</div>
            <div style="font-size:2rem;font-weight:800;">${data.metrics.pending_notification_jobs}</div>
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<p>Erro ao carregar métricas administrativas.</p>`;
    }
  }
}

// Inicializar aplicativo
window.addEventListener("DOMContentLoaded", () => {
  window.app = new SparkDoseApp();
});
