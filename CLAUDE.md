# Wayword — agent orientation

You're picking up an active project. Read this before doing anything substantive.

## What this is

[wayword.fun](https://wayword.fun) — a daily word-ladder puzzle. Three modes: daily, daily-triple, free-play. Hosted on GitHub Pages (`gh-pages` branch), no backend. **~90% of traffic is mobile**, so UI/UX changes must be tested at phone widths.

## Ground rules for this file

This document is for things the code can't tell you. Don't restate filenames or paraphrase comments — they rot the moment the code shifts. Capture only:

- Process patterns and workflow expectations
- Deploy-time invariants and how they can silently break
- Mental models that aren't obvious from any single file
- Historical context that warns against "simplifications" we've tried and reverted

If something's already a comment at the top of a file, link to the file. Don't copy it.

## Mental model: two dictionaries

Get this wrong and you'll ship something subtly broken.

- **Dict A ("legitimate")** — small curated set (~3k common English words). Daily/triple picker candidates, and the "common-word optimal" path shown post-solve.
- **Dict B ("playable")** — larger permissive set (~26k). What the user is allowed to *type*, and the graph they explore.

`A ⊂ B`. Players can route via uncommon words if they spot a shortcut, but daily/triple targets and the displayed optimal use Dict A only. Both built from SCOWL tiers in [scripts/build-dictionaries.cjs](scripts/build-dictionaries.cjs).

## Where to look

- [src/App.tsx](src/App.tsx) — mode routing, URL state, dict-ready gate
- [src/utilities/](src/utilities/) — pickers, BFS helpers, storage, migrations
- [src/components/](src/components/) — UI
- [src/dictionaryData/](src/dictionaryData/) — generated, never hand-edit
- [scripts/](scripts/) — dict build, weekend regen, puzzle preview, L1 scan
- [IDEAS.md](IDEAS.md) — backlog, loosely prioritised, not committed work

## Dict curation: blast radius

The Dict B subtlety to internalise: the **runtime weekday picker uses Dict A only** (date-hash → sorted Dict A → BFS through Dict A adjacency). But **weekend selection uses Dict B too** — `getDailyPair` checks `WEEKEND_PATH_MIN_WORD_LENGTH` (=4) and `WEEKEND_MAX_DICTB_GAP` (=3) against a Dict B BFS. So `dictBInclude` is *not* a free-action: it can flip which candidate pairs pass weekend constraints.

| Change | What it affects |
|---|---|
| `dictAInclude` add/remove | Daily picker, triple picker, weekend pin selection, "common-word optimal" benchmark, `legitimate.ts` output |
| `dictBInclude` add/remove | Playable graph + weekend pin selection (path-floor + gap constraints check Dict B) |
| `dictAOnlyExclude` add | Same blast radius as removing from `dictAInclude` (picker + benchmark), but the word stays typeable. Used for profanity / dual-meaning words that shouldn't be daily targets. |
| `excludeBoth` of an A-word | Same as `dictAInclude` |
| `excludeBoth` of a B-word | Playable graph only; players with that word in an existing graph keep it but can't navigate *to* it (orphan-fallback in `wordsAreConnected`) |
| SCOWL tier shifts | All of the above |

Common case: player complains "X should be typeable". Fix is almost always `dictBInclude`. Only promote to `dictAInclude` if X is genuinely common-English-word material — and accept the full follow-up checklist.

Use `yarn dict {add,remove} {A,B} <word>...` for routine edits — it runs the full verification chain (build → L1-scan → weekend regen → tests). See README for the CLI shape.

**Discipline before deploying any dict change**:

1. Regenerate dictionaries; eyeball the diff by length (Arthur reviews for slurs, archaisms, fragments).
2. `node scripts/scan-l1-bugs.cjs` — must report zero. Catches "real word that's actually one-edit from a Dict B word, but we tell the player it isn't".
3. `node scripts/preview-puzzles.cjs N 2026-MM-DD` — inspect upcoming puzzles for regressions.
4. `yarn regen-weekends` — refresh pre-gen pins against the new dict.
5. Diff `weekendOverrides.ts`. If pins shifted, weigh whether to ship: `migrateStaleGraphState` will wipe in-progress games for any player on an affected date. To preserve a specific date, pin it manually in `puzzleOverrides.ts` before deploy.
6. For today specifically: confirm the picker output for today's date is unchanged, OR pin today manually.

## Deploy: what breaks when you change X

There's no staging — every deploy is to production. **`yarn deploy` always pushes `origin master` after `gh-pages` (via a `postdeploy` hook)** so the public source tree stays in lock-step with what's live. Don't deploy from a dirty working tree or a non-`master` branch — anything on `HEAD` will be force-sent both to users (via `gh-pages`) and to the public repo. Conversely, never push `origin master` without deploying; we want the two to track each other exactly.

| Change | Failure mode | Mitigation |
|---|---|---|
| Dict A | Past-date puzzles shift → `migrateStaleGraphState` wipes affected in-progress games on next load | Pin today (and any near-term in-progress dates) in `puzzleOverrides.ts` before deploy |
| Dict B | Pre-gen weekend pins drift out of constraint compliance silently. Same start/target resolves, so no state wipe — but path-floor / gap-cap no longer guaranteed. | `yarn regen-weekends` + diff; ship the refresh or accept short-term drift |
| `weekendOverrides.ts` (post-regen) | In-progress weekend games for shifted dates get wiped | Decide per-date: ship and accept, or hand-pin via `puzzleOverrides.ts` |
| `excludeBoth` removes a B-word | Players holding that word in a graph keep it but can only navigate away, not back | Flag in commit; consider promoting a substitute |
| Local-midnight logic | Tumblr audience explicitly hated the UTC version. Do NOT "simplify" `getLocalDateString` to UTC. | Just don't |
| Any code change | Live in ~1 min after `yarn deploy`. Verify with `curl -s https://wayword.fun/ \| grep -o 'index-[A-Za-z0-9_-]*\.js'` matches `dist/assets/index-*.js` | n/a |

## Non-obvious machinery

- **Local-midnight rollover** (not UTC). See the warning above; the Tumblr audience preference is the load-bearing reason.
- **Override precedence**: `dailyOverrides` / `tripleOverrides` are checked before the deterministic picker. Inside `dailyOverrides`, generated weekend pins spread first and hand-pinned entries override (later keys win in object spread).
- **`weekendOverrides.ts` has a bounded horizon** (currently ~26 weeks ahead). Past the last pinned date, the runtime picker silently falls back to computing the strict weekend constraints on-device — correct but slower on mobile. Re-run `yarn regen-weekends` periodically to extend the window; tests that want to exercise the runtime weekend path should pick dates past the horizon (see `dailyTarget.test.ts`).
- **Stale-state migration**: `migrateStaleGraphState` is *targeted* — only clears dates where the stored start no longer matches the current picker. Don't replace with a blanket clear; the targeted version is deliberate. **Caveat**: it runs once per app load. A user with a tab open across both a deploy AND local midnight keeps the stale dict in memory, plays today's puzzle against the old picker output, and loses that day's progress on next reload (migration catches the mismatch and wipes). Tail case — both events on one session. The only real fix is bundle-version polling, which isn't worth it here.
- **Dev panel** at `?dev=1` — random-daily regenerator + difficulty input. Reroll forces a hard reload to remount the daily `GraphProvider` against the new pair.

## Conventions

- **yarn, never npm**.
- TypeScript everywhere except `Graph.jsx`, `GraphProvider.jsx`, `index.jsx`.
- Tests: vitest under `src/utilities/tests/`.
- React 17 (not 18) — no `createRoot`, no automatic-batching assumptions.
- Comments: explain *why*, not *what*. No transient-state narration.
- Commit messages: short imperative. No Claude trailer, no co-author lines.

## Workflow

- **Ask before deploying.** Builds and tests are fine; pushing to `gh-pages` is user-visible.
- **Ask before regenerating dictionaries** unless explicitly asked — Arthur eyeballs the diff by length.
- **UX changes**: run `yarn dev`, open at phone-width, actually use the feature before claiming it works.
- After dict changes, run `node scripts/scan-l1-bugs.cjs`. It should report zero bugs.
