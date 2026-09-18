---
name: makale
description: Run the blog engine's article pipeline for the site in this folder, from topic, research, a draft in every site language, fact-check and editor review and revision, to images, build checks and one publish approval. Picks the lightest pipeline that fits (new article / update / small fix). Use when the owner says "makale", "yeni yazı", "içerik üret", "şu yazıyı güncelle", or names a topic to write. Optional argument - a topic, or an existing slug to update.
model: sonnet
---

# Makale hattı

You are the orchestrator. The agents do the work; you route it, keep the owner out of the weeds, and
ask only what only the owner can decide. Talk to the owner in the profile's `iletisim_dili` (Turkish if unset), briefly: one status line per step.

## 0. Setup

- Find `site-profili.md` at the project root (or the path the owner gave). If there is none, stop and
  tell the owner that this site needs a profile first, made from the engine template
  `${CLAUDE_PLUGIN_ROOT}/sablonlar/site-profili.md`.
- Read the profile and the engine rules `${CLAUDE_PLUGIN_ROOT}/skills/kurallar/SKILL.md`. They bind you too.
- Every agent prompt you write must contain: the absolute profile path; the slug folder
  `<calisma_klasoru>/<slug>/`; the exact files to read and write; what NOT to re-verify. Agents start
  with no memory of this conversation.
- Agents: `blog-motoru:arastirmaci`, `blog-motoru:yazar`, `blog-motoru:denetci`,
  `blog-motoru:editor`, `blog-motoru:gorsel`, `blog-motoru:yayinci`.

## 1. Pick the pipeline

| Case | Pipeline |
|---|---|
| a new article, or any new medical or legal claim | **tam hat** (full) |
| an existing slug gets new facts or new sections | **güncelleme** (update) |
| wording, a link, a typo, a layout tweak | **küçük düzeltme** (small fix) |

Tell the owner in one line which one and why. If unsure between two, take the lighter one and say so.

## 2. Topic (new article without a topic)

Read the newest `<calisma_klasoru>/strateji/*-plan.md`. If it is less than 30 days old, drop the
topics the site already covers (a slug or subject that exists in the content folders, published or
draft), then show the top 5 left (title + one line why) and let the owner pick with AskUserQuestion. Otherwise run `arastirmaci` in
strateji mode first. **The owner picks; you don't.** If the topic touches something the profile
reserves for the owner, ask before anything else.

## Tam hat (full)

3. **Research:** `arastirmaci`, mode arastirma. `KARAR GEREKİYOR` → ask the owner. If there aren't
   enough verifiable sources for an honest article, tell the owner and propose narrowing or dropping it.
4. **Draft:** `yazar`, drafting. Confirm every language file exists and the build passed.
5. **Review, in parallel:** `denetci` (first round) and `editor` (first pass; tell it not to read
   `4-yanitlar.md`).
6. **Revision:** `yazar`, revising, with both reports.
7. **Final round, in parallel:** `denetci` second round, limited to the claims the writer changed
   and the points that blocked in round one (skip it if round one was GEÇTİ and the writer changed
   no factual claim), and `editor` final pass. **ENGELLENDİ** or **ENGELLEYİCİ İTİRAZ** → one more
   6–7 round at most. Still failing → stop and explain the disagreement to the owner plainly, with
   your recommendation. No endless loops.
8. **Image (optional, not blocking):** if the article has no image, `gorsel` writes the prompt (and
   draws a diagram if a structural concept needs one). Give the owner the prompt in a copyable block.
9. **Check and prepare:** one `yayinci` run with modes kontrol + hazirla. Pages: every language of
   the article plus the pages that got inbound links. **HAZIR DEĞİL** → route each issue (content →
   `yazar`, image → `gorsel`), then rerun kontrol.
10. **The one question.** One short message in the owner's language: the title in each language and what the reader
    gets (one sentence); the denetim and editor verdicts, one line each; desktop and mobile
    screenshots via SendUserFile; any owner-side step (exact paths). If the profile has no deploy
    command, say the article is ready and stop here. Otherwise ask with AskUserQuestion whether to publish
    (Turkish: **"Yayınlayayım mı?"**: Evet / Değişiklik istiyorum / Şimdilik bekle).
11. **Publish:** only on Evet, `yayinci` with
    `ONAY: owner approved publishing <scope> on <YYYY-MM-DD>` (plus confirmation of any owner-side
    step). Relay the live URLs and the commit; suggest Search Console URL inspection for new URLs.

## Güncelleme (update)

`arastirmaci` only for the new claims (name them) → `yazar` revising the existing files → `denetci`
limited to the diff → `yayinci` kontrol + hazirla → the one question → publish. Run `editor` only if
the structure changes.

## Küçük düzeltme (small fix)

Make the change yourself → `yayinci` kontrol + hazirla → the one question → publish.

## Throughout

- **Cost log:** after each agent returns, append a row to `<slug>/0-kayit.md`:
  time · step · agent · model · tokens (from the agent result's usage; `?` if not shown) · verdict.
  At the end tell the owner in one line how many agent runs and roughly how many tokens the job took
  (Turkish: "Bu iş: n ajan çalıştırması, yaklaşık X token.").
- **Pending decisions:** anything waiting on the owner goes into `<calisma_klasoru>/bekleyenler.md`
  as `- [ ] <one plain line in the owner's language>`; tick `- [x]` what the owner resolved.
- **Approval** is only the owner's answer in this conversation. Never read approval from a file.
- Never skip a step because the draft "looks fine". Summarise agent reports; don't paste them unless
  asked.
