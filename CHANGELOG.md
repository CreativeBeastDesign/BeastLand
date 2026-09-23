# Changelog

## 0.3.0

- Terminal: no completions while the caret is inside an unterminated quote;
  `"` auto-closes (and `'` at the start of a token), steps over its closing
  pair, wraps a selection, and Backspace removes an empty pair.
- `tokenize` honours `'…'` when the quote starts a token (`don't` stays literal).
- Tile: Enter/Space from inputs inside a tile no longer select the tile
  (they were swallowed — no spaces in chat inputs, no newlines in editors).

## 0.2.0

- `KindSpec.ready?: () => boolean` — a kind can report that its backing
  store hasn't loaded yet. While `ready()` returns `false`, `kinds.exists`
  treats it as unregistered (`true` for every id), so `workspace.prune()`
  never drops a container just because its record hasn't loaded. Consumers
  that previously wrapped `exists` themselves to get this behaviour (e.g.
  Dachsboard's slice loader) can now pass `ready` instead.
- CI: added `@types/node` as a devDependency (`tests/theme-contract.test.ts`
  uses `node:fs` and was relying on a transitive type declaration that isn't
  guaranteed on a clean install).
- Build: `prepack`'s `publint` step now pins `--pack npm` instead of
  auto-detecting the package manager — auto-detection picked `bun` because a
  stale `bun.lock` was committed alongside `package-lock.json`, which broke
  on runners without `bun` installed. Removed the stale `bun.lock`; npm is
  the project's package manager (see `HANDOFF.md` for the `bun link` local
  dev flow, which doesn't require a `bun.lock`).
- `prepare` is now a no-op once `dist/` exists, so installing the built
  `*-dist` release tag (see the release workflow below) doesn't try to
  rebuild the package with tools from `devDependencies` that a git install
  may not have.
- Added `.github/workflows/release.yml`: pushing a `vN.N.N` tag builds the
  package and publishes a sibling `vN.N.N-dist` tag whose commit includes
  the built `dist/`, so consumers can depend on
  `github:CreativeBeastDesign/BeastLand#vN.N.N-dist` without needing to run
  the build themselves (`dist/` stays gitignored on `main`).

## 0.0.1

Initial versions, prior to the changelog:

- `03536a2` First commit
- `218e8d2` changes
- `237338a` Fixes to wallpapers and themes
- `d7cba27` Markdown & Terminal
- `ae8dac9` Audit: short-id index, growing prompt, storage/lifecycle fixes
- `a0b60fe` Index command lookup for per-keystroke matching
- `0649bd6` Add CI, Biome lint script and public-API snapshot test
- `ad3ff9c` Fix accessibility, lifecycle and lint findings
