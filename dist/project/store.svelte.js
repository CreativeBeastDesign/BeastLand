/**
 * Project store
 *
 * In-memory `Project` list, persisted through storage (`beastland:projects`)
 * the same way `$lib/data/store.svelte.ts` and `$lib/worklog/store.svelte.ts`
 * persist their records. Depends on the data and worklog stores (to roll up
 * linked documents and hours) — never the other way around.
 */
import { storage } from "../shell/storage.js";
import { SEED_PROJECT_CORP, SEED_PROJECT_RECO } from "./ids.js";
import { data } from "../data/store.svelte.js";
import { worklog } from "../worklog/store.svelte.js";
import { entryMinutes } from "../worklog/types.js";
import { documentTotals } from "../data/format.js";
const STORAGE_KEY = "beastland:projects";
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
function readPersisted() {
    try {
        const raw = storage.get(STORAGE_KEY);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.projects))
            return null;
        return { projects: parsed.projects };
    }
    catch {
        return null;
    }
}
const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
function randomAlnum(len) {
    let out = "";
    for (let i = 0; i < len; i++) {
        out += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
    }
    return out;
}
function newProjectId() {
    return `project:${randomAlnum(20)}`;
}
// Seeded customers (see `$lib/data/seed.ts`) these projects belong to.
const SEED_CUSTOMER_ENGIN = "customer:xpoakahew4rsp2stfg0y";
const SEED_CUSTOMER_ROB = "customer:xq7lm2ndk9vbf3wh1t8e";
function seedProjects() {
    return [
        {
            id: SEED_PROJECT_RECO,
            name: "Recommendation Engine",
            customerId: SEED_CUSTOMER_ENGIN,
            status: "active",
            startDate: "2026-09-01",
            endDate: null,
            budgetMinor: 2000000, // CHF 20'000
            description: "Telemetry and observability for the recommendation engine.",
            createdAt: "2026-08-30T17:37:58.071Z",
            updatedAt: "2026-09-01T10:17:49.669Z",
        },
        {
            id: SEED_PROJECT_CORP,
            name: "Corporate Design",
            customerId: SEED_CUSTOMER_ROB,
            status: "active",
            startDate: "2026-09-08",
            endDate: null,
            budgetMinor: null,
            description: "Brand identity, website, and print collateral.",
            createdAt: "2026-09-08T15:48:44.084Z",
            updatedAt: "2026-09-09T07:51:13.164Z",
        },
    ];
}
function emptyProjectFields() {
    return {
        name: "",
        customerId: null,
        status: "planned",
        startDate: null,
        endDate: null,
        budgetMinor: null,
        description: "",
    };
}
function createProjects() {
    let projects = $state([]);
    function hydrate() {
        const persisted = readPersisted();
        projects = persisted ? persisted.projects : clone(seedProjects());
    }
    hydrate();
    storage.register(STORAGE_KEY, hydrate);
    function persist() {
        try {
            storage.setJson(STORAGE_KEY, { projects });
        }
        catch {
            /* storage may be unavailable; the in-memory state still works */
        }
    }
    function get(id) {
        return projects.find((p) => p.id === id);
    }
    function documentsOf(id) {
        return data.documents.filter((d) => d.projectId === id);
    }
    /** Minutes logged against this project directly, or via a linked document. */
    function minutesOf(id) {
        return worklog.entries
            .filter((e) => {
            if (e.projectId === id)
                return true;
            if (e.documentId) {
                const doc = data.getDocument(e.documentId);
                if (doc?.projectId === id)
                    return true;
            }
            return false;
        })
            .reduce((sum, e) => sum + entryMinutes(e), 0);
    }
    function totalsByType(id, docType) {
        return documentsOf(id)
            .filter((d) => d.docType === docType)
            .reduce((sum, d) => sum + documentTotals(d).gross, 0);
    }
    function quotedOf(id) {
        return totalsByType(id, "offer");
    }
    function invoicedOf(id) {
        return totalsByType(id, "invoice");
    }
    function create(fields) {
        const now = new Date().toISOString();
        const project = {
            id: newProjectId(),
            ...emptyProjectFields(),
            ...fields,
            createdAt: now,
            updatedAt: now,
        };
        projects = [...projects, project];
        persist();
        return project;
    }
    function update(id, patch) {
        const existing = get(id);
        if (!existing)
            return undefined;
        const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
        projects = projects.map((p) => (p.id === id ? updated : p));
        persist();
        return updated;
    }
    function remove(id) {
        const before = projects.length;
        projects = projects.filter((p) => p.id !== id);
        if (projects.length !== before) {
            persist();
            return true;
        }
        return false;
    }
    function reset() {
        projects = clone(seedProjects());
        storage.remove(STORAGE_KEY);
    }
    return {
        get projects() {
            return projects;
        },
        get,
        documentsOf,
        minutesOf,
        quotedOf,
        invoicedOf,
        create,
        update,
        remove,
        reset,
    };
}
export const projects = createProjects();
