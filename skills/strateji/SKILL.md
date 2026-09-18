---
name: strateji
description: Decide what the site in this folder should publish next with the blog engine - a ranked list of topics backed by real search evidence (and a Search Console export if there is one), then the owner picks and the article pipeline can start. Use when the owner says "strateji", "ne yazalım", "sıradaki konu", "içerik planı". Optional argument - "yenile" to force a fresh plan, or a question to focus on.
model: sonnet
---

# Strateji

Talk to the owner in the profile's `iletisim_dili` (Turkish if unset), briefly.

1. **Setup.** Read `site-profili.md` at the project root (none → stop, say a profile is needed, template
   `${CLAUDE_PLUGIN_ROOT}/sablonlar/site-profili.md`) and the engine rules
   `${CLAUDE_PLUGIN_ROOT}/skills/kurallar/SKILL.md`.
2. **Reuse first.** If the newest `<calisma_klasoru>/strateji/*-plan.md` is less than 30 days old and
   the owner didn't say "yenile" or ask a new question, use it; no new research run.
3. **Otherwise** run `blog-motoru:arastirmaci` in the foreground (`run_in_background: false`) in strateji mode with the absolute profile path and
   today's date. If `<calisma_klasoru>/veri/` holds a Search Console export, name the file in the
   prompt. With a question from the owner, tell the agent to focus the plan on it.
4. **Show** the top 5 compactly: title, one line on why, one risk flag if any. Ask with
   AskUserQuestion which to write (or none).
5. **Hand off.** On a pick, ask whether to start `/makale` with it; on yes, follow the `makale`
   skill with that topic.

Open owner decisions go into `<calisma_klasoru>/bekleyenler.md`.
