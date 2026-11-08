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
  const IMG_V = '?v=3';
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
    // pojistka proti poškozeným / starým záznamům: počet 1–99, cena číslo nebo null, výbava pole
    const norm = v => (Array.isArray(v) ? v : [])
      .filter(i => i && typeof i === 'object' && i.name)
      .map(i => Object.assign({}, i, {
        qty: Math.max(1, Math.min(99, parseInt(i.qty, 10) || 1)),
        unit: hasPrice(i.unit) ? i.unit : null,
        extras: Array.isArray(i.extras) ? i.extras.filter(Boolean) : [],
        variant: i.variant || '', mount: i.mount || ''
      }));
    function read() {
      try { return norm(JSON.parse(localStorage.getItem(KEY) || '[]')); }
      catch (e) { return norm(memory); }
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
      const setOpen = open => {
        mnav.classList.toggle('is-open', open);
        burger.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
        document.body.classList.toggle('no-scroll', open);
      };
      burger.addEventListener('click', () => setOpen(!mnav.classList.contains('is-open')));
      $$('a', mnav).forEach(a => a.addEventListener('click', () => setOpen(false)));
      // Esc menu zavře a vrátí fokus na hamburger
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && mnav.classList.contains('is-open')) { setOpen(false); burger.focus(); }
      });
      // po otočení tabletu na šířku (menu v liště) nesmí zůstat zamčený scroll
      const wide = window.matchMedia('(min-width:960px)');
      const onWide = () => { if (wide.matches) setOpen(false); };
      if (wide.addEventListener) wide.addEventListener('change', onWide); else if (wide.addListener) wide.addListener(onWide);
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
      if (path.split('?')[0] === page) { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); }
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
    // „Akční cena“ v dostupnosti by vedle štítku Akce jen opakovala totéž
    const avail = p.stock ? '<span class="chip chip--stock">Skladem</span>'
      : (p.sale && /akč/i.test(p.avail || '')) || !p.avail ? ''
      : `<span class="chip chip--order">${esc(p.avail)}</span>`;
    return (p.sale ? '<span class="chip chip--sale">Akce</span>' : '') + avail;
  }

  // „5 šířek 1,5–2,4 m“ — na kartě je hned vidět, že produkt má víc velikostí
  function variantSummary(p) {
    if (!p.variants || p.variants.length < 2) return '';
    const n = p.variants.length;
    const first = p.variants[0].label, last = p.variants[n - 1].label;
    const unit = s => (String(s).match(/\s(mm|cm|m)$/) || [])[1];
    // rozsah jen u čísel se stejnou jednotkou („1,2–2,4 m“), jinak by vzniklo „800–1,2 m“
    const range = unit(first) && unit(first) === unit(last) ? `${first.replace(/\s*(mm|cm|m)$/, '')}–${last}` : '';
    if (range && /^Šířka/.test(p.variantLabel)) return `${n} ${plural(n, 'šířka', 'šířky', 'šířek')} ${range}`;
    if (range && p.variantLabel === 'Pracovní záběr') return `${n} ${plural(n, 'záběr', 'záběry', 'záběrů')} ${range}`;
    return `${n} ${plural(n, 'varianta', 'varianty', 'variant')}`;
  }

  function productCard(p) {
    const vs = variantSummary(p);
    const specs = (vs ? `<span class="is-strong">${esc(vs)}</span>` : '') +
      Object.entries(p.specs || {}).filter(([k, v]) => v && !(vs && /^Šířka/.test(k))).slice(0, vs ? 1 : 2)
        .map(([k, v]) => `<span>${esc(k)}: ${esc(v)}</span>`).join('');
    const mount = mountLabel(p);
    const priced = hasPrice(p.price);
    return `
      <article class="product" data-reveal>
        <a class="product__link" href="produkt.html?id=${encodeURIComponent(p.id)}" aria-label="${esc(p.name)}"></a>
        <div class="product__media">
          <div class="product__flags">${flags(p)}</div>
          <img src="assets/img/nahledy/${p.imgs && p.imgs[0] ? p.imgs[0] + IMG_V : '_bez-foto.svg'}" alt="${esc(p.name)}" loading="lazy" width="500" height="375">
        </div>
        <div class="product__body">
          <p class="product__cat">${esc(catName(p.cat))}</p>
          <h3 class="product__name" title="${esc(p.name)}">${esc(p.name)}</h3>
          ${mount ? `<p class="product__mount">Uchycení: <b>${esc(mount)}</b></p>` : ''}
          ${specs ? `<div class="product__specs">${specs}</div>` : ''}
          <div class="product__foot">
            <div class="product__price${priced ? '' : ' product__price--ask'}"><b>${priceLabel(p)}</b><small>${priced ? 'bez DPH' : 'pošleme v nabídce'}</small></div>
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
            <span class="cat-card__foot">
              <span class="cat-card__count">${n ? `${n} ${plural(n, 'produkt', 'produkty', 'produktů')}` : 'Připravujeme'}</span>
              <span class="cat-card__more" aria-hidden="true">${ICON.arrow}</span>
            </span>
          </div>
        </a>`;
      }).join('');
    }

    const topWrap = $('[data-top-products]');
    if (topWrap) {
      // sekce slibuje „skladem“ — bere jen skladové kusy. Nejdřív ruční výběr
      // (čisté studiové fotky z různých kategorií, první 4 se ukážou i na mobilu);
      // co vypadne ze skladu nebo z nabídky, doplní nejdražší skladovka z kategorie,
      // pak skladové akce a ostatní skladovky
      const HOME_PICK = ['velkoobjemova-lopata', 'drapak-na-baliky-hd', 'lopata-multi-5-pridrzovac',
        'redukcni-ramy-pro-manipulatory', 'pal-vidle-s-ramem', 'kleste-na-baliky-k1-maxi-',
        'hydr-kontejner-plosina', 'drapak-it2-hd'];
      const pick = HOME_PICK.map(id => PRODUCTS.find(p => p.id === id && p.stock)).filter(Boolean);
      CATEGORIES.forEach(c => {
        if (pick.some(p => p.cat === c.id)) return;
        const best = PRODUCTS.filter(p => p.cat === c.id && p.stock).sort((a, b) => (b.price || 0) - (a.price || 0))[0];
        if (best) pick.push(best);
      });
      PRODUCTS.filter(p => p.stock && p.sale && !pick.includes(p)).forEach(p => pick.push(p));
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
    $$('[data-count-mounts]').forEach(el => el.textContent = MOUNTS.length);
    initReveal();
  }

  /* ---------- 7. Katalog ---------- */
  function initCatalog() {
    const grid = $('[data-catalog-grid]');
    if (!grid) return;

    const params = new URLSearchParams(location.search);
    const list2set = (v, ok) => new Set((v || '').split(',').filter(Boolean).filter(ok));
    const SORTS = ['default', 'velikost', 'cena-asc', 'cena-desc', 'nazev'];
    const state = {
      // neznámé hodnoty z odkazu zahodíme, jinak by katalog ukázal prázdný stav bez názvu
      cats:     list2set(params.get('kategorie'), id => CATEGORIES.some(c => c.id === id)),
      // staré odkazy používaly stroj=smykovy
      machines: list2set((params.get('stroj') || '').replace(/smykovy/g, 'mininakladac'), id => MACHINES.some(m => m.id === id)),
      stock:  params.get('skladem') === '1',
      q:      params.get('q') || '',
      sort:   SORTS.includes(params.get('razeni')) ? params.get('razeni') : 'default'
    };

    const filtersEl = $('.filters');
    const box = {
      cats:     $('[data-filter-cats]'),
      machines: $('[data-filter-machines]')
    };
    const checks = (list, key) => list.map(x => `
      <label class="check"><input type="checkbox" value="${x.id}" ${state[key].has(x.id) ? 'checked' : ''}>
        <span class="check__text">${esc(x.name)}</span><span class="count" data-n="${key}:${x.id}"></span></label>`).join('');
    box.cats.innerHTML     = checks(CATEGORIES, 'cats');
    box.machines.innerHTML = checks(MACHINES,   'machines');

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

    // hledání bez ohledu na diakritiku a velikost písmen, všechna slova musí sedět
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const hay = new Map(PRODUCTS.map(p => [p.id, norm([p.name, catName(p.cat), p.mount, p.perex, (p.desc || []).join(' '),
      (p.variants || []).map(v => v.code + ' ' + v.label).join(' ')].join(' '))]));

    // jeden filtr lze vynechat — tak se spočítají počty u voleb („kolik přibude, když to zaškrtnu“)
    function matches(p, skip) {
      if (skip !== 'cats' && state.cats.size && !state.cats.has(p.cat)) return false;
      if (skip !== 'machines' && state.machines.size && !p.machines.some(m => state.machines.has(m))) return false;
      if (skip !== 'stock' && state.stock && !p.stock) return false;
      if (state.q.trim()) {
        const h = hay.get(p.id);
        if (!norm(state.q).split(/\s+/).filter(Boolean).every(w => h.includes(w))) return false;
      }
      return true;
    }

    function updateCounts() {
      const base = { cats: PRODUCTS.filter(p => matches(p, 'cats')), machines: PRODUCTS.filter(p => matches(p, 'machines')) };
      $$('[data-n]', filtersEl).forEach(el => {
        const [key, id] = el.dataset.n.split(':');
        const n = base[key].filter(p => key === 'cats' ? p.cat === id : p.machines.includes(id)).length;
        el.textContent = n;
        el.closest('.check').classList.toggle('is-empty', n === 0 && !state[key].has(id));
      });
    }

    // aktivní filtry jako štítky nad výsledky — na mobilu jsou filtry schované v panelu
    const activeEl = $('[data-active]');
    function renderActive() {
      const items = [
        ...[...state.cats].map(id => ['cats', id, catName(id)]),
        ...[...state.machines].map(id => ['machines', id, machineName(id)]),
        ...(state.stock ? [['stock', '1', 'Skladem']] : []),
        ...(state.q.trim() ? [['q', '', `„${state.q.trim()}“`]] : [])
      ];
      const n = items.length;
      $$('[data-filters-n]').forEach(b => { b.textContent = n; b.hidden = !n; });
      if (!activeEl) return;
      activeEl.hidden = !n;
      activeEl.innerHTML = n ? items.map(([k, v, label]) =>
        `<button class="catalog__tag" type="button" data-remove="${k}:${esc(v)}" aria-label="Zrušit filtr ${esc(label)}">${esc(label)}${ICON.close}</button>`).join('') +
        (n > 1 ? '<button class="catalog__clear" type="button" data-reset>Zrušit vše</button>' : '') : '';
    }

    // výchozí pořadí = pořadí v data.js (kategorie a v nich od největšího po nejmenší)
    const order = new Map(PRODUCTS.map((p, i) => [p.id, i]));
    const catOrder = new Map(CATEGORIES.map((c, i) => [c.id, i]));
    const priceKey = p => hasPrice(p.price) ? p.price : Infinity;
    const sorters = {
      // kategorie v pořadí webu, uvnitř od nejlevnějšího; „na dotaz“ na konec kategorie
      'default':   (a, b) => (catOrder.get(a.cat) - catOrder.get(b.cat)) || (priceKey(a) - priceKey(b)) || (order.get(a.id) - order.get(b.id)),
      'velikost':  (a, b) => order.get(a.id) - order.get(b.id),
      'cena-asc':  (a, b) => (priceKey(a) - priceKey(b)) || (order.get(a.id) - order.get(b.id)),
      'cena-desc': (a, b) => ((b.price || 0) - (a.price || 0)) || (order.get(a.id) - order.get(b.id)),
      'nazev':     (a, b) => a.name.localeCompare(b.name, 'cs')
    };

    // katalog se vykresluje po stránkách, další karty přidá tlačítko
    const PAGE = 48;
    let limit = PAGE;
    const countEl = $('[data-count]');
    const applyBtn = $('.filters__apply');
    function render(keep) {
      if (keep !== true) limit = PAGE;
      const list = PRODUCTS.filter(p => matches(p)).sort(sorters[state.sort] || sorters.default);
      const total = list.length;
      const word = n => plural(n, 'produkt', 'produkty', 'produktů');

      countEl.innerHTML = total
        ? `<b>${total}</b> ${word(total)}${total < PRODUCTS.length ? ` z ${PRODUCTS.length}` : ''}`
        : 'Žádný produkt neodpovídá filtrům';
      if (applyBtn) applyBtn.textContent = total ? `Zobrazit ${total} ${word(total)}` : 'Nic nenalezeno';

      // při výchozím řazení jdou produkty po kategoriích — nadpis kategorie ukáže, kde která začíná
      const groups = state.sort === 'default' && new Set(list.map(p => p.cat)).size > 1;
      const perCat = {};
      if (groups) list.forEach(p => { perCat[p.cat] = (perCat[p.cat] || 0) + 1; });
      let html = '', last = null;
      list.slice(0, limit).forEach(p => {
        if (groups && p.cat !== last) {
          last = p.cat;
          html += `<h2 class="catalog__group">${esc(catName(p.cat))}<span>${perCat[p.cat]} ${word(perCat[p.cat])}</span></h2>`;
        }
        html += productCard(p);
      });

      grid.innerHTML = total ? html : `
        <div class="empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <h3>Tomu neodpovídá žádný produkt</h3>
          <p class="lead">Zkuste zrušit část filtrů nebo upravit hledaný výraz. Velkou část adaptérů dodáváme i na míru — stačí napsat, co sháníte.</p>
          <p class="empty__actions"><button class="btn btn--ghost" type="button" data-reset>Zrušit filtry</button><a class="btn" href="kontakt.html">Poptat na míru</a></p>
        </div>`;
      grid.classList.toggle('products', total > 0);
      grid.classList.toggle('grid', total > 0);
      // název kategorie na kartě je zbytečný pod nadpisem kategorie i když je vybraná jen jedna
      grid.classList.toggle('is-grouped', !!groups || (total > 0 && list.every(p => p.cat === list[0].cat)));

      let more = $('[data-more]');
      if (!more) {
        more = document.createElement('div'); more.className = 'catalog__more'; more.setAttribute('data-more', '');
        grid.after(more);
        more.addEventListener('click', e => { if (e.target.closest('button')) { limit += PAGE; render(true); } });
      }
      const shown = Math.min(limit, total), rest = total - shown;
      more.innerHTML = rest > 0 ? `
        <p class="catalog__progress"><span>Zobrazeno <b>${shown}</b> z ${total} ${word(total)}</span><span class="catalog__bar-fill" style="--p:${(shown / total * 100).toFixed(1)}%" aria-hidden="true"></span></p>
        <button class="btn btn--ghost" type="button">Zobrazit ${plural(Math.min(rest, PAGE), 'další', 'další', 'dalších')} ${Math.min(rest, PAGE)} ${ICON.plus}</button>` : '';

      updateCounts();
      renderActive();
      syncUrl();
      initReveal();
    }

    // po změně filtru vrátit pohled na začátek výsledků, pokud už je uživatel níž
    const results = $('.catalog__main') || grid;
    function toResults() {
      const top = results.getBoundingClientRect().top;
      if (top < 0) window.scrollTo({ top: top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10) || 80) - 12, behavior: 'smooth' });
    }
    const isDrawer = () => window.matchMedia('(max-width: 999px)').matches;
    const update = () => { render(); if (!isDrawer()) toResults(); };

    const bind = (el, key) => el.addEventListener('change', e => {
      const v = e.target.value;
      e.target.checked ? state[key].add(v) : state[key].delete(v);
      update();
    });
    bind(box.cats, 'cats'); bind(box.machines, 'machines');

    stockInput.addEventListener('change', () => { state.stock = stockInput.checked; update(); });
    sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; update(); });

    let t;
    searchInput.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { state.q = searchInput.value; render(); }, 220);
    });
    // Enter v hledání na mobilu rovnou zavře panel a ukáže výsledky
    searchInput.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault(); clearTimeout(t); state.q = searchInput.value; render();
      if (isDrawer()) closeFilters(true);
    });

    // zrušení filtrů (řazení necháváme, to si uživatel zvolil zvlášť)
    function resetAll() {
      state.cats.clear(); state.machines.clear();
      state.stock = false; state.q = '';
      $$('input[type=checkbox]', filtersEl).forEach(i => i.checked = false);
      searchInput.value = '';
      update();
    }
    document.addEventListener('click', e => {
      if (e.target.closest('[data-reset]')) { resetAll(); return; }
      const rm = e.target.closest('[data-remove]');
      if (!rm) return;
      const [k, v] = rm.dataset.remove.split(':');
      if (k === 'stock') { state.stock = false; stockInput.checked = false; }
      else if (k === 'q') { state.q = ''; searchInput.value = ''; }
      else {
        state[k].delete(v);
        const cb = $(`input[value="${v}"]`, box[k]); if (cb) cb.checked = false;
      }
      update();
    });

    // mobil a tablet: filtry vyjíždějí jako panel zboku
    const toggle = $('[data-filters-toggle]');
    const backdrop = $('.filters-backdrop');
    let lastFocus = null;
    function openFilters() {
      lastFocus = document.activeElement;
      filtersEl.classList.add('is-open');
      if (backdrop) { backdrop.hidden = false; requestAnimationFrame(() => backdrop.classList.add('is-open')); }
      document.body.classList.add('no-scroll');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      const close = $('.filters__close', filtersEl); if (close) close.focus({ preventScroll: true });
    }
    function closeFilters(scroll) {
      if (!filtersEl.classList.contains('is-open')) return;
      filtersEl.classList.remove('is-open');
      if (backdrop) { backdrop.classList.remove('is-open'); backdrop.hidden = true; }
      document.body.classList.remove('no-scroll');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      if (scroll) toResults();
    }
    if (toggle) toggle.addEventListener('click', () => filtersEl.classList.contains('is-open') ? closeFilters() : openFilters());
    $$('[data-filters-close]').forEach(b => b.addEventListener('click', () => closeFilters(b.classList.contains('filters__apply'))));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeFilters(); });
    // po otočení / zvětšení okna na desktop panel zavřít, ať nezůstane zamčený scroll
    window.matchMedia('(max-width: 999px)').addEventListener('change', e => { if (!e.matches) closeFilters(); });

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
    const help = mountLabel(p)
      ? 'Nevíte, jestli uchycení sedí na váš stroj? Pošlete nám fotku úchytu na stroji a do druhého dne poradíme.'
      : 'Napište nám značku a typ stroje, případně pošlete fotku úchytu — provedení uchycení doladíme v nabídce.';
    return `
      <div class="detail__block mount-box" id="uchyceni">
        <h2>Uchycení</h2>
        <div class="mount-box__inner">
          ${showEuro ? `<figure class="mount-box__img">
            <img src="assets/img/uchyceni-euro.svg" alt="Příklad uchycení EURO — pohled na zadní stranu adaptéru" width="400" height="300" loading="lazy">
            <figcaption>Příklad uchycení EURO</figcaption>
          </figure>` : ''}
          <div>
            <p class="mount-box__lead">${mountSentence(p)}</p>
            <p class="mount-box__help">${help}</p>
            <p class="mount-box__links">
              <a href="tel:${SITE.phoneHref}">${esc(SITE.phone)}</a>
              <a href="mailto:${SITE.email}?subject=${encodeURIComponent('Uchycení — ' + p.name)}">${esc(SITE.email)}</a>
            </p>
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
      const relSec = $('[data-related]') && $('[data-related]').closest('section');
      if (relSec) relSec.hidden = true;
      return;
    }

    document.title = `${p.name} — ${SITE.brand}`;
    const meta = $('meta[name="description"]');
    if (meta) meta.setAttribute('content', (p.perex || p.name + ' — ' + catName(p.cat)).slice(0, 160));
    const canon = $('link[rel="canonical"]');
    if (canon) canon.setAttribute('href', canon.getAttribute('href').split('?')[0] + '?id=' + encodeURIComponent(p.id));

    const bc = $('[data-breadcrumb]');
    if (bc) bc.innerHTML =
      `<a href="index.html">Úvod</a> ${ICON.arrow}
       <a href="katalog.html">Katalog</a> ${ICON.arrow}
       <a href="katalog.html?kategorie=${p.cat}">${esc(catName(p.cat))}</a> ${ICON.arrow}
       <span>${esc(p.name)}</span>`;

    const I = {
      prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
      next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
      zoom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/></svg>'
    };

    const imgs = p.imgs || [];
    const nImg = imgs.length;
    const photo = f => 'assets/img/produkty/' + f + IMG_V;
    const variants = p.variants || [];
    const extras = p.extras || [];
    const nVar = variants.length;
    const vLabel = p.variantLabel || 'Varianta';
    // popis bez řádku, který jen opakuje název, a bez ručně psaných pomlček na začátku
    const descItems = (p.desc || []).map(l => String(l).replace(/^\s*[-–•]\s*/, '').trim())
      .filter(l => l && l.toLowerCase() !== p.name.trim().toLowerCase());

    /* --- galerie --- */
    const gallery = `
      <div class="detail__gallery">
        <div class="detail__stage${nImg ? '' : ' detail__stage--empty'}">
          <img src="${nImg ? photo(imgs[0]) : 'assets/img/nahledy/_bez-foto.svg'}" alt="${esc(p.name)}" width="900" height="675" fetchpriority="high" decoding="async" data-stage>
          ${nImg ? `<button class="detail__zoom" type="button" data-zoom aria-label="Zvětšit fotku">${I.zoom}</button>` : ''}
          ${nImg > 1 ? `
          <button class="detail__nav detail__nav--prev" type="button" data-step="-1" aria-label="Předchozí fotka">${I.prev}</button>
          <button class="detail__nav detail__nav--next" type="button" data-step="1" aria-label="Další fotka">${I.next}</button>
          <span class="detail__count" aria-hidden="true"><b data-cur>1</b> / ${nImg}</span>` : ''}
        </div>
        ${nImg > 1 ? `<div class="detail__thumbs">${imgs.map((f, i) => `
          <button class="detail__thumb${i ? '' : ' is-active'}" type="button" data-thumb="${i}" aria-label="Fotka ${i + 1} z ${nImg}"${i ? '' : ' aria-current="true"'}>
            <img src="assets/img/nahledy/${esc(f)}${IMG_V}" alt="" loading="lazy" width="500" height="375">
          </button>`).join('')}
        </div>` : ''}
      </div>`;

    /* --- konfigurátor --- */
    // tlačítka variant v pravidelné mřížce (žádná osamocená poslední), dlouhé popisky dostanou víc místa
    const longLabel = variants.some(v => String(v.label).length > 9);
    // stejné popisky (např. dvě řady téže šířky) rozliší kód varianty
    const dupLabel = new Set(variants.map(v => v.label)).size < nVar;
    let cols  = longLabel ? Math.min(nVar, 2) : (nVar <= 6 ? nVar : Math.ceil(nVar / 2));
    let colsM = longLabel ? 1 : (nVar <= 3 ? nVar : nVar === 4 ? 2 : nVar <= 6 ? 3 : 4);
    if (dupLabel) { cols = Math.min(cols, 4); colsM = Math.min(colsM, 2); }
    const variantGroup = nVar > 1 ? `
      <div class="config__group">
        <p class="config__label" id="cfg-var-label">${esc(vLabel)} <span class="config__hint">${nVar} ${plural(nVar, 'varianta', 'varianty', 'variant')}</span></p>
        <div class="config__opts" role="radiogroup" aria-labelledby="cfg-var-label" style="--cols:${cols};--cols-m:${colsM}">
          ${variants.map((v, i) => `
            <button type="button" class="opt${longLabel ? ' opt--long' : ''}" role="radio" aria-checked="${i ? 'false' : 'true'}" tabindex="${i ? -1 : 0}" data-variant="${i}">
              <b>${esc(v.label)}</b>${dupLabel && v.code ? `<small class="opt__code">${esc(v.code)}</small>` : ''}<small>${czkOr(v.price)}</small>
            </button>`).join('')}
        </div>
      </div>` : '';

    const mountGroup = `
      <div class="config__group">
        <p class="config__label">Uchycení</p>
        <p class="config__fixed">
          <span>${mountLabel(p) ? `<b>${esc(mountLabel(p))}</b>` : 'upřesníme podle vašeho stroje'}</span>
          <a class="config__fixed-more" href="#uchyceni">Podrobnosti</a>
        </p>
      </div>`;

    const extrasGroup = extras.length ? `
      <div class="config__group">
        <p class="config__label">Příplatková výbava <span class="config__hint">volitelně</span></p>
        <div class="config__extras">
        ${extras.map((e, i) => `
          <label class="check config__extra"><input type="checkbox" data-extra="${i}">
            <span>${esc(e.name)}${e.note ? `<small>${esc(e.note)}</small>` : ''}</span>
            <span class="count">${hasPrice(e.price) ? '+ ' + czk(e.price) : 'na dotaz'}</span></label>`).join('')}
        </div>
      </div>` : '';

    /* --- informační bloky --- */
    const descBlock = descItems.length ? `<div class="detail__block">
          <h2>Popis</h2>
          <ul class="desc-list${descItems.some(l => l.length > 140) ? ' desc-list--prose' : ''}">${descItems.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
        </div>` : '';

    const variantTable = nVar > 1 ? (() => {
      const keys = [...new Set(variants.flatMap(v => Object.keys(v.specs || {})))];
      const hasCode = variants.some(v => v.code);
      const colsT = keys.length ? keys : [vLabel];
      // sloupec, který variantu pojmenuje (na mobilu nadpis karty)
      const keyIdx = Math.max(0, colsT.indexOf(vLabel));
      const cell = (v, k) => keys.length ? (v.specs || {})[k] : v.label;
      return `<div class="detail__block">
        <h2>Přehled variant</h2>
        <div class="table-scroll var-table__wrap"><table class="var-table">
          <thead><tr>${hasCode ? '<th scope="col">Kód</th>' : ''}${colsT.map(k => `<th scope="col">${esc(k)}</th>`).join('')}<th scope="col" class="var-table__price">Cena bez DPH</th></tr></thead>
          <tbody>${variants.map((v, i) => `<tr data-row="${i}"${i ? '' : ' class="is-active"'} title="Vybrat variantu ${esc(v.label)}">${
            hasCode ? `<td class="var-table__code" data-label="Kód">${esc(v.code || '—')}</td>` : ''}${
            colsT.map((k, j) => `<td data-label="${esc(k)}"${j === keyIdx ? ' class="var-table__key"' : ''}>${esc(cell(v, k) || '—')}</td>`).join('')
            }<td class="var-table__price" data-label="Cena bez DPH"><b>${czkOr(v.price)}</b></td></tr>`).join('')}</tbody>
        </table></div>
        <p class="var-table__note">Ceny jsou bez DPH. Kliknutím na řádek variantu vyberete v konfigurátoru.</p>
      </div>`;
    })() : '';

    const drawingList = p.drawings || [];
    const drawings = drawingList.length ? `<div class="detail__block">
        <h2>Technický nákres</h2>
        <div class="drawings${drawingList.length === 1 ? ' drawings--one' : ''}">${drawingList.map((f, i) => `
          <a class="drawing" href="assets/img/nakresy/${encodeURIComponent(f)}" target="_blank" rel="noopener" data-drawing="${i}">
            <img src="assets/img/nakresy/${encodeURIComponent(f)}" alt="Technický nákres ${drawingList.length > 1 ? i + 1 + ' ' : ''}— ${esc(p.name)}" loading="lazy">
            <span class="drawing__zoom">${I.zoom} Zvětšit</span>
          </a>`).join('')}</div>
      </div>` : '';

    const machinesBlock = `<div class="detail__block">
          <h2>Vhodné pro</h2>
          <div class="tag-row">
            ${p.machines.map(m => `<span class="chip chip--neutral">${esc(machineName(m))}</span>`).join('') || '<span class="chip chip--neutral">Upřesníme podle stroje</span>'}
          </div>
        </div>`;

    const code0 = variants[0] && variants[0].code;
    root.innerHTML = `
      ${gallery}
      <div class="detail__summary">
        <p class="eyebrow">${esc(catName(p.cat))}</p>
        <h1>${esc(p.name)}</h1>
        <div class="detail__meta">
          <div class="detail__flags">${flags(p)}</div>
          <p class="detail__code" data-code${code0 ? '' : ' hidden'}>Kód: <span>${esc(code0 || '')}</span></p>
        </div>
        ${p.perex ? `<p class="lead detail__perex">${esc(p.perex)}</p>` : ''}

        <div class="config" data-config>
          ${variantGroup}${mountGroup}${extrasGroup}
          <div class="config__sum">
            <div class="detail__price" aria-live="polite">
              <b data-total>${priceLabel(p)}</b><span data-total-vat></span>
            </div>
            <div class="config__buy">
              <div class="qty" role="group" aria-label="Počet kusů">
                <button type="button" data-qty="-1" aria-label="Ubrat kus">${ICON.minus}</button>
                <input type="number" min="1" max="99" value="1" inputmode="numeric" aria-label="Počet kusů" data-qty-input>
                <button type="button" data-qty="1" aria-label="Přidat kus">${ICON.plus}</button>
              </div>
              <button type="button" class="btn" data-add-cart>${ICON.cart} <span data-add-text>Přidat do poptávky</span></button>
            </div>
            <p class="config__note">Poptávka je nezávazná — přesnou cenu, termín a dopravu potvrdíme v nabídce do 24 hodin. <a class="config__tel" href="tel:${SITE.phoneHref}">Nebo zavolejte ${esc(SITE.phone)}</a></p>
          </div>
        </div>
      </div>

      <div class="detail__info">
        <div class="detail__col">
          <div class="detail__block">
            <h2>Technické parametry</h2>
            <table class="spec-table"><tbody data-specs></tbody></table>
          </div>
          ${variantTable}
          ${drawings}
        </div>
        <div class="detail__col">
          ${descBlock}
          ${machinesBlock}
          ${mountBlock(p)}
        </div>
      </div>`;

    /* --- lightbox pro fotky i nákresy --- */
    let lb = $('.detail__lightbox');
    if (!lb) {
      lb = document.createElement('dialog');
      lb.className = 'detail__lightbox';
      lb.setAttribute('aria-label', 'Zvětšený obrázek');
      lb.innerHTML = `
        <figure class="detail__lb-fig"><img alt="" data-lb-img><figcaption data-lb-cap></figcaption></figure>
        <button class="detail__lb-btn detail__lb-close" type="button" aria-label="Zavřít">${ICON.close}</button>
        <button class="detail__lb-btn detail__lb-prev" type="button" data-lb-step="-1" aria-label="Předchozí">${I.prev}</button>
        <button class="detail__lb-btn detail__lb-next" type="button" data-lb-step="1" aria-label="Další">${I.next}</button>`;
      document.body.appendChild(lb);
    }
    const lbImg = $('[data-lb-img]', lb), lbCap = $('[data-lb-cap]', lb);
    let lbList = [], lbIdx = 0;
    function lbShow(i) {
      lbIdx = (i + lbList.length) % lbList.length;
      const it = lbList[lbIdx];
      lbImg.src = it.src; lbImg.alt = it.alt;
      lbCap.textContent = (it.cap || it.alt) + (lbList.length > 1 ? ` · ${lbIdx + 1} / ${lbList.length}` : '');
      $$('[data-lb-step]', lb).forEach(b => { b.hidden = lbList.length < 2; });
    }
    function lbOpen(list, i) {
      lbList = list; lbShow(i);
      if (typeof lb.showModal === 'function') { lb.showModal(); document.documentElement.classList.add('detail-lb-open'); }
      else window.open(list[i].src, '_blank', 'noopener');
    }
    if (!lb.dataset.bound) {
      lb.dataset.bound = '1';
      lb.addEventListener('click', e => {
        const step = e.target.closest('[data-lb-step]');
        if (step) { lbShow(lbIdx + +step.dataset.lbStep); return; }
        if (e.target.closest('.detail__lb-close') || e.target === lb || e.target.classList.contains('detail__lb-fig')) lb.close();
      });
      lb.addEventListener('keydown', e => {
        if (lbList.length < 2) return;
        if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
        if (e.key === 'ArrowLeft')  lbShow(lbIdx - 1);
      });
      lb.addEventListener('close', () => document.documentElement.classList.remove('detail-lb-open'));
    }

    /* --- přepínání fotek v galerii: šipky, náhledy, klávesy, swipe --- */
    const stage = $('[data-stage]', root);
    const stageBox = $('.detail__stage', root);
    let cur = 0;
    const photoList = imgs.map((f, i) => ({ src: photo(f), alt: nImg > 1 ? `${p.name} — fotka ${i + 1} z ${nImg}` : p.name, cap: p.name }));
    function show(i) {
      if (nImg < 2) return;
      cur = (i + nImg) % nImg;
      const src = photo(imgs[cur]);
      if (stage.getAttribute('src') !== src) {
        stage.classList.add('is-swap');
        stage.src = src;
      }
      stage.alt = `${p.name} — fotka ${cur + 1} z ${nImg}`;
      $$('[data-thumb]', root).forEach(b => {
        const on = +b.dataset.thumb === cur;
        b.classList.toggle('is-active', on);
        if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
      const c = $('[data-cur]', root); if (c) c.textContent = cur + 1;
      new Image().src = photo(imgs[(cur + 1) % nImg]); // další fotka dopředu
    }
    stage.addEventListener('load', () => stage.classList.remove('is-swap'));
    stage.addEventListener('error', () => stage.classList.remove('is-swap'));
    $$('[data-thumb]', root).forEach(b => b.addEventListener('click', () => show(+b.dataset.thumb)));
    $$('[data-step]', root).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); show(cur + +b.dataset.step); }));
    if (nImg) stageBox.addEventListener('click', e => {
      if (e.target.closest('[data-step]')) return;
      lbOpen(photoList, cur);
    });
    if (nImg > 1) {
      $('.detail__gallery', root).addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); show(cur - 1); }
      });
      let x0 = null, y0 = null;
      stageBox.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      stageBox.addEventListener('touchend', e => {
        if (x0 == null) return;
        const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          stageBox.dataset.swiped = '1';
          show(cur + (dx < 0 ? 1 : -1));
        }
      });
      // po swipu nechceme zároveň otevřít zvětšení
      stageBox.addEventListener('click', e => {
        if (stageBox.dataset.swiped) { delete stageBox.dataset.swiped; e.stopImmediatePropagation(); }
      }, true);
    }

    const drawList = drawingList.map((f, i) => ({ src: 'assets/img/nakresy/' + encodeURIComponent(f), alt: `Technický nákres${drawingList.length > 1 ? ' ' + (i + 1) : ''} — ${p.name}` }));
    $$('[data-drawing]', root).forEach(a => a.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || typeof lb.showModal !== 'function') return;
      e.preventDefault();
      lbOpen(drawList, +a.dataset.drawing);
    }));

    /* --- konfigurátor --- */
    const cfg = { variant: 0, extras: new Set(), qty: 1 };
    const qtyInput = $('[data-qty-input]', root);

    function current() {
      const v = variants[cfg.variant];
      const base = v ? v.price : p.price;
      const exAdd = [...cfg.extras].reduce((s, i) => s + (hasPrice(extras[i].price) ? extras[i].price : 0), 0);
      return { v, unit: hasPrice(base) ? base + exAdd : null };
    }

    function update() {
      const c = current();
      const specs = Object.assign({}, p.specs, c.v ? c.v.specs : {});
      $('[data-specs]', root).innerHTML = Object.entries(specs)
        .map(([k, val]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(val)}</td></tr>`).join('') ||
        '<tr><td colspan="2" class="spec-table__empty">Parametry upřesníme v nabídce.</td></tr>';
      const total = c.unit * cfg.qty;
      // „od“ jen tam, kde cena opravdu není pevná (bez variant, cena „od“)
      const from = p.priceFrom && nVar < 2;
      // výbava „na dotaz“ — cenu doplníme v nabídce
      const exAsk = [...cfg.extras].some(i => !hasPrice(extras[i].price));
      const qtyTxt = cfg.qty > 1 ? ` · ${cfg.qty} ks` : '';
      if (c.unit == null) {
        $('[data-total]', root).textContent = 'Cena na dotaz';
        $('[data-total-vat]', root).textContent = `přesnou cenu pošleme v nabídce${qtyTxt}`;
      } else {
        $('[data-total]', root).textContent = (from ? 'od ' : '') + czk(total);
        $('[data-total-vat]', root).textContent =
          `bez DPH · ${czk(Math.round(total * 1.21))} s DPH` +
          (cfg.qty > 1 ? ` · ${cfg.qty} × ${czk(c.unit)}` : '') +
          (exAsk ? ' · výbava na dotaz' : '');
      }
      const code = $('[data-code]', root);
      if (code) { code.hidden = !(c.v && c.v.code); $('span', code).textContent = c.v && c.v.code ? c.v.code : ''; }
      $$('[data-row]', root).forEach(r => r.classList.toggle('is-active', +r.dataset.row === cfg.variant));
    }

    function selectVariant(i) {
      cfg.variant = i;
      $$('[data-variant]', root).forEach(x => {
        const on = +x.dataset.variant === i;
        x.setAttribute('aria-checked', on ? 'true' : 'false');
        x.tabIndex = on ? 0 : -1;
      });
      update();
    }
    $$('[data-variant]', root).forEach(b => b.addEventListener('click', () => selectVariant(+b.dataset.variant)));
    // šipky v radiogroup
    const optWrap = $('.config__opts', root);
    if (optWrap) optWrap.addEventListener('keydown', e => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const next = (cfg.variant + dir + nVar) % nVar;
      selectVariant(next);
      $(`[data-variant="${next}"]`, root).focus();
    });
    // řádek v přehledu variant vybere variantu v konfigurátoru
    $$('[data-row]', root).forEach(r => r.addEventListener('click', () => {
      selectVariant(+r.dataset.row);
      const btn = $(`[data-variant="${r.dataset.row}"]`, root);
      const box = $('[data-config]', root).getBoundingClientRect();
      if (btn && (box.bottom < 0 || box.top > window.innerHeight)) {
        // konfigurátor je mimo obrazovku — krátce ukázat, co se vybralo
        r.classList.add('is-picked');
        setTimeout(() => r.classList.remove('is-picked'), 900);
      }
    }));
    $$('[data-extra]', root).forEach(ch => ch.addEventListener('change', () => {
      ch.checked ? cfg.extras.add(+ch.dataset.extra) : cfg.extras.delete(+ch.dataset.extra); update();
    }));
    const setQty = n => { cfg.qty = Math.max(1, Math.min(99, n || 1)); qtyInput.value = cfg.qty; update(); };
    $$('[data-qty]', root).forEach(b => b.addEventListener('click', () => setQty(cfg.qty + +b.dataset.qty)));
    qtyInput.addEventListener('change', () => setQty(parseInt(qtyInput.value, 10)));
    qtyInput.addEventListener('input', () => {
      const n = parseInt(qtyInput.value, 10);
      if (n >= 1 && n <= 99) { cfg.qty = n; update(); }
    });
    qtyInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); setQty(parseInt(qtyInput.value, 10)); } });

    const addBtn = $('[data-add-cart]', root), addText = $('[data-add-text]', root);
    addBtn.addEventListener('click', () => {
      setQty(parseInt(qtyInput.value, 10));
      const c = current();
      const exNames = [...cfg.extras].sort().map(i => extras[i].name);
      const item = {
        id: p.id, name: p.name, img: p.imgs[0] || '_bez-foto.svg',
        variant: c.v ? vLabel + ': ' + c.v.label + (c.v.code ? ' (' + c.v.code + ')' : '') : '',
        mount: p.cat === 'ramy' || p.mount === 'na paletizační vidle' ? (mountLabel(p) || '') : (mountLabel(p) || 'upřesníme podle stroje'),
        extras: exNames,
        unit: c.unit, from: p.priceFrom && nVar < 2,
        qty: cfg.qty
      };
      item.key = [item.id, item.variant, item.mount, exNames.join('+')].join('|');
      Cart.add(item);
      toast(item);
      addBtn.classList.add('is-added');
      addText.textContent = 'Přidáno do poptávky';
      clearTimeout(addBtn.timer);
      addBtn.timer = setTimeout(() => { addBtn.classList.remove('is-added'); addText.textContent = 'Přidat do poptávky'; }, 2200);
    });

    update();

    const rel = $('[data-related]');
    if (rel) {
      const pr = n => hasPrice(n) ? n : 0;
      const list = PRODUCTS
        .filter(x => x.id !== p.id && x.cat === p.cat)
        .sort((a, b) => (b.stock - a.stock) || Math.abs(pr(a.price) - pr(p.price)) - Math.abs(pr(b.price) - pr(p.price)))
        .slice(0, 4);
      rel.innerHTML = list.map(productCard).join('');
      // bez souvisejících produktů celou sekci schovat
      const sec = rel.closest('section');
      if (sec && !list.length) sec.hidden = true;
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
    const variant = item.variant ? (item.variant.split(': ')[1] || item.variant) : '';
    t.innerHTML = `
      <img src="assets/img/nahledy/${esc(item.img)}${IMG_V}" alt="" width="64" height="48">
      <div class="toast__text"><b>Přidáno do poptávky</b><span>${esc(item.name)}${variant ? ' · ' + esc(variant) : ''}${item.qty > 1 ? ' · ' + item.qty + ' ks' : ''}</span></div>
      <a class="btn btn--sm" href="poptavka.html">Poptávka (${n})</a>
      <button class="toast__close" type="button" aria-label="Zavřít">${ICON.close}</button>`;
    $('.toast__close', t).addEventListener('click', () => t.classList.remove('is-open'));
    requestAnimationFrame(() => t.classList.add('is-open'));
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('is-open'), 7000);
  }

  /* ---------- 11. Stránka poptávky (košík) ---------- */
  // součty pro košík i e-mail: položky bez ceny („na dotaz“) se do součtu nepočítají
  function cartTotals(items) {
    const priced = items.filter(i => i.unit != null);
    return {
      sum: priced.reduce((s, i) => s + i.unit * i.qty, 0),
      pcs: items.reduce((s, i) => s + i.qty, 0),
      ask: items.length - priced.length,
      priced: priced.length,
      from: priced.some(i => i.from)
    };
  }

  // text položek do e-mailu — čitelný i v obyčejném textovém klientovi
  function cartLines(items) {
    return items.map((i, n) => [
      `${n + 1}) ${i.name}`,
      i.variant ? '   ' + i.variant : '',
      i.mount ? '   Uchycení adaptéru: ' + i.mount : '',
      i.extras.length ? '   Výbava: ' + i.extras.join(', ') : '',
      '   Množství: ' + i.qty + ' ks',
      i.unit == null ? '   Cena: na dotaz'
        : '   Cena orientačně: ' + (i.from ? 'od ' : '') + (i.qty > 1 ? `${i.qty} × ${czk(i.unit)} = ` : '') + czk(i.unit * i.qty) + ' bez DPH'
    ].filter(Boolean).join('\n')).join('\n\n');
  }

  function initCartPage() {
    const wrap = $('[data-cart]');
    if (!wrap) return;
    const layout = wrap.closest('.cart-layout');
    const live = $('[data-cart-live]');
    const say = t => { if (live) { live.textContent = ''; setTimeout(() => { live.textContent = t; }, 60); } };
    const ask = n => n + ' ' + plural(n, 'položka', 'položky', 'položek');

    function render() {
      const items = Cart.read();
      const t = cartTotals(items);
      $$('[data-cart-filled]').forEach(el => el.hidden = !items.length);
      if (layout) layout.classList.toggle('is-empty', !items.length);
      if (!items.length) {
        wrap.innerHTML = `<div class="empty cart-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
          <h2 class="cart-empty__title" tabindex="-1">Poptávka je zatím prázdná</h2>
          <p class="cart-empty__text">V katalogu otevřete adaptér, vyberte variantu (šířku, počet kusů) a klikněte na „Přidat do poptávky“. Do jedné poptávky můžete dát víc adaptérů.</p>
          <p class="cart-empty__actions"><a class="btn" href="katalog.html">Vybrat v katalogu</a><a class="btn btn--ghost" href="kontakt.html">Napsat bez výběru</a></p>
          <p class="cart-empty__tel">Nebo zavolejte <a href="tel:${esc(SITE.phoneHref)}">${esc(SITE.phone)}</a> (${esc(SITE.hours)}).</p>
        </div>`;
        return;
      }
      wrap.innerHTML = `
        <h2 class="cart-head">Vybrané adaptéry <span>${ask(items.length)} · ${t.pcs} ks</span></h2>
        <ul class="cart-list">
          ${items.map((i, n) => {
            const href = 'produkt.html?id=' + encodeURIComponent(i.id || '');
            const qid = 'cqty-' + n;
            return `
            <li class="cart-item">
              <a class="cart-item__img" href="${href}" tabindex="-1" aria-hidden="true"><img src="assets/img/nahledy/${esc(i.img || '_bez-foto.svg')}${IMG_V}" alt="" width="120" height="90" loading="lazy"></a>
              <div class="cart-item__body">
                <a class="cart-item__name" href="${href}">${esc(i.name)}</a>
                <ul class="cart-item__meta">
                  ${i.variant ? `<li>${esc(i.variant)}</li>` : ''}
                  ${i.mount ? `<li>Uchycení: ${esc(i.mount)}</li>` : ''}
                  ${i.extras.length ? `<li>Výbava: ${esc(i.extras.join(', '))}</li>` : ''}
                </ul>
              </div>
              <div class="qty qty--sm cart-item__qty" role="group" aria-label="Počet kusů — ${esc(i.name)}">
                <button type="button" data-cqty="${n}" data-d="-1" aria-label="Ubrat kus" ${i.qty <= 1 ? 'disabled' : ''}>${ICON.minus}</button>
                <input type="number" id="${qid}" min="1" max="99" step="1" inputmode="numeric" value="${i.qty}" data-cqty-input="${n}" aria-label="Počet kusů — ${esc(i.name)}">
                <button type="button" data-cqty="${n}" data-d="1" aria-label="Přidat kus" ${i.qty >= 99 ? 'disabled' : ''}>${ICON.plus}</button>
              </div>
              <div class="cart-item__price">${i.unit == null
                ? '<b>Na dotaz</b><small>cenu pošleme</small>'
                : `<b>${i.from ? 'od ' : ''}${czk(i.unit * i.qty)}</b><small>${i.qty > 1 ? i.qty + ' × ' + czk(i.unit) : 'bez DPH'}</small>`}</div>
              <button class="cart-item__remove" type="button" data-remove="${n}" aria-label="Odebrat z poptávky: ${esc(i.name)}" title="Odebrat z poptávky">${ICON.trash}</button>
            </li>`; }).join('')}
        </ul>
        <div class="cart-sum">
          ${t.priced ? `<div>
            <span>Orientační cena celkem</span>
            <b>${t.from ? 'od ' : ''}${czk(t.sum)}</b>
            <small>bez DPH · ${czk(Math.round(t.sum * 1.21))} s DPH</small>
            ${t.ask ? `<small class="cart-sum__ask">+ ${ask(t.ask)} na dotaz — cenu doplníme v nabídce</small>` : ''}
          </div>` : `<div>
            <span>Cena</span>
            <b>Na dotaz</b>
            <small>Ceny vybraných adaptérů pošleme v nabídce.</small>
          </div>`}
          <p>Přesnou cenu, termín a dopravu potvrdíme v nabídce. Poptávka je nezávazná.</p>
          <div class="cart-sum__actions">
            <a class="btn btn--light btn--sm" href="katalog.html">Přidat další adaptér</a>
            <button class="btn btn--ghost btn--sm" type="button" data-cart-clear>Vyprázdnit poptávku</button>
          </div>
        </div>`;
    }

    // po překreslení vrátit fokus tam, kde uživatel byl (klávesnice, čtečky)
    function refocus(sel) { const el = sel && $(sel, wrap); if (el) el.focus(); }

    wrap.addEventListener('click', e => {
      const q = e.target.closest('[data-cqty]'), r = e.target.closest('[data-remove]'), c = e.target.closest('[data-cart-clear]');
      if (!q && !r && !c) return;
      const items = Cart.read();
      if (q) {
        const n = +q.dataset.cqty, it = items[n];
        if (!it) return;
        it.qty = Math.max(1, Math.min(99, it.qty + +q.dataset.d));
        Cart.write(items); render();
        say(`${it.name}: ${it.qty} ks`);
        const same = $(`[data-cqty="${n}"][data-d="${q.dataset.d}"]`, wrap);
        refocus(same && !same.disabled ? `[data-cqty="${n}"][data-d="${q.dataset.d}"]` : `[data-cqty-input="${n}"]`);
      }
      if (r) {
        const n = +r.dataset.remove, it = items[n];
        if (!it) return;
        items.splice(n, 1); Cart.write(items); render();
        say(`Odebráno z poptávky: ${it.name}.` + (items.length ? '' : ' Poptávka je prázdná.'));
        refocus(items.length ? `[data-remove="${Math.min(n, items.length - 1)}"]` : '.cart-empty__title');
      }
      if (c && confirm('Opravdu vyprázdnit celou poptávku?')) {
        Cart.write([]); render(); say('Poptávka je prázdná.'); refocus('.cart-empty__title');
      }
    });
    wrap.addEventListener('change', e => {
      const inp = e.target.closest('[data-cqty-input]');
      if (!inp) return;
      const items = Cart.read(), n = +inp.dataset.cqtyInput;
      if (!items[n]) return;
      const v = parseInt(inp.value, 10);
      // prázdné / nesmyslné zadání vrátí původní počet, jinak 1–99
      if (!isNaN(v)) items[n].qty = Math.max(1, Math.min(99, v));
      Cart.write(items); render();
      say(`${items[n].name}: ${items[n].qty} ks`);
      refocus(`[data-cqty-input="${n}"]`);
    });
    // Enter v poli s počtem kusů nemá odeslat nic jiného — jen potvrdit hodnotu
    wrap.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.matches('[data-cqty-input]')) { e.preventDefault(); e.target.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    // košík změněný v jiné záložce
    window.addEventListener('storage', e => { if (e.key === 'adaptery-poptavka-v1') render(); });
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
      MOUNTS.forEach(m => sel.add(new Option(m.name + (m.note ? ' (' + m.note + ')' : ''), m.name + (m.note ? ' (' + m.note + ')' : ''))));
      sel.add(new Option('Nevím — poraďte mi', 'nevím, prosím o radu'));
    }

    /* --- validace: chyba u konkrétního pole, ne jen souhrnná hláška --- */
    const val = f => (f.value || '').trim();
    const RULES = [
      ['jmeno', f => val(f) ? '' : 'Vyplňte jméno a příjmení.'],
      ['email', f => !val(f) ? 'Vyplňte e-mail, na který pošleme nabídku.'
        : /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(val(f)) ? '' : 'E-mail nemá správný tvar (např. jan@novak.cz).'],
      ['telefon', f => !val(f) || val(f).replace(/\D/g, '').length >= 9 ? '' : 'Telefon zadejte celý (aspoň 9 číslic), nebo pole nechte prázdné.'],
      ['zprava', f => !f.required || val(f) ? '' : 'Napište, co potřebujete.'],
      ['gdpr', f => f.checked ? '' : 'Bez souhlasu nemůžeme poptávku vyřídit.']
    ];
    const LABEL = { jmeno: 'Jméno', email: 'E-mail', telefon: 'Telefon', zprava: 'Co potřebujete', gdpr: 'Souhlas' };

    function setError(f, text) {
      const box = f.closest('.field, .check');
      if (!box) return;
      let err = $('.field__error', box);
      if (text) {
        if (!err) {
          err = document.createElement('span');
          err.className = 'field__error';
          err.id = 'err-' + f.name;
          err.setAttribute('aria-hidden', 'true'); // čte se přes aria-describedby, ne jako součást popisku
          box.appendChild(err);
        }
        err.textContent = text;
        f.setAttribute('aria-invalid', 'true');
        f.setAttribute('aria-describedby', [f.dataset.hint, err.id].filter(Boolean).join(' '));
      } else {
        if (err) err.remove();
        f.removeAttribute('aria-invalid');
        if (f.dataset.hint) f.setAttribute('aria-describedby', f.dataset.hint); else f.removeAttribute('aria-describedby');
      }
      box.classList.toggle(box.classList.contains('check') ? 'check--error' : 'field--error', !!text);
    }
    function check(f) {
      const rule = RULES.find(r => r[0] === f.name);
      if (!rule) return '';
      const text = rule[1](f);
      setError(f, text);
      return text;
    }
    // nápovědy pod poli propojit s polem, ať je čtečka přečte
    $$('.field__hint[id]', form).forEach(h => {
      const f = $('input, select, textarea', h.closest('.field'));
      if (f) { f.dataset.hint = h.id; f.setAttribute('aria-describedby', h.id); }
    });
    // chybu opravenou při psaní hned schovat; nová chyba se ukáže až při opuštění pole
    form.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true') check(e.target); });
    form.addEventListener('change', e => { if (e.target.getAttribute('aria-invalid') === 'true') check(e.target); });
    form.addEventListener('focusout', e => { if (e.target.name && e.target.type !== 'checkbox' && val(e.target)) check(e.target); });

    const status = $('.form-status', form);
    const btn = $('[type="submit"]', form);

    function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove();
      return ok ? Promise.resolve() : Promise.reject();
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      status.className = 'form-status';
      status.textContent = '';

      const items = withCart ? Cart.read() : [];
      if (withCart && !items.length) {
        status.classList.add('is-err');
        status.textContent = 'Poptávka je prázdná — nejdřív přidejte adaptér z katalogu.';
        return;
      }

      const bad = RULES.map(r => form.elements[r[0]]).filter(f => f && check(f));
      if (bad.length) {
        status.classList.add('is-err');
        status.textContent = bad.length === 1
          ? 'Opravte prosím zvýrazněné pole: ' + LABEL[bad[0].name] + '.'
          : 'Opravte prosím zvýrazněná pole: ' + bad.map(f => LABEL[f.name]).join(', ') + '.';
        bad[0].focus();
        return;
      }

      // Bez backendu: otevře e-mailového klienta s předvyplněnou poptávkou.
      const d = new FormData(form);
      const g = k => String(d.get(k) || '').trim();
      const t = cartTotals(items);
      const total = !withCart ? ''
        : t.priced
          ? `Orientačně celkem: ${t.from ? 'od ' : ''}${czk(t.sum)} bez DPH` + (t.ask ? ` + ${t.ask} ${plural(t.ask, 'položka', 'položky', 'položek')} na dotaz` : '')
          : 'Cena: všechny položky na dotaz';
      const lines = [
        'Kontakt',
        'Jméno: ' + g('jmeno'),
        'Firma: ' + (g('firma') || '—'),
        'E-mail: ' + g('email'),
        'Telefon: ' + (g('telefon') || '—'),
        'Stroj: ' + (g('stroj') || '—')
      ];
      if (d.has('uchyceni')) lines.push('Uchycení na stroji: ' + (g('uchyceni') || 'neuvedeno'));
      if (withCart) lines.push('', `Poptávané adaptéry (${items.length} ${plural(items.length, 'položka', 'položky', 'položek')}, ${t.pcs} ks):`, '', cartLines(items), '', total);
      lines.push('', withCart ? 'Poznámka:' : 'Zpráva:', g('zprava') || '—');
      const body = lines.join('\n');

      const subject = (withCart ? 'Poptávka adaptérů z webu — ' : 'Poptávka z webu — ') + g('jmeno') + (g('firma') ? ', ' + g('firma') : '');
      const href = 'mailto:' + SITE.email
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body.replace(/\n/g, '\r\n'));

      status.classList.add('is-ok');
      status.innerHTML = `<b>Otevřeli jsme vám e-mail s hotovou poptávkou — zkontrolujte ho a odešlete.</b>
        Ozveme se do 24 hodin v pracovní dny.
        <span class="form-status__more">Nic se neotevřelo? Zkopírujte text a pošlete ho na <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>, nebo zavolejte <a href="tel:${esc(SITE.phoneHref)}">${esc(SITE.phone)}</a>.</span>
        <span class="form-status__actions">
          <a class="btn btn--ghost btn--sm" href="${esc(href)}" data-mailto>Otevřít e-mail znovu</a>
          <button class="btn btn--ghost btn--sm" type="button" data-copy>Zkopírovat text poptávky</button>
        </span>`;
      $('[data-copy]', status).addEventListener('click', ev => {
        const b = ev.currentTarget;
        copyText('Komu: ' + SITE.email + '\nPředmět: ' + subject + '\n\n' + body)
          .then(() => { b.textContent = 'Zkopírováno ✓'; }, () => { b.textContent = 'Kopírování se nepovedlo'; });
      });
      if (btn) btn.blur();
      $('[data-mailto]', status).click();
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
