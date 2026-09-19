#!/usr/bin/env node
// maliyet.mjs: bir oturumun gerçek token kullanımını Claude Code'un oturum dosyalarından çıkarır.
// Claude Code her oturumu ~/.claude/projects/<klasör>/<oturum>.jsonl dosyasına, alt ajanları
// <oturum>/subagents/agent-*.jsonl dosyalarına (rolü yanındaki .meta.json'da) yazar. Bu script onları
// okur, modele ve role göre toplar. Fiyat hesaplamaz, yalnızca token sayar. Bağımlılığı yok.
//
// Kullanım:
//   node maliyet.mjs [--klasor <site klasörü>] [--iz <metin>] [--oturum <uuid | dosya.jsonl>]
//                    [--sonra <zaman>] [--once <zaman>] [--md]
//   --klasor  hangi projenin oturumları (varsayılan: bulunulan klasör)
//   --iz      içinde bu metin geçen en yeni oturum, ör. makalenin slug'ı
//   --oturum  belirli bir oturum
//   --sonra / --once  yalnızca bu aralıktaki çağrılar (ISO zaman, ör. 2026-09-18T19:48Z); bir oturumda
//             birden çok iş yapıldıysa tek bir işi ayırmak için
//   --md      0-kayit.md'ye eklenecek Markdown tablosu olarak yaz
// Çıkış kodu: 0 = tamam, 2 = oturum bulunamadı.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = { klasor: process.cwd(), md: false };
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--klasor') opt.klasor = args[++i];
  else if (args[i] === '--iz') opt.iz = args[++i];
  else if (args[i] === '--oturum') opt.oturum = args[++i];
  else if (args[i] === '--md') opt.md = true;
  else if (args[i] === '--sonra') opt.sonra = zaman(args[++i]);
  else if (args[i] === '--once') opt.once = zaman(args[++i]);
  else bitir(2, `Bilinmeyen argüman: ${args[i]}`);
}

function zaman(z) {
  const t = Date.parse(z);
  if (Number.isNaN(t)) bitir(2, `Zaman anlaşılamadı: ${z} (ör. 2026-09-18T19:48Z)`);
  return t;
}

function bitir(kod, mesaj) {
  console.log(mesaj);
  process.exit(kod);
}

// Claude Code proje klasörünü yolundaki harf ve rakam dışındaki her karakteri "-" yaparak adlandırır.
const projeler = path.join(os.homedir(), '.claude', 'projects');
const projeDizini = path.join(projeler, path.resolve(opt.klasor).replace(/[^A-Za-z0-9]/g, '-'));
if (!fs.existsSync(projeDizini)) bitir(2, `Bu klasör için oturum kaydı yok: ${projeDizini}`);

