// Atoms
export { default as Badge } from "./components/atoms/Badge.svelte";
export { default as Button } from "./components/atoms/Button.svelte";
export { default as Divider } from "./components/atoms/Divider.svelte";
export { default as IconButton } from "./components/atoms/IconButton.svelte";
export { default as Input } from "./components/atoms/Input.svelte";
export { default as Kbd } from "./components/atoms/Kbd.svelte";
export { default as Surface } from "./components/atoms/Surface.svelte";
export { default as Wallpaper } from "./components/atoms/Wallpaper.svelte";
// Molecules
export { default as NotificationItem } from "./components/molecules/NotificationItem.svelte";
export { default as SearchField } from "./components/molecules/SearchField.svelte";
export { default as StatusItem } from "./components/molecules/StatusItem.svelte";
export { default as WindowTitleBar } from "./components/molecules/WindowTitleBar.svelte";
export { default as WorkspaceSwitcher } from "./components/molecules/WorkspaceSwitcher.svelte";
// Organisms
export { default as Dock } from "./components/organisms/Dock.svelte";
export { default as Modal } from "./components/organisms/Modal.svelte";
export { default as SettingsPane } from "./components/organisms/SettingsPane.svelte";
export { default as Sidebar } from "./components/organisms/Sidebar.svelte";
export { default as Terminal } from "./components/organisms/Terminal.svelte";
export { default as TopBar } from "./components/organisms/TopBar.svelte";
export { default as Window } from "./components/organisms/Window.svelte";
// Templates
export { default as DashboardTemplate } from "./components/templates/DashboardTemplate.svelte";
export { default as DesktopShell } from "./components/templates/DesktopShell.svelte";
// Tiling workspace
export { default as ShortId } from "./components/atoms/ShortId.svelte";
export { default as RecordView } from "./components/molecules/RecordView.svelte";
export { default as CustomerCard } from "./components/molecules/CustomerCard.svelte";
export { default as DocumentCard } from "./components/molecules/DocumentCard.svelte";
export { default as Tile } from "./components/organisms/Tile.svelte";
export { default as TilingWorkspace } from "./components/organisms/TilingWorkspace.svelte";
export { default as EmptyRecord } from "./components/tiles/EmptyRecord.svelte";
export { MOD, MODIFIER, hasModifier } from "./shell/keys.js";
export * from "./tiling/types.js";
export * from "./tiling/ids.js";
export { workspace } from "./tiling/workspace.svelte.js";
export { kinds } from "./tiling/kinds.svelte.js";
export * from "./tiling/views.js";
export * from "./tiling/workspace-commands.js";
export * from "./data/kinds.js";
export { tilingCommands } from "./tiling/commands.js";
export * from "./data/types.js";
export * from "./data/format.js";
export { data } from "./data/store.svelte.js";
// Theme and utilities
export * from "./theme/index.js";
export * from "./wallpapers.js";
export { shell } from "./shell/state.svelte.js";
export * from "./shell/commands.js";
export * from "./shell/completion.js";
export { registry } from "./shell/registry.svelte.js";
export { storage, memoryStorage, webStorage, toAsync, } from "./shell/storage.js";
export { defaultKeymap, describeKeymap, resolveKey } from "./shell/keymap.js";
export { commandBridge, runBridge } from "./shell/bridge.js";
export { clearHistory, loadHistory, persistHistory, historyStorageKey, HISTORY_CAP } from "./shell/history.js";
export { proseSpans, commandLineSpans, isRunnableFenceInfo } from "./shell/prose.js";
export { linkify, isAllowedLinkHref } from "./shell/linkify.js";
export { undoStack, undoSpan, } from "./shell/undo.svelte.js";
export { portal } from "./actions/portal.js";
export { overflowFade } from "./actions/overflowFade.js";
// Feedback & chrome
export { default as ToastStack } from "./components/organisms/ToastStack.svelte";
export { default as StatusBar } from "./components/organisms/StatusBar.svelte";
export { default as Tabs } from "./components/molecules/Tabs.svelte";
export { default as Menu } from "./components/molecules/Menu.svelte";
export { default as Tooltip } from "./components/atoms/Tooltip.svelte";
export { default as ScrollArea } from "./components/atoms/ScrollArea.svelte";
export { toasts, notify } from "./shell/toasts.svelte.js";
// Forms & data
export { default as Checkbox } from "./components/atoms/Checkbox.svelte";
export { default as Switch } from "./components/atoms/Switch.svelte";
export { default as Radio } from "./components/atoms/Radio.svelte";
export { default as RadioGroup } from "./components/molecules/RadioGroup.svelte";
export { default as Textarea } from "./components/atoms/Textarea.svelte";
export { default as Select } from "./components/molecules/Select.svelte";
export { default as Table } from "./components/molecules/Table.svelte";
export { default as Progress } from "./components/atoms/Progress.svelte";
export { default as Skeleton } from "./components/atoms/Skeleton.svelte";
export { default as EmptyState } from "./components/molecules/EmptyState.svelte";
// Work log
export { default as WorklogTile } from "./components/tiles/WorklogTile.svelte";
export { worklog, clock } from "./worklog/store.svelte.js";
export * from "./worklog/types.js";
export { worklogKind, WORKLOG_CONTENT_ID } from "./worklog/kind.js";
export { worklogCommands } from "./worklog/commands.js";
export { registerDocumentExtras } from "./worklog/index.js";
// Navigation & overlays
export { default as Avatar } from "./components/atoms/Avatar.svelte";
export { default as Breadcrumb } from "./components/molecules/Breadcrumb.svelte";
export { default as DatePicker } from "./components/molecules/DatePicker.svelte";
export { default as Drawer } from "./components/organisms/Drawer.svelte";
// Projects
export { default as ProjectTile } from "./components/tiles/ProjectTile.svelte";
export { default as ProjectCard } from "./components/molecules/ProjectCard.svelte";
export { projects } from "./project/store.svelte.js";
export * from "./project/types.js";
export { projectFields } from "./project/views.js";
export { projectKind } from "./project/kind.js";
export { projectCommands } from "./project/commands.js";
export { registerDocumentExtras as registerProjectDocumentExtras } from "./project/index.js";
// Settings (registry + tile + the shipped Appearance section) and the dumb pickers
export { default as SettingsTile } from "./components/tiles/SettingsTile.svelte";
export { settings, settingsKind, settingsCommands, SETTINGS_CONTENT_ID } from "./settings/index.js";
export { default as AppearanceSection } from "./settings/AppearanceSection.svelte";
export { default as ThemePicker } from "./components/molecules/ThemePicker.svelte";
export { default as WallpaperPicker } from "./components/molecules/WallpaperPicker.svelte";
export { default as LookPicker } from "./components/molecules/LookPicker.svelte";
// Markdown
export { default as Markdown } from "./components/molecules/Markdown.svelte";
export { parseMarkdown } from "./markdown/parse.js";
export { splitRefs, isRunnableFence } from "./markdown/refs.js";
// Stylesheets are imported separately by the consumer, in this order:
//   $lib/styles/fonts.css               Illinois Mono @font-face (Lexend comes from Google Fonts)
//   $lib/styles/tokens/base.css
//   $lib/styles/tokens/semantic.css
//   $lib/styles/tokens/components.css
//   $lib/styles/utilities/glass.css
//   $lib/styles/utilities/motion.css
//   $lib/styles/themes/<theme>.css      one or more of beast-dark, garden-light, hypr-dark, hypr-light, tokyo-glass
