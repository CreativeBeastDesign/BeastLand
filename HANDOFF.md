# Handoff: using BeastLand as the shell for an existing app

Audience: an agent (or person) who has an existing project — at minimum its
data access (an API client, a DB layer, a set of stores) — and wants to run it
inside this shell: terminal on the left, tiles on the right, records addressed
as `#id`, containers as `@n`. Everything below is verified against the code
at the time of writing; when in doubt, the tests in `tests/` are the contract
and `src/lib/data`, `src/lib/worklog`, `src/lib/project` are three worked
examples.

Read `README.md` first for the command protocol (commands, flags,
subcommands, completion, previews, output). This document covers what the
README does not: bringing your own records.

---

## 1. What you are integrating with

Three layers. The package boundary follows them, not the folder names.

| Layer | What it is | Knows about your data? |
|---|---|---|
| **UI kit** — `src/lib/components/*`, `styles/`, `theme/`, `actions/` | Atoms → templates, `Tile`, `RecordView`, cards, `Terminal` as a line editor + block renderer | No. UI-kit components take callbacks (`oncommand`) and plain props. |
| **Shell runtime** — `src/lib/shell/*`, `src/lib/tiling/{workspace,kinds,ids,views,types,workspace-commands}` | Command protocol, completion, registry, `shell` store (theme/wallpaper/preview/terminal focus), keymap, storage seam, the tiling grid, the **kind registry**, the generic container commands | No. It asks the kind registry every question about a record. |
| **Application slices** — `src/lib/data`, `src/lib/worklog`, `src/lib/project`, the tile components, `src/lib/tiling/commands.ts` | The demo CRM: customers, documents, work log, projects | Yes — this is what you replace. |

The whole point of the last extraction rounds was that **you never edit the
first two layers to add a record type**. If you find yourself doing that,
stop and look for the hook you missed (section 4).

### The four seams you plug into

1. **Kind registry** (`kinds.register(spec)`) — one `KindSpec` per record type
   answers: how big is a new tile, what is this record called, does it still
   exist, which component renders it, which ids exist, how is it printed,
   which flags does `set` accept, how is it edited, which extra verbs does it
   have.
2. **Command registry** (`registry.register(commands)`) — your command groups
   (`invoice list`, `invoice new --…`) next to the generic `workspaceCommands`.
3. **Storage** (`storage.use/load`) — persistence for the shell's own state
   (theme, wallpaper, workspace layout) and, if you want it, for your stores.
4. **UI callbacks** — cards and record views take `oncommand`; wire them with
   `commandBridge` / `runBridge` from `$lib/shell/bridge.ts`.

Everything is a Svelte 5 rune store or a plain object. No context API, no
stores from `svelte/store`.

---

## 2. Decide your data strategy first

The demo keeps whole datasets in memory (`$state` arrays) and persists them as
JSON blobs through `storage`. That is fine for the shell's own state and for
small datasets. Your existing project probably has a real backend. Pick one:

**A. Records live in your stores; the shell persists only its own state.**
Recommended when you have an API. Write a `.svelte.ts` store per entity that
talks to your data layer (fetch on load, optimistic update on `set`), and do
*not* route it through `storage`. `storage` then only carries
`beastland:shell` and `beastland:workspace` — leave the default
(`localStorage`) or point it at your preferences endpoint.

**B. Everything through `storage`.** Your data access exposes "give me the
blob for key K / save blob for key K". Implement `AsyncStorageAdapter`
(`load/save/remove`, promises), call `await storage.load(adapter)` once at
startup, and write your stores like `src/lib/data/store.svelte.ts` (read at
import, `storage.register(KEY, hydrate)`, `storage.setJson` after each
mutation). See README → Storage → *Load then hydrate*.

Either way, the workspace needs two things from your stores *synchronously*
once the app is rendered: `exists(id)` and `label(id)`. So load the records
the layout refers to before rendering the workspace (an `await` at the top of
the route component, inside a `<svelte:boundary>` with a `pending` snippet —
`src/routes/tiling/{+page,Workspace}.svelte` shows the shape), or make
`exists` return `true` and `label` return a placeholder while a record is
still unknown, and let `workspace.prune()` run after your load resolves.

