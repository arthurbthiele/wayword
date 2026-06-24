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

After merging a PR on GitHub, sync local master before deploying: `git checkout master && git pull origin master`. Otherwise the build runs against pre-merge code AND the postdeploy push is rejected as non-fast-forward.

| Change | Failure mode | Mitigation |
|---|---|---|
| Dict A | Picker output shifts for non-pinned dates, but the per-date puzzle cache (`{daily,triple}:vN:{date}:puzzle`) means each user keeps the puzzle they first encountered. Stale-bundle users see different puzzles from fresh-bundle users until they refresh. | None routine — accept cross-user divergence between deploys. For a deliberate hot-fix (e.g. a bad pair to retract), add a manual `puzzleOverrides.ts` entry AND bump `PUZZLE_CACHE_VERSION` in `src/utilities/puzzleCache.ts` to invalidate every user's cache on next load. |
| Dict B | Pre-gen weekend pins drift out of constraint compliance silently. Same start/target resolves, so no state wipe — but path-floor / gap-cap no longer guaranteed. | `yarn regen-weekends` + diff; ship the refresh or accept short-term drift |
| `weekendOverrides.ts` (post-regen) | The pinned puzzle for a shifted date changes from what users already cached. Existing cached-puzzle users keep playing what they started; new players from the regen onwards see the new pair. | Decide per-date if you need a `PUZZLE_CACHE_VERSION` bump to push it to existing users |
| `excludeBoth` removes a B-word | Players holding that word in a graph hit the orphan case — `migrateStaleGraphState` will detect the orphan start word and wipe the date's state on next load. | Flag in commit; consider promoting a substitute |
| Local-midnight logic | Tumblr audience explicitly hated the UTC version. Do NOT "simplify" `getLocalDateString` to UTC. | Just don't |
| Any code change | Live in ~1 min after `yarn deploy`. Verify with `curl -s https://wayword.fun/ \| grep -o 'index-[A-Za-z0-9_-]*\.js'` matches `dist/assets/index-*.js` | n/a |

## Non-obvious machinery

- **Local-midnight rollover** (not UTC). See the warning above; the Tumblr audience preference is the load-bearing reason.
- **Override precedence**: `dailyOverrides` / `tripleOverrides` are checked before the deterministic picker. Inside `dailyOverrides`, generated weekend pins spread first and hand-pinned entries override (later keys win in object spread).
- **`weekendOverrides.ts` has a bounded horizon** (currently ~26 weeks ahead). Past the last pinned date, the runtime picker silently falls back to computing the strict weekend constraints on-device — correct but slower on mobile. Re-run `yarn regen-weekends` periodically to extend the window; tests that want to exercise the runtime weekend path should pick dates past the horizon (see `dailyTarget.test.ts`).
- **Per-date puzzle cache** (`src/utilities/puzzleCache.ts`). On first encounter with a date, the picker output is snapshotted into `{daily,triple}:vN:{date}:puzzle`. Subsequent renders read the cache, not the live picker — so a dict change between deploys never disrupts a user's stored puzzle. Trade-off: cross-user puzzle agreement is lost until everyone reloads after a deploy. `PUZZLE_CACHE_VERSION` is the escape hatch — bump it to force every user to re-pick (picks up any new manual overrides in `puzzleOverrides.ts`).
- **`activeDate` (App.tsx) is sticky across midnight crossings within a session.** It's initialised at React's first mount and never updated by focus/visibility events. So a user who starts a puzzle at 11:55pm and solves at 12:15am records their solve under the started date, not the new day. A *page refresh* re-initialises `activeDate` to the current local date — so crossing midnight and refreshing = today's puzzle, with yesterday's unfinished progress silently abandoned in localStorage. Picked over a "continue yesterday?" UI prompt.
- **Stale-state migration** (`migrateStaleGraphState`): narrowed to the orphan-word case only — clears a date's state if the stored start word has been removed from Dict B (via `excludeBoth`) and is no longer playable. Other forms of dict drift are tolerated because the cache makes the stored puzzle authoritative.
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
