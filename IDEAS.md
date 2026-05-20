# Ideas / future work

A running list of things we've discussed but haven't shipped. Roughly
ordered within each section by perceived value.

## Bugs and UX gaps (priority)

Things that visibly affect players right now — mostly from Arthur's
play sessions and Tumblr feedback. Mobile-heavy because ~90% of usage
is mobile. Higher priority than the regular polish / feature queue.

- **Removing a letter isn't visibly explained.** The how-to-play
  explainer animates add and change but doesn't surface remove —
  several players appear unaware that removing a letter is allowed.
  Update the explainer animation (or copy) to walk through all three
  operations equally.
- **Mobile: keyboard stays up after solving daily / triple.** When the
  victory panel appears, the input retains focus and the keyboard
  eats half the screen — the share buttons sit behind it. Should blur
  the input on solve so the keyboard retracts.
- **Re-opening the share / victory panel isn't discoverable.** After
  the dismiss-share fix, the only way back is a page refresh.
  `@official-kircheis` hit this on Tumblr; the "refresh to recover"
  workaround was Arthur's reply. Want a real button — probably a
  "Show solution / share" entry-point in the header or status strip
  once a mode is solved for the day.
- **Mobile: solutions row side-scrolls alone.** When the path or
  optimal-path overflows the viewport, only the row scrolls — the
  surrounding container stays put. Should scroll as a unit so the
  whole solutions box travels with the path.
- **Mobile: Share + Share-with-path buttons aren't the same height.**
  Small visual inconsistency. Probably an inline-vs-flex height
  resolution issue.
- **Graph: double-tap zooms out too far.** vis-network's default
  fit-to-content seems to overshoot. Pin the zoom level the recentre
  lands on.
- **Triple backtracking still reads as unclear.** Even after the
  help-page update, multiple Tumblr players hit "the extra back-edge
  that doesn't count for scoring" confusion (`@more-eels-please`,
  `@world-wide-spider`). Probably needs an in-context hint the first
  time the user clicks an existing node in the triple graph.
- **Click "wayword" in the header should do something.** Convention
  on most sites. Options: scroll-to-top + close any open modal, jump
  to `/daily`, or open a small About menu. Pick one — probably the
  first.
- **Spot-check edge `pair ↔ air`.** A Tumblr reblogger asked
  "Shouldn't pair and air be connected here?" If the edge is in the
  graph but not visually apparent, that's a rendering issue. If it
  isn't in `wordGraph.ts`, that's a data bug. Worth a sample audit
  of L1-distance neighbours for common short words while we're in
  there.

## Features

### Bigger / nicer
- **Share image** instead of text. A small SVG/PNG showing the user's
  path (or just the move count and `START → TARGET`) for posting to
  socials. The current copy-result text is fine but visually flat.
- **Move-count distribution** on the stats modal — a small histogram
  of solves grouped by diff-from-optimal. Currently we just show
  totals + an average.
- **Free-play stats**, parallel to the daily history. Useful if
  someone plays free-play a lot — could record best score, longest
  chain, total targets reached, etc.
- **"Give up" / hint button** for daily — reveal one neighbour of the
  selected node, with a small penalty in the share text. Helps when
  someone's truly stuck.
- **True / all-word optimal** alongside common-word optimal in the
  victory panel. Requested by `@official-kircheis` on Tumblr — "I
  find common-word too easy, would want a second target to chase."
  Cheap to compute (one BFS through the full wordGraph at solve
  time). Also partially addresses `@xenostalgic` and another
  reblogger asking for an edit-distance reference number.

### Smaller
- **Auto-fallback difficulty** in free play. When `pickNewTarget`
  finds no candidates at the requested difficulty, optionally degrade
  to the next-lower difficulty (with a console note) instead of
  setting target to null.
- **Auto-focus input after clicking a node.** `@normalhorse` on
  Tumblr: "once someone clicks on a node to go back, when they type
  on the keyboard put the focus back in the text entry box." Simple
  ref refocus in the Graph node-click handler.

## Tumblr feature requests (parking lot)

Worth thinking about, but bigger / more design-required than the
items above.

- **Leaderboard.** `@selkypostergirl`. Requires a backend or at least
  shared storage; currently the site is fully static. Could be a
  weekly "top N solves" via the share string scraping if we ever set
  up server-side anything.
- **"Free play but generates daily-style start/target pairs".**
  `@kaika-kokoro`: "an infinite version of the daily." Different from
  current free play (rotating targets from 'a'). Would be a 4th mode.
- **High-score free play.** `@haemey`: "given a random word and have
  to come up with as many edits as you can, going for a high score
  instead of low." A score-up rather than score-down variant.
