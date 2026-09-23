<!-- src/lib/components/atoms/Surface.svelte -->

<script lang="ts">
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

type Radius = "none" | "control" | "window" | "popup";

type Props = HTMLAttributes<HTMLDivElement> & {
	glass?: boolean;
	active?: boolean;
	radius?: Radius;
	children: Snippet;
};

let { glass, active, radius, children, ...restProps }: Props = $props();
</script>

<div
  class="surface"
  class:surface--glass={glass}
  class:surface--active={active}
  class:grain={glass}
  data-radius={radius}
  {...restProps}
>
{@render children()}
</div>

<style>
  .surface {
    border-radius: var(--radius-window);
  }

  .surface[data-radius="none"] {
    border-radius: 0;
  }

  .surface[data-radius="control"] {
    border-radius: var(--radius-control);
  }

  .surface[data-radius="popup"] {
    border-radius: var(--radius-popup);
  }
</style>
