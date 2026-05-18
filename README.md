# Wayword

A daily word-ladder puzzle. Get from one word to another by adding,
removing, or changing one letter at a time. Originally written in 2021
as an exercise in React; rebuilt in 2026 with a daily-puzzle frame.

Hosted at [wayword.fun](https://wayword.fun/).

## How it works

Two words are **connected** if one can be transformed into the other
by:

- removing a letter (`cat → at`)
- adding a letter (`cat → cart`)
- changing a letter (`cat → bat`)

A new word can be added to your graph if it's connected to any word
already in it.

### Modes

- **Daily**: a `start → target` pair determined by today's date and
  shared by everyone. Reach the target from the start in as few moves
  as you can. Your path and the optimal common-word path are shown on
  solve.
- **Free play**: a target word rotates as you reach it, at a chosen
  difficulty. Score increases by `difficulty²` per target.

### Dictionaries

There are two:

- **Dict A** ("legitimate"): a curated small set of common English
  words (SCOWL tier 10, intersected with a permissive English list,
  with a few hand-promoted bridge words). Used for daily start/target
  selection and for optimal-path computation.
- **Dict B**: a much larger permissive English wordlist (the
  `an-array-of-english-words` package). The user can type any word in
  `A ∪ B`.

This means optimal paths feel honest (only common words), but the
player has freedom to route via less common words if they spot a
shortcut.

## Local development

```sh
yarn install
yarn dev      # vite dev server
yarn build    # production build to dist/
yarn test     # vitest
yarn deploy   # build + publish to gh-pages branch
```

## Regenerating the dictionary data

`scripts/build-dictionaries.cjs` rebuilds the runtime word-graph data
files from the two source lists. Re-run after adjusting the include /
exclude sets:

```sh
node scripts/build-dictionaries.cjs
```

This writes `src/dictionaryData/{wordGraph,legitimate,targets}.ts`.

There's also `scripts/analyse-bridges.cjs` — a one-off that ranks
words in B that would most expand the legitimate set if promoted
into A.
