/**
 * Settings registry
 *
 * A settings *section* is a tab in the Settings tile: an id, a label and a
 * component. Rune-backed like `tiling/kinds.svelte.ts` so the tile updates
 * the moment a slice registers its own section while mounted:
 *
 *   $effect(() => settings.register(myPrefsSection));
 *
 * The library ships one section, "Appearance", which registers itself the
 * same way the five shipped themes do (see `settings/index.ts`) — nothing
 * an app needs to wire up. `settings.active` is the selected tab, shared so
 * the `settings <section>` command can select one without owning a
 * reference to the mounted tile.
 */
import { type Component } from "svelte";
export type SettingsSection = {
    /** Identifier, e.g. `"appearance"`. Also the tab id. */
    id: string;
    /** Tab label. */
    label: string;
    /** Renders the section body; takes no props. */
    component: Component<Record<string, never>>;
    /** Sort order among sections, ascending; ties break by label. Default 0. */
    order?: number;
    description?: string;
};
export declare const settings: {
    /** Registered sections, sorted by `order` then `label`. */
    readonly all: SettingsSection[];
    get(id: string): SettingsSection | undefined;
    /** Register a section; call the returned function to remove it again. */
    register(section: SettingsSection): () => void;
    /** The selected tab's section id, or null when none are registered. */
    readonly active: string | null;
    /** Select a tab by section id. Returns false for an unknown id. */
    select(id: string): boolean;
};
