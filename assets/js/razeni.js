/* =========================================================
   Řazení produktů podle velikosti — sdílí katalog (main.js) i tištěný katalog.
   Klíč: 1) nejmenší šířka (m) z produktu a jeho variant, při shodě větší šířka,
         2) bez šířky: hmotnost (kg), u rámů a zvedacích zařízení nosnost/zdvih (kg), druhá hodnota je záloha,
         4) bez rozměru: cena, „na dotaz“ poslední. Dál podle názvu.
   ========================================================= */
const ProductSort = (() => {
  const WIDTH_KEYS = ['Šířka', 'Pracovní záběr', 'Šířka lopaty', 'Rozpětí', 'Rozměr'];
  const CAP_KEYS = ['Nosnost', 'Zdvih'];
  const WEIGHT_KEYS = ['Hmotnost', 'Max hmotnost', 'Min hmotnost'];

  // všechna čísla s jednotkou v řetězci („1,4–2,0 m“, „1200 mm“, „2,5 t“); jednotka se bere z konce
  function numbers(str, units) {
    const s = String(str || '').replace(/ /g, ' ');
    const m = s.match(/(\d[\d ]*(?:[.,]\d+)?)\s*(?:[–—-]\s*(\d[\d ]*(?:[.,]\d+)?))?\s*(mm|cm|m|kg|t)\b/i);
    if (!m) return [];
    const unit = m[3].toLowerCase(), k = units[unit];
    if (!k) return [];
    return [m[1], m[2]].filter(Boolean).map(x => parseFloat(x.replace(/\s/g, '').replace(',', '.')) * k);
  }
  const LEN = { mm: 0.001, cm: 0.01, m: 1 };
  const MASS = { kg: 1, t: 1000 };

  function specSets(p) {
    return [p.specs || {}, ...(p.variants || []).map(v => v.specs || {})];
  }
  function values(p, keys, units) {
    const out = [];
    specSets(p).forEach(s => keys.forEach(k => { if (s[k]) out.push(...numbers(s[k], units)); }));
    return out;
  }
  // šířka z popisku varianty, pokud je popisek šířka
  function labelWidths(p) {
    if (!p.variantLabel || !WIDTH_KEYS.includes(p.variantLabel)) return [];
    return (p.variants || []).flatMap(v => numbers(v.label, LEN));
  }
  // míchače a samonakládací lopaty nesou rozměr v názvu (600 / 800 / 1200 mm)
  function nameWidth(p) {
    const m = /\b(600|800|1200)\b/.exec(p.name || '');
    return m && p.cat === 'stavebni' ? [+m[1] * 0.001] : [];
  }

  function sizeOf(p) {
    let v = [...values(p, WIDTH_KEYS, LEN), ...labelWidths(p)].filter(x => x > 0.2 && x < 10);
    if (!v.length) v = nameWidth(p);
    if (v.length) return { tier: 0, min: Math.min(...v), max: Math.max(...v), unit: 'm' };
    // bez šířky: u rámů a zvedacích zařízení nosnost (zdvih), jinde hmotnost; druhá hodnota je záloha
    const order = (p.cat === 'ramy' || p.cat === 'zvedaci') ? [CAP_KEYS, WEIGHT_KEYS] : [WEIGHT_KEYS, CAP_KEYS];
    for (let i = 0; i < order.length; i++) {
      v = values(p, order[i], MASS);
      if (v.length) return { tier: 1 + i, min: Math.min(...v), max: Math.max(...v), unit: 'kg' };
    }
    return { tier: 3, min: 0, max: 0, unit: '' };
  }

  const cache = new Map();
  const size = p => { let s = cache.get(p.id); if (!s) cache.set(p.id, s = sizeOf(p)); return s; };
  const price = p => (typeof p.price === 'number' && p.price > 0) ? p.price : Infinity;
  const num = x => (x === Infinity ? 1e15 : x);

  // od nejmenší po největší (uvnitř jedné kategorie)
  function compare(a, b) {
    const x = size(a), y = size(b);
    return (x.tier - y.tier) || (x.min - y.min) || (x.max - y.max) ||
      (num(price(a)) - num(price(b))) || String(a.name).localeCompare(b.name, 'cs');
  }
  // od největší velikosti; produkty bez rozměru zůstávají na konci
  function compareDesc(a, b) {
    const x = size(a), y = size(b);
    return (x.tier - y.tier) || (y.min - x.min) || (y.max - x.max) ||
      (num(price(a)) - num(price(b))) || String(a.name).localeCompare(b.name, 'cs');
  }
  // po kategoriích (v pořadí CATEGORIES) a v nich podle zvolené funkce (výchozí: od nejmenší velikosti)
  function byCategory(cats, cmp) {
    const co = new Map(cats.map((c, i) => [c.id, i]));
    return (a, b) => ((co.get(a.cat) ?? 999) - (co.get(b.cat) ?? 999)) || (cmp || compare)(a, b);
  }
  return { size, compare, compareDesc, byCategory };
})();
