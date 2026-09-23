/**
 * Formatting and derived values for domain records.
 */
import type { Customer, Document, DocumentItem } from "./types.js";
/** `160000` → `1'600.00` (Swiss grouping). Pass `currency` to prefix it. */
export declare function formatMoney(minor: number, currency?: string): string;
/** `810` bp → `8.1%` */
export declare function formatBp(bp: number): string;
/** ISO date/datetime → `01.09.2026` */
export declare function formatDate(iso: string | null | undefined): string;
export declare function customerName(c: Pick<Customer, "firstName" | "lastName">): string;
/** `Washingtonstrasse 34, 9400 Rorschach` */
export declare function customerAddress(c: Pick<Customer, "street" | "zip" | "city">): string;
/** Split `"John Doe"` into first/last at the last space; single word → last name. */
export declare function splitName(full: string): {
    firstName: string;
    lastName: string;
};
export declare function itemTotal(item: DocumentItem): number;
export type DocumentTotals = {
    /** Sum of non-optional items before discount. */
    net: number;
    discount: number;
    /** net − discount */
    subtotal: number;
    tax: number;
    gross: number;
    /** Sum of optional items, shown separately and never in `gross`. */
    optional: number;
};
export declare function documentTotals(doc: Document): DocumentTotals;
/**
 * Display labels for items: required items are numbered `1…n`, optional
 * items lettered `a…z`, each in document order. Used by the card, the
 * terminal listing, and `item <ref>` targeting, so they always agree.
 */
export declare function itemLabels(items: readonly DocumentItem[]): string[];
/** Resolve `3`, `b` or `last` to an absolute 1-based index into `items`, or null. */
export declare function resolveItemRef(items: readonly DocumentItem[], ref: string): number | null;
