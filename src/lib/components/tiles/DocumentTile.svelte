<!-- src/lib/components/tiles/DocumentTile.svelte -->
<!-- Tile body for the `document` kind: looks the record up by id. -->

<script lang="ts">
  import { data } from "$lib/data/store.svelte.js";
  import DocumentCard from "$lib/components/molecules/DocumentCard.svelte";
  import EmptyRecord from "./EmptyRecord.svelte";

  let { contentId }: { contentId: string } = $props();
  let doc = $derived(data.getDocument(contentId));
</script>

{#if doc}
  <DocumentCard document={doc} />
{:else}
  <EmptyRecord />
{/if}
