<!-- src/lib/components/tiles/EmptyRecord.svelte -->

<script lang="ts">
  let { message = "record deleted" }: { message?: string } = $props();
</script>

<p class="empty-record">{message}</p>

<style>
  .empty-record {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-text-low);
  }
</style>
