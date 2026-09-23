<!-- src/lib/components/organisms/TilingWorkspace.svelte -->

<script module lang="ts">
  import { MOD } from "$lib/shell/keys.js";
  import { defaultKeymap, describeKeymap, type KeyBinding, type KeymapEntry } from "$lib/shell/keymap.js";
  export { MOD };
  export type { KeymapEntry };

  /** Legend for the default bindings; pass your own table to `describeKeymap` for a custom one. */
  export const keymap: KeymapEntry[] = describeKeymap(defaultKeymap);
</script>

<script lang="ts">
  import type { Direction } from "$lib/tiling/types.js";
  import { workspace } from "$lib/tiling/workspace.svelte.js";
  import { kinds } from "$lib/tiling/kinds.svelte.js";
  import { shell } from "$lib/shell/state.svelte.js";
  import { resolveKey } from "$lib/shell/keymap.js";
  import { hasModifier as hasMod } from "$lib/shell/keys.js";
  import { scrollBehavior } from "$lib/actions/motion.js";
  import Tile from "./Tile.svelte";

  type Props = {
    /** Key bindings; defaults to `defaultKeymap`. See `$lib/shell/keymap.ts`. */
    keymap?: KeyBinding[];
  };
  let { keymap: bindings = defaultKeymap }: Props = $props();
  let legend = $derived(describeKeymap(bindings));

  let rootEl: HTMLDivElement | undefined;

  function isTextInput(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    return target.tagName === "INPUT" || target.tagName === "TEXTAREA";
  }

  /** Buttons, links, selects: Enter/Esc there mean something else. */
  function isInteractive(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return isTextInput(target) || !!target.closest("button, a, select, [role='button']");
  }

  function selectedBody(): HTMLElement | null {
    const id = workspace.selectedId;
    if (id === null) return null;
    return document.querySelector<HTMLElement>(`[data-container-id="${id}"] [data-tile-body]`);
  }

  function scrollSelected(amount: "half-page" | "lines" | "sideways", sign: 1 | -1): boolean {
    const body = selectedBody();
    if (!body) return false;
    const style = getComputedStyle(body);
    // line-height may compute to "normal"; fall back to 1.5 × font-size.
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 20;
    if (amount === "sideways") {
      body.scrollBy({ left: sign * body.clientWidth * 0.5, behavior: scrollBehavior() });
      return true;
    }
    const step = amount === "half-page" ? body.clientHeight / 2 : 3 * lineHeight;
    body.scrollBy({ top: sign * step, behavior: scrollBehavior() });
    return true;
  }

  function scrollCanvas(dx: number, dy: number): boolean {
    const canvas = rootEl?.closest<HTMLElement>(".shell__main") ?? rootEl?.parentElement;
    if (!canvas) return false;
    canvas.scrollBy({
      left: dx * canvas.clientWidth * 0.5,
      top: dy * canvas.clientHeight * 0.5,
      behavior: scrollBehavior(),
    });
    return true;
  }

  function onkeydown(event: KeyboardEvent) {
    const inText = isTextInput(event.target);
    const hit = resolveKey(event, bindings, inText);
    if (!hit) return;
    // Modifier-less bindings (Enter, Esc, @, #) must not steal from buttons/links.
    if (!hasMod(event) && isInteractive(event.target)) return;

    const selected = workspace.selectedId;
    const move = (dir: Direction) => selected !== null && workspace.move(selected, dir).ok;
    let handled = true;
    switch (hit.action) {
      case "select-left": workspace.selectDirection("left"); break;
      case "select-down": workspace.selectDirection("down"); break;
      case "select-up": workspace.selectDirection("up"); break;
      case "select-right": workspace.selectDirection("right"); break;
      case "select-n": workspace.select(hit.n ?? 0); break;
      case "select-next": workspace.selectNext(); break;
      case "select-prev": workspace.selectPrev(); break;
      case "move-left": move("left"); break;
      case "move-down": move("down"); break;
      case "move-up": move("up"); break;
      case "move-right": move("right"); break;
      case "scroll-tile-down": handled = scrollSelected("half-page", 1); break;
      case "scroll-tile-up": handled = scrollSelected("half-page", -1); break;
      case "scroll-tile-left": handled = scrollSelected("sideways", -1); break;
      case "scroll-tile-right": handled = scrollSelected("sideways", 1); break;
      case "scroll-tile-lines-down": handled = scrollSelected("lines", 1); break;
      case "scroll-tile-lines-up": handled = scrollSelected("lines", -1); break;
      case "scroll-canvas-down": handled = scrollCanvas(0, 1); break;
      case "scroll-canvas-up": handled = scrollCanvas(0, -1); break;
      case "scroll-canvas-left": handled = scrollCanvas(-1, 0); break;
      case "scroll-canvas-right": handled = scrollCanvas(1, 0); break;
      case "close": if (selected !== null) workspace.close(selected); break;
      case "focus-terminal": handled = shell.focusTerminal(); break;
      case "insert-ref": handled = shell.insert(hit.key ?? "", false); break;
      case "workspace-n": if (hit.n !== undefined) workspace.switch(hit.n); break;
      case "workspace-next": workspace.next(); break;
      case "workspace-prev": workspace.prev(); break;
    }
    // preventDefault only for handled keys: it also stops ⌥h inserting "˙"
    // and the readline bindings macOS gives text fields.
    if (handled) event.preventDefault();
  }

  $effect(() => {
    const id = workspace.selectedId;
    if (id === null) return;
    queueMicrotask(() => {
      document.querySelector(`[data-container-id="${id}"]`)?.scrollIntoView({ block: "nearest" });
    });
  });