function oturumBul() {
  if (opt.oturum) {
    const f = opt.oturum.endsWith('.jsonl') ? opt.oturum : path.join(projeDizini, `${opt.oturum}.jsonl`);
    return fs.existsSync(f) ? f : null;
  }
  const dosyalar = fs
    .readdirSync(projeDizini)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => path.join(projeDizini, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (!opt.iz) return dosyalar[0] || null;
  return dosyalar.find((f) => fs.readFileSync(f, 'utf8').includes(opt.iz)) || null;
}

// Aynı model yanıtı akış sırasında birden çok satıra yazılır; her yanıt bir kez sayılsın diye mesaj
// kimliğine göre son kullanım değeri alınır.
function oku(dosya) {
  const kullanim = new Map();
  let ilk = null;
  let son = null;
  for (const satir of fs.readFileSync(dosya, 'utf8').split('\n')) {
    if (!satir) continue;
    let e;
    try {
      e = JSON.parse(satir);
    } catch {
      continue;
    }
    const t = e.timestamp ? Date.parse(e.timestamp) : null;
    if (t !== null && ((opt.sonra && t < opt.sonra) || (opt.once && t > opt.once))) continue;
    if (e.timestamp) {
      if (!ilk || e.timestamp < ilk) ilk = e.timestamp;
      if (!son || e.timestamp > son) son = e.timestamp;
    }
    const m = e.message;
    if (e.type === 'assistant' && m && typeof m === 'object' && m.usage) kullanim.set(m.id || e.uuid, { model: m.model, u: m.usage });
  }
  const modeller = {};
  for (const { model, u } of kullanim.values()) {
    const t = (modeller[kisaAd(model)] ??= { cagri: 0, okuma: 0, yazma: 0, cikti: 0, girdi: 0 });
    t.cagri++;
    t.okuma += u.cache_read_input_tokens || 0;
    t.yazma += u.cache_creation_input_tokens || 0;
    t.cikti += u.output_tokens || 0;
    t.girdi += u.input_tokens || 0;
  }
  return { modeller, ilk, son };
}

const kisaAd = (model) => (/opus/.test(model) ? 'opus' : /sonnet/.test(model) ? 'sonnet' : /haiku/.test(model) ? 'haiku' : String(model));

function ekle(hedef, kaynak) {
  for (const [model, t] of Object.entries(kaynak)) {
    const h = (hedef[model] ??= { cagri: 0, okuma: 0, yazma: 0, cikti: 0, girdi: 0 });
    for (const k of Object.keys(t)) h[k] += t[k];
  }
}

const sayi = (n) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2).replace('.', ',')} M` : n >= 1e3 ? `${Math.round(n / 1e3)} k` : String(n);
const satirYaz = (t) => `${t.cagri} çağrı · okuma ${sayi(t.okuma)} · yazma ${sayi(t.yazma)} · çıktı ${sayi(t.cikti)}`;

const dosya = oturumBul();
if (!dosya) bitir(2, `Oturum bulunamadı (${opt.iz ? `içinde "${opt.iz}" geçen ` : ''}${projeDizini}).`);
const oturum = path.basename(dosya, '.jsonl');
const ana = oku(dosya);

const ajanlar = new Map();
let arkaPlan = 0;
const altDizin = path.join(projeDizini, oturum, 'subagents');
if (fs.existsSync(altDizin)) {
  for (const f of fs.readdirSync(altDizin).filter((f) => f.endsWith('.jsonl'))) {
    let meta = {};
    try {
      meta = JSON.parse(fs.readFileSync(path.join(altDizin, f.replace(/\.jsonl$/, '.meta.json')), 'utf8'));
    } catch {
      // meta dosyası yoksa rol bilinmiyor olarak sayılır
    }
    const okunan = oku(path.join(altDizin, f));
    if (!Object.keys(okunan.modeller).length) continue; // aralık dışında kalan ajan
    if (meta.requestShape === 'background') arkaPlan++;
    const rol = meta.agentType || 'bilinmiyor';
    const a = ajanlar.get(rol) ?? { calistirma: 0, modeller: {} };
    a.calistirma++;
    ekle(a.modeller, okunan.modeller);
    ajanlar.set(rol, a);
  }
}

const toplam = {};
ekle(toplam, ana.modeller);
for (const a of ajanlar.values()) ekle(toplam, a.modeller);
const dakika = ana.ilk && ana.son ? Math.round((Date.parse(ana.son) - Date.parse(ana.ilk)) / 60000) : '?';
const calistirma = [...ajanlar.values()].reduce((s, a) => s + a.calistirma, 0);

if (opt.md) {
  console.log(`\n## Gerçek maliyet (maliyet.mjs, oturum ${oturum.slice(0, 8)}, ${dakika} dk, ${calistirma} ajan çalıştırması)\n`);
  console.log('| kim | model | çağrı | önbellek okuma | önbellek yazma | çıktı |');
  console.log('|---|---|---|---|---|---|');
  const md = (kim, modeller) =>
    Object.entries(modeller).forEach(([m, t]) => console.log(`| ${kim} | ${m} | ${t.cagri} | ${sayi(t.okuma)} | ${sayi(t.yazma)} | ${sayi(t.cikti)} |`));
  md('yönlendirme (ana oturum)', ana.modeller);
  for (const [rol, a] of ajanlar) md(`${rol} ×${a.calistirma}`, a.modeller);
  md('**toplam**', toplam);
} else {
  console.log(`maliyet · oturum ${oturum} · ${dakika} dk · ${calistirma} ajan çalıştırması`);
  console.log('yönlendirme (ana oturum)');
  for (const [m, t] of Object.entries(ana.modeller)) console.log(`  ${m.padEnd(7)} ${satirYaz(t)}`);
  console.log('ajanlar');
  for (const [rol, a] of [...ajanlar].sort()) {
    for (const [m, t] of Object.entries(a.modeller)) console.log(`  ${rol.padEnd(24)} ×${a.calistirma}  ${m.padEnd(7)} ${satirYaz(t)}`);
  }
  console.log('TOPLAM');
  for (const [m, t] of Object.entries(toplam)) console.log(`  ${m.padEnd(7)} ${satirYaz(t)}`);
}
if (arkaPlan) {
  console.log(`\nUYARI: ${arkaPlan} ajan arka planda çalıştı. Yönlendirme her dönüşte oturumun kendi modeline (çoğunlukla Opus) geçer; komutlar ajanları önde çalıştırmalı.`);
}