Id format: full ids are strings; `bareId()` strips everything up to the first
`:` (and a leading `doc_`) before computing short ids, so use
`"<kind>:<opaque>"` — `invoice:01J9…`. Short ids are the shortest unique
prefix of the bare part across **all** registered kinds, minimum 2 chars. If
two ids share a long prefix (the demo's `project:pr7…`/`project:pr4…`) the
short id just grows. Ids must be unique across kinds (they are, if the bare
part is a real id).

---

## 3. Bootstrapping the shell (30 minutes)

Install the package or vendor `src/lib`. Svelte 5 (runes) is required;
SvelteKit is what the demo uses but nothing in `src/lib` imports `$app/*`.
Set `compilerOptions.experimental.async = true` only if you use `await` in
components (the storage load pattern does).

Layout (copy of `src/routes/+layout.svelte`, reduced):

```svelte
<script lang="ts">
  import { Terminal, Wallpaper, ToastStack, shell } from "beastland";
  import "beastland/styles";                       // fonts + tokens + utilities + themes, in order
  let { children } = $props();
  $effect(() => { shell.hydrate(); });             // apply persisted theme to <html>
</script>

<div class="shell">
  <Wallpaper src={shell.wallpaperMeta.src} style="position:absolute; inset:0; z-index:var(--layer-wallpaper)" />
  <div class="shell__terminal"><Terminal /></div>  <!-- static 22rem; `focusWidth` opt-in -->
  <main class="shell__main">{@render children()}</main>
</div>
<ToastStack />
```

Route (copy of `src/routes/tiling/Workspace.svelte`, reduced):

```svelte
<script lang="ts">
  import { registry, kinds, workspace, workspaceCommands, TilingWorkspace } from "beastland";
  import { untrack } from "svelte";
  import { invoiceKind, invoiceCommands } from "$lib/invoices";

  // (strategy B) await storage.load(myAdapter);
  // (strategy A) await invoices.loadAll();

  $effect(() => registry.register(workspaceCommands));   // @n, #id, ls, close, reset --layout
  $effect(() => registry.register(invoiceCommands));
  $effect(() => {
    const off = [invoiceKind].map((k) => kinds.register(k));
    untrack(() => workspace.prune());                     // drop containers whose records vanished
    return () => off.forEach((fn) => fn());
  });
</script>

<TilingWorkspace />
```

Both `register` calls return the unregister function, so `$effect` handles
mount/unmount. The `untrack` is not optional: `prune()` reads the registry
the effect just wrote and would loop otherwise (`effect_update_depth_exceeded`).

At this point `help`, `theme`, `wallpaper`, `ls`, `@n`, `#id` work and the
empty-state panel shows the keymap legend. Nothing else until you register a
kind.

---

## 4. One slice per record type

Copy the layout of `src/lib/project/` — it is the newest slice and uses every
hook. Files, in the order to write them:

### 4.1 `types.ts`
Your record type plus a `Fields` subset (what `new`/`set` may write). Keep
`id`, `createdAt`, `updatedAt` out of `Fields`.

### 4.2 `store.svelte.ts`
A closure factory returning getters over `$state`. Contract the rest of the
slice relies on:

```ts
export const invoices = createInvoices();   // singleton
invoices.invoices: readonly Invoice[]        // reactive getter
invoices.get(id): Invoice | undefined
invoices.create(fields): Invoice
invoices.update(id, patch): Invoice | undefined
invoices.remove(id): boolean
```

Strategy B stores add `hydrate()` + `storage.register(KEY, hydrate)` and call
`storage.setJson(KEY, …)` after each mutation (`src/lib/data/store.svelte.ts`).
Strategy A stores call your API; keep the mutation methods synchronous from
the caller's point of view (update `$state`, fire the request, reconcile on
response) because every command `run` and every `KindSpec.set` is
synchronous. If a write must be awaited, `run` may return a promise, but
`set` may not — do the optimistic update in `set` and notify on failure.

### 4.3 `fields.ts` — flags and parsers, shared by `new` and `set`

