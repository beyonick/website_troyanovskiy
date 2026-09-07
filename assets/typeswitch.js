/* typeswitch.js — пульт подбора дисплейной гарнитуры для альтернативной
   главной (index-alt.html). Меняет переменные из typeswitch.css, поэтому
   шрифт, кегль и интерлиньяж видно на самом лендинге, а не на образцах.

   Ничего не трогает, пока не тронули его: при старте страница = боевая
   главная (Cormorant Infant Light 300 из base.css). Выбор — в localStorage. */
(function(){
  'use strict';

  var FONTS = [
    {id:'cormorant-infant-300', name:'Cormorant Infant', style:'Light 300',  stack:'"Cormorant Infant",Georgia,serif',  weight:null, note:'текущая'},
    {id:'caveat',             name:'Caveat',             style:'Regular 400', stack:'"Caveat",cursive',                  weight:400},
    {id:'cormorant-infant',   name:'Cormorant Infant',   style:'Medium 500',  stack:'"Cormorant Infant",Georgia,serif',  weight:500},
    {id:'oranienbaum',        name:'Oranienbaum',        style:'Regular 400', stack:'"Oranienbaum",Georgia,serif',       weight:400},
    {id:'prata',              name:'Prata',              style:'Regular 400', stack:'"Prata",Georgia,serif',             weight:400},
    {id:'alice',              name:'Alice',              style:'Regular 400', stack:'"Alice",Georgia,serif',             weight:400},
    {id:'old-standard',       name:'Old Standard TT',    style:'Regular 400', stack:'"Old Standard TT",Georgia,serif',   weight:400}
  ];

  /* Роли = дисплейные места главной. base — верхняя граница clamp() из
     токенов, от неё пляшут слайдеры. null в size означает «авто»:
     переменная не задана, работает исходный clamp(). */
  var ROLES = [
    {id:'name', label:'Имя',     css:'.namemark', base:200, lh:0.92, ls:-0.02,  max:280},
    {id:'h1',   label:'H1',      css:'.h1',       base:144, lh:0.95, ls:-0.02,  max:280},
    {id:'h2',   label:'H2',      css:'.h2',       base:144, lh:0.95, ls:-0.02,  max:280},
    {id:'h3',   label:'H3',      css:'.h3',       base:144, lh:0.95, ls:-0.02,  max:280},
    {id:'q',    label:'Цитата',  css:'.q',        base:40,  lh:1.25, ls:0,      max:120},
    {id:'num',  label:'Счётчик', css:'.num',      base:260, lh:0.86, ls:-0.03,  max:320},
    {id:'row',  label:'Индекс',  css:'.bname',    base:72,  lh:1,    ls:-0.015, max:160},
    {id:'foot', label:'Подвал',  css:'.footname', base:320, lh:0.88, ls:-0.02,  max:400}
  ];

  var KEY = 'typeswitch-v1';
  var root = document.documentElement;
  var active = 'name';

  function blank(){
    var roles = {};
    ROLES.forEach(function(r){ roles[r.id] = {size:null, lh:null, ls:null}; });
    return {font:'cormorant-infant-300', open:false, roles:roles};
  }

  var state = blank();
  try{
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if(saved && saved.roles){
      state.font = saved.font || state.font;
      state.open = !!saved.open;
      ROLES.forEach(function(r){ if(saved.roles[r.id]) state.roles[r.id] = saved.roles[r.id]; });
    }
  }catch(e){}

  /* ——— Разметка пульта ——— */
  var tw = document.createElement('div');
  tw.className = 'tw';
  tw.innerHTML =
    '<button class="tw-toggle" type="button" aria-expanded="false">Шрифты</button>' +
    '<div class="tw-body">' +
      '<div class="tw-sec"><p class="tw-t">Дисплейная гарнитура</p><div class="tw-fonts"></div></div>' +
      '<div class="tw-sec"><p class="tw-t">Роль</p><div class="tw-tabs"></div>' +
        '<div class="tw-ctl"><div class="tw-head"><span class="k">Кегль</span><span class="v" data-v="size">—</span></div>' +
          '<input type="range" data-r="size" min="12" max="280" step="1" aria-label="Кегль"></div>' +
        '<div class="tw-ctl"><div class="tw-head"><span class="k">Интерлиньяж</span><span class="v" data-v="lh">—</span></div>' +
          '<input type="range" data-r="lh" min="0.7" max="2" step="0.01" aria-label="Интерлиньяж"></div>' +
        '<div class="tw-ctl"><div class="tw-head"><span class="k">Трекинг</span><span class="v" data-v="ls">—</span></div>' +
          '<input type="range" data-r="ls" min="-0.06" max="0.2" step="0.001" aria-label="Трекинг"></div>' +
        '<div class="tw-btns"><button class="tw-btn" data-a="reset-role" type="button">Роль — авто</button>' +
          '<button class="tw-btn" data-a="reset-all" type="button">Сбросить всё</button></div>' +
        '<p class="tw-note">«Авто» — исходный clamp() из токенов: кегль тянется за шириной экрана. Сдвинули слайдер — роль встала на фикс в px.</p>' +
      '</div>' +
      '<div class="tw-sec"><p class="tw-t">CSS набора</p>' +
        '<textarea class="tw-css" readonly spellcheck="false"></textarea>' +
        '<div class="tw-btns" style="margin-top:8px"><button class="tw-btn" data-a="copy" type="button">Скопировать</button></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(tw);

  var toggle  = tw.querySelector('.tw-toggle');
  var fontbox = tw.querySelector('.tw-fonts');
  var tabbox  = tw.querySelector('.tw-tabs');
  var cssout  = tw.querySelector('.tw-css');

  FONTS.forEach(function(f){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tw-font'; b.dataset.id = f.id;
    b.title = f.name + ' · ' + f.style + (f.note ? ' · ' + f.note : '');
    /* Стиль ставим свойством: в стеках двойные кавычки, в атрибут нельзя. */
    b.innerHTML = '<span class="s">Трояновский</span><span class="m">' + f.name.split(' ')[0] + '</span>';
    var s = b.querySelector('.s');
    s.style.fontFamily = f.stack;
    if(f.weight) s.style.fontWeight = f.weight;
    b.addEventListener('click', function(){ state.font = f.id; apply(); });
    fontbox.appendChild(b);
  });

  ROLES.forEach(function(r){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tw-tab'; b.dataset.id = r.id; b.textContent = r.label;
    b.addEventListener('click', function(){ active = r.id; apply(); });
    tabbox.appendChild(b);
  });

  toggle.addEventListener('click', function(){ state.open = !state.open; apply(); });

  tw.addEventListener('input', function(e){
    var k = e.target.dataset.r;
    if(!k) return;
    state.roles[active][k] = +e.target.value;
    apply();
  });

  tw.addEventListener('click', function(e){
    var a = e.target.dataset.a;
    if(!a) return;
    if(a === 'reset-role'){ state.roles[active] = {size:null, lh:null, ls:null}; apply(); }
    if(a === 'reset-all'){ var open = state.open; state = blank(); state.open = open; apply(); }
    if(a === 'copy'){
      var btn = e.target;
      var done = function(t){ btn.textContent = t; setTimeout(function(){ btn.textContent = 'Скопировать'; }, 1400); };
      if(navigator.clipboard){
        navigator.clipboard.writeText(cssout.value).then(function(){ done('Скопировано'); },
          function(){ cssout.select(); done('Выделено'); });
      } else { cssout.select(); done('Выделено'); }
    }
  });

  /* Шрифты — по «T», когда фокус не в поле ввода. */
  document.addEventListener('keydown', function(e){
    if(e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target.tagName;
    if(t === 'INPUT' || t === 'TEXTAREA' || e.target.isContentEditable) return;
    if(e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е'){ state.open = !state.open; apply(); }
  });

  function apply(){
    var f = FONTS.filter(function(x){ return x.id === state.font; })[0] || FONTS[0];

    if(f.id === 'cormorant-infant-300'){
      /* Текущая система: снимаем переменные, чтобы работали исходные
         значения из base.css — включая разный вес по ролям. */
      root.style.removeProperty('--tw-font');
      root.style.removeProperty('--tw-weight');
    } else {
      root.style.setProperty('--tw-font', f.stack);
      root.style.setProperty('--tw-weight', f.weight);
    }

    ROLES.forEach(function(r){
      var v = state.roles[r.id];
      setVar('--tw-' + r.id + '-size', v.size === null ? null : v.size + 'px');
      setVar('--tw-' + r.id + '-lh',   v.lh   === null ? null : v.lh);
      setVar('--tw-' + r.id + '-ls',   v.ls   === null ? null : v.ls + 'em');
    });

    Array.prototype.forEach.call(tw.querySelectorAll('.tw-font'), function(b){
      b.setAttribute('aria-pressed', b.dataset.id === state.font);
    });
    Array.prototype.forEach.call(tw.querySelectorAll('.tw-tab'), function(b){
      b.setAttribute('aria-pressed', b.dataset.id === active);
    });

    var r = ROLES.filter(function(x){ return x.id === active; })[0];
    var v = state.roles[active];
    var rs = tw.querySelector('[data-r="size"]');
    rs.max = r.max;
    rs.value = v.size === null ? r.base : v.size;
    tw.querySelector('[data-r="lh"]').value = v.lh === null ? r.lh : v.lh;
    tw.querySelector('[data-r="ls"]').value = v.ls === null ? r.ls : v.ls;
    tw.querySelector('[data-v="size"]').textContent = v.size === null ? 'авто' : v.size + ' px';
    tw.querySelector('[data-v="lh"]').textContent   = v.lh   === null ? 'авто' : v.lh.toFixed(2);
    tw.querySelector('[data-v="ls"]').textContent   = v.ls   === null ? 'авто' : (v.ls > 0 ? '+' : '') + v.ls.toFixed(3) + ' em';

    tw.classList.toggle('open', state.open);
    toggle.setAttribute('aria-expanded', state.open);
    toggle.textContent = state.open ? 'Свернуть' : 'Шрифты';

    cssout.value = buildCSS(f);
    try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){}
  }

  function setVar(name, value){
    if(value === null) root.style.removeProperty(name);
    else root.style.setProperty(name, value);
  }

  function buildCSS(f){
    var out = [];
    if(f.id !== 'cormorant-infant-300'){
      out.push('/* ' + f.name + ' · ' + f.style + ' */');
      out.push('@import url("https://fonts.googleapis.com/css2?family=' + f.name.replace(/ /g, '+') +
               (f.weight !== 400 ? ':wght@' + f.weight : '') + '&display=swap");');
      out.push('');
    } else {
      out.push('/* Cormorant Infant Light 300 — текущая система, без изменений */');
      out.push('');
    }
    ROLES.forEach(function(r){
      var v = state.roles[r.id];
      var d = [];
      if(f.id !== 'cormorant-infant-300'){
        d.push('font-family:' + f.stack);
        d.push('font-weight:' + f.weight);
      }
      if(v.size !== null) d.push('font-size:' + v.size + 'px');
      if(v.lh   !== null) d.push('line-height:' + v.lh);
      if(v.ls   !== null) d.push('letter-spacing:' + v.ls + 'em');
      if(d.length) out.push(r.css + '{' + d.join(';') + '}');
    });
    if(out[out.length - 1] === '') out.push('/* всё на авто — правок нет */');
    return out.join('\n');
  }

  apply();
})();
