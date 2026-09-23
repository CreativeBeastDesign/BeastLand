/**
 * Views — which fields of a `Project` are shown at which level of detail.
 * See `$lib/data/views.ts` for the level semantics (`list` ⊂ `details` ⊂ `full`).
 */
import { data } from "../data/store.svelte.js";
import { customerName, formatDate, formatMoney } from "../data/format.js";
import { formatDuration } from "../worklog/types.js";
import { projectStatusLabels } from "./types.js";
import { projects } from "./store.svelte.js";
const dash = (v) => (v ? v : "—");
export const projectFields = [
    { key: "name", label: "Name", level: "list", get: (p) => dash(p.name) },
    {
        key: "customer",
        label: "Customer",
        level: "details",
        get: (p) => {
            if (!p.customerId)
                return "—";
            const c = data.getCustomer(p.customerId);
            return c ? dash(customerName(c)) : "—";
        },
    },
    { key: "status", label: "Status", level: "details", get: (p) => projectStatusLabels[p.status] },
    { key: "start", label: "Start", level: "details", get: (p) => formatDate(p.startDate) },
    { key: "end", label: "End", level: "details", get: (p) => formatDate(p.endDate) },
    {
        key: "budget",
        label: "Budget",
        level: "details",
        get: (p) => (p.budgetMinor === null ? "—" : formatMoney(p.budgetMinor, "CHF")),
    },
    { key: "logged", label: "Logged", level: "details", get: (p) => formatDuration(projects.minutesOf(p.id)) },
    { key: "quoted", label: "Quoted", level: "details", get: (p) => formatMoney(projects.quotedOf(p.id), "CHF") },
    {
        key: "invoiced",
        label: "Invoiced",
        level: "details",
        get: (p) => formatMoney(projects.invoicedOf(p.id), "CHF"),
    },
    { key: "description", label: "Description", level: "full", get: (p) => dash(p.description) },
    { key: "created", label: "Created", level: "full", get: (p) => formatDate(p.createdAt) },
    { key: "updated", label: "Updated", level: "full", get: (p) => formatDate(p.updatedAt) },
    { key: "id", label: "Id", level: "full", get: (p) => p.id },
];
