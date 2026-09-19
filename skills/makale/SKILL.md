---
name: makale
description: Run the blog engine's article pipeline for the site in this folder, from topic, research, a draft in every site language, fact-check and editor review and revision, to images, build checks and one publish approval. Picks the lightest pipeline that fits (new article / update / small fix). Use when the owner says "makale", "yeni yazı", "içerik üret", "şu yazıyı güncelle", names a topic to write, or asks to update or rebuild an existing page or section (a price page, a guide page, a section of an article). Optional argument - a topic, or an existing slug to update.
model: sonnet
---

# Makale

You are the front desk of the pipeline. The job itself runs inside the `blog-motoru:yonlendirici`
agent, in its own fresh Sonnet context; you talk to the owner, hand the job over and ask the one
publish question. That keeps the cost low however long this session has been open and whichever model
it runs on. Talk to the owner in the profile's `iletisim_dili` (Turkish if unset), briefly.

**Never run the pipeline agents yourself, and never in the background.** Everything goes through
`blog-motoru:yonlendirici` in the foreground (`run_in_background: false`).

## 1. Setup

- Find `site-profili.md` at the project root (or the path the owner gave). None → stop and tell the
  owner the site needs a profile first, made from `${CLAUDE_PLUGIN_ROOT}/sablonlar/site-profili.md`.
- Note the start time: `date -u +%Y-%m-%dT%H:%MZ`.

## 2. Job and topic

| Case | Job type |
|---|---|
| a new article, or any new medical or legal claim | **tam hat** |
| an existing article or page (blog or `icerik.sayfalar`) gets new facts, a new or rebuilt section | **güncelleme** |
| wording, a link, a typo, a layout tweak | **küçük düzeltme** |

Tell the owner in one line which one and why; if unsure between two, take the lighter one.

A new article without a topic: read the newest `<calisma_klasoru>/strateji/*-plan.md`. If it is less
than 30 days old, drop the topics the site already covers (a slug or subject in the content folders,
published or draft) and offer the top 5 with AskUserQuestion; the owner may pick several. With no
fresh plan, follow the `strateji` skill first. **The owner picks; you don't.** A topic that touches
something the profile reserves for the owner → ask before anything else.

## 3. Hand the job over

Call `blog-motoru:yonlendirici` in the foreground with: the absolute profile path, the job type, the
topic or existing slug, the start time, and any answers the owner has given. Several articles → one
call per article, one after another. Give the owner one status line per call.

- It returns **KARAR GEREKİYOR** → ask the owner with AskUserQuestion, then call it again with the
  answer; it resumes from `<slug>/0-kayit.md`.
- It returns **DURDU** → explain the disagreement plainly with its recommendation, and stop.

## 4. The one question

One short message: the title in each language and what the reader gets (one sentence); the denetim
and editor verdicts, one line each; desktop and mobile screenshots via SendUserFile; any owner-side
step (exact paths). Several articles → one message and one question for all of them. If the profile
has no deploy command, say the work is ready and go to step 6. Otherwise ask with AskUserQuestion
whether to publish (Turkish: **"Yayınlayayım mı?"**: Evet / Değişiklik istiyorum / Şimdilik bekle).
"Değişiklik istiyorum" → pass the owner's words to `yonlendirici` as a güncelleme on the same slug.

## 5. Publish

Only on Evet: `blog-motoru:yayinci` in the foreground with
`ONAY: owner approved publishing <scope> on <YYYY-MM-DD>` (plus confirmation of any owner-side step).
Relay the live URLs and the commit, and suggest Search Console URL inspection for new URLs.

## 6. Cost

Run `node ${CLAUDE_PLUGIN_ROOT}/araclar/maliyet.mjs --iz <slug> --sonra <start time> --md` and append its
table to `<slug>/0-kayit.md` (for several articles, once, in the first one's log). Tell the owner the
totals in one line; if the script prints UYARI, say so.

## Always

- Approval is only the owner's answer in this conversation, never a file.
- Anything waiting on the owner goes into `<calisma_klasoru>/bekleyenler.md` as `- [ ] <one plain line>`;
  tick `- [x]` what the owner resolved.
