<script lang="ts">
  import type { ComponentProps } from "svelte";

  import { shell } from "$lib/shell/state.svelte.js";
  import { wallpapers } from "$lib/wallpapers.js";
  import { themes } from "$lib/theme/themes.js";

  import Button from "$lib/components/atoms/Button.svelte";
  import IconButton from "$lib/components/atoms/IconButton.svelte";
  import Input from "$lib/components/atoms/Input.svelte";
  import Kbd from "$lib/components/atoms/Kbd.svelte";
  import Divider from "$lib/components/atoms/Divider.svelte";
  import Badge from "$lib/components/atoms/Badge.svelte";
  import Surface from "$lib/components/atoms/Surface.svelte";

  import StatusItem from "$lib/components/molecules/StatusItem.svelte";
  import WorkspaceSwitcher from "$lib/components/molecules/WorkspaceSwitcher.svelte";
  import SearchField from "$lib/components/molecules/SearchField.svelte";
  import NotificationItem from "$lib/components/molecules/NotificationItem.svelte";
  import WindowTitleBar from "$lib/components/molecules/WindowTitleBar.svelte";

  import Window from "$lib/components/organisms/Window.svelte";
  import TopBar from "$lib/components/organisms/TopBar.svelte";
  import Dock from "$lib/components/organisms/Dock.svelte";
  import Sidebar from "$lib/components/organisms/Sidebar.svelte";
  import SettingsPane from "$lib/components/organisms/SettingsPane.svelte";
  import Modal from "$lib/components/organisms/Modal.svelte";

  import DesktopShell from "$lib/components/templates/DesktopShell.svelte";
  import DashboardTemplate from "$lib/components/templates/DashboardTemplate.svelte";

  import FeedbackAndChrome from "./sections/FeedbackAndChrome.svelte";
  import FormsAndData from "./sections/FormsAndData.svelte";
  import NavigationAndOverlays from "./sections/NavigationAndOverlays.svelte";

  // --- Section 4: notifications -------------------------------------------------
  type NotificationDatum = {
    id: string;
    title: string;
    message: string;
    tone: ComponentProps<typeof NotificationItem>["tone"];
    timestamp: string;
  };

  const initialNotifications: NotificationDatum[] = [
    {
      id: "n1",
      title: "Build finished",
      message: "beastland@1.0.0 compiled without errors.",
      tone: "success",
      timestamp: "2m",
    },
    {
      id: "n2",
      title: "New theme available",
      message: "Beast Dark is now the default shell theme.",
      tone: "info",
      timestamp: "10m",
    },
    {
      id: "n3",
      title: "Wallpaper cache stale",
      message: "Re-run `wallpaper` in the terminal to refresh assets.",
      tone: "warning",
      timestamp: "1h",
    },
  ];

  let notifications = $state<NotificationDatum[]>([...initialNotifications]);

  function dismiss(id: string) {
    notifications = notifications.filter((n) => n.id !== id);
  }

  function resetNotifications() {
    notifications = [...initialNotifications];
  }

  // --- Section 4: workspace switcher ---------------------------------------------
  let activeWorkspace = $state("one");

  // --- Section 8: modal -----------------------------------------------------------
  let modalOpen = $state(false);

  // --- Section 7: dock ------------------------------------------------------------
  const dockItems: ComponentProps<typeof Dock>["items"] = [
    { id: "files", label: "Files" },
    { id: "term", label: "Terminal" },
    { id: "browser", label: "Browser" },
    { id: "music", label: "Music" },
    { id: "settings", label: "Settings" },
  ];
  let activeDockItem = $state("term");

  // --- Section 7: sidebar ---------------------------------------------------------
  const sidebarItems: ComponentProps<typeof Sidebar>["items"] = [
    { id: "overview", label: "Overview" },
    { id: "components", label: "Components", badge: "21" },
    { id: "themes", label: "Themes" },
    { id: "wallpapers", label: "Wallpapers" },
    { id: "docs", label: "Docs" },
  ];
  let activeSidebarItem = $state("components");

  // --- Section 8: settings ---------------------------------------------------------
  const settingsSections = [
    { id: "general", label: "General" },
    { id: "appearance", label: "Appearance" },
    { id: "shortcuts", label: "Shortcuts" },
  ];
  let activeSettingsSection = $state("appearance");
  const settingsRows = [
    { id: "reduce-motion", label: "Reduce motion", description: "Disable window transitions" },
    { id: "glass", label: "Glass effects", description: "Blur behind panels and the dock" },
    { id: "gaps", label: "Gap size", description: "Space between tiled windows" },
  ];

  // --- Colour token swatches --------------------------------------------------------
  const coreSwatches = [
    "--color-accent",
    "--color-secondary",
    "--color-bg",
    "--color-surface-0",
    "--color-surface-1",
    "--color-surface-2",
    "--color-text-high",
    "--color-text-med",
    "--color-text-low",
    "--color-success",
    "--color-warning",
    "--color-danger",
    "--color-info",
    "--color-glass",
  ];

  const buttonVariants: ComponentProps<typeof Button>["variant"][] = [
    "solid",
    "glass",
    "ghost",
    "accent",
  ];
  const buttonSizes: ComponentProps<typeof Button>["size"][] = ["sm", "md", "lg"];

  const badgeTones: ComponentProps<typeof Badge>["tone"][] = [
    "neutral",
    "accent",
    "success",
    "warning",
    "danger",
    "info",
  ];
