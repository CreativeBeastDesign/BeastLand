<!-- src/routes/sections/NavigationAndOverlays.svelte -->
<!-- Showcase section: navigation & overlay molecules/organisms (avatar,
     breadcrumb, date picker, drawer). -->

<script lang="ts">
  import { runBridge } from "$lib/shell/bridge.js";
  import type { ComponentProps } from "svelte";

  import Window from "$lib/components/organisms/Window.svelte";
  import Drawer from "$lib/components/organisms/Drawer.svelte";
  import Divider from "$lib/components/atoms/Divider.svelte";
  import Button from "$lib/components/atoms/Button.svelte";
  import Avatar from "$lib/components/atoms/Avatar.svelte";
  import Input from "$lib/components/atoms/Input.svelte";
  import Switch from "$lib/components/atoms/Switch.svelte";
  import Select from "$lib/components/molecules/Select.svelte";
  import Breadcrumb from "$lib/components/molecules/Breadcrumb.svelte";
  import DatePicker from "$lib/components/molecules/DatePicker.svelte";

  // --- Avatar ------------------------------------------------------------------
  const statuses: ComponentProps<typeof Avatar>["status"][] = ["online", "away", "busy", "offline"];
  const sizes: ComponentProps<typeof Avatar>["size"][] = ["sm", "md", "lg"];
  const tones: ComponentProps<typeof Avatar>["tone"][] = ["accent", "secondary", "neutral"];

  // --- Breadcrumb ----------------------------------------------------------------
  const breadcrumbItems: ComponentProps<typeof Breadcrumb>["items"] = [
    { label: "Home", href: "#" },
    { label: "Projects", href: "#" },
    { label: "BeastLand", href: "#" },
    { label: "Components", command: "help" },
    { label: "Navigation", href: "#" },
    { label: "Breadcrumb" },
  ];

  // --- DatePicker ------------------------------------------------------------------
  let plainDate = $state("");
  let rangedDate = $state("2026-09-20");

  // --- Drawer form ------------------------------------------------------------------
  let rightDrawerOpen = $state(false);
  let bottomDrawerOpen = $state(false);

  let recordName = $state("Invoice #1042");
  let recordCurrency = $state("CHF");
  let recordArchived = $state(false);
  const currencyOptions = [
    { value: "CHF", label: "CHF — Swiss franc" },
    { value: "EUR", label: "EUR — Euro" },
    { value: "USD", label: "USD — US dollar" },
  ];

  function saveAndClose(which: "right" | "bottom") {
    if (which === "right") rightDrawerOpen = false;
    else bottomDrawerOpen = false;
  }
</script>

<Window
  title="Navigation & overlays"
  subtitle="avatar, breadcrumb, date picker, drawer"
>
  <p class="section-intro">Avatar — image with initials fallback, sizes, tones, and status dots.</p>
  <div class="row row--center">
    <Avatar name="Andre Baerlocher" src="/wallpapers/adler.jpg" />
    <Avatar name="Andre Baerlocher" src="data:," tone="accent" />
    <Avatar name="Rae K" tone="secondary" />
    <Avatar name="Solo" tone="neutral" />
  </div>
  <div class="row row--center">
    {#each sizes as size (size)}
      <Avatar name="Jamie Lin" size={size} tone="accent" />
    {/each}
    {#each tones as tone (tone)}
      <Avatar name="Nadia Fox" {tone} />
    {/each}
  </div>
  <div class="row row--center">
    {#each statuses as status (status)}
      <Avatar name="Kai Vance" tone="accent" {status} />
    {/each}
  </div>

  <Divider />

  <p class="section-intro">Breadcrumb — collapses the middle into a Menu past 4 items.</p>
  <Breadcrumb items={breadcrumbItems} oncommand={runBridge} />

  <Divider />

  <p class="section-intro">DatePicker — typeable field (dd.mm.yyyy) or the calendar popover.</p>
  <div class="stack">
    <div class="row row--center">
      <DatePicker bind:value={plainDate} placeholder="Choose a date" />
      <span class="mono-text">value: {plainDate || "(empty)"}</span>
    </div>
    <div class="row row--center">
      <DatePicker
        bind:value={rangedDate}
        size="sm"
        min="2026-09-01"
        max="2026-09-30"
      />
      <span class="mono-text">min 01.09.2026 &middot; max 30.09.2026</span>
    </div>
  </div>

  <Divider />

  <p class="section-intro">Drawer — a side sheet with the same focus-trap mechanics as Modal.</p>
  <div class="row">
    <Button onclick={() => (rightDrawerOpen = true)}>Open right drawer</Button>
    <Button variant="glass" onclick={() => (bottomDrawerOpen = true)}>Open bottom drawer</Button>
  </div>
</Window>

<Drawer title="Edit record" open={rightDrawerOpen} onclose={() => (rightDrawerOpen = false)} side="right">
  <div class="stack">
    <label class="field">
      <span class="field__label">Name</span>
      <Input
        bind:value={recordName}
        placeholder="Record name"
      />
    </label>
    <label class="field">
      <span class="field__label">Currency</span>
      <Select bind:value={recordCurrency} options={currencyOptions} />
    </label>
    <Switch bind:checked={recordArchived} label="Archived" description="Hide from active lists" />
  </div>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (rightDrawerOpen = false)}>Cancel</Button>
    <Button variant="accent" onclick={() => saveAndClose("right")}>Save</Button>
  {/snippet}
</Drawer>

<Drawer title="Quick note" open={bottomDrawerOpen} onclose={() => (bottomDrawerOpen = false)} side="bottom" size="16rem">
  <p class="mono-text">A bottom drawer is handy for short, wide forms — command palettes,
    quick filters, or a single note field like this one.</p>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (bottomDrawerOpen = false)}>Cancel</Button>
    <Button variant="accent" onclick={() => saveAndClose("bottom")}>Save</Button>
  {/snippet}
</Drawer>

<style>
  .section-intro {
    margin: 0 0 var(--space-3);
    color: var(--color-text-med);
    font-size: var(--text-sm);
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
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }

  .row:last-child {
    margin-bottom: 0;
  }

  .row--center {
    align-items: center;
  }

  .mono-text {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-text-med);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .field__label {
    font-size: var(--text-sm);
    color: var(--color-text-low);
  }
</style>
