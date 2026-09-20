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
- [Driving the terminal from elsewhere](#driving-the-terminal-from-elsewhere)
- [Wiring UI components to the shell](#wiring-ui-components-to-the-shell)
- [Keymap](#keymap)
- [Storage](#storage)
- [Using the terminal without the dispatcher](#using-the-terminal-without-the-dispatcher)
- [Reference](#reference)

## Install

```bash
npm install beastland
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

Tones: `id`, `id-rest`, `key`, `muted`, `accent`, `bold`. A span with
`command` becomes a button; attach only navigational commands to clicks,
never destructive ones.

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
Instance methods: `print(text | spans, kind?, opts?)`, `clear()`. You can
also pass an explicit `commands` prop to bypass the registry entirely.

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
type Span = { text; tone?: "id" | "id-rest" | "key" | "muted" | "accent" | "bold"; command? };

type CommandContext = {
  print: (text: string | Span[], kind?: "output" | "error" | "system", opts?: { hang?: number }) => void;
  clear: () => void;
  commands: Command[];
};
```

Helpers exported from the package: `parseArgs`, `flag`, `tokenize`,
`matchCommand`, `previewFor`, `knownFlags`, `flagsFor`, `runCommand`,
`candidatesFor`, `applySuggestion`, `fuzzyScore`, `rank`.

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
npm run dev      # showcase on / , tiling experiment on /tiling
npm test         # unit tests + theme contrast contract
npm run check    # svelte-check
npm run build    # app build + svelte-package + publint
```
