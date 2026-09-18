#!/usr/bin/env node
// dist-kontrol.mjs: blog-motoru'nun yayın öncesi deterministik kontrolü.
// Bağımlılığı yok. Sitenin site-profili.md dosyasının YAML başlığını okur, derlenmiş
// dist/ çıktısında verilen sayfaları ve bütün sitenin iç linklerini denetler.
//
// Kullanım:
//   node dist-kontrol.mjs --profil <site>/site-profili.md --sayfa /fr/blog/x/ [--sayfa ...]
//   node dist-kontrol.mjs --profil <site>/site-profili.md --hepsi   (dist'teki bütün sayfalar, kısa çıktı)
//   --dist <klasör>  profildeki komutlar.dist yerine başka bir klasör (test için)
//   --kisa           yalnızca FAIL ve UYARI satırlarını yazar
// Çıkış kodu: 0 = hata yok (uyarı olabilir), 1 = en az bir FAIL, 2 = kullanım ya da profil hatası.

import fs from 'node:fs';
import path from 'node:path';
import { profilOku } from './profil.mjs';

// ---------- argümanlar ----------
const args = process.argv.slice(2);
const opt = { sayfa: [], hepsi: false, kisa: false };
for (let k = 0; k < args.length; k++) {
  const a = args[k];
  if (a === '--profil') opt.profil = args[++k];
  else if (a === '--sayfa') opt.sayfa.push(args[++k]);
  else if (a === '--dist') opt.dist = args[++k];
  else if (a === '--hepsi') opt.hepsi = true;
  else if (a === '--kisa') opt.kisa = true;
  else bitir(2, `Bilinmeyen argüman: ${a}`);
}
if (!opt.profil) bitir(2, 'Kullanım: node dist-kontrol.mjs --profil <site-profili.md> (--sayfa <yol> ... | --hepsi)');
if (!opt.hepsi && opt.sayfa.length === 0) bitir(2, 'En az bir --sayfa ya da --hepsi gerekli.');

function bitir(kod, mesaj) {
  console.log(mesaj);
  process.exit(kod);
}

// ---------- HTML yardımcıları ----------
const VARLIK = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
const coz = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, v) =>
    v[0] === '#'
      ? String.fromCodePoint(v[1].toLowerCase() === 'x' ? parseInt(v.slice(2), 16) : parseInt(v.slice(1), 10))
      : VARLIK[v.toLowerCase()] ?? m,
  );
