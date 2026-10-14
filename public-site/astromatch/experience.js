// AstroMatch 3: real account experience, no seeded profiles or simulated conversations.
const original = {api, enter, tab, renderDeck, renderProfile, refreshMatches, openChat, openModal, closeModal, logout, openSyn};
S.filters = {element:'', min_score:0,intention:'',city:'',online_only:false,verified_only:false,max_distance_km:''};
const orbit = () => h('div',{class:'orbit-art','aria-hidden':'true'},h('i',{class:'orbit'}),h('i',{class:'orbit'}),h('i',{class:'orbit'}),h('b',{},'✧'));
const emptyState = (symbol,title,description,action,label) => h('div',{class:'section-empty'},h('div',{class:'big','aria-hidden':'true'},symbol),h('h3',{},title),h('p',{},description),action?h('button',{class:'btn ghost',onclick:action},label):null);
const hero = document.querySelector('#auth .hero');
hero.replaceChildren(h('div',{class:'logo'},'✧ AstroMatch'),orbit(),h('h1',{},'Algumas conexões ',h('em',{},'estão nas estrelas.')),h('p',{},'Outras começam com um simples oi. Descubra pessoas, encontre afinidades e escreva uma história só de vocês.'),h('div',{class:'hero-note'},'CONEXÕES REAIS. UM UNIVERSO DE POSSIBILIDADES.'));
$('loginBox').prepend(h('h2',{},'Seu próximo encontro começa aqui.'),h('p',{class:'sub'},'Entre e descubra quem combina com o seu universo.'));
$('loginBox').append(h('p',{class:'auth-note'},h('span',{},'✧ '),'Exclusivo para maiores de 18 anos.',h('br'),'Astrologia inspira conversas. A conexão acontece entre vocês.'));
for(const id of ['lEmail','lPass','rName','rEmail','rPass','rDate','rTime','rCity','rGender','rInt','rBio','cText']){const el=$(id);if(el){const label=el.previousElementSibling;if(label?.tagName==='LABEL')label.htmlFor=id;else el.setAttribute('aria-label',el.placeholder||id);}}
$('lPass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});
$('toast').setAttribute('role','status');$('toast').setAttribute('aria-live','polite');
$('modal').setAttribute('role','dialog');$('modal').setAttribute('aria-modal','true');$('modal').setAttribute('aria-label','Detalhes');
let modalReturn=null;
openModal = content => { if($('modal').classList.contains('hidden'))modalReturn=document.activeElement; original.openModal(content); requestAnimationFrame(()=> $('sheet').querySelector('button,input,select,textarea')?.focus()); };
closeModal=()=>{original.closeModal();modalReturn?.focus?.()};
document.addEventListener('keydown',e=>{
 if(!$('modal').classList.contains('hidden')){
  if(e.key==='Escape'){closeModal();return;}
  if(e.key==='Tab'){const items=[...$('sheet').querySelectorAll('button:not(:disabled),input,select,textarea,a[href]')].filter(x=>x.getClientRects().length);if(!items.length)return;const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
  return;
 }
 if(e.target.closest('input,textarea,select')||!S.me||!$('chat').classList.contains('hidden')||!$('match').classList.contains('hidden')||!$('viewProf').classList.contains('hidden'))return;
 if(!$('tDiscover').classList.contains('hidden')){if(e.key==='ArrowRight'){e.preventDefault();btnSwipe('like')}if(e.key==='ArrowLeft'){e.preventDefault();btnSwipe('dislike')}}
});
const nav=document.querySelector('nav');nav.prepend(h('div',{class:'nav-brand'},h('span',{},'✧ '),'AstroMatch'),h('div',{class:'nav-caption'},'SEU UNIVERSO'));
$('nMatches').innerHTML='<span class="ic">☏</span>Conversas<span class="badge hidden" id="nbadge">0</span>';
$('nProfile').innerHTML='<span class="ic">♙</span>Meu perfil';
$('nDiscover').querySelector('.ic').textContent='✧';
nav.insertBefore(h('button',{id:'nLikes',onclick:()=>tab('Likes')},h('span',{class:'ic'},'♡'),'Curtidas'),$('nMatches'));
nav.insertBefore(h('button',{id:'nSky',onclick:()=>tab('Sky')},h('span',{class:'ic'},'☾'),'Meu céu'),$('nProfile'));
nav.insertBefore(h('button',{id:'nGroups',onclick:()=>tab('Groups')},h('span',{class:'ic'},'✦'),'Constelações'),$('nProfile'));
nav.append(h('div',{class:'nav-bottom'},h('button',{onclick:showSafety},h('span',{class:'ic'},'◇'),'Seu espaço seguro'),h('div',{class:'nav-profile',id:'navProfile'}),h('div',{class:'nav-foot'},'ASTROMATCH · CONEXÕES COM SENTIDO')));
for(const n of ['Likes','Sky','Groups'])$('main').insertBefore(h('div',{id:'t'+n,class:'tab hidden'},h('div',{class:'scroll',id:n.toLowerCase()+'Box'})),nav);
document.querySelector('.top').append(h('span',{class:'page-title',id:'pageTitle'},'Descobrir'),h('div',{class:'top-tools'},h('span',{class:'session-badge'},'Seu universo, seu ritmo'),h('button',{'aria-label':'Segurança e privacidade',onclick:showSafety},'◇'),h('button',{'aria-label':'Meu perfil',onclick:()=>tab('Profile')},'♙')));
const heading=h('div',{class:'discover-heading'},h('div',{},h('div',{class:'eyebrow'},'DEIXE A CONEXÃO ACONTECER'),h('h1',{},'Encontros em órbita'),h('p',{},'Pessoas reais. Afinidades que surpreendem.')),h('button',{class:'filter-btn',onclick:showFilters},'☷  Filtros'));
const filters=h('div',{class:'filter-row'},...['Todos','Fogo','Terra','Ar','Água'].map((x,i)=>h('button',{class:'filter-pill'+(!i?' active':''),onclick:async e=>{S.filters.element=i?x:'';document.querySelectorAll('.filter-pill').forEach(b=>b.classList.remove('active'));e.currentTarget.classList.add('active');S.feed=[];await loadFeed()}},['✧ Para você','♈ Fogo','♉ Terra','♊ Ar','♋ Água'][i])));
$('tDiscover').prepend(heading,filters);$('tDiscover').append(h('div',{class:'keyboard-tip'},'← passar  ·  → curtir  ·  arraste para descobrir'));
['Voltar ao último perfil','Passar perfil','Enviar super curtida','Curtir perfil'].forEach((label,i)=>document.querySelectorAll('.act')[i].setAttribute('aria-label',label));
$('main').append(h('aside',{class:'right-rail',id:'rail','aria-label':'Seu universo'}));
api=async(path,opt={})=>{if(path.startsWith('/feed?'))path+='&element='+encodeURIComponent(S.filters.element)+'&min_score='+S.filters.min_score+'&intention='+encodeURIComponent(S.filters.intention)+'&city='+encodeURIComponent(S.filters.city)+(S.filters.online_only?'&online_only=true':'')+(S.filters.verified_only?'&verified_only=true':'')+(S.filters.max_distance_km?'&max_distance_km='+encodeURIComponent(S.filters.max_distance_km):'');return original.api(path,opt)};
enter=async()=>{await original.enter();try{watchCallsGlobal();}catch(e){}try{S.prefs=await api('/me/preferences')}catch(e){toast('Preferências indisponíveis',e.message)}await loadMyPhotos();renderRail();tab('Discover');if(location.hash==='#matches')tab('Matches')};
logout=silent=>{try{clearInterval(callWatchG);clearInterval(callWatch)}catch(e){}original.logout(silent);S.prefs=null;S.filters={element:'',min_score:0,intention:'',city:'',online_only:false,verified_only:false,max_distance_km:''};document.querySelectorAll('.filter-pill').forEach((x,i)=>x.classList.toggle('active',i===0));};
tab=n=>{
 ['Discover','Likes','Matches','Sky','Profile','Groups'].forEach(t=>{$('t'+t).classList.toggle('hidden',t!==n);$('n'+t).classList.toggle('on',t===n);$('n'+t).setAttribute('aria-current',t===n?'page':'false')});
 $('pageTitle').textContent={Discover:'Descobrir',Likes:'Quem curtiu você',Matches:'Suas conversas',Sky:'Meu céu',Profile:'Meu perfil',Groups:'Constelações'}[n];
 if(n==='Matches')refreshMatches();if(n==='Profile')loadMyPhotos().then(renderProfile);if(n==='Sky')renderSky();if(n==='Likes')renderLikes();if(n==='Groups')renderGroups();
};
// UX 08/10/2026: aviso invisivel (0 fotos publicas) - nao muda regra de foto obrigatoria
async function invisBar(){
  try{
    const me = S.me || await api('/me');
    const ph = await api('/me/photos');
    if(!ph.filter(x=>x.is_public).length){
      if(!document.querySelector('#invisBar')){
        const b = h('div',{id:'invisBar',style:'position:sticky;top:0;z-index:30;background:#3b1030;color:#ffe9fb;padding:10px 14px;border-radius:12px;margin-bottom:10px;display:flex;gap:10px;align-items:center;justify-content:space-between'}, h('span',{},'Voce esta invisivel: adicione 1 foto publica gratis para aparecer'), h('button',{class:'btn sm',onclick:()=>tab('Profile')},'Ir ao perfil'));
        $('tDiscover').prepend(b);
      }
    } else document.querySelector('#invisBar')?.remove();
  }catch(e){}
}
renderDeck=()=>{ invisBar();
 original.renderDeck();
 document.querySelectorAll(".act").forEach((b,i)=>{if(i)b.disabled=!S.feed.length||!!S.swiping});
 if(!S.feed.length){$('deck').replaceChildren(h('div',{class:'empty'},h('div',{class:'empty-orbit'},h('div',{class:'big'},'✧')),h('b',{},S.loading?'Buscando novas conexões…':'Seu próximo encontro ainda está por vir.'),h('span',{},'Não há novos perfis para estes filtros agora. Complete seu perfil e deixe espaço para boas surpresas.'),h('button',{class:'btn sm ghost',onclick:showFilters},'Ajustar minhas preferências')))}
 else {const p=S.feed[0],prefs=p.preferences;if(prefs){const info=$('deck').lastElementChild.querySelector('.info');if(prefs.intention)info.prepend(h('div',{class:'eyebrow',style:'color:#e2c6f2;letter-spacing:1px'},prefs.intention));if(prefs.current_city)info.append(h('div',{style:'font-size:11px;color:#d4c5df;margin-top:7px'},'⌖ '+prefs.current_city));if(prefs.interests&&prefs.interests.length)info.append(h('div',{style:'font-size:11px;color:#d4c5df;margin-top:4px'},'♥ '+prefs.interests.slice(0,5).join(' · ')));}const badges=[];if(p.online)badges.push('● online agora');if(p.verified)badges.push('✔ verificada');if(p.boosted)badges.push('▲ em destaque');if(p.distance_km!=null)badges.push('⌖ '+p.distance_km+' km');if(badges.length)$('deck').lastElementChild.querySelector('.info').append(h('div',{class:'trust-badges'},badges.join('  ·  ')));}
};
function renderRail(){
 if(!S.me)return;const m=S.me,completion=[!!m.bio,S.myPhotos.length>0,!!S.prefs?.current_city,(S.prefs?.interests?.length||0)>0].filter(Boolean).length*25;
 $('navProfile').replaceChildren(h('div',{class:'nav-avatar'},m.name[0]),h('div',{},h('b',{},m.name),h('small',{},m.sun_sign+' · '+m.element)));
 $('rail').replaceChildren(h('div',{class:'rail-card cosmos-card'},h('div',{class:'eyebrow'},'SEU CÉU, SUA ESSÊNCIA'),h('h3',{},'Você é um universo',h('br'),'de possibilidades.'),orbit(),h('div',{class:'chart-mini'},...[['☉','SOL',m.sun_sign],['☾','LUA',m.moon_sign],['↑','ASCENDENTE',m.rising_sign]].map(x=>h('span',{},x[0],h('small',{},x[1]),h('b',{},x[2])))),h('button',{class:'rail-link',onclick:()=>tab('Sky')},'Explorar meu céu  ↗')),
 h('div',{class:'rail-card'},h('span',{class:'tiny-tag'},completion+'%'),h('h3',{},'Mostre o seu universo'),h('p',{},completion===100?'Seu perfil tem foto, bio, cidade e interesses. Agora é hora de conhecer novas histórias.':'Uma boa foto, uma bio sua e interesses em comum ajudam a conversa a começar.'),h('div',{class:'profile-meter'},h('i',{style:'width:'+completion+'%'})),h('button',{class:'rail-link',onclick:()=>tab('Profile')},'Cuidar do meu perfil  ↗')),
 h('div',{class:'rail-card'},h('div',{class:'safety-icon'},'◇'),h('h3',{},'Conexão boa respeita você.'),h('p',{},'Vá no seu tempo. Você pode bloquear, denunciar ou encerrar uma conexão a qualquer momento.'),h('button',{class:'rail-link',onclick:showSafety},'Conhecer meus controles  ↗')),
 h('div',{class:'rail-foot'},'Afinidade astral é uma interpretação para entretenimento, não uma previsão do relacionamento.'));
}
function showFilters(){
 const intention=h('select',{'aria-label':'Intenção de relacionamento'},...['','Relacionamento sério','Conhecer pessoas','Amizade','Ainda descobrindo'].map(x=>h('option',{value:x,selected:x===S.filters.intention},x||'Todas as intenções'))),city=h('input',{'aria-label':'Filtrar cidade atual',value:S.filters.city,maxlength:120,placeholder:'Deixe vazio para todas as cidades','data-cityac':true});
 const min=h('input',{type:'number',min:18,max:99,value:S.me.min_age,'aria-label':'Idade mínima'}),max=h('input',{type:'number',min:18,max:99,value:S.me.max_age,'aria-label':'Idade máxima'}),score=h('input',{type:'range',min:0,max:99,value:S.filters.min_score,'aria-label':'Afinidade astral mínima'}),caption=h('p',{class:'form-help'},'Afinidade mínima: '+S.filters.min_score+'%');score.oninput=()=>caption.textContent='Afinidade mínima: '+score.value+'%';
 const onl=h('input',{type:'checkbox',checked:S.filters.online_only,'aria-label':'Somente online agora'}),ver=h('input',{type:'checkbox',checked:S.filters.verified_only,'aria-label':'Somente verificadas'}),dist=h('input',{type:'number',min:1,max:20000,value:S.filters.max_distance_km,'aria-label':'Distância máxima em km',placeholder:'Ex.: 100'});
 openModal(h('div',{},h('div',{class:'eyebrow'},'DO SEU JEITO'),h('h2',{},'Espaço para a sua conexão'),h('p',{class:'sub'},'Escolha quem você quer descobrir. Idades e interesse são respeitados nos dois sentidos.'),h('label',{},'Faixa de idade'),h('div',{class:'row'},min,max),h('label',{},'Intenção de relacionamento'),intention,h('label',{},'Cidade atual · nome completo'),city,h('label',{},'Afinidade astral'),score,caption,h('label',{},'Somente online agora'),onl,h('label',{},'Somente perfis verificados'),ver,h('label',{},'Distância máxima (km, precisa ativar localização no perfil)'),dist,h('p',{class:'form-help'},'Um número não define uma relação. Explore também as diferenças.'),h('button',{class:'btn',style:'margin-top:22px',onclick:async()=>{try{S.me=await api('/me',{method:'PUT',body:{min_age:+min.value,max_age:+max.value}});S.filters.min_score=+score.value;S.filters.intention=intention.value;S.filters.city=city.value.trim();S.filters.online_only=onl.checked;S.filters.verified_only=ver.checked;S.filters.max_distance_km=dist.value.trim();S.feed=[];closeModal();await loadFeed()}catch(e){toast('Confira os filtros',e.message)}}},'Aplicar preferências'),h('button',{class:'btn ghost',style:'margin-top:8px',onclick:closeModal},'Cancelar')));
}
async function renderLikes(){const box=$('likesBox');box.replaceChildren(h('h1',{class:'section-heading'},'Alguém gostou do seu universo.'),h('p',{class:'sub',style:'margin-top:12px'},'Quando a vontade de conhecer é recíproca, a conversa começa.'));try{const people=await api('/likes');if(!people.length)box.append(emptyState('♡','Boas conexões levam tempo.','Suas novas curtidas aparecerão aqui. Que tal descobrir alguém?',()=>tab('Discover'),'Descobrir pessoas'));for(const p of people){box.append(h('div',{class:'utility-card'},h('div',{class:'li',style:'border:0;margin:0'},p.photos[0]?h('img',{class:'av',src:url(p.photos[0].url),alt:p.name}):h('span',{class:'nav-avatar'},p.name[0]),h('div',{class:'t'},h('b',{},p.name+', '+p.age),h('small',{},p.sun_sign+' · '+p.score+'% de afinidade astral'))),h('p',{},p.bio),h('button',{class:'btn',style:'margin-top:14px',onclick:async e=>{e.currentTarget.disabled=true;try{const r=await api('/swipes',{method:'POST',body:{target_id:p.id,action:'like'}});S.feed=S.feed.filter(x=>x.id!==p.id);S.seen.add(p.id);renderDeck();if(r.is_match)showMatch(r.match_user,r.match_id);await renderLikes()}catch(er){toast('Não foi possível curtir',er.message);e.currentTarget.disabled=false}}},'♡ Curtir de volta')))}}catch(e){box.append(emptyState('!','Não foi possível carregar.',e.message,renderLikes,'Tentar novamente'))}}
refreshMatches=async()=>{await original.refreshMatches();const box=$('matchList');if(!S.matches.length){box.replaceChildren(h('h1',{class:'section-heading'},'Toda história começa com um oi.'),emptyState('☏','Sua próxima conversa está a caminho.','Curta alguém em Descobrir. Quando vocês se curtirem, poderão conversar por aqui.',()=>tab('Discover'),'Descobrir pessoas'))}else box.prepend(h('div',{class:'heading-line'},h('h1',{class:'section-heading'},'Conexões que continuam'),h('span',{class:'sub'},S.matches.length+' matches')))};
const meanings={Fogo:'Entusiasmo, espontaneidade e vontade de experimentar.',Terra:'Presença, constância e atenção aos pequenos gestos.',Ar:'Curiosidade, boas conversas e espaço para novas ideias.',Água:'Sensibilidade, afeto e escuta cuidadosa.'};
function renderSky(){const m=S.me;const wheel=h('div',{class:'chart-wheel','aria-hidden':'true'},h('div',{class:'wheel-center'},'✧'),...['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'].map((s,i)=>h('span',{style:'--angle:'+i*30+'deg'},s)));$('skyBox').replaceChildren(h('div',{class:'eyebrow'},'UM POUCO SOBRE VOCÊ'),h('h1',{class:'section-heading'},'Seu céu de nascimento'),wheel,h('p',{class:'sub',style:'text-align:center'},'Roda simbólica do zodíaco'),...[[m.sun_sign,'☉ Sol · sua expressão','Um convite a observar como você se expressa e o que te anima.'],[m.moon_sign,'☾ Lua · seu sentir','Uma lente simbólica para pensar sobre afeto, conforto e cuidado.'],[m.rising_sign,'↑ Ascendente · seu jeito de chegar','Uma interpretação sobre como você se apresenta ao mundo.']].map(x=>h('div',{class:'utility-card'},h('div',{class:'eyebrow'},x[1]),h('h3',{},x[0]),h('p',{},x[2]))),h('div',{class:'utility-card'},h('h3',{},'Seu elemento: '+m.element),h('p',{},meanings[m.element]||'')),h('p',{class:'form-help'},'Cálculo astronômico aproximado a partir de data, hora e cidade de nascimento. A roda é ilustrativa e não representa posições calculadas. Fusos históricos e horário de verão não são corrigidos. Horário desconhecido torna o ascendente pouco confiável. Astrologia é entretenimento.'),h('button',{class:'btn ghost',style:'margin-top:15px',onclick:()=>tab('Profile')},'Revisar meus dados de nascimento'));try{document.getElementById('skyBox').append(climaCard());}catch(e){}}
renderProfile=async()=>{await original.renderProfile();const box=$('profileBox');box.prepend(h('div',{class:'eyebrow'},'AUTÊNTICO, DO SEU JEITO'));box.append(h('div',{class:'utility-card'},h('h3',{},'O que faz você ser você'),h('p',{},'Defina sua intenção, cidade atual e interesses. São detalhes que ajudam uma conexão a começar.'),h('button',{class:'btn ghost',style:'margin-top:12px',onclick:editPreferences},'Editar meu universo')),h('div',{class:'utility-card'},h('h3',{},'Destaque e confiança'),h('p',{id:'trustStatus'},'Carregando…'),h('div',{class:'row',style:'margin-top:12px'},h('button',{class:'btn ghost',onclick:requestVerification},'Pedir verificação'),h('button',{class:'btn ghost',onclick:activateBoost},'Impulsionar 2h')),h('button',{class:'btn ghost',style:'margin-top:8px',onclick:enableLocation},'Ativar minha localização'),h('button',{class:'btn ghost',style:'margin-top:8px',onclick:changePassword},'Trocar senha'),h('div',{class:'row',style:'margin-top:8px'},h('div',{class:'sub',style:'padding:8px 0'},'Tudo liberado — 100% grátis para todos'))),h('div',{class:'utility-card'},h('h3',{},'Privacidade e controle'),h('button',{class:'btn ghost',onclick:showSafety},'Gerenciar meus dados e bloqueios')));if(S.me.is_admin)box.append(h('button',{class:'btn',onclick:showAdmin},'Central de pagamentos e denúncias'));refreshTrust();renderRail();};
async function changePassword(){const cur=prompt('Senha atual:');if(!cur)return;const np=prompt('Nova senha (mín. 8 caracteres):');if(!np)return;try{await api('/me/password',{method:'POST',body:{current_password:cur,new_password:np}});toast('Senha trocada!')}catch(e){toast('Não trocou',e.message)}}
async function refreshTrust(){try{const m=await api('/me');S.me=m;const el=$('trustStatus');if(!el)return;el.textContent=(m.verified?'✔ Perfil verificado. ':'Verificação: '+m.verification_status+'. ')+(m.boosted?'▲ Impulso ativo até '+m.boost_until+'.':'Sem impulso ativo.')+(m.location?' Localização ativa.':' Localização desativada.')}catch(e){}}
async function requestVerification(){try{const r=await api('/me/verification',{method:'POST',body:{}});toast('Verificação: '+r.status);refreshTrust()}catch(e){toast('Não foi possível pedir',e.message)}}
async function activateBoost(){try{const r=await api('/me/boost',{method:'POST'});toast('Impulso ativo até '+r.until);refreshTrust()}catch(e){toast('Não foi possível impulsionar',e.message)}}
async function locPlatform(){const ua=navigator.userAgent||'';return{isIOS:/iPhone|iPad|iPod/i.test(ua),isAndroid:/Android/i.test(ua),isInApp:/(Instagram|FBAN|FBAV|WhatsApp|Line|Twitter)/i.test(ua)};}
function showLocationHelp(reason){const p={isIOS:false,isAndroid:false};try{const ua=navigator.userAgent||'';p.isIOS=/iPhone|iPad|iPod/i.test(ua);p.isAndroid=/Android/i.test(ua);}catch(e){}
 const iosSteps='1) Abra Ajustes do iPhone > Privacidade e Segurança > Serviços de Localização (ative). 2) Role até Safari (ou AstroMatch, se instalado na tela inicial) > marque "Ao usar o app". 3) No Safari, toque no botão aA na barra > Ajustes do Site > Localização > Permitir. 4) Volte aqui e toque em Tentar novamente.';
 const andSteps='1) Ative o GPS: arraste a barra de notificações > Localização ativada. 2) No Chrome, toque no cadeado ao lado do endereço > Permissões > Localização > Permitir. 3) Em Ajustes do Android > Apps > Chrome > Permissões > Localização > Permitir. 4) Volte aqui e toque em Tentar novamente.';
 const steps=p.isIOS?iosSteps:p.isAndroid?andSteps:'1) Use HTTPS e um navegador com GPS (Safari no iPhone, Chrome no Android). 2) Quando o navegador pedir "Permitir localização", toque em Permitir/Allow. 3) Se negou antes, libere nas permissões do site (cadeado/aA na barra > Localização > Permitir) e tente de novo.';
 openModal(h('div',{},h('div',{class:'eyebrow'},'LOCALIZAÇÃO'),h('h2',{},reason==='denied'?'Permissão bloqueada':'Não consegui captar o GPS'),h('p',{class:'sub',style:'white-space:pre-line;margin:8px 0'},(reason==='denied'?'O navegador está bloqueando o GPS. Libere uma vez e funciona sempre.':'Dica: ligue o GPS, saia de local muito fechado e tente com Wi-Fi/4G ligado.')+'\n\n'+steps),h('p',{class:'form-help'},'Sem GPS você ainda usa o app normal com filtro por cidade. O filtro por distância (km) só aparece depois de ativar.'),h('button',{class:'btn',style:'margin-top:14px',onclick:()=>{closeModal();enableLocation(true)}},'Tentar novamente'),h('button',{class:'btn ghost',style:'margin-top:8px',onclick:closeModal},'Continuar sem GPS')));}
function getPosOnce(opts){return new Promise((res,rej)=>{try{navigator.geolocation.getCurrentPosition(res,rej,opts);}catch(e){rej({code:2,message:String(e)})}});}
async function enableLocation(force){try{if(S.me&&S.me.location&&!force){openModal(h('div',{},h('h2',{},'Localização ativa ✦'),h('p',{class:'sub'},'Seu filtro por distância já está funcionando. Quer atualizar sua posição atual ou desativar?'),h('button',{class:'btn',style:'margin-top:12px',onclick:async e=>{e.currentTarget.disabled=true;closeModal();await enableLocation(true)}},'Atualizar minha posição'),h('button',{class:'btn ghost',style:'margin-top:8px',onclick:async e=>{e.currentTarget.disabled=true;try{await api('/me/location',{method:'DELETE'});closeModal();toast('Localização desativada');refreshTrust();}catch(err){toast('Não desativou',err.message);e.currentTarget.disabled=false}}},'Desativar GPS (usar só cidade)'),h('button',{class:'btn ghost',style:'margin-top:8px',onclick:closeModal},'Cancelar')));return;}
 if(window.isSecureContext===false){showLocationHelp('insecure');toast('Abra com HTTPS','No iPhone/Android o GPS só funciona em conexão segura (https). Abra no Safari/Chrome, não dentro do Instagram/WhatsApp.');return;}
 if(!('geolocation' in navigator)){toast('Sem geolocalização','Use Safari (iPhone) ou Chrome (Android) atualizados, com GPS ligado.');return;}
 const plat=await locPlatform();if(plat.isInApp){toast('Abra no navegador','Você está dentro de Instagram/WhatsApp: o GPS é bloqueado. Toque nos "..." e "Abrir no Safari/Chrome".');}
 if(navigator.permissions&&navigator.permissions.query){try{const st=await navigator.permissions.query({name:'geolocation'});if(st.state==='denied'&&!force){showLocationHelp('denied');return;}}catch(e){}}
 openModal(h('div',{class:'ctr'},h('div',{class:'spin'}),h('h2',{style:'margin-top:12px'},'Buscando sua posição…'),h('p',{class:'sub'},'Toque em "Permitir" quando o celular perguntar. Isso pode levar até 20 segundos.'),h('button',{class:'btn ghost',style:'margin-top:12px',onclick:()=>{window._locCancel=true;closeModal();}},'Cancelar')));
 window._locCancel=false;let pos=null,lastErr=null;
 try{pos=await getPosOnce({enableHighAccuracy:true,timeout:25000,maximumAge:60000});}
 catch(e1){lastErr=e1;if(window._locCancel)return;if(e1&&e1.code===1){closeModal();showLocationHelp('denied');return;}
  try{toast('Tentando com precisão normal…','GPS demorou; segunda tentativa.');pos=await getPosOnce({enableHighAccuracy:false,timeout:30000,maximumAge:600000});}
  catch(e2){lastErr=e2;}}
 if(window._locCancel)return;closeModal();
 if(!pos){const code=lastErr&&lastErr.code;if(code===1)showLocationHelp('denied');else if(code===3)toast('Tempo esgotado','Ligue GPS/Wi-Fi, vá para local aberto e toque em Tentar novamente.',);else toast('GPS indisponível','Ative Serviços de Localização/GPS e tente de novo.');if(!pos){showLocationHelp(code===1?'denied':'unavailable');}return;}
 const lat=pos.coords&&pos.coords.latitude,lon=pos.coords&&pos.coords.longitude,acc=pos.coords&&pos.coords.accuracy;
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180){toast('Posição inválida','Tente novamente em local aberto.');return;}
 try{await api('/me/location',{method:'PUT',body:{lat,lon}});toast('Localização ativada ✦'+(Number.isFinite(acc)?' (±'+Math.round(acc)+' m)':''),'Agora o filtro por distância funciona.');refreshTrust();}
 catch(e){toast('Não salvou',e.message);}}catch(e){try{closeModal();}catch(_){}toast('Ops',e&&e.message||'Tente de novo');}}
async function disableLocation(){try{await api('/me/location',{method:'DELETE'});toast('Localização desativada');refreshTrust();}catch(e){toast('Ops',e.message);}}
const interestOptions=['Música','Rock','Sertanejo','Pop','Funk','Eletrônica','MPB','Rap','Pagode','Gospel','Jazz','Cinema','Café','Viagens','Livros','Natureza','Arte','Gastronomia','Esportes','Academia','Corrida','Futebol','Dança','Fotografia','Astrologia','Pets','Tecnologia','Praia','Jogos','Games','Cozinhar','Churrasco'];
async function editPreferences(){try{S.prefs=await api('/me/preferences')}catch(e){toast('Não foi possível carregar',e.message);return}const p=S.prefs,chosen=new Set(p.interests);const city=h('input',{value:p.current_city,maxlength:120,'aria-label':'Cidade atual',placeholder:'Ex.: Ribeirão Preto','data-cityac':true}),intention=h('select',{'aria-label':'Intenção'},...['Relacionamento sério','Conhecer pessoas','Amizade','Ainda descobrindo'].map(x=>h('option',{selected:x===p.intention},x))),tags=h('div',{},...interestOptions.map(x=>h('button',{class:'chip-choice'+(chosen.has(x)?' active':''),onclick:e=>{if(chosen.has(x))chosen.delete(x);else if(chosen.size<8)chosen.add(x);else return toast('Escolha até 8 interesses');e.currentTarget.classList.toggle('active',chosen.has(x))}},x)));openModal(h('div',{},h('h2',{},'Seu universo em detalhes'),h('label',{},'O que você busca agora?'),intention,h('label',{},'Cidade em que você mora'),city,h('label',{},'Seus interesses · até 8'),tags,h('button',{class:'btn',style:'margin-top:18px',onclick:async()=>{try{S.prefs=await api('/me/preferences',{method:'PUT',body:{...p,current_city:city.value,intention:intention.value,interests:[...chosen]}});closeModal();renderRail();toast('Seu universo foi atualizado')}catch(e){toast('Não foi possível salvar',e.message)}}},'Salvar meu universo'),h('button',{class:'btn ghost',style:'margin-top:8px',onclick:closeModal},'Cancelar')))}
openChat=async(mid,user)=>{await original.openChat(mid,user);document.querySelector('.starter-bar')?.remove();const prompts=['Qual lugar você adoraria conhecer?','O que deixou seu dia melhor?','Qual música combina com você?'];$('chat').insertBefore(h('div',{class:'starter-bar','aria-label':'Ideias para começar uma conversa'},...prompts.map(x=>h('button',{onclick:()=>{$('cText').value=x;$('cText').focus()}},x))),document.querySelector('.cin'));};
openSyn=async uid=>{await original.openSyn(uid);if(!$('modal').classList.contains('hidden'))$('sheet').append(h('p',{class:'form-help'},'Índice simbólico baseado em aspectos astrológicos aproximados. Não é uma probabilidade de sucesso amoroso. Afinidade também se constrói com diálogo, respeito e valores compartilhados.'),h('div',{class:'row',style:'margin-top:16px'},h('button',{class:'btn ghost',onclick:async()=>{const reason=prompt('O que aconteceu? Descreva o motivo da denúncia.');if(reason===null)return;try{await api('/users/'+uid+'/report',{method:'POST',body:{reason}});toast('Denúncia enviada para análise');closeModal()}catch(e){toast('Não foi possível denunciar',e.message)}}},'Denunciar perfil'),h('button',{class:'btn ghost',onclick:async()=>{if(!confirm('Bloquear este perfil? Vocês deixarão de se ver e conversar.'))return;try{await api('/users/'+uid+'/block',{method:'POST'});S.feed=S.feed.filter(p=>p.id!==uid);renderDeck();closeModal();if(S.chat?.user.id===uid)closeChat();toast('Perfil bloqueado')}catch(e){toast('Não foi possível bloquear',e.message)}}},'Bloquear perfil')));};
async function showSafety(){if(!S.me)return;const container=h('div',{},h('div',{class:'eyebrow'},'NO SEU RITMO'),h('h2',{},'Seu espaço seguro'),h('div',{class:'utility-card'},h('h3',{},'Antes de um encontro'),h('p',{},'Escolha um lugar público, avise alguém de confiança e organize seu próprio transporte. Nunca envie dinheiro ou dados sensíveis a alguém que acabou de conhecer.')),h('button',{class:'btn ghost',onclick:async()=>{try{const p=await api('/me/preferences');await api('/me/preferences',{method:'PUT',body:{...p,paused:!p.paused}});toast(!p.paused?'Perfil pausado':'Perfil visível',!p.paused?'Você não aparecerá na descoberta. Suas conversas continuam disponíveis.':'Você voltou a aparecer na descoberta.');showSafety()}catch(e){toast('Não foi possível alterar',e.message)}}},'Pausar ou retomar minha descoberta'),h('p',{class:'form-help',id:'pauseStatus'},'Carregando visibilidade…'),h('h3',{},'Pessoas bloqueadas'),h('div',{id:'blockList'},'Carregando…'),h('button',{class:'btn ghost',style:'margin-top:18px',onclick:async()=>{try{const data=await api('/me/export');const link=document.createElement('a'),blob=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));link.href=blob;link.download='meus-dados-astromatch.json';link.click();setTimeout(()=>URL.revokeObjectURL(blob),1000);toast('Seus dados foram exportados')}catch(e){toast('Não foi possível exportar',e.message)}}},'Baixar meus dados'),h('button',{class:'btn',style:'margin-top:10px',onclick:closeModal},'Concluir'));openModal(container);try{const [p,blocks]=await Promise.all([api('/me/preferences'),api('/me/blocks')]);if(!$('pauseStatus'))return;$('pauseStatus').textContent=p.paused?'Seu perfil está pausado na descoberta.':'Seu perfil está visível na descoberta.';$('blockList').replaceChildren(...(blocks.length?blocks.map(b=>h('div',{class:'li'},h('span',{class:'t'},b.name),h('button',{class:'btn sm ghost',onclick:async()=>{try{await api('/me/blocks/'+b.id,{method:'DELETE'});showSafety()}catch(e){toast('Não foi possível desbloquear',e.message)}}},'Desbloquear'))):[h('p',{class:'sub'},'Você não bloqueou ninguém.')]));}catch(e){toast('Não foi possível carregar',e.message)}}
async function showAdmin(){openModal(h('div',{class:'spin'}));try{const [pays,reports,verifs]=await Promise.all([api('/admin/payments'),api('/admin/reports'),api('/admin/verifications')]);const wrap=h('div',{},h('h2',{},'Central de cuidado'),h('h3',{},'PIX aguardando conferência'),h('p',{class:'form-help'},'Aprove somente após conferir no extrato do banco o valor e a referência. O aviso do usuário não comprova o pagamento.'));if(!pays.length)wrap.append(h('p',{class:'sub'},'Nenhum pagamento aguardando conferência.'));for(const p of pays)wrap.append(h('div',{class:'utility-card'},h('b',{},brl(p.amount_cents)+' · '+p.reference),h('p',{},p.payer),h('div',{class:'row',style:'margin-top:12px'},h('button',{class:'btn',onclick:async()=>{if(!confirm('Você confirmou este recebimento no extrato bancário?'))return;try{await api('/admin/payments/'+p.id+'/approve',{method:'POST'});showAdmin()}catch(e){toast('Não foi possível aprovar',e.message)}}},'Recebimento confirmado'),h('button',{class:'btn ghost',onclick:async()=>{if(!confirm('Recusar este pagamento?'))return;try{await api('/admin/payments/'+p.id+'/reject',{method:'POST'});showAdmin()}catch(e){toast('Não foi possível recusar',e.message)}}},'Recusar'))));wrap.append(h('h3',{},'Denúncias recebidas'));if(!reports.length)wrap.append(h('p',{class:'sub'},'Nenhuma denúncia registrada.'));for(const r of reports)wrap.append(h('div',{class:'utility-card'},h('b',{},'Denúncia #'+r.id+' · perfil #'+r.reported_id),h('p',{},r.reason||'Sem descrição'),h('button',{class:'btn danger',onclick:async()=>{if(!confirm('Suspender a conta denunciada?'))return;try{await api('/admin/users/'+r.reported_id+'/suspend',{method:'POST'});toast('Conta suspensa');showAdmin()}catch(e){toast('Não foi possível suspender',e.message)}}},'Suspender conta')));wrap.append(h('h3',{},'Verificações pendentes'));if(!verifs.length)wrap.append(h('p',{class:'sub'},'Nenhuma verificação pendente.'));for(const v of verifs)wrap.append(h('div',{class:'utility-card'},h('b',{},'Verificação #'+v.id+' · perfil #'+v.user_id),h('div',{class:'row',style:'margin-top:12px'},h('button',{class:'btn',onclick:async()=>{try{await api('/admin/verifications/'+v.id+'/approve',{method:'POST'});showAdmin()}catch(e){toast('Não foi possível aprovar',e.message)}}},'Aprovar'),h('button',{class:'btn ghost',onclick:async()=>{try{await api('/admin/verifications/'+v.id+'/reject',{method:'POST'});showAdmin()}catch(e){toast('Não foi possível rejeitar',e.message)}}},'Rejeitar'))));wrap.append(h('button',{class:'btn ghost',onclick:closeModal},'Fechar'));openModal(wrap)}catch(e){closeModal();toast('Não foi possível carregar',e.message)}}
// Keep browser accessibility labels meaningful for controls generated by the original app.
new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node.nodeType!==1)continue;for(const label of node.querySelectorAll('label')){const el=label.nextElementSibling;if(el&&/INPUT|SELECT|TEXTAREA/.test(el.tagName)&&!el.getAttribute('aria-label'))el.setAttribute('aria-label',label.textContent)}for(const img of node.querySelectorAll('img'))if(!img.hasAttribute('alt'))img.alt='Foto de perfil';}}).observe($('app'),{childList:true,subtree:true});

