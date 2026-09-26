# BeastLand

A Hyprland-inspired app-shell kit for Svelte 5: glass surfaces over a live
wallpaper, a token-driven theme system, and a keyboard-first **terminal** that
other parts of your app extend with commands.

This README covers the part you will touch most as an app author: **putting
your own commands, flags and completions into the terminal.** Design decisions
and open items live in [Roadmap.md](Roadmap.md).

- [Install](#install)
- [Mount the terminal](#mount-the-terminal)
- [Your first command](#your-first-command)
- [Flags](#flags)
- [Subcommands](#subcommands)
- [Completion](#completion)
- [Prefix commands (`@2`, `#xp`)](#prefix-commands-2-xp)
- [Previews](#previews)
- [Output](#output)
  - [Streaming](#streaming)
- [Driving the terminal from elsewhere](#driving-the-terminal-from-elsewhere)
- [Wiring UI components to the shell](#wiring-ui-components-to-the-shell)
- [Markdown](#markdown)
- [Themes, wallpapers, looks](#themes-wallpapers-looks)
- [Settings](#settings)
- [Workspaces](#workspaces)
- [Keymap](#keymap)
- [Storage](#storage)
- [Using the terminal without the dispatcher](#using-the-terminal-without-the-dispatcher)
- [Reading components (case studies)](#reading-components-case-studies)
- [Reference](#reference)

## Install

```bash
npm install beastland      # not published yet: use a path dependency, see HANDOFF.md §3
```

Import the stylesheet once in your root layout — fonts, tokens, utilities and
every theme, in the right order:

```svelte
<script lang="ts">
  import "beastland/styles";
</script>
```

Or pick layers yourself (same order: fonts → tokens → utilities → themes):

```ts
import "beastland/styles/fonts.css";
import "beastland/styles/tokens/base.css";
import "beastland/styles/tokens/semantic.css";
import "beastland/styles/tokens/components.css";
import "beastland/styles/utilities/glass.css";
import "beastland/styles/utilities/motion.css";
import "beastland/styles/themes/beast-dark.css";
```

Set the theme on `<html data-theme="beast-dark">` (or call `applyTheme`).
Lexend is loaded from Google Fonts by your `app.html`; Illinois Mono ships
with the package.

## Mount the terminal

```svelte
<script lang="ts">
  import { Terminal } from "beastland";
</script>

<Terminal />
```

With no props the terminal dispatches lines to the **shell registry**: the
built-in commands (`help`, `clear`, `theme`, `wallpaper`, `echo`, `about`,
`time`) plus whatever you register. `help` and `help <command>` are generated
from your declarations, so there is nothing to document by hand.

`thumb` is optional but worth setting: without it a picker downloads every
full-size wallpaper to draw a 96px preview.

The prompt starts one line tall and grows with the command — a long
`customer new --name … --email …` stays readable instead of scrolling out of
sight sideways. Past `maxInputLines` (6 by default) it stops growing and
scrolls internally, keeping the caret in view; ↑/↓ remain history, as
everywhere else in the shell. The transcript keeps `maxBlocks` blocks (200)
and drops the oldest, so a shell left open for days stays bounded.

## Your first command

A command is a plain object. Register it while the part of your app that owns
it is mounted; the returned function unregisters it.

```svelte
<script lang="ts">
  import { registry, type Command } from "beastland";

  const commands: Command[] = [
    {
      name: "greet",
      aliases: ["g"],
      description: "Say hello",
      usage: "greet [name]",
      run: (args, ctx) => {
        ctx.print(`hello ${args[0] ?? "world"}`);
      },
    },
  ];

  $effect(() => registry.register(commands));
</script>
```

`run` receives the tokens after the command name (double quotes group words:
`greet "Ada Lovelace"` → `["Ada Lovelace"]`) and a `CommandContext`:

| member | purpose |
|---|---|
| `ctx.print(text, kind?, opts?)` | append an output line; `kind` is `"output"` (default), `"error"` or `"system"` (muted) |
| `ctx.clear()` | clear the log |
| `ctx.commands` | every registered command (what `help` iterates) |

Lines with ≤ 1 output line fold into the input row (`❯ greet → hello world`);
longer output becomes a collapsible block. Errors never auto-fold.

## Flags

Parse flags with `parseArgs` and read them with `flag(parsed, long, short)`.
**Declare** them on the command too — the declaration drives completion,
`help <command>`, and a muted `unknown flag: --x` warning when someone
mistypes one.

```ts
import { parseArgs, flag, type Command } from "beastland";

const deploy: Command = {
  name: "deploy",
  description: "Deploy the current build",
  flags: [
    { name: "env", short: "e", description: "Target environment", takesValue: true, values: ["staging", "prod"] },
    { name: "dry-run", description: "Only print what would happen" },
    { name: "tag", short: "t", description: "Release tag", takesValue: true },
  ],
  run: async (args, ctx) => {
    const parsed = parseArgs(args);
    const env = flag(parsed, "env", "e") ?? "staging";
    const dryRun = flag(parsed, "dry-run") !== undefined;
    const tag = flag(parsed, "tag", "t");
    if (typeof tag !== "string") {
      ctx.print("usage: deploy --tag <tag> [--env staging|prod] [--dry-run]", "error");
      return;
    }
    ctx.print(`${dryRun ? "would deploy" : "deploying"} ${tag} to ${env}`);
  },
};
```

Grammar the parser understands: `--long value`, `--long=value`, `-s value`,
boolean flags (`--dry-run`), negative numbers as values (`--offset -5`).
`takesValue: true` with `values` gives the popup a list; `takesValue` without
`values` tells the popup to stay quiet until the user has typed the value.

## Subcommands

Subcommands are declared, not dispatched — you still branch on `args[0]` in
`run`. Declaring them gets you completion in the second position, per-
subcommand flags, and a structured `help deploy`.

```ts
const project: Command = {
  name: "project",
  aliases: ["p"],
  description: "Manage projects",
  usage: "project [list|new|rm] …",
  subcommands: [
    { name: "list", aliases: ["ls"], description: "List projects" },
    { name: "new", description: "Create a project", flags: [
      { name: "name", short: "n", description: "Project name", takesValue: true },
    ] },
    { name: "rm", description: "Remove a project" },
  ],
  run: (args, ctx) => {
    const [sub, ...rest] = args;
    if (!sub || sub === "list" || sub === "ls") { /* … */ return; }
    if (sub === "new") { const parsed = parseArgs(rest); /* … */ return; }
    ctx.print(`unknown subcommand: ${sub}`, "error");
  },
};
```

Flags declared on a subcommand are only valid (and only completed) after that
subcommand; flags on the command are valid everywhere.

## Completion

The popup opens as the user types and is filled from three sources you
already declared — command names, subcommands, flags — plus one you provide:

```ts
complete: (args) => {
  // `args` is exactly what `run` would get, with the token being typed LAST
  // ("" after a trailing space). Return candidates for that last token only;
  // the engine fuzzy-ranks them (fzf-style, labels match too: `#rob` finds
  // "Rob Van Der Linden").
  if (args.length === 1) {
    return customers.map((c) => ({ value: `#${c.short}`, label: c.name, description: c.company, kind: "value" }));
  }
  return [];
},
```

A `Suggestion` is `{ value, label?, description?, kind?, boost? }`. `value`
replaces the token; `label` is searched as well; `kind` colours the row
(`command` / `subcommand` / `flag` / `value`); `boost` nudges ties.

When the right flags depend on *what* is being addressed, answer per call:

```ts
// `@2 set --…` should only offer the fields of whatever @2 shows.
completeFlags: (args) => (args[1] === "set" ? fieldsFor(args[0]) : null),
```

`null` falls back to the static declaration. The same answer feeds the
unknown-flag warning, so completion and validation cannot disagree.

Keys: `Tab` accepts (or the first candidate when the popup is closed),
`↑`/`↓` move, `Enter` accepts while mid-token and submits otherwise, `Esc`
dismisses. The popup stays closed when the token already exactly matches a
candidate or a free-form flag value is required.

A flag with both a long and short name is a single suggestion, labelled
`-a, --all` — never two rows. Typing a lone `-` inserts the short form (when
one exists), `--` inserts the long form; either still fuzzy-matches the
other (`--li` still finds `--limit`).

## Help (`-h`/`--help`)

Every command gets `-h`/`--help` for free, at any depth, without declaring
anything: the shell intercepts it centrally, before `run`, the same way for
every command.

```
doc -h              # top-level: description, usage, subcommands/verbs, flags
doc #41e3 -h        # context-specific: verbs and flags valid for `#41e3`
doc #41e3 send -h   # deeper still — same mechanism, one level further in
```

The verbs/flags shown are computed exactly like the completion popup would
at that point (`complete`/`completeFlags`), so help can never drift from
what typing offers. Flags print bundled, short-first, one per line:

```
flags:
  -a, --all            Show every item (no limit)
  -l, --limit <value>  Max rows
```

`help <command> [args…]` prints the identical thing — `help doc #41e3` is
`doc #41e3 -h` by another name — except `help <command>` with **no** extra
args keeps the fuller static manual (`command.subcommands`/`flags` as
declared, aliases combined, each subcommand's own flags nested underneath),
matching what it has always shown.

Two guards keep this from surprising anyone: a command that already declares
its own `h` short flag or `help` long flag is never hijacked (its `-h`/
`--help` reaches `run` like any other flag), and a quoted `"-h"` is treated
as a literal argument, not the help flag.

Reach for `helpRowsFor(command, args, commands)` / `helpRows(command)`
directly (they return the same `HelpRow[]` the terminal prints, via
`printHelpRows`) to embed a command's grammar elsewhere — an LLM system
prompt, say — the way `helpText`/`helpIndex` already let you do for the
static manual.

## Prefix commands (`@2`, `#xp`)

Some commands are *shaped* rather than named — a container reference, a
record id. Give them a `match` predicate; the raw token arrives as `args[0]`.

```ts
const hash: Command = {
  name: "#<id>",                       // shown in help; never typed
  description: "Open a record by short id",
  match: (token) => /^#\S*$/.test(token),
  complete: (args) => (args.length === 1 ? allRecords() : []),   // `#ro` → #xq Rob…
  run: (args, ctx) => {
    const [token, ...rest] = args;
    const hit = resolve(token);
    if (!hit) { ctx.print(`unknown id: ${token}`, "error"); return; }
    open(hit);
  },
};
```

Name/alias lookup runs first; `match` is consulted only when nothing matched.
Prefix commands get `flags`, `subcommands`, `complete` and `completeFlags`
exactly like named ones — the shell already ships `@<n>` and `#<id>`, so
check for clashes before adding another sigil.

## Previews

A command can describe what a half-typed line *would* do, on every keystroke,
without doing it. The shell publishes the result as `shell.preview`; the
tiling workspace uses it to glow the target tile, show a hint pill and draw a
dashed ghost of the resulting rectangle. Your own surfaces can read it too.

```ts
preview: (args) => {
  const target = args[0];                       // "@3"
  const width = flag(parseArgs(args.slice(1)), "width", "w");
  if (typeof width !== "string") return { target, hint: "w 2" };
  const rect = peekResize(target, Number(width));
  return { target, hint: `w 2 → ${width}`, ghost: rect, invalid: !rect.ok };
},
```

Rules: pure, cheap, never throws on partial input (`@`, `@3 -`), returns
`null` when there is nothing to show. `Intent` is
`{ target?, hint?, ghost?: { x, y, w, h }, invalid? }` — `target` is the
reference *as typed*; the prompt strikes it through when `invalid` and no
`ghost` is given (i.e. the target itself could not be resolved).

## Output

`ctx.print` accepts styled spans instead of a string:

```ts
ctx.print([
  { text: "#xp", tone: "id", command: "#xp" },   // clickable: click runs it, ⇧-click inserts it
  { text: "oakahe", tone: "id-rest" },
  { text: "  Engin Kiran" },
]);
```

Tones: `id`, `id-rest`, `key`, `muted`, `accent`, `bold`, `code`. A span with
`command` becomes a button; attach only navigational commands to clicks,
never destructive ones.

### Links

A bare `http://`/`https://` URL in plain output text or a span's `text` is
auto-linkified — detected, trimmed of trailing sentence punctuation
(`.`, `,`, a closing `)` that isn't balanced by one inside the URL…), and
rendered as a real link that opens in a new tab (`target="_blank" rel="noopener
noreferrer"`). This does not apply inside `tone: "code"` spans (a URL there
is data to read or copy, not click) or the prompt input.

To link an explicit label to a URL — rather than printing the URL itself —
set `href` on a span:

```ts
ctx.print([{ text: "Open the PDF", tone: "accent", href: `${baseUrl}/documents/${key}/pdf` }]);
```

Only `http:`/`https:` are ever honoured, for `href` exactly as for
auto-linkified text — `isAllowedLinkHref` (`beastland`) is the allowlist
check the Terminal applies at render time; a disallowed scheme (`javascript:`,
`data:`…) falls back to plain, inert text instead of being rendered as a
link. `href` and `command` are mutually exclusive — set one or the other.

For two-column output in a narrow panel use a hanging indent so wrapped text
stays in its column:

```ts
ctx.print([{ text: "  " }, { text: name.padEnd(12), tone: "key" }, { text: description }], "output", { hang: 14 });
```

Toasts, for things that should be seen outside the log:

```ts
import { notify } from "beastland";
notify({ title: "Deployed", message: "v1.4.2 → prod", tone: "success" });   // tone: info|success|warning|danger
```

`<ToastStack />` must be mounted once (your root layout).

### Streaming

`ctx.print` returns a `LineHandle`, the primitive a streaming command (an
LLM answer, a progress line…) needs to keep mutating the line it just
printed instead of pushing a new one every tick:

```ts
run: async (args, ctx) => {
  const handle = ctx.print("", "output");
  for await (const delta of answer(args, ctx.signal)) handle.append(delta);
},
```

`handle.set(text | spans)` replaces the line's content in place (`kind`
stays whatever it was printed with); `handle.append(delta)` grows the text,
and the last span's text when the line carries spans. Neither pushes a new
line, so a stream never re-triggers scroll-to-bottom or the live-region
announcement — those fire once, when the block finishes.

The block a streaming command is printing into stays open (`running: true`)
until `run` resolves or rejects; its prompt glyph pulses meanwhile and it is
never auto-folded or given a `kind` (`ack`/`data`/`error`) until it's done.
`ctx.signal` is an `AbortSignal`, one per submitted line: **Esc cancels the
block currently running** (ahead of "Esc blurs the prompt", but after
dismissing an open completion popup), and every still-running block is
aborted when the Terminal unmounts. Pass `ctx.signal` straight to `fetch`,
or check `signal.aborted` in a manual loop; when `run` rejects with an error
whose `name` is `"AbortError"` the Terminal prints `cancelled` (a muted
`system` line) instead of treating it as a command failure.

For prose rather than terminal-style output — the shape an LLM answer is in
— print with `kind: "prose"`: UI font (Lexend), normal wrapping, no
`white-space: pre` feel. Build its spans with `proseSpans(text)`
(`$lib/shell/prose.js`), which understands `**bold**`, `` `inline code` ``
(mono), fenced ``` blocks (mono/pre — the info string `beast` or `sh` makes
each non-empty line inside a runnable command span, exactly like any other
clickable output), and `@12`/`#xp` refs turned into clickable `id` spans. It
is not a markdown renderer — no nesting, no lists, no links — just enough to
make a streamed answer readable:

```ts
handle.set(proseSpans(sofar));
```

See `src/routes/tiling/demo-commands.ts` (`stream`, `stream --prose`) for a
full example, including cancellation and a mid-stream failure.

## Driving the terminal from elsewhere

The `shell` store is the bridge between the terminal and every other surface:

```ts
import { shell } from "beastland";

shell.run("#xp");               // run a line as if typed (lands in history and the log)
shell.insert("#xp");            // put text into the prompt (trailing space) and focus it
shell.insert("#", false);       // …without the trailing space
shell.focusTerminal();
shell.preview;                  // the current Intent, or null
```

A record card that shows an id can therefore make it a link with
`shell.run("#xp")`, exactly like the terminal's own output does. The tiling
workspace binds `Enter`/`Esc` and bare `@`/`#` outside the prompt to these.

## Wiring UI components to the shell

UI-kit components never import the shell. Anything that can trigger a command
(`RecordView` fields with `command`, `Menu` items, `Breadcrumb` items) takes
an `oncommand` callback; pass the bridge:

```svelte
<script lang="ts">
  import { RecordView, Menu, commandBridge, runBridge } from "beastland";
</script>

<RecordView fields={fields} oncommand={commandBridge} />   <!-- (command, "run" | "insert") -->
<Menu items={items} oncommand={runBridge} … />              <!-- (command) -->
```

## Markdown

`<Markdown source={text} />` renders a Markdown document safe by
construction — no sanitizer, no `{@html}` anywhere. `parseMarkdown`
(`$lib/markdown/parse.js`) hands back [marked](https://github.com/markedjs/marked)'s
token tree and `Markdown.svelte` renders every token through a Svelte
snippet, so text is always Svelte's own escaped interpolation. A raw inline
HTML tag shows up literally; a raw HTML *block* is dropped.

```svelte
<script lang="ts">
  import { Markdown, commandBridge } from "beastland";
</script>

<Markdown source={doc} oncommand={commandBridge} />
```

GFM: headings (`h1`–`h4`, no ids), paragraphs, **bold**/*em*/~~del~~, inline
code, fenced code, nested lists and task items (disabled checkboxes), tables
(numeric columns right-align with tabular figures), blockquotes, `hr`,
links. Refs (`@12`, `#xp`) in text and every non-empty line of a `beast`/`sh`
fence behave like the Terminal's prose lines: click runs through
`oncommand`, ⇧-click inserts. Without `oncommand` they are inert text.

Deliberately not rendered: images (`![alt](src)` becomes a link — a
document in a tile must not trigger remote loads) and raw HTML blocks.
`highlight?: (code, lang) => Array<{ text, tone? }> | string` plugs a syntax
highlighter into non-runnable fences (a span's `tone` maps to
`--md-hl-<tone>`); the kit ships none. `compact` tightens spacing for tiles.

## Themes, wallpapers, looks

Themes and wallpapers are runtime registries, not static lists: an app
registers its own next to (or instead of) the shipped ones and every picker
updates when it does.

```ts
import { registerTheme, registerWallpaper, registerLook } from "beastland";

registerWallpaper({ id: "sunset", label: "Sunset", src: "https://cdn…/sunset.jpg", thumb: "https://cdn…/sunset-240.jpg" });
registerTheme({ id: "sunset-theme", label: "Sunset", mode: "dark", glass: true, wallpaper: "sunset" });
registerLook({ id: "evening", label: "Evening", theme: "sunset-theme", wallpaper: "sunset" });
```

The library ships five themes (`beast-dark`, `garden-light`, `hypr-dark`,
`hypr-light`, `tokyo-glass`; their CSS under `beastland/styles/themes/*`)
and **no wallpapers** — bring your own images and register them at module
scope before the shell renders, the way `src/routes/+layout.svelte` does.
`themeIds()`, `defaultTheme()`, `wallpaperIds()`, `defaultWallpaper()` are
functions (Svelte forbids exporting derived state from a module).

`shell.setTheme(id)` changes the theme and nothing else. A `Theme` may name
a default `wallpaper`; `shell.setTheme(id, { withWallpaper: true })` (or
`theme <id> -w`) follows it. A **look** is a named `(theme, wallpaper)`
pair: `shell.look` is derived — the matching look's id or `null` for a
custom combination — and `shell.applyLook(id)` sets both; that is the
command for "switch everything".
Nothing new is persisted. Persisted ids are resolved lazily (the store
hydrates before your registrations run), so an unknown id falls back to the
default at read time rather than being dropped.

Commands: `theme [id|n|next] [--with-wallpaper/-w]`, `wallpaper [id|n|next]`
(alias `wp`), `look [list|id|n]`. A number is the 1-based registration
position the listings print (`wp 5` ≡ `wp adler`), same numbering as `ws`.

## Settings

`settings.register({ id, label, component, order?, description? })` adds a
tab to the Settings tile — the same registration pattern as kinds and
commands. The library ships one section, *Appearance* (look/theme/wallpaper
pickers), registered automatically. Open the tile with `settings` (alias
`prefs`; `settings <section-id>` selects a tab) or
`workspace.open("settings", SETTINGS_CONTENT_ID)`. The tile is a singleton
kind (`settingsKind`); register it and `settingsCommands` in your route like
any slice.

```ts
$effect(() => settings.register({ id: "billing", label: "Billing", component: BillingSection }));
```

The pickers (`ThemePicker`, `WallpaperPicker`, `LookPicker`) are dumb UI-kit
molecules — data in, `onchange` out — usable outside the tile.

## Workspaces

Hyprland-style: several numbered workspaces, each with its own tiles; the
terminal is shared. Everything `workspace` already had (`containers`,
`spawn`, `move`, `select`…) is a facade over the *active* layout, so
existing code keeps working; `@n` ids are per layout.

```ts
workspace.layouts;                  // every layout, in creation order
workspace.activeId;                 // and `workspace.active`
workspace.switch(2);                // 1-based index, like Hyprland — or an id/name
workspace.create("office");         // auto-named "2", "3"… without a name
workspace.rename(id, "home");
workspace.remove(id);               // refuses the last one
workspace.next(); workspace.prev();
```

`ws` is the command: `ws` / `ws list` (active starred, container counts,
clickable), `ws <n|name>`, `ws new [name]`, `ws rename <name>`, `ws rm [n]`,
`ws next`/`ws prev`. It ships inside `containerCommands`, so
`workspaceCommands` and `tilingCommands` have it. Keys: `⌃⇧1`–`⌃⇧9` switch,
`⌃⇧n`/`⌃⇧p` cycle (one modifier up from container selection).
`<WorkspaceSwitcher workspaces activeId onchange variant="ghost">` is the
dumb UI piece; the demo puts it in the Terminal's title bar through the
`header` snippet (see below).

Persisted as `beastland:workspaces` `{ layouts, activeId }`, migrated
automatically from the pre-workspaces `beastland:workspace` key. Give the
terminal per-workspace ↑↓ history with `<Terminal historyKey={workspace.activeId} />`
(`beastland:history:<key>`, capped at 200).

The Terminal's title bar is the shell's status line: pass a `header`
snippet and it renders right of the title. The Terminal knows nothing about
workspaces or services — the app decides what goes there.

```svelte
<Terminal historyKey={workspace.activeId}>
  {#snippet header()}
    <WorkspaceSwitcher variant="ghost" workspaces={…} activeId={workspace.activeId} onchange={(id) => workspace.switch(id)} />
  {/snippet}
</Terminal>
```

## Keymap

Shortcuts are data. Pass your own table to rebind:

```ts
import { defaultKeymap, type KeyBinding } from "beastland";

const keymap: KeyBinding[] = defaultKeymap.map((b) =>
  b.action === "close" ? { ...b, code: "KeyX" } : b,
);
```

```svelte
<TilingWorkspace {keymap} />
```

`code` is a `KeyboardEvent.code` (layout-independent); `mod` means the shell
modifier (Control — Option is unusable on Swiss/German layouts where ⌥3 is
`#`); bindings without `mod` fire only outside text inputs. `describeKeymap`
returns legend lines for any table.

## Storage

Stores persist through one adapter. Sync adapters are swapped with
`storage.use()`; every store re-reads its key when that happens, so the
order relative to store imports does not matter:

```ts
import { storage, memoryStorage, webStorage } from "beastland";
storage.use(memoryStorage());                       // tests, previews
storage.use(webStorage(sessionStorage));            // per-tab
storage.use({ get, set, remove });                  // anything synchronous
```

The default uses `localStorage` when a window exists and memory otherwise,
so stores are SSR-safe.

### Load then hydrate (async backends)

A backend is asynchronous, so it gets its own shape and a `load()` step:

```ts
import { storage, type AsyncStorageAdapter } from "beastland";

const api: AsyncStorageAdapter = {
  load: (key) => fetch(`/state/${key}`).then((r) => (r.ok ? r.text() : null)),
  save: (key, value) => fetch(`/state/${key}`, { method: "PUT", body: value }).then(() => {}),
  remove: (key) => fetch(`/state/${key}`, { method: "DELETE" }).then(() => {}),
};

await storage.load(api);
```

`load()` reads every key the stores registered (`storage.keys`, or pass
`{ keys }`) **once**, puts the values in a write-through cache and re-hydrates
the stores. From then on reads are synchronous from the cache and writes go to
the cache immediately and to the backend in the background (`{ onError }`
hears about failed writes; the default warns). A rejected read rejects the
promise so an error boundary can show it; a newer `use()`/`load()` supersedes
an in-flight one.

Where to await it: at the top of a component's `<script>` with
[`experimental.async`](https://svelte.dev/docs/svelte/await-expressions) on,
inside a `<svelte:boundary>` whose `pending` snippet is the loading state
(the server always renders that snippet, so SSR never shows stale defaults):

```svelte
<!-- +page.svelte -->
<svelte:boundary>
  {#snippet pending()}<Skeleton lines={3} />{/snippet}
  {#snippet failed(error, reset)}<EmptyState title="Could not load" …/>{/snippet}
  <Workspace />
</svelte:boundary>

<!-- Workspace.svelte -->
<script>
  await storage.load(api);   // stores are hydrated when this resolves
  $effect(() => registry.register(myCommands));
</script>
```

`src/routes/tiling` does exactly this against `localStorage` behind a delay.
Without async Svelte, `{#await storage.load(api)}` or a `+layout.ts` `load`
that awaits it work the same way; `storage.ready` is the promise of the most
recent load.

`toAsync(syncAdapter)` wraps a sync adapter for tests and demos.

Your own stores can join the seam: read with `storage.get(key)` and register
the same function so `use()`/`load()` re-run it:

```ts
function hydrate() { items = storage.getJson<Item[]>("app:items") ?? []; }
hydrate();
storage.register("app:items", hydrate);
```

## Using the terminal without the dispatcher

Prefer the command API — parse once, typed args, help and completion for
free. If you truly need the raw line, the escape hatch exists:

```svelte
<script lang="ts">
  import { Terminal } from "beastland";
  let term: Terminal;
</script>

<Terminal
  bind:this={term}
  dispatch={false}
  onsubmit={(line) => {
    term.print(`you said: ${line}`);
  }}
/>
```

`onsubmit` also fires *with* dispatch on, which is handy for logging.
Instance methods: `print(text | spans, kind?, opts?)` (returns a
`LineHandle`, see [Streaming](#streaming)), `clear()`. You can also pass an
explicit `commands` prop to bypass the registry entirely.

## Reading components (case studies)

Long-form components for building in-depth project retrospectives and case
studies. All are **container-query based** — the same markup works on a page
and inside a tile, without viewport media queries. They discover the outline
(table of contents) from the DOM itself, with no context API or store.

### Minimal example

```svelte
<script lang="ts">
  import { CaseStudy, Section, DeepDive, Callout, Pipeline, Prose } from "beastland";
</script>

<CaseStudy eyebrow="case study" title="Rebuilding a search indexer" tags={["search", "rust"]}
  metrics={[{ label: "p99 staleness", value: "48s" }]}>
  <Section id="why" number={1} title="Why">
    <Prose text="The nightly batch took **24h** to converge." />
    <Callout tone="warning" label="lesson">Measure before you rewrite.</Callout>
  </Section>
  <DeepDive id="wal" number="02.1" title="Reading the WAL" links="auto">
    <Section id="wal-tail" level={3} title="Tailing the log">…</Section>
  </DeepDive>
</CaseStudy>
```

### Architecture

**Heading levels are explicit props, never semantic** — pass `level={3}` to a
`Section` to render it as an `<h3>`. `CaseStudy` is always the root (`<h1>`);
nested `Section`s go as deep as your outline. `number` pads single-digit
numbers (`1` → `01`); anything else (letters, ranges) renders as given.

**Outline is DOM-based.** `Section`, `DeepDive`, `DecisionRecord` and
`Pipeline` all carry the outline contract: `id`, `data-outline`,
`data-outline-level`, `data-outline-label`, and optional `data-outline-number`
on their root element. The `Outline` and `CaseStudy` components discover them
with no context or store — they query the DOM.

The rail `Outline` shows two things: the active entry's marker (where you
are) and a thin line under its title (how much of the page you have read).
`createOutlineSpy` also exposes `sectionProgress`, the fraction scrolled
through the active entry's own span, for custom outlines that want it.

**One shared gutter, one content edge.** Inside a wide `CaseStudy` (≥64rem
container) `CaseStudy` reserves a single left gutter (`--reading-gutter`, set
to `--reading-gutter-wide` — `9rem` by default) that both its header and body
share, so the title/tags/metrics and the body's prose start at the same
content edge. Every `Section` number — any heading level, any nesting depth —
hangs right-aligned into that gutter instead of sitting inline, so `02` and
`02.01` share one right edge and every title (top-level or nested) shares one
left edge; so does `StackManifest`'s key column when it's used inside a wide
`CaseStudy` (its keys hang into the gutter, values start at the content edge).
Everywhere else — narrow, or outside `CaseStudy` — the gutter is `0` and
numbers/keys sit inline before their title/value, unchanged.

A container that adds its own horizontal inset inside the content column
(`DeepDive`'s glass panel: padding + border) sets `--reading-inset` on its
content so hanging elements inside it still reach the shared gutter (offset =
`--reading-gutter` + `--reading-inset`); it composes across nesting rather
than replacing, so `--reading-inset` still adds up correctly if a `DeepDive`
ever ends up nested inside another one.

**`Prose` handles Markdown.** Pass `text` (a Markdown string), `inline` to
unwrap single-paragraph text, `math?: (tex, display) => string` for opt-in
`$…$` / `$$…$$` rendering (the callback owns sanitising — e.g. a KaTeX render
function; no dependency is added to the kit). `Markdown` gains the same `math`
and `inline` props, plus `lang` for the root element's `lang` attribute.
`parseMarkdown(source, { math: true })` tokenizes math when enabled.

**Container queries, not viewport.** Every component uses `@container` queries
instead of media queries, so tiles and pages use the same layout logic.
`--reading-anchor-offset` (scroll margin on outlined sections, default `4rem`),
`--reading-gutter-wide` (the gutter width `CaseStudy` uses once wide, default
`9rem`) and `--reading-inset` (a nesting container's own horizontal inset —
see above) are CSS custom properties the host can override.

### Charts

`Benchmark` compares variants across metrics: a small multiple with one mini
bar chart per numeric metric on its own scale, plus fact chips for boolean or
text metrics. `highlight` picks out one variant (e.g. your own tool) in accent;
others de-emphasise. Metrics carry `unit`, `better: "lower" | "higher"` for
directional hints, and optional `scale: "log"` for orders-of-magnitude domains.
Hovering/focusing a variant lights it up across all multiples; a table toggle
shows the full data when charts clip on narrow screens.

```svelte
<Benchmark
  highlight="new"
  variants={[
    { id: "old", label: "Status quo" },
    { id: "new", label: "Rebuilt" },
  ]}
  metrics={[
    { id: "time", label: "Build time", unit: "s", better: "lower", values: { old: 240, new: 18 } },
    // yes/no: `better: "lower"` means "no" is the good answer (green)
    { id: "shell", label: "Shell in image", better: "lower", values: { old: true, new: false } },
  ]}
/>
```

`StackGroup` gains `section?: string`: group items under a titled section, so
one `StackManifest` can organize multiple stack lists with a shared key column.

### Terminal mode (case slice)

Apps register their own case components. The `cases` store holds them; the
kit's `CaseTile` spawns them as tiles. No content ships with BeastLand.

```ts
import { cases, caseKind, caseCommands, kinds, registry } from "beastland";
import SearchCase from "./cases/SearchCase.svelte";

cases.register([
  {
    slug: "search",
    title: "Rebuilding a search indexer",
    standfirst: "24h batch → incremental indexing",
    tags: ["search", "rust"],
    component: SearchCase,
  },
]);
kinds.register(caseKind);
registry.register(caseCommands);
```

Readers then use:
- `case` / `case list` — list registered cases
- `case open <slug>` or `#<slug>` — open a case in a tile
- `@n toc` — show the outline (active section highlighted)
- `@n goto <id|number|title>` — jump to a section by id, number or heading

## Reference

```ts
type Command = {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  flags?: FlagSpec[];
  subcommands?: { name; aliases?; description; flags?: FlagSpec[] }[];
  complete?: (args: string[], commands: Command[]) => Suggestion[];
  completeFlags?: (args: string[]) => FlagSpec[] | null;
  match?: (token: string) => boolean;
  run: (args: string[], ctx: CommandContext) => void | Promise<void>;
  preview?: (args: string[]) => Intent | null;
};

type FlagSpec = { name; short?; description; takesValue?; values?: string[] | (() => string[]) };
type Suggestion = { value; label?; description?; kind?: "command" | "subcommand" | "flag" | "value"; boost? };
type Intent = { target?; hint?; ghost?: { x; y; w; h }; invalid? };
type Span = { text; tone?: "id" | "id-rest" | "key" | "muted" | "accent" | "bold" | "code" | "error" | "warning"; strike?; command? };
/** Read-only snapshot of one terminal block (`ctx.blocks`, `shell.blocks`). */
type TerminalBlock = { id; input?; kind: "ack" | "data" | "error"; running; lines: OutputLine[]; startedAt; finishedAt? };

/** Returned by `ctx.print` — see Output → Streaming. */
type LineHandle = { set(text: string | Span[]): void; append(delta: string): void };

type CommandContext = {
  print: (text: string | Span[], kind?: "output" | "error" | "system" | "prose", opts?: { hang?: number }) => LineHandle;
  clear: () => void;
  commands: Command[];
  /** The transcript so far, oldest first (`[]` outside a mounted Terminal). */
  blocks?: readonly TerminalBlock[];
  /** Aborted on Esc (while this line's block is running) or on unmount. */
  signal: AbortSignal;
};
```

Helpers exported from the package: `parseArgs`, `flag`, `tokenize`,
`matchCommand`, `previewFor`, `knownFlags`, `flagsFor`, `runCommand`,
`candidatesFor`, `applySuggestion`, `fuzzyScore`, `rank`, `proseSpans`
(with `{ validate }` to strike through proposed command lines that fail a
check — `commandLineSpans` is the per-line rule), `helpText(command)` /
`helpIndex(commands)` (the plain text `help` prints, for embedding the
grammar elsewhere), and for kinds with `actions`: `actionSuggestions`,
`actionFlagsFor`, `runKindAction`.

### Beyond commands

The tiling workspace (`TilingWorkspace`, `Tile`, `kinds`) turns commands into
tiles: a slice registers a *kind* — `{ kind, size, label, exists, component,
ids?, view?, setFlags?, set?, actions? }` — and gets `#id` resolution,
spawning, `#id -d` printing, `@n set …`, `@n <action> …` and previews
without touching the workspace. Register `workspaceCommands` (`@n`, `#id`,
`ls`, `close`, `reset --layout`; no data slice attached) next to your own
command groups. The `data/`, `worklog/` and `project/` folders in this repo
are three such slices and the best examples to copy from; `HANDOFF.md` is
the step-by-step for bringing your own data.

## Developing this repo

```bash
npm run dev      # showcase on / , tiling experiment on /tiling , reading components on /reading
npm test         # unit tests + theme contrast contract
npm run check    # svelte-check
npm run build    # app build + svelte-package + publint
```
