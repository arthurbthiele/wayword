
# Word Journey

A simple game implemented as an exercise to learn React.

![Example Game](word-journey%20demo%20graph.png?raw=true "Title")

Currently hosted [here](https://arthurbthiele.github.io/word-journey/), on Github Pages

## Project Design

The game centres around word 'connections'. Two words are deemed 'connected' if one can be transformed into the other by:

- removing a letter (for example, cat → at)
- adding a letter (for example, cat → cart)
- exchanging a letter for a different letter (for example, cat → bat)

The symmetric relation 'connected' creates a graph structure on arbitrary collections of words. The source dictionary for this particular game comes from the [List of the Most Common English Words](https://github.com/dolph/dictionary).

Since the game centres around connections, we only include words that are reachable by some chain of connections from the letter 'a'. This is the largest connected component of the graph defined by the 'connected' relation and the chosen dictionary, and contains 9423 words. Trivia: the shortest word which is not in this cluster is the word 'ebb', which is the only unreachable word with 3 letters.

The dictionary was chosen to include most common words while excluding obvious non-words, like 'nonly'. This does mean, however, that some reasonably common words, like 'badger' or 'hexagon' are not in this dictionary. Suggestions for how to include all 'real words' while not including obvious non-words are appreciated.

To make this structure 'game-like', a target word is chosen at random from all words that are currently at a distance equal to the difficulty level from the users current graph. These 'depths' are calculated using a [breadth-first search](https://en.wikipedia.org/wiki/Breadth-first_search) seeded simultaneously from every word in the users current graph — every edge has unit length, so BFS gives the same shortest-path distances Dijkstra's algorithm would, more cheaply.

After a target word is added to the graph by the user, a new target word is recalculated, and their score increases by the square of the difficulty level. We chose this scoring system to reflect that doubling the difficulty much more than doubles the time required to find the target word, and for its relative simplicity. A more accurate scoring system, which reflects the difficulty a brute-force search would have in finding a target, would be:

`score = ((average number of connections of a word - 1)^(difficulty level/2))*(size of graph)`

This is substantially more complex, and we have currently opted for the simpler reward system.

## Getting Started

Clone this project by running the command:

`git clone https://github.com/arthurbthiele/word-journey.git`

In the project directory, install the required dependencies:

`yarn install`

and run the app in development mode:

`yarn start`

Open [`http://localhost:3000`](http://localhost:3000) to view it in the browser.

`yarn test`

Runs all tests and outputs results.

`yarn deploy`

Uses the [`gh-pages`](https://www.npmjs.com/package/gh-pages) package to deploy the project to Github.

## Technical Notes

### Graph Data
The raw graph data used in this project is in the `dictionaryData` folder, in the form of a JavaScript object with keys being the word, and values being all words which are connected to the key by the relation described above. For compatibility with some packages used in the development process (Webpack), this dictionary is stored in 26 sub-files, organised by first letter.

### Graph Component
The component responsible for drawing and manipulating the graph is the `Graph.jsx` component, which uses the [`react-graph-vis`](https://www.npmjs.com/package/react-graph-vis) package.

### Graph Context
The users graph so far is stored in the context of the `GraphProvider.jsx` component, and can be accessed by the children of this component using, for example:
`const { graph } = useContext(GraphContext);`
The graph itself is a list of nodes and edges that have been entered by the user, and is initialised as just the node `a`.