function oznitelik(etiket, ad) {
  const m = etiket.match(new RegExp(`\\s${ad}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? coz(m[1] ?? m[2] ?? m[3] ?? '') : null;
}
const satirNo = (html, indeks) => html.slice(0, indeks).split('\n').length;
const gorunurMetin = (html) =>
  coz(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ');
const bosluklariTopla = (s) => s.replace(/\s+/g, ' ').trim();

// ---------- ayarlar ----------
let profil;
try {
  profil = profilOku(opt.profil);
} catch (e) {
  bitir(2, e.message);
}
const kok = profil.kok || path.dirname(path.resolve(opt.profil));
const komutlar = profil.komutlar || {};
const kt = profil.kontrol || {};
const siteUrl = String(profil.site_url || '').replace(/\/$/, '');
const dist = path.resolve(kok, opt.dist || komutlar.dist || 'dist');
if (!fs.existsSync(dist)) bitir(2, `dist klasörü yok: ${dist} (önce build çalıştırılmalı)`);

const baslikMax = Number(kt.baslik_max ?? 60);
const metaMax = Number(kt.meta_max ?? 170);
const yasakTerimler = (kt.yasak_terimler || []).map((t) => String(t).toLowerCase());
const yasakDesenler = (kt.yasak_desenler || []).map((d) => {
  try {
    return new RegExp(String(d), 'u');
  } catch {
    bitir(2, `Geçersiz yasak desen: ${d}`);
  }
});
const desenIstisna = new Set((kt.desen_istisna_sayfalar || []).map(yolDuzelt));
const dinamikYollar = (kt.dinamik_yollar || []).map(String);
const semaYasak = new Set((kt.sema_yasak || ['Review', 'AggregateRating']).map(String));
const semaBeklenen = (kt.sema_beklenen || []).map(String);
const isaretler = ['[DOĞRULANMADI', '[À VÉRIFIER', ...(kt.ek_isaretler || []).map(String)];
const zorunluMetin = zorunluMetinOku(kt.zorunlu_metin);

function zorunluMetinOku(tanim) {
  if (!tanim) return null;
  if (typeof tanim === 'object') return tanim;
  // "src/lib/site.ts#DISCLOSURE" biçimi: sabitin içindeki dil: 'metin' çiftleri okunur
  const [dosya, ad] = String(tanim).split('#');
  let kaynak;
  try {
    kaynak = fs.readFileSync(path.resolve(kok, dosya), 'utf8');
  } catch {
    return { hata: `zorunlu metin dosyası okunamadı: ${dosya}` };
  }
  const blok = kaynak.match(new RegExp(`${ad}\\s*=\\s*\\{([\\s\\S]*?)\\}`));
  if (!blok) return { hata: `${dosya} içinde ${ad} = { ... } bulunamadı` };
  const sonuc = {};
  for (const m of blok[1].matchAll(/(\w+)\s*:\s*(['"`])([\s\S]*?)\2/g)) sonuc[m[1]] = m[3];
  return Object.keys(sonuc).length ? sonuc : { hata: `${ad} içinde dil: 'metin' çifti yok` };
}

function yolDuzelt(y) {
  let s = String(y).trim();
  if (siteUrl && s.startsWith(siteUrl)) s = s.slice(siteUrl.length);
  if (!s.startsWith('/')) s = '/' + s;
  if (!path.extname(s) && !s.endsWith('/')) s += '/';
  return s;
}

function icYol(href) {
  if (!href) return null;
  let h = href.trim();
  if (siteUrl && h.startsWith(siteUrl)) h = h.slice(siteUrl.length) || '/';
  if (!h.startsWith('/') || h.startsWith('//')) return null;
  h = h.split('#')[0].split('?')[0];
  try {
    return decodeURI(h) || '/';
  } catch {
    return h || '/';
  }
}

