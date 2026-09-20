<!-- src/lib/components/molecules/SearchField.svelte -->

<script lang="ts">
  import IconButton from "$lib/components/atoms/IconButton.svelte";
  import Input from "$lib/components/atoms/Input.svelte";
  import Kbd from "$lib/components/atoms/Kbd.svelte";

  type Props = {
    value?: string;
    placeholder?: string;
    shortcut?: string;
    onsearch?: (value: string) => void;
  };

  let { value = "", placeholder, shortcut, onsearch }: Props = $props();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      onsearch?.(value);
    }
  }
</script>

<div class="search-field">
  <svg
    class="search-field__icon"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7"></circle>
    <path d="m21 21-4.3-4.3"></path>
  </svg>

  <Input
    style="padding-left: calc(var(--space-2) + 1.1rem)"
    bind:value
    {placeholder}
    onkeydown={handleKeydown}
    aria-label="Search"
  />

  {#if shortcut}
    <Kbd>{shortcut}</Kbd>
  {/if}

  <IconButton
    label="Clear search"
    size="sm"
    onclick={() => {
      value = "";
      onsearch?.("");
    }}
  >
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12"></path>
      <path d="M18 6L6 18"></path>
    </svg>
  </IconButton>
</div>

<style>
  .search-field {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    position: relative;
  }

  .search-field__icon {
    position: absolute;
    left: var(--space-2);
    pointer-events: none;
    color: var(--color-text-low);
  }
</style>
