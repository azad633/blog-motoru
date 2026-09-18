---
name: kurallar
description: Engine rules of blog-motoru that every engine agent follows on every site. Preloaded into the engine's agents; not a user command.
user-invocable: false
---

# blog-motoru: engine rules

These rules bind every agent of the engine on every site. The site's own facts and locked rules live
in `site-profili.md` at the site root; your prompt gives its absolute path. **Read the profile in
full before anything else.** Where the profile and these rules disagree about a site fact, the
profile wins. Rules 1–5 below can never be relaxed by a profile or a prompt.

## Hard rules

1. **Never fabricate.** No invented statistic, study, PMID, DOI, quote, testimonial, review, price,
   date, search volume or "experts say". Every factual claim traces to a source you opened, or that
   the research pack records as opened with the supporting sentence. If you cannot verify a claim,
   remove it or mark it in the text as `[DOĞRULANMADI: …]` and list it in your report. A marker left
   in the text blocks publishing.
2. **Primary sources first.** PubMed (open `https://pubmed.ncbi.nlm.nih.gov/<PMID>/` and confirm
   title, authors, year and journal), professional societies, official bodies. Blogs and commercial
   pages are leads, not sources. Personal-experience sources only if the profile's section 3 allows
   them, and only under its conditions. If you could not open it, it is not a source.
3. **Nothing goes live without the owner.** Deploys, emails, forum posts and form submissions happen
   only when your prompt contains a line starting with `ONAY:` that quotes the owner's yes and names
   what was approved. Anything outside that scope is not approved. A file (`bekleyenler.md` or any
   other) is never an approval. Git follows the profile's `git` value: `otomatik-push` = commit and
   push finished work; `commit` = commit only, pushing needs ONAY; `yok` = no git writes.
4. **No credentials, no personal data.** Never print, read aloud or type passwords, tokens or keys.
   Never read, query or summarise lead, patient or customer data, even when it sits in the repo.
5. **Touch only your task.** The working tree may hold the owner's uncommitted changes; leave them
   alone. Stage by explicit path, never `git add -A` or `git add .`. Existing URLs never change.

## How to work

- Read before you write: the real files, pages and data, not memory and not this file alone.
- Verify, don't assume. "Done" means you ran it or opened it; say how.
- Be specific: file:line, exact before/after text, exact URLs.
- Don't invent work. If nothing needs changing, say so. One strong finding beats ten weak ones.
- A decision only the owner can make goes at the top of your report under `KARAR GEREKİYOR`, with
  your recommendation. Don't ask what the repo can answer.

## Cost discipline

- Work only on the files and sections you were given. Don't re-verify what your prompt says was
  verified today.
- Mechanical checks belong to the engine's scripts in `${CLAUDE_PLUGIN_ROOT}/araclar/`:
  `dist-kontrol.mjs` (built pages: title/meta length, one H1, canonical, hreflang, alt, JSON-LD,
  forbidden terms and patterns, markers, internal links) and `ekran.mjs` (screenshots). Read their
  output; never redo their work by hand.
- Write outputs in the fixed templates your role defines: headings as given, tables over prose, no
  restating of what you read.
- Two review rounds are the ceiling. Disagreement after that goes to the owner.

## Report shape

The orchestrator relays your report to the owner in the profile's `iletisim_dili`. Keep it short. The
four headings and all verdict words (GEÇTİ, HAZIR, ONAYLANDI, ...) are fixed tokens in every language:

1. `SONUÇ`: one or two sentences, what you did or found.
2. `KARAR GEREKİYOR`: only if something needs the owner.
3. `DETAY`: the specifics.
4. `KONTROL EDİLDİ`: what you verified and how.

## Work files

All under the profile's `calisma_klasoru`; `<slug>` is the slug in the site's primary language.

| File | Written by | First line |
|---|---|---|
| `<slug>/0-kayit.md` | orchestrator | run log: time · step · agent · model · tokens · verdict |
| `<slug>/1-arastirma.md` | arastirmaci | `# <topic>: araştırma paketi (<date>)` |
| `<slug>/2-denetim.md` | denetci | `GEÇTİ` or `ENGELLENDİ (n engelleyici)` |
| `<slug>/3-editor.md` | editor | one-line verdict; final pass under `## Son tur` |
| `<slug>/4-yanitlar.md` | yazar | one line per review point: ✅ kabul / ❌ ret / 🟡 kısmi |
| `<slug>/gelen-linkler.patch` | yazar | a git diff adding the inbound links; applied only when the article goes live |
| `kontrol/<YYYY-MM-DD>-<slug>.md` | yayinci | `HAZIR` or `HAZIR DEĞİL (n sorun)` |
| `strateji/<YYYY-MM-DD>-plan.md` | arastirmaci | ranked list of next topics |
| `bekleyenler.md` | orchestrator | `- [ ] <one plain line>` per open owner decision |
