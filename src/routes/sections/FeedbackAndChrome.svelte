<!-- src/routes/sections/FeedbackAndChrome.svelte -->

<script lang="ts">
  import { shell } from "$lib/shell/state.svelte.js";
  import { runBridge } from "$lib/shell/bridge.js";
  import type { ComponentProps } from "svelte";

  import Window from "$lib/components/organisms/Window.svelte";
  import ToastStack from "$lib/components/organisms/ToastStack.svelte";
  import StatusBar from "$lib/components/organisms/StatusBar.svelte";
  import Tabs from "$lib/components/molecules/Tabs.svelte";
  import Menu from "$lib/components/molecules/Menu.svelte";
  import Tooltip from "$lib/components/atoms/Tooltip.svelte";
  import ScrollArea from "$lib/components/atoms/ScrollArea.svelte";
  import Button from "$lib/components/atoms/Button.svelte";
  import IconButton from "$lib/components/atoms/IconButton.svelte";
  import Divider from "$lib/components/atoms/Divider.svelte";
  import { notify, type ToastTone } from "$lib/shell/toasts.svelte.js";

  const toastTones: ToastTone[] = ["info", "success", "warning", "danger"];

  function pushToast(tone: ToastTone) {
    notify({
      title: `${tone.charAt(0).toUpperCase()}${tone.slice(1)} toast`,
      message: `This is a ${tone} notification.`,
      tone,
    });
  }

  function pushStickyToast() {
    notify({
      title: "Action required",
      message: "This toast stays until you dismiss it, or run its action.",
      tone: "warning",
      timeout: 0,
      action: { label: "Help", command: "help" },
    });
  }

  const tabs: ComponentProps<typeof Tabs>["tabs"] = [
    { id: "overview", label: "Overview" },
    { id: "activity", label: "Activity", badge: "3" },
    { id: "settings", label: "Settings" },
  ];
  let activeTab = $state("overview");

  let menuOpen = $state(false);
  const menuItems: ComponentProps<typeof Menu>["items"] = [
    { id: "rename", label: "Rename", shortcut: "⌘R" },
    { id: "duplicate", label: "Duplicate", shortcut: "⌘D" },
    { separator: true },
    { id: "delete", label: "Delete", danger: true },
  ];

  const scrollLines = Array.from(
    { length: 30 },
    (_, i) => `${(i + 1).toString().padStart(2, "0")}  log line ${i + 1} of 30`,
  );
</script>

<ToastStack />

<Window title="Feedback & chrome" subtitle="toasts, status bar, tabs, tooltip, menu, scroll area">
  <p class="section-intro">Toasts push into the fixed ToastStack mounted above.</p>
  <div class="row">
    {#each toastTones as tone (tone)}
      <Button variant="glass" size="sm" onclick={() => pushToast(tone)}>{tone}</Button>
    {/each}
    <Button variant="ghost" size="sm" onclick={pushStickyToast}>sticky + action</Button>
  </div>

  <Divider />

  <p class="section-intro">StatusBar</p>
  <div class="chrome-frame chrome-frame--bar">
    <StatusBar>
      {#snippet left()}
        <span class="bar-meta">{shell.themeMeta.label} &middot; {shell.wallpaperMeta.label}</span>
      {/snippet}
    </StatusBar>
  </div>

  <Divider />

  <p class="section-intro">Tabs</p>
  <Tabs {tabs} active={activeTab} onchange={(id) => (activeTab = id)}>
    {#snippet children(id)}
      {#if id === "overview"}
        <p class="mono-text">Overview panel content.</p>
      {:else if id === "activity"}
        <p class="mono-text">Three unread events in the activity panel.</p>
      {:else}
        <p class="mono-text">Settings panel content.</p>
      {/if}
    {/snippet}
  </Tabs>

  <Divider />

  <div class="row row--center">
    <Tooltip text="Toggle notifications" placement="top">
      <IconButton label="Notifications">
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
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </IconButton>
    </Tooltip>

    <Menu items={menuItems} open={menuOpen} onclose={() => (menuOpen = false)} oncommand={runBridge}>
      {#snippet anchor()}
        <Button variant="glass" size="sm" onclick={() => (menuOpen = !menuOpen)}>
          Actions
        </Button>
      {/snippet}
    </Menu>
  </div>

  <Divider />

  <p class="section-intro">ScrollArea</p>
  <ScrollArea class="scroll-demo">
    <div class="stack scroll-demo__lines">
      {#each scrollLines as line (line)}
        <p class="mono-text">{line}</p>
      {/each}
    </div>
  </ScrollArea>
</Window>

<style>
  .bar-meta {
    color: var(--color-text-med);
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  .row:last-child {
    margin-bottom: 0;
  }

  .row--center {
    align-items: center;
  }

  .section-intro {
    margin: 0 0 var(--space-3);
    color: var(--color-text-med);
    font-size: var(--text-sm);
  }

  .mono-text {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-text-med);
  }

  .chrome-frame {
    position: relative;
    border-radius: var(--radius-window);
    border: var(--border-width) solid var(--color-border);
    overflow: hidden;
  }

  /* The bar draws its own top border; a second one from the frame reads as
     a cropped edge. */
  .chrome-frame--bar {
    border: none;
    box-shadow: 0 0 0 var(--border-width) var(--color-border);
  }

  :global(.scroll-demo) {
    height: 8rem;
  }

  .scroll-demo__lines {
    gap: var(--space-1);
  }
</style>
