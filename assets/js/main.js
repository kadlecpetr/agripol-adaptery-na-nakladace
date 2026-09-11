/* =========================================================
   MAIN — navigace, animace, katalog, detail, formulář
   ========================================================= */
(function () {
  'use strict';

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const czk = n => new Intl.NumberFormat('cs-CZ').format(n) + ' Kč';
  const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const catName     = id => (CATEGORIES.find(c => c.id === id) || {}).name || '';
  const mountName   = id => (MOUNTS.find(m => m.id === id)   || {}).name || id;
  const machineName = id => (MACHINES.find(m => m.id === id) || {}).name || id;
  const priceLabel  = p => (p.priceFrom ? 'od ' : '') + czk(p.price);

  const ICON = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
  };

  /* ---------- 1. Hlavička a mobilní menu ---------- */
  function initHeader() {
    const header = $('.header'), burger = $('.burger'), mnav = $('.mobile-nav');
    if (header) {
      const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 12);
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

  function productCard(p) {
    const specs = Object.entries(p.specs).slice(0, 2)
      .map(([k, v]) => `<span>${esc(k)}: ${esc(v)}</span>`).join('');
    return `
      <article class="product" data-reveal>
        <a class="product__link" href="produkt.html?id=${encodeURIComponent(p.id)}" aria-label="${esc(p.name)}"></a>
        <div class="product__media">
          <div class="product__flags">${flags(p)}</div>
          <img src="assets/img/nahledy/${p.imgs[0]}" alt="${esc(p.name)}" loading="lazy" width="500" height="375">
        </div>
        <div class="product__body">
          <p class="product__cat">${esc(catName(p.cat))}</p>
          <h3 class="product__name">${esc(p.name)}</h3>
          <div class="product__specs">${specs}</div>
          <div class="product__foot">
            <div class="product__price"><b>${priceLabel(p)}</b><small>bez DPH</small></div>
            <a class="btn btn--sm btn--ghost product__btn" href="produkt.html?id=${encodeURIComponent(p.id)}" tabindex="-1">Detail ${ICON.arrow}</a>
          </div>
        </div>
      </article>`;
  }

  /* ---------- 6. Homepage ---------- */
  function initHome() {
    const catWrap = $('[data-categories]');
    if (catWrap) {
      catWrap.innerHTML = CATEGORIES.map((c, i) => `
        <a class="cat-card" href="katalog.html?kategorie=${c.id}" data-reveal style="--d:${i * 55}ms">
          <div class="cat-card__img"><img src="assets/img/nahledy/${c.img}" alt="${esc(c.name)}" loading="lazy" width="500" height="375"></div>
          <div class="cat-card__body">
            <h3>${esc(c.name)}</h3>
            <p>${esc(c.desc)}</p>
            <span class="cat-card__count">${PRODUCTS.filter(p => p.cat === c.id).length} produktů</span>
            <span class="cat-card__more">Zobrazit nabídku ${ICON.arrow}</span>
          </div>
        </a>`).join('');
    }

    const topWrap = $('[data-top-products]');
    if (topWrap) {
      // jeden nejdražší skladový kus z každé kategorie, zbytek doplní akce a skladovky
      const pick = [];
      CATEGORIES.forEach(c => {
        const best = PRODUCTS.filter(p => p.cat === c.id && p.stock).sort((a, b) => b.price - a.price)[0];
        if (best) pick.push(best);
      });
      PRODUCTS.filter(p => p.sale && !pick.includes(p)).forEach(p => pick.push(p));
      PRODUCTS.filter(p => p.stock && !pick.includes(p)).forEach(p => pick.push(p));
      topWrap.innerHTML = pick.slice(0, 8).map(productCard).join('');
    }

    const mountWrap = $('[data-mounts]');
    if (mountWrap) {
      mountWrap.innerHTML = MOUNTS.map(m => `
        <a class="mount-pill" href="katalog.html?uchyceni=${m.id}"><b>${esc(m.name)}</b><small>${esc(m.note)}</small></a>`).join('');
    }
    initReveal();
  }

  /* ---------- 7. Katalog ---------- */
  function initCatalog() {
    const grid = $('[data-catalog-grid]');
    if (!grid) return;

    const params = new URLSearchParams(location.search);
    const state = {
      cats:     new Set((params.get('kategorie') || '').split(',').filter(Boolean)),
      machines: new Set((params.get('stroj')     || '').split(',').filter(Boolean)),
      mounts:   new Set((params.get('uchyceni')  || '').split(',').filter(Boolean)),
      stock:  params.get('skladem') === '1',
      q:      params.get('q') || '',
      sort:   params.get('razeni') || 'default'
    };

    const box = {
      cats:     $('[data-filter-cats]'),
      machines: $('[data-filter-machines]'),
      mounts:   $('[data-filter-mounts]')
    };
    const checks = (list, sel, key) => list.map(x => `
      <label class="check"><input type="checkbox" value="${x.id}" ${state[key].has(x.id) ? 'checked' : ''}>
        ${esc(x.name)}<span class="count">${PRODUCTS.filter(sel(x)).length}</span></label>`).join('');

    box.cats.innerHTML     = checks(CATEGORIES, c => p => p.cat === c.id, 'cats');
    box.machines.innerHTML = checks(MACHINES,   m => p => p.machines.includes(m.id), 'machines');
    box.mounts.innerHTML   = checks(MOUNTS,     m => p => p.mounts.includes(m.id), 'mounts');

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
      if (state.mounts.size)   p.set('uchyceni',  [...state.mounts].join(','));
      if (state.stock)         p.set('skladem', '1');
      if (state.q)             p.set('q', state.q);
      if (state.sort !== 'default') p.set('razeni', state.sort);
      const qs = p.toString();
      history.replaceState(null, '', qs ? '?' + qs : location.pathname);
    }

    function render() {
      const list = PRODUCTS.filter(p => {
        if (state.cats.size && !state.cats.has(p.cat)) return false;
        if (state.machines.size && !p.machines.some(m => state.machines.has(m))) return false;
        if (state.mounts.size && !p.mounts.some(m => state.mounts.has(m))) return false;
        if (state.stock && !p.stock) return false;
        if (state.q) {
          const hay = (p.name + ' ' + p.perex + ' ' + p.desc.join(' ') + ' ' + catName(p.cat)).toLowerCase();
          if (!hay.includes(state.q.toLowerCase().trim())) return false;
        }
        return true;
      });

      const sorters = {
        'cena-asc':  (a, b) => a.price - b.price,
        'cena-desc': (a, b) => b.price - a.price,
        'nazev':     (a, b) => a.name.localeCompare(b.name, 'cs'),
        'default':   (a, b) => (b.stock - a.stock) || (b.sale - a.sale) || b.price - a.price
      };
      list.sort(sorters[state.sort] || sorters.default);

      const word = list.length === 1 ? 'produkt' : (list.length < 5 ? 'produkty' : 'produktů');
      $('[data-count]').innerHTML = list.length
        ? `Nalezeno <b>${list.length}</b> ${word}`
        : 'Žádný produkt neodpovídá filtru';

      grid.innerHTML = list.length
        ? list.map(productCard).join('')
        : `<div class="empty">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
             <h3>Nic jsme nenašli</h3>
             <p class="lead">Zkuste zrušit část filtrů nebo nám rovnou napište — velkou část adaptérů dodáváme na míru.</p>
             <p style="margin-top:18px"><a class="btn" href="kontakt.html">Poptat na míru</a></p>
           </div>`;
      grid.classList.toggle('products', list.length > 0);
      grid.classList.toggle('grid', list.length > 0);
      syncUrl();
      initReveal();
    }

    const bind = (el, key) => el.addEventListener('change', e => {
      const v = e.target.value;
      e.target.checked ? state[key].add(v) : state[key].delete(v);
      render();
    });
    bind(box.cats, 'cats'); bind(box.machines, 'machines'); bind(box.mounts, 'mounts');

    stockInput.addEventListener('change', () => { state.stock = stockInput.checked; render(); });
    sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; render(); });

    let t;
    searchInput.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { state.q = searchInput.value; render(); }, 220);
    });

    $('[data-reset]').addEventListener('click', () => {
      state.cats.clear(); state.machines.clear(); state.mounts.clear();
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

  /* ---------- 8. Detail produktu ---------- */
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
    if (meta) meta.setAttribute('content', p.perex.slice(0, 160));

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
            <img src="assets/img/nahledy/${f}" alt="" loading="lazy">
          </button>`).join('')}
      </div>` : '';

    const norm = x => x.toLowerCase().replace(/[^a-z0-9á-ž]/gi, '');
    const sameAsName = !p.perex || norm(p.perex) === norm(p.name);

    const specRows = Object.entries(p.specs)
      .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');

    root.innerHTML = `
      <div class="detail__gallery">
        <div class="detail__stage"><img src="assets/img/produkty/${p.imgs[0]}" alt="${esc(p.name)}" width="900" height="675"></div>
        ${thumbs}
      </div>
      <div>
        <p class="eyebrow">${esc(catName(p.cat))}</p>
        <h1>${esc(p.name)}</h1>
        <div class="detail__flags">${flags(p)}</div>
        ${sameAsName ? '' : `<p class="lead">${esc(p.perex)}</p>`}

        <div class="detail__price">
          <b>${priceLabel(p)}</b><span>bez DPH · ${czk(Math.round(p.price * 1.21))} s DPH</span>
        </div>

        <div class="detail__actions">
          <a class="btn" href="kontakt.html?produkt=${encodeURIComponent(p.name)}">Nezávazná poptávka ${ICON.arrow}</a>
          <a class="btn btn--ghost" href="tel:${SITE.phoneHref}">Zavolat ${SITE.phone}</a>
        </div>

        ${specRows ? `<div class="detail__block">
          <h3>Technické parametry</h3>
          <table class="spec-table"><tbody>${specRows}</tbody></table>
        </div>` : ''}

        ${p.desc.length ? `<div class="detail__block">
          <h3>Popis a varianty</h3>
          <ul class="desc-list">${p.desc.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
        </div>` : ''}

        <div class="detail__block">
          <h3>Vhodné pro</h3>
          <div class="tag-row">
            ${p.machines.map(m => `<span class="chip chip--neutral">${esc(machineName(m))}</span>`).join('') || '<span class="chip chip--neutral">Upřesníme podle stroje</span>'}
          </div>
          ${p.mounts.length ? `<h3 style="margin-top:22px">Uchycení</h3>
          <div class="tag-row">${p.mounts.map(m => `<a class="chip" href="katalog.html?uchyceni=${m}">${esc(mountName(m))}</a>`).join('')}</div>` : ''}
        </div>
      </div>`;

    // přepínání fotek v galerii
    const stage = $('.detail__stage img', root);
    $$('.detail__thumb', root).forEach(b => b.addEventListener('click', () => {
      stage.src = 'assets/img/produkty/' + b.dataset.img;
      $$('.detail__thumb', root).forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
    }));

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

  /* ---------- 9. Poptávkový formulář ---------- */
  function initForm() {
    const form = $('[data-form]');
    if (!form) return;

    const produkt = new URLSearchParams(location.search).get('produkt');
    const msg = $('#zprava', form);
    if (produkt && msg && !msg.value) {
      msg.value = `Dobrý den,\nmám zájem o produkt ${produkt}. Prosím o cenovou nabídku a termín dodání.\n\nDěkuji`;
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
        'Uchycení: ' + (d.get('uchyceni') || '—'),
        '', 'Zpráva:', d.get('zprava')
      ].join('\n');

      window.location.href = 'mailto:' + SITE.email
        + '?subject=' + encodeURIComponent('Poptávka z webu — ' + (d.get('jmeno') || ''))
        + '&body=' + encodeURIComponent(body);

      status.classList.add('is-ok');
      status.textContent = 'Otevřeli jsme vám e-mailového klienta s hotovou poptávkou — stačí odeslat. Ozveme se do 24 hodin.';
    });
  }

  /* ---------- 10. Start ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    initHeader(); initToTop(); initFaq();
    initHome(); initCatalog(); initDetail(); initForm();
    initReveal();
    $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
  });
})();
