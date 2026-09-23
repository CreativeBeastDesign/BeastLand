/**
 * Project store
 *
 * In-memory `Project` list, persisted through storage (`beastland:projects`)
 * the same way `$lib/data/store.svelte.ts` and `$lib/worklog/store.svelte.ts`
 * persist their records. Depends on the data and worklog stores (to roll up
 * linked documents and hours) — never the other way around.
 */
import type { Project, ProjectFields } from "./types.js";
import type { Document } from "../data/types.js";
export declare const projects: {
    readonly projects: readonly Project[];
    get: (id: string) => Project | undefined;
    documentsOf: (id: string) => Document[];
    minutesOf: (id: string) => number;
    quotedOf: (id: string) => number;
    invoicedOf: (id: string) => number;
    create: (fields?: Partial<ProjectFields>) => Project;
    update: (id: string, patch: Partial<ProjectFields>) => Project | undefined;
    remove: (id: string) => boolean;
    reset: () => void;
};