```ts
export const invoiceFieldFlags: FlagSpec[] = [
  { name: "title", short: "t", description: "Title", takesValue: true },
  { name: "status", description: "Status", takesValue: true, values: ["draft", "sent", "paid"] },
  { name: "due", description: "Due date (ISO)", takesValue: true },
];
export function invoiceFieldsFromFlags(parsed: ParsedArgs): Partial<InvoiceFields> { … }
```

`flag(parsed, "title", "t")` returns `string | true | undefined`; always
check `typeof === "string"` for value flags. Declared `values` complete in
the popup; a value-taking flag without `values` suppresses completion while
the user types the value (that is by design — README → Completion).
Cross-record flags (`--customer <#id>`) resolve through `kinds.resolve(token)`
and check `.kind` — see `customerIdFromFlags` in `src/lib/project/fields.ts`.

### 4.4 `views.ts` — what the terminal prints

```ts
export const invoiceFields: FieldDef<Invoice>[] = [
  { key: "title",  label: "Title",  level: "list",    get: (i) => i.title || "—" },
  { key: "status", label: "Status", level: "details", get: (i) => i.status },
  { key: "id",     label: "Id",     level: "full",    get: (i) => i.id },
];
```

`list ⊂ details ⊂ full`. The first `list` field is the single line
`invoice list` prints. `FieldDef`, `Level`, `fieldsAt`, `viewFrom` come from
`$lib/tiling/views.ts` (generic); `$lib/data/views.ts` re-exports them for
the demo.

### 4.5 `kind.ts` — the `KindSpec`

```ts
export const invoiceKind: KindSpec = {
  kind: "invoice",
  size: { w: 3, h: 2 },                                   // grid units; 6 columns, rows are 9rem
  label: (id) => invoices.get(id)?.title ?? "?",
  exists: (id) => !!invoices.get(id),
  component: InvoiceTile,                                 // Component<{ contentId: string }>
  ids: () => invoices.invoices.map((i) => i.id),          // feeds #id resolution + short ids
  view: viewFrom(invoiceFields, (id) => invoices.get(id)),// `#id -d` / `-f`
  setFlags: invoiceFieldFlags,                            // completion + warnings for `@n set`
  set: (id, parsed) => {                                  // never prints; returns the patch or an error
    const patch = invoiceFieldsFromFlags(parsed);
    if (Object.keys(patch).length === 0) return { ok: false, error: "usage: set --title|--status|--due <value>" };
    if (!invoices.update(id, patch)) return { ok: false, error: "no such invoice" };
    return { ok: true, patch };
  },
  actions: [                                              // optional: `@n send`, `#id send --now`
    { name: "send", description: "Send the invoice", flags: [{ name: "now", description: "Send immediately" }],
      run: (id, args, ctx) => { …; ctx.print(`sent ${id}`, "output"); } },
  ],
};
```

What each hook buys you, without writing a command:

| Hook | Enables |
|---|---|
| `ids` | `#in` resolves, `#` completion lists your records, short ids stay unique across kinds |
| `label`, `exists` | tile title, `ls`, pruning of stale containers |
| `size`, `component` | `#id` spawns a tile of that size rendering your component |
| `view` | `#id -d`, `#id -f` print the record; without it only the label prints |
| `setFlags` + `set` | `@n set --…`, `#id set --…`, narrowed completion and unknown-flag warnings; the generic `runSet` prints `updated #id: k=v` |
| `actions` | `@n <verb> …` / `#id <verb> …` with their own flags; joins `move/close/title/set` in completion and `help`. Names must not collide with those four |

Singleton tiles (a dashboard, a timeline) use a virtual content id and omit
`ids` — `src/lib/worklog/kind.ts` (`worklog:timeline`).

`tests/kinds-set.test.ts` is the contract for `setFlags`/`set`; add your kind
to its `editable` list. `tests/workspace-commands.test.ts` shows the whole
`KindSpec` exercised by the generic commands against a kind the library has
never seen — the fastest way to check a new kind is to swap `widgetKind`
there for yours.

### 4.6 The tile component

