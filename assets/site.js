/* site.js — поведение главной. Движение — по DESIGN.md § 7.
   Ховер кадров живёт отдельно, в photo-tilt.js (§ 7.9). */

(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cfg = window.SITE_CONFIG || {};

  /* — Герой: источник видео и удержание воспроизведения — */

  var heroVideo = document.querySelector('.herovideo video');

  function setHeroSource() {
    if (!heroVideo) return;
    var chain = [cfg.heroVideo, cfg.heroVideoMp4, cfg.heroVideoFallback].filter(Boolean);
    var i = 0;
    function next() {
      if (i >= chain.length) return;
      heroVideo.src = chain[i++];
      heroVideo.load();
      var p = heroVideo.play();
      if (p && p.catch) p.catch(function () {});
    }
    // Сеть или кодек не сработали — уходим на следующий адрес, а не в чёрный экран.
    heroVideo.addEventListener('error', next);
    next();
  }

  function keepHeroAlive() {
    if (!heroVideo) return;
    // Браузер ставит autoplay-видео на паузу за экраном и сам не возобновляет.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var p = e.target.play();
          if (p && p.catch) p.catch(function () {});
        });
      }, { threshold: 0.1 }).observe(heroVideo);
    }
    heroVideo.addEventListener('ended', function () {
      heroVideo.currentTime = 0;
      var p = heroVideo.play();
      if (p && p.catch) p.catch(function () {});
    });
  }

  function bindHeroExpand() {
    var box = document.querySelector('.herovideo');
    if (!box || !heroVideo) return;
    box.addEventListener('click', function () {
      if (heroVideo.requestFullscreen) heroVideo.requestFullscreen();
      else if (heroVideo.webkitRequestFullscreen) heroVideo.webkitRequestFullscreen();
      else if (heroVideo.webkitEnterFullscreen) heroVideo.webkitEnterFullscreen();
    });
  }

  /* — Навигация: difference над героем, обычный чёрный дальше (§ 8) — */

  function bindNav() {
    var bar = document.querySelector('.navbar');
    var hero = document.querySelector('.hero');
    if (!bar) return;

    function sync() {
      var edge = hero ? hero.offsetHeight - 80 : 600;
      bar.classList.toggle('solid', window.scrollY > edge);
    }
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();

    var burger = bar.querySelector('.burger');
    if (!burger) return;
    burger.addEventListener('click', function () {
      var open = bar.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    Array.prototype.forEach.call(bar.querySelectorAll('.navmenu a'), function (a) {
      a.addEventListener('click', function () {
        bar.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* — Раскрытие кадров и счётчики по появлению в кадре (§ 7.1, § 7.3) — */

  function bindReveals() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal, .rise'));
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }

    var left = items.length;
    function reveal(el) {
      if (el.classList.contains('in')) return;
      el.classList.add('in');
      left--;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        reveal(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });

    // Страховка от первого срабатывания IntersectionObserver: он всегда
    // вызывается один раз сразу при подписке, для всех целей и без единого
    // пересечения — это не значит, что дальше он будет ловить каждый кадр
    // исправно. Поэтому страховка не гасится по первому колбэку, а сама
    // проверяет геометрию раз в 600ms, пока не откроются все кадры. Кадр,
    // навсегда зажатый в clip-path: inset(100%), недопустим.
    function sweep() {
      if (!left) return;
      items.forEach(function (el) {
        if (el.classList.contains('in')) return;
        var r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight) reveal(el);
      });
      if (left) setTimeout(sweep, 600);
    }
    setTimeout(sweep, 600);
  }

  /* — Кадр за курсором в списках (§ 7.4) — */

  function bindFollow(scopeSel, rowSel) {
    var scope = document.querySelector(scopeSel);
    if (!scope) return;
    var rows = scope.querySelectorAll(rowSel);
    var thumbs = scope.querySelectorAll('.thumb-follow');
    if (!rows.length || !thumbs.length) return;
    if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) return;

    var active = -1, x = 0, y = 0, raf = 0;

    function place() {
      raf = 0;
      var w = Math.min(window.innerWidth * 0.46, 680);
      var h = Math.round(w * 2 / 3);
      for (var i = 0; i < thumbs.length; i++) {
        var t = thumbs[i];
        t.style.width = w + 'px';
        t.style.height = h + 'px';
        t.style.left = Math.round(x - w / 2) + 'px';
        t.style.top = Math.round(y - h / 2) + 'px';
        t.style.opacity = i === active ? '1' : '0';
      }
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(place); }

    scope.addEventListener('mousemove', function (e) { x = e.clientX; y = e.clientY; schedule(); });
    scope.addEventListener('mouseleave', function () { active = -1; schedule(); });
    Array.prototype.forEach.call(rows, function (row, i) {
      row.addEventListener('mouseenter', function () { active = i; schedule(); });
    });
  }

  /* — Мягкая инерция прокрутки (§ 7.7). Реальная позиция не подменяется:
       перехватывается только колесо, window.scrollY остаётся настоящим. — */

  function bindSmoothScroll() {
    if (reduce) return;
    var target = window.scrollY, current = window.scrollY;
    var running = false, alive = false, off = false;

    function maxScroll() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }
    function tick() {
      alive = true;
      var diff = target - current;
      if (Math.abs(diff) < 0.4) {
        current = target;
        window.scrollTo(0, current);
        running = false;
        return;
      }
      current += diff * 0.055;
      window.scrollTo(0, current);
      requestAnimationFrame(tick);
    }
    function onWheel(e) {
      if (e.ctrlKey || off) return;
      var dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= window.innerHeight;
      e.preventDefault();
      if (!running) { target = window.scrollY; current = window.scrollY; }
      target = Math.max(0, Math.min(target + dy, maxScroll()));
      if (!running) {
        running = true;
        alive = false;
        requestAnimationFrame(tick);
        // Кадры не пришли (скрытая вкладка, троттлинг) — отдаём прокрутку
        // браузеру, страница не должна залипать никогда.
        setTimeout(function () {
          if (!alive) {
            off = true;
            running = false;
            window.removeEventListener('wheel', onWheel);
          }
        }, 300);
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', function () {
      if (!running) { target = window.scrollY; current = window.scrollY; }
    }, { passive: true });
  }

  /* — Футер обнажается: высота подложки равна высоте футера (§ 7.5) — */

  function bindFooter() {
    var shell = document.querySelector('.footshell');
    var foot = document.querySelector('.foot');
    if (!shell || !foot) return;
    function sync() { shell.style.height = foot.offsetHeight + 'px'; }
    window.addEventListener('resize', sync);
    if ('ResizeObserver' in window) new ResizeObserver(sync).observe(foot);
    sync();
  }

  function start() {
    setHeroSource();
    keepHeroAlive();
    bindHeroExpand();
    bindNav();
    bindReveals();
    bindFollow('.bigindex', '.brow');
    bindFollow('.voicewrap', '.voice');
    bindSmoothScroll();
    bindFooter();
    if (typeof initPhotoTilt === 'function') initPhotoTilt();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