const inviteParam = new URLSearchParams(location.hash.slice(1)).get('admin_invite');
if(inviteParam){window.adminInvite=inviteParam;history.replaceState(null,'',location.pathname);$('rEmail').value='contato@aculpaedoarquiteto.com';showReg();}

// ---- fase 2: voz, vídeo, premium, reset ----
if($('loginBox')&&!$('forgotBtn'))$('loginBox').append(h('p',{style:'text-align:center;margin-top:10px'},h('button',{id:'forgotBtn',class:'link',onclick:forgotFlow},'Esqueci a senha')));
async function forgotFlow(){const em=prompt('Seu e-mail de cadastro:');if(!em)return;try{await api('/auth/forgot',{method:'POST',body:{email:em}});toast('Se existir, enviamos o link','Vale 1h. Confira inbox e spam.');const tok=prompt('Cole aqui o código recebido por e-mail:');if(!tok)return;const np=prompt('Nova senha (mín. 8 caracteres):');if(!np)return;await api('/auth/reset',{method:'POST',body:{token:tok.trim(),new_password:np}});toast('Senha trocada!','Entre com a nova senha.')}catch(e){toast('Não foi possível',e.message)}}
const _openChat2=openChat;
openChat=async(mid,user)=>{await _openChat2(mid,user);setupChatMedia();loadVoices();watchCalls();};
function setupChatMedia(){const bar=document.querySelector('.cin');if(!bar||$('voiceBtn')||$('acallBtn'))return;bar.prepend(h('button',{id:'voiceBtn',title:'Enviar áudio',onclick:toggleRec},'🎤'),h('button',{id:'acallBtn',title:'Chamada de voz',onclick:startAudioCall},'📞'),h('button',{id:'callBtn',title:'Chamada de vídeo',onclick:startVideoCall},'📹'));}
let recState=null;
async function toggleRec(){if(recState){recState.stop();return;}if(!navigator.mediaDevices?.getUserMedia)return toast('Sem microfone','Use HTTPS e libere o mic.');try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const mime=MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':'audio/mp4';const rec=new MediaRecorder(stream,{mimeType:mime});const chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};const t0=Date.now();recState={stop:()=>rec.stop()};$('voiceBtn').textContent='⏹';rec.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());$('voiceBtn').textContent='🎤';recState=null;const secs=Math.min(120,Math.round((Date.now()-t0)/1000));const blob=new Blob(chunks,{type:mime});if(blob.size<500)return toast('Áudio muito curto');if(blob.size>2*1024*1024)return toast('Áudio até 2MB / ~90s');const fd=new FormData();fd.append('file',blob,'voz.'+(mime.includes('mp4')?'m4a':'webm'));try{const v=await api('/matches/'+S.chat.id+'/voice?secs='+secs,{method:'POST',body:fd});addVoice(v)}catch(e){toast('Áudio não enviado',e.message)}};rec.start();setTimeout(()=>{if(recState)toggleRec()},90000);toast('Gravando…','Toque ⏹ para enviar (máx. 90s).')}catch(e){toast('Mic bloqueado','Libere o microfone no navegador.');}}
function addVoice(v){if(!v||document.querySelector('[data-voice-id="'+v.id+'"]'))return;const box=$('msgs');if(!box)return;const own=v.sender_id===S.me.id;const el=h('div',{'data-voice-id':v.id,class:'m '+(own?'me':'ot')},h('audio',{controls:true,src:url(v.audio_url),style:'max-width:220px'}),v.secs?h('small',{},v.secs+'s'):null,own?h('button',{title:'Apagar',style:'margin-left:6px;background:rgba(255,255,255,.14);border:none;border-radius:50%;width:20px;height:20px;font-size:11px;color:#fff;cursor:pointer;flex:none',onclick:async e=>{e.stopPropagation();if(!confirm('Apagar este áudio?'))return;try{await api('/matches/'+S.chat.id+'/voices/'+v.id,{method:'DELETE'});el.remove()}catch(er){toast('Não apagou',er.message)}}},'✕'):null);box.append(el);box.scrollTop=box.scrollHeight;}
async function loadVoices(){if(!S.chat)return;try{(await api('/matches/'+S.chat.id+'/voices')).forEach(addVoice)}catch(e){}}
let callWatch=null,ringSeen=new Set();
async function watchCalls(){clearInterval(callWatch);if(!S.chat)return;const mid=S.chat.id;callWatch=setInterval(async()=>{if(!S.chat||S.chat.id!==mid){clearInterval(callWatch);return;}try{await loadVoices();const cs=await api('/matches/'+mid+'/calls');const ring=cs.find(c=>c.status==='RINGING'&&c.caller_id!==S.me.id&&!ringSeen.has(c.id));if(ring){ringSeen.add(ring.id);incomingCall(ring)}}catch(e){}},4000);}
const _closeChat2=typeof closeChat!=='undefined'?closeChat:null;
if(_closeChat2)closeChat=()=>{clearInterval(callWatch);_closeChat2();};
function callIsVideo(call){try{return !call.offer||call.offer.indexOf('m=video')>=0;}catch(e){return true;}}
async function incomingCall(call){
 const isV=callIsVideo(call);
 if(!confirm((isV?'📹 Chamada de vídeo':'📞 Chamada de voz')+' de '+(call.caller_name||'alguém')+'. Atender?')){try{await api('/calls/'+call.id+'/answer',{method:'POST',body:{accept:false}})}catch(e){}return;}
 window._vAudioOnly=!isV;window._lastCallId=call.id;
 try{const u=await api('/users/'+call.caller_id);await openChat(call.match_id,u);}catch(e){}
 openVideoRoom(call,true,null,null,!isV);}
async function onCallRing(d){
 try{
  const cs=await api('/calls/ringing');
  const ring=(cs||[]).find(c=>!ringSeen.has(c.id));
  if(ring){ringSeen.add(ring.id);incomingCall(ring);}
 }catch(e){}
}
let callWatchG=null;
async function watchCallsGlobal(){
 clearInterval(callWatchG);
 callWatchG=setInterval(async()=>{
  try{
   if(!S.token||!S.me)return;
   const cs=await api('/calls/ringing');
   const ring=(cs||[]).find(c=>!ringSeen.has(c.id));
   if(ring){ringSeen.add(ring.id);incomingCall(ring);}
  }catch(e){}
 },5000);}
async function startAudioCall(){if(!S.chat)return;if(!navigator.mediaDevices?.getUserMedia)return toast('Sem microfone','Use HTTPS e libere o mic.');try{const pc=makePC();const stream=await navigator.mediaDevices.getUserMedia({video:false,audio:true});stream.getTracks().forEach(t=>pc.addTrack(t,stream));const offer=await pc.createOffer();await pc.setLocalDescription(offer);const call=await api('/matches/'+S.chat.id+'/calls',{method:'POST',body:{offer:JSON.stringify(offer),kind:'voz'}});window._vAudioOnly=true;window._lastCallId=call.id;openVideoRoom(call,false,pc,stream,true);pollAnswer(call.id,pc)}catch(e){toast('Não foi possível ligar',e.message)}}
async function startVideoCall(){if(!S.chat)return;if(!navigator.mediaDevices?.getUserMedia)return toast('Sem câmera','Use HTTPS e libere câmera/mic.');try{const pc=makePC();const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});stream.getTracks().forEach(t=>pc.addTrack(t,stream));const offer=await pc.createOffer();await pc.setLocalDescription(offer);const call=await api('/matches/'+S.chat.id+'/calls',{method:'POST',body:{offer:JSON.stringify(offer),kind:'video'}});window._vAudioOnly=false;window._lastCallId=call.id;openVideoRoom(call,false,pc,stream,false);pollAnswer(call.id,pc)}catch(e){toast('Não foi possível ligar',e.message)}}
function makePC(){return new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});}
function openVideoRoom(call,isCallee,pc,stream,audioOnly){
 const voice=!!audioOnly;
 const media=voice?h('div',{style:'text-align:center;padding:14px 0'},h('div',{style:'font-size:64px'},'🎙'),h('div',{id:'vTimer',style:'font-size:26px;font-weight:800'},'00:00'),h('p',{class:'form-help'},'Chamada de voz conectada')):h('div',{class:'row'},h('video',{id:'vLocal',autoplay:true,muted:true,playsinline:true,style:'width:48%;border-radius:12px;background:#000'}),h('video',{id:'vRemote',autoplay:true,playsinline:true,style:'width:48%;border-radius:12px;background:#000'}),h('div',{id:'vTimer',style:'display:none'},'00:00'));
 openModal(h('div',{},h('h2',{},voice?'📞 Chamada de voz':'📹 Chamada'),media,h('p',{class:'form-help'},'P2P via WebRTC. Áudio/vídeo não passam pelo servidor.'),h('div',{class:'row',style:'margin-top:12px'},h('button',{class:'btn ghost',onclick:e=>togV('mic',e.currentTarget)},'🎤 Mic'),voice?null:h('button',{class:'btn ghost',onclick:e=>togV('cam',e.currentTarget)},'📹 Cam'),h('button',{class:'btn danger',onclick:async()=>{try{await api('/calls/'+call.id+'/end',{method:'POST'})}catch(e){}closeModal();stopTracks()}},'Encerrar'))));
 if(stream){try{if($('vLocal'))$('vLocal').srcObject=stream;window._vstream=stream;}catch(e){}}
 window._vt0=Date.now();
 try{clearInterval(window._vtimer);}catch(e){}
 window._vtimer=setInterval(()=>{try{const el=document.getElementById('vTimer');if(!el)return;const s=Math.floor((Date.now()-window._vt0)/1000);el.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}catch(e){}},1000);
 if(isCallee)answerAsCallee(call.id);}
