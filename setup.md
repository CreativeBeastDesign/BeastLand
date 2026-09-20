# Project structure

```
src/
  lib/
    components/
      atoms/
        Surface.svelte
        Button.svelte
        IconButton.svelte
        Input.svelte
        Kbd.svelte
        Badge.svelte
        Divider.svelte
        Wallpaper.svelte
      molecules/
        SearchField.svelte
        WindowTitleBar.svelte
        WorkspaceSwitcher.svelte
        StatusItem.svelte
        NotificationItem.svelte
      organisms/
        Window.svelte
        TopBar.svelte
        Dock.svelte
        Sidebar.svelte
        Modal.svelte
        SettingsPane.svelte
      templates/
        DesktopShell.svelte
        DashboardTemplate.svelte
    styles/
      tokens/
        base.css
        semantic.css
        components.css
      themes/
        hypr-dark.css
        hypr-light.css
        tokyo-glass.css
      utilities/
        glass.css
        motion.css
    theme/
      index.ts
      themes.ts
      types.ts
```

# Token pipeline

```
primitive tokens
  ↓
semantic tokens
  ↓
component tokens
  ↓
theme overrides
```

## Example

```
--blue-500
  ↓
--color-accent
  ↓
--button-primary-bg
  ↓
[data-theme="tokyo-night"] --color-accent: ...
```

## Color tokens

```
--color-bg;
--color-surface-0;
--color-surface-1;
--color-surface-2;
--color-overlay;
--color-glass;

--color-text-high;
--color-text-med;
--color-text-low;
--color-text-disabled;

--color-accent;
--color-accent-soft;
--color-accent-strong;
--color-on-accent;

--color-success;
--color-warning;
--color-danger;
--color-info;

--color-border;
--color-border-strong;
--color-border-subtle;
--color-border-active;

--color-focus;
--color-glow;
```

## Glass/effect tokens

```
--fx-blur-xs;
--fx-blur-sm;
--fx-blur-md;
--fx-blur-lg;

--fx-glass-alpha;
--fx-glass-saturation;
--fx-glass-contrast;
--fx-glass-brightness;

--fx-noise-opacity;
--fx-highlight-opacity;

--fx-shadow-color;
--fx-glow-opacity;
```

## Shape tokens

```
--radius-xs;
--radius-sm;
--radius-md;
--radius-lg;
--radius-xl;

--radius-window;
--radius-control;
--radius-popup;
--radius-pill;

--border-width;
--border-active-width;
```

## Elevation/Shadow/Glow tokens

```
--shadow-xs;
--shadow-sm;
--shadow-md;
--shadow-lg;

--shadow-window;
--shadow-popup;
--shadow-modal;

--glow-accent;
--glow-focus;
--glow-active;
```

## Layout/spacing tokens

```
--space-1;
--space-2;
--space-3;
--space-4;
--space-5;
--space-6;
--space-8;

--gap-tile;
--gap-shell;
--gap-section;

--panel-height;
--bar-height;
--dock-item-size;
```

## Z-index/layer tokens

```
--layer-wallpaper;
--layer-shell;
--layer-panel;
--layer-window;
--layer-popover;
--layer-notification;
--layer-modal;
--layer-tooltip;
```

## Motion tokens

```
--ease-hypr;
--ease-out;
--ease-in;
--ease-in-out;

--duration-fast;
--duration-normal;
--duration-slow;

--scale-window-in;
--scale-window-out;
--translate-window-in;
```

## Typography tokens

```
--font-ui; // Lexend
--font-mono; // Illinois Mono

--text-xs;
--text-sm;
--text-base;
--text-lg;

--font-weight-normal;
--font-weight-medium;
--font-weight-semibold;
```
