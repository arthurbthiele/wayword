# Ideas / future work

A running list of things we've discussed but haven't shipped. Roughly
ordered within each section by perceived value.

## Features

### Bigger / nicer
- **Share image** instead of text. A small SVG/PNG showing the user's
  path (or just the move count and `START → TARGET`) for posting to
  socials. The current copy-result text is fine but visually flat.
- **Day-N counter** ("Wayword #14") in the share text and daily
  status, calculated from a fixed launch date. Wordle-style.
- **Move-count distribution** on the stats modal — a small histogram
  of solves grouped by diff-from-optimal. Currently we just show
  totals + an average.
- **Free-play stats**, parallel to the daily history. Useful if
  someone plays free-play a lot — could record best score, longest
  chain, total targets reached, etc.
- **"Give up" / hint button** for daily — reveal one neighbour of the
  selected node, with a small penalty in the share text. Helps when
  someone's truly stuck.

### Smaller
- **Continue-playing-freely link** at the bottom of the daily victory
  banner once you've solved. Currently you have to manually switch to
  free play.
- **Auto-fallback difficulty** in free play. When `pickNewTarget`
  finds no candidates at the requested difficulty, optionally degrade
  to the next-lower difficulty (with a console note) instead of
  setting target to null.

## Polish

- **Animation when a word is added** to the graph. Currently nodes
  pop into place; a soft fade/scale-in via vis-network's options
  would feel alive.
- **Custom tooltip** to replace native `title="..."` on the ⓘ icons.
  The native one is plain and slow to appear.
- **Mode-switch transition.** The cross-mode swap is currently a hard
  cut as the GraphProvider unmounts/remounts. A 150ms cross-fade
  would feel more considered.
- **Bigger touch targets** on the difficulty +/- buttons on mobile —
  they're a bit small for thumb taps.
- **Favicon refresh** to match the warm-papery theme. Current one is
  the CRA holdover.

## Tech debt

- **Lazy-load `wordGraph.ts`.** It's the biggest chunk of the 1.7 MB
  gzipped bundle. Splitting it as a dynamic import would let the app
  shell render in ~50 KB and load the dict in the background. Probably
  half a day to do right (with a loading state for the first input).
- **Bundle splitting in general.** Vite warns about the single chunk
  on every build; manualChunks could carve out the dictionary and
  react-graph-vis separately.
- **Migrate `Graph.jsx` and `GraphProvider.jsx` to TS.** The rest of
  the components are TS now. Graph touches react-graph-vis which has
  no types; a one-line `declare module` shim handles that.
- **React 17 → 18.** Mostly mechanical. Strict-mode double-invocation
  is the only behavioural surprise; we already have a ref guard
  against double-credit in the legacy `TargetWord` pattern which has
  since been removed anyway, so should be safe.
- **Swap `react-graph-vis`.** It's unmaintained (last published 2020).
  Real options: use vis-network directly with a thin wrapper (same
  visuals, same physics, no abandoned middle layer), or move to
  `react-force-graph` (purpose-built for force-directed graphs, more
  modern API). The latter is a redesign of the graph rendering layer.
- **Drop unused migration code.** `migrateLegacyFreePlayKeys` and
  `migrateDailyToV2` are idempotent one-time ops. Now that everyone
  who'll ever use this has run them, they can be removed.
- **Drop the orphan `word-journey demo graph.png`** in the repo root.
  Unused since the README rewrite.

## Data quality

- **Curate target dictionary by hand-flag.** The Google form already
  collects suggestions for additions/removals; have a workflow to
  apply them periodically. The form has been quiet but if usage picks
  up it'll matter.
- **More bridge words.** `scripts/analyse-bridges.cjs` finds B-words
  that, if promoted to A, would expand `legitimate`. We added 16
  hand-curated bridges; there are dozens more candidates that would
  be worth scanning periodically as the SCOWL/word-list sources
  evolve.
- **Promote SCOWL tier 20 with stricter filtering.** SCOWL tier 10
  excludes a lot of obviously common words (e.g. "hone", "dove").
  Tier 20 brings them in but also brings in `ass`, `damn`, etc., so
  would need to extend the exclude list. ~3000 more legitimate words
  in play.

## Architecture / refactors

- **Move `freeplay:` state behind a context** like daily. Free play
  state is currently lifted up to App and threaded through props
  (target, qualifyingPath, hit). A FreePlayProvider co-located with
  the free-play subtree would be cleaner.
- **Rename internal localStorage prefix** from `wordJourney:` to
  `wayword:`. Cosmetic — invisible to users — but matches the brand.
  Trade-off: clears everyone's saves unless we ship a migration.
  Arthur previously said don't bother with migrations.

## Things we explored and decided against (notes for future-us)

- **Modal for free-play victory.** Tried this; switched to inline
  banner because rotating-target play meant constant interruption.
  Banner pattern matches daily and stays out of the way.
- **Dropping the `interactive-widget=resizes-content` viewport hint.**
  Safari doesn't honour it but Chrome and Firefox do; net positive,
  no cost.
- **Showing the optimal path in the shared copy text.** Decided
  against — it's the biggest spoiler. Length goes in; full path
  stays in-app for the player who already solved.

## Open questions

- **Names**: a small hand-curated `exclude-names.txt` lived in `data/`
  briefly when Dict A came from Google 10k. SCOWL doesn't have the
  proper-noun problem at tier 10, so the names exclude was dropped.
  Worth re-introducing if we ever broaden Dict A.
- **Graph layout.** The force-directed layout from `react-graph-vis`
  is fine for ~10 nodes; with 30+ it can get tangled. A hierarchical
  layout rooted at the start word might be more readable. Open
  whether it's worth losing the organic feel.
