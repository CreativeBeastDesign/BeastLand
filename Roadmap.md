# Roadmap

Options that were discussed and either deferred or still open. Implemented
things move to the bottom section with a one-liner on the decision so the
"why" survives.

## Deferred

### Terminal — Option D: prompt bar + transient output + log tile

Vim/Helix-style alternative to the fixed left panel:

- A one-line prompt bar at the bottom of the main area; tiles get the full
  width and height.
- The most recent block (command + output) shows as a popover above the bar
  and persists until the next command or `Esc`.
- The full scrollback lives elsewhere: either a normal tile (`log` → `@n`,
  resizable/movable like everything else) or a dedicated log sidebar that
  toggles in and out.

Why deferred: the fixed panel is predictable (muscle memory) and never covers
what it manipulates; transient output makes "where did that list go" a real
cost, and a log tile means tile-managing your own history. Worth an experiment
once the block model exists — D needs exactly that model, so nothing is lost
by waiting.

Open question if revisited: log **tile** (uniform, but competes for grid
space) vs log **sidebar** (predictable position, toggle with the same key as
the prompt bar).

### Terminal — Option A: terminal as a tile

Consistent model (`@0 -w 3`), but the terminal is the input device for
everything else; putting it in the grid lets it be pushed around by moves and
ties it to the 9rem row rhythm. Also only exists on `/tiling`. Not planned.

### Terminal — Option B: bottom-anchored dropdown that grows over the tiles

Hyprland scratchpad feel, but it occludes exactly what you are acting on and
the tiles behind it jump on every command. Could still make sense as a
*second*, transient terminal (`⌃⇧space`) rather than the primary one.

### Horizontal canvas / resize origins

Vertical canvas scrolling exists (`⌃⇧u/i`, plus scroll-into-view on
selection). A *horizontally* scrollable canvas only makes sense once the grid
can be wider than the viewport, which is the niri question below; the keys
(`⌃⇧z/o`) are already bound and become useful the moment it can. Resizing
from another origin (`-w 4 --anchor right`, i.e. move + resize in one) is a
small addition on the explicit-position grid; deferred until something needs
it. Viewport-adaptive header placement (ids on the right when the left edge
is scrolled out) was considered and dropped: too much machinery for a case
canvas scrolling makes rare.

### Niri-style scrolling columns as a second layout strategy

(Multiple *workspaces* now exist as a way to get more than one grid — see
Implemented; this item is about a second layout *strategy* within one
workspace.)

The container model (`{x, y, w, h}`) is layout-agnostic; a column strategy
(width per column, height per window inside the column, `move -l/-r` between
columns) can sit next to the grid strategy. Not started.

### Items with short ids

Items are targeted by position (`item 3 set …`). If items ever get reordered
or referenced across documents, give them jj-style short ids instead of
inventing a third syntax.

## CRM record kinds (from the real backend)

`customer`, `document`, `expense`, `project`, `catalog_item`,
`expense_attachment`, `sequence`. With the kind registry
(`tiling/kinds.svelte.ts`) each is a `KindSpec` (size, label, exists, tile
component) plus a command group, registered by its slice; the workspace and
the terminal stay generic. First thoughts per kind:

- **project** — the natural parent: documents, expenses and work-log entries
  hang off it. Likely the first tile after customer/document; `#id` should
  resolve it like any record.
- **expense** — a record tile (amount, date, project, attachment count);
  `expense_attachment` is probably never a tile of its own — show it inside
  the expense (thumbnail / open link) and give it a command (`expense #x
  attach …`) rather than a kind.
- **catalog_item** — feeds `item new --catalog <#id>` completion more than
  it needs a tile; a small list tile could still be handy.
- **sequence** — number sequences (QUO-2026-0007…): configuration, not a
  tile. A `sequence` command (`sequence ls`, `sequence set QUO --next 8`)
  is enough.
- Short ids are computed over `allIds`; with seven kinds the unique prefix
  will grow to 3 chars occasionally — fine, that is the jj behaviour.

## Extraction: library vs application

What exists today splits into three layers; the package boundary should
follow them, not the current folder layout.

