// Edit the dictionary curation sets in build-dictionaries.cjs and run
// the full verification chain. The edit stays small and visible (one
// new line per invocation, with a dated comment); the chain catches the
// downstream effects we'd otherwise forget to check.
//
// Usage:
//   yarn dict add A <word>...     append to dictAInclude
//   yarn dict add B <word>...     append to dictBInclude
//   yarn dict remove <word>...    append to excludeBoth (removes from A and B)
//
// Words must be all-lowercase letters. The chain stops on the first
// failure; review the diff before committing.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const argv = process.argv.slice(2);
const action = argv[0];
const wordsStart = action === "add" ? 2 : 1;
const dict = action === "add" ? argv[1] : null;
const words = argv.slice(wordsStart).map((w) => w.trim().toLowerCase()).filter(Boolean);

const usage = `Usage:
  yarn dict add A <word>...     append to dictAInclude
  yarn dict add B <word>...     append to dictBInclude
  yarn dict remove <word>...    append to excludeBoth`;

if (
  !["add", "remove"].includes(action) ||
  (action === "add" && !["A", "B"].includes(dict)) ||
  words.length === 0 ||
  words.some((w) => !/^[a-z]+$/.test(w))
) {
  console.error(usage);
  process.exit(1);
}

const setName =
  action === "remove" ? "excludeBoth" : dict === "A" ? "dictAInclude" : "dictBInclude";

const buildPath = path.join(__dirname, "build-dictionaries.cjs");
let src = fs.readFileSync(buildPath, "utf8");

const setRe = new RegExp(
  `(const ${setName} = new Set\\(\\[[\\s\\S]*?\\n)(\\]\\);)`,
  "m"
);
const m = src.match(setRe);
if (!m) {
  console.error(`Could not find Set "${setName}" in build-dictionaries.cjs`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const verb = action === "remove" ? "Removed" : "Added";
const insertion =
  `  // ${verb} ${today} via scripts/edit-dict.cjs.\n` +
  `  ${words.map((w) => `"${w}"`).join(", ")},\n`;

src = src.replace(setRe, `${m[1]}${insertion}${m[2]}`);
fs.writeFileSync(buildPath, src, "utf8");

console.log(
  `✓ Edited ${setName} in build-dictionaries.cjs (${words.length} word${words.length > 1 ? "s" : ""}): ${words.join(", ")}\n`
);

const step = (label, command) => {
  console.log(`\n==> ${label}`);
  try {
    execSync(command, { stdio: "inherit", cwd: path.join(__dirname, "..") });
  } catch {
    console.error(`\nStep failed: ${label}`);
    console.error("The edit to build-dictionaries.cjs is still on disk; fix and re-run, or git restore to undo.");
    process.exit(1);
  }
};

step("Rebuild dictionaries", "node scripts/build-dictionaries.cjs");
step("Scan for L1-from-Dict-B bugs", "node scripts/scan-l1-bugs.cjs");
step("Regenerate weekend overrides", "yarn regen-weekends");
step("Run tests", "yarn test --run");

console.log("\n==> Weekend overrides diff:");
execSync("git --no-pager diff --stat src/utilities/weekendOverrides.ts", {
  stdio: "inherit",
  cwd: path.join(__dirname, ".."),
});

console.log(
  "\nAll checks passed. Review the full diff, then commit and deploy."
);
