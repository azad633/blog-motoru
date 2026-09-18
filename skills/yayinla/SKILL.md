---
name: yayinla
description: Publish already-finished changes to the site in this folder with one owner approval - check, prepare, ask "Yayınlayayım mı?", then deploy, verify the live site and commit via the blog engine's yayinci agent. Use when the owner says "yayınla", "deploy et", "canlıya al" for work outside the article pipeline (fixes, templates, a finished draft).
model: sonnet
---

# Yayınla

Orchestrator steps. Talk to the owner in the profile's `iletisim_dili` (Turkish if unset), briefly.

0. **Setup.** Read `site-profili.md` at the project root (none → stop, say a profile is needed, template
   `${CLAUDE_PLUGIN_ROOT}/sablonlar/site-profili.md`) and the engine rules
   `${CLAUDE_PLUGIN_ROOT}/skills/kurallar/SKILL.md`. Agent prompts carry the absolute profile path.
1. **Scope.** From `git status` and the conversation, state what is meant to go live. Unrelated
   uncommitted changes stay out unless the owner says they belong.
2. **Proportionality.** Content with factual claims changed → `blog-motoru:denetci` on the changed
   content only (a diff or named sections). Otherwise skip it.
3. **Check and prepare:** `blog-motoru:yayinci` with modes kontrol + hazirla on the changed pages (in
   parallel with step 2 when both run). Any ENGELLENDİ or HAZIR DEĞİL → fix it first (small things
   yourself, content via `blog-motoru:yazar`); don't ask the owner to approve something broken.
4. **Ask once.** A short summary: what changes for visitors, the pages affected, screenshots via
   SendUserFile, any owner-side step. No deploy command in the profile → say it is ready and stop.
   Otherwise ask with AskUserQuestion whether to publish (Turkish: **"Yayınlayayım mı?"**).
5. **Publish.** On yes: `blog-motoru:yayinci` with `ONAY: owner approved publishing <scope> on <YYYY-MM-DD>`.
   Relay the URLs, the live verification result and the commit hash.

Approval is only the owner's answer in this conversation, never a file. Open owner decisions go into
`<calisma_klasoru>/bekleyenler.md`.
