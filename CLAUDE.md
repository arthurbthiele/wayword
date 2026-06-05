# Wayword — agent orientation

You're picking up an active project. Read this before doing anything substantive.

## What this is

[wayword.fun](https://wayword.fun) — a daily word-ladder puzzle. Originally a 2021 React exercise, rebuilt in 2026 with a daily-puzzle frame. Went mini-viral on Tumblr in May 2026; expect a small but real audience that notices changes. **~90% mobile** — UI/UX changes need to be tested at phone widths, not just desktop.

Hosted on GitHub Pages via the `gh-pages` branch. There is no backend.

## Mental model: two dictionaries

This is the single most important concept. Get it wrong and you'll ship something subtly broken.

- **Dict A** ("legitimate") — small curated set of common English words (~3,000). Used for:
  - Picking daily start/target pairs
  - Picking daily triples
  - Computing the "common-word optimal" path shown post-solve
- **Dict B** ("playable") — larger permissive set (~26,000). Used for:
  - What the user is allowed to *type*
  - The graph the user explores

So `A ⊂ B`. The player can route via uncommon words if they spot a shortcut, but daily puzzles and optimal benchmarks only ever use common words. Both are built from SCOWL tiers via [scripts/build-dictionaries.cjs](scripts/build-dictionaries.cjs).

If you touch the dictionary build, **regenerate locally and spot-check by length** before committing — Arthur will eyeball weird inclusions (offensive words, archaic, technical) and you'll iterate.

## Key files

- [src/App.tsx](src/App.tsx) — mode routing (daily / triple / freeplay), URL state, dictReady gate, migration hook
- [src/utilities/dailyTarget.ts](src/utilities/dailyTarget.ts) — daily picker (FNV-1a hash with salt, deterministic by date)
- [src/utilities/tripleTarget.ts](src/utilities/tripleTarget.ts) — triple picker (3-terminal Steiner tree)
- [src/utilities/puzzleOverrides.ts](src/utilities/puzzleOverrides.ts) — per-date manual pins (see below)
- [src/utilities/weekendOverrides.ts](src/utilities/weekendOverrides.ts) — auto-generated weekend pins (do not hand-edit; regenerate via `yarn regen-weekends`)
- [src/utilities/useLocalStorage.ts](src/utilities/useLocalStorage.ts) — storage hook + `migrateStaleGraphState` (see below)
- [src/utilities/legitimateGraph.ts](src/utilities/legitimateGraph.ts) — BFS helpers over Dict A
- [src/dictionaryData/](src/dictionaryData/) — generated, do not hand-edit
- [scripts/build-dictionaries.cjs](scripts/build-dictionaries.cjs) — regenerates dict data from SCOWL
- [scripts/preview-puzzles.cjs](scripts/preview-puzzles.cjs) — previews next N days of daily + triple puzzles with their optimal paths

## Non-obvious machinery

**Per-date overrides** ([puzzleOverrides.ts](src/utilities/puzzleOverrides.ts)). Both pickers check this map first and return the pinned start/target before falling through to the deterministic picker. Use this when:
- You're about to ship a dict change and need to preserve continuity for today's already-in-progress puzzle
- You want to drop a themed puzzle on a specific date

**Pre-generated weekend pins** ([weekendOverrides.ts](src/utilities/weekendOverrides.ts)). Saturday and Sunday daily puzzles use heavy strict constraints (path-floor ≥ 4 letters in both Dict A and Dict B, Dict B gap cap ≤ 3). Computing this at runtime is expensive on mobile, so we pre-generate ~26 weeks of weekend pins and check them in. Spread into `dailyOverrides` at module load; runtime weekend logic is the safety net for dates past the generator window. Regenerate via `yarn regen-weekends` after any change to weekend constraints or dictionary.

**Stale-state migration** (`migrateStaleGraphState` in [useLocalStorage.ts](src/utilities/useLocalStorage.ts)). Runs once per app load. Scans localStorage for `wordJourney:daily:v2:{date}:graph` and `wordJourney:triple:v1:{date}:graph`, parses the stored start word, compares against what the picker now returns for that date, and clears the date's state if mismatched. This is the safety net that lets us ship dict changes without wiping unaffected in-progress games. **Do not replace with a blanket clear** — we got the targeted version specifically to avoid that.

**Local-midnight rollover** (not UTC). `getLocalDateString()` in [dailyTarget.ts](src/utilities/dailyTarget.ts) uses local date components. If you're tempted to "simplify" to UTC, don't — the Tumblr audience explicitly hated the UTC version.

**Dev panel** at `?dev=1` — random-daily regenerator + difficulty input. Useful for spot-checking the picker. Renders only when the query param is set.

## Conventions

- **yarn, never npm** (`yarn install`, `yarn dev`, `yarn test`, `yarn deploy`)
- TypeScript everywhere except the older `Graph.jsx` / `GraphProvider.jsx` / `index.jsx`
- Tests live under `src/utilities/tests/` using vitest
- React 17 (not 18) — no `createRoot`, no automatic batching assumptions
- Comments: explain **why**, not what. Don't narrate the code.
- Commit messages: short imperative, no "Claude Code" trailer, no co-author lines

## Deploy

`yarn deploy` builds and pushes `dist/` to the `gh-pages` branch. Live within a minute or two. Verify by:
- Comparing `dist/assets/index-*.js` hash with the live one (`curl -s https://wayword.fun/ | grep -o 'index-[A-Za-z0-9]*\.js'`)
- Or trying to type a word you know was removed in the latest dict regen

There's no staging environment.

## Workflow expectations

- **Ask before deploying.** Building is fine; pushing to gh-pages is user-visible.
- **Ask before regenerating dictionaries** unless explicitly asked — Arthur will want to review the diff by length.
- For UX changes, run `yarn dev`, open on phone-width viewport, and *use the feature* before claiming it works.
- Read [IDEAS.md](IDEAS.md) for the backlog. Items there are loosely prioritised, not committed work.

## What's already shipped (recent context, not exhaustive)

- Dict redesign (SCOWL ≤20 for A, ≤20 + length-filtered higher tiers for B)
- Local-midnight rollover
- Per-date override mechanism + `migrateStaleGraphState`
- Triple `MIN_PAIRWISE_TARGET_DIST=2` (prevents degenerate pairs like RID+GRID)
- Slur removal pass on the playable graph
- Help explainer reworked to demonstrate remove-letter operation
- DevPanel + preview-puzzles.cjs

See `git log` for the full picture.