function distDosyasi(yol) {
  const adaylar = yol.endsWith('/') ? [yol + 'index.html'] : [yol, yol + '/index.html', yol + '.html'];
  for (const a of adaylar) {
    const f = path.join(dist, a);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}

function tumHtml(klasor, liste = []) {
  for (const g of fs.readdirSync(klasor, { withFileTypes: true })) {
    const p = path.join(klasor, g.name);
    if (g.isDirectory()) tumHtml(p, liste);
    else if (g.name.endsWith('.html')) liste.push(p);
  }
  return liste;
}
const dosyadanYol = (f) => {
  const r = '/' + path.relative(dist, f).split(path.sep).join('/');
  return r.endsWith('/index.html') ? r.slice(0, -'index.html'.length) : r;
};

function alternatifler(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((m) => m[0])
    .filter((t) => /rel\s*=\s*["']?alternate/i.test(t) && oznitelik(t, 'hreflang'))
    .map((t) => ({ dil: oznitelik(t, 'hreflang'), yol: icYol(oznitelik(t, 'href')) }));
}

function turleriTopla(dugum, liste) {
  if (Array.isArray(dugum)) dugum.forEach((d) => turleriTopla(d, liste));
  else if (dugum && typeof dugum === 'object') {
    if (dugum['@type']) liste.push(dugum);
    Object.values(dugum).forEach((d) => turleriTopla(d, liste));
  }
  return liste;
}

// ---------- sayfa kontrolü ----------
function sayfaKontrol(yol) {
  const sonuc = [];
  const ekle = (durum, ad, detay = '') => sonuc.push({ durum, ad, detay });
  const dosya = distDosyasi(yol);
  if (!dosya) {
    ekle('FAIL', 'var', `dist'te yok: ${yol} (taslak mı kaldı, build mi eski?)`);
    return sonuc;
  }
  ekle('PASS', 'var');
  const html = fs.readFileSync(dosya, 'utf8');
  const dil = (html.match(/<html[^>]*\slang\s*=\s*["']?([\w-]+)/i) || [])[1] || '';

  const h1ler = [...html.matchAll(/<h1[\s>]/gi)];
  if (h1ler.length === 1) ekle('PASS', 'h1');
  else ekle('FAIL', 'h1', `${h1ler.length} adet${h1ler.length ? ' (satır ' + h1ler.map((m) => satirNo(html, m.index)).join(', ') + ')' : ''}`);

  const baslik = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  if (baslik === undefined) ekle('FAIL', 'title', 'yok');
  else {
    const b = bosluklariTopla(coz(baslik));
    if ([...b].length > baslikMax) ekle('FAIL', 'title', `${[...b].length} karakter (sınır ${baslikMax}): "${b}"`);
    else ekle('PASS', 'title', `${[...b].length} karakter`);
  }

  const metaEt = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).find((t) => /name\s*=\s*["']?description/i.test(t));
  const meta = metaEt ? oznitelik(metaEt, 'content') : null;
  if (!meta) ekle('FAIL', 'meta', 'description yok');
  else if ([...meta].length > metaMax) ekle('FAIL', 'meta', `${[...meta].length} karakter (sınır ${metaMax})`);
  else ekle('PASS', 'meta', `${[...meta].length} karakter`);

  const canEt = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).find((t) => /rel\s*=\s*["']?canonical/i.test(t));
  const canonical = canEt ? oznitelik(canEt, 'href') : null;
  if (!canonical) ekle('FAIL', 'canonical', 'yok');
  else if (siteUrl && canonical !== siteUrl + yol) ekle('FAIL', 'canonical', `${canonical} ≠ ${siteUrl + yol}`);
  else ekle('PASS', 'canonical');

  const altlar = alternatifler(html);
  const hreflangSorun = [];
  for (const a of altlar) {
    if (a.dil === 'x-default' || !a.yol || a.yol === yol) continue;
    const f = distDosyasi(a.yol);
    if (!f) hreflangSorun.push(`${a.dil} → ${a.yol} dist'te yok`);
    else if (!alternatifler(fs.readFileSync(f, 'utf8')).some((b) => b.yol === yol)) hreflangSorun.push(`${a.dil} → ${a.yol} geri link vermiyor`);
  }
  if (hreflangSorun.length) ekle('FAIL', 'hreflang', hreflangSorun.join('; '));
  else ekle('PASS', 'hreflang', altlar.map((a) => a.dil).join(',') || 'alternatif yok');

  const ogEt = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).find((t) => /property\s*=\s*["']?og:image["'\s>]/i.test(t));
  const og = ogEt ? icYol(oznitelik(ogEt, 'content')) : null;
  if (!ogEt) ekle('FAIL', 'og:image', 'yok');
  else if (!og || !distDosyasi(og)) ekle('FAIL', 'og:image', `dosya yok: ${oznitelik(ogEt, 'content')}`);
  else ekle('PASS', 'og:image');

  // alt özniteliği hiç yoksa hata. alt="" dekoratif görsel için doğru kullanımdır, sayılır ama geçer.
  const gorseller = [...html.matchAll(/<img\b[^>]*>/gi)];
  const altsiz = gorseller.filter((m) => oznitelik(m[0], 'alt') === null);
  const dekoratif = gorseller.filter((m) => oznitelik(m[0], 'alt') === '').length;
  if (altsiz.length) ekle('FAIL', 'img alt', `${altsiz.length} görselde alt özniteliği yok (satır ${altsiz.map((m) => satirNo(html, m.index)).join(', ')})`);
  else ekle('PASS', 'img alt', `${gorseller.length} görsel${dekoratif ? `, ${dekoratif} dekoratif (alt="")` : ''}`);

  const semaSorun = [];
  const turler = new Set();
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let veri;
    try {
      veri = JSON.parse(m[1]);
    } catch {
      semaSorun.push(`ayrıştırılamadı (satır ${satirNo(html, m.index)})`);
      continue;
    }
    for (const d of turleriTopla(veri, [])) {
      const tip = [].concat(d['@type']).map(String);
      tip.forEach((t) => turler.add(t));
      tip.filter((t) => semaYasak.has(t)).forEach((t) => semaSorun.push(`yasak tip: ${t}`));
      const sayfaTipi = tip.some((t) => /Page$|^(Article|BlogPosting|NewsArticle)$/.test(t) && t !== 'WebSite');
      if (sayfaTipi && d.url && icYol(String(d.url)) !== yol) semaSorun.push(`${tip.join('/')} url ${d.url} bu sayfa değil`);
      if (sayfaTipi && d.inLanguage && dil && String(d.inLanguage) !== dil) semaSorun.push(`${tip.join('/')} inLanguage ${d.inLanguage} ≠ ${dil}`);
    }
  }
  if (semaSorun.length) ekle('FAIL', 'json-ld', semaSorun.join('; '));
  else ekle('PASS', 'json-ld', [...turler].join(',') || 'yok');
  // Beklenen tipler yalnızca adıyla verilen (yeni/değişen) sayfalarda aranır; --hepsi yardımcı sayfalarda gürültü yapar.
  const eksikTur = opt.hepsi ? [] : semaBeklenen.filter((t) => !turler.has(t));
  if (eksikTur.length) ekle('UYARI', 'json-ld', `beklenen tip yok: ${eksikTur.join(', ')}`);

  const kucuk = html.toLowerCase();
  const terimBul = [];
  for (const t of yasakTerimler) {
    let n = kucuk.indexOf(t);
    while (n !== -1) {
      terimBul.push(`"${t}" satır ${satirNo(html, n)}: …${bosluklariTopla(coz(html.slice(Math.max(0, n - 40), n + t.length + 40)))}…`);
      n = kucuk.indexOf(t, n + t.length);
    }
  }
  if (terimBul.length) ekle('FAIL', 'yasak terim', terimBul.slice(0, 5).join(' | ') + (terimBul.length > 5 ? ` (+${terimBul.length - 5})` : ''));
  else ekle('PASS', 'yasak terim');

  if (desenIstisna.has(yol)) ekle('PASS', 'yasak desen', 'istisna sayfa');
  else {
    const metin = gorunurMetin(html);
    const desenBul = [];
    for (const d of yasakDesenler) {
      const m = metin.match(d);
      if (m) desenBul.push(`/${d.source}/: …${metin.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40)}…`);
    }
    if (desenBul.length) ekle('FAIL', 'yasak desen', desenBul.join(' | '));
    else ekle('PASS', 'yasak desen');
  }

  const cozuk = coz(html);
  const kalanIsaret = isaretler.filter((i) => cozuk.includes(i));
  if (kalanIsaret.length) ekle('FAIL', 'işaret', `metinde kalmış: ${kalanIsaret.join(', ')}`);
  else ekle('PASS', 'işaret');

  if (zorunluMetin) {
    if (zorunluMetin.hata) ekle('UYARI', 'zorunlu metin', zorunluMetin.hata);
    else if (!zorunluMetin[dil]) ekle('UYARI', 'zorunlu metin', `"${dil}" dili için tanım yok`);
    else if (!bosluklariTopla(cozuk).includes(bosluklariTopla(zorunluMetin[dil]))) ekle('FAIL', 'zorunlu metin', 'sayfada aynen geçmiyor');
    else ekle('PASS', 'zorunlu metin');
  }

  const kirik = [];
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const y = icYol(oznitelik(m[0], 'href'));
    if (!y || distDosyasi(y) || dinamikYollar.some((d) => y.startsWith(d))) continue;
    kirik.push(`${y} (satır ${satirNo(html, m.index)})`);
  }
  if (kirik.length) ekle('FAIL', 'iç linkler', kirik.join(', '));
  else ekle('PASS', 'iç linkler');
  return sonuc;
}

// ---------- bütün sitenin iç linkleri ----------
function siteLinkleri() {
  const dosyalar = tumHtml(dist);
  let linkSayisi = 0;
  const kirik = [];
  const dinamik = new Set();
  for (const f of dosyalar) {
    const html = fs.readFileSync(f, 'utf8');
    for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
      const y = icYol(oznitelik(m[0], 'href'));
      if (!y) continue;
      linkSayisi++;
      if (distDosyasi(y)) continue;
      if (dinamikYollar.some((d) => y.startsWith(d))) dinamik.add(y);
      else kirik.push(`${dosyadanYol(f)} → ${y}`);
    }
  }
  const satirlar = [];
  if (kirik.length) {
    const tekil = [...new Set(kirik)];
    satirlar.push({ durum: 'FAIL', ad: 'site iç linkleri', detay: `${tekil.length} kırık: ${tekil.slice(0, 15).join('; ')}${tekil.length > 15 ? ' …' : ''}` });
  } else satirlar.push({ durum: 'PASS', ad: 'site iç linkleri', detay: `${linkSayisi} link, ${dosyalar.length} sayfa` });
  if (dinamik.size)
    satirlar.push({ durum: 'UYARI', ad: 'dinamik linkler', detay: `dist'te yok ama dinamik yolda (sunucu üretir, elle bakılmalı): ${[...dinamik].slice(0, 8).join(', ')}${dinamik.size > 8 ? ' …' : ''}` });
  return satirlar;
}

// ---------- çalıştır ----------
// --hepsi, profildeki haric_sayfalar yollarını atlar (yönlendirme, 404, CMS şablonu gibi).
// "/" ile biten uzun yollar önek olarak eşleşir (/blog-shell/ altındaki her şey); "/" ve diğerleri birebir.
const haric = (kt.haric_sayfalar || []).map(String);
const haricMi = (y) => haric.some((h) => (h.length > 1 && h.endsWith('/') ? y.startsWith(h) : y === h));
const sayfalar = opt.hepsi
  ? tumHtml(dist).map(dosyadanYol).filter((y) => !haricMi(y)).sort()
  : opt.sayfa.map(yolDuzelt);
const kisa = opt.kisa || opt.hepsi;
let hata = 0;
let uyari = 0;
const yaz = (r, herZaman = false) => {
  if (r.durum === 'FAIL') hata++;
  if (r.durum === 'UYARI') uyari++;
  if (herZaman || !kisa || r.durum !== 'PASS') console.log(`  ${r.durum.padEnd(5)} ${r.ad}${r.detay ? ': ' + r.detay : ''}`);
};

console.log(`dist-kontrol · ${profil.site || '?'} · ${sayfalar.length} sayfa · ${path.relative(process.cwd(), dist) || dist}`);
for (const y of sayfalar) {
  const sonuc = sayfaKontrol(y);
  if (!kisa || sonuc.some((r) => r.durum !== 'PASS')) console.log(y);
  sonuc.forEach((r) => yaz(r));
}
console.log('SİTE');
siteLinkleri().forEach((r) => yaz(r, true));
console.log(`SONUÇ: ${hata ? 'KALDI' : 'GEÇTİ'} (${hata} hata, ${uyari} uyarı)`);
process.exit(hata ? 1 : 0);
