<!-- src/lib/components/organisms/Terminal.svelte -->

<script lang="ts">
  import { onMount, tick, untrack, type Snippet } from "svelte";
  import {
    type Command,
    type CommandContext,
    type LineHandle,
    type OutputLine,
    type PrintOptions,
    type Span,
    type Suggestion,
    type TerminalBlock,
    knownFlags,
    matchCommand,
    previewFor,
    runCommand,
  } from "$lib/shell/commands.js";
  import { candidatesFor, applySuggestion, splitInput } from "$lib/shell/completion.js";
  import { registry } from "$lib/shell/registry.svelte.js";
  import { shell } from "$lib/shell/state.svelte.js";
  import { storage } from "$lib/shell/storage.js";
  import { overflowFade } from "$lib/actions/overflowFade.js";

  type Props = {
    title?: string;
    indicators?: Snippet;
    commands?: Command[];
    motd?: string[];
    prompt?: string;
    /** Panel width. */
    width?: string;
    /**
     * Width while the prompt is focused. When set, the panel grows OVER the
     * workspace (no reflow) and shrinks back 250ms after blur. Defaults to
     * `width`, i.e. static — see Roadmap for the reasoning.
     */
    focusWidth?: string;
    /**
     * Raw line submitted by the user, emitted before dispatch. Useful for
     * logging, or as the sole channel when `dispatch` is false.
     */
    onsubmit?: (line: string) => void;
    /**
     * Whether the terminal itself dispatches lines to `commands`. Set to
     * false to treat the component as a pure line editor and drive it via
     * `onsubmit` + the exported `print`/`clear` instance methods.
     */
    dispatch?: boolean;
    /**
     * When set, ↑/↓ input history persists through `storage` under
     * `beastland:history:<historyKey>` (capped at 200 entries) and reloads
     * whenever the key changes — e.g. `historyKey={workspace.activeId}` for
     * a history per workspace. Without it, history stays in memory only.
     */
    historyKey?: string;
    /**
     * Rendered in the title bar, right of the title: the shell's status line.
     * The app passes what belongs there (a workspace switcher, service
     * status dots); the Terminal itself knows nothing about workspaces.
     */
    header?: Snippet;
    /**
     * How many lines the prompt may grow to before it scrolls instead.
     * The field starts at one line and grows with the command; past this
     * many it keeps the caret in view and scrolls internally.
     */
    maxInputLines?: number;
  };

  let {
    title = "beastland",
    indicators,
    commands,
    motd = ["Welcome to BeastLand.", "Type `help` to get started."],
    prompt = "❯",
    width = "22rem",
    focusWidth,
    onsubmit,
    dispatch = true,
    historyKey,
    header,
    maxInputLines = 6,
  }: Props = $props();

  // Explicit `commands` prop wins; otherwise follow the shared registry so
  // routes can add commands while mounted.
  const activeCommands = $derived(commands ?? registry.commands);

  /**
   * A command + its output, Warp-style. One block per submitted line; the
   * very first block (no `input`) holds the motd/system banner and is never
   * collapsed or re-derived.
   */
  type Block = {
    id: number;
    input?: string;
    lines: OutputLine[];
    collapsed: boolean;
    kind: "ack" | "data" | "error";
    selected?: boolean;
    startedAt: number;
    finishedAt?: number;
    /**
     * True from the moment a submitted line's command starts running until
     * it resolves (or rejects). A running block is never auto-folded and its
     * `kind` stays whatever it was seeded with — `blockKind` only runs once
     * the command is done — so its prompt glyph can pulse in the meantime.
     */
    running: boolean;
  };

  /** Classify a finished block's lines: any error wins, then ack vs data. */
  function blockKind(lines: OutputLine[]): Block["kind"] {
    if (lines.some((line) => line.kind === "error")) return "error";
    return lines.length <= 1 ? "ack" : "data";
  }

  // svelte-ignore state_referenced_locally -- motd only seeds the initial buffer
  let blocks = $state<Block[]>([
    {
      id: 0,
      input: undefined,
      lines: motd.map((text): OutputLine => ({ kind: "system", text })),
      collapsed: false,
      kind: "data",
      startedAt: Date.now(),
      running: false,
    },
  ]);
  let nextBlockId = 1;

  // One AbortController per submitted line, keyed by block id, for as long as
  // it's running. Plain (non-reactive) — only `Block.running` drives the UI.
  const controllers = new Map<number, AbortController>();

  let input = $state("");
  let history = $state<string[]>([]);
  let historyIndex = $state(0);
  let selectedBlockId = $state<number | null>(null);

  const HISTORY_CAP = 200;

  function historyStorageKey(key: string): string {
    return `beastland:history:${key}`;
  }

  /** Read persisted history for `key`, or `[]` when unset/absent/malformed. */
  function loadHistory(key: string | undefined): string[] {
    if (!key) return [];
    try {
      const stored = storage.getJson<string[]>(historyStorageKey(key));
      return Array.isArray(stored) ? stored.slice(-HISTORY_CAP) : [];
    } catch {
      return [];
    }
  }

  function persistHistory(key: string | undefined, value: string[]) {
    if (!key) return;
    try {
      storage.setJson(historyStorageKey(key), value.slice(-HISTORY_CAP));
    } catch {
      /* storage may be unavailable; the in-memory history still works */
    }
  }

  // Reload history whenever `historyKey` changes (including its first set).
  // Without the prop this never fires past the initial no-op, so history
  // stays purely in-memory, matching the old behaviour.
  $effect(() => {
    const loaded = loadHistory(historyKey);
    // Only `historyKey` is a dependency: writing `history` (and reading its
    // length) inside a tracked scope would re-run this effect on every push.
    untrack(() => {
      history = loaded;
      historyIndex = loaded.length;
    });
  });

  let suggestions = $state<Suggestion[]>([]);
  let suggestionIndex = $state(0);
  let popupDismissed = $state(false);
  const popupOpen = $derived(suggestions.length > 0 && input.length > 0 && !popupDismissed);

  let outputEl: HTMLDivElement | undefined;
  let inputEl: HTMLTextAreaElement | undefined;
  let syntaxEl: HTMLDivElement | undefined;

  // `role="log"` on the output already exposes the full transcript to
  // assistive tech; making it `aria-live` too re-announces everything on
  // every keystroke/print. Instead, two dedicated visually-hidden regions
  // announce only the last line of a just-completed ack or error block —
  // a `data` block (e.g. a long list) is left to be read on demand.
  let politeAnnouncement = $state("");
  let assertiveAnnouncement = $state("");

  function announceBlock(block: Block) {
    if (block.kind !== "ack" && block.kind !== "error") return;
    const lastLine = block.lines[block.lines.length - 1];
    const text = lastLine?.text ?? "";
    if (!text) return;
    if (block.kind === "error") {
      assertiveAnnouncement = text;
    } else {
      politeAnnouncement = text;
    }
  }

  /** Derive & lock in a finished block's kind, then fold older `data` blocks. */
  function finalizeBlock(block: Block) {
    if (block.input === undefined) return; // motd/system block: never derived

    block.kind = blockKind(block.lines);

    // Only a newer *data* block folds older data away: an ack (`@1 -w 3`)
    // or an error must not hide the list the user is acting on, and a block
    // still streaming is left alone regardless of how many lines it has.
    if (block.kind !== "data") return;
    const idx = blocks.findIndex((b) => b.id === block.id);
    for (let i = 0; i < idx; i++) {
      const older = blocks[i];
      if (older.input !== undefined && older.kind === "data" && !older.running) older.collapsed = true;
    }
  }

  /** Open a new block for `inputValue` and return it (the ctx of that line targets it). */
  function openBlock(inputValue?: string): Block {
    const block: Block = {
      id: nextBlockId++,
      input: inputValue,
      lines: [],
      collapsed: false,
      kind: "ack",
      running: false,
      startedAt: Date.now(),
    };
    blocks.push(block);
    // Read back through the reactive array: Svelte wraps pushed objects in
    // its own proxy, and only that proxy's mutations are tracked — mutating
    // the local `block` reference later would not update the UI.
    return blocks[blocks.length - 1];
  }

  const noopHandle: LineHandle = { set: () => {}, append: () => {} };

  /** Wrap a just-pushed `OutputLine` as the handle `ctx.print` returns. */
  function lineHandle(line: OutputLine): LineHandle {
    return {
      set(text) {
        if (typeof text === "string") {
          line.text = text;
          line.spans = undefined;
        } else {
          line.text = text.map((s) => s.text).join("");
          line.spans = text;
        }
      },
      append(delta) {
        line.text += delta;
        if (line.spans && line.spans.length > 0) line.spans[line.spans.length - 1].text += delta;
      },
    };
  }

  /** Push an output line onto `block` and return a handle to keep mutating it. */
  function appendLine(
    block: Block,
    text: string | Span[],
    kind: OutputLine["kind"],
    opts?: PrintOptions,
  ): LineHandle {
    const line: OutputLine =
      typeof text === "string"
        ? { kind, text }
        : { kind, text: text.map((s) => s.text).join(""), spans: text };
    if (opts?.hang) line.hang = opts.hang;
    const len = block.lines.push(line);
    return lineHandle(block.lines[len - 1]); // same reasoning as openBlock: reread the proxy
  }

  /** Append an output line. Accepts plain text or styled spans. Instance method. */
  export function print(
    text: string | Span[],
    kind: OutputLine["kind"] = "output",
    opts?: PrintOptions,
  ): LineHandle {
    if (kind === "input") {
      // Kept for API stability; no longer used internally (see `submitLine`).
      openBlock(typeof text === "string" ? text : text.map((s) => s.text).join(""));
      return noopHandle;
    }

    const block = blocks.length === 0 ? openBlock() : blocks[blocks.length - 1];
    return appendLine(block, text, kind, opts);
  }

  /** Clear the output buffer. Instance method. */
  export function clear() {
    blocks = [];
    nextBlockId = 0;
    selectedBlockId = null;
  }

  /** Read-only view of the transcript (see `TerminalBlock`); shared with `shell.blocks`. */
  function snapshotBlocks(): TerminalBlock[] {
    return blocks.map((b) => ({
      id: b.id,
      input: b.input,
      kind: b.kind,
      running: b.running,
      lines: b.lines,
      startedAt: b.startedAt,
      finishedAt: b.finishedAt,
    }));
  }

  /** Build the ctx a submitted line's command runs with: prints target `block`. */
  function makeContext(block: Block, signal: AbortSignal): CommandContext {
    return {
      print: (text, kind = "output", opts) => appendLine(block, text, kind, opts),
      clear,
      get commands() {
        return activeCommands;
      },
      get blocks() {
        return snapshotBlocks();
      },
      signal,
    };
  }

  /** Shared submit path for Enter, span clicks, and history re-runs. */
  function scrollToBottom() {
    tick().then(() => {
      if (outputEl) outputEl.scrollTop = outputEl.scrollHeight;
    });
  }

  function abortError(): DOMException {
    return new DOMException("cancelled", "AbortError");
  }

  /** Escape while a block is running cancels it. The most recently opened wins. */
  function abortRunningBlock(): boolean {
    for (let i = blocks.length - 1; i >= 0; i--) {
      const block = blocks[i];
      if (!block.running) continue;
      controllers.get(block.id)?.abort(abortError());
      return true;
    }
    return false;
  }

  async function submitLine(value: string) {
    const block = openBlock(value);
    scrollToBottom();

    if (value.trim()) {
      history.push(value);
      if (history.length > HISTORY_CAP) history = history.slice(-HISTORY_CAP);
      persistHistory(historyKey, history);
    }
    historyIndex = history.length;
    input = "";
    shell.setPreview(null);

    onsubmit?.(value);

    if (dispatch) {
      block.running = true;
      const controller = new AbortController();
      controllers.set(block.id, controller);
      try {
        await runCommand(value, activeCommands, makeContext(block, controller.signal));
      } catch (err) {
        const aborted = err instanceof Error && err.name === "AbortError";
        appendLine(block, aborted ? "cancelled" : err instanceof Error ? err.message : String(err), aborted ? "system" : "error");
      } finally {
        controllers.delete(block.id);
        block.running = false;
        block.finishedAt = Date.now();
      }
    }

    finalizeBlock(block);
    announceBlock(block);
    scrollToBottom();
  }

  function navigateHistory(direction: -1 | 1) {
    if (history.length === 0) return;

    const next = historyIndex + direction;
    if (next < 0) return;

    if (next >= history.length) {
      historyIndex = history.length;
      input = "";
      return;
    }

    historyIndex = next;
    input = history[historyIndex];
  }

  /** Accept a suggestion: replace the partial token and keep typing. */
  function acceptSuggestion(s: Suggestion) {
    input = applySuggestion(input, s.value);
    focusInput();
  }

  /** Blocks eligible for keyboard block-walk: real commands, data or error. */
  function walkableBlocks(): Block[] {
    return blocks.filter((b) => b.input !== undefined && (b.kind === "data" || b.kind === "error"));
  }

  function walkBlocks(direction: -1 | 1) {
    const candidates = walkableBlocks();
    if (candidates.length === 0) return;

    const currentIndex = candidates.findIndex((b) => b.id === selectedBlockId);
    if (currentIndex === -1) {
      // First press selects the newest block.
      selectedBlockId = candidates[candidates.length - 1].id;
      return;
    }

    const next = currentIndex + direction;
    if (next < 0 || next >= candidates.length) return;
    selectedBlockId = candidates[next].id;
  }

  function toggleBlockById(id: number) {
    const block = blocks.find((b) => b.id === id);
    if (block) block.collapsed = !block.collapsed;
  }

  function insertText(text: string, trailingSpace = true) {
    input = trailingSpace && !text.endsWith(" ") ? `${text} ` : text;
    focusInput();
    // Caret at the end, after Svelte has written the value.
    tick().then(() => inputEl?.setSelectionRange(input.length, input.length));
  }

  function handleHeadClick(event: MouseEvent, block: Block) {
    if (event.shiftKey) {
      insertText(block.input ?? "");
      return;
    }
    block.collapsed = !block.collapsed;
  }

  function handleSpanClick(event: MouseEvent, span: Span) {
    if (!span.command) return;
    if (event.shiftKey) {
      insertText(span.command);
      return;
    }
    void submitLine(span.command);
  }

  function handleKeydown(event: KeyboardEvent) {
    // Shell shortcuts (⌃/⌥ + key) are handled globally by the workspace;
    // let them bubble untouched so they work while typing.
    if (event.altKey || event.ctrlKey) return;

    if (popupOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        suggestionIndex = (suggestionIndex + 1) % suggestions.length;
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        suggestionIndex = (suggestionIndex - 1 + suggestions.length) % suggestions.length;
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        acceptSuggestion(suggestions[suggestionIndex]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        popupDismissed = true;
        return;
      }
      if (event.key === "Enter") {
        const { partial } = splitInput(input);
        const current = suggestions[suggestionIndex];
        // Accept only while mid-token. After a trailing space (the popup then
        // merely lists what could follow) or when the token already equals
        // the highlighted value, Enter submits the line.
        if (partial.length > 0 && partial !== current.value) {
          event.preventDefault();
          acceptSuggestion(current);
          return;
        }
      }
    }

    if (
      event.shiftKey &&
      (event.key === "ArrowUp" || event.key === "ArrowDown") &&
      input === ""
    ) {
      event.preventDefault();
      walkBlocks(event.key === "ArrowUp" ? -1 : 1);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      // Priority: dismiss the popup (handled above, already returned) >
      // cancel a running block > deselect a walked-to block > blur.
      if (abortRunningBlock()) return;
      if (selectedBlockId !== null) {
        selectedBlockId = null;
        return;
      }
      inputEl?.blur();
    } else if (event.key === "Enter") {
      event.preventDefault();
      // A walked-to block is only toggled from an empty prompt; anything
      // typed since then means Enter is a submit.
      if (selectedBlockId !== null && input === "") {
        toggleBlockById(selectedBlockId);
        return;
      }
      void submitLine(input);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      navigateHistory(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      navigateHistory(1);
    } else if (event.key === "Tab") {
      event.preventDefault();
      if (suggestions.length > 0) acceptSuggestion(suggestions[0]);
    }
  }

  function handleBlur() {
    shell.setPreview(null);
  }

  /**
   * Grow the field to its content, up to `maxInputLines` (the CSS
   * `max-height`), so a long command is readable instead of scrolled out of
   * sight. Past the cap the textarea scrolls internally and keeps the caret
   * visible; `syncScroll` drags the syntax overlay along, since that layer
   * paints the text while the textarea only paints the caret.
   */
  function autoGrow() {
    if (!inputEl) return;
    inputEl.style.height = "auto"; // measure the content, not the old box
    inputEl.style.height = `${inputEl.scrollHeight}px`;
  }

  function syncScroll() {
    if (syntaxEl && inputEl) syntaxEl.scrollTop = inputEl.scrollTop;
  }

  /**
   * A pasted newline would land inside a token (`tokenize` splits on spaces
   * only) and the prompt is single-line by design, so flatten it.
   */
  function handleInput(event: Event) {
    const el = event.currentTarget as HTMLTextAreaElement;
    if (!/[\n\r]/.test(el.value)) return;
    const caret = el.selectionStart;
    input = el.value.replace(/[\n\r]+/g, " ");
    tick().then(() => {
      const at = Math.min(caret, input.length);
      el.setSelectionRange(at, at);
    });
  }

  function focusInput() {
    inputEl?.focus();
  }

  onMount(() => {
    focusInput();
    autoGrow();
    // The panel can change width (`focusWidth`, viewport), which re-wraps the
    // command and changes its height. Width only: reacting to our own height
    // writes would loop.
    let lastWidth = inputEl?.clientWidth ?? 0;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width === lastWidth) return;
      lastWidth = width;
      autoGrow();
    });
    if (inputEl) observer.observe(inputEl);
    const unregisterFocus = shell.registerTerminal(focusInput);
    const unregisterRun = shell.registerRunner((line) => void submitLine(line), insertText);
    const unregisterBlocks = shell.registerBlocks(snapshotBlocks);
    return () => {
      observer.disconnect();
      unregisterFocus();
      unregisterRun();
      unregisterBlocks();
      // Don't leave a streaming `fetch`/loop running after the Terminal is gone.
      for (const controller of controllers.values()) controller.abort(abortError());
      controllers.clear();
    };
  });

  $effect(() => {
    // Publish what the partially typed line would do, per keystroke.
    shell.setPreview(previewFor(input, activeCommands));
  });

  $effect(() => {
    // Re-measure after any value change — typing, ↑↓ history, `insert`.
    input;
    tick().then(() => {
      autoGrow();
      syncScroll();
    });
  });


  $effect(() => {
    // Recompute fuzzy completions per keystroke; typing resets the picker.
    const list = candidatesFor(input, activeCommands);
    const { partial } = splitInput(input);
    suggestions = list.length === 1 && list[0].value === partial ? [] : list;
    suggestionIndex = 0;
    popupDismissed = false;
    if (input.length > 0) selectedBlockId = null;
  });

  // ---- input syntax colouring -------------------------------------------
  type SyntaxRole = "command" | "flag" | "ref" | "string" | "text" | "space" | "invalid";
  type SyntaxToken = { text: string; role: SyntaxRole };

  /**
   * Split the prompt into tokens (whitespace preserved) and classify them:
   * command → accent, known flag → secondary, `@n`/`#id` → id colour (danger
   * + strike-through when the preview says the target is invalid), quoted
   * strings → high, the rest neutral.
   */
  const syntaxTokens = $derived.by((): SyntaxToken[] => {
    const parts = input.match(/\s+|"[^"]*"?|\S+/g) ?? [];
    const matched = matchCommand(input, activeCommands);
    const flags = matched
      ? new Set(
          knownFlags(matched.command, matched.args).flatMap((f) => [
            `--${f.name}`,
            ...(f.short ? [`-${f.short}`] : []),
          ]),
        )
      : null;
    const preview = shell.preview;
    let seenCommand = false;
    return parts.map((text): SyntaxToken => {
      if (/^\s+$/.test(text)) return { text, role: "space" };
      if (!seenCommand) {
        seenCommand = true;
        if (/^[@#]/.test(text)) {
          // Only an unresolvable target is struck through; an action that is
          // refused on a valid target (overlap) is shown on the tile instead.
          const unresolvable = preview?.invalid && preview.target === text && !preview.ghost;
          return { text, role: unresolvable ? "invalid" : "ref" };
        }
        if (matched) return { text, role: "command" };
        // Unknown so far: neutral while something could still match, danger otherwise.
        return { text, role: suggestions.length > 0 ? "text" : "invalid" };
      }
      if (/^--?[^\d\s]/.test(text)) {
        if (!flags) return { text, role: "text" };
        return { text, role: flags.has(text.split("=")[0]) ? "flag" : "text" };
      }
      if (/^[@#]\S/.test(text)) return { text, role: "ref" };
      if (text.startsWith('"')) return { text, role: "string" };
      return { text, role: "text" };
    });
  });

  $effect(() => {
    // Track block/line shape so this effect reruns whenever output changes.
    blocks.length;
    for (const block of blocks) block.lines.length;
    tick().then(() => {
      if (outputEl) outputEl.scrollTop = outputEl.scrollHeight;
    });
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section
  class="terminal"
  aria-label="Terminal"
  style:--terminal-width={width}
  style:--terminal-focus-width={focusWidth ?? width}
  style:--terminal-input-lines={maxInputLines}
  onclick={focusInput}
>
<div class="terminal__panel grain">
  <header class="terminal__header">
    {#if indicators}
      <span class="terminal__header-slot">{@render indicators()}</span>
    {:else}
      <span class="terminal__dots" aria-hidden="true">
        <span class="terminal__dot terminal__dot--danger"></span>
        <span class="terminal__dot terminal__dot--warning"></span>
        <span class="terminal__dot terminal__dot--success"></span>
      </span>
      <span class="terminal__title">{title}</span>
    {/if}
    {#if header}
      <span class="terminal__header-slot">{@render header()}</span>
    {/if}
  </header>

  <span class="terminal__sr-only" aria-live="polite" aria-atomic="true">{politeAnnouncement}</span>
  <span class="terminal__sr-only" aria-live="assertive" aria-atomic="true">{assertiveAnnouncement}</span>

  <div class="terminal__output" role="log" bind:this={outputEl} use:overflowFade>
    {#each blocks as block (block.id)}
      <div
        class="terminal__block"
        class:terminal__block--selected={selectedBlockId === block.id}
        data-kind={block.kind}
      >
        {#if block.input === undefined}
          {#each block.lines as line, i (i)}
            <div class="terminal__line" data-kind={line.kind}>
              {@render lineContent(line)}
            </div>
          {/each}
        {:else if block.kind === "ack"}
          <button
            type="button"
            class="terminal__block-head terminal__ack"
            aria-expanded="true"
            aria-label={`${block.input}${block.lines[0] ? `, ${block.lines[0].text}` : ""}`}
            onclick={(event) => handleHeadClick(event, block)}
          >
            <span
              class="terminal__prompt-glyph"
              class:terminal__prompt-glyph--running={block.running}
              aria-hidden="true">{prompt}</span
            >
            <span class="terminal__block-input">{block.input}</span>
            {#if block.lines[0]}
              <span class="terminal__ack-output">→ {block.lines[0].text}</span>
            {/if}
          </button>
        {:else}
          <button
            type="button"
            class="terminal__block-head"
            aria-expanded={!block.collapsed}
            aria-label={`${block.input}, ${block.lines.length} ${block.lines.length === 1 ? "line" : "lines"}, ${block.collapsed ? "collapsed" : "expanded"}`}
            onclick={(event) => handleHeadClick(event, block)}
          >
            <span
              class="terminal__prompt-glyph terminal__prompt-glyph--toggle"
              class:terminal__prompt-glyph--expanded={!block.collapsed}
              class:terminal__prompt-glyph--running={block.running}
              aria-hidden="true">{prompt}</span
            >
            <span class="terminal__block-input">{block.input}</span>
            {#if block.collapsed}
              <span class="terminal__count">{block.lines.length} {block.lines.length === 1 ? "line" : "lines"}</span>
            {/if}
          </button>
          {#if !block.collapsed}
            <div class="terminal__block-lines">
              {#each block.lines as line, i (i)}
                <div
                  class="terminal__line"
                  data-kind={line.kind}
                  style:padding-left={line.hang ? `${line.hang}ch` : undefined}
                  style:text-indent={line.hang ? `-${line.hang}ch` : undefined}
                >
                  {@render lineContent(line)}
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    {/each}
  </div>

  <div class="terminal__prompt-wrap">
    {#if popupOpen}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <ul class="terminal__popup" role="listbox" id="terminal-popup">
        {#each suggestions as s, i (s.value + i)}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_mouse_events_have_key_events -->
          <li
            id={`terminal-suggestion-${i}`}
            role="option"
            aria-selected={i === suggestionIndex}
            class="terminal__suggestion"
            class:terminal__suggestion--active={i === suggestionIndex}
            onmouseenter={() => (suggestionIndex = i)}
            onclick={() => acceptSuggestion(s)}
          >
            <span
              class="terminal__suggestion-value"
              data-kind={s.kind}
              data-ref={/^[@#]/.test(s.value) || undefined}
              class:terminal__suggestion-value--active={i === suggestionIndex}>{s.value}</span
            >
            {#if s.label}<span class="terminal__suggestion-label">{s.label}</span>{/if}
            {#if s.description}<span class="terminal__suggestion-description">{s.description}</span>{/if}
          </li>
        {/each}
        <li class="terminal__suggestion-footer" role="presentation" aria-hidden="true">Tab accept · ↑↓ · Esc</li>
      </ul>
    {/if}
    <div class="terminal__prompt-row">
      <span class="terminal__prompt-glyph">{prompt}</span>
      <div class="terminal__field">
        <div class="terminal__syntax" aria-hidden="true" bind:this={syntaxEl}>
          {#each syntaxTokens as token, i (i)}<span data-role={token.role}>{token.text}</span>{/each}
        </div>
      <textarea
        class="terminal__input"
        rows="1"
        spellcheck="false"
        autocomplete="off"
        aria-label="Terminal input"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={popupOpen}
        aria-controls="terminal-popup"
        aria-activedescendant={popupOpen ? `terminal-suggestion-${suggestionIndex}` : undefined}
        bind:this={inputEl}
        bind:value={input}
        onkeydown={handleKeydown}
        oninput={handleInput}
        onscroll={syncScroll}
        onblur={handleBlur}
      ></textarea>
      </div>
    </div>
  </div>
</div>
</section>

{#snippet lineContent(line: OutputLine)}
  {#if line.spans}
    {#each line.spans as span, i (i)}
      {#if span.command}
        <button
          type="button"
          class="terminal__span terminal__span--link"
          class:terminal__span--strike={span.strike}
          data-tone={span.tone}
          onclick={(event) => handleSpanClick(event, span)}
        >{span.text}</button
        >
      {:else}
        <span class="terminal__span" class:terminal__span--strike={span.strike} data-tone={span.tone}>{span.text}</span>
      {/if}
    {/each}
  {:else}
    {line.text}
  {/if}
{/snippet}

<style>
  /*
   * The root reserves the blurred width in the layout; the panel inside is
   * absolutely positioned and grows OVER the workspace when focused, so the
   * tiles never reflow (and never flip slim ↔ medium) because of the prompt.
   */
  .terminal {
    position: relative;
    height: 100svh;
    width: var(--terminal-width);
    z-index: var(--layer-panel);
    --prompt-indent: calc(1ch + var(--space-2));
  }

  .terminal__panel {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--terminal-width);
    display: flex;
    flex-direction: column;
    background: var(--color-glass);
    backdrop-filter: blur(var(--fx-blur-md)) saturate(var(--fx-glass-saturation));
    border-right: var(--border-width) solid var(--color-border);
    box-shadow: var(--shadow-window);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: 1.5;
    transition:
      width var(--duration-normal) var(--ease-hypr) 250ms,
      border-color var(--duration-normal) var(--ease-out);
  }

  /* Expand immediately; collapse only after a short delay so a missed click
     on a block head does not make the panel flicker. */
  .terminal:focus-within .terminal__panel {
    width: var(--terminal-focus-width);
    border-right-color: var(--color-border-active);
    transition-delay: 0ms;
  }

  .terminal__header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-bottom: var(--border-width) solid var(--color-border);
    flex-shrink: 0;
    user-select: none;
  }

  .terminal__dots {
    display: flex;
    gap: var(--space-1);
  }

  .terminal__dot {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: var(--radius-pill);
  }

  .terminal__dot--danger {
    background: var(--color-danger);
  }

  .terminal__dot--warning {
    background: var(--color-secondary, var(--color-accent));
  }

  .terminal__dot--success {
    background: var(--color-success);
  }

  .terminal__header-slot {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .terminal__title {
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  /* Visually hidden but still readable by assistive tech — the two
     announcement regions above the output log. */
  .terminal__sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .terminal__output {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .terminal__block {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    border-left: var(--border-active-width) solid transparent;
    padding-left: var(--space-2);
    margin-left: calc(-1 * var(--space-2) - var(--border-active-width));
  }

  .terminal__block--selected {
    border-left-color: var(--color-accent);
  }

  .terminal__block--selected > .terminal__block-head {
    color: var(--color-accent);
  }

  .terminal__block-head {
    all: unset;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    box-sizing: border-box;
    width: 100%;
    cursor: pointer;
    color: var(--color-text-high);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  .terminal__block-head:focus-visible {
    outline: 1px solid var(--color-focus);
    outline-offset: 2px;
  }

  .terminal__block-input {
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  /* Folded ack rows: the command is what you re-read, so it never wraps or
     shrinks; only the outcome yields (ellipsis), and it may vanish entirely
     on a very long command. */
  .terminal__ack .terminal__block-input {
    flex-shrink: 0;
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .terminal__ack-output {
    flex: 1 1 0;
    min-width: 0;
    color: var(--color-text-low);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .terminal__count {
    margin-left: auto;
    flex-shrink: 0;
    color: var(--color-text-low);
    font-size: var(--text-xs);
  }

  .terminal__block-lines {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-left: var(--prompt-indent);
  }

  .terminal__line {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .terminal__line[data-kind="output"] {
    color: var(--color-text-med);
  }

  .terminal__line[data-kind="system"] {
    color: var(--color-text-low);
  }

  .terminal__line[data-kind="error"] {
    color: var(--color-danger);
  }

  /* Prose lines (streamed answers, longer explanations): UI font, normal
     line-height, no monospace pre feel — the default `.terminal__line`
     white-space: pre-wrap already gives normal wrapping and keeps fenced
     `code` spans' newlines intact. */
  .terminal__line[data-kind="prose"] {
    font-family: var(--font-ui);
    line-height: 1.65;
  }

  .terminal__span[data-tone="code"] {
    font-family: var(--font-mono);
    color: var(--color-text-high);
  }

  .terminal__span[data-tone="id"] {
    font-weight: var(--font-weight-semibold);
    color: var(--color-secondary, var(--color-accent));
  }

  .terminal__span[data-tone="id-rest"],
  .terminal__span[data-tone="muted"] {
    color: var(--color-text-low);
  }

  .terminal__span[data-tone="key"],
  .terminal__span[data-tone="bold"] {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
  }

  .terminal__span[data-tone="accent"] {
    color: var(--color-accent);
  }

  .terminal__span[data-tone="error"] {
    color: var(--color-danger);
  }

  .terminal__span[data-tone="warning"] {
    color: var(--color-warning);
  }

  .terminal__span--strike {
    text-decoration: line-through;
    text-decoration-thickness: 1px;
  }

  .terminal__span--link {
    all: unset;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.15em;
    text-decoration-color: color-mix(in oklab, currentColor 30%, transparent);
    transition:
      color var(--duration-normal) var(--ease-out),
      text-decoration-color var(--duration-normal) var(--ease-out);
  }

  .terminal__span--link:hover,
  .terminal__span--link:focus-visible {
    text-decoration-color: currentColor;
  }

  .terminal__span--link:focus-visible {
    outline: 1px solid var(--color-focus);
    outline-offset: 1px;
  }

  .terminal__prompt-wrap {
    position: relative;
    flex-shrink: 0;
  }

  .terminal__prompt-row {
    display: flex;
    /* Top-aligned: the glyph stays on the first line of a wrapped command. */
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-top: var(--border-width) solid var(--color-border);
    flex-shrink: 0;
  }

  .terminal__popup {
    all: unset;
    display: block;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 100%;
    z-index: var(--layer-popover);
    background: var(--color-glass);
    backdrop-filter: blur(var(--fx-blur-md));
    border-top: var(--border-width) solid var(--color-border);
    box-shadow: var(--shadow-popup);
    max-height: 14rem;
    overflow: auto;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  .terminal__suggestion {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3) var(--space-1) calc(var(--space-3) + var(--prompt-indent));
    cursor: pointer;
  }

  .terminal__suggestion--active {
    background: var(--color-accent-soft);
  }

  .terminal__suggestion-value {
    flex-shrink: 0;
    color: var(--color-accent);
  }

  .terminal__suggestion-value--active {
    font-weight: var(--font-weight-semibold);
  }

  .terminal__suggestion-value[data-kind="flag"] {
    color: var(--color-secondary, var(--color-accent));
  }

  .terminal__suggestion-value[data-kind="value"] {
    color: var(--color-text-high);
  }

  /* Targets (`@2`, `#xp`) are primary, like commands: the things you act on. */
  .terminal__suggestion-value[data-ref] {
    color: var(--color-accent);
    font-weight: var(--font-weight-semibold);
  }

  .terminal__suggestion-label {
    flex-shrink: 0;
    color: var(--color-text-med);
  }

  .terminal__suggestion-description {
    margin-left: auto;
    color: var(--color-text-low);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: right;
  }

  .terminal__suggestion-footer {
    padding: var(--space-1) var(--space-2);
    color: var(--color-text-low);
    font-size: var(--text-xs);
    border-top: var(--border-width) solid var(--color-border);
  }

  .terminal__prompt-glyph {
    color: var(--color-accent);
    font-weight: var(--font-weight-semibold);
    flex-shrink: 0;
    width: 1ch;
    text-align: center;
  }

  /* On block heads the glyph doubles as the disclosure indicator. */
  .terminal__prompt-glyph--toggle {
    display: inline-block;
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .terminal__prompt-glyph--expanded {
    transform: rotate(90deg);
  }

  /* Subtle "still working" cue for a block whose command hasn't resolved yet. */
  .terminal__prompt-glyph--running {
    animation: terminal-pulse 1.4s var(--ease-in-out) infinite;
  }

  @keyframes terminal-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .terminal__prompt-glyph--running {
      animation: none;
      opacity: 0.7;
    }
  }

  .terminal__field {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  /* Mirrors the input exactly (same font/metrics, wrapping and zero padding)
     and sits underneath it; the input itself paints only the caret and
     selection. Scrolled in lockstep by `syncScroll` once the field is capped. */
  .terminal__syntax {
    position: absolute;
    inset: 0;
    pointer-events: none;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    overflow: hidden;
    color: var(--color-text-high);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  .terminal__syntax [data-role="command"] {
    color: var(--color-accent);
  }

  .terminal__syntax [data-role="flag"] {
    color: var(--color-secondary, var(--color-accent));
  }

  .terminal__syntax [data-role="ref"] {
    color: var(--color-accent);
    font-weight: var(--font-weight-semibold);
  }

  .terminal__syntax [data-role="string"] {
    color: var(--color-text-high);
  }

  .terminal__syntax [data-role="text"] {
    color: var(--color-text-med);
  }

  .terminal__syntax [data-role="invalid"] {
    color: var(--color-danger);
    text-decoration: line-through;
    text-decoration-thickness: 1px;
  }

  /* Height is written by `autoGrow`; the cap turns growth into scrolling. */
  .terminal__input {
    position: relative;
    display: block;
    width: 100%;
    max-height: calc(var(--text-sm) * 1.5 * var(--terminal-input-lines, 6));
    padding: 0;
    margin: 0;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    overflow-y: auto;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    /* Text is painted by .terminal__syntax underneath. */
    color: transparent;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: 1.5;
    caret-color: var(--color-accent);
    scrollbar-width: none;
  }

  .terminal__input::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
</style>
