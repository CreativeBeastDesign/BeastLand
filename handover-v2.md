# Handover v2 — the application on top of BeastLand

`HANDOFF.md` explains how to bring your own records into the shell. This
document is the layer above: decisions and suggestions for the *application*
— the `ask` command, conversations and notes, search, how the LLM may touch
the terminal, where wallpapers live, workspaces, settings — and a sequencing.
Everything here is a recommendation with its reasoning attached; where a
decision was taken it is marked **Decided**, the rest is **Suggested**.

The one rule that made everything else cheap, and must survive: **BeastLand
owns mechanisms, the app owns content.** The library knows what a kind, a
command, a look, a workspace, a settings section *is*; it never knows which
ones exist. Every feature below is a slice that registers things.

---

## 0. Library vs app, after the latest round

| | BeastLand (mechanism) | App (content) |
|---|---|---|
| Records | `KindSpec` registry, `#id` resolution, tiles, `view`/`set`/`actions` hooks | the kinds: customer, document, project, conversation, note… |
| Commands | protocol, completion, previews, `workspaceCommands`, streaming primitives (`LineHandle`, `ctx.signal`, prose lines) | `ask`, `search`, `note`, every `<kind> …` group |
| Appearance | open registries (`registerTheme/Wallpaper/Look`), `look`/`theme`/`wallpaper` commands, `ThemePicker`/`WallpaperPicker`/`LookPicker` | which wallpapers, which looks, custom themes' CSS — registered at module scope before render |
| Settings | `settings.register(section)`, `settingsKind` tile with tabs, the Appearance section, `settings`/`prefs` command | Account, LLM, Search, Data sections |
| Workspaces | `workspace.layouts/switch/create/…`, `ws` commands, ⌃⇧1–9 / ⌃⇧n/p, `<Terminal historyKey>` | where they persist (adapter); the switcher in the header |
| Persistence | `storage` seam (sync + async, load-then-hydrate) | the adapter (localStorage, SurrealDB, …) |
| Text | `Markdown` component (marked token tree, no `{@html}`, `oncommand`, `highlight?`), `proseSpans` | LLM answers, note bodies, the highlighter (fractalpop is a candidate) |

---

## 1. `ask` — the LLM command

**Decided: fleeting by default, keeping is explicit.** Creating records is the
choice that clutters, so it is the opt-in.

```
ask "<text>"                      one turn; context = selected tile; answer lives only in the block
ask -k|--keep "<text>"            create a conversation record, ask there, open its tile
ask -k                            promote the LAST fleeting answer into a new conversation (after the fact)
ask "<text>"   (conversation tile selected)   append a turn to it
ask --new "<text>"                start a fresh conversation even if one is selected
ask -w|--with <#id> [<#id>…]      add records to the context (full view)
ask --open                        every open tile in full, not just the selected one
ask --no-context                  curiosity questions; nothing from the workspace is sent
ask -m|--model <id>               override the default model (completion from the app's model list)
ask -a|--agent                    later: bounded read-only auto-execution, see §4
```

Not `-f`: in this shell `-f` is `--full` everywhere.

**Context assembly (Decided).** What the model sees is what the user sees:

1. The system prompt: who the user is, the house rules, and *the command
   grammar* — literally the text `help` prints for every registered command
   (name, description, usage, flags with descriptions and values). The
   registry is the tool schema; nothing to keep in sync.