- **Anagram operation.** `@barokworks`: "would you consider adding
  anagramming the letters? Maybe as a jolly." Currently the three
  operations are add / remove / change one letter. Anagram would be a
  fourth — opens up entirely different word neighbourhoods.
- **Multilingual support.** A reblog tag hoped for other languages.
  Big undertaking — would need separate word graphs and curated
  dicts per language. Parking-lot for now.

## Polish

- **Animation when a word is added** to the graph. Currently nodes
  pop into place; a soft fade / scale-in via vis-network's options
  would feel alive.
- **Custom tooltip** to replace native `title="..."` on the ⓘ icons.
  The native one is plain and slow to appear.
- **Mode-switch transition.** The cross-mode swap is currently a hard
  cut as the GraphProvider unmounts / remounts. A 150ms cross-fade
  would feel more considered.
- **Bigger touch targets** on the difficulty +/- buttons on mobile —
  they're a bit small for thumb taps. (90% mobile usage — promote.)

## Tech debt

- **Bundle splitting beyond wordGraph.** The shell is now 262KB
  gzipped (down from 1.7MB after we lazy-loaded wordGraph). Bulk of
  what's left is react-graph-vis. `manualChunks` in vite could carve
  it out separately so React itself loads first.
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

## Data quality

- **Continue curating the `dictBExtras` and `dictBExclude` lists** in
  `scripts/build-dictionaries.cjs`. The Tumblr feedback form (and
  email at feedback@wayword.fun) keeps surfacing missing words and
  ones players think shouldn't be there. Grow lists incrementally.
- **More bridge words.** `scripts/analyse-bridges.cjs` finds B-words
  that, if promoted to A, would expand `legitimate`. Worth re-running
  periodically as the SCOWL / word-list sources evolve.
- **Audit a sample of expected-but-missing edges.** Triggered by the
  `pair ↔ air` Tumblr question — pick ~20 short common words and
  verify their L1-distance neighbours are all present in the graph.

## Architecture / refactors

- **Move `freeplay:` state behind a context** like daily. Free play
  state is currently lifted up to App and threaded through props
  (target, pickGraphNodes, hit). A FreePlayProvider co-located with
  the free-play subtree would be cleaner.
- **Rename internal localStorage prefix** from `wordJourney:` to
  `wayword:`. Cosmetic — invisible to users — but matches the brand.
  Trade-off: clears everyone's saves unless we ship a migration.

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
- **UserFeedback.com integration** (friend's startup). Tried during
  testing; their hosted-page mode forces a sequential-questions
  wizard which doesn't fit our "any of these three buckets, all
  optional" Google-form-style use case. Stuck with the Google Form.
- **Persistent on-screen footer for copyright.** Considered after the
  Tumblr post; pulled in favour of folding credits into the Help
  modal so we don't burn ~22px of mobile vertical space on every
  view. SCOWL attribution lives in `/attributions.txt` + a fine-print
  credits block at the bottom of Help. (2026-05-20.)

## Open questions

- **Names**: if we broaden Dict A (e.g. via SCOWL tier 35), proper
  nouns may start sneaking in. A small `exclude-names.txt` could be
  added to the build pipeline if needed.
- **Graph layout.** The force-directed layout from `react-graph-vis`
  is fine for ~10 nodes; with 30+ it can get tangled. A hierarchical
  layout rooted at the start word might be more readable. Open
  whether it's worth losing the organic feel.

## Shipped since last IDEAS pass (2026-05-17 → 2026-05-20)

Kept here briefly so we can see how the queue's moving.

- Day-N counter ("Wayword #N") in status strip + share string
- Continue-playing-freely link in daily victory
- Lazy-loaded wordGraph (1.7MB → 262KB initial bundle)
- Cleanup: dropped one-time migrations + orphan PNG
- Custom domain wayword.fun + Cloudflare Analytics + email forwarding
- OpenGraph cards + favicon refresh
- Daily Triple mode (Steiner-tree puzzle, solver, generator, UI, stats)
- Per-mode URLs (/daily, /triple, /freeplay) + GH Pages SPA fallback
- Spoiler-free share string (📍🟢🟠🎯 emoji block)
- Two share buttons (Share + Share with path)
- Triple victory tree visualisation (shared trunk, branched display)
- Terracotta-terminal styling consistent across daily + triple
- Fix React #310 hook order bug in VictoryPanelTriple (post-deploy hotfix)
- Help modal explainer redesign: animated graph + click-to-branch demo
- Edge dedup + type-to-jump from existing word
- Free-play Reset preserves difficulty
- Daily / triple dismiss panel = session-only (refresh re-shows)
- Mobile overflow fix (grid `minmax(0, 1fr)`)
- Credits + SCOWL attribution: in Help modal + `/attributions.txt`.
  Header `?` moved to far right. (2026-05-20.)
