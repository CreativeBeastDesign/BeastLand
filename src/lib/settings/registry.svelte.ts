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

import { untrack, type Component } from "svelte";

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

function createSettings() {
  let sections = $state<Record<string, SettingsSection>>({});
  let active = $state<string | null>(null);

  return {
    /** Registered sections, sorted by `order` then `label`. */
    get all(): SettingsSection[] {
      return Object.values(sections).sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label),
      );
    },

    get(id: string): SettingsSection | undefined {
      return sections[id];
    },

    /** Register a section; call the returned function to remove it again. */
    register(section: SettingsSection): () => void {
      untrack(() => {
        sections = { ...sections, [section.id]: section };
        if (active === null) active = section.id;
      });
      return () => {
        untrack(() => {
          if (sections[section.id] === section) {
            const next = { ...sections };
            delete next[section.id];
            sections = next;
            if (active === section.id) active = Object.keys(next)[0] ?? null;
          }
        });
      };
    },

    /** The selected tab's section id, or null when none are registered. */
    get active(): string | null {
      return active;
    },

    /** Select a tab by section id. Returns false for an unknown id. */
    select(id: string): boolean {
      if (!sections[id]) return false;
      active = id;
      return true;
    },
  };
}

export const settings = createSettings();
