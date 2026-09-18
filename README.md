# blog-motoru

Siteden bağımsız içerik motoru; Claude Code eklentisi olarak kurulur. Araştırma, yazım, kaynak
denetimi, editörlük, görsel ve yayın işlerini yapar. Bir siteyi motora bağlamak için sitenin kökünde
bir `site-profili.md` dosyası yeter. Motorun reposunda hiçbir sitenin içeriği tutulmaz.

## Ne gerekir

- Claude Code: masaüstü uygulaması ya da CLI.
- Bu özel repoya erişim:
  - GitHub davetini kabul et.
  - Makinende git'in GitHub'a bağlanabilmesi gerekir. İki yol var: bir SSH anahtarı, ya da
    `gh auth login` ve ardından `gh auth setup-git`.
- Node.js 18 ya da üstü; script'ler bunun üstünde çalışır.
- Ekran görüntüleri için Google Chrome ya da Chromium.
- İçeriği dosya olarak tutan ve bir build komutu olan bir site: Astro, Hugo, Eleventy, statik
  çıktı üreten Next.js gibi. Veritabanlı CMS'ler (WordPress gibi) desteklenmez.
- Motor şimdiye kadar yalnızca macOS'ta test edildi.

## Bir siteye kurmak

1. `sablonlar/site-profili.md` dosyasını sitenin köküne kopyala ve doldur. Başlıktaki alanlar olgular
   ve komutlar içindir, gövde sitenin kilitli kuralları ve sesi içindir.
2. Site klasöründe eklentiyi yalnızca o proje için kur. SSH anahtarın varsa:
   ```bash
   claude plugin marketplace add git@github.com:azad633/blog-motoru.git --scope project
   ```
   `gh` ile giriş yaptıysan:
   ```bash
   claude plugin marketplace add azad633/blog-motoru --scope project
   ```
   Sonra, iki durumda da:
   ```bash
   claude plugin install blog-motoru@motor --scope project
   ```
3. `site-profili.md` ve `.claude/settings.json` dosyalarını commit et. Site başka bir makinede
   açıldığında motor oradan kurulur.
4. Site klasöründe yeni bir oturum aç. `/strateji`, `/makale` ve `/yayinla` kullanılabilir.

## Güncellemeleri almak

Motorun yeni sürümü çıktığında her site klasöründe:

```bash
claude plugin marketplace update motor
```
```bash
claude plugin update blog-motoru@motor --scope project
```

Yeni sürüm, bundan sonra açılan oturumlarda geçerli olur.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `/strateji [yenile \| soru]` | Sıradaki konuları kanıtıyla sıralar. Son 30 gün içinde yapılmış bir plan varsa yeniden araştırmaz. |
| `/makale [konu \| slug]` | İşin büyüklüğüne göre tam hattı, güncellemeyi ya da küçük düzeltmeyi seçer. Sonunda yayın için tek bir onay ister. |
| `/yayinla` | Makale hattı dışındaki bitmiş işleri kontrol eder ve onayla yayınlar. |

Motor sahibiyle, site profilindeki `iletisim_dili` dilinde konuşur; bu alan boşsa Türkçe konuşur.
Rapor başlıkları ve karar kelimeleri (GEÇTİ, HAZIR, ONAYLANDI...) her dilde aynı kalır.

## Roller

| Ajan | Model | İş |
|---|---|---|
| arastirmaci | Sonnet | Araştırma paketi: niyet, rakipler, doğrulanmış olgular, doğrudan cevap, sayfa planı, iç linkler. Strateji modunda sıradaki konuları sıralar. |
| yazar | Opus | Taslağı sitenin bütün dillerinde yazar; revizyonda her yoruma madde madde cevap verir. |
| denetci | Opus | Her iddianın kaynağını açıp okur. Sitenin kilitli kurallarını ve SEO'nun anlam tarafını denetler. |
| editor | Opus | Bağımsız ve sert eleştiri yapar; son turda ONAYLANDI ya da ENGELLEYİCİ İTİRAZ der. |
| gorsel | Sonnet | Görsel promptu yazar, SVG şema çizer, yapıştırılan görseli WebP'ye çevirir. |
| yayinci | Sonnet | Kontrol (build, script'ler, ekran görüntüleri), hazırlık ve yalnızca `ONAY:` ile yayın yapar. |

Üç komut yönlendirme işi yaptığı için Sonnet'te çalışır. Oturum Opus'ta açılmış olsa bile komut
çalışırken model Sonnet'e geçer. Bu geçiş yalnızca komutun kendi turu için geçerlidir, o yüzden komut
ajanları önde çalıştırır ve bütün işi tek turda bitirir. En ucuz yol, içerik oturumlarını baştan
Sonnet'te açmaktır; yazar, denetçi ve editör yine kendi modelleri olan Opus'ta çalışır.

Kurallar iki katmanlıdır. Her sitede geçerli olan motor kuralları `skills/kurallar/SKILL.md`
dosyasındadır ve her ajana önceden yüklenir. Siteye özgü kurallar o sitenin `site-profili.md`
dosyasındadır. Motor kuralları profil tarafından gevşetilemez: uydurma yasak, canlıya çıkış yalnızca
sahibinin onayıyla yapılır, kimlik bilgisi ve kişisel veri kullanılmaz.

## Script'ler (token harcamaz)

- `araclar/dist-kontrol.mjs` yayından önceki mekanik kontroldür. Başlık ve meta uzunluğunu, tek H1'i,
  canonical ve hreflang'ı, alt metni, JSON-LD'yi, yasak terim ve desenleri, `[DOĞRULANMADI`
  işaretini ve kırık iç linkleri denetler. Kullanımı:
  `node araclar/dist-kontrol.mjs --profil <site>/site-profili.md --sayfa /fr/blog/x/`, bütün site
  için `--hepsi`.
- `araclar/ekran.mjs` masaüstü (1440) ve mobil (500) ekran görüntüsü alır. Önizleme sunucusunu
  kendisi açıp kapatır; bir SVG dosyası ya da URL de verilebilir. Chrome'u kendisi bulur; bulamazsa
  profilde `komutlar.chrome` ile yolu verilir.
- `araclar/profil.mjs` ortak modüldür, profilin YAML başlığını okur.

## Bilinen davranışlar

- Chrome 153 headless modda ekran görüntüsünü yazıyor ama sonra kapanmıyor. `ekran.mjs` dosyanın
  boyutu sabitlenince Chrome'u kendisi kapatır. Sayfadaki giriş animasyonları için Chrome'a 4
  saniyelik sanal süre verilir.
- Dekoratif görsellerde `alt=""` doğru kabul edilir. Hata sayılan tek durum alt özniteliğinin hiç
  olmamasıdır.
- `${CLAUDE_PLUGIN_ROOT}` skill ve ajan metninde gerçek yola çevrilir, ama ajanın komut satırında boş
  gelir. Bu yüzden script yolları ajan metninde yazılıdır.

## Motorun bakımı (yalnızca repo sahibi)

- Değişikliği commit et, sonra `araclar/guncelle.sh` çalıştır. Script sürümü artırır, GitHub'a
  gönderir ve bu makinedeki `siteler.txt` listesinde yer alan sitelerde eklentiyi günceller.
  `siteler.txt` her makinede ayrıdır ve git'te tutulmaz.
- Birine salt okunur erişim vermek için:
  ```bash
  gh api -X PUT repos/azad633/blog-motoru/collaborators/KULLANICI_ADI -f permission=pull
  ```