| Layer | Today | Becomes |
|---|---|---|
| **UI kit** — tokens, themes, fonts, utilities, atoms/molecules/organisms/templates, `Tile`, `RecordView`, `Terminal` (as a pure line editor + block renderer), actions (`portal`, `overflowFade`), `theme/`, `wallpapers` manifest shape | `src/lib/components`, `src/lib/styles`, `src/lib/theme`, `src/lib/actions` | `@beastland/ui` — no knowledge of customers, documents or the workspace |
| **Shell runtime** — `Command`/`Span`/`Intent`/`Suggestion` protocol, `parseArgs`, `runCommand`, completion engine, registry, `keys.ts`, `shell` store (theme, wallpaper, preview, terminal focus/run/insert), `shellCommands` (help/clear/theme/wallpaper) | `src/lib/shell` | `@beastland/shell` — depends on ui only for the Terminal |
| **Application** — domain types, seed, `data` store, `views.ts`, `format.ts`, `ids.ts`, tiling workspace store + commands, `CustomerCard`/`DocumentCard`, `TilingWorkspace`, routes | `src/lib/data`, `src/lib/tiling`, the two cards, `TilingWorkspace`, `src/routes` | the app (vertical slices: customers, documents, workspace) |

Things that will hurt during extraction, in order:

1. ~~**`data` is imported by the workspace store**~~ — done: the *kind
   registry* (`tiling/kinds.svelte.ts`) owns size/label/exists/component
   per kind; slices register kinds while mounted and the route calls
   `workspace.prune()` afterwards.
2. **`Tile` takes `allIds`** for short ids → keep `ShortId`/`ids.ts` in the
   UI kit as a generic "shortest unique prefix" utility (it is), pass ids in.
3. ~~**`RecordView` imports `shell`**~~ — UI-kit components (`RecordView`,
   `Menu`, `Breadcrumb`) take an `oncommand` callback; `StatusBar` no longer
   has shell-dependent default content. The app passes `commandBridge` /
   `runBridge` from `shell/bridge.ts`. Only shell components (`Terminal`,
   `ToastStack`, `TilingWorkspace`) and app-layer cards import `shell`.
4. ~~**`TilingWorkspace` hard-codes the keymap**~~ — bindings are data
   (`shell/keymap.ts`: `KeyBinding[]` → named `Action`s), passed as a
   `keymap` prop; `resolveKey` maps events to actions and `describeKeymap`
   generates the legends. `MODIFIER` stays a global in `keys.ts`.
5. ~~**CSS entry points**~~ — `beastland/styles` (all-in-one) and
   `beastland/styles/*` / `beastland/assets/*` are in the `exports` map;
   before this, no stylesheet was importable under modern resolution.
6. ~~**Persistence**~~ — every store goes through `shell/storage.ts`
   (`StorageAdapter`: get/set/remove); default is `localStorage` when a
   window exists, else memory. Stores register a `hydrate()` with their
   key, so `storage.use()` can run at any time. Backends use
   `AsyncStorageAdapter` (load/save/remove) and `await storage.load(api)`:
   one read per registered key into a write-through cache, then the stores
   re-hydrate; writes stay synchronous against the cache and reach the
   backend in the background (`onError`). `/tiling` awaits it at the top
   of a component script (Svelte `experimental.async`) inside a
   `<svelte:boundary>` with `pending`/`failed` snippets.
8. ~~**`tilingCommands` mixed the demo CRM with the generic container
   commands**~~ — `tiling/workspace-commands.ts` holds `@n`, `#id`, `ls`,
   `close`, `reset --layout` and the print helpers, and imports no data
   slice; `KindSpec.view` (record printing) and `KindSpec.actions`
   (kind-specific container verbs such as `item`) replaced the last two
   hard-coded customer/document branches. `tilingCommands` is the demo
   bundle on top. `tests/workspace-commands.test.ts` runs the generic
   commands against a kind the library has never seen.
7. ~~**No tests.**~~ — vitest is in (`npm test`): protocol parsing,
   completion ranking, short ids, formatting/totals, and the **theme
   contract** (`tests/theme-contract.test.ts`: WCAG ratios of every text
   token on surfaces and on glass over typical/extreme wallpaper samples,
   evaluated from the theme CSS itself — it already caught two real
   defects in `hypr-dark`/`hypr-light`). The pure shell protocol moved to
   `shell/protocol.ts` so it imports no stores. Workspace tests run
   against the real rune store (vitest + the Svelte plugin, `browser`
   resolve condition).

## Missing before calling the kit "1.0"

- ~~**Components**~~ — done: ToastStack (+ `toasts` store / `notify()`),
  StatusBar, Tabs, Tooltip, Menu, ScrollArea, Checkbox, Switch,
  Radio/RadioGroup, Textarea, Select, Table (generic, typed), Progress,
  Skeleton, EmptyState, Avatar, Breadcrumb, DatePicker, Drawer. Not
  planned: a command palette (the terminal is one).
