/* =========================================================
   MAIN — navigace, animace, katalog, detail s konfigurátorem,
   poptávkový košík, formuláře
   ========================================================= */
(function () {
  'use strict';

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const czk = n => new Intl.NumberFormat('cs-CZ').format(n) + ' Kč';
  const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const catName     = id => (CATEGORIES.find(c => c.id === id) || {}).name || '';
  const machineName = id => (MACHINES.find(m => m.id === id) || {}).name || id;
  const hasPrice    = n => typeof n === 'number' && n > 0;
  const czkOr       = n => hasPrice(n) ? czk(n) : 'na dotaz';
  const priceLabel  = p => hasPrice(p.price) ? (p.priceFrom ? 'od ' : '') + czk(p.price) : 'Cena na dotaz';
  const plural = (n, one, few, many) => n === 1 ? one : (n > 1 && n < 5 ? few : many);
  // verze obrázků — zvýšit po hromadné výměně fotek, aby prohlížeče nebraly staré z cache
  const IMG_V = '?v=2';
  const catImg = c => c.img ? 'assets/img/nahledy/' + c.img + IMG_V : 'assets/img/kategorie-pripravujeme.svg';

  const ICON = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    cart:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>',
    plus:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    doc:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>'
  };

  /* ---------- 0. Poptávkový košík ----------
     Drží se v localStorage jen v prohlížeči návštěvníka. Když úložiště nejde
     (anonymní okno, zakázané cookies), košík funguje do zavření stránky. */
  const Cart = (function () {
    const KEY = 'adaptery-poptavka-v1';
    let memory = [];
    function read() {
      try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; }
      catch (e) { return memory.slice(); }
    }
    function write(items) {
      memory = items.slice();
      try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* zůstane v paměti */ }
      badge();
    }
    function add(item) {
      const items = read();
      const same = items.find(i => i.key === item.key);
      if (same) same.qty += item.qty; else items.push(item);
      write(items);
      return items;
    }
    const count = () => read().reduce((s, i) => s + i.qty, 0);
    function badge() {
      const n = count();
      $$('[data-cart-count]').forEach(el => { el.textContent = n; el.hidden = n === 0; });
    }
    return { read, write, add, count, badge };
  })();

  /* ---------- 1. Hlavička a mobilní menu ---------- */
  function initHeader() {
    const header = $('.header'), burger = $('.burger'), mnav = $('.mobile-nav');
    if (header) {
      const hero = $('.hero'), logo = $('.logo__img', header);
      /* na úvodu je lišta tmavá jen nad hero sekcí, pod ní zesvětlá */
      const onScroll = () => {
        header.classList.toggle('is-stuck', window.scrollY > 12);
        if (hero) {
          const dark = hero.getBoundingClientRect().bottom > header.offsetHeight;
          header.classList.toggle('header--dark', dark);
          if (logo) logo.src = logo.src.replace(/logo-full(-white)?\.svg/, dark ? 'logo-full-white.svg' : 'logo-full.svg');
        }
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    if (burger && mnav) {
      burger.addEventListener('click', () => {
        const open = mnav.classList.toggle('is-open');
        burger.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.classList.toggle('no-scroll', open);
      });
      $$('a', mnav).forEach(a => a.addEventListener('click', () => {
        mnav.classList.remove('is-open');
        burger.classList.remove('is-open');
        document.body.classList.remove('no-scroll');
      }));
    }
    let page = location.pathname.split('/').pop() || 'index.html';
    // detail produktu patří pod Katalog, ať menu neukazuje na nic
    if (page === 'produkt.html') page = 'katalog.html';
    $$('.nav__link, .mobile-nav__link').forEach(a => {
      const href = a.getAttribute('href') || '';
      const [path, hash] = href.split('#');
      // odkaz na kotvu uvnitř stránky (o-nas.html#vyroba) neoznačujeme jako
      // aktivní stránku — jinak by svítily dvě položky menu najednou
      if (hash) return;
      if (path.split('?')[0] === page) a.classList.add('is-active');
    });
    Cart.badge();
  }

  /* ---------- 2. Odhalování při scrollu ---------- */
  function initReveal() {
    const items = $$('[data-reveal]:not(.is-visible)');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) { items.forEach(i => i.classList.add('is-visible')); return; }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    items.forEach(i => io.observe(i));
  }

  /* ---------- 3. Tlačítko nahoru ---------- */
  function initToTop() {
    const btn = $('.to-top');
    if (!btn) return;
    const onScroll = () => btn.classList.toggle('is-visible', window.scrollY > 620);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ---------- 4. FAQ ---------- */
  function initFaq() {
    $$('.faq__item').forEach(item => {
      const q = $('.faq__q', item), a = $('.faq__a', item);
      if (!q || !a) return;
      q.addEventListener('click', () => {
        const open = item.classList.toggle('is-open');
        q.setAttribute('aria-expanded', open ? 'true' : 'false');
        a.style.maxHeight = open ? a.scrollHeight + 'px' : 0;
      });
    });
  }

  /* ---------- 5. Karta produktu ---------- */
  function flags(p) {
    return (p.sale ? '<span class="chip chip--sale">Akce</span>' : '') +
      (p.stock ? '<span class="chip chip--stock">Skladem</span>'
               : `<span class="chip chip--order">${esc(p.avail)}</span>`);
  }

  // „Šířky 1,5–2,4 m“ — na kartě je hned vidět, že produkt má víc velikostí
  function variantSummary(p) {
    if (!p.variants || p.variants.length < 2) return '';
    const first = p.variants[0].label, last = p.variants[p.variants.length - 1].label;
    const n = p.variants.length;
    if (p.variantLabel === 'Šířka') return `${n} ${plural(n, 'šířka', 'šířky', 'šířek')} ${first.replace(/\s*(mm|cm|m)$/, '')}–${last}`;
    return `${p.variants.length} ${plural(p.variants.length, 'varianta', 'varianty', 'variant')}`;
  }

  function productCard(p) {
    const vs = variantSummary(p);
    const specs = (vs ? `<span class="is-strong">${esc(vs)}</span>` : '') +
      Object.entries(p.specs).filter(([k]) => !(vs && k === 'Šířka')).slice(0, vs ? 1 : 2)
        .map(([k, v]) => `<span>${esc(k)}: ${esc(v)}</span>`).join('');
    return `
      <article class="product" data-reveal>
        <a class="product__link" href="produkt.html?id=${encodeURIComponent(p.id)}" aria-label="${esc(p.name)}"></a>
        <div class="product__media">
          <div class="product__flags">${flags(p)}</div>
          <img src="assets/img/nahledy/${p.imgs[0] ? p.imgs[0] + IMG_V : '_bez-foto.svg'}" alt="${esc(p.name)}" loading="lazy" width="500" height="375">
        </div>
        <div class="product__body">
          <p class="product__cat">${esc(catName(p.cat))}</p>
          <h3 class="product__name">${esc(p.name)}</h3>
          ${mountLabel(p) ? `<p class="product__mount">Uchycení: <b>${esc(mountLabel(p))}</b></p>` : ''}
          <div class="product__specs">${specs}</div>
          <div class="product__foot">
            <div class="product__price"><b>${priceLabel(p)}</b><small>${hasPrice(p.price) ? 'bez DPH' : 'pošleme v nabídce'}</small></div>
            <a class="btn btn--sm btn--ghost product__btn" href="produkt.html?id=${encodeURIComponent(p.id)}" tabindex="-1">Detail ${ICON.arrow}</a>
          </div>
        </div>
      </article>`;
  }

  /* ---------- 6. Homepage ---------- */
  function initHome() {
    const catWrap = $('[data-categories]');
    if (catWrap) {
      catWrap.innerHTML = CATEGORIES.map((c, i) => {
        const n = PRODUCTS.filter(p => p.cat === c.id).length;
        return `
        <a class="cat-card${n ? '' : ' cat-card--soon'}" href="katalog.html?kategorie=${c.id}" data-reveal style="--d:${i * 45}ms">
          <div class="cat-card__img"><img src="${catImg(c)}" alt="${esc(c.name)}" loading="lazy" width="500" height="375"></div>
          <div class="cat-card__body">
            <h3>${esc(c.name)}</h3>
            <p>${esc(c.desc)}</p>
            <span class="cat-card__count">${n ? `${n} ${plural(n, 'produkt', 'produkty', 'produktů')}` : 'Připravujeme'}</span>
            <span class="cat-card__more">${n ? 'Zobrazit nabídku' : 'Poptat'} ${ICON.arrow}</span>
          </div>
        </a>`;
      }).join('');
    }

    const topWrap = $('[data-top-products]');
    if (topWrap) {
      // jeden nejdražší skladový kus z každé kategorie, zbytek doplní akce a skladovky
      const pick = [];
      CATEGORIES.forEach(c => {
        const best = PRODUCTS.filter(p => p.cat === c.id && p.stock).sort((a, b) => (b.price || 0) - (a.price || 0))[0];
        if (best) pick.push(best);
      });
      PRODUCTS.filter(p => p.sale && !pick.includes(p)).forEach(p => pick.push(p));
      PRODUCTS.filter(p => p.stock && !pick.includes(p)).forEach(p => pick.push(p));
      topWrap.innerHTML = pick.slice(0, 8).map(productCard).join('');
    }

    // uchycení už se nefiltruje — pás jen ukazuje, na co adaptéry dodáme
    const mountWrap = $('[data-mounts]');
    if (mountWrap) {
      mountWrap.innerHTML = MOUNTS.map(m => `
        <span class="mount-pill"><b>${esc(m.name)}</b><small>${esc(m.note)}</small></span>`).join('');
    }
    $$('[data-count-cats]').forEach(el => el.textContent = CATEGORIES.length);
    $$('[data-count-products]').forEach(el => el.textContent = PRODUCTS.length);
    $$('[data-count-stock]').forEach(el => el.textContent = PRODUCTS.filter(p => p.stock).length);
    initReveal();
  }

  /* ---------- 7. Katalog ---------- */
  function initCatalog() {
    const grid = $('[data-catalog-grid]');
    if (!grid) return;

    const params = new URLSearchParams(location.search);
    // staré odkazy používaly stroj=smykovy
    const machineIds = (params.get('stroj') || '').split(',').filter(Boolean).map(m => m === 'smykovy' ? 'mininakladac' : m);
    const state = {
      cats:     new Set((params.get('kategorie') || '').split(',').filter(Boolean)),
      machines: new Set(machineIds),
      stock:  params.get('skladem') === '1',
      q:      params.get('q') || '',
      sort:   params.get('razeni') || 'default'
    };

    const box = {
      cats:     $('[data-filter-cats]'),
      machines: $('[data-filter-machines]')
    };
    const checks = (list, sel, key) => list.map(x => `
      <label class="check"><input type="checkbox" value="${x.id}" ${state[key].has(x.id) ? 'checked' : ''}>
        ${esc(x.name)}<span class="count">${PRODUCTS.filter(sel(x)).length}</span></label>`).join('');

    box.cats.innerHTML     = checks(CATEGORIES, c => p => p.cat === c.id, 'cats');
    box.machines.innerHTML = checks(MACHINES,   m => p => p.machines.includes(m.id), 'machines');

    const searchInput = $('[data-filter-search]');
    const stockInput  = $('[data-filter-stock]');
    const sortSelect  = $('[data-sort]');
    searchInput.value = state.q;
    stockInput.checked = state.stock;
    sortSelect.value = state.sort;

    function syncUrl() {
      const p = new URLSearchParams();
      if (state.cats.size)     p.set('kategorie', [...state.cats].join(','));
      if (state.machines.size) p.set('stroj',     [...state.machines].join(','));
      if (state.stock)         p.set('skladem', '1');
      if (state.q)             p.set('q', state.q);
      if (state.sort !== 'default') p.set('razeni', state.sort);
      const qs = p.toString();
      history.replaceState(null, '', qs ? '?' + qs : location.pathname);
    }

    // výchozí pořadí = pořadí v data.js (kategorie a v nich od největšího po nejmenší)
    const order = new Map(PRODUCTS.map((p, i) => [p.id, i]));

    // katalog se vykresluje po stránkách, další karty přidá tlačítko
    const PAGE = 48;
    let limit = PAGE;
    function render(keep) {
      if (keep !== true) limit = PAGE;
      const list = PRODUCTS.filter(p => {
        if (state.cats.size && !state.cats.has(p.cat)) return false;
        if (state.machines.size && !p.machines.some(m => state.machines.has(m))) return false;
        if (state.stock && !p.stock) return false;
        if (state.q) {
          const hay = (p.name + ' ' + p.perex + ' ' + p.desc.join(' ') + ' ' + catName(p.cat)).toLowerCase();
          if (!hay.includes(state.q.toLowerCase().trim())) return false;
        }
        return true;
      });

      const sorters = {
        'cena-asc':  (a, b) => (hasPrice(a.price) ? a.price : Infinity) - (hasPrice(b.price) ? b.price : Infinity) || 0,
        'cena-desc': (a, b) => (b.price || 0) - (a.price || 0),
        'nazev':     (a, b) => a.name.localeCompare(b.name, 'cs'),
        'default':   (a, b) => order.get(a.id) - order.get(b.id)
      };
      list.sort(sorters[state.sort] || sorters.default);

      $('[data-count]').innerHTML = list.length
        ? `Nalezeno <b>${list.length}</b> ${plural(list.length, 'produkt', 'produkty', 'produktů')}`
        : 'Žádný produkt neodpovídá filtru';

      // kategorie, která se teprve plní, dostane vlastní text místo „nic jsme nenašli“
      const soon = !list.length && state.cats.size &&
        [...state.cats].every(c => !PRODUCTS.some(p => p.cat === c));
      const soonNames = [...state.cats].map(catName).join(', ');

      grid.innerHTML = list.length
        ? list.slice(0, limit).map(productCard).join('')
        : soon
          ? `<div class="empty">
               <img src="assets/img/kategorie-pripravujeme.svg" alt="" width="200" height="150" style="width:160px;margin:0 auto 14px">
               <h3>${esc(soonNames)} — nabídku právě doplňujeme</h3>
               <p class="lead">Napište nám, co sháníte. Adaptéry z této kategorie dodáme na objednávku a cenu pošleme do 24 hodin.</p>
               <p style="margin-top:18px"><a class="btn" href="kontakt.html">Poptat ${esc(soonNames.toLowerCase())}</a></p>
             </div>`
          : `<div class="empty">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
             <h3>Nic jsme nenašli</h3>
             <p class="lead">Zkuste zrušit část filtrů nebo nám rovnou napište — velkou část adaptérů dodáváme na míru.</p>
             <p style="margin-top:18px"><a class="btn" href="kontakt.html">Poptat na míru</a></p>
           </div>`;
      grid.classList.toggle('products', list.length > 0);
      grid.classList.toggle('grid', list.length > 0);
      let more = $('[data-more]');
      if (!more) {
        more = document.createElement('p'); more.className = 'catalog__more'; more.setAttribute('data-more', '');
        grid.after(more);
        more.addEventListener('click', e => { if (e.target.closest('button')) { limit += PAGE; render(true); } });
      }
      const rest = list.length - limit;
      more.innerHTML = rest > 0 ? `<button class="btn btn--ghost" type="button">Zobrazit další ${Math.min(rest, PAGE)} z ${rest}</button>` : '';
      syncUrl();
      initReveal();
    }

    const bind = (el, key) => el.addEventListener('change', e => {
      const v = e.target.value;
      e.target.checked ? state[key].add(v) : state[key].delete(v);
      render();
    });
    bind(box.cats, 'cats'); bind(box.machines, 'machines');

    stockInput.addEventListener('change', () => { state.stock = stockInput.checked; render(); });
    sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; render(); });

    let t;
    searchInput.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { state.q = searchInput.value; render(); }, 220);
    });

    $('[data-reset]').addEventListener('click', () => {
      state.cats.clear(); state.machines.clear();
      state.stock = false; state.q = ''; state.sort = 'default';
      $$('input[type=checkbox]', $('.filters')).forEach(i => i.checked = false);
      searchInput.value = ''; sortSelect.value = 'default';
      render();
    });

    const toggle = $('[data-filters-toggle]');
    if (toggle) toggle.addEventListener('click', () => {
      const open = $('.filters').classList.toggle('is-open');
      toggle.textContent = open ? 'Skrýt filtry' : 'Filtry';
    });

    render();
  }

  /* ---------- 8. Uchycení: každý produkt má jedno pevné uchycení, nevolí se ---------- */
  function mountLabel(p) {
    const m = p.mount;
    if (!m) return '';
    if (m === 'EURO') return 'EURO (SMS / ISO)';
    if (m === 'pro manipulátory') return 'pro teleskopické manipulátory';
    if (m === 'mininakladač') return 'pro mininakladač';
    return m;
  }

  function mountSentence(p) {
    const m = mountLabel(p);
    if (p.cat === 'ramy') return `Redukční rám se nasadí mezi stroj a adaptér${m ? ` — provedení <b>${esc(m)}</b>` : ''}.`;
    if (p.mount === 'na paletizační vidle') return 'Nasazuje se <b>na paletizační vidle</b>, vlastní uchycení nepotřebuje.';
    if (!m) return 'Uchycení upřesníme podle vašeho stroje.';
    return `Adaptér má pevné uchycení <b>${esc(m)}</b>.`;
  }

  function mountBlock(p) {
    const showEuro = /euro/i.test(p.mount || '') && p.cat !== 'ramy';
    return `
      <div class="detail__block mount-box" id="uchyceni">
        <h3>Uchycení</h3>
        <div class="mount-box__inner">
          ${showEuro ? `<figure class="mount-box__img">
            <img src="assets/img/uchyceni-euro.svg" alt="Příklad uchycení EURO — pohled na zadní stranu adaptéru" width="400" height="300" loading="lazy">
            <figcaption>Příklad uchycení EURO</figcaption>
          </figure>` : ''}
          <div>
            <p>${mountSentence(p)}</p>
            <p class="mount-box__help">Nevíte, jestli uchycení sedí na váš stroj? Pošlete nám fotku úchytu na stroji a do druhého dne poradíme.</p>
          </div>
        </div>
      </div>`;
  }

  /* ---------- 9. Detail produktu s konfigurátorem ---------- */
  function initDetail() {
    const root = $('[data-detail]');
    if (!root) return;
    const id = new URLSearchParams(location.search).get('id');
    const p  = PRODUCTS.find(x => x.id === id);

    if (!p) {
      root.innerHTML = `<div class="empty" style="grid-column:1/-1">
        <h3>Produkt nenalezen</h3>
        <p class="lead">Odkaz zřejmě zestárnul. Zkuste vybrat z celého katalogu.</p>
        <p style="margin-top:18px"><a class="btn" href="katalog.html">Zpět do katalogu</a></p></div>`;
      return;
    }

    document.title = `${p.name} — ${SITE.brand}`;
    const meta = $('meta[name="description"]');
    if (meta) meta.setAttribute('content', (p.perex || p.name + ' — ' + catName(p.cat)).slice(0, 160));

    const bc = $('[data-breadcrumb]');
    if (bc) bc.innerHTML =
      `<a href="index.html">Úvod</a> ${ICON.arrow}
       <a href="katalog.html">Katalog</a> ${ICON.arrow}
       <a href="katalog.html?kategorie=${p.cat}">${esc(catName(p.cat))}</a> ${ICON.arrow}
       <span>${esc(p.name)}</span>`;

    const thumbs = p.imgs.length > 1 ? `
      <div class="detail__thumbs">
        ${p.imgs.map((f, i) => `
          <button class="detail__thumb${i ? '' : ' is-active'}" type="button" data-img="${esc(f)}" aria-label="Fotka ${i + 1}">
            <img src="assets/img/nahledy/${f}${IMG_V}" alt="" loading="lazy">
          </button>`).join('')}
      </div>` : '';

    const variants = p.variants || [];
    const extras = p.extras || [];

    const variantGroup = variants.length > 1 ? `
      <div class="config__group">
        <p class="config__label" id="cfg-var-label">${esc(p.variantLabel || 'Varianta')}</p>
        <div class="config__opts" role="radiogroup" aria-labelledby="cfg-var-label">
          ${variants.map((v, i) => `
            <button type="button" class="opt" role="radio" aria-checked="${i ? 'false' : 'true'}" data-variant="${i}">
              <b>${esc(v.label)}</b><small>${czkOr(v.price)}</small>
            </button>`).join('')}
        </div>
      </div>` : '';

    const mountGroup = `
      <div class="config__group">
        <p class="config__label">Uchycení</p>
        <p class="config__fixed">${mountLabel(p) ? `<b>${esc(mountLabel(p))}</b>` : 'upřesníme podle vašeho stroje'}</p>
      </div>`;

    const extrasGroup = extras.length ? `
      <div class="config__group">
        <p class="config__label">Příplatková výbava</p>
        ${extras.map((e, i) => `
          <label class="check config__extra"><input type="checkbox" data-extra="${i}">
            <span>${esc(e.name)}${e.note ? `<small>${esc(e.note)}</small>` : ''}</span>
            <span class="count">${hasPrice(e.price) ? '+ ' + czk(e.price) : 'na dotaz'}</span></label>`).join('')}
      </div>` : '';

    const descRows = p.desc.length ? `<div class="detail__block">
          <h3>Popis</h3>
          <ul class="desc-list">${p.desc.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
        </div>` : '';

    const variantTable = variants.length > 1 ? (() => {
      const keys = [...new Set(variants.flatMap(v => Object.keys(v.specs)))];
      const hasCode = variants.some(v => v.code);
      return `<div class="detail__block">
        <h3>Přehled variant</h3>
        <div class="table-scroll"><table class="var-table">
          <thead><tr>${hasCode ? '<th>Kód</th>' : ''}${keys.length ? keys.map(k => `<th>${esc(k)}</th>`).join('') : `<th>${esc(p.variantLabel || 'Varianta')}</th>`}<th>Cena bez DPH</th></tr></thead>
          <tbody>${variants.map((v, i) => `<tr data-row="${i}"${i ? '' : ' class="is-active"'}>${hasCode ? `<td>${esc(v.code || '—')}</td>` : ''}${
            keys.length ? keys.map(k => `<td>${esc(v.specs[k] || '—')}</td>`).join('') : `<td>${esc(v.label)}</td>`}<td><b>${czkOr(v.price)}</b></td></tr>`).join('')}</tbody>
        </table></div>
      </div>`;
    })() : '';

    const drawings = (p.drawings || []).length ? `<div class="detail__block">
        <h3>Technický nákres</h3>
        <div class="drawings">${p.drawings.map(f => `
          <a class="drawing" href="assets/img/nakresy/${encodeURIComponent(f)}" target="_blank" rel="noopener">
            <img src="assets/img/nakresy/${encodeURIComponent(f)}" alt="Technický nákres — ${esc(p.name)}" loading="lazy">
          </a>`).join('')}</div>
      </div>` : '';

    root.innerHTML = `
      <div class="detail__gallery">
        <div class="detail__stage"><img src="${p.imgs[0] ? 'assets/img/produkty/' + p.imgs[0] + IMG_V : 'assets/img/nahledy/_bez-foto.svg'}" alt="${esc(p.name)}" width="900" height="675"></div>
        ${thumbs}
      </div>
      <div>
        <p class="eyebrow">${esc(catName(p.cat))}</p>
        <h1>${esc(p.name)}</h1>
        <p class="detail__code" data-code${variants[0] && variants[0].code ? '' : ' hidden'}>Kód: <span>${esc((variants[0] && variants[0].code) || '')}</span></p>
        <div class="detail__flags">${flags(p)}</div>
        ${p.perex ? `<p class="lead">${esc(p.perex)}</p>` : ''}

        <div class="config" data-config>
          ${variantGroup}${mountGroup}${extrasGroup}
          <div class="config__sum">
            <div class="detail__price">
              <b data-total>${priceLabel(p)}</b><span data-total-vat></span>
            </div>
            <div class="config__buy">
              <div class="qty" aria-label="Počet kusů">
                <button type="button" data-qty="-1" aria-label="Ubrat kus">${ICON.minus}</button>
                <input type="number" min="1" max="99" value="1" inputmode="numeric" aria-label="Počet kusů" data-qty-input>
                <button type="button" data-qty="1" aria-label="Přidat kus">${ICON.plus}</button>
              </div>
              <button type="button" class="btn" data-add-cart>${ICON.cart} Přidat do poptávky</button>
            </div>
            <a class="config__tel" href="tel:${SITE.phoneHref}">nebo zavolejte ${SITE.phone}</a>
          </div>
        </div>

        <div class="detail__block">
          <h3>Technické parametry</h3>
          <table class="spec-table"><tbody data-specs></tbody></table>
        </div>

        ${variantTable}
        ${drawings}
        ${descRows}

        <div class="detail__block">
          <h3>Vhodné pro</h3>
          <div class="tag-row">
            ${p.machines.map(m => `<span class="chip chip--neutral">${esc(machineName(m))}</span>`).join('') || '<span class="chip chip--neutral">Upřesníme podle stroje</span>'}
          </div>
        </div>

        ${mountBlock(p)}
      </div>`;

    // přepínání fotek v galerii
    const stage = $('.detail__stage img', root);
    $$('.detail__thumb', root).forEach(b => b.addEventListener('click', () => {
      stage.src = 'assets/img/produkty/' + b.dataset.img + IMG_V;
      $$('.detail__thumb', root).forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
    }));

    // --- konfigurátor ---
    const cfg = { variant: 0, extras: new Set(), qty: 1 };
    const qtyInput = $('[data-qty-input]', root);

    function current() {
      const v = variants[cfg.variant];
      const base = v ? v.price : p.price;
      const exAdd = [...cfg.extras].reduce((s, i) => s + (extras[i].price || 0), 0);
      return { v, unit: hasPrice(base) ? base + exAdd : null };
    }

    function update() {
      const c = current();
      const specs = Object.assign({}, p.specs, c.v ? c.v.specs : {});
      $('[data-specs]', root).innerHTML = Object.entries(specs)
        .map(([k, val]) => `<tr><th>${esc(k)}</th><td>${esc(val)}</td></tr>`).join('') ||
        '<tr><td colspan="2" style="color:var(--muted)">Parametry upřesníme v nabídce.</td></tr>';
      const total = c.unit * cfg.qty;
      // „od“ jen tam, kde cena opravdu není pevná (bez variant, cena „od“)
      const from = p.priceFrom && variants.length < 2;
      if (c.unit == null) {
        $('[data-total]', root).textContent = 'Cena na dotaz';
        $('[data-total-vat]', root).textContent = `přesnou cenu pošleme v nabídce${cfg.qty > 1 ? ` · ${cfg.qty} ks` : ''}`;
      } else {
        $('[data-total]', root).textContent = (from ? 'od ' : '') + czk(total);
        $('[data-total-vat]', root).textContent = `bez DPH · ${czk(Math.round(total * 1.21))} s DPH${cfg.qty > 1 ? ` · ${cfg.qty} ks` : ''}`;
      }
      const code = $('[data-code]', root);
      if (code) { code.hidden = !(c.v && c.v.code); $('span', code).textContent = c.v && c.v.code ? c.v.code : ''; }
      $$('[data-row]', root).forEach(r => r.classList.toggle('is-active', +r.dataset.row === cfg.variant));
    }

    $$('[data-variant]', root).forEach(b => b.addEventListener('click', () => {
      cfg.variant = +b.dataset.variant;
      $$('[data-variant]', root).forEach(x => x.setAttribute('aria-checked', x === b ? 'true' : 'false'));
      update();
    }));
    // šipky v radiogroup
    const optWrap = $('.config__opts', root);
    if (optWrap) optWrap.addEventListener('keydown', e => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const next = (cfg.variant + dir + variants.length) % variants.length;
      const btn = $(`[data-variant="${next}"]`, root); btn.click(); btn.focus();
    });
    $$('[data-extra]', root).forEach(ch => ch.addEventListener('change', () => {
      ch.checked ? cfg.extras.add(+ch.dataset.extra) : cfg.extras.delete(+ch.dataset.extra); update();
    }));
    const setQty = n => { cfg.qty = Math.max(1, Math.min(99, n || 1)); qtyInput.value = cfg.qty; update(); };
    $$('[data-qty]', root).forEach(b => b.addEventListener('click', () => setQty(cfg.qty + +b.dataset.qty)));
    qtyInput.addEventListener('change', () => setQty(parseInt(qtyInput.value, 10)));

    $('[data-add-cart]', root).addEventListener('click', () => {
      const c = current();
      const exNames = [...cfg.extras].sort().map(i => extras[i].name);
      const item = {
        id: p.id, name: p.name, img: p.imgs[0] || '_bez-foto.svg',
        variant: c.v ? (p.variantLabel || 'Varianta') + ': ' + c.v.label + (c.v.code ? ' (' + c.v.code + ')' : '') : '',
        mount: p.cat === 'ramy' || p.mount === 'na paletizační vidle' ? (mountLabel(p) || '') : (mountLabel(p) || 'upřesníme podle stroje'),
        extras: exNames,
        unit: c.unit, from: p.priceFrom && variants.length < 2,
        qty: cfg.qty
      };
      item.key = [item.id, item.variant, item.mount, exNames.join('+')].join('|');
      Cart.add(item);
      toast(item);
    });

    update();

    const rel = $('[data-related]');
    if (rel) {
      const list = PRODUCTS
        .filter(x => x.id !== p.id && x.cat === p.cat)
        .sort((a, b) => (b.stock - a.stock) || Math.abs(a.price - p.price) - Math.abs(b.price - p.price))
        .slice(0, 4);
      rel.innerHTML = list.map(productCard).join('');
    }
    initReveal();
  }

  /* ---------- 10. Upozornění po přidání do poptávky ---------- */
  function toast(item) {
    let t = $('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    const n = Cart.count();
    t.innerHTML = `
      <img src="assets/img/nahledy/${esc(item.img)}${IMG_V}" alt="" width="64" height="48">
      <div class="toast__text"><b>Přidáno do poptávky</b><span>${esc(item.name)}${item.variant ? ' · ' + esc(item.variant.split(': ')[1] || item.variant) : ''}${item.qty > 1 ? ' · ' + item.qty + ' ks' : ''}</span></div>
      <a class="btn btn--sm" href="poptavka.html">Poptávka (${n})</a>
      <button class="toast__close" type="button" aria-label="Zavřít">${ICON.close}</button>`;
    $('.toast__close', t).addEventListener('click', () => t.classList.remove('is-open'));
    requestAnimationFrame(() => t.classList.add('is-open'));
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('is-open'), 7000);
  }

  /* ---------- 11. Stránka poptávky (košík) ---------- */
  function cartLines(items) {
    return items.map((i, n) => [
      `${n + 1}) ${i.name} — ${i.qty} ks`,
      i.variant ? '   ' + i.variant : '',
      i.mount ? '   Uchycení: ' + i.mount : '',
      i.extras.length ? '   Výbava: ' + i.extras.join(', ') : '',
      (i.unit == null ? '   Cena: na dotaz' : `   Orientačně: ${i.from ? 'od ' : ''}${czk(i.unit * i.qty)} bez DPH`)
    ].filter(Boolean).join('\n')).join('\n');
  }

  function initCartPage() {
    const wrap = $('[data-cart]');
    if (!wrap) return;

    function render() {
      const items = Cart.read();
      const sum = items.reduce((s, i) => s + (i.unit || 0) * i.qty, 0);
      const anyAsk = items.some(i => i.unit == null);
      $$('[data-cart-filled]').forEach(el => el.hidden = !items.length);
      if (!items.length) {
        wrap.innerHTML = `<div class="empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
          <h3>Poptávka je zatím prázdná</h3>
          <p class="lead">V detailu produktu si vyberte šířku a uchycení a dejte „Přidat do poptávky“. Můžete poptat i víc adaptérů najednou.</p>
          <p style="margin-top:18px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><a class="btn" href="katalog.html">Do katalogu</a><a class="btn btn--ghost" href="kontakt.html">Napsat bez výběru</a></p>
        </div>`;
        return;
      }
      wrap.innerHTML = `
        <ul class="cart-list">
          ${items.map((i, n) => `
            <li class="cart-item">
              <a class="cart-item__img" href="produkt.html?id=${encodeURIComponent(i.id)}"><img src="assets/img/nahledy/${esc(i.img)}${IMG_V}" alt="" width="120" height="90"></a>
              <div class="cart-item__body">
                <a class="cart-item__name" href="produkt.html?id=${encodeURIComponent(i.id)}">${esc(i.name)}</a>
                <ul class="cart-item__meta">
                  ${i.variant ? `<li>${esc(i.variant)}</li>` : ''}
                  ${i.mount ? `<li>Uchycení: ${esc(i.mount)}</li>` : ''}
                  ${i.extras.length ? `<li>Výbava: ${esc(i.extras.join(', '))}</li>` : ''}
                </ul>
              </div>
              <div class="qty qty--sm">
                <button type="button" data-cqty="${n}" data-d="-1" aria-label="Ubrat kus">${ICON.minus}</button>
                <input type="number" min="1" max="99" value="${i.qty}" data-cqty-input="${n}" aria-label="Počet kusů">
                <button type="button" data-cqty="${n}" data-d="1" aria-label="Přidat kus">${ICON.plus}</button>
              </div>
              <div class="cart-item__price">${i.unit == null ? '<b>Na dotaz</b><small>cenu pošleme</small>' : `<b>${i.from ? 'od ' : ''}${czk(i.unit * i.qty)}</b><small>${i.qty > 1 ? czk(i.unit) + ' / ks' : 'bez DPH'}</small>`}</div>
              <button class="cart-item__remove" type="button" data-remove="${n}" aria-label="Odebrat ${esc(i.name)}">${ICON.trash}</button>
            </li>`).join('')}
        </ul>
        <div class="cart-sum">
          <div><span>Orientační cena celkem${anyAsk ? ' (bez položek na dotaz)' : ''}</span><b>${czk(sum)}</b><small>bez DPH · ${czk(Math.round(sum * 1.21))} s DPH</small></div>
          <p>Přesnou cenu, termín a dopravu potvrdíme v nabídce. Poptávka je nezávazná.</p>
          <button class="btn btn--ghost btn--sm" type="button" data-cart-clear>Vyprázdnit poptávku</button>
        </div>`;
    }

    wrap.addEventListener('click', e => {
      const items = Cart.read();
      const q = e.target.closest('[data-cqty]'), r = e.target.closest('[data-remove]'), c = e.target.closest('[data-cart-clear]');
      if (q) { const it = items[+q.dataset.cqty]; it.qty = Math.max(1, Math.min(99, it.qty + +q.dataset.d)); Cart.write(items); render(); }
      if (r) { items.splice(+r.dataset.remove, 1); Cart.write(items); render(); }
      if (c && confirm('Opravdu vyprázdnit celou poptávku?')) { Cart.write([]); render(); }
    });
    wrap.addEventListener('change', e => {
      const inp = e.target.closest('[data-cqty-input]');
      if (!inp) return;
      const items = Cart.read();
      items[+inp.dataset.cqtyInput].qty = Math.max(1, Math.min(99, parseInt(inp.value, 10) || 1));
      Cart.write(items); render();
    });
    render();
  }

  /* ---------- 12. Poptávkový formulář ---------- */
  function initForm() {
    const form = $('[data-form]');
    if (!form) return;
    const withCart = form.dataset.form === 'cart';

    const produkt = new URLSearchParams(location.search).get('produkt');
    const msg = $('#zprava', form);
    if (produkt && msg && !msg.value) {
      msg.value = `Dobrý den,\nmám zájem o produkt ${produkt}. Prosím o cenovou nabídku a termín dodání.\n\nDěkuji`;
    }

    // na kontaktu upozornit, že v poptávce už něco čeká
    const hint = $('[data-cart-hint]');
    if (hint && !withCart) {
      const n = Cart.count();
      hint.hidden = !n;
      if (n) hint.innerHTML = `V poptávce máte ${n} ${plural(n, 'adaptér', 'adaptéry', 'adaptérů')}. <a href="poptavka.html">Odeslat poptávku s vybranými adaptéry ${ICON.arrow}</a>`;
    }

    const sel = $('#uchyceni', form);
    if (sel && sel.options.length <= 1) {
      MOUNTS.forEach(m => sel.add(new Option(m.name + (m.note ? ' (' + m.note + ')' : ''), m.name)));
      sel.add(new Option('Nevím / poradíte mi', 'nevím'));
    }

    const status = $('.form-status', form);
    form.addEventListener('submit', e => {
      e.preventDefault();
      status.className = 'form-status';

      const items = withCart ? Cart.read() : [];
      if (withCart && !items.length) {
        status.classList.add('is-err');
        status.textContent = 'Poptávka je prázdná — nejdřív přidejte adaptér z katalogu.';
        return;
      }

      const required = $$('[required]', form);
      const bad = required.find(f => (f.type === 'checkbox' ? !f.checked : !f.value.trim()));
      const email = $('#email', form);
      const emailOk = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.value.trim());

      if (bad || !emailOk) {
        status.classList.add('is-err');
        status.textContent = bad
          ? 'Vyplňte prosím všechna povinná pole a potvrďte souhlas se zpracováním údajů.'
          : 'Zkontrolujte prosím tvar e-mailové adresy.';
        (bad || email).focus();
        return;
      }

      // Bez backendu: otevře e-mailového klienta s předvyplněnou poptávkou.
      const d = new FormData(form);
      const body = [
        'Jméno: ' + d.get('jmeno'),
        'Firma: ' + (d.get('firma') || '—'),
        'E-mail: ' + d.get('email'),
        'Telefon: ' + (d.get('telefon') || '—'),
        'Stroj: ' + (d.get('stroj') || '—'),
        d.has('uchyceni') ? 'Uchycení: ' + (d.get('uchyceni') || '—') : '',
        withCart ? '\nPoptávané adaptéry:\n' + cartLines(items) +
          `\n\nOrientačně celkem: ${czk(items.reduce((s, i) => s + (i.unit || 0) * i.qty, 0))} bez DPH` : '',
        '', 'Zpráva:', d.get('zprava') || '—'
      ].filter(x => x !== '').join('\n');

      const subject = (withCart ? 'Poptávka adaptérů z webu — ' : 'Poptávka z webu — ') + (d.get('jmeno') || '');
      window.location.href = 'mailto:' + SITE.email
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body);

      status.classList.add('is-ok');
      status.textContent = 'Otevřeli jsme vám e-mailového klienta s hotovou poptávkou — stačí odeslat. Ozveme se do 24 hodin.';
    });
  }

  /* ---------- 13. Start ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    initHeader(); initToTop(); initFaq();
    initHome(); initCatalog(); initDetail(); initCartPage(); initForm();
    initReveal();
    $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
  });
  // košík otevřený ve víc záložkách — počet v hlavičce drží krok
  window.addEventListener('storage', e => { if (e.key === 'adaptery-poptavka-v1') Cart.badge(); });
})();
