# adapterypronakladace.cz — prezentační web

Statický web (HTML + CSS + JS, žádný build, žádné závislosti).
Nahraje se na jakýkoli hosting přes FTP — stačí zkopírovat obsah složky.

## Struktura

```
index.html        úvodní stránka
katalog.html      katalog s filtrováním (kategorie, typ stroje, skladem, hledání, řazení)
produkt.html      detail produktu s konfigurátorem (šířka, uchycení, výbava), načítá se podle ?id=
poptavka.html     poptávkový košík — vybrané adaptéry + formulář
katalog-tisk.html listovací / tištěný katalog A4, skládá se z data.js
na-miru.html      zakázková výroba — postup, typické úpravy
o-nas.html        o firmě, značky v nabídce, FAQ
kontakt.html      poptávkový formulář, kontakty, mapa
assets/css/       styly
assets/js/data.js OBSAH KATALOGU — tady se edituje
assets/js/main.js logika (navigace, filtry, konfigurátor, košík, formuláře)
assets/img/       loga, ilustrace, fotky produktů
assets/katalog-adaptery-pro-nakladace.pdf   katalog ke stažení (vyrobený z katalog-tisk.html)
robots.txt, sitemap.xml
```

## Logo a značka

Logo je logo **Agripol**, jen místo nápisu AGRIPOL je v šedém pruhu
**ADAPTÉRY** a pod ním **PRO NAKLADAČE** (domluveno na schůzce s klientem).
Tvar drápu, stín a pruh jsou obkreslené z originálního loga z agripol.cz,
texty jsou převedené na křivky (písmo Saira Semi Condensed / Saira Condensed),
takže se všude vysází stejně — i v tiskárně.

| soubor | k čemu |
|---|---|
| `assets/img/logo-full.svg` | celé logo na světlé pozadí (hlavička, katalog) |
| `assets/img/logo-full-white.svg` | celé logo na tmavé pozadí (patička, titulka katalogu) |
| `assets/img/logo.svg` | jen dráp s pruhem, barevně |
| `assets/img/logo-silhouette.svg` | bílá silueta drápu s prořezy (zatím nepoužitá — za fotkou na úvodu se klientovi nelíbila) |
| `assets/img/logo-mark-white.svg` | totéž jako silueta, napevno bílá — na tmavé pozadí i přes `<img>` |
| `assets/img/logo-mark-mono.svg` | silueta, dědí barvu přes `currentColor` — funguje **jen vložená přímo do HTML**; do razítka a na výrobní štítek |
| `assets/img/favicon.svg`, `apple-touch-icon.png` | ikona: bílý dráp na červeném čtverci |
| `assets/img/og-image.png` | 1200×630, náhled při sdílení na Facebooku a v Messengeru |

Barvy podle Agripolu: červená `#C8191F` (na tmavém podkladu světlejší `#F0484D`),
grafit `#1F2023`, šedá z pruhu `#A3A3A3`, text `#1E1F22`.
Písmo Barlow Condensed 700 (nadpisy), Inter (běžný text).

Úvodní fotka je vyříznutý render drapáku InterTech (`assets/img/hero-drapak.webp`,
průhledné pozadí) na grafitu s červeným pruhem, bez loga v pozadí. Až bude fotka
adaptéru se skutečně vypáleným logem Agripol, stačí ji vyříznout a nahradit tenhle soubor.

Sdílecí obrázek se nepřegeneruje sám — když se změní texty, je potřeba ho
vyrobit znovu (HTML předloha 1200×630 vyrenderovaná headless Chromem
do `assets/img/og-image.png`).

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

Katalog má 75 produktů v deseti kategoriích (pořadí ze schůzky): lopaty,
manipulace s balíky, siláž/senáž/mrva, stavební adaptéry, krmné lopaty, lesní
nářadí, redukční rámy, komunální adaptéry, zvedací zařízení, ostatní.
Krmné lopaty a komunální adaptéry jsou zatím prázdné — na webu se ukážou jako
„připravujeme“ s odkazem na poptávku. Podklady (názvy, ceny, parametry, popisy,
fotky) pocházejí z **agripol.cz/adaptery** — viz „Původ podkladů" níže.

**Pořadí:** pořadí produktů v `data.js` = pořadí v katalogu i v tištěném katalogu.
V každé kategorii jsou seřazené od největšího po nejmenší (např. kleště na klády
INTER-TECH → Spaw-met). Nový produkt vložte na správné místo v poli.

Vše se edituje v `assets/js/data.js`. Produkt vypadá takhle:

```js
{
  id: "lopata-univerzalni-waw-pol",   // použije se v URL: produkt.html?id=...
  name: "Lopata univerzální Waw-Pol",
  cat: "lopaty", price: 9000, priceFrom: true,   // priceFrom → zobrazí „od 9 000 Kč"
  stock: true, sale: false, avail: "Skladem",    // avail: Skladem / Na objednávku / Na cestě / Akční cena
  machines: ["nakladac","manipulator"],          // id z pole MACHINES (nakladac, manipulator, mininakladac)
  mounts: ["euro"],                              // uchycení, se kterými se dodává (id z MOUNTS)
  mount: "EURO", mountExtra: 6000,               // s jakým uchycením platí cena, příplatek za jiné (null = na dotaz)
  specs: {"Hmotnost":"182 kg"},                  // tabulka parametrů, může být prázdná
  perex: "Úvodní věta do detailu.",              // prázdná = nezobrazí se
  desc: ["-hardox břit"],                        // odrážky „Popis“
  variantLabel: "Šířka",                         // nadpis výběru v konfigurátoru
  variants: [                                     // klikací varianty; první = výchozí, jeho cena = price
    {"code":"SL00","label":"1,2 m","price":9000,"specs":{"Šířka":"1,2 m","Hmotnost":"130 kg"}},
    {"code":"SL01","label":"1,5 m","price":11000,"specs":{"Šířka":"1,5 m","Hmotnost":"149 kg"}}
  ],
  extras: [{"name":"Omezovač tlaku","price":1500,"note":"redukuje tlak na 200 barů"}],  // zaškrtávací příplatky
  drawings: ["lopata-univerzalni-waw-pol.png"],  // technické nákresy z assets/img/nakresy/
  imgs: ["lopata-univerzalni-waw-pol-1.webp", "...-2.webp"]        // první je hlavní
}
```

