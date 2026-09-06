/* story.js — горизонтальная лента истории.

   Реальная позиция скролла не подменяется (DESIGN.md § 7.7): страница высокая,
   окно ленты приколото через position:sticky, а лента едет по X от того,
   сколько уже проскроллено. Поэтому полоса браузера, Home/End, якоря и
   IntersectionObserver работают штатно, а не «залипают».

   Скролл инерционный (правка 2026-09-05, по референсу
   mersi-architecture.com/projets/naya): лента не идёт вплотную за курсором/
   колесом, а докатывается следом с задержкой — реальная цель считается от
   позиции страницы на каждый скролл, а на экран идёт сглаженное текущее
   значение, которое каждый кадр подтягивается к цели. Работает через
   постоянный requestAnimationFrame, а не только по событию scroll — иначе
   лента останавливалась бы вместе с колесом, а не докатывалась.

   На тач-вводе перехвата и сглаживания нет вообще: там нативная
   горизонтальная прокрутка пальцем со своей инерцией (см. story.css, .hpin). */
(function () {
  var scroller = document.getElementById('hscroll');
  var pin = document.getElementById('hpin');
  var track = document.getElementById('htrack');
  if (!scroller || !pin || !track) return;

  var touch = window.matchMedia('(hover: none)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var max = 0;

  // Доля пути к цели за кадр. Меньше — дольше докатывается, «в 3 раза
  // плавнее» плоского 1:1. При reduce сглаживание не нужно — лента идёт
  // вплотную, без инерции сверху.
  var EASE = reduce ? 1 : 0.045;

  var target = 0;
  var current = 0;

  function measure() {
    max = Math.max(0, track.scrollWidth - pin.clientWidth);
    if (touch) {
      scroller.style.height = '';
      track.style.transform = '';
      return;
    }
    // Высота обёртки = экран + длина ленты: сколько пикселей вправо,
    // столько же пикселей вниз.
    scroller.style.height = (pin.clientHeight + max) + 'px';
    setTarget();
    measureSpots();
    sweepReveals(current);
  }

  var bar = document.querySelector('.hbar i');
  var count = document.getElementById('hcount');
  var frames = track.querySelectorAll('.fr');
  var total = frames.length;

  function setTarget() {
    var top = scroller.getBoundingClientRect().top;
    target = Math.min(Math.max(-top, 0), max);
  }

  function progress(p) {
    if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
    if (count) {
      var n = Math.min(total, Math.max(1, Math.round(p * (total - 1)) + 1));
      count.textContent = pad(n) + ' / ' + pad(total);
    }
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // Один общий цикл рендера: докатывает current к target и красит кадр.
  // Останавливать его нет смысла — стоимость холостого тика ничтожна,
  // а логика без пауз/рестартов проще и не роняет докатывание на стыке.
  function raf() {
    current += (target - current) * EASE;
    if (Math.abs(target - current) < 0.4) current = target;
    if (!touch) track.style.transform = 'translate3d(' + (-current) + 'px,0,0)';
    progress(max ? current / max : 0);
    sweepReveals(current);
    requestAnimationFrame(raf);
  }

  // Раскрытие текста (§ 7 п. 1-бис, туда-обратно, окно 12% с обеих сторон —
  // не менялось). Наблюдатель смотрит внутрь окна ленты — вход здесь
  // горизонтальный, но IntersectionObserver с root: .hpin ловит его так же,
  // как вертикальный.
  var textIO = null;
  if ('IntersectionObserver' in window) {
    textIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle('in', e.isIntersecting); });
    }, { root: pin, rootMargin: '0px 12% 0px 12%', threshold: 0.08 });
    track.querySelectorAll('.fu').forEach(function (el) { textIO.observe(el); });
  } else {
    track.querySelectorAll('.fu').forEach(function (el) { el.classList.add('in'); });
  }

  // Hover-тилт с тенью (§ 7.9) — тот же photo-tilt.js, что на главной, без
  // переопределений; сам решает не подключаться на тач-вводе и при reduce
  // (тогда вернёт null). Узлы подключаются не сразу: кадр берут «в руки»
  // только после того, как раскрытие доиграно — см. ready().
  var tilt = (typeof initPhotoTilt === 'function') ? initPhotoTilt() : null;
  // Именно массив, а не NodeList: ниже нужны map и запись masks[i] = null.
  var masks = Array.prototype.slice.call(track.querySelectorAll('.fr .reveal'));

  function ready(mask) {
    if (mask.classList.contains('ready')) return;
    mask.classList.add('ready');
    // data-tilt — на внешнюю, не обрезаемую рамку (.mask), как требует § 7.9.
    mask.setAttribute('data-tilt', '');
    if (tilt) tilt.attach(mask);
  }

  // Раскрытие кадров — то же правило, что на главной: кадр открывается,
  // когда дошёл до 12% от ведущего края (там это низ экрана, здесь — правый
  // край окна ленты, потому что кадры едут справа налево). Один раз, назад
  // не закрывается.
  //
  // Считаем геометрию сами, без IntersectionObserver — и это не прихоть.
  // У нераскрытого кадра стоит clip-path: inset(100% 0 0 0) из § 7.1, то
  // есть видимая площадь ровно ноль. Наблюдатель такой элемент НИКОГДА не
  // считает пересекающим: кадр не раскрывается → площадь остаётся нулевой →
  // не раскрывается. Замкнутый круг. На главной из него выбирается ровно
  // так же — обходом геометрии (sweep в bindReveals, там прямо написано:
  // «кадр, навсегда зажатый в clip-path: inset(100%), недопустим»),
  // наблюдатель там лишь помогает. Здесь обход и есть единственный механизм.
  //
  // Позиции кадров внутри ленты берём один раз (offsetLeft не зависит от
  // transform, которым лента едет), дальше сравниваем арифметикой — без
  // чтения layout на каждом кадре анимации.
  var spots = [];
  function measureSpots() {
    // Уже раскрытые слоты обнулены — им позиция не нужна больше никогда.
    spots = masks.map(function (m) { return m ? m.offsetLeft : Infinity; });
  }

  function sweepReveals(x) {
    // Пока позиции не сняты, ничего не открываем: без этой проверки
    // сравнение с undefined дало бы NaN и раскрыло разом всю ленту.
    if (!masks.length || spots.length !== masks.length) return;
    var line = pin.clientWidth * 0.88;
    for (var i = 0; i < masks.length; i++) {
      var m = masks[i];
      if (!m || spots[i] - x >= line) continue;
      m.classList.add('in');
      masks[i] = null;
    }
  }

  // Тилт — ровно в момент, когда раскрытие доиграно (§ 7.9 «в руки» берут
  // уже показанный кадр). Из двух анимаций § 7.1 последней заканчивается
  // scale внутренней обёртки (sc, 1200ms) — её и ждём; событие всплывает
  // с .inner на .mask, поэтому слушать достаточно здесь.
  masks.forEach(function (m) {
    m.addEventListener('animationend', function (e) {
      if (e.animationName === 'sc') ready(m);
    });
  });

  // При reduce анимация не проигрывается вовсе (base.css её гасит), поэтому
  // animationend не придёт — открываем и отдаём в руки сразу.
  if (reduce) {
    masks.forEach(function (m) { if (m) { m.classList.add('in'); ready(m); } });
    masks = [];
  }

  // На тач-вводе прогресс считается от нативной горизонтальной прокрутки.
  // На десктопе окно ленты не прокручивается само — но браузер сдвигает его,
  // когда табом попадаешь на ссылку за краем экрана. Этот сдвиг переводится
  // в прокрутку страницы: фокус доезжает, лента и позиция скролла не
  // расходятся (§ 11: узнать что-то только ховером/мышью нельзя).
  pin.addEventListener('scroll', function () {
    if (touch) {
      var m = pin.scrollWidth - pin.clientWidth;
      progress(m ? pin.scrollLeft / m : 0);
      // На тач-вводе лента едет нативной прокруткой, а не transform —
      // сдвиг для проверки раскрытия берём отсюда.
      sweepReveals(pin.scrollLeft);
      return;
    }
    if (pin.scrollLeft) {
      var d = pin.scrollLeft;
      pin.scrollLeft = 0;
      window.scrollBy(0, d);
    }
  }, { passive: true });

  // Класс js гасит нативную прокрутку окна ленты — но только там, где лентой
  // управляет скролл страницы. На тач-вводе прокрутка пальцем остаётся.
  document.documentElement.classList.add(touch ? 'touch' : 'js');
  window.addEventListener('scroll', setTarget, { passive: true });
  window.addEventListener('resize', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener('load', measure);
  measure();
  if (!touch) requestAnimationFrame(raf);
})();
