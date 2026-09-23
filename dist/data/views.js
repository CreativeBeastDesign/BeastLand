/**
 * Views — which fields of a record are shown at which level of detail.
 *
 *   list     the single line a `<type> list` prints: the name / title
 *   details  what `<type> #id --details` prints: the handful you need day to day
 *   full     `--full`: everything editable plus timestamps and the raw id
 *
 * Levels nest: `details` includes `list`, `full` includes `details`.
 * Cards in the tiling workspace define their own layouts (they split
 * first/last name by width); the terminal reads from here. The level and
 * `FieldDef` types themselves live in `$lib/tiling/views.ts` (generic).
 */
import { docTypeLabels } from "./types.js";
import { customerAddress, customerName, documentTotals, formatBp, formatDate, formatMoney, } from "./format.js";
export { fieldsAt, parseLevel, viewFrom, } from "../tiling/views.js";
import { fieldsAt } from "../tiling/views.js";
const dash = (v) => (v ? v : "—");
export const customerFields = [
    { key: "name", label: "Name", level: "list", get: (c) => dash(customerName(c)) },
    { key: "company", label: "Company", level: "details", get: (c) => dash(c.company) },
    { key: "email", label: "Email", level: "details", get: (c) => dash(c.email) },
    { key: "city", label: "City", level: "details", get: (c) => dash([c.zip, c.city].filter(Boolean).join(" ")) },
    { key: "salutation", label: "Salutation", level: "full", get: (c) => dash(c.salutation) },
    { key: "address", label: "Address", level: "full", get: (c) => dash(customerAddress(c)) },
    { key: "country", label: "Country", level: "full", get: (c) => dash(c.country) },
    { key: "created", label: "Created", level: "full", get: (c) => formatDate(c.createdAt) },
    { key: "updated", label: "Updated", level: "full", get: (c) => formatDate(c.updatedAt) },
    { key: "id", label: "Id", level: "full", get: (c) => c.id },
];
export const documentFields = [
    { key: "title", label: "Title", level: "list", get: (d) => dash(d.title) },
    { key: "number", label: "Number", level: "details", get: (d) => d.number ?? "draft" },
    { key: "type", label: "Type", level: "details", get: (d) => docTypeLabels[d.docType] },
    { key: "status", label: "Status", level: "details", get: (d) => d.status },
    {
        key: "customer",
        label: "Customer",
        level: "details",
        get: (d) => d.customer.company
            ? `${d.customer.displayName} (${d.customer.company})`
            : dash(d.customer.displayName),
    },
    { key: "date", label: "Date", level: "details", get: (d) => formatDate(d.documentDate) },
    {
        key: "total",
        label: "Total",
        level: "details",
        get: (d) => formatMoney(documentTotals(d).gross, d.currency),
    },
    { key: "items", label: "Items", level: "details", get: (d) => String(d.items.length) },
    { key: "valid-until", label: "Valid until", level: "full", get: (d) => formatDate(d.validUntil) },
    { key: "discount", label: "Discount", level: "full", get: (d) => formatBp(d.discountBp) },
    {
        key: "optional",
        label: "Optional",
        level: "full",
        get: (d) => formatMoney(documentTotals(d).optional, d.currency),
    },
    { key: "author", label: "Author", level: "full", get: (d) => dash(d.authorId) },
    { key: "version", label: "Version", level: "full", get: (d) => String(d.version) },
    { key: "created", label: "Created", level: "full", get: (d) => formatDate(d.createdAt) },
    { key: "updated", label: "Updated", level: "full", get: (d) => formatDate(d.updatedAt) },
    {
        key: "cover",
        label: "Cover letter",
        level: "full",
        get: (d) => dash(d.coverLetter.split(/\n\s*\n/)[0]),
    },
    { key: "id", label: "Id", level: "full", get: (d) => d.id },
];
