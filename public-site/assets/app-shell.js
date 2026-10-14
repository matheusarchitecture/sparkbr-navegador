/* SparkBR shared navigation. Local catalogue only; no tracking, accounts or API calls. */
(() => {
  'use strict';
  const categories = {
    casa: 'Casa e compras', cuidado: 'Cuidado e bem-estar', dinheiro: 'Dinheiro e trabalho',
    rotina: 'Família e rotina', conexoes: 'Ideias e conexões'
  };
  const apps = [
    { id:'spark', name:'Spark Mercado', icon:'↗', category:'casa', url:'/spark/', description:'Listas de compras, comparação e organização do mercado.', related:'cardapio' },
    { id:'sparkmat', name:'Spark Obra', icon:'⌂', category:'casa', url:'/sparkmat/', description:'Materiais e etapas para acompanhar sua construção.', related:'financeiro' },
    { id:'sparkpet', name:'Spark Pet', icon:'🐾', category:'casa', url:'/sparkpet/', description:'Organize produtos e cuidados para seus animais.', related:'agenda' },
    { id:'cardapio', name:'Cardápio da Semana', icon:'🍲', category:'casa', url:'/cardapio/', description:'Planeje refeições e acompanhe os alimentos da casa.', related:'spark' },
    { id:'faxina', name:'Casa em Ordem', icon:'✧', category:'casa', url:'/faxina/', description:'Distribua tarefas e cuide de cada cômodo, no seu ritmo.', related:'familia' },
    { id:'energia', name:'Energia da Casa', icon:'☀', category:'casa', url:'/energia/', description:'Acompanhe consumo, aparelhos e suas metas de economia.', related:'contas' },
    { id:'posto', name:'Meu Combustível', icon:'⛽', category:'casa', url:'/posto/', description:'Registre abastecimentos e acompanhe o consumo do carro.', related:'contas' },
    { id:'saude', name:'Spark Saúde', icon:'♡', category:'cuidado', url:'/saude/', description:'Hábitos, treinos e registros para acompanhar seu bem-estar.', related:'agua' },
    { id:'dose', name:'Spark Dose', icon:'✚', category:'cuidado', url:'/dose/', description:'Organize medicamentos, horários e registros de tomada.', related:'farmacia' },
    { id:'agua', name:'Spark Água', icon:'💧', category:'cuidado', url:'/agua/', description:'Registre sua hidratação e acompanhe a meta do dia.', related:'sono' },
    { id:'sono', name:'Diário do Sono', icon:'☾', category:'cuidado', url:'/sono/', description:'Anote suas noites e observe sua rotina de descanso.', related:'saude' },
    { id:'farmacia', name:'Farmácia da Família', icon:'✚', category:'cuidado', url:'/farmacia/', description:'Organize medicamentos e encontre farmácias da região.', related:'dose' },
    { id:'financeiro', name:'Minha Vida Financeira', icon:'R$', category:'dinheiro', url:'/financeiro/', description:'Veja entradas e despesas para planejar o mês.', related:'cofrinho' },
    { id:'contas', name:'Contas em Dia', icon:'≋', category:'dinheiro', url:'/contas/', description:'Anote vencimentos e acompanhe os pagamentos da casa.', related:'financeiro' },
    { id:'cofrinho', name:'Meu Cofrinho', icon:'◒', category:'dinheiro', url:'/cofrinho/', description:'Defina objetivos e acompanhe cada valor guardado.', related:'financeiro' },
    { id:'bico', name:'Meu Trabalho', icon:'↗', category:'dinheiro', url:'/bico/', description:'Registre serviços, recebimentos e metas de renda.', related:'contas' },
    { id:'familia', name:'Nossa Família', icon:'☺', category:'rotina', url:'/familia/', description:'Organize os membros da família e conecte sua rotina.', related:'agenda' },
    { id:'agenda', name:'Agenda da Família', icon:'▦', category:'rotina', url:'/agenda/', description:'Compromissos da escola, do médico e de quem você ama.', related:'escola' },
    { id:'escola', name:'Vida Escolar', icon:'✎', category:'rotina', url:'/escola/', description:'Acompanhe tarefas, datas e a rotina escolar dos filhos.', related:'agenda' },
    { id:'carteirinha', name:'Carteirinha da Família', icon:'▤', category:'rotina', url:'/carteirinha/', description:'Reúna informações importantes para ter à mão.', related:'familia' },
    { id:'mural', name:'Mural da Casa', icon:'▧', category:'rotina', url:'/mural/', description:'Um lugar para recados, lembretes e combinados.', related:'agenda' },
    { id:'ideias', name:'Caderno de Ideias', icon:'✦', category:'conexoes', url:'/ideias/', description:'Guarde inspirações e dê espaço aos seus próximos projetos.', related:'bico' },
    { id:'astromatch', name:'AstroMatch', icon:'✶', category:'conexoes', url:'/astromatch/', description:'Conheça pessoas e explore afinidades. Exclusivo para maiores de 18 anos.', related:'ideias' }
  ];
  const auxiliary = {
    manual: {name:'Guia SparkBR', category:'rotina'}, baixar: {name:'SparkBrowser',category:'rotina'},
    instalar: {name:'Instalar SparkBR',category:'rotina',description:'Tenha as ferramentas do seu dia em uma janela própria no computador, Android ou iPhone.'},
    parcerias: {name:'Parcerias', category:'dinheiro'}, 'zero-ads': {name:'Privacidade',category:'rotina'},
    whindersson: {name:'Projeto de impacto',category:'conexoes'}, 'exercise-player':{name:'Demonstração de exercício',category:'cuidado'},
    'saude-planejamento':{name:'Planejamento da Família',category:'rotina'},
    'saude-auth':{name:'Acesso · Spark Saúde',category:'cuidado'}
  };
  const body = document.body;
  if (!body || !body.dataset.sparkPage || document.getElementById('spark-shell')) return;
  const page = body.dataset.sparkPage;
  const current = apps.find(app => app.id === page) || auxiliary[page] || {name:page.startsWith('saude-') ? 'Spark Saúde · ' + page.slice(6).replaceAll('-', ' ') : 'SparkBR', category:page.startsWith('saude-')?'cuidado':'rotina'};
  body.dataset.sparkCategory = current.category;
  if (page === 'exercise-player' && window.self !== window.top) body.dataset.sparkEmbedded = 'true';

  const make = (tag, cls, content) => {
    const element = document.createElement(tag);
    if (cls) element.className = cls;
    if (content !== undefined) element.textContent = content;
    return element;
  };
  const link = (cls, text, url) => {
    const element = make('a', cls, text);
    element.href = url;
    return element;
  };
  const shell = make('header', 'spark-shell');
  shell.id = 'spark-shell';
  shell.setAttribute('aria-label', 'Navegação SparkBR');
  const context = make('div','spark-shell-context');
  const brand = link('spark-shell-brand','','/');
  brand.setAttribute('aria-label', 'SparkBR · início');
  const mark = make('img');
  mark.src='/assets/spark-mark.svg'; mark.alt=''; mark.width=28; mark.height=28;
  brand.append(mark,make('span','','SparkBR'));
  context.append(brand,make('span','spark-shell-divider'),make('span','spark-shell-current',current.name),make('span','spark-shell-category',categories[current.category]));
  const actions=make('div','spark-shell-tools');
  const related=apps.find(app=>app.id===current.related);
  if(related) actions.append(link('spark-shell-related',related.name,related.url));
  const open=make('button','spark-shell-open');
  open.type='button';open.setAttribute('aria-haspopup','dialog');open.setAttribute('aria-controls','spark-apps-dialog');
  open.innerHTML='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><rect x="2" y="2" width="5.5" height="5.5" rx="1.3"/><rect x="12" y="2" width="5.5" height="5.5" rx="1.3"/><rect x="2" y="12" width="5.5" height="5.5" rx="1.3"/><rect x="12" y="12" width="5.5" height="5.5" rx="1.3"/></svg><span>Todos os apps</span>';
  actions.append(open);shell.append(context,actions);body.prepend(shell);
  const dialog=make('dialog','spark-shell-dialog');dialog.id='spark-apps-dialog';dialog.setAttribute('aria-labelledby','spark-apps-heading');
  const head=make('div','spark-shell-dialog-head'),headText=make('div');
  headText.append(make('span','spark-shell-eyebrow','23 ferramentas · uma vida mais leve'));
  const heading=make('h2','','Seu dia tem espaço aqui.');heading.id='spark-apps-heading';headText.append(heading);
  const close=make('button','spark-shell-close','×');close.type='button';close.setAttribute('aria-label','Fechar todos os apps');
  head.append(headText,close);dialog.append(head);
  const searchbox=make('div','spark-shell-searchbox');
  searchbox.innerHTML='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.8"/><path d="m13 13 4.5 4.5"/></svg>';
  const search=make('input','spark-shell-search');search.type='search';search.placeholder='Do que você precisa hoje?';search.setAttribute('aria-label','Buscar ferramentas SparkBR');search.autocomplete='off';searchbox.append(search);dialog.append(searchbox);
  const filters=make('div','spark-shell-filters');filters.setAttribute('aria-label','Filtrar por assunto');
  let active='all';const filterButtons=[];
  const normalized=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const grid=make('div','spark-shell-grid');
  const cards=apps.map(app=>{
    const card=link('spark-shell-app','',app.url);card.dataset.appId=app.id;
    if(app.id===page)card.setAttribute('aria-current','page');
    const top=make('div','spark-shell-app-top');
    top.append(make('span','spark-shell-app-icon',app.icon),make('span','spark-shell-app-arrow','↗'));
    card.append(top,make('strong','',app.name),make('small','',app.description));grid.append(card);
    return {app,card,search:normalized([app.name,app.description,categories[app.category]].join(' '))};
  });
  const empty=make('p','spark-shell-empty','Nenhuma ferramenta encontrada. Tente outro termo.');empty.hidden=true;empty.setAttribute('role','status');
  function filter(){
    const term=normalized(search.value.trim());let visible=0;
    cards.forEach(({app,card,search:haystack})=>{card.hidden=!((active==='all'||active===app.category)&&haystack.includes(term));if(!card.hidden)visible++;});
    empty.hidden=visible!==0;
  }
  [['all','Todos'],...Object.entries(categories)].forEach(([id,name])=>{
    const button=make('button','spark-shell-filter',name);button.type='button';button.setAttribute('aria-pressed',String(id==='all'));
    button.addEventListener('click',()=>{active=id;filterButtons.forEach(({id:key,button:item})=>item.setAttribute('aria-pressed',String(key===id)));filter();});
    filterButtons.push({id,button});filters.append(button);
  });
  dialog.append(filters,grid,empty);
  const foot=make('div','spark-shell-dialog-foot');
  foot.append(make('span','','Feito para a vida brasileira. No seu ritmo.'),link('','Conheça o SparkBrowser ↗','/baixar/'));
  dialog.append(foot);body.append(dialog);
  let returnFocus=open;
  open.addEventListener('click',()=>{returnFocus=document.activeElement;dialog.showModal();search.focus();});
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{if(returnFocus&&typeof returnFocus.focus==='function')returnFocus.focus();});
  search.addEventListener('input',filter);

  // Keep the original fields, IDs and listeners; only group existing content for layout.
  if(body.dataset.sparkLayout==='simple'){
    const wrap=body.querySelector('.wrap');
    if(wrap){
      Array.from(wrap.children).forEach(element=>{
        if(element.tagName==='DIV'&&/^⚡ SPARK APPS(?: \+ IA)?$/.test(element.textContent.trim()))element.classList.add('spark-legacy-kicker');
      });
      const title=Array.from(wrap.children).find(element=>element.tagName==='H1');
      const subtitle=Array.from(wrap.children).find(element=>element.classList.contains('sub'));
      if(title){
        const intro=make('div','spark-page-intro');
        intro.append(make('div','spark-page-eyebrow',categories[current.category]+' · SparkBR'));
        title.textContent=current.name;intro.append(title);
        if(subtitle){subtitle.textContent=current.description;intro.append(subtitle);}
        const anchor=Array.from(wrap.children).find(element=>!element.classList.contains('back')&&!element.classList.contains('spark-legacy-kicker'));
        if(anchor)wrap.insertBefore(intro,anchor);else wrap.prepend(intro);
      }
      const movable=Array.from(wrap.children).filter(element=>
        !['SCRIPT','STYLE','DATALIST'].includes(element.tagName)&&
        !['spark-page-intro','spark-legacy-kicker','back','topbar','foot'].some(cls=>element.classList.contains(cls))&&element.tagName!=='FOOTER'
      );
      if(movable.length){
        const workspace=make('div','spark-workspace');
        wrap.insertBefore(workspace,movable[0]);let section;
        movable.forEach(element=>{
          if(!section||element.classList.contains('secao')||(page==='agua'&&element.classList.contains('card'))){section=make('section','spark-workspace-section');workspace.append(section);}
          section.append(element);
        });
      }
    }
  }
  if(page==='astromatch'){
    const hero=body.querySelector('#auth .hero');
    if(hero)hero.append(make('span','spark-adult-note','Relacionamentos · exclusivo para maiores de 18 anos'));
  }
  // Previous floating home links duplicate the persistent SparkBR navigation.
  Array.from(body.querySelectorAll('button[onclick]')).forEach(button=>{
    const title=button.getAttribute('title')||'';
    if(title.startsWith('Voltar p/')&&button.getAttribute('onclick').includes('sparkbr.online/'))button.classList.add('spark-old-hub');
  });
})();
