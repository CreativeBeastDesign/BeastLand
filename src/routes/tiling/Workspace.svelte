<script lang="ts">
  import { registry } from "$lib/shell/registry.svelte.js";
  import { tilingCommands } from "$lib/tiling/commands.js";
  import { workspace } from "$lib/tiling/workspace.svelte.js";
  import { kinds } from "$lib/tiling/kinds.svelte.js";
  import { dataKinds } from "$lib/data/kinds.js";
  import { worklogCommands, worklogKind, registerDocumentExtras } from "$lib/worklog/index.js";
  import { projectCommands, projectKind, registerDocumentExtras as registerProjectDocumentExtras } from "$lib/project/index.js";
  import { settingsCommands, settingsKind } from "$lib/settings/index.js";
  import { demoCommands } from "./demo-commands.js";
  import TilingWorkspace from "$lib/components/organisms/TilingWorkspace.svelte";
  import { storage, toAsync, webStorage, memoryStorage, type AsyncStorageAdapter } from "$lib/shell/storage.js";
  import { browser } from "$app/environment";
  import { untrack } from "svelte";

  /** Demo backend: localStorage behind a delay, so load → pending → hydrate is visible. */
  function delayed(adapter: AsyncStorageAdapter, ms: number): AsyncStorageAdapter {
    return {
      ...adapter,
      load: async (key) => {
        await new Promise((r) => setTimeout(r, ms));
        return adapter.load(key);
      },
    };
  }

  // Load-then-hydrate: the stores already hold their sync defaults; this reads
  // every registered key from the "backend", re-hydrates the stores and only
  // then renders the page. `+page.svelte` wraps this component in a
  // `<svelte:boundary>` whose `pending` snippet shows meanwhile (the server
  // always renders that snippet, so the HTML never flashes an empty
  // workspace before the client's load lands).
  await storage.load(browser ? delayed(toAsync(webStorage(localStorage)), 400) : toAsync(memoryStorage()));

  $effect(() => registry.register(tilingCommands));
  $effect(() => registry.register(worklogCommands));
  $effect(() => registry.register(projectCommands));
  $effect(() => registry.register(settingsCommands));
  $effect(() => registry.register(demoCommands));

  // Register the tile kinds this route knows, then drop containers whose
  // records vanished while we were away.
  $effect(() => {
    const unregister = [...dataKinds, worklogKind, projectKind, settingsKind].map((k) => kinds.register(k));
    // prune() reads the registry; untrack so this effect doesn't subscribe to
    // the state it just wrote and loop.
    untrack(() => workspace.prune());
    return () => unregister.forEach((fn) => fn());
  });

  // "Logged" field on documents (see `registerDocumentExtras` for why this
  // isn't wired directly into `$lib/data/views.ts`).
  $effect(() => registerDocumentExtras());
  // "Project" field on documents (see `$lib/project/index.ts`).
  $effect(() => registerProjectDocumentExtras());
</script>

<div class="tiling-page">
  <TilingWorkspace />
</div>

<style>
  .tiling-page {
    display: grid;
    grid-template-rows: 1fr;
    height: 100%;
    min-height: 0;
    gap: var(--space-3);
  }
</style>