- ~~**Commands → toasts**~~ — `customer rm` and `reset --data` notify
  (warning tone). `Input.value` is now `$bindable`.
- **Toast tones** carry a left stripe, a tint and a default glyph per tone;
  popovers use `--color-popover` (more opaque) with the large blur.
- **Terminal:** multi-line input (⇧⏎), history persistence, `!!`/`!n`,
  copy-as-text of a block, a `--json` flag on data commands for other
  consumers. ~~Streaming primitives~~ — done: `ctx.print` returns a
  `LineHandle` (`set`/`append`), blocks stay `running` (pulsing glyph, no
  auto-fold, no `kind` classification) until `run` settles, `ctx.signal`
  carries cancellation, and `kind: "prose"` lines render light inline
  markdown via `proseSpans`. See `src/routes/tiling/demo-commands.ts`
  (`stream`).
- ~~**A11y pass**~~ — done: global reduced-motion guard + `scrollBehavior()`
  for JS scrolls, reduced-transparency/no-backdrop-filter fallbacks for
  tiles/terminal/popup (grain off), focus rings everywhere, modal focus
  trap + restore, `aria-current`, terminal live regions (polite for ack
  outcomes, assertive for errors, data blocks silent), 32px hit areas on
  small icon buttons. Not yet: an automated axe run, a screen-reader
  walkthrough of the tiling workspace.
- ~~**Theme contract test**~~ — done (`tests/theme-contract.test.ts`).
- **Docs:** the README now covers commands, flags, subcommands,
  completion, prefix commands, previews, output, `shell.run/insert`, and
  the no-dispatch escape hatch. Still missing: per-component props, the
  kind registry in depth, the keymap.
- ~~**A second realistic experiment**~~ — the **work log** slice is in:
  `log start #fa 2 "note"` / `log stop` / `log list -w` / `log add` /
  `log rm`, a `worklog` tile kind (timeline by day, live running entry),
  and hours flowing into the document card via `registerDocumentExtras()`
  (the slice pushes a "Logged" field into `documentFields` while mounted
  instead of `views.ts` importing the slice — keeps slices decoupled).
  Lessons: the kind registry held up (zero workspace changes); a virtual
  content id (`worklog:timeline`) is fine for singleton tiles; the 30s
  `clock` store is the right shape for live tiles.

## Open / next

- ~~**Third experiment**~~ — the **project** slice is in (see Implemented).
  Next candidate: a *dashboard* tile kind (open quotes, overdue invoices,
  hours this week — exercises non-record tiles and the StatusBar), or
  *expense* + `expense_attachment` (the first kind with binary content).
- **Seed ids share a prefix** (`project:pr7…`, `project:pr4…`) so their
  short ids are 3 chars; harmless (jj behaviour) but real ids won't do it.
- **Light glass** tuned per theme (`garden-light`: 8px blur, 0.58 tint);
  revisit once the gardeners' wallpaper exists.

- **Graph navigation from records.** Documents already carry `customerId`,
  so the customer line in a `DocumentCard` can be a `#xp` link today
  (cheap). The bigger question is traversal the other way and beyond:
  `customer #xp docs`, `#fa customer`, "everything linked to X". With a
  graph backend the frontend should hold a normalised store (records by id
  + typed edges) and a generic `ref` span so *any* id anywhere is clickable;
  commands then become graph queries. Needs a think about how much of the
  graph to mirror client-side and when to fetch. Deferred until the data
  layer is real.
- A *second*, transient scratchpad terminal is still Option B (deferred).
- **`handover-v2.md`** holds the app-side decisions (ask, conversations,
  notes, search, wallpaper storage, workspaces persistence, settings
  sections, sequencing, what not to build).
- **`HANDOFF.md`** is the integration guide for an app bringing its own
  data; keep it in step with `KindSpec` and the storage seam.
- **Storage: per-request state on the server.** Stores are module
  singletons, so with SSR every request shares them; `storage.load` on the
  server currently loads memory. A real app should either render the
  pending snippet server-side (what `/tiling` does — nothing store-derived
  is in the HTML) or move the read into `+layout.ts` `load` and pass data
  down instead of hydrating singletons.
- **Storage: partial hydration.** `load()` reads every registered key up
  front. Per-kind lazy loading (`load` when a tile of that kind first
  opens) is a `keys` list away, but the stores would need a "not loaded
  yet" state to show; not needed until keys get large.