function togV(kind,btn){
 try{
  const st=window._vstream;
  if(!st||!st.getTracks)return;
  let on=false;
  st.getTracks().forEach(t=>{if((kind==='mic'&&t.kind==='audio')||(kind==='cam'&&t.kind==='video')){t.enabled=!t.enabled;if(t.enabled)on=true;}});
  if(btn)btn.style.opacity=on?'1':'.45';
 }catch(e){toast('Ops',e.message);}
}
function stopTracks(){['vLocal','vRemote'].forEach(id=>{const v=$(id);if(v&&v.srcObject)v.srcObject.getTracks().forEach(t=>t.stop())});try{clearInterval(window._vtimer);window._vstream=null;window._vAudioOnly=false;}catch(e){}}
async function answerAsCallee(cid){try{const cs=await api('/matches/'+S.chat.id+'/calls');const call=cs.find(c=>c.id===cid);if(!call||!call.offer)return;const pc=makePC();window._pc=pc;const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});stream.getTracks().forEach(t=>pc.addTrack(t,stream));try{if($('vLocal'))$('vLocal').srcObject=stream;window._vstream=stream;}catch(e){}pc.ontrack=e=>{try{const _r=$('vRemote');if(_r)_r.srcObject=e.streams[0];}catch(_){}};pc.onicecandidate=e=>{if(e.candidate)api('/calls/'+cid+'/signals',{method:'POST',body:{payload:JSON.stringify(e.candidate)}}).catch(()=>{})};await pc.setRemoteDescription(JSON.parse(call.offer));const ans=await pc.createAnswer();await pc.setLocalDescription(ans);await api('/calls/'+cid+'/answer',{method:'POST',body:{accept:true,answer:JSON.stringify(ans)}});pollSignals(cid,pc)}catch(e){try{await api('/calls/'+cid+'/answer',{method:'POST',body:{accept:false}})}catch(_){}toast('Falha ao atender',e.message)}}
async function pollAnswer(cid,pc){window._pc=pc;pc.ontrack=e=>{try{const _r=$('vRemote');if(_r)_r.srcObject=e.streams[0];}catch(_){}};pc.onicecandidate=e=>{if(e.candidate)api('/calls/'+cid+'/signals',{method:'POST',body:{payload:JSON.stringify(e.candidate)}}).catch(()=>{})};let n=0;const iv=setInterval(async()=>{const _au=window._vAudioOnly&&window._lastCallId===cid;if(!_au&&(!$('vRemote')||!document.body.contains($('vRemote')))){clearInterval(iv);return;}try{const cs=await api('/matches/'+S.chat.id+'/calls');const c=cs.find(x=>x.id===cid);if(c&&c.answer&&!pc.remoteDescription){await pc.setRemoteDescription(JSON.parse(c.answer))}if(c&&(c.status==='DECLINED'||c.status==='ENDED')){clearInterval(iv);toast(c.status==='DECLINED'?'Recusada':'Encerrada');closeModal();stopTracks();return}const ss=await api('/calls/'+cid+'/signals?since='+(window._lastSig||0));for(const s of ss){window._lastSig=Math.max(window._lastSig||0,s.id);try{await pc.addIceCandidate(JSON.parse(s.payload))}catch(e){}}if(++n>60){clearInterval(iv);try{await api('/calls/'+cid+'/end',{method:'POST'})}catch(e){}closeModal();stopTracks()}}catch(e){}},2000);}
async function pollSignals(cid,pc){let n=0;const iv=setInterval(async()=>{if(!$('vRemote')||!document.body.contains($('vRemote'))){clearInterval(iv);return;}try{const ss=await api('/calls/'+cid+'/signals?since='+(window._lastSig||0));for(const s of ss){window._lastSig=Math.max(window._lastSig||0,s.id);try{await pc.addIceCandidate(JSON.parse(s.payload))}catch(e){}}const cs=await api('/matches/'+S.chat.id+'/calls');const c=cs.find(x=>x.id===cid);if(c&&(c.status==='ENDED')){clearInterval(iv);closeModal();stopTracks();return}if(++n>90)clearInterval(iv)}catch(e){}},2000);}
async function buyPremium(plan){try{const r=await api('/me/subscription',{method:'POST',body:{plan}});const brcode=(r.brcode||r.qr_code||'');window._lastBrcode=brcode;const qrSrc=r.qr_base64?(String(r.qr_base64).startsWith('data:')?r.qr_base64:'data:image/png;base64,'+r.qr_base64):null;const status=h('p',{class:'sub'},'\u23F3 AGUARDANDO pagamento...');const copyBrcode=async()=>{try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(brcode)}else{const ta=document.createElement('textarea');ta.value=brcode;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}toast('BR Code copiado')}catch(e){try{const ta=document.createElement('textarea');ta.value=brcode;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('BR Code copiado')}catch(e2){toast('Nao copiou',String(e).slice(0,120))}}};openModal(h('div',{class:'ctr'},h('h2',{},'Premium '+plan),h('div',{class:'price'},(plan==='MENSAL'?'R$ 14,90 / 30 dias':'R$ 29,90 / 90 dias')),qrSrc?h('div',{class:'qr'},h('img',{src:qrSrc,width:'220',height:'220',style:'width:220px;height:220px;image-rendering:pixelated'})):null,h('div',{class:'code',style:'word-break:break-all;font-size:11px'},brcode),h('div',{class:'row'},h('button',{class:'btn ghost',onclick:copyBrcode},'Copiar BR Code'),h('button',{class:'btn ghost',onclick:closeModal},'Fechar')),h('button',{class:'btn',style:'margin-top:10px',onclick:async e=>{e.currentTarget.disabled=true;try{await api('/payments/'+r.payment_id+'/notify-paid',{method:'POST'});status.textContent='Em conferencia pelo administrador. (AGUARDANDO aprovacao)'}catch(er){e.currentTarget.disabled=false}}},'Ja paguei'),h('div',{style:'margin-top:12px'},status)));const iv=setInterval(async()=>{try{const s=await api('/payments/'+r.payment_id);if(s.status==='APPROVED'){clearInterval(iv);status.textContent='\u2705 APROVADO! Premium ativo.';closeModal();toast('Premium ativo! \uD83D\uDCAB');refreshTrust()}else if(s.status==='REVIEW'){status.textContent='Em conferencia pelo administrador. (AGUARDANDO aprovacao)'}else if(s.status==='CANCELLED'){clearInterval(iv);status.textContent='Pagamento cancelado.'}else{status.textContent='\u23F3 AGUARDANDO pagamento...'}}catch(e){}},3000)}catch(e){toast('Nao gerou PIX',e.message)}}
const _refreshTrust2=typeof refreshTrust!=='undefined'?refreshTrust:null;
async function refreshTrustPlus(){if(_refreshTrust2)await _refreshTrust2();try{const m=await api('/me');const el=$('trustStatus');if(el&&m.premium)el.textContent+=' Premium até '+m.premium_until+'.'}catch(e){}}
if(typeof refreshTrust!=='undefined')refreshTrust=refreshTrustPlus;

