/**
 * The `settings` tile kind.
 *
 * Like `worklogKind`, this is a singleton: one virtual content id,
 * `"settings:main"`. It always exists — there's nothing to prune.
 */
import SettingsTile from "../components/tiles/SettingsTile.svelte";
export const SETTINGS_CONTENT_ID = "settings:main";
export const settingsKind = {
    kind: "settings",
    size: { w: 4, h: 3 },
    label: () => "Settings",
    exists: () => true,
    component: SettingsTile,
};
