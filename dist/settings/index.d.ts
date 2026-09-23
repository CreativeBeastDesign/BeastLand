/**
 * Settings slice — public surface + the library's own default section.
 *
 * "Appearance" (look/theme/wallpaper pickers) is the one section the
 * library ships, so it self-registers here rather than waiting for a route
 * to opt in — the same way the five shipped themes register themselves in
 * `theme/themes.svelte.ts`. Importing anything from this module (which the
 * package root does) registers it once, at module load.
 *
 * An app adds its own section the explicit way, kept alive only while
 * mounted — the pattern every other slice (kinds, commands) already uses:
 *
 *   $effect(() => settings.register({
 *     id: "billing",
 *     label: "Billing",
 *     component: BillingSection,
 *   }));
 */
export { settings, type SettingsSection } from "./registry.svelte.js";
export { settingsKind, SETTINGS_CONTENT_ID } from "./kind.js";
export { settingsCommands } from "./commands.js";
export { default as AppearanceSection } from "./AppearanceSection.svelte";
