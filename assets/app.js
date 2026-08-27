(function(){
  'use strict';

  /* ═══════════════════════════════════════════════════════
     Что можно поменять, не залезая в остальной код
     ═══════════════════════════════════════════════════════ */

  var DRINKS = [
    'Белое сухое',
    'Белое полусладкое',
    'Красное сухое',
    'Красное полусладкое',
    'Коньяк',
    'Водка',
    'Шампанское'
  ];

  /* Дата и время торжества. Месяцы в JS считаются с нуля, 9 — это октябрь.
     Время берётся по часам самого гостя: почти все гости местные, поэтому
     16:10 у них на телефоне и есть 16:10 в «Саду Медовом». */
  var WEDDING = new Date(2026, 9, 2, 16, 10, 0);

  var HEART_PATH = 'M12 21s-7-4.6-7-10.2A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7 2.8C19 16.4 12 21 12 21z';
  var CHECK_SVG  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  var body   = document.body;
  var calm   = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var has    = function(cls){ return body.classList.contains(cls); };
  var rand   = function(min, max){ return min + Math.random() * (max - min); };

  function heartSvg(size, filled){
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" ' +
           'fill="' + (filled ? 'currentColor' : 'none') + '" stroke="currentColor" ' +
           'stroke-width="' + (filled ? 0 : 1.9) + '" stroke-linecap="round" stroke-linejoin="round">' +
           '<path d="' + HEART_PATH + '"/></svg>';
  }

  /* ═══════════════════════════════════════════════════════
     Базовое поведение — работает на всех версиях страницы
     ═══════════════════════════════════════════════════════ */

  /* ── Варианты напитков ───────────────────────── */
  var drinksBox = document.getElementById('drinks');
  if (drinksBox) {
    DRINKS.forEach(function(name){
      var label = document.createElement('label');
      label.className = 'opt';

      var input = document.createElement('input');
      input.type  = 'checkbox';
      input.name  = 'drinks';
      input.value = name;

      var mark = document.createElement('span');
      mark.className = 'mark mark--check';
      mark.innerHTML = CHECK_SVG;

      var text = document.createElement('span');
      text.textContent = name;

      label.appendChild(input);
      label.appendChild(mark);
      label.appendChild(text);
      drinksBox.appendChild(label);
    });
  }

  /* Подсветка выбранного варианта — вместо :has(), ради старых Safari */
  document.addEventListener('change', function(){
    Array.prototype.forEach.call(document.querySelectorAll('.opt'), function(opt){
      var inp = opt.querySelector('input');
      opt.classList.toggle('checked', !!(inp && inp.checked));
    });
  });

  /* ── Появление блоков при скролле ────────────── */
  function observeOnce(nodes, cls, rootMargin){
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(nodes, function(el){ el.classList.add(cls); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) {
          e.target.classList.add(cls);
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: rootMargin || '0px 0px -12% 0px', threshold: 0.06 });
    Array.prototype.forEach.call(nodes, function(el){ io.observe(el); });
  }

  observeOnce(document.querySelectorAll('.slide:not(.slide--first)'), 'in');

  /* ── Подсказка «листайте вниз» ───────────────── */
  var hint = document.getElementById('hint');
  if (hint) {
    window.addEventListener('scroll', function(){
      if (window.scrollY > 120) hint.classList.add('hide');
    }, { passive: true });
  }

  /* ── Сворачивание блока с алкоголем ──────────── */
  var drinksCard = document.getElementById('drinksCard');
  var collapseTimer = null;

  function syncDrinks(){
    if (!drinksCard) return;
    var no = document.querySelector('input[name=going][data-going=no]');
    var hide = !!(no && no.checked);
    clearTimeout(collapseTimer);

    if (hide) {
      if (drinksCard.classList.contains('collapsed')) return;
      drinksCard.style.maxHeight = drinksCard.scrollHeight + 'px';
      void drinksCard.offsetHeight;                        // фиксируем стартовую высоту
      requestAnimationFrame(function(){
        drinksCard.classList.add('collapsed');
        drinksCard.style.maxHeight = '0px';
      });
    } else {
      if (!drinksCard.classList.contains('collapsed')) return;
      drinksCard.classList.remove('collapsed');
      drinksCard.style.maxHeight = drinksCard.scrollHeight + 'px';
      collapseTimer = setTimeout(function(){ drinksCard.style.maxHeight = ''; }, 520);
    }
  }
  Array.prototype.forEach.call(document.querySelectorAll('input[name=going]'), function(r){
    r.addEventListener('change', syncDrinks);
  });

  /* ── Сбор и копирование ответа ───────────────── */
  var form      = document.getElementById('form');
  var btn       = document.getElementById('copyBtn');
  var errBox    = document.getElementById('errBox');
  var result    = document.getElementById('result');
  var resultTxt = document.getElementById('resultText');
  var namesInp  = document.getElementById('names');
  var btnTimer  = null;

  function showErr(msg){
    errBox.textContent = msg;
    errBox.classList.add('show');
    errBox.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
  }
  function clearErr(){
    errBox.classList.remove('show');
    namesInp.classList.remove('err');
  }
  if (namesInp) namesInp.addEventListener('input', clearErr);

  function buildText(){
    var names   = namesInp.value.trim();
    var going   = document.querySelector('input[name=going]:checked');
    var comment = document.getElementById('comment').value.trim();
    var picked  = Array.prototype.map.call(
      document.querySelectorAll('input[name=drinks]:checked'),
      function(i){ return i.value; }
    );

    if (!names) {
      namesInp.classList.add('err');
      namesInp.focus();
      showErr('Пожалуйста, напишите ваши имена.');
      return null;
    }
    if (!going) {
      showErr('Пожалуйста, отметьте, сможете ли вы присутствовать.');
      return null;
    }
    clearErr();

    var lines = [];
    lines.push('Подтверждение — свадьба 02.10.2026');
    lines.push('');
    lines.push('Имена: ' + names);
    lines.push('Присутствие: ' + going.value);
    if (comment) lines.push('Комментарий: ' + comment);
    if (going.getAttribute('data-going') === 'yes') {
      lines.push('Алкоголь: ' + (picked.length ? picked.join(', ') : 'без алкоголя'));
    }
    return lines.join('\n');
  }

  function copyText(text){
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // Резерв для http и старых браузеров
    return new Promise(function(resolve, reject){
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) { resolve(); } else { reject(new Error('copy failed')); }
    });
  }

  function flashBtn(label, ms, done){
    btn.textContent = label;
    if (done) btn.classList.add('done');
    clearTimeout(btnTimer);
    btnTimer = setTimeout(function(){
      btn.textContent = 'Скопировать текст ответа';
      btn.classList.remove('done');
    }, ms);
  }

  if (form) {
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var text = buildText();
      if (!text) return;

      resultTxt.value = text;
      result.classList.add('show');

      copyText(text).then(function(){
        flashBtn('Скопировано ✓', 3000, true);
        burst();
      }).catch(function(){
        flashBtn('Скопируйте текст ниже ↓', 4000, false);
        resultTxt.focus();
        resultTxt.select();
      });
    });
  }

  /* ═══════════════════════════════════════════════════════
     Анимации — включаются классами fx-*-on на <body>
     ═══════════════════════════════════════════════════════ */

  /* ── Полоска прогресса прокрутки ─────────────── */
  if (has('fx-progress-on')) {
    var bar = document.querySelector('.fx-progress i');
    var queued = false;
    var paint = function(){
      queued = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    };
    window.addEventListener('scroll', function(){
      if (!queued) { queued = true; requestAnimationFrame(paint); }
    }, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  }

  /* ── Плывущие сердечки ──────────────────────── */
  if (has('fx-hearts-on') && !calm) {
    var sky = document.querySelector('.fx-hearts');
    var COUNT = window.innerWidth < 520 ? 7 : 10;

    for (var h = 0; h < COUNT; h++) {
      var size = Math.round(rand(11, 23));
      var wrap = document.createElement('div');
      wrap.innerHTML = heartSvg(size, Math.random() < 0.35);
      var el = wrap.firstChild;

      el.style.left              = rand(2, 92).toFixed(2) + '%';
      el.style.animationDuration = rand(15, 27).toFixed(1) + 's';
      el.style.animationDelay    = (-rand(0, 27)).toFixed(1) + 's';
      el.style.setProperty('--o', rand(0.22, 0.46).toFixed(2));
      el.style.setProperty('--r', Math.round(rand(-40, 40)) + 'deg');
      el.style.setProperty('--sway', Math.round(rand(-46, 46)) + 'px');

      sky.appendChild(el);
    }
  }

  /* ── Рисованные разделители ─────────────────── */
  if (has('fx-divider-on')) {
    var dividers = document.querySelectorAll('.fx-divider');
    Array.prototype.forEach.call(dividers, function(d){
      Array.prototype.forEach.call(d.querySelectorAll('path'), function(p){
        // Точная длина линии, иначе dasharray на глаз оставляет обрубок
        var len = Math.ceil(p.getTotalLength());
        p.style.setProperty('--len', len);
      });
    });
    observeOnce(dividers, 'in', '0px 0px -18% 0px');
  }

  /* ── Салют из сердечек по кнопке ────────────── */
  function burst(){
    if (!has('fx-burst-on') || calm || !btn) return;

    var box = btn.getBoundingClientRect();
    var cx  = box.left + box.width / 2;
    var cy  = box.top + box.height / 2;

    for (var i = 0; i < 16; i++) {
      (function(){
        var size = Math.round(rand(12, 24));
        var wrap = document.createElement('div');
        wrap.innerHTML = heartSvg(size, true);
        var s = wrap.firstChild;

        s.classList.add('fx-spark');
        s.style.left = (cx - size / 2) + 'px';
        s.style.top  = (cy - size / 2) + 'px';
        document.body.appendChild(s);

        // Разлёт вверх полукругом, чтобы не улетало под кнопку
        var angle = rand(-Math.PI * 0.92, -Math.PI * 0.08);
        var dist  = rand(70, 190);
        var dx    = Math.cos(angle) * dist;
        var dy    = Math.sin(angle) * dist;
        var spin  = Math.round(rand(-160, 160));

        requestAnimationFrame(function(){
          s.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) rotate(' + spin + 'deg) scale(.45)';
          s.style.opacity = '0';
        });

        setTimeout(function(){
          if (s.parentNode) s.parentNode.removeChild(s);
        }, 1150);
      })();
    }
  }

  /* ── Карточки формы по очереди ──────────────── */
  if (has('fx-stagger-on') && !calm) {
    var cards = document.querySelectorAll('#form .card');
    Array.prototype.forEach.call(cards, function(c){ c.classList.add('fx-hide'); });

    var showCards = function(){
      Array.prototype.forEach.call(cards, function(c, i){
        setTimeout(function(){ c.classList.remove('fx-hide'); }, i * 90);
      });
    };

    if ('IntersectionObserver' in window && form) {
      var fio = new IntersectionObserver(function(entries){
        if (entries[0].isIntersecting) { showCards(); fio.disconnect(); }
      }, { rootMargin: '0px 0px -15% 0px', threshold: 0.04 });
      fio.observe(form);
    } else {
      showCards();
    }
  }

  /* ── Обратный отсчёт ───────────────────────── */
  if (has('fx-countdown-on')) {
    var grid = document.getElementById('cdGrid');
    var done = document.getElementById('cdDone');
    var lead = document.getElementById('cdLead');

    var UNITS = [
      { key: 'd', forms: ['день', 'дня', 'дней'] },
      { key: 'h', forms: ['час', 'часа', 'часов'] },
      { key: 'm', forms: ['минута', 'минуты', 'минут'] },
      { key: 's', forms: ['секунда', 'секунды', 'секунд'] }
    ];

    function plural(n, forms){
      var n10 = n % 10, n100 = n % 100;
      if (n10 === 1 && n100 !== 11) return forms[0];
      if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 > 20)) return forms[1];
      return forms[2];
    }

    // Разметка ячеек с разделителями
    var cells = {};
    UNITS.forEach(function(u, i){
      if (i) {
        var sep = document.createElement('span');
        sep.className = 'cd-sep';
        sep.textContent = '·';
        sep.setAttribute('aria-hidden', 'true');
        grid.appendChild(sep);
      }
      var cell = document.createElement('div');
      cell.className = 'cd-cell';

      var num = document.createElement('span');
      num.className = 'cd-num';
      var lbl = document.createElement('span');
      lbl.className = 'cd-lbl';

      cell.appendChild(num);
      cell.appendChild(lbl);
      grid.appendChild(cell);
      cells[u.key] = { num: num, lbl: lbl, last: null };
    });

    var timer = null;

    function render(){
      var diff = WEDDING - new Date();

      if (diff <= 0) {
        // Свадьба уже началась или прошла — отсчёт больше не нужен
        clearInterval(timer);
        grid.style.display = 'none';
        if (lead) lead.style.display = 'none';
        done.textContent = diff > -18 * 3600 * 1000
          ? 'Сегодня тот самый день ❤️'
          : 'Мы стали семьёй ❤️';
        done.style.display = 'block';
        return;
      }

      var total = Math.floor(diff / 1000);
      var vals = {
        d: Math.floor(total / 86400),
        h: Math.floor(total / 3600) % 24,
        m: Math.floor(total / 60) % 60,
        s: total % 60
      };

      UNITS.forEach(function(u){
        var c = cells[u.key];
        var v = vals[u.key];
        if (c.last === v) return;
        c.last = v;
        c.num.textContent = v;
        c.lbl.textContent = plural(v, u.forms);
        if (!calm) {
          c.num.classList.remove('tick');
          void c.num.offsetWidth;                          // перезапуск анимации
          c.num.classList.add('tick');
        }
      });
    }

    render();
    timer = setInterval(render, 1000);
  }
})();
