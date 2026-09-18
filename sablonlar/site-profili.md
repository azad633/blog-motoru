---
# site-profili.md: blog-motoru her işe bu dosyayı okuyarak başlar. Site kökünde durur, git'te izlenir.
# Bu başlık (iki --- arası) olgulardır; motorun script'leri de okur. Basit YAML kullanın:
# "anahtar: değer", iki boşlukla girintili alt anahtarlar, [a, b] listeleri, {a: b} haritalar.
# Renkleri ve # içeren her değeri tırnakla yazın. Bilmediğiniz alanı boş bırakın ("" ya da []).

site: ornek.com
site_url: https://ornek.com
kok: /mutlak/yol/ornek-site                   # sitenin klasörü, mutlak yol
diller: [fr, en]                              # ilki birincil dil; makale her dilde yazılır
pazar: google.fr                              # arama niyeti hangi Google'da okunur
iletisim_dili: tr                             # motorun sahibiyle konuşma dili (tr, en, fr...)
calisma_klasoru: research/ekip                # ajanların iş dosyaları, site kökünden

icerik:
  blog: src/content/blog/{dil}/{slug}.mdx
  sayfalar: src/content/pages/{dil}/
  sema_dosyasi: src/content.config.ts          # frontmatter alanları buradan okunur
  rotalar: src/lib/routes.ts                   # sayfa slug'ları (yoksa boş)
  blog_url: /{dil}/blog/{slug}/
  taslak_alani: draft                          # true iken sayfa derlenmez
  aciklama_max: 170
  ornek_yazilar: []                            # sesi örnek alınacak 2 yazı

gorsel:
  hedef: public/images/blog/{slug}.webp
  boyut: 1600x900
  stil_rehberi: ""                             # görsel stil kuralları dosyası (yoksa boş)
  uretici: gemini                              # görseli sahip üretir; ajan prompt yazar
  palet: {}                                    # şemalar için: {ink: "#000000", paper: "#FFFFFF"}

komutlar:
  build: npm run build
  tip_kontrol: npm run check
  dist: dist
  onizleme: npx astro preview --port 4329
  onizleme_port: 4329
  paketle: ""
  deploy_prova: ""
  deploy: ""                                   # boşsa motor "hazır, yayın komutu yok" der ve durur
  canli_dogrula: ""

git: commit                                    # otomatik-push | commit | yok

kontrol:
  baslik_max: 60
  meta_max: 170
  yasak_terimler: []                           # derlenmiş sayfada geçerse yayın durur (küçük/büyük harf fark etmez)
  yasak_desenler: []                           # görünür metinde regex, ör. ['€', '\bEUR\b']
  desen_istisna_sayfalar: []                   # yasak desenin serbest olduğu sayfalar
  zorunlu_metin: ""                            # "src/lib/site.ts#SABIT" ya da {fr: "...", en: "..."}
  dinamik_yollar: []                           # dist'te olmayan ama sunucunun ürettiği yollar
  haric_sayfalar: [/, /404.html]               # tam taramada atlanır
  sema_yasak: [Review, AggregateRating]
  sema_beklenen: []                            # yeni makalede olması gereken JSON-LD tipleri

kardes_siteler: {}                             # {alan.com: [/slug-1, /slug-2]}: yalnızca slug çakışması için
---

# ornek.com: site profili

Motorun kuralları (`kurallar`) her sitede geçerlidir; bu dosya yalnızca bu siteye özgü olanı söyler.
Başlıktaki olgular ile aşağıdaki kurallar çelişirse sahibine sorulur.

## 1. Site ne, kurallar neden var
<!-- Bir paragraf: site kimin için, ne karar vermesine yardım ediyor, iş modeli ne,
     hangi güven unsuru olmadan çöker. Ajanlar kural kararlarını buna göre verir. -->

## 2. Kilitli kurallar
<!-- Numaralı, kısa, kesin. Her biri ihlalde ne olacağını söylesin (ENGELLEYİCİ mi, sahibine mi sorulur).
     Örnekler: hangi marka/kişi adı asla geçmez; fiyat hangi kaynaktan ve nasıl yazılır;
     yayıncı/imza nasıl görünür; hangi görseller yasak; hangi metin sayfada aynen durur;
     mevcut URL'ler değişmez; yeni slug'lar kardeş sitelerden farklı olur. -->

## 3. Deneyim kaynakları
<!-- İzin yoksa: "İzin yok. Yalnızca birincil kaynaklar." yazın.
     İzin varsa koşulları: hangi platformlar, en az kaç bağımsız anlatım, nasıl ifade edilir,
     hangi konularda asla kullanılmaz (güvenlik, doz, sonuç). -->

## 4. Dil ve ses
<!-- Birincil dil nasıl okunmalı, diğer diller çeviri mi paralel yazı mı, yasak üslup,
     her paragrafın geçmesi gereken test. -->

## 5. Şema (JSON-LD)
<!-- Layout'un her sayfada kendiliğinden ürettiği tipler; makale başına eklenebilecek tipler;
     asla kullanılmayacaklar. Ajanlar frontmatter'a şema yazmaz. -->

## 6. Yayın notları
<!-- Deploy'un bilinen tuzakları: klasör açma, önbellek, elle yapılacak adımlar. -->

## 7. Nerede ne var
| Ne | Nerede |
|---|---|
| | |