const CLIMA_TXT=['Um encontro inesperado pode virar história. Diga oi primeiro.','Sua energia atrai quem presta atenção. Sorria com os olhos.','Bom dia para aprofundar uma conversa que ficou no ar.','Alguém observa seu brilho em silêncio. Facilite o oi.','A lua favorece confissões doces. Seja honesto e leve.','Evite pressa no amor hoje. Deixe a órbita agir.','Um gesto pequeno vale mais que mil palavras. Capriche.','Sua intuição está afiada: confie no primeiro impulso.','Revisite um match antigo. O timing agora é outro.','Fale do que você ama. Paixão atrai paixão.','Dia de cuidar de você. Quem combina percebe.','O cosmos conspira por encontros reais. Esteja presente.'];
const CLIMA_COR=['dourado','prateado','vinho','azul-noite','verde-esperança','lilás','terracota','turquesa','rosa-quartzo','âmbar','grafite','branco-lua'];
function climaCard(){
 const m=S.me||{};
 const hoje=new Date(),seed=hoje.getFullYear()*372+(hoje.getMonth()+1)*31+hoje.getDate();
 let x=0;const s=String(m.sun_sign||'?')+seed;
 for(const ch of s)x=(x*31+ch.codePointAt(0))>>>0;
 return h('div',{class:'utility-card'},h('div',{class:'eyebrow'},'CLIMA ASTRAL · HOJE'),h('h3',{},'Para '+(m.sun_sign||'você')+': '+CLIMA_TXT[x%CLIMA_TXT.length]),h('p',{class:'sub'},'Número da sorte '+(x%99+1)+' · cor '+CLIMA_COR[x%CLIMA_COR.length]));
}
async function renderGroups(){
 const box=$('groupsBox');if(!box)return;
 box.replaceChildren(h('h1',{class:'section-heading'},'Constelações'),h('p',{class:'sub'},'Tribos por signo, gosto e cidade. Entre, conheça, converse.'));
 const bar=h('div',{style:'display:flex;gap:8px;margin:12px 0'});
 const q=h('input',{placeholder:'Buscar constelação...',style:'flex:1'});
 bar.append(q,h('button',{class:'btn sm',onclick:()=>loadGroups(q.value)},'Buscar'),h('button',{class:'btn ghost sm',onclick:newCommunity},'Criar'));
 box.append(bar,h('div',{id:'groupsList'}));
 await loadGroups('');
}
async function loadGroups(q){
 const list=document.getElementById('groupsList');if(!list)return;
 list.replaceChildren(h('p',{class:'sub'},'Carregando…'));
 try{
  const cs=await api('/comunidades?q='+encodeURIComponent(q||''));
  list.replaceChildren();
  if(!cs.length)list.append(h('p',{class:'sub'},'Nenhuma ainda. Crie a primeira!'));
  for(const c of cs)list.append(communityCard(c));
 }catch(e){list.replaceChildren(h('p',{class:'sub'},'Falhou. Tente de novo.'));}
}
function communityCard(c){
 return h('div',{class:'utility-card'},
  h('div',{style:'display:flex;justify-content:space-between;align-items:center'},h('b',{},'✧ '+c.name),h('span',{class:'sub'},c.membros+' membros')),
  c.descricao?h('p',{class:'sub'},c.descricao):null,
  h('p',{class:'sub'},c.tipo+(c.ref?' · '+c.ref:'')),
  h('div',{class:'row',style:'margin-top:8px'},
   h('button',{class:'btn sm',onclick:()=>openCommunity(c.id,c.name)},'Abrir'),
   c.sou_membro
   ?h('button',{class:'btn ghost sm',onclick:async e=>{e.currentTarget.disabled=true;try{await api('/comunidades/'+c.id+'/sair',{method:'POST'});loadGroups('')}catch(er){toast('Ops',er.message);e.currentTarget.disabled=false}}},'Sair')
   :h('button',{class:'btn ghost sm',onclick:async e=>{e.currentTarget.disabled=true;try{await api('/comunidades/'+c.id+'/entrar',{method:'POST'});openCommunity(c.id,c.name)}catch(er){toast('Ops',er.message);e.currentTarget.disabled=false}}},'Entrar')));
}
async function newCommunity(){
 const name=prompt('Nome da constelação:');if(!name)return;
 const ref=prompt('Signo, gosto ou cidade (ex: Leão, Rock, Ribeirão Preto):')||'';
 try{const c=await api('/comunidades',{method:'POST',body:{name,descricao:'',tipo:'geral',ref}});openCommunity(c.id,c.name);}
 catch(e){toast('Não criou',e.message);}
}
async function openCommunity(cid,cname){
 try{
  const ms=await api('/comunidades/'+cid+'/membros');
  let ps=null;
  try{ps=await api('/comunidades/'+cid+'/mural');}catch(e){ps=null;}
  openModal(h('div',{},
   h('div',{class:'eyebrow'},'CONSTELAÇÃO'),
   h('h2',{},cname||'Constelação'),
   h('p',{class:'sub'},(ms||[]).length+' membros'),
   h('div',{id:'cMembers',style:'display:flex;flex-wrap:wrap;gap:6px;margin:8px 0'}),
   h('h3',{},'Mural da tribo'),
   h('div',{id:'cMural'}),
   ps===null
   ?h('p',{class:'sub'},'Entre na constelação para ver e publicar.')
   :h('div',{},h('div',{class:'row'},h('input',{id:'cText',placeholder:'Escreva algo...',style:'flex:1'}),h('button',{class:'btn sm',onclick:()=>cPost(cid)},'Publicar')),h('input',{id:'cYt',placeholder:'YouTube (opcional)',style:'width:100%;margin-top:6px'})),
   h('button',{class:'btn ghost',style:'margin-top:10px',onclick:closeModal},'Fechar')));
  const mb=document.getElementById('cMembers');
  (ms||[]).forEach(m=>mb.append(h('span',{class:'sub',style:'background:var(--surf);border:1px solid var(--line);border-radius:12px;padding:4px 10px'},m.name)));
  if(ps!==null)renderCMural(cid,ps);
 }catch(e){toast('Não abriu',e.message);}
}
function renderCMural(cid,ps){
 const box=document.getElementById('cMural');if(!box)return;
 box.replaceChildren();
 if(!ps.length)box.append(h('p',{class:'sub'},'Silêncio cósmico. Seja o primeiro!'));
 for(const p of ps){
  box.append(h('div',{class:'utility-card'},
   h('div',{style:'display:flex;justify-content:space-between'},h('b',{},p.author_name),h('small',{class:'sub'},new Date(p.created_at).toLocaleDateString('pt-BR')+(p.updated_at?' · editado':''))),
   p.text?h('p',{style:'margin:6px 0;white-space:pre-line'},p.text):null,
   p.kind==='youtube'&&p.yt?ytEmbed(p.yt):null,
   p.author_id===S.me.id?h('div',{class:'row',style:'margin-top:6px'},
    h('button',{class:'btn ghost sm',onclick:async()=>{const t=prompt('Editar:',p.text||'');if(t===null)return;try{await api('/comunidades/mural/'+p.id,{method:'PUT',body:{kind:p.kind,text:t,url:''}});refreshCMural(cid)}catch(e){toast('Ops',e.message)}}},'Editar'),
    h('button',{class:'btn ghost sm',onclick:async()=>{if(!confirm('Excluir?'))return;try{await api('/comunidades/mural/'+p.id,{method:'DELETE'});refreshCMural(cid)}catch(e){toast('Ops',e.message)}}},'Excluir')):null));
 }
}
async function refreshCMural(cid){try{renderCMural(cid,await api('/comunidades/'+cid+'/mural'));}catch(e){}}
async function cPost(cid){
 const t=((document.getElementById('cText')||{}).value||'');
 const y=(((document.getElementById('cYt')||{}).value)||'').trim();
 try{await api('/comunidades/'+cid+'/mural',{method:'POST',body:{kind:y?'youtube':'texto',text:t,url:y}});refreshCMural(cid);toast('Publicado');}
 catch(e){toast('Não publicou',e.message);}
}