</script>

<svelte:window {onkeydown} />

<div class="workspace" tabindex="-1" style:--grid-cols={workspace.columns} bind:this={rootEl}>
  {#if workspace.containers.length === 0}
    <div class="workspace__empty">
      <div class="workspace__empty-panel">
        <p class="workspace__empty-hint">customer list</p>
        <p class="workspace__empty-hint">customer new --name "John Doe"</p>
        <p class="workspace__empty-hint">docs new -q</p>
        <p class="workspace__empty-hint">#xp</p>
        <p class="workspace__empty-hint">@1 -w 4</p>
        <p class="workspace__empty-hint">@1 move -r</p>

        <div class="workspace__legend">
          {#each legend as entry (entry.keys)}
            <div class="workspace__legend-row">
              <span class="workspace__legend-keys">{entry.keys}</span>
              <span class="workspace__legend-desc">{entry.description}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    {#each workspace.containers as container (container.id)}
      {@const isPreviewTarget = shell.preview?.target === `@${container.id}`}
      {@const spec = kinds.get(container.kind)}
      <div
        class="workspace__cell"
        style="grid-column: {container.x + 1} / span {container.w}; grid-row: {container.y + 1} / span {container.h}"
      >
        <Tile
          {container}
          selected={workspace.selectedId === container.id}
          label={spec?.label(container.contentId)}
          short={kinds.shortIdOf(container.contentId)}
          onselect={(id) => workspace.select(id)}
          preview={isPreviewTarget}
          hint={isPreviewTarget ? shell.preview?.hint : undefined}
          invalid={isPreviewTarget ? shell.preview?.invalid : undefined}
        >
          {#if spec}
            <spec.component contentId={container.contentId} />
          {:else}
            <p class="workspace__deleted">unknown kind: {container.kind}</p>
          {/if}
        </Tile>
      </div>
    {/each}
  {/if}

  {#if shell.preview?.ghost}
    {@const ghost = shell.preview.ghost}
    {@const isSpawn = shell.preview.target?.startsWith("#") ?? false}
    <div
      class="workspace__ghost"
      class:workspace__ghost--invalid={shell.preview.invalid}
      style="grid-column: {ghost.x + 1} / span {ghost.w}; grid-row: {ghost.y + 1} / span {ghost.h}"
    >
      {#if isSpawn}
        <span class="workspace__ghost-label">{shell.preview.target}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .workspace {
    display: grid;
    grid-template-columns: repeat(var(--grid-cols), minmax(0, 1fr));
    grid-auto-rows: var(--tile-row, 9rem);
    gap: var(--gap-in);
    height: 100%;
    align-content: start;
    outline: none;
  }

  .workspace__cell {
    min-width: 0;
    min-height: 0;
  }

  /* Dashed ghost outline: the rectangle a spawn/move/resize preview would
     produce. Placed by explicit grid coordinates like any tile, so it can
     freely overlap real tiles (harmless — that's the point when the
     previewed action would itself overlap) and still shows over the
     empty-state panel. */
  .workspace__ghost {
    position: relative;
    border: 2px dashed var(--color-secondary);
    border-radius: var(--radius-window);
    pointer-events: none;
    opacity: 0.8;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .workspace__ghost--invalid {
    border-color: var(--color-danger);
  }

  .workspace__ghost-label {
    position: absolute;
    top: var(--space-2);
    left: var(--space-3);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-secondary);
  }

  .workspace__ghost--invalid .workspace__ghost-label {
    color: var(--color-danger);
  }

  .workspace__deleted {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-text-low);
  }

  .workspace__empty {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 20rem;
  }

  .workspace__empty-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-5) var(--space-6);
    border-radius: var(--radius-window);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-glass);
    backdrop-filter: blur(var(--fx-blur-md)) saturate(var(--fx-glass-saturation));
    box-shadow: var(--shadow-window);
  }

  .workspace__empty-hint {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-text-med);
  }

  .workspace__legend {
    margin-top: var(--space-4);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border-subtle);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .workspace__legend-row {
    display: flex;
    gap: var(--space-3);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .workspace__legend-keys {
    min-width: 9rem;
    color: var(--color-secondary);
  }

  .workspace__legend-desc {
    color: var(--color-text-low);
  }
</style>
