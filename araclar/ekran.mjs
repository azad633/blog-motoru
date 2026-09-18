#!/usr/bin/env node
// ekran.mjs: verilen sayfaların masaüstü ve mobil ekran görüntüsünü alır.
// Profildeki komutlar.onizleme ile önizleme sunucusunu açar (port zaten cevap veriyorsa onu kullanır),
// headless Chrome ile çeker ve kendi açtığı sunucuyu kapatır. Her PNG yolunu ayrı satıra yazar.
//
// Kullanım:
//   node ekran.mjs --profil <site>/site-profili.md --cikti <klasör> /fr/blog/x/ [/en/blog/y/ ...]
//   Yol yerine doğrudan URL de verilebilir (file:///.../sema.svg, https://...); yalnız URL varsa sunucu açılmaz.
// Çıkış kodu: 0 = hepsi çekildi, 1 = en az biri çekilemedi, 2 = kullanım, profil ya da sunucu hatası.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { profilOku } from './profil.mjs';

// Chrome'un yeri: profildeki komutlar.chrome; yoksa işletim sistemine göre bilinen yollar ve PATH'teki adlar.
const CHROME_ADAYLARI = {
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'],
  linux: ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'],
  win32: ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'],
};
// Headless Chrome 500 px'ten dar düzen kurmaz; daha dar pencere yalnızca görüntüyü kırpar.
const BOYUTLAR = [
  ['masaustu', '1440,2400'],
  ['mobil', '500,3200'],
];

function bitir(kod, mesaj) {
  console.log(mesaj);
  process.exit(kod);
}

const args = process.argv.slice(2);
const opt = { yollar: [] };
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--profil') opt.profil = args[++i];
  else if (args[i] === '--cikti') opt.cikti = args[++i];
  else opt.yollar.push(args[i]);
}
if (!opt.profil || !opt.cikti || !opt.yollar.length) {
  bitir(2, 'Kullanım: node ekran.mjs --profil <site-profili.md> --cikti <klasör> <yol> [<yol> ...]');
}

let profil;
try {
  profil = profilOku(opt.profil);
} catch (e) {
  bitir(2, e.message);
}
const kok = profil.kok || path.dirname(path.resolve(opt.profil));
const komutlar = profil.komutlar || {};
const dogrudan = (y) => /^(https?|file):\/\//.test(y);
const sunucuGerekli = opt.yollar.some((y) => !dogrudan(y));
const port = Number(komutlar.onizleme_port);
if (sunucuGerekli && (!komutlar.onizleme || !port)) bitir(2, 'Profilde komutlar.onizleme ve komutlar.onizleme_port gerekli.');
function chromeBul(tercih) {
  for (const aday of tercih ? [tercih] : CHROME_ADAYLARI[process.platform] || []) {
    if (path.isAbsolute(aday)) {
      if (fs.existsSync(aday)) return aday;
      continue;
    }
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [aday], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim().split('\n')[0];
  }
  return null;
}
const chrome = chromeBul(komutlar.chrome);
if (!chrome) bitir(2, 'Chrome bulunamadı; profilde komutlar.chrome ile yolunu verin.');

const taban = `http://localhost:${port}`;
const durumKodu = async (url) => {
  try {
    return (await fetch(url, { redirect: 'manual' })).status;
  } catch {
    return 0;
  }
};

let sunucu = null;
if (sunucuGerekli && !(await durumKodu(taban + '/'))) {
  sunucu = spawn(String(komutlar.onizleme), { cwd: kok, shell: true, detached: true, stdio: 'ignore' });
  let acildi = false;
  for (let i = 0; i < 80 && !acildi; i++) {
    await new Promise((r) => setTimeout(r, 500));
    acildi = (await durumKodu(taban + '/')) > 0;
  }
  if (!acildi) {
    kapat();
    bitir(2, `Önizleme sunucusu 40 saniyede açılmadı: ${komutlar.onizleme} (port ${port})`);
  }
}

function kapat() {
  if (!sunucu) return;
  try {
    process.kill(-sunucu.pid, 'SIGTERM');
  } catch {
    // süreç zaten kapanmış
  }
}

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const chromeProfili = fs.mkdtempSync(path.join(os.tmpdir(), 'ekran-chrome-'));
let cekimNo = 0;

// Chrome (153, macOS) PNG'yi birkaç saniyede yazıyor ama sonra kapanmıyor. Bu yüzden dosyanın
// boyutu iki ölçümde aynı kalınca çekim bitmiş sayılır ve Chrome'un süreç grubu kapatılır.
async function cek(url, png, boyut) {
  fs.rmSync(png, { force: true });
  const c = spawn(
    chrome,
    [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
      '--disable-component-update', '--disable-background-networking', '--virtual-time-budget=4000',
      `--user-data-dir=${path.join(chromeProfili, String(cekimNo++))}`, `--window-size=${boyut}`, `--screenshot=${png}`, url,
    ],
    { detached: true, stdio: 'ignore' },
  );
  let onceki = -1;
  let tamam = false;
  for (const son = Date.now() + 30000; Date.now() < son; ) {
    await bekle(300);
    const boy = fs.existsSync(png) ? fs.statSync(png).size : 0;
    if (boy > 0 && boy === onceki) {
      tamam = true;
      break;
    }
    onceki = boy;
    if (c.exitCode !== null) {
      tamam = boy > 0;
      break;
    }
  }
  try {
    process.kill(-c.pid, 'SIGKILL');
  } catch {
    // Chrome zaten kapanmış
  }
  return tamam;
}

fs.mkdirSync(opt.cikti, { recursive: true });
let hata = 0;
for (const ham of opt.yollar) {
  const yol = dogrudan(ham) ? ham : ham.startsWith('/') ? ham : '/' + ham;
  const url = dogrudan(yol) ? yol : taban + yol;
  if (!url.startsWith('file://')) {
    const kod = await durumKodu(url);
    if (kod >= 400 || kod === 0) {
      hata++;
      console.log(`ÇEKİLEMEDİ ${yol}: sunucu ${kod || 'cevap vermedi'}`);
      continue;
    }
  } else if (!fs.existsSync(decodeURI(url.slice('file://'.length)))) {
    hata++;
    console.log(`ÇEKİLEMEDİ ${yol}: dosya yok`);
    continue;
  }
  const adKaynagi = url.startsWith('file://') ? path.basename(url).replace(/\.[^.]+$/, '') : new URL(url).pathname;
  const ad = adKaynagi.replace(/^\/+|\/+$/g, '').replace(/[^\w.-]+/g, '-') || 'ana-sayfa';
  for (const [tur, boyut] of BOYUTLAR) {
    const png = path.join(opt.cikti, `${ad}-${tur}.png`);
    if (await cek(url, png, boyut)) console.log(png);
    else {
      hata++;
      console.log(`ÇEKİLEMEDİ ${yol} (${tur}): 30 saniyede görüntü oluşmadı`);
    }
  }
}

kapat();
fs.rmSync(chromeProfili, { recursive: true, force: true });
process.exit(hata ? 1 : 0);