</script>

<div class="showcase">
  <!-- 1. Hero / shell controls -->
  <div class="showcase__wide">
  <Window title="BeastLand" subtitle="component showcase" active>
    <div class="hero">
      <h1 class="hero__title">BeastLand</h1>
      <p class="hero__lead">
        A Hyprland-inspired app shell kit &mdash; glassy windows, a live wallpaper, and a
        keyboard-first terminal, built from the tokens below.
      </p>

      <div class="hero__row">
        <span class="hero__row-label">Theme</span>
        <div class="hero__controls">
          {#each shell.themeIds as id (id)}
            <Button
              variant={shell.theme === id ? "accent" : "glass"}
              size="sm"
              aria-pressed={shell.theme === id}
              onclick={() => shell.setTheme(id)}
            >
              {themes[id].label}
            </Button>
          {/each}
        </div>
      </div>

      <div class="hero__row">
        <span class="hero__row-label">Wallpaper</span>
        <div class="hero__controls">
          {#each shell.wallpaperIds as id (id)}
            <button
              class="wallpaper-thumb"
              class:wallpaper-thumb--active={shell.wallpaper === id}
              type="button"
              aria-pressed={shell.wallpaper === id}
              title={wallpapers[id].label}
              onclick={() => shell.setWallpaper(id)}
            >
              <img src={wallpapers[id].src} alt={wallpapers[id].label} width="96" height="54" />
            </button>
          {/each}
        </div>
      </div>

      <p class="hero__hint">
        or type <Kbd>theme</Kbd> / <Kbd>wallpaper</Kbd> in the terminal
      </p>
    </div>
  </Window>
  </div>

  <!-- 2. Colour tokens -->
  <Window title="Colour tokens" subtitle="semantic + theme layer">
    <p class="section-intro">Every value below reads from the active theme's CSS variables.</p>
    <div class="swatch-grid">
      {#each coreSwatches as token (token)}
        <div class="swatch">
          <div class="swatch__fill" style="background: var({token});"></div>
          <span class="swatch__label">{token}</span>
        </div>
      {/each}
      <div class="swatch">
        <div class="swatch__fill" style="background: var(--gradient-border-active, var(--color-accent));"></div>
        <span class="swatch__label">--gradient-border-active</span>
      </div>
    </div>
  </Window>

  <!-- 3. Buttons & controls -->
  <Window title="Buttons & controls" subtitle="atoms">
    <p class="section-intro">Variants &times; sizes, icon buttons, inputs, kbd combos.</p>

    <div class="stack">
      {#each buttonVariants as variant (variant)}
        <div class="row">
          {#each buttonSizes as size (size)}
            <Button {variant} {size}>{variant} / {size}</Button>
          {/each}
        </div>
      {/each}
    </div>

    <Divider />

    <div class="row">
      <IconButton label="Small icon" size="sm">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4" /></svg>
      </IconButton>
      <IconButton label="Medium icon" size="md" active>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4" /></svg>
      </IconButton>
      <IconButton label="Large icon" size="lg">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4" /></svg>
      </IconButton>
    </div>

    <Divider />

    <div class="stack">
      <Input size="sm" placeholder="small input" />
      <Input size="md" placeholder="medium input" />
      <Input size="lg" placeholder="large input" />
      <Input size="md" placeholder="invalid input" invalid />
    </div>

    <Divider />

    <div class="row row--center">
      <Kbd>Super</Kbd>
      <span class="kbd-plus">+</span>
      <Kbd>Enter</Kbd>
    </div>
  </Window>

  <!-- 4. Badges & status -->
  <Window title="Badges & status" subtitle="molecules">
    <p class="section-intro">Tones, dots, status readouts, and the workspace switcher.</p>

    <div class="row">
      {#each badgeTones as tone (tone)}
        <Badge {tone}>{tone}</Badge>
      {/each}
    </div>
    <div class="row">
      {#each badgeTones as tone (tone)}
        <Badge {tone} dot>{tone}</Badge>
      {/each}
    </div>

    <Divider />

    <div class="row">
      <StatusItem label="CPU" value="12%" />
      <StatusItem label="RAM" value="3.4G" />
      <StatusItem label="net" value="820kb/s" />
    </div>

    <Divider />

    <WorkspaceSwitcher activeId={activeWorkspace} onchange={(id) => (activeWorkspace = id)} />
  </Window>

  <!-- 5. Search & notifications -->
  <Window title="Search & notifications" subtitle="molecules">
    <SearchField placeholder="Search components&hellip;" shortcut="⌘K" />

    <Divider />

    <div class="stack">
      {#each notifications as n (n.id)}
        <NotificationItem
          title={n.title}
          message={n.message}
          tone={n.tone}
          timestamp={n.timestamp}
          ondismiss={() => dismiss(n.id)}
        />
      {/each}
      {#if notifications.length === 0}
        <p class="section-intro">All caught up.</p>
      {/if}
    </div>

    <div class="row">
      <Button variant="ghost" size="sm" onclick={resetNotifications}>Reset</Button>
    </div>
  </Window>

  <!-- 6. Windows -->
  <div class="showcase__wide">
  <Window title="Windows" subtitle="mini tiling layout">
    <div class="tiling-grid">
      <Window title="term" subtitle="~/beastland" active>
        {#snippet actions()}
          <IconButton label="Minimize" size="sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14" /></svg>
          </IconButton>
          <IconButton label="Close" size="sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </IconButton>
        {/snippet}
        <pre class="mono-block">$ beastland build
✓ tokens
✓ components
✓ themes</pre>
      </Window>

      <Window title="notes.md" subtitle="scratch">
        <p class="mono-text">Lorem ipsum dolor sit amet, tiling window manager style
          layout with glassy panels and gap-based spacing.</p>
      </Window>

      <Window title="status">
        <div class="stack">
          <StatusItem label="workspace" value="1/3" />
          <StatusItem label="theme" value={shell.theme} />
        </div>
      </Window>
    </div>

    <Divider />

    <p class="section-intro">WindowTitleBar, standalone:</p>
    <WindowTitleBar title="standalone.title" subtitle="no window body" active>
      {#snippet actions()}
        <IconButton label="Close" size="sm">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </IconButton>
      {/snippet}
    </WindowTitleBar>
  </Window>
  </div>

  <!-- 7. Shell chrome -->
  <div class="showcase__wide">
  <Window title="Shell chrome" subtitle="TopBar, Dock, Sidebar">
    <p class="section-intro">TopBar, standalone:</p>
    <div class="chrome-frame">
      <TopBar activeWorkspace={activeWorkspace} onworkspace={(id) => (activeWorkspace = id)} />
    </div>

    <Divider />

    <div class="chrome-row">
      <div class="chrome-frame chrome-frame--dock">
        <Dock items={dockItems} activeId={activeDockItem} onselect={(id) => (activeDockItem = id)} fixed={false} />
      </div>

      <div class="chrome-frame chrome-frame--sidebar">
        <Sidebar items={sidebarItems} activeId={activeSidebarItem} onselect={(id) => (activeSidebarItem = id)}>
          {#snippet header()}
            <span class="sidebar-brand">Beast<span class="sidebar-brand__accent">Land</span></span>
          {/snippet}
          {#snippet footer()}
            <span class="mono-text">v1.0.0</span>
          {/snippet}
        </Sidebar>
      </div>
    </div>
  </Window>
  </div>

  <!-- 8. Settings & modal -->
  <Window title="Settings & modal" subtitle="organisms">
    <div class="settings-frame">
      <SettingsPane
        title="Preferences"
        sections={settingsSections}
        activeSection={activeSettingsSection}
        onsection={(id) => (activeSettingsSection = id)}
        rows={settingsRows}
      />
    </div>

    <Divider />

    <div class="row">
      <Button onclick={() => (modalOpen = true)}>Open modal</Button>
    </div>

    <Modal title="Confirm action" open={modalOpen} onclose={() => (modalOpen = false)}>
      <p class="mono-text">This is a demo modal body. It closes on backdrop click, Escape, or
        one of the buttons below.</p>
      {#snippet footer()}
        <Button variant="ghost" onclick={() => (modalOpen = false)}>Cancel</Button>
        <Button variant="accent" onclick={() => (modalOpen = false)}>Confirm</Button>
      {/snippet}
    </Modal>
  </Window>

  <!-- 9. Feedback & chrome / 10. Forms & data / 11. Navigation & overlays -->
  <div class="showcase__wide"><FeedbackAndChrome /></div>
  <div class="showcase__wide"><FormsAndData /></div>
  <div class="showcase__wide"><NavigationAndOverlays /></div>

  <!-- 12. Templates -->
  <div class="showcase__wide">
  <Window title="Templates" subtitle="DesktopShell & DashboardTemplate">
    <div class="template-grid">
      <div class="template-frame-outer">
        <div class="template-frame">
          <DesktopShell wallpaper={shell.wallpaperMeta.src} {dockItems} activeDockItem="term" activeWorkspace="one">
            <div class="tile tile--a">
              <Window title="term" active>
                <pre class="mono-block">$ ls</pre>
              </Window>
            </div>
            <div class="tile tile--b">
              <Window title="notes">
                <p class="mono-text">tiled window b</p>
              </Window>
            </div>
          </DesktopShell>
        </div>
      </div>

      <div class="template-frame">
        <DashboardTemplate sidebarItems={sidebarItems} activeSidebarItem="overview">
          <Window title="widget-a">
            <p class="mono-text">dashboard content</p>
          </Window>
          <Window title="widget-b">
            <p class="mono-text">more dashboard content</p>
          </Window>
        </DashboardTemplate>
      </div>
    </div>
  </Window>
  </div>
</div>

<style>
  .showcase {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
    gap: var(--gap-tile);
    align-items: start;
  }

  .showcase__wide {
    grid-column: 1 / -1;
  }

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
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  .row:last-child {
    margin-bottom: 0;
  }

  .row--center {
    align-items: center;
  }

  .kbd-plus {
    color: var(--color-text-low);
    font-family: var(--font-mono);
  }

  .mono-text,
  .mono-block {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-text-med);
    margin: 0;
  }

  .mono-block {
    white-space: pre-wrap;
  }

  /* --- Hero --- */
  .hero {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .hero__title {
    margin: 0;
    font-size: 2.5rem;
    font-weight: var(--font-weight-semibold);
    background: var(--gradient-brand, linear-gradient(45deg, var(--color-accent), var(--color-secondary, var(--color-accent))));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .hero__lead {
    margin: 0;
    max-width: 46rem;
    color: var(--color-text-med);
    font-size: var(--text-base);
  }

  .hero__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
  }

  .hero__row-label {
    min-width: 6rem;
    color: var(--color-text-low);
    font-size: var(--text-sm);
    font-family: var(--font-mono);
  }

  .hero__controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .hero__hint {
    margin: 0;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-low);
    font-size: var(--text-sm);
  }

  .wallpaper-thumb {
    padding: 0;
    border: 2px solid transparent;
    border-radius: var(--radius-control);
    background: transparent;
    cursor: pointer;
    line-height: 0;
    overflow: hidden;
    transition: border-color var(--duration-fast) var(--ease-out);
  }

  .wallpaper-thumb img {
    display: block;
    width: 96px;
    height: 54px;
    object-fit: cover;
    border-radius: calc(var(--radius-control) - 2px);
  }

  .wallpaper-thumb:hover {
    border-color: var(--color-border-strong);
  }

  .wallpaper-thumb--active {
    border-color: var(--color-secondary, var(--color-accent));
    box-shadow: 0 0 10px var(--color-glow);
  }

  /* --- Colour tokens --- */
  .swatch-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
    gap: var(--space-3);
  }

  .swatch {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .swatch__fill {
    height: 2.5rem;
    border-radius: var(--radius-control);
    border: var(--border-width) solid var(--color-border);
  }

  .swatch__label {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-low);
    word-break: break-all;
  }

  /* --- Windows tiling demo --- */
  .tiling-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--gap-tile);
  }

  .tiling-grid > :global(.surface:first-child) {
    grid-column: 1 / -1;
  }

  /* --- Shell chrome --- */
  .chrome-frame {
    position: relative;
    border-radius: var(--radius-window);
    border: var(--border-width) solid var(--color-border);
    overflow: hidden;
  }

  .chrome-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--gap-tile);
    align-items: flex-start;
  }

  .chrome-frame--dock {
    position: relative;
    flex: 1 1 16rem;
    min-height: 6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-0);
  }

  .chrome-frame--sidebar {
    flex: 0 0 auto;
    height: 16rem;
  }

  .sidebar-brand {
    font-family: var(--font-mono);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
  }

  .sidebar-brand__accent {
    color: var(--color-accent);
  }

  /* --- Settings --- */
  .settings-frame {
    height: 20rem;
    border-radius: var(--radius-window);
    border: var(--border-width) solid var(--color-border);
    overflow: hidden;
  }

  /* --- Templates --- */
  .template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    gap: var(--gap-tile);
  }

  .template-frame {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: var(--radius-window);
    border: 1px solid var(--color-border);
  }

  /* DesktopShell's Dock uses `position: fixed`; translateZ(0) creates a
     containing block for fixed descendants so the dock stays inside this
     preview frame instead of escaping to the real viewport. */
  .template-frame-outer {
    transform: translateZ(0);
  }

  .tile {
    position: absolute;
    z-index: var(--layer-window);
  }

  .tile :global(.surface) {
    height: 100%;
  }

  .tile--a {
    inset: var(--gap-out) 55% var(--gap-out) var(--gap-out);
  }

  .tile--b {
    inset: var(--gap-out) var(--gap-out) var(--gap-out) 47%;
  }
</style>
