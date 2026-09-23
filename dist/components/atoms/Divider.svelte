<!-- src/lib/components/atoms/Divider.svelte -->

<script lang="ts">
  type Orientation = "horizontal" | "vertical";

  let { orientation = "horizontal" }: { orientation?: Orientation } = $props();
</script>

<hr
  class="divider"
  class:divider--vertical={orientation === "vertical"}
  aria-orientation={orientation}
/>

<style>
  .divider {
    margin: 0;
    border: none;
    height: 1px;
    background: var(--color-border);
  }

  .divider--vertical {
    height: auto;
    align-self: stretch;
    width: 1px;
  }
</style>
