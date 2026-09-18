// profil.mjs: site-profili.md dosyasının YAML başlığını okur. blog-motoru script'lerinin ortak modülü.
// Bağımlılık yok; YAML'ın bir alt kümesini destekler:
// girintili haritalar, "- " listeleri, satır içi [a, b] ve {a: b}, tırnaklı/tırnaksız skalerler,
// "# " ile başlayan yorumlar. Hex renkleri tırnak içinde yazın: "#161A1F".

import fs from 'node:fs';

export function yamlOku(metin) {
  const satirlar = metin
    .split('\n')
    .map((s) => s.replace(/\t/g, '  ').replace(/\s+$/, ''))
    .filter((s) => s.trim() && !/^\s*#(\s|$)/.test(s));
  let i = 0;
  const girinti = (s) => s.match(/^ */)[0].length;
  const blok = (g) => (satirlar[i].trim().startsWith('-') ? liste(g) : harita(g));
  function harita(g) {
    const nesne = {};
    while (i < satirlar.length) {
      const s = satirlar[i];
      if (girinti(s) < g) break;
      if (girinti(s) > g) throw new Error(`girinti hatası: "${s.trim()}"`);
      const m = s.trim().match(/^("[^"]*"|'[^']*'|[^:]+?):(?:\s+(.*))?$/);
      if (!m) throw new Error(`anlaşılamayan satır: "${s.trim()}"`);
      const anahtar = String(skaler(m[1].trim()));
      const kalan = m[2] === undefined ? '' : yorumSil(m[2]);
      i++;
      if (kalan !== '') nesne[anahtar] = degerOku(kalan);
      else if (i < satirlar.length && girinti(satirlar[i]) > g) nesne[anahtar] = blok(girinti(satirlar[i]));
      else nesne[anahtar] = null;
    }
    return nesne;
  }
  function liste(g) {
    const dizi = [];
    while (i < satirlar.length) {
      const s = satirlar[i];
      if (girinti(s) < g) break;
      if (girinti(s) > g || !s.trim().startsWith('-')) throw new Error(`liste hatası: "${s.trim()}"`);
      const kalan = yorumSil(s.trim().replace(/^-\s*/, ''));
      i++;
      if (kalan !== '') dizi.push(degerOku(kalan));
      else if (i < satirlar.length && girinti(satirlar[i]) > g) dizi.push(blok(girinti(satirlar[i])));
      else dizi.push(null);
    }
    return dizi;
  }
  return satirlar.length ? blok(girinti(satirlar[0])) : {};
}

function yorumSil(s) {
  let tirnak = null;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (tirnak) {
      if (c === '\\' && tirnak === '"') k++;
      else if (c === tirnak) tirnak = null;
      continue;
    }
    if (c === '"' || c === "'") tirnak = c;
    else if (c === '#' && k > 0 && /\s/.test(s[k - 1]) && (k + 1 === s.length || /\s/.test(s[k + 1]))) {
      return s.slice(0, k).trim();
    }
  }
  return s.trim();
}

function degerOku(s) {
  if (s.startsWith('[')) return virgulleBol(s.slice(1, s.lastIndexOf(']'))).map(degerOku);
  if (s.startsWith('{')) {
    const nesne = {};
    for (const parca of virgulleBol(s.slice(1, s.lastIndexOf('}')))) {
      const m = parca.match(/^("[^"]*"|'[^']*'|[^:]+?):\s*(.*)$/);
      if (m) nesne[String(skaler(m[1].trim()))] = degerOku(m[2].trim());
    }
    return nesne;
  }
  return skaler(s);
}

function virgulleBol(s) {
  const parcalar = [];
  let simdiki = '';
  let tirnak = null;
  let derinlik = 0;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (tirnak) {
      simdiki += c;
      if (c === '\\' && tirnak === '"') simdiki += s[++k] ?? '';
      else if (c === tirnak) tirnak = null;
      continue;
    }
    if (c === '"' || c === "'") tirnak = c;
    if (c === '[' || c === '{') derinlik++;
    if (c === ']' || c === '}') derinlik--;
    if (c === ',' && derinlik === 0) {
      if (simdiki.trim()) parcalar.push(simdiki.trim());
      simdiki = '';
      continue;
    }
    simdiki += c;
  }
  if (simdiki.trim()) parcalar.push(simdiki.trim());
  return parcalar;
}

function skaler(s) {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) return JSON.parse(s);
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  if (s === 'true' || s === 'false') return s === 'true';
  if (s === 'null' || s === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

// Profili okur ve YAML başlığını nesne olarak döndürür. Sorun olursa anlaşılır bir Error fırlatır.
export function profilOku(dosya) {
  let metin;
  try {
    metin = fs.readFileSync(dosya, 'utf8');
  } catch {
    throw new Error(`Profil okunamadı: ${dosya}`);
  }
  const m = metin.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error(`Profilde YAML başlığı yok (--- ile başlamalı): ${dosya}`);
  try {
    return yamlOku(m[1]);
  } catch (e) {
    throw new Error(`Profilin YAML başlığı okunamadı: ${e.message}`);
  }
}
