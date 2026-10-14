/**
 * SPARK DOSE HEALTH — PWA & Web Push Manager
 * Detecao de plataforma (iOS/Android), instalacao orientada e diagnostico de notificacoes
 */

let deferredInstallPrompt = null;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

class PWAManager {
  static init() {
    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.checkPlatformEnvironment();
  }

  static isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || 
           window.navigator.standalone === true;
  }

  static isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  static isAndroid() {
    return /Android/.test(navigator.userAgent);
  }

  static async registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.register("/apps/dosefiel/sw.js");
        console.log("[Spark Dose PWA] Service Worker registrado com sucesso:", reg.scope);
      } catch (err) {
        console.warn("[Spark Dose PWA] Falha ao registrar Service Worker:", err);
      }
    }
  }

  static getInstallDismissKey() { return "dosefiel_install_dismissed_until"; }
  static isInstallDismissed() {
    try {
      var v = parseInt(localStorage.getItem("dosefiel_install_dismissed_until") || "0", 10);
      return !!v && Date.now() < v;
    } catch(e) { return false; }
  }
  static shouldShowInstallBanner() {
    if (this.isStandalone()) return false;
    if (this.isInstallDismissed()) return false;
    return true;
  }
  static hideInstallBanners() {
    try {
      var a = document.getElementById("pwa-install-banner");
      if (a) a.style.display = "none";
      var b = document.getElementById("ios-install-banner");
      if (b) b.style.display = "none";
    } catch(e) {}
  }
  static dismissInstallBanner() {
    try { localStorage.setItem("dosefiel_install_dismissed_until", String(Date.now() + 7*24*60*60*1000)); } catch(e) {}
    this.hideInstallBanners();
  }
  static showInstallBanner(force) {
    if (this.isStandalone()) { this.hideInstallBanners(); return false; }
    if (!force && this.isInstallDismissed()) return false;
    if (this.isIOS()) {
      var ib = document.getElementById("ios-install-banner");
      if (ib) { ib.style.display = "flex"; return true; }
    }
    var b = document.getElementById("pwa-install-banner");
    if (b) { b.style.display = "flex"; return true; }
    return false;
  }

  static setupInstallPrompt() {
    try { if (this.isStandalone()) { this.hideInstallBanners(); } } catch(e) {}
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (this.shouldShowInstallBanner()) {
        this.showInstallBanner(false);
      }
    });

    window.addEventListener("appinstalled", () => {
      console.log("[Spark Dose PWA] Aplicativo instalado na Tela de Inicio!");
      deferredInstallPrompt = null;
      try { localStorage.removeItem("dosefiel_install_dismissed_until"); } catch(e) {}
      this.hideInstallBanners();
    });
    try {
      var mq = window.matchMedia("(display-mode: standalone)");
      var selfRef = this;
      if (mq && mq.addEventListener) {
        mq.addEventListener("change", function(ev) {
          if (ev.matches) selfRef.hideInstallBanners();
        });
      }
    } catch(e) {}
  }

  static checkPlatformEnvironment() {
    if (!this.shouldShowInstallBanner()) return;
    if (this.isIOS() && !this.isStandalone()) {
      this.showInstallBanner(false);
    }
  }

  static async promptInstall() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      console.log("[Spark Dose PWA] Resposta de instalacao do usuario:", outcome);
      deferredInstallPrompt = null;
    } else if (this.isIOS()) {
      alert("Para instalar no iPhone/iPad:\n\n1. Toque no icone de Compartilhar (quadrado com seta para cima) na barra do Safari.\n2. Role para baixo e selecione 'Adicionar a Tela de Inicio'.\n3. Toque em 'Adicionar' no canto superior direito.");
    }
  }

  static async enablePushNotifications(profileId) {
    if (!("Notification" in window)) {
      throw new Error("Seu navegador nao oferece suporte a API de Notificacoes.");
    }

    if (this.isIOS() && !this.isStandalone()) {
      throw new Error("No iPhone, as notificacoes Web Push so funcionam apos o aplicativo ser adicionado a Tela de Inicio.");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Permissao de notificacoes recusada pelo usuario.");
    }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      const keyData = await SparkDoseAPI.request("/notifications/vapid-key");
      const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    const platform = this.isIOS() ? "ios" : (this.isAndroid() ? "android" : "web");
    return await SparkDoseAPI.subscribePush(profileId, sub, platform);
  }

  static async runDiagnostics(profileId) {
    const results = {
      isStandalone: this.isStandalone(),
      hasServiceWorker: "serviceWorker" in navigator,
      hasNotificationAPI: "Notification" in window,
      hasPushManager: "PushManager" in window,
      permissionState: "Notification" in window ? Notification.permission : "unsupported",
      isIOS: this.isIOS(),
      isAndroid: this.isAndroid(),
      subscriptionActive: false,
      serverCheck: null
    };

    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          results.subscriptionActive = !!sub;
        }
      } catch (e) {
        console.warn("Erro ao checar sub:", e);
      }
    }

    try {
      results.serverCheck = await SparkDoseAPI.getNotificationDiagnostics(profileId);
    } catch (e) {
      results.serverCheck = { error: "Nao foi possivel contatar o servidor" };
    }

    return results;
  }
}

window.PWAManager = PWAManager;
