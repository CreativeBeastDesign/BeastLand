<!-- src/lib/components/tiles/SettingsTile.svelte -->
<!-- Tile body for the `settings` kind: tabs over the registered sections.
     There is only ever one settings tile, so `contentId` (the virtual
     `settings:main` id) carries no information — same shape every kind's
     tile component shares. -->

<script lang="ts">
  import Tabs from "$lib/components/molecules/Tabs.svelte";
  import { settings } from "$lib/settings/registry.svelte.js";

  let { contentId: _contentId }: { contentId: string } = $props();

  let tabs = $derived(settings.all.map((s) => ({ id: s.id, label: s.label })));
  let active = $derived(settings.active ?? settings.all[0]?.id ?? "");
</script>

<div class="settings-tile">
  {#if tabs.length === 0}
    <p class="settings-tile__empty">No settings sections registered.</p>
  {:else}
    <Tabs {tabs} {active} onchange={(id) => settings.select(id)}>
      {#snippet children(id)}
        {@const section = settings.get(id)}
        {#if section}
          <section.component />
        {/if}
      {/snippet}
    </Tabs>
  {/if}
</div>

<style>
  .settings-tile {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    height: 100%;
    min-height: 0;
    overflow-y: auto;
  }

  .settings-tile__empty {
    color: var(--color-text-low);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
  }
</style>
