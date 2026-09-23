<!-- src/lib/components/tiles/DocumentTile.svelte -->
<!-- Tile body for the `document` kind: looks the record up by id. -->

<script lang="ts">
  import { data } from "../../data/store.svelte.js";
  import DocumentCard from "../molecules/DocumentCard.svelte";
  import EmptyRecord from "./EmptyRecord.svelte";

  let { contentId }: { contentId: string } = $props();
  let doc = $derived(data.getDocument(contentId));
</script>

{#if doc}
  <DocumentCard document={doc} />
{:else}
  <EmptyRecord />
{/if}