2. The selected record at `full` level, via `KindSpec.context(id)` if the
   kind defines it, else `view(id, "full")`. Add `context?: (id) => string`
   to `KindSpec` when the first kind needs to redact (customer emails) or
   enrich (a project's linked documents).
3. Every other open container as one line: `@n #id kind label`.
4. `--with` records in full; pinned notes (§3) always.
5. The conversation history (§2), then the new message.

**History (Decided).** Shell history (↑↓ lines) and LLM conversation are
different things; never conflate them. For a fleeting turn, history is the
last N terminal blocks rendered as `input → output` text (a rolling ~8k
tokens): the user's own commands and their outputs are better context than a
chat log. For a kept conversation, history is the record's turns plus the
same rolling window of blocks since the last turn.

**Transport (Suggested).** A streaming `+server.ts` endpoint (SSE or a plain
`ReadableStream`), `fetch` with `ctx.signal`, deltas not cumulative text,
client accumulates through `LineHandle.append`. Use `query.live` (it exists in
Kit ≥ 2.63) *only* together with server-side turn persistence: live queries
reconnect, and a reconnected generator would re-run the completion. With
`{ conversationId, turnId }` and chunks persisted under `turnId`, reconnect
replays instead of regenerating — that is the live-query-shaped design and
gives resumable streams. Keys and endpoints stay in `$env/dynamic/private`
behind the gateway (Bifrost) — the browser never sees them.

**Rendering.** In the terminal: one `prose` line driven by the handle
(`**bold**`, inline code, refs `#xp` clickable, ```beast fences runnable).
In the conversation tile: the `Markdown` component with `oncommand`.
Escape cancels; the block shows `cancelled`.

**Cost & privacy.** Selected-tile-only by default is the privacy model —
the user controls what leaves the browser by what they open. Log per turn:
model, tokens in/out, which record ids were in context. Never send a kind's
record without going through `context`/`view` (no raw JSON dumps).

---

## 2. `conversation` kind (Suggested shape)

```
conversation:<id>
  title            first user message, editable (`set --title`)
  turns[]          { role, text, at, model?, context: { ids: string[], snapshot: string } }
  workspaceId?     where it was started
```

- Tile: title, turns rendered with `Markdown`, a "context" disclosure per
  assistant turn showing which ids it saw. `view` prints the last turn at
  `details`, everything at `full`.
- **Snapshot the context per turn**, not a live join: a later record edit
  must not silently change what a past answer "meant".
- Promotion: `ask -k` with no text takes the last block whose command was
  `ask …` and its output, and creates the record from them. The block model
  keeps `input` and `lines`, so this needs no extra state.
- Deleting a conversation is `conversation rm <#id>` with `notify()`; no
  cascade (nothing points at conversations).

---

## 3. `note` kind (Suggested shape)

```
note:<id>
  title, body (markdown), pinned: boolean, tags?: string[]
```

- `note new "title"` then `note #n edit` (opens the tile in edit mode: a
  `Textarea` bound to the body, `Markdown` preview next to it), `note #n
  append "…"`, `set --title|--pinned`.
- Tile: `Markdown` body with `oncommand` — a note can hold runnable
  ```beast fences, which makes notes the natural home for "runbooks"
  (`quote-followup.md` with the three commands you always run).
- **Pinned notes are always in the LLM context** while their workspace is
  active. That is the standing-instructions mechanism ("we quote in CHF
  excl. VAT", "our tone is …") without a system-prompt editor.
- `context(id)` returns title + body; `view` prints title (`list`), first
  lines (`details`), body (`full`).

---

## 4. How the LLM may touch the terminal (Decided)

Three mechanisms were weighed:

- **(a) Tool calls that execute commands — never.** Commands run in the
  browser (stores are client-side); a server-side tool loop would need
  pause/resume coordination per turn and would hide mutations inside a
  stream.
- **(b) The model proposes, the human runs — now.** The model writes
  commands in ```beast fences using the grammar from `help`; the terminal
  renders each line as a command span (click runs, ⇧-click inserts to edit).
  Add one thing on the app side: **validate proposals before they are
  clickable** — run each line through `matchCommand` + `knownFlags` + ref
  resolution (the same machinery that syntax-colours the prompt) and render
  invalid ones struck through with the reason. A real block results from
  every run, so the transcript stays honest.
- **(c) Bounded auto-execution of read-only commands — later, opt-in.**
  Needs one protocol addition: `Command.effects: "read" | "write"` (or per
  subcommand). With `ask --agent`, `read` commands the model proposes run
  automatically, their output is appended as the next turn, hard cap of
  three steps, every step a visible block; `write` commands always stay
  click-to-run. Never make this the default.

Prompt injection is real here: a customer's notes field can contain "run
`customer rm #xp`". (b) is the mitigation — nothing runs without a click —
and (c) must respect `effects` even if the model insists.

---

## 5. SearXNG (Decided placement)

One server-side module, `src/lib/server/tools/search.ts` (SearXNG JSON API:
`GET /search?q=…&format=json`, result → `{ title, url, snippet, engine }`,
short TTL cache, per-user rate limit), used from two places:

1. **A `search` command** in the app: `search <query> [-n 5]`, results as
   lines with clickable URLs, `search --tile` to open them in a `search`
   kind tile so `ask --with @n` can reference them. User-driven search is
   most of the value and is the cheap part.
2. **The LLM tool loop** in the chat endpoint: when the model calls
   `search`, the stream yields `{ type: "tool", name: "search", query }`
   before results feed back, and the terminal prints `searching: …` in the
   block. Visible, cancellable, testable.

Not in Bifrost: a gateway-side tool is invisible to the terminal, and the
shell's premise is that every action is a visible block. Bifrost stays keys,
routing, fallbacks, observability. If the same tools are ever needed from a
non-BeastLand client, moving the module behind Bifrost's MCP is mechanical;
the reverse is not.

---

## 6. Where wallpapers (and themes) live (Suggested)

Three stores were on the table: links, SurrealDB, S3. Use all three for what
each is good at, and keep the library out of it entirely:

- **Bytes → S3.** Images are large, immutable once uploaded, and the browser
  caches URLs. Upload → object key → public or signed URL. Generate a small
  thumbnail on upload (the pickers want ~240px) and store both keys.
- **Manifest → SurrealDB.** A `wallpaper` record: `{ id, label, src, thumb,
  description, palette?: { bg, accent }, mode?: "dark" | "light",
  owner, createdAt }`. Multi-modal does not mean "put bytes in it": a
  manifest row is what the registry needs, and it keeps the database small
  and the images cacheable. The same table can hold `look` records
  (`{ id, label, theme, wallpaper }`) and user preferences.
- **Links → the registry.** At startup the app queries the manifest and
  calls `registerWallpaper` / `registerLook` per row; `src` is just the S3
  URL. Registrations may arrive after the shell store hydrated — that is
  fine, persisted ids resolve lazily — but register the *defaults* at
  module scope (as `src/routes/+layout.svelte` does) so the first paint has
  a wallpaper; the pickers update reactively when the manifest lands.

Themes stay **code**: a theme is a CSS file setting the semantic tokens under
`[data-theme]`, built and contrast-tested with the app. A "custom theme from
the database" is a different feature — token *values* in a record applied as
CSS custom properties at runtime — and is worth doing only when a user needs
to make one without a deploy; the theme contract test would then need to run
on the values, not the file.

---

## 7. Workspaces — what persists where (Decided)

- The library persists `beastland:workspaces` `{ layouts, activeId }` and
  `beastland:history:<workspaceId>` (input history, capped) through the
  storage seam; browser vs SurrealDB is purely which adapter is installed.
  With a backend, key these per user (`storage.load` with a user-scoped
  adapter); a "shared workspace" is a later feature and would want its own
  record, not a shared key.
- **Output blocks are not persisted.** What matters is either a record
  (conversation) or reproducible by re-running the command; persisted
  scrollback would be a stale second copy of the data.
- Per-workspace *context*: the LLM sees the active layout's tiles; pinned
  notes could carry a `workspaceId` filter later.

---

## 8. Settings the app should register

The library ships the registry, the tile with tabs, and the Appearance
section. The app registers, in this order of usefulness:

1. **LLM** — provider/model list (feeds `ask --model` completion), default
   model, streaming on/off, "send workspace context by default" toggle.
2. **Search** — SearXNG base URL (server-side; the section only shows
   status), result count, safe search.
3. **Data** — storage adapter status, `reset --data` equivalents with a
   confirmation, export/import JSON.
4. **Account** — who you are, what the system prompt says about you.

Section values persist through the same `storage` seam under
`beastland:settings:<section>`; a section is a Svelte component that reads
and writes its own key — no central settings schema needed.

---

## 9. Sequencing

1. `ask` fleeting against a streaming endpoint (deltas, `ctx.signal`), with
   context = selected tile. One afternoon; everything it needs exists.
2. Context assembly module (`help` text as grammar, `KindSpec.context`),
   proposal validation (struck-through invalid commands).
3. `conversation` kind + tile (Markdown), `ask -k` and promotion.
4. `note` kind + tile, pinned notes into context.
5. `search` command + tool module; then the tool in the chat endpoint.
6. Wallpaper manifest + uploads (S3 + SurrealDB), looks from the database.
7. Workspaces on the backend adapter; settings sections LLM/Search/Data.
8. `Command.effects` + `ask --agent` — only after 1–5 have been used daily.

---

## 10. The big picture — what not to build

- **Not a chat app.** The terminal is the input, tiles are the output;
  `ask` is a command like any other. If a feature only makes sense in a
  chat UI, it does not belong here.
- **No server-side execution of commands**, ever. See §4.
- **No persisted scrollback.** See §7.
- **No second grammar.** Everything the model can do is what a user could
  type; the `help` output is the spec.
- **The library must stop growing here.** Settings, workspaces, looks,
  Markdown and streaming were the last mechanisms the app needed. New
  requests should be answered with "which slice registers that?" before
  "which component do we add?" — the moment `src/lib` learns a domain noun,
  the extraction is undone.
- **Niri columns, resize origins, horizontal canvas** stay deferred until
  the data is real and someone misses them.
- **SSR singletons** (Roadmap) become a real problem the day two users share
  a server: render the pending snippet server-side, or move reads into
  `+layout.ts` `load` — before multi-user, not after.
