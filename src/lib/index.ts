// Atoms
export { default as Badge } from "$lib/components/atoms/Badge.svelte";
export { default as Button } from "$lib/components/atoms/Button.svelte";
export { default as Divider } from "$lib/components/atoms/Divider.svelte";
export { default as IconButton } from "$lib/components/atoms/IconButton.svelte";
export { default as Input } from "$lib/components/atoms/Input.svelte";
export { default as Kbd } from "$lib/components/atoms/Kbd.svelte";
export { default as Surface } from "$lib/components/atoms/Surface.svelte";
export { default as Wallpaper } from "$lib/components/atoms/Wallpaper.svelte";

// Molecules
export { default as NotificationItem } from "$lib/components/molecules/NotificationItem.svelte";
export { default as SearchField } from "$lib/components/molecules/SearchField.svelte";
export { default as StatusItem } from "$lib/components/molecules/StatusItem.svelte";
export { default as WindowTitleBar } from "$lib/components/molecules/WindowTitleBar.svelte";
export { default as WorkspaceSwitcher } from "$lib/components/molecules/WorkspaceSwitcher.svelte";

// Organisms
export { default as Dock } from "$lib/components/organisms/Dock.svelte";
export { default as Modal } from "$lib/components/organisms/Modal.svelte";
export { default as SettingsPane } from "$lib/components/organisms/SettingsPane.svelte";
export { default as Sidebar } from "$lib/components/organisms/Sidebar.svelte";
export { default as Terminal } from "$lib/components/organisms/Terminal.svelte";
export { default as TopBar } from "$lib/components/organisms/TopBar.svelte";
export { default as Window } from "$lib/components/organisms/Window.svelte";

// Templates
export { default as DashboardTemplate } from "$lib/components/templates/DashboardTemplate.svelte";
export { default as DesktopShell } from "$lib/components/templates/DesktopShell.svelte";

// Tiling workspace
export { default as ShortId } from "$lib/components/atoms/ShortId.svelte";
export { default as RecordView } from "$lib/components/molecules/RecordView.svelte";
export { default as CustomerCard } from "$lib/components/molecules/CustomerCard.svelte";
export { default as DocumentCard } from "$lib/components/molecules/DocumentCard.svelte";
export { default as Tile } from "$lib/components/organisms/Tile.svelte";
export { default as TilingWorkspace } from "$lib/components/organisms/TilingWorkspace.svelte";
export { default as EmptyRecord } from "$lib/components/tiles/EmptyRecord.svelte";
export { MOD, MODIFIER, hasModifier } from "$lib/shell/keys.js";
export * from "$lib/tiling/types.js";
export * from "$lib/tiling/ids.js";
export { workspace } from "$lib/tiling/workspace.svelte.js";
export { kinds, type KindSpec, type KindAction, type SetResult } from "$lib/tiling/kinds.svelte.js";
export * from "$lib/tiling/views.js";
export * from "$lib/tiling/workspace-commands.js";
export * from "$lib/data/kinds.js";
export { tilingCommands } from "$lib/tiling/commands.js";
export * from "$lib/data/types.js";
export * from "$lib/data/format.js";
export { data } from "$lib/data/store.svelte.js";

// Theme and utilities
export * from "$lib/theme/index.js";
export * from "$lib/wallpapers.js";
export { shell } from "$lib/shell/state.svelte.js";
export * from "$lib/shell/commands.js";
export * from "$lib/shell/completion.js";
export { registry } from "$lib/shell/registry.svelte.js";
export {
  storage,
  memoryStorage,
  webStorage,
  toAsync,
  type StorageAdapter,
  type AsyncStorageAdapter,
  type LoadOptions,
} from "$lib/shell/storage.js";
export { defaultKeymap, describeKeymap, resolveKey, type KeyBinding, type Action } from "$lib/shell/keymap.js";
export { commandBridge, runBridge } from "$lib/shell/bridge.js";
export { clearHistory, loadHistory, persistHistory, historyStorageKey, HISTORY_CAP } from "$lib/shell/history.js";
export { proseSpans, commandLineSpans, isRunnableFenceInfo, type LineVerdict, type ProseOptions } from "$lib/shell/prose.js";
export { linkify, isAllowedLinkHref, type LinkifyPart } from "$lib/shell/linkify.js";
export { portal } from "$lib/actions/portal.js";
export { overflowFade } from "$lib/actions/overflowFade.js";