Ten lines: look the record up, render a card, `EmptyRecord` otherwise
(`src/lib/components/tiles/ProjectTile.svelte`). Cards are UI-kit components
built from `RecordView` (label/value rows, `oncommand` for clickable refs)
and the atoms; pass `oncommand={commandBridge}` so `#id` links run through
the terminal. Prose in `var(--font-ui)` (Lexend), data in `var(--font-mono)`
with `tabular-nums`; keep the card free of shell imports (the app-layer card
may import `shell`; `RecordView` may not).

### 4.7 `commands.ts` — the command group

Mirror `src/lib/project/commands.ts`. Grammar the demo established (keep it,
users have muscle memory across kinds):

```
invoice [list [-d|-f]]         list; --details adds columns
invoice new --title … --…      create + spawn a tile
invoice set --…                edit the *selected* container (delegates to runSet)
invoice rm <#id>               remove (notify() on destructive actions)
invoice <#id> [-d|-f]          open, or print with -d/-f
invoice <#id> <verb> …         record-specific verbs
```

Reuse from `$lib/tiling/workspace-commands.ts` instead of re-implementing:
`sid`, `idSpans`, `say`, `printAmbiguous`, `levelFromArgs`, `printList`,
`printRecord`, `printRows`, `printTable`, `detailFlags`, `runSet`,
`recordSuggestions("invoice")`, `containerSuggestions`. `runSet` is how
`invoice set` and `@n set` stay identical.

Declare `flags`, `subcommands` (with their flags) and `complete(args)` — the
popup, `help invoice` and unknown-flag warnings are generated from them.
`preview(args)` is optional; return `{ target: sid(id), hint }` for anything
that targets a record so the tile glows while the line is typed.

### 4.8 `index.ts`
Re-export the public surface, plus any cross-slice extras (below).

### 4.9 Register (section 3) and, if the app has several slices, cross-slice fields

Slices never import each other's stores directly. Two sanctioned patterns:

- **Resolve through the registry**: `kinds.resolve("#xp")` gives
  `{ kind, id }`; `kinds.labelOf(kind, id)` gives a name. Enough for links.
- **Push a field into another slice's view**: `registerDocumentExtras()` in
  `src/lib/project/index.ts` appends a `FieldDef` to `documentFields` while
  mounted and removes it on unmount. Your slice exports the same shape;
  the route calls it in an `$effect`.

The one documented exception is completion that needs another slice's
names (`docs new --project <#partial>`), which imports the other store and
says so in a comment. Prefer `recordSuggestions("project")` now — it did not
exist when that exception was written.

---

## 5. Keymap, theme, status bar

- Keys are data: `defaultKeymap` (`$lib/shell/keymap.ts`) → `TilingWorkspace
  keymap={…}`; `describeKeymap` generates legends. Modifier is Control
  (`MODIFIER` in `keys.ts`) because `⌥3` is `#` on Swiss/German layouts.
- A theme is one CSS file setting the semantic tokens under `[data-theme]`
  (`src/lib/styles/themes/garden-light.css` is the light reference,
  `beast-dark.css` the dark one). Register it in `$lib/theme/index.ts` and
  run `npm test` — `tests/theme-contract.test.ts` measures WCAG ratios of
  every text token on surfaces and on glass over wallpaper samples and will
  tell you which token to fix.
- `StatusBar` has no shell knowledge; pass `left/center/right` snippets
  (the showcase passes `shell.themeMeta`). Toasts: `notify({ title, message,
  tone })`.

---

## 6. Verification checklist

Run after each slice; all of it takes two minutes.

```
npm test                        # 199 tests incl. the KindSpec and workspace-command contracts
npx svelte-check                # 0 errors, 0 warnings is the baseline
npm run build                   # svelte-package + publint
```

In the browser (fresh tab, console open, zero errors is the bar):

1. `invoice list`, `invoice list -d` — columns aligned, ids bold-prefixed.
2. `invoice new --title "X"` → `created #ab @1`, tile appears at `size`.
3. `#ab` (bare) selects it; `#ab -d` prints without opening; `#a` alone
   says `ambiguous:` if another id shares the prefix.
4. `@1 set --title "Y"` → `updated #ab: title=Y`, tile re-renders; `@1 set`
   → your usage error; `@1 set --bogus` → `unknown flag: --bogus` warning.
