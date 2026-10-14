/* Configuração pública. A chave da IA NUNCA deve ficar neste arquivo. */
const SPARK_BASE = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? window.location.origin : 'https://sparkbr.online';
window.SPARK_CONFIG = Object.freeze({
  product: 'SparkBR',
  appsOrigin: SPARK_BASE,
  aiEndpoint: SPARK_BASE + '/navegador/api/ai/chat',
  appsEndpoint: SPARK_BASE + '/navegador/apps.json',
  helpUrl: 'https://sparkbr.online/manual/',
  installUrl: 'https://sparkbr.online/baixar/',
  privacyUrl: 'https://sparkbr.online/privacidade/',
  searchEngine: 'https://www.google.com/search?q=',
  storagePrefix: 'sparkbr2_',
  maxTabs: 100
});
