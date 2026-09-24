<!-- src/lib/components/atoms/Avatar.svelte -->

<script lang="ts">
  type Size = "sm" | "md" | "lg";
  type Tone = "accent" | "secondary" | "neutral";
  type Status = "online" | "away" | "busy" | "offline";

  type Props = {
    name: string;
    src?: string;
    size?: Size;
    tone?: Tone;
    status?: Status;
  };

  let { name, src, size = "md", tone = "neutral", status }: Props = $props();

  let imgError = $state(false);

  // Reset the fallback whenever a new image is handed in.
  $effect(() => {
    src;
    imgError = false;
  });

  const showImage = $derived(!!src && !imgError);

  function initials(full: string): string {
    const words = full.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "";
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }
</script>

<span class="avatar" data-size={size} data-tone={tone} role="img" aria-label={name}>
  {#if showImage}
    <img class="avatar__image" src={src} alt="" onerror={() => (imgError = true)} />
  {:else}
    <span class="avatar__initials" aria-hidden="true">{initials(name)}</span>
  {/if}
  {#if status}
    <span class="avatar__status" data-status={status} aria-hidden="true"></span>
  {/if}
</span>

<style>
  .avatar {
    position: relative;
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: var(--radius-pill);
    overflow: hidden;
    background: color-mix(in oklab, var(--color-accent) 25%, var(--color-surface-2));
    color: var(--color-accent);
    user-select: none;
  }

  .avatar[data-size="sm"] {
    width: 1.5rem;
    height: 1.5rem;
  }

  .avatar[data-size="lg"] {
    width: 2.75rem;
    height: 2.75rem;
  }

  .avatar[data-tone="secondary"] {
    background: color-mix(in oklab, var(--color-secondary) 25%, var(--color-surface-2));
    color: var(--color-secondary);
  }

  .avatar[data-tone="neutral"] {
    background: var(--color-surface-2);
    color: var(--color-text-med);
  }

  .avatar__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar__initials {
    font-family: var(--font-ui);
    font-size: 0.8rem;
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.02em;
    line-height: 1;
  }

  .avatar[data-size="sm"] .avatar__initials {
    font-size: 0.6rem;
  }

  .avatar[data-size="lg"] .avatar__initials {
    font-size: 1rem;
  }

  .avatar__status {
    position: absolute;
    right: -1px;
    bottom: -1px;
    width: 0.6rem;
    height: 0.6rem;
    border-radius: var(--radius-pill);
    border: 2px solid var(--color-surface-0);
    background: var(--color-text-low);
  }

  .avatar[data-size="lg"] .avatar__status {
    width: 0.75rem;
    height: 0.75rem;
  }

  .avatar[data-size="sm"] .avatar__status {
    width: 0.5rem;
    height: 0.5rem;
    border-width: 1.5px;
  }

  .avatar__status[data-status="online"] {
    background: var(--color-success);
  }

  .avatar__status[data-status="away"] {
    background: var(--color-warning);
  }

  .avatar__status[data-status="busy"] {
    background: var(--color-danger);
  }

  .avatar__status[data-status="offline"] {
    background: var(--color-text-low);
  }
</style>