5. Type `@1 ` — popup lists `move close title set` + your actions; `@1 set
   --` lists only your flags.
6. `⌃h/j/k/l` select, `⌃⇧h` moves, `⌃q` closes, Enter/Esc refocus the
   prompt, typing `#` anywhere jumps into it.
7. Reload — layout and records come back through your storage strategy; a
   removed record's container is pruned.
8. Click a `#id` in a card — runs through the bridge; ⇧-click inserts.
9. `theme garden-light` — readable; `reset --layout` — empty state with legend.

---

## 7. Rules that are easy to break

- **Registration only inside `$effect`, prune only inside `untrack`.**
- **Never read a store in a module-level `$derived`** in a `.svelte.ts` file
  that other modules import at load; keep derived state inside the factory.
- **`complete(args, commands)` receives the command list** — do not import
  the registry from a command module (import cycle).
- **Prefix commands get the raw token as `args[0]`**; their subcommand sits
  at `args[1]`. `knownFlags`/`flagsFor` already account for that.
- **A command named `reset` exists** in both `workspaceCommands` (layout
  only) and the demo bundle; do not register both bundles at once. Register
  `workspaceCommands` + your groups, never `tilingCommands`, unless you also
  want the demo CRM.
- **`set` returns, it never prints**; `run` prints, it never returns data.
- **Exact-match closes the popup**: if your suggestion `value` equals the
  typed token, no popup — intended.
- **`storage.load` reads only registered keys**; a store imported *after*
  `load` resolves hydrates from the cache, so import your stores before
  awaiting (imports are hoisted — this is automatic unless you `import()`).
- **Server**: stores are module singletons. With SSR, render the pending
  snippet server-side (the `/tiling` route does) or move reads into
  `+layout.ts` `load`. Do not hydrate singletons per request.
- **No `browser`/`window` checks in stores** — the storage default adapter
  handles SSR; `typeof document !== "undefined"` guards only DOM work.

---

## 8. Where things are

```
src/lib/shell/
  protocol.ts          Command/FlagSpec/Suggestion/Intent/Span, parseArgs, flag, runCommand
  commands.ts          re-exports protocol + shellCommands (help/clear/theme/wallpaper/echo/about/time)
  completion.ts        fuzzyScore, rank, candidatesFor, applySuggestion
  registry.svelte.ts   registry.register(commands) → unregister
  state.svelte.ts      shell: theme, wallpaper, preview, run/insert/focusTerminal
  storage.ts           StorageAdapter, AsyncStorageAdapter, storage.use/load/register
  keymap.ts, keys.ts   bindings as data, MODIFIER
  bridge.ts            commandBridge, runBridge (UI-kit → shell)
  toasts.svelte.ts     notify()
src/lib/tiling/
  types.ts             Container, GRID_COLUMNS, DEFAULT_SIZE, WorkspaceStore contract
  workspace.svelte.ts  the grid: spawn/open/move/resize/close/prune, peek* for previews
  kinds.svelte.ts      KindSpec, KindAction, kinds.register/resolve/allIds/exists
  ids.ts               shortId, resolveId, bareId, SHORT_ID_MIN
  views.ts             Level, FieldDef, fieldsAt, viewFrom
  workspace-commands.ts  @n, #id, ls, close, reset --layout + print helpers + runSet (no data imports)
  commands.ts          the demo CRM (customer, docs, item, reset --data) + tilingCommands bundle
src/lib/{data,worklog,project}/   the three example slices
src/lib/components/tiles/         one tile per kind + EmptyRecord
src/routes/tiling/                the reference route (boundary + awaited load + registrations)
tests/                            the contracts; Roadmap.md has the deferred decisions
```

## 9. Known gaps you may hit

From `Roadmap.md`, the ones relevant to an integration: no confirmation on
destructive commands (`rm`); document status transitions unvalidated; no
multi-line input or history persistence in the terminal; completion for
`#id <verb> <arg>` only covers the first argument of prefix commands; per-
component prop docs are the components' own `Props` types; per-request
server state (section 7). None of them block bringing a new kind.