**Konfigurátor** v detailu produktu skládá cenu: varianta (šířka) + příplatek
za jiné uchycení + zaškrtnutá výbava, krát počet kusů. Dole u každého produktu
je vždy blok **Uchycení**: s čím platí cena, kolik stojí jiné uchycení
a obrázek příkladu uchycení EURO (`assets/img/uchyceni-euro.svg`).

**Technické nákresy:** zatím žádné nejsou. Stačí nahrát obrázek (PNG/SVG/JPG)
do `assets/img/nakresy/` a jméno souboru zapsat do `drawings` — nákres se ukáže
v detailu produktu a v tištěném katalogu vpravo od fotky (místo druhé fotky).

Obrázky se hledají ve dvou složkách se stejným názvem souboru:

| složka | k čemu | rozměr |
|---|---|---|
| `assets/img/nahledy/` | karty v katalogu a na úvodu, náhledy v galerii | max 500 px |
| `assets/img/produkty/` | velká fotka na detailu | max 900 px |

Když produkt nemá fotku, nastav `imgs: ["_bez-foto.svg"]` — vykreslí se
šedý placeholder „Fotografii připravujeme".

Katalog, filtry, počty u filtrů, konfigurátor, sitemap i související produkty
se dopočítají samy.

## Původ podkladů

Texty, ceny, parametry a fotky jsou převzaté z **agripol.cz/adaptery** — vlastního
webu provozovatele, takže po právní stránce není co řešit.

Kategorie na agripol.cz jsou stránkované po 15 položkách. Při doplňování obsahu
z toho webu je potřeba projít i druhé stránky (`?xxxxxxxx_page=2`), jinak
u „Lopat" a „Siláže a mrvy" část produktů chybí.

Na fotkách je logo **AGRIPOL SERVIS** a u některých strojů logo výrobce
**InterTech** — obojí je v pořádku a zůstává.

## Tištěný katalog (PDF)

`katalog-tisk.html` je katalog po stránkách A4 jako papírový katalog Adapra:
titulka, obsah, dva produkty na stranu (fotka, nákres nebo druhá fotka,
tabulka variant s cenami, výbava v ceně, doplňková výbava), každá kategorie
od nové strany. Na webu se dá listovat, vytisknout, nebo stáhnout jako PDF
(`assets/katalog-adaptery-pro-nakladace.pdf`).

PDF se **nepřegeneruje samo** — po změně `data.js` ho vyrobte znovu:

```bash
# 1) JPEG kopie fotek (PDF je pak ~7 MB místo desítek MB); složka tisk/ se necommituje
mkdir -p assets/img/tisk && for f in assets/img/produkty/*.webp; do
  magick "$f" -background white -alpha remove -resize '720x720>' -quality 74 "assets/img/tisk/$(basename "${f%.webp}").jpg"; done
# 2) lokální server a tisk do PDF
python3 -m http.server 8765 &
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
  --virtual-time-budget=15000 --run-all-compositor-stages-before-draw \
  --print-to-pdf=assets/katalog-adaptery-pro-nakladace.pdf "http://localhost:8765/katalog-tisk.html?jpg=1"
```

Náhled titulky na úvodu je `assets/img/katalog-titulka.webp` (první strana PDF, 600 px).

## Poptávkový košík

V detailu produktu „Přidat do poptávky“ uloží vybranou šířku, uchycení,
výbavu a počet kusů do košíku (jen v prohlížeči návštěvníka, `localStorage`).
Počet je vidět v hlavičce u tlačítka **Poptávka**. Na `poptavka.html` se dají
kusy upravit a odeslat — stejně jako kontaktní formulář otevře e-mail
s rozepsanými položkami a orientační cenou (viz níže, jak přepnout na odesílání
přes server).

## Poptávkový formulář

Bez serveru formulář (kontakt i poptávka) otevírá e-mailového klienta s předvyplněnou zprávou.
Pro odesílání přes server stačí v `assets/js/main.js` ve funkci `initForm()`
nahradit blok `window.location.href = 'mailto:...'` voláním vlastního endpointu:

```js
fetch('/odeslat.php', { method: 'POST', body: new FormData(form) })
  .then(r => r.ok ? status.classList.add('is-ok') : Promise.reject())
  .catch(() => status.classList.add('is-err'));
```

## Kde web běží

**Náhled pro klienta:** https://kadlecpetr.github.io/agripol-adaptery-na-nakladace/

Běží z větve `main` přes GitHub Pages. Po každém `git push` se do minuty
přegeneruje sám — není potřeba nic nasazovat ručně.

```bash
git add -A && git commit -m "popis změny" && git push
```

Repozitář je veřejný, protože GitHub Pages na bezplatném účtu jinak
stránku nezveřejní. Obsah je stejně určený k publikaci.

Kanonické adresy v HTML a `sitemap.xml` míří na `www.adapterypronakladace.cz`
— to je záměr, aby si Google náhled na github.io nezaindexoval místo
ostrého webu. Po přesunu na doménu není potřeba nic měnit.

## Lokální náhled

```bash
python3 -m http.server 8080
# http://localhost:8080
```