- Contrast: `text-low` is AA on surfaces and dark glass (≈5.3–5.8) but
  ≈2.8 over the brightest wallpaper spot. The remaining lever is glass
  alpha (0.6 → 0.7) at the cost of breathe-through; not taken.

- Completion: `item 3 …` completes item numbers of the *selected*
  document, but `#fa item 3 …` (same handler, explicit target) gets no item
  numbers because prefix commands only complete their first argument.
- Completion: flag *values* for customer fields (e.g. `--country` → CH/DE/AT)
  once there is a source of truth for them.
- Preview for `@9` / `#zz` (no tile to glow): show the `hint` inline under
  the prompt instead of nowhere.
- Preview ghost for `@3 -w` before the number is typed (currently hint only).
- Cards (`CustomerCard`, `DocumentCard`) reading their fields from
  `data/views.ts` instead of their own lists — one source of truth for
  "which fields at which level".
- `docs new` without a customer: refuse, or keep allowing?
- Status transitions for documents are unvalidated.
- Slim/medium/wide breakpoints (22rem / 36rem) are a first guess.
- Destructive commands (`rm`, `reset --data`) have no confirmation.

## Implemented (decisions)

- **Tiling model: 2D grid**, not niri columns — `-w/-h` and `move --up/--down`
  imply two axes; first-fit spawn, swap on move into an occupied cell, resize
  refused on overlap.
- **Modifier: Control** — `⌥3` is `#` on Swiss/German layouts. `⌃Tab` cannot
  be intercepted in a browser, so next/previous are `⌃n/⌃p`. Every handled
  key `preventDefault`s, which also overrides macOS readline bindings.
- **Scroll keys** follow the hjkl finger logic: `⌃u` down, `⌃i` up, `⌃z/⌃o`
  sideways.
- **Item targeting: positional** (`item 3`, `item last`).
- **Short ids: jj-style** shortest unique prefix over all records, min 2 chars,
  `#` is part of the bold run.
- **Field levels** live in `data/views.ts`: `list ⊂ details ⊂ full`.
- **Terminal contract:** a `Command` registry is the primary API (parse once,
  typed args, `help`/completion for free); raw `onsubmit` + `dispatch={false}`
  + exported `print`/`clear` are the escape hatch.
- **Terminal layout: fixed left panel with block-collapse + focus-width**
  (Option C + E) over A/B/D — predictable position, never occludes its
  targets, history compresses instead of the panel. Blocks: `ack` (≤1 line)
  folds into the input row, `data` folds when a newer data block completes,
  `error` never auto-folds. `⇧↑/⇧↓` walk blocks, Enter toggles, `⌃⇧t` hides
  the panel. 16rem blurred / 24rem focused.
- **Clickable output:** a `Span` may carry a `command`; click runs it (into
  history), ⇧-click inserts it into the prompt. Only navigational commands
  are attached (ids → `#xp`, `ls` → `@n`).
- **Completion:** one declaration per command — `flags` (`FlagSpec`),
  `subcommands`, `complete(args, commands)` for dynamic values — drives the
  popup, `help <command>`, and non-blocking `unknown flag: --x` warnings.
  The engine (`shell/completion.ts`) is pure: fzf-style subsequence scorer
  (prefix/word-start/consecutive bonuses), value match primary, label match
  at half weight (so `#rob` finds Rob but `c` never outranks `customer`).
  Popup keys: ⇥ / ⏎ accept while mid-token, ⏎ submits on a trailing space,
  ↑↓ navigate, Esc dismisses (second Esc blurs). No popup while a flag
  waits for a free-form value (`-w`, `-w `) or when the token already
  exactly matches a candidate; declared `values` still complete. In the
  popup and the prompt, refs (`@n`, `#id`) are primary like commands,
  flags secondary; ids in *output* stay secondary-bold.
- **Material & depth:** grain (`.grain`, feTurbulence at 4%) on glass
  surfaces only, never on the wallpaper; `--shadow-tile` /
  `--shadow-tile-selected` for depth; selected tiles get +0.25 backdrop
  saturation; tiles keep a constant 2px border (hairline drawn as a
  gradient layer) so selection never shifts content. Overflowing scroll
  areas get an edge fade via `use:overflowFade` (mask only while clipped).
- **Type:** document prose (titles, customer, cover letter) in Lexend, data
  in Illinois Mono with `tabular-nums`.
