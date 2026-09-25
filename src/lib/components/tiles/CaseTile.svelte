<!-- src/lib/components/tiles/CaseTile.svelte -->
<!-- Tile body for the `case` kind: mounts the registered case study
     component (the `Tile`'s own `.tile__body` is the scrolling container —
     see `Tile.svelte` — so nothing extra is needed here) and attaches a
     tile-level outline handle (`cases.attach`) so `@n toc` / `@n goto <id>`
     can drive it. The mounted component (typically `CaseStudy`) also renders
     its own `Outline` UI from the same `[data-outline]` DOM — this is a
     second, independent reader of it, for the terminal. -->

<script lang="ts">
  import { cases } from "$lib/cases/store.svelte.js";
  import { slugOf } from "$lib/cases/ids.js";
  import { createOutlineSpy } from "$lib/actions/outlineSpy.svelte.js";
  import EmptyRecord from "./EmptyRecord.svelte";

  let { contentId }: { contentId: string } = $props();

  let slug = $derived(slugOf(contentId));
  let entry = $derived(cases.get(slug));

  let wrapperEl = $state<HTMLElement | undefined>(undefined);
  const spy = createOutlineSpy(() => wrapperEl);

  $effect(() => {
    if (!entry) return;
    return cases.attach(slug, {
      entries: () => spy.entries,
      activeId: () => spy.activeId,
      goto: (id) => spy.goto(id),
    });
  });
</script>

{#if entry}
  {@const Component = entry.component}
  <div class="case-tile" bind:this={wrapperEl}>
    <Component />
  </div>
{:else}
  <EmptyRecord message="case not found" />
{/if}
