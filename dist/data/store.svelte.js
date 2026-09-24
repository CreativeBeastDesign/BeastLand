/**
 * Data store
 *
 * In-memory customer/document records, seeded from `$lib/data/seed.js` and
 * persisted through `$lib/shell/storage.ts` so a reload keeps whatever the
 * terminal created.
 * Implements the `DataStore` contract in `$lib/tiling/types.ts`.
 */
import { storage } from "../shell/storage.js";
import { seedCustomers, seedDocuments } from "./seed.js";
import { resolveId } from "../tiling/ids.js";
const STORAGE_KEY = "beastland:data";
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
function readPersisted() {
    try {
        const raw = storage.get(STORAGE_KEY);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.customers) || !Array.isArray(parsed.documents))
            return null;
        return { customers: parsed.customers, documents: parsed.documents };
    }
    catch {
        return null;
    }
}
function todayIso() {
    return new Date().toISOString().slice(0, 10);
}
const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
function randomAlnum(len) {
    let out = "";
    for (let i = 0; i < len; i++) {
        out += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
    }
    return out;
}
function newCustomerId() {
    return `customer:${randomAlnum(20)}`;
}
function newDocumentId() {
    return `document:doc_${crypto.randomUUID()}`;
}
function emptyCustomerFields() {
    return {
        salutation: "",
        firstName: "",
        lastName: "",
        company: "",
        email: "",
        street: "",
        zip: "",
        city: "",
        country: "CH",
    };
}
function createData() {
    let customers = $state([]);
    let documents = $state([]);
    /** (Re)read from storage; runs at import and whenever the adapter changes. */
    function hydrate() {
        const persisted = readPersisted();
        customers = persisted ? persisted.customers : clone(seedCustomers);
        documents = persisted ? persisted.documents : clone(seedDocuments);
    }
    hydrate();
    storage.register(STORAGE_KEY, hydrate);
    function persist() {
        try {
            storage.setJson(STORAGE_KEY, { customers, documents });
        }
        catch {
            /* storage may be unavailable; the in-memory state still works */
        }
    }
    function getCustomer(id) {
        return customers.find((c) => c.id === id);
    }
    function getDocument(id) {
        return documents.find((d) => d.id === id);
    }
    function customerSnapshot(customer) {
        if (!customer) {
            return {
                displayName: "",
                salutation: "",
                company: "",
                email: "",
                street: "",
                zip: "",
                city: "",
                country: "",
            };
        }
        return {
            displayName: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
            salutation: customer.salutation,
            company: customer.company,
            email: customer.email,
            street: customer.street,
            zip: customer.zip,
            city: customer.city,
            country: customer.country,
        };
    }
    return {
        get customers() {
            return customers;
        },
        get documents() {
            return documents;
        },
        get allIds() {
            return [...customers.map((c) => c.id), ...documents.map((d) => d.id)];
        },
        getCustomer,
        getDocument,
        resolve(input) {
            const result = resolveId(input, this.allIds);
            if (!result)
                return null;
            if ("ambiguous" in result)
                return { ambiguous: result.ambiguous };
            const kind = result.id.startsWith("customer:") ? "customer" : "document";
            return { kind, id: result.id };
        },
        createCustomer(fields) {
            const now = new Date().toISOString();
            const customer = {
                id: newCustomerId(),
                ...emptyCustomerFields(),
                ...fields,
                createdAt: now,
                updatedAt: now,
            };
            customers = [...customers, customer];
            persist();
            return customer;
        },
        updateCustomer(id, patch) {
            const existing = getCustomer(id);
            if (!existing)
                return undefined;
            const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
            customers = customers.map((c) => (c.id === id ? updated : c));
            // Keep document snapshots referencing this customer untouched — they are
            // deliberately a point-in-time copy, not a live join.
            persist();
            return updated;
        },
        deleteCustomer(id) {
            const before = customers.length;
            customers = customers.filter((c) => c.id !== id);
            if (customers.length !== before) {
                persist();
                return true;
            }
            return false;
        },
        createDocument(docType, opts) {
            const now = new Date().toISOString();
            const customer = opts?.customerId ? getCustomer(opts.customerId) : undefined;
            const doc = {
                id: newDocumentId(),
                number: null,
                docType,
                status: "draft",
                title: opts?.title ?? "",
                authorId: "andre",
                currency: "CHF",
                customerId: (customer?.id ?? null),
                projectId: opts?.projectId ?? null,
                customer: customerSnapshot(customer),
                documentDate: todayIso(),
                validUntil: null,
                issuedAt: null,
                discountBp: 0,
                pricingMode: "fixed",
                items: [],
                coverLetter: "",
                salutationOverride: "",
                importantNotes: [],
                outOfScopeNotes: [],
                version: 1,
                createdAt: now,
                updatedAt: now,
            };
            documents = [...documents, doc];
            persist();
            return doc;
        },
        updateDocument(id, patch) {
            const existing = getDocument(id);
            if (!existing)
                return undefined;
            const updated = {
                ...existing,
                ...patch,
                version: existing.version + 1,
                updatedAt: new Date().toISOString(),
            };
            documents = documents.map((d) => (d.id === id ? updated : d));
            persist();
            return updated;
        },
        deleteDocument(id) {
            const before = documents.length;
            documents = documents.filter((d) => d.id !== id);
            if (documents.length !== before) {
                persist();
                return true;
            }
            return false;
        },
        addItem(docId, fields) {
            const doc = getDocument(docId);
            if (!doc)
                return undefined;
            const item = {
                id: crypto.randomUUID(),
                title: "New item",
                description: "",
                quantity: 1,
                unit: "flat",
                unitPriceMinor: 0,
                taxRateBp: 810,
                isOptional: false,
                catalogItemId: null,
                ...fields,
            };
            const updated = {
                ...doc,
                items: [...doc.items, item],
                version: doc.version + 1,
                updatedAt: new Date().toISOString(),
            };
            documents = documents.map((d) => (d.id === docId ? updated : d));
            persist();
            return item;
        },
        updateItem(docId, index, patch) {
            const doc = getDocument(docId);
            if (!doc)
                return undefined;
            const i = index === "last" ? doc.items.length - 1 : index - 1;
            if (i < 0 || i >= doc.items.length)
                return undefined;
            const updatedItem = { ...doc.items[i], ...patch };
            const items = doc.items.map((it, idx) => (idx === i ? updatedItem : it));
            const updated = {
                ...doc,
                items,
                version: doc.version + 1,
                updatedAt: new Date().toISOString(),
            };
            documents = documents.map((d) => (d.id === docId ? updated : d));
            persist();
            return updatedItem;
        },
        removeItem(docId, index) {
            const doc = getDocument(docId);
            if (!doc)
                return false;
            const i = index === "last" ? doc.items.length - 1 : index - 1;
            if (i < 0 || i >= doc.items.length)
                return false;
            const items = doc.items.filter((_, idx) => idx !== i);
            const updated = {
                ...doc,
                items,
                version: doc.version + 1,
                updatedAt: new Date().toISOString(),
            };
            documents = documents.map((d) => (d.id === docId ? updated : d));
            persist();
            return true;
        },
        reset() {
            customers = clone(seedCustomers);
            documents = clone(seedDocuments);
            storage.remove(STORAGE_KEY);
        },
    };
}
export const data = createData();