- **Terminal panel: static width (22rem).** Dynamic focus-width is kept as
  an opt-in prop (`focusWidth`, grows *over* the workspace, 250ms collapse
  delay) but off by default: the log's click targets and the block chevrons
  must not move under the cursor, the wider panel covers exactly the tiles
  that previews and ghosts refer to, and vertical space (the real
  constraint) is already handled by block collapse. Hide-toggle removed:
  tiles can't use the freed width anyway.
- The prompt glyph is the disclosure chevron; the prompt is
  syntax-coloured (command accent, known flags secondary, refs cyan,
  unresolvable refs danger + strike). Folded ack rows keep the command
  intact and truncate the outcome.
- **Items:** required items are numbered `1…n`, optional ones lettered
  `a…z` (no badge; colour carries it). `item 2` / `item b` / `item last`
  target them; card, listing and completion share `itemLabels()`.
- **`#dk -w 4 -h 2`** spawns at that size directly (first-fit for the final
  rect) and previews it; before, it spawned small and then resized into a
  neighbour.
- **Totals** live in the items table's `<tfoot>` so they share the Total
  column; the currency appears once, on the `Total CHF` label.
- **Terminal scroll-to-bottom** happens on submit and after the reply, not
  while typing.
- **Spawn size per kind** (`SIZE_FOR_KIND`, document 3×3, customer 2×2) is
  the single source for `spawn`, `open`, `docs new` and the `#xp` ghost —
  previously preview and open disagreed.
- `dim_inactive`: decided against.
- **Links** rest at 40% chroma with a 35% underline and come to full colour
  on hover (`--duration-normal`); no animated underline — too editorial for
  the shell.
- **Contrast** (beast-dark): `text-low` L 0.55 → 0.64, `text-med` 0.75 →
  0.78 after measuring against real glass-over-wallpaper backgrounds.
- **`garden-light`** (gardeners: beige `#d5ae9f`, mint `#a7cdbc`): both
  brand colours are pale, so they are used raw for fills/tints/glass and
  derived darker (`oklch(from … calc(l − 0.3) …)`) for text, borders and
  focus; measured AA on paper and on bright/mint wallpaper samples.
  Wallpaper still to come.
- **Help output** uses a hanging indent (`OutputLine.hang`, `print(…,
  { hang })`): wrapped descriptions continue under their own column. Any
  two-column output can use it.
