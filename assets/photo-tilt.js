/* photo-tilt — hover-эффект фотографий сайта Ивана Трояновского.
   Утверждено 2026-09-03, вариант B: масштаб + наклон плоскости к курсору.
   Прогиба поверхности нет — плоскость остаётся жёсткой (см. DESIGN.md §7.9).

   Разметка: атрибут data-tilt вешается на ВНЕШНЮЮ рамку кадра — ту, что не
   обрезается (на сайте это .mask, у .thumb-follow — сам .inner.ph).
   На .inner вешать нельзя: там живёт scale раскрытия (.reveal > .inner).

       <div class="mask reveal" data-tilt><div class="inner ph"><img ...></div></div>

   Подключение: initPhotoTilt() один раз после отрисовки; повторный вызов
   безопасен — уже подключённые узлы пропускаются.

   Не работает и не должен: сенсорный ввод (hover: none) и
   prefers-reduced-motion — узлы просто не подключаются. */

var PHOTO_TILT = {
  tilt: 8,          // максимальный завал плоскости, deg (по краям кадра)
  scale: 1.045,     // масштаб при наведении
  perspective: 1100, // px, чем меньше — тем резче перспектива
  ease: 0.12         // доля пути за кадр: догон курсора и возврат
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
        s.cp = 0; s.cx = 0; s.cy = 0;
        continue;
      }

      s.el.style.transform =
        'perspective(' + C.perspective + 'px)' +
        ' rotateY(' + (s.cx * C.tilt * s.cp).toFixed(3) + 'deg)' +
        ' rotateX(' + (-s.cy * C.tilt * s.cp).toFixed(3) + 'deg)' +
        ' scale(' + (1 + (C.scale - 1) * s.cp).toFixed(4) + ')';
      busy = true;
    }
    raf = busy ? requestAnimationFrame(frame) : 0;
  }

  return { attach: attach, config: C };
}
