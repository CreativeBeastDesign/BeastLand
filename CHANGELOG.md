# Changelog

## 0.6.1

- `RecordView` lays key/value pairs side by side on wide tiles instead of
  one tall column: 2 pairs from a 32rem tile, 3 from 52rem (container
  queries on the tile). Pairs flow row by row; `wide` fields still span the
  full width. New `maxPairs?: 1 | 2 | 3` prop (default 3); `1` keeps the
  previous single-column layout.

## 0.6.0

- `Table` gains `markedKey?: string` — a transient "about to be acted on"
  row (`.table__row--marked`: secondary-tinted background plus an inset 3px
  bar, layout-neutral), separate from the persistent `selectedKey`.
- `KindSpec.preview?: (contentId, args) => Intent | null` lets a kind preview
  its own verbs (e.g. `@2 item 1` / `#id item 1 …`). `previewContainerArgs`
  asks it for any non-flag verb other than `close`/`title`/`move`, before the
  flag shorthands — matching `applyContainerArgs`' dispatch order, so
  `item 3 -h` isn't previewed as a resize. Pure and cheap, like
  `Command.preview`.
- `Intent.detail?: Record<string, unknown>` — structured app payload passed
  through untouched to `shell.preview`, so apps no longer encode data into
  `hint`.

## 0.5.1

- Fixed: pressing ArrowDown while typing a command no longer wipes the input,
  and ArrowUp → ArrowDown now restores the unsent draft instead of an empty
  line — shell-style (bash/zsh/fish) history navigation. ArrowDown on the
  live line with no history recall in progress is a no-op. Edits made to a
  recalled history entry are kept for the rest of the session (readline
  semantics) but never persisted. New pure module
  `src/lib/shell/history-nav.ts` (`initHistoryNav`, `navigateUp`,
  `navigateDown`, `resetHistoryNav`) holds the state machine, with unit
  tests in `tests/history-nav.test.ts`. Submitting or pressing Escape resets
  the draft/edits. In a wrapped (multi-line) prompt, ArrowUp/Down now only
  trigger history recall when the caret is on the first/last visual row —
  otherwise the caret moves between wrapped lines as in a normal text field.

## 0.5.0

- Generic undo facility: `src/lib/shell/undo.svelte.ts` exports `undoStack`
  (`push`/`irreversible`/`undo`/`list`/`clear`) and `undoSpan`. `push`
  returns a numeric id and accepts a `guard` (re-checked right before the
  inverse runs; a non-null return refuses with that reason) and an
  `expiresAt`. `irreversible(label, reason)` records a non-undoable action.
  Plain `undo()` always targets the most recent entry; if it isn't undoable
  it explains why and names the next undoable id rather than reaching past
  it. Entries are marked `"undone"`, not removed; capped at 50; in-memory
  only. One undo runs at a time; a failing inverse leaves its entry
  undoable and reports the error.
- New built-in shell command `undo`: `undo` (latest), `undo <id>`, `undo
  -l`/`--list` (id, label, age, status — muted for non-undoable);
  completion offers undoable ids with their labels.
- `undoSpan(id)` builds a `Span` using the existing `Span.command` (a
  clickable span that runs a command line through the dispatcher exactly as
  if typed, echoed in history) for a muted `[undo]` link.
- `workspace.svelte.ts`'s `spawn`/`close`/`move`/`resize` push a
  `"layout"`-grouped undo entry for every user-initiated call: `spawn` →
  close; `close` → re-create the same kind/contentId/title/rect and, when
  free, the same `@n` id (falling back to ordinary placement otherwise);
  `move`/`resize` → restore the previous rect(s). Selection-only changes
  and `prune()` push nothing; undoing never pushes a new entry of its own.
- New exports: `undoStack`, `undoSpan`, `UndoStack`, `UndoEntry`,
  `UndoStatus`, `UndoPushInput`, `UndoOutcome`.

## 0.4.0

- `-h`/`--help` on any command at any depth (`doc -h`, `doc #id -h`,
  `doc #id item -h`), handled centrally; `help <cmd> [args…]` renders the
  same context-specific help. Flags print bundled (`-l, --limit <value>`)
  with full descriptions. Commands that define their own `-h`/`--help`
  keep it.
- Completion shows one entry per flag (`-a, --all`), inserting the
  spelling that matches what was typed.
- Clickable links: bare http(s) URLs in output are linkified, and `Span`
  takes an optional `href`; both open in a new tab (http/https only).
- New exports: `helpRowsFor`, `printHelpRows`, `linkify`, `isAllowedLinkHref`.

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
