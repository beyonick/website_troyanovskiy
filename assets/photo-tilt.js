/* photo-tilt — hover-эффект фотографий сайта Ивана Трояновского.
   Утверждено 2026-09-03, вариант B: масштаб + наклон плоскости к курсору.
   Прогиба поверхности нет — плоскость остаётся жёсткой (см. DESIGN.md §7.9).

   Обновлено 2026-09-06 (эксперимент canvas/practice/photo-hover-float.html,
   значения приняты по прямой просьбе):
     — масштаб 1.03 → 1.09, наклон 8° → 5°, перспектива 1100 → 700, догон 0.10 → 0.05;
     — добавлен подъём к зрителю translateZ (lift), по умолчанию 0;
     — добавлена МЯГКАЯ ТЕНЬ под кадром. Это сознательное расхождение с
       DESIGN.md §3, §6, §7.9, §10 — зафиксировано там же 2026-09-06.
       Тень чёрная (палитра --ink, без цвета), нарастает вместе с наведением
       по прогрессу cp и гаснет на уходе тем же догоном. box-shadow ставится
       покадрово здесь; keyframe rv в base.css расширен, чтобы clip-path
       раскрытия (§7.1) не срезал тень у элементов .mask.reveal.

   Разметка: атрибут data-tilt вешается на ВНЕШНЮЮ рамку кадра — ту, что не
   обрезается (на сайте это .mask, у .thumb-follow — сам .inner.ph).
   На .inner вешать нельзя: там живёт scale раскрытия (.reveal > .inner).

       <div class="mask reveal" data-tilt><div class="inner ph"><img ...></div></div>

   Подключение: initPhotoTilt() один раз после отрисовки; повторный вызов
   безопасен — уже подключённые узлы пропускаются.

   Не работает и не должен: сенсорный ввод (hover: none) и
   prefers-reduced-motion — узлы просто не подключаются. */

var PHOTO_TILT = {
  tilt: 5,           // максимальный завал плоскости, deg (по краям кадра)
  scale: 1.09,       // масштаб при наведении
  perspective: 700,  // px, чем меньше — тем резче перспектива
  ease: 0.05,        // доля пути за кадр: догон курсора и возврат
  lift: 0,           // px, подъём к зрителю translateZ (0 = выключено)

  /* Тень — вне DESIGN.md §3/§6, расхождение зафиксировано 2026-09-06. */
  shBlur: 140,       // px, размытие основного слоя
  shY: 66,           // px, смещение вниз при полном наведении
  shSpread: -24,     // px, стягивание (отрицательное держит тень уже кадра)
  shOpacity: 0.21,   // плотность основного слоя при полном наведении
  shContact: 1       // 1 — добавить тонкий контактный слой ближе к краю
};

function initPhotoTilt(cfg) {
  var C = {}, k;
  for (k in PHOTO_TILT) C[k] = PHOTO_TILT[k];
  if (cfg) for (k in cfg) C[k] = cfg[k];

  var mq = window.matchMedia;
  if (mq && mq('(prefers-reduced-motion: reduce)').matches) return null;
  if (mq && !mq('(hover: hover)').matches) return null;

  var nodes = [], raf = 0;

  var list = document.querySelectorAll('[data-tilt]');
  for (var i = 0; i < list.length; i++) attach(list[i]);

  function attach(el) {
    if (el.__tilt) return;
    var s = { el: el, tx: 0, ty: 0, tp: 0, cx: 0, cy: 0, cp: 0 };
    el.__tilt = s;
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      s.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      s.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      s.tp = 1;
      kick();
    });
    el.addEventListener('pointerleave', function () { s.tp = 0; kick(); });
    nodes.push(s);
  }

  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  /* Тень под кадром. p — прогресс наведения 0..1. Чёрная, палитра --ink. */
  function shadow(p) {
    if (p < 0.002 || (C.shOpacity <= 0 && !C.shContact)) return '';
    var a = C.shOpacity * p;
    var out = '0 ' + (C.shY * p).toFixed(1) + 'px ' + C.shBlur.toFixed(0) + 'px ' +
              C.shSpread.toFixed(0) + 'px rgba(10,10,10,' + a.toFixed(3) + ')';
    if (C.shContact) {
      out += ',0 ' + (C.shY * 0.28 * p).toFixed(1) + 'px ' +
             (C.shBlur * 0.32).toFixed(0) + 'px ' + (C.shSpread * 0.5).toFixed(0) +
             'px rgba(10,10,10,' + (a * 0.55).toFixed(3) + ')';
    }
    return out;
  }

  function frame() {
    var busy = false;
    for (var i = 0; i < nodes.length; i++) {
      var s = nodes[i];
      if (s.cp === 0 && s.tp === 0) continue;

      s.cx += (s.tx - s.cx) * C.ease;
      s.cy += (s.ty - s.cy) * C.ease;
      s.cp += (s.tp - s.cp) * C.ease;

      if (s.tp === 0 && s.cp < 0.002) {
        s.el.style.transform = '';
        s.el.style.boxShadow = '';
        s.cp = 0; s.cx = 0; s.cy = 0;
        continue;
      }

      s.el.style.transform =
        'perspective(' + C.perspective + 'px)' +
        ' translateZ(' + (C.lift * s.cp).toFixed(2) + 'px)' +
        ' rotateY(' + (s.cx * C.tilt * s.cp).toFixed(3) + 'deg)' +
        ' rotateX(' + (-s.cy * C.tilt * s.cp).toFixed(3) + 'deg)' +
        ' scale(' + (1 + (C.scale - 1) * s.cp).toFixed(4) + ')';
      s.el.style.boxShadow = shadow(s.cp);
      busy = true;
    }
    raf = busy ? requestAnimationFrame(frame) : 0;
  }

  return { attach: attach, config: C };
}
