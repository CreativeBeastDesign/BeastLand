<script lang="ts">
  import Skeleton from "$lib/components/atoms/Skeleton.svelte";
  import EmptyState from "$lib/components/molecules/EmptyState.svelte";
  import Button from "$lib/components/atoms/Button.svelte";
  import Workspace from "./Workspace.svelte";
</script>

<!-- `Workspace` awaits `storage.load(...)` at the top of its script. Until it
     resolves this boundary shows `pending` (on the server too); a rejected
     load lands in `failed`. The shell chrome (terminal, wallpaper) lives in
     the layout and is never blocked. -->
<svelte:boundary>
  {#snippet pending()}
    <div class="tiling-pending surface surface--glass grain" role="status" aria-busy="true" aria-label="Loading workspace">
      <Skeleton lines={3} height="0.75rem" />
    </div>
  {/snippet}
  {#snippet failed(error, reset)}
    <div class="tiling-pending surface surface--glass grain">
      <EmptyState title="Could not load the workspace" description={error instanceof Error ? error.message : String(error)}>
        {#snippet actions()}
          <Button size="sm" onclick={reset}>Retry</Button>
        {/snippet}
      </EmptyState>
    </div>
  {/snippet}
  <Workspace />
</svelte:boundary>

<style>
  .tiling-pending {
    max-width: 22rem;
    margin: var(--space-6) auto;
    padding: var(--space-5) var(--space-6);
  }
</style>