- **Zero amounts** render as an em dash.
- **`KindSpec.set` hook** (before the fourth kind): a kind declares
  `setFlags` and `set(id, parsed) → { ok, patch } | { ok, error }`; the
  generic `runSet` in tiling prints `updated #id: …` and errors, and
  `@n set`, `#id set`, `customer set`, `docs set`, `project set` all go
  through it. The `set` subcommand's flags are a live union over the
  registry, so completion/warnings follow mounted slices. Field flag
  parsers live next to their kinds (`data/fields.ts`, `project/fields.ts`)
  and are shared with `new`. `tests/kinds-set.test.ts` is the contract a
  new kind must pass. `Command.completeFlags(args)` lets `@n set` / `#id
  set` narrow completion *and* unknown-flag warnings to the target kind
  (falls back to the union when the target can't be resolved).
- **Generic refs:** `KindSpec.ids()` feeds `kinds.allIds` and
  `kinds.resolve(input)`, so `#id` resolves across every registered kind
  and short ids are unique across all of them; `data.resolve` is no longer
  the central authority. This is what the CRM's seven kinds plug into.
- **Project slice** (third experiment): `project list/new/set/rm`,
  `project #pr docs|link|unlink|log`, `docs new --project #pr`,
  `log start #pr`; a tile with status badge, customer link, budget vs
  logged/quoted/invoiced, linked-documents table (rows open the document)
  and recent hours. Cross-slice fields via the same `registerDocumentExtras`
  pattern (documents show their project). Lessons: two documented hooks
  (`docs new --project`, `log start #pr`) were enough — no slice imports
  another's *store* except through the kind registry; project hours
  aggregate both direct entries and entries inherited via documents.
- **Load-then-hydrate.** Chosen over async-shaped stores: a backend is
  read once per key at `storage.load()` into a write-through cache, so the
  stores keep their synchronous `$state` and every command stays sync; only
  the app's entry awaits. The `pending` snippet is rendered on the server
  unconditionally (Svelte's boundary SSR), which is why the boundary sits in
  the route that loads, not the layout — the showcase keeps its SSR.
  `use()` re-hydrates too, so the old "swap before importing stores" rule
  is gone.
- **Open theme/wallpaper/look registries.** `themes`/`wallpapers` are
  rune-backed registries (`.all`/`.get`/`.register`, mirroring `kinds`);
  the library ships five themes and zero wallpapers (the demo registers its
  own in `src/routes/+layout.svelte`). `Theme.wallpaper` names a default
  wallpaper, resolved lazily so a dangling id is harmless; `theme` alone
  never touches the wallpaper (that is what `look` is for) —
  `setTheme(id, { withWallpaper })` / `theme <id> -w` opt in. **Looks** are named
  theme+wallpaper pairs; `shell.look` is derived, nothing new persisted.
  Hydration skips registry validation on purpose (imports are hoisted, the
  app registers after the store hydrates) — `themeMeta`/`wallpaperMeta`
  resolve at read time. The Proxy shim that briefly kept `themes[id]`
  working was removed; the showcase iterates `themes.all`.
- **Settings registry + tile.** `settings.register(section)` (id, label,
  component, order), a singleton `settingsKind` tile with `Tabs`, one
  shipped section (Appearance: `LookPicker`/`ThemePicker`/`WallpaperPicker`,
  dumb molecules), `settings`/`prefs` command.
- **Multiple workspaces (layouts).** `workspace.layouts`/`activeId`,
  `switch/create/rename/remove/next/prev`; every existing container op is a
  facade over the active layout, so call sites don't change. `@n` counters
  are per layout; `prune()` walks every layout. Persisted as
  `beastland:workspaces`, migrated from `beastland:workspace`. `ws` command
  (in `containerCommands`), `⌃⇧1…9`/`⌃⇧n`/`⌃⇧p`, `<Terminal historyKey>`
  for per-workspace input history. Not persisted: output blocks (a stale
  second copy of the data). Small leftover: removing a workspace leaves its
  `beastland:history:<id>` key behind.
- **`Markdown` component:** renders marked's token tree (`marked.lexer`,
  GFM) through Svelte snippets instead of `{@html}` — no sanitizer because
  no HTML string ever exists; a raw HTML tag renders as escaped text, a raw
  HTML block is dropped; images become links. Refs and `beast`/`sh` fence
  lines reuse the grammar of `shell/prose.ts` (regex duplicated, prose.ts
  doesn't export it) and the same click-runs/⇧-inserts behaviour via
  `oncommand`. Highlighting is pluggable (`highlight?`) and ships empty;
  `fractalpop` is a candidate app-side highlighter (5 KB, CSS-variable
  themed) but is version 0 with no stated license, so it isn't wired in.
  `marked` is the package's first runtime dependency (zero deps, 40 KB).
- **Keymap matching:** letters match on `event.key` — `code` is the
  physical US position, so on QWERTZ the key labelled Z reports `KeyY` and
  `⌃z`/`⌃⇧z` never fired for the author. Digits and named keys keep using
  `code` (⌃⇧1 is `!`/`+` in `key`), with a `key` fallback only when `code`
  is empty (synthetic/virtual keyboards).
- **Terminal title bar = status line.** `<Terminal header>` snippet, right
  of the title; the demo puts a `WorkspaceSwitcher variant="ghost"` there
  and the tiling route lost its own header (columns/containers/legend —
  the legend lives in the empty state, the rest is visible on the tiles).
  Candidates for the app: service/connection dots (`StatusItem`), storage
  sync state, the LLM model in use.
- **Numbered selection:** `theme 2`, `wp 5`, `look 1` — 1-based
  registration order, printed by the listings, same idiom as `ws <n>`.
- **Previews:** `Command.preview(args) → Intent` is computed per keystroke
  and published as `shell.preview`; the workspace glows the target (cyan;
  danger when invalid), shows a hint pill (`w 2 → 4 · would overlap @5`),
  and draws a dashed ghost of the resulting rect — also for `#xp` before
  its container exists. `move`/`resize`/`spawn` share `peek*` functions
  with the previews, so preview and execution cannot disagree.
- **Streaming primitives:** `ctx.print` returns a `LineHandle`, so a command
  keeps mutating the line it printed instead of pushing new ones; a
  submitted line's block is `running` until its command settles and is
  never auto-folded or classified meanwhile; `Esc` aborts the running block
  via `ctx.signal` (ahead of blurring the prompt, after closing an open
  popup); and `kind: "prose"` lines render light inline markdown — bold,
  inline code, fenced `beast`/`sh` command blocks, `@n`/`#id` refs — via
  `proseSpans`, no LLM code involved.
