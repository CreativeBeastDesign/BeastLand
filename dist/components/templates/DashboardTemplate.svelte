<!-- src/lib/components/templates/DashboardTemplate.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import TopBar from "../organisms/TopBar.svelte";
  import Sidebar from "../organisms/Sidebar.svelte";
  import type { ComponentProps } from "svelte";

  type Props = {
    sidebarItems?: ComponentProps<typeof Sidebar>["items"];
    activeSidebarItem?: string;
    onsidebar?: (id: string) => void;
    header?: Snippet;
    footer?: Snippet;
    topbarRight?: Snippet;
    children: Snippet;
  };

  let {
    sidebarItems,
    activeSidebarItem,
    onsidebar,
    header,
    footer,
    topbarRight,
    children,
  }: Props = $props();
</script>

<div class="dashboard">
  <TopBar right={topbarRight} />

  <div class="dashboard__body">
    <Sidebar
      items={sidebarItems}
      activeId={activeSidebarItem}
      onselect={onsidebar}
      {header}
      {footer}
    />

    <main class="dashboard__content">{@render children()}</main>
  </div>
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: var(--color-bg);
  }

  .dashboard__body {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .dashboard__content {
    flex: 1;
    overflow-y: auto;
    padding: var(--gap-tile);
    display: flex;
    flex-direction: column;
    gap: var(--gap-section);
  }
</style>
