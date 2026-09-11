# adapterypronakladace.cz — prezentační web

Statický web (HTML + CSS + JS, žádný build, žádné závislosti).
Nahraje se na jakýkoli hosting přes FTP — stačí zkopírovat obsah složky.

## Struktura

```
index.html        úvodní stránka
katalog.html      katalog s filtrováním (kategorie, uchycení, skladem, hledání, řazení)
produkt.html      detail produktu, načítá se podle ?id=
na-miru.html      zakázková výroba — postup, typické úpravy
o-nas.html        o firmě, značky v nabídce, FAQ
kontakt.html      poptávkový formulář, kontakty, mapa
assets/css/       styly
assets/js/data.js OBSAH KATALOGU — tady se edituje
assets/js/main.js logika (navigace, filtry, formulář)
assets/img/       vlastní SVG ilustrace produktů
robots.txt, sitemap.xml
```

## Logo a značka

Název: **ADAPTÉRY PRO NAKLADAČE**. Značka je hranatá závorka ve tvaru rámu
uchycení — odkaz na to, co adaptér se strojem spojuje.

| soubor | k čemu |
|---|---|
| `assets/img/logo.svg` | značka v zeleném poli (hlavička, patička, apple-touch-icon) |
| `assets/img/favicon.svg` | totéž jako favicon |
| `assets/img/logo-mark-mono.svg` | jen symbol, dědí barvu přes `currentColor` — funguje **jen vložený přímo do HTML**, ne přes `<img>`; do razítka a na výrobní štítek |
| `assets/img/logo-mark-white.svg` | jen symbol, napevno bílý — na tmavé pozadí i přes `<img>` |
| `assets/img/logo-full.svg` | vodorovná verze se jménem — pro dokumenty, podpis v e-mailu, tisk |
| `assets/img/og-image.png` | 1200×630, náhled při sdílení na Facebooku a v Messengeru |

Barvy: zelená `#2E7D32`, na tmavém podkladu světlejší `#7BC47F`, text `#1B1F23`.
Písmo Barlow Condensed 700 (nadpisy a logo), Inter (běžný text).

**Pozor:** `logo-full.svg` má název jako živý text, ne křivky. Pro tiskárnu
je potřeba text převést na křivky (v Illustratoru či Inkscape: Text → Vytvořit obrysy),
jinak se na cizím počítači vysází náhradním písmem.

Sdílecí obrázek se nepřegeneruje sám — když se změní texty, je potřeba ho
vyrobit znovu (viz historie: HTML předloha se vyrenderuje headless Chromem
do `assets/img/og-image.png` v rozměru 1200×630).

## Firemní údaje

Na webu jsou vyplněné skutečné údaje:

| údaj | hodnota |
|---|---|
| provozovatel | Luboš Ehrenberger |
| IČO | 87841461 |
| e-mail | info@agripol.cz |
| telefon | +420 605 434 314 |
| adresa | Telecí 106, 569 94 Telecí, okres Svitavy |

Mění se na dvou místech: v objektu `SITE` na začátku `assets/js/data.js`
a přímo v HTML (hlavička, patička, stránka Kontakt, `<meta>` značky, JSON-LD
na `index.html`). Hromadná záměna:

```bash
grep -rl 'info@agripol.cz' . | xargs sed -i '' 's/info@agripol.cz/novy@email.cz/g'
grep -rl '+420 605 434 314' . | xargs sed -i '' 's/+420 605 434 314/+420 XXX XXX XXX/g'
grep -rl '+420605434314' . | xargs sed -i '' 's/+420605434314/+420XXXXXXXXX/g'
```

**Dvě věci k ověření:** v patičce a na kontaktu je uvedeno „neplátce DPH"
(nedodáno DIČ) — pokud plátce jste, doplňte DIČ. A souřadnice mapy na
`kontakt.html` jsou nastavené na střed obce Telecí, ne na konkrétní adresu;
až budete chtít přesný bod, stačí v odkazu vyměnit `marker=49.6875%2C16.3128`.

## Obsah katalogu

Katalog má 75 produktů v sedmi kategoriích. Podklady (názvy, ceny, parametry,
popisy, fotky) pocházejí z **agripol.cz/adaptery** — viz „Původ podkladů" níže.

Vše se edituje v `assets/js/data.js`. Produkt vypadá takhle:

```js
{
  id: "lopata-univerzalni-waw-pol",   // použije se v URL: produkt.html?id=...
  name: "Lopata univerzální Waw-Pol",
  cat: "lopaty", price: 9000, priceFrom: true,   // priceFrom → zobrazí „od 9 000 Kč"
  stock: true, sale: false, avail: "Skladem",    // avail: Skladem / Na objednávku / Na cestě / Akční cena
  machines: ["nakladac","traktor"],              // id z pole MACHINES
  mounts: ["euro"],                              // id z pole MOUNTS
  specs: {"Šířka":"1,2m","Hmotnost":"182 kg"},   // tabulka parametrů, může být prázdná
  perex: "Jedna věta do detailu.",
  desc: ["-euro úchyt", "Varianty šířek:", "-1,2m....9 000kč"],   // odrážky pod perexem
  imgs: ["lopata-univerzalni-waw-pol-1.webp", "...-2.webp"]        // první je hlavní
}
```

Obrázky se hledají ve dvou složkách se stejným názvem souboru:

| složka | k čemu | rozměr |
|---|---|---|
| `assets/img/nahledy/` | karty v katalogu a na úvodu, náhledy v galerii | max 500 px |
| `assets/img/produkty/` | velká fotka na detailu | max 900 px |

Když produkt nemá fotku, nastav `imgs: ["_bez-foto.svg"]` — vykreslí se
šedý placeholder „Fotografii připravujeme".

Katalog, filtry, počty u filtrů, sitemap i související produkty se dopočítají samy.

## Původ podkladů

Texty, ceny, parametry a fotky jsou převzaté z **agripol.cz/adaptery** — vlastního
webu provozovatele, takže po právní stránce není co řešit.

Kategorie na agripol.cz jsou stránkované po 15 položkách. Při doplňování obsahu
z toho webu je potřeba projít i druhé stránky (`?xxxxxxxx_page=2`), jinak
u „Lopat" a „Siláže a mrvy" část produktů chybí.

Na fotkách je logo **AGRIPOL SERVIS** a u některých strojů logo výrobce
**InterTech** — obojí je v pořádku a zůstává.

## Fotky místo ilustrací

V `assets/img/` jsou vlastní SVG ilustrace. Až budou k dispozici fotky,
stačí je nahrát do stejné složky a v `data.js` přepsat pole `img`
(např. `img: 'lopata-univerzalni.jpg'`). Poměr stran obrázků je 4:3.

## Poptávkový formulář

Bez serveru formulář otevírá e-mailového klienta s předvyplněnou zprávou.
Pro odesílání přes server stačí v `assets/js/main.js` ve funkci `initForm()`
nahradit blok `window.location.href = 'mailto:...'` voláním vlastního endpointu:

```js
fetch('/odeslat.php', { method: 'POST', body: new FormData(form) })
  .then(r => r.ok ? status.classList.add('is-ok') : Promise.reject())
  .catch(() => status.classList.add('is-err'));
```

## Lokální náhled

```bash
python3 -m http.server 8080
# otevřít http://localhost:8080
```