// Feedback & chrome
export { default as ToastStack } from "$lib/components/organisms/ToastStack.svelte";
export { default as StatusBar } from "$lib/components/organisms/StatusBar.svelte";
export { default as Tabs } from "$lib/components/molecules/Tabs.svelte";
export { default as Menu } from "$lib/components/molecules/Menu.svelte";
export { default as Tooltip } from "$lib/components/atoms/Tooltip.svelte";
export { default as ScrollArea } from "$lib/components/atoms/ScrollArea.svelte";
export { toasts, notify, type Toast, type ToastInput, type ToastTone, type ToastAction } from "$lib/shell/toasts.svelte.js";

// Forms & data
export { default as Checkbox } from "$lib/components/atoms/Checkbox.svelte";
export { default as Switch } from "$lib/components/atoms/Switch.svelte";
export { default as Radio } from "$lib/components/atoms/Radio.svelte";
export { default as RadioGroup } from "$lib/components/molecules/RadioGroup.svelte";
export { default as Textarea } from "$lib/components/atoms/Textarea.svelte";
export { default as Select } from "$lib/components/molecules/Select.svelte";
export { default as Table } from "$lib/components/molecules/Table.svelte";
export { default as Progress } from "$lib/components/atoms/Progress.svelte";
export { default as Skeleton } from "$lib/components/atoms/Skeleton.svelte";
export { default as EmptyState } from "$lib/components/molecules/EmptyState.svelte";

// Work log
export { default as WorklogTile } from "$lib/components/tiles/WorklogTile.svelte";
export { worklog, clock } from "$lib/worklog/store.svelte.js";
export * from "$lib/worklog/types.js";
export { worklogKind, WORKLOG_CONTENT_ID } from "$lib/worklog/kind.js";
export { worklogCommands } from "$lib/worklog/commands.js";
export { registerDocumentExtras } from "$lib/worklog/index.js";

// Navigation & overlays
export { default as Avatar } from "$lib/components/atoms/Avatar.svelte";
export { default as Breadcrumb } from "$lib/components/molecules/Breadcrumb.svelte";
export { default as DatePicker } from "$lib/components/molecules/DatePicker.svelte";
export { default as Drawer } from "$lib/components/organisms/Drawer.svelte";

// Projects
export { default as ProjectTile } from "$lib/components/tiles/ProjectTile.svelte";
export { default as ProjectCard } from "$lib/components/molecules/ProjectCard.svelte";
export { projects } from "$lib/project/store.svelte.js";
export * from "$lib/project/types.js";
export { projectFields } from "$lib/project/views.js";
export { projectKind } from "$lib/project/kind.js";
export { projectCommands } from "$lib/project/commands.js";
export { registerDocumentExtras as registerProjectDocumentExtras } from "$lib/project/index.js";

// Settings (registry + tile + the shipped Appearance section) and the dumb pickers
export { default as SettingsTile } from "$lib/components/tiles/SettingsTile.svelte";
export { settings, settingsKind, settingsCommands, SETTINGS_CONTENT_ID, type SettingsSection } from "$lib/settings/index.js";
export { default as AppearanceSection } from "$lib/settings/AppearanceSection.svelte";
export { default as ThemePicker } from "$lib/components/molecules/ThemePicker.svelte";
export { default as WallpaperPicker } from "$lib/components/molecules/WallpaperPicker.svelte";
export { default as LookPicker } from "$lib/components/molecules/LookPicker.svelte";
// Markdown
export { default as Markdown } from "$lib/components/molecules/Markdown.svelte";
export { parseMarkdown } from "$lib/markdown/parse.js";
export { splitRefs, isRunnableFence, type TextPart, type RefPart } from "$lib/markdown/refs.js";
// Stylesheets are imported separately by the consumer, in this order:
//   $lib/styles/fonts.css               Illinois Mono @font-face (Lexend comes from Google Fonts)
//   $lib/styles/tokens/base.css
//   $lib/styles/tokens/semantic.css
//   $lib/styles/tokens/components.css
//   $lib/styles/utilities/glass.css
//   $lib/styles/utilities/motion.css
//   $lib/styles/themes/<theme>.css      one or more of beast-dark, garden-light, hypr-dark, hypr-light, tokyo-glass
