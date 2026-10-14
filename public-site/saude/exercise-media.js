/* Spark Saúde — real trainer video player. No API key, media copying or synthetic figures. */
(function () {
    'use strict';
    var active = null;
    function norm(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
    function escape(value) { return String(value || '').replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
    function catalog() { return window.SETUP_HUMAN_CATALOG || []; }
    function resolve(raw) {
        var name = norm(raw);
        var best = null, score = 0;
        catalog().forEach(function(entry) {
            entry.aliases.forEach(function(alias) {
                var candidate = norm(alias);
                if (name.indexOf(candidate) >= 0 && candidate.length > score) { best = entry; score = candidate.length; }
            });
        });
        return best;
    }
    function command(action, value) {
        if (!active || !active.frame || !active.frame.contentWindow) return;
        active.frame.contentWindow.postMessage({ channel:'setup-human-player', action:action, value:value }, active.origin);
    }
    function status(text) { var el = document.getElementById('exercise-film-status'); if (el) el.textContent = text; }
    function close() {
        if (active) {
            clearTimeout(active.timeout);
            if (active.frame) active.frame.remove();
        }
        active = null;
        var host = document.getElementById('exercise-media');
        if (host) host.innerHTML = '';
    }
    function open(entry, choiceKey) {
        close();
        var host = document.getElementById('exercise-media');
        if (!host) return;
        if (!entry) {
            host.innerHTML = '<div class="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">Demonstração ainda não cadastrada para este movimento. Use o vídeo de execução abaixo.</div>';
            return;
        }
        var choices = entry.choices ? entry.choices.map(function (key) { return catalog().find(function (c) { return c.key === key; }); }).filter(Boolean) : [];
        var selected = choices.length ? choices.find(function (c) { return c.key === choiceKey; }) || choices[0] : entry;
        active = { record:entry, selected:selected, ready:false, playing:false, rate:1, frame:null, desired:'play' };
        var selectors = choices.length ? '<div class="mb-2"><p class="text-[10px] text-slate-500 mb-2">Escolha a sustentação para este finisher:</p><div class="flex gap-2">' + choices.map(function (c) {
            return '<button data-choice="'+escape(c.key)+'" class="flex-1 px-3 py-2 rounded-xl text-[10px] font-black border '+(c.key === selected.key ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-500')+'">'+escape(c.title)+'</button>';
        }).join('') + '</div></div>' : '';
        host.innerHTML = selectors +
            '<div class="exercise-film-stage">' +
                '<img class="exercise-film-poster" src="https://i.ytimg.com/vi/'+escape(selected.videoId)+'/hqdefault.jpg" alt="Treinador demonstrando '+escape(selected.title)+'" referrerpolicy="strict-origin-when-cross-origin">' +
                '<div id="exercise-film-loading" class="exercise-film-loading"><span class="exercise-film-spinner" aria-hidden="true"></span><span class="text-[11px] font-bold text-white">Preparando a demonstração</span></div>' +
                '<div id="exercise-film-frame-slot" class="exercise-film-frame-slot"></div>' +
                '<button id="exercise-film-retry" class="hidden absolute inset-0 flex-col items-center justify-center gap-2 text-white bg-slate-900/75"><span class="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center"><i class="fas fa-redo"></i></span><span class="text-xs font-black">Tentar novamente</span></button>' +
            '</div>' +
            '<div class="flex items-center justify-between gap-2 mt-2 mb-2"><div class="min-w-0"><p class="text-[10px] font-black text-slate-700 truncate">'+escape(selected.title)+'</p><p class="text-[9px] text-slate-400">Demonstração com pessoa real</p></div><button id="exercise-film-expand" aria-label="Ampliar demonstração" class="w-9 h-9 shrink-0 bg-slate-100 rounded-xl text-slate-500"><i class="fas fa-expand"></i></button></div>' +
            '<div class="flex items-center gap-2 mb-2"><button id="exercise-film-toggle" class="px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-black"><i class="fas fa-play mr-1"></i> Reproduzir</button><div class="flex rounded-xl bg-slate-100 p-1 gap-1" role="group" aria-label="Velocidade da demonstração">'+[0.5,0.75,1].map(function (r) {
                return '<button data-rate="'+r+'" class="px-2 py-1 rounded-lg text-[10px] font-black '+(r===1?'bg-white text-rose-600 shadow-sm':'text-slate-500')+'">'+r+'×</button>';
            }).join('')+'</div><span class="text-[9px] text-slate-400">Velocidade</span></div>' +
            '<p id="exercise-film-status" class="text-[9px] text-slate-400 min-h-[14px]" role="status" aria-live="polite">Carregando vídeo · qualidade ajustada à conexão.</p>' +
            '<p class="text-[9px] text-slate-400 mt-1 mb-3">'+escape(selected.creator)+' · <a href="https://www.youtube.com/watch?v='+escape(selected.videoId)+'" target="_blank" rel="noopener noreferrer" class="underline">Vídeo original</a></p>';
        host.querySelectorAll('[data-choice]').forEach(function (button) { button.onclick = function () { open(entry, button.dataset.choice); }; });
        host.querySelectorAll('[data-rate]').forEach(function (button) { button.onclick = function () {
            if (!active) return;
            active.rate = Number(button.dataset.rate); command('rate', active.rate);
            host.querySelectorAll('[data-rate]').forEach(function (b) { b.classList.toggle('bg-white', b === button); b.classList.toggle('text-rose-600', b === button); b.classList.toggle('text-slate-500', b !== button); b.classList.toggle('shadow-sm', b === button); });
        }; });
        document.getElementById('exercise-film-toggle').onclick = function () { if (active && active.playing) pause(); else play(); };
        document.getElementById('exercise-film-retry').onclick = function () { open(entry, selected.key); };
        document.getElementById('exercise-film-expand').onclick = function () {
            var stage = host.querySelector('.exercise-film-stage');
            if (stage.requestFullscreen) stage.requestFullscreen().catch(function () { status('Use o botão de tela cheia do player.'); });
            else status('Use o botão de tela cheia do player.');
        };
        var native = location.protocol === 'capacitor:' || location.origin === 'null' || (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
        var wrapper = native ? new URL('https://sparkbr.online/saude/exercise-player.html') : new URL('exercise-player.html', location.href);
        wrapper.searchParams.set('video', selected.videoId);
        wrapper.searchParams.set('autoplay', '1');
        var frame = document.createElement('iframe');
        frame.src = wrapper.href; frame.title = 'Demonstração real: '+selected.title;
        frame.className = 'exercise-human-frame'; frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
        frame.allowFullscreen = true; frame.referrerPolicy = 'strict-origin-when-cross-origin';
        active.frame = frame; active.origin = wrapper.origin;
        document.getElementById('exercise-film-frame-slot').appendChild(frame);
        var current = active;
        active.timeout = setTimeout(function () { if (active === current && !active.ready) showError('A demonstração demorou a carregar. Tente novamente ou abra o vídeo original.'); }, 20000);
        document.dispatchEvent(new CustomEvent('setup-human-exercise-selected', { detail:selected }));
    }
    function showError(text) {
        var loading = document.getElementById('exercise-film-loading'), retry = document.getElementById('exercise-film-retry');
        if (loading) loading.classList.add('hidden');
        if (retry) { retry.classList.remove('hidden'); retry.classList.add('flex'); }
        status(text);
    }
    function play() { if (active) { active.desired='play'; command('play'); } }
    function pause() { if (active) { active.desired='pause'; command('pause'); } }
    window.addEventListener('message', function (event) {
        if (!active || !active.frame || event.source !== active.frame.contentWindow || event.origin !== active.origin) return;
        var data = event.data;
        if (!data || data.channel !== 'setup-human-player') return;
        if (data.type === 'ready') {
            active.ready = true; clearTimeout(active.timeout);
            var loading = document.getElementById('exercise-film-loading'); if (loading) loading.classList.add('hidden');
            command('rate', active.rate); command(active.desired);
            status('Observe a técnica · use 0.5× para ver o movimento com calma.');
        }
        if (data.type === 'state') {
            active.playing = data.state === 1;
            var toggle = document.getElementById('exercise-film-toggle');
            if (toggle) toggle.innerHTML = active.playing ? '<i class="fas fa-pause mr-1"></i> Pausar vídeo' : '<i class="fas fa-play mr-1"></i> Reproduzir';
        }
        if (data.type === 'autoplay-blocked') status('Toque em Reproduzir ou no player para iniciar a demonstração.');
        if (data.type === 'error') showError('O player não conseguiu reproduzir este vídeo agora. Tente novamente ou abra o vídeo original.');
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
    window.SetupHumanExercise = { resolve:resolve, open:open, close:close, play:play, pause:pause };
})();
