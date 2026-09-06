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
    requestAnimationFrame(raf);
  }

  // Раскрытие текста (§ 7 п. 1-бис) — единственная анимация, оставшаяся на
  // этой странице; у самих кадров входа и hover-тилта больше нет (правка
  // 2026-09-05). Наблюдатель смотрит внутрь окна ленты — вход текста здесь
  // горизонтальный, но IntersectionObserver с root: .hpin ловит его так же,
  // как вертикальный.
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        e.target.classList.toggle('in', e.isIntersecting);
      });
    }, { root: pin, rootMargin: '0px 12% 0px 12%', threshold: 0.08 });
    track.querySelectorAll('.fu').forEach(function (el) { io.observe(el); });
  } else {
    track.querySelectorAll('.fu').forEach(function (el) { el.classList.add('in'); });
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
