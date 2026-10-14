/* Shared family panel for all SparkBR apps. Reuses the main SparkBR account. */
(() => {
  'use strict';
  if (window.__sparkFamilyPanelLoaded) return;
  window.__sparkFamilyPanelLoaded = true;
  const API = () => window.SparkBR && window.SparkBR.ecosystem;
  const appIds = new Set(['spark','sparkmat','sparkpet','saude','agua','posto','familia','financeiro','farmacia','dose','astromatch','contas','cardapio','agenda','cofrinho','faxina','escola','carteirinha','energia','bico','sono','mural','ideias']);
  const privateApps = new Set(['saude','dose','farmacia','carteirinha','astromatch']);
  const appNames = {spark:'Spark Mercado',sparkmat:'SparkMat Obra',sparkpet:'SparkPet',saude:'Spark Saúde',agua:'Spark Água',posto:'Spark Posto',familia:'Família Spark',financeiro:'Spark Financeiro',farmacia:'Spark Farmácia',dose:'Spark Dose',astromatch:'AstroMatch',contas:'Contas da Casa',cardapio:'Cardápio da Semana',agenda:'Agenda da Família',cofrinho:'Cofrinho e Dívidas',faxina:'Faxina da Casa',escola:'Escola e Crianças',carteirinha:'Carteirinha e Exames',energia:'Luz, Água e Gás',bico:'Bico e Renda Extra',sono:'Cantinho do Sono',mural:'Mural de Elogios',ideias:'Canal de Ideias'};
  const labels = {'shopping-list':'Lista compartilhada de compras','meal-plan':'Cardápio da família','family-tasks':'Tarefas da família','calendar':'Agenda compartilhada','household-expenses':'Organização da casa','home-inventory':'Inventário da casa','pet-care':'Cuidados com pets','school-checklist':'Checklist escolar','vehicle-log':'Registros do veículo','water-goals':'Metas de hidratação','sleep-habits':'Rotina de descanso','ideas':'Ideias e recados'};
  const allowed = {
    spark:['shopping-list','meal-plan'], cardapio:['meal-plan','shopping-list'],
    familia:['family-tasks','calendar','home-inventory'], faxina:['family-tasks','home-inventory'],
    escola:['family-tasks','calendar','school-checklist'], sparkmat:['family-tasks','home-inventory'],
    sparkpet:['family-tasks','home-inventory','pet-care'], agenda:['calendar','family-tasks'],
    contas:['household-expenses'], financeiro:['household-expenses'], cofrinho:['household-expenses'],
    energia:['household-expenses','home-inventory'], posto:['vehicle-log','household-expenses'],
    bico:['household-expenses'], agua:['water-goals'], sono:['sleep-habits'], mural:['ideas'], ideias:['ideas']
  };
  const appId = (() => {
    const fromBody = document.body && document.body.dataset ? document.body.dataset.sparkPage : '';
    if (appIds.has(fromBody)) return fromBody;
    const slug = location.pathname.split('/').filter(Boolean)[0] || 'familia';
    return appIds.has(slug) ? slug : 'familia';
  })();
  const make = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const button = (text, cls, fn) => {
    const el = make('button', cls, text); el.type = 'button'; el.addEventListener('click', fn); return el;
  };
  const addStyle = () => {
    if (document.querySelector('link[data-spark-family-css]')) return;
    const link = make('link'); link.rel = 'stylesheet'; link.href = '/navegador/bridge/spark-family.css?v=2.1.0'; link.dataset.sparkFamilyCss = '1'; document.head.append(link);
  };
  addStyle();
  const trigger = button('Minha família', 'spark-family-trigger', openPanel);
  trigger.setAttribute('aria-haspopup','dialog'); trigger.setAttribute('aria-expanded','false');
  const shellTools = document.querySelector('#spark-shell .spark-shell-tools');
  const homeHeader = document.querySelector('.site-header .header-meta');
  if (shellTools) shellTools.prepend(trigger);
  else if (homeHeader) homeHeader.append(trigger);
  else { trigger.classList.add('spark-family-trigger-floating'); document.body.append(trigger); }

  const overlay = make('div','spark-family-overlay'); overlay.hidden = true;
  const panel = make('section','spark-family-panel');
  panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true'); panel.setAttribute('aria-labelledby','spark-family-title');
  const head = make('header','spark-family-head');
  const headCopy = make('div',''); headCopy.append(make('span','spark-family-eyebrow','ECOSSISTEMA SPARKBR'), make('h2','','Sua família, conectada.'));
  const close = button('×','spark-family-close',closePanel); close.setAttribute('aria-label','Fechar painel da família');
  head.append(headCopy,close);
  const content = make('div','spark-family-content');
  panel.append(head,content); overlay.append(panel); document.body.append(overlay);
  const live = make('p','spark-family-live'); live.setAttribute('role','status'); live.setAttribute('aria-live','polite');
  let session = null, collection = '', stopEvents = null, lastInvite = '';
  function say(message, error = false) { live.textContent = message || ''; live.classList.toggle('is-error',!!error); }
  function openPanel() {
    overlay.hidden = false; trigger.setAttribute('aria-expanded','true'); document.body.classList.add('spark-family-panel-open');
    refresh().then(() => { const first = content.querySelector('input,button,select,a'); if (first) first.focus(); });
  }
  function closePanel() {
    overlay.hidden = true; trigger.setAttribute('aria-expanded','false'); document.body.classList.remove('spark-family-panel-open'); trigger.focus();
    if (stopEvents) { stopEvents(); stopEvents = null; }
  }
  overlay.addEventListener('click', e => { if (e.target === overlay) closePanel(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) closePanel(); });
  function resetContent() { if (stopEvents) { stopEvents(); stopEvents=null; } content.replaceChildren(); live.textContent = ''; content.append(live); }
  async function refresh() {
    const api = API();
    resetContent();
    if (!api) { say('A ponte do ecossistema não carregou. Recarregue a página.',true); return; }
    try { session = await api.session(); } catch (e) { session = null; say(e.message || 'Não foi possível conectar ao servidor.',true); return; }
    if (session && session.authenticated) renderDashboard(); else renderAuth();
  }
  function renderAuth() {
    const intro = make('p','spark-family-intro','O compartilhamento usa a mesma conta principal do SparkBR. Entre ou cadastre-se na página inicial e depois volte a este painel.');
    const action = button('Entrar ou cadastrar no SparkBR','spark-family-primary',() => {
      const loginButton = document.getElementById('hub-login-top');
      if (loginButton) { loginButton.click(); return; }
      if (location.pathname === '/' || location.pathname === '/index.html') {
        const account = document.getElementById('hub-account');
        if (account) account.click(); else say('Use o botão Entrar / Cadastrar no topo da página.',true);
      } else {
        location.href = '/';
      }
    });
    const refreshBtn = button('Já entrei — verificar novamente','spark-family-secondary',() => refresh());
    const note = make('div','spark-family-private');
    note.append(make('strong','','Sessão segura da conta principal'),make('p','','Após a atualização do servidor, saia e entre novamente no SparkBR para ativar a sessão segura entre os aplicativos. Nenhuma senha é criada neste painel.'));
    content.append(intro,action,refreshBtn,note);
    say('A conta e a senha são gerenciadas pelo próprio SparkBR.');
  }
  function renderDashboard() {
    resetContent();
    const profile = make('div','spark-family-profile');
    profile.append(make('span','spark-family-avatar','✳'));
    const identity = make('div',''); identity.append(make('strong','',session.user.name),make('small','',session.user.email),make('span','spark-family-familyname',(session.family.name || 'Família')+' · '+session.family.memberCount+' membro(s)'));
    profile.append(identity); content.append(profile);
    if (Array.isArray(session.memberships) && session.memberships.length > 1) {
      const familyLabel = make('label','spark-family-switch-label','Família ativa');
      const familySelect = make('select','spark-family-select');
      session.memberships.forEach(m => { const option = make('option','',m.name+' · '+m.role); option.value=m.familyId; familySelect.append(option); });
      familySelect.value = session.family.id;
      familySelect.addEventListener('change', async () => {
        familySelect.disabled = true;
        try { session = await API().selectFamily(familySelect.value); renderDashboard(); say('Família ativa alterada.'); }
        catch (e) { say(e.message,true); }
        finally { familySelect.disabled = false; }
      });
      familyLabel.append(familySelect); content.append(familyLabel);
    }
    const inviteRow = make('div','spark-family-row');
    const inviteBtn = button('Convidar alguém da família ＋','spark-family-secondary',async()=>{
      inviteBtn.disabled=true; say('Gerando convite…');
      try { const result=await API().invite(); lastInvite=result.code; inviteResult.replaceChildren(make('strong','',result.code),make('small','','Válido por 7 dias · uso único')); const copy=button('Copiar código','spark-family-copy',async()=>{try{await navigator.clipboard.writeText(lastInvite);say('Código copiado. Envie para a pessoa da família.');}catch{say('Código: '+lastInvite);}}); inviteResult.append(copy); say('Convite criado. Compartilhe o código com quem você quer incluir.'); }
      catch(e){say(e.message,true);} finally {inviteBtn.disabled=false;}
    });
    const inviteResult = make('div','spark-family-invite-result'); inviteRow.append(inviteBtn,inviteResult); content.append(inviteRow);
    const joinForm = make('form','spark-family-join');
    const joinInput = make('input'); joinInput.placeholder='Entrar em outra família com convite'; joinInput.maxLength=24; joinInput.autocomplete='off'; joinInput.required=true;
    const joinBtn=make('button','spark-family-secondary','Usar convite'); joinBtn.type='submit'; joinForm.append(joinInput,joinBtn);
    joinForm.addEventListener('submit',async e=>{e.preventDefault();joinBtn.disabled=true;try{session=await API().join(joinInput.value);say('Você entrou na família '+session.family.name+'.');renderDashboard();}catch(err){say(err.message,true);}finally{joinBtn.disabled=false;}});
    content.append(joinForm);
    const line=make('div','spark-family-divider'); content.append(line);
    const options = allowed[appId] || [];
    if (privateApps.has(appId) || options.length===0) {
      const note=make('div','spark-family-private');
      note.append(make('strong','','Este aplicativo mantém seus dados pessoais privados.'),make('p','','Por segurança, não sincronizamos automaticamente informações de saúde, medicamentos, exames ou relacionamentos. Você ainda pode entrar na conta e convidar sua família para usar os outros aplicativos.'));
      content.append(note);
    } else {
      const sectionHead=make('div','spark-family-section-head');
      sectionHead.append(make('h3','','Compartilhamento da família'),make('small','',appNames[appId]||appId));
      const select=make('select','spark-family-select'); select.setAttribute('aria-label','Escolher lista compartilhada');
      options.forEach(id=>{const option=make('option','',labels[id]||id);option.value=id;select.append(option);});
      collection=options.includes(collection)?collection:options[0]; select.value=collection;
      const records=make('div','spark-family-records'); records.setAttribute('aria-live','polite');
      const addForm=make('form','spark-family-add');
      const title=make('input'); title.placeholder=collection==='shopping-list'?'Item para a lista de compras':'Título ou item para compartilhar'; title.maxLength=160; title.required=true;
      const notes=make('input'); notes.placeholder='Detalhe opcional (sem dados sensíveis)'; notes.maxLength=300;
      const addBtn=make('button','spark-family-primary','Compartilhar ＋'); addBtn.type='submit'; addForm.append(title,notes,addBtn);
      const updatePlaceholder=()=>{title.placeholder=collection==='shopping-list'?'Item para a lista de compras':'Título ou item para compartilhar';};
      select.addEventListener('change',()=>{collection=select.value;updatePlaceholder();loadRecords(records);if(stopEvents)stopEvents();stopEvents=API().subscribe(collection,()=>loadRecords(records),appId);});
      addForm.addEventListener('submit',async e=>{
        e.preventDefault();addBtn.disabled=true;
        const data={title:title.value.trim(),notes:notes.value.trim()};
        if(collection==='shopping-list'){data.item=title.value.trim();data.quantity=1;data.unit='un';data.checked=false;data.origin='family-panel';delete data.title;}
        if(collection==='family-tasks'||collection==='school-checklist')data.completed=false;
        try { await API().save(collection,data,appId);title.value='';notes.value='';say('Compartilhado com a família.');await loadRecords(records); }
        catch(err){say(err.message,true);} finally {addBtn.disabled=false;}
      });
      content.append(sectionHead,select,records,addForm);
      loadRecords(records);
      stopEvents=API().subscribe(collection,()=>loadRecords(records),appId);
    }
    const manage = make('a','spark-family-account-link','Gerenciar conta principal do SparkBR ↗'); manage.href='/'; content.append(manage);
  }
  async function loadRecords(root) {
    if (!root || !collection || !(allowed[appId]||[]).includes(collection)) return;
    root.replaceChildren(make('p','spark-family-loading','Carregando itens compartilhados…'));
    try {
      const result=await API().list(collection,appId);
      root.replaceChildren();
      if (!result.records.length) { root.append(make('p','spark-family-empty','Ainda não há itens compartilhados nesta lista. Adicione o primeiro acima.')); return; }
      result.records.forEach(record=>{
        const card=make('article','spark-family-record');
        const text=make('div','spark-family-record-text');
        const d=record.data||{};
        const title=String(d.item||d.title||d.name||d.task||d.text||'Item compartilhado');
        const quantity=Number(d.quantity||d.qtd||1);
        text.append(make('strong','',title+(collection==='shopping-list'&&quantity>1?' × '+quantity+' '+String(d.unit||'un'):'')));
        const notes=String(d.notes||d.description||''); if(notes)text.append(make('small','',notes));
        const meta=new Date(record.updatedAt||record.createdAt).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
        text.append(make('small','spark-family-record-meta',meta+' · '+(appNames[record.appId]||record.appId)));
        const del=button('×','spark-family-delete',async()=>{del.disabled=true;try{await API().remove(record.id,appId);say('Item removido.');await loadRecords(root);}catch(e){say(e.message,true);del.disabled=false;}});del.setAttribute('aria-label','Remover '+title);
        card.append(text,del);root.append(card);
      });
    } catch(e) {
      root.replaceChildren(make('p','spark-family-empty',e.message||'Não foi possível carregar os itens.'));
    }
  }
  window.addEventListener('sparkbr:share-result',e=>{const d=e.detail||{};say(d.ok?'Item compartilhado com a família.':(d.error||'Não foi possível compartilhar.'),!d.ok);});
  window.SparkBRFamily = { appId, open: openPanel, refresh };
})();
