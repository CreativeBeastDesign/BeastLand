<!-- src/lib/components/tiles/CustomerTile.svelte -->
<!-- Tile body for the `customer` kind: looks the record up by id. -->

<script lang="ts">
  import { data } from "../../data/store.svelte.js";
  import CustomerCard from "../molecules/CustomerCard.svelte";
  import EmptyRecord from "./EmptyRecord.svelte";

  let { contentId }: { contentId: string } = $props();
  let customer = $derived(data.getCustomer(contentId));
</script>

{#if customer}
  <CustomerCard {customer} />
{:else}
  <EmptyRecord />
{/if}
