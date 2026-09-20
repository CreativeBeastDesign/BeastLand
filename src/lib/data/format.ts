/**
 * Formatting and derived values for domain records.
 */

import type { Customer, Document, DocumentItem } from "./types.js";

/** `160000` → `1'600.00` (Swiss grouping). Pass `currency` to prefix it. */
export function formatMoney(minor: number, currency?: string): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  const cents = (abs % 100).toString().padStart(2, "0");
  const amount = `${sign}${whole}.${cents}`;
  return currency ? `${currency} ${amount}` : amount;
}

/** `810` bp → `8.1%` */
export function formatBp(bp: number): string {
  const pct = bp / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}

/** ISO date/datetime → `01.09.2026` */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export function customerName(c: Pick<Customer, "firstName" | "lastName">): string {
  return [c.firstName, c.lastName].filter(Boolean).join(" ");
}

/** `Washingtonstrasse 34, 9400 Rorschach` */
export function customerAddress(c: Pick<Customer, "street" | "zip" | "city">): string {
  const line2 = [c.zip, c.city].filter(Boolean).join(" ");
  return [c.street, line2].filter(Boolean).join(", ");
}

/** Split `"John Doe"` into first/last at the last space; single word → last name. */
export function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: "", lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

export function itemTotal(item: DocumentItem): number {
  return Math.round(item.quantity * item.unitPriceMinor);
}

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

export function documentTotals(doc: Document): DocumentTotals {
  const required = doc.items.filter((i) => !i.isOptional);
  const net = required.reduce((sum, i) => sum + itemTotal(i), 0);
  const discount = Math.round((net * doc.discountBp) / 10000);
  const subtotal = net - discount;
  // Tax per item, applied after the proportional discount.
  const tax = required.reduce((sum, i) => {
    const share = net === 0 ? 0 : itemTotal(i) / net;
    const taxed = Math.round(itemTotal(i) - discount * share);
    return sum + Math.round((taxed * i.taxRateBp) / 10000);
  }, 0);
  const optional = doc.items.filter((i) => i.isOptional).reduce((s, i) => s + itemTotal(i), 0);
  return { net, discount, subtotal, tax, gross: subtotal + tax, optional };
}

/**
 * Display labels for items: required items are numbered `1…n`, optional
 * items lettered `a…z`, each in document order. Used by the card, the
 * terminal listing, and `item <ref>` targeting, so they always agree.
 */
export function itemLabels(items: readonly DocumentItem[]): string[] {
  let n = 0;
  let o = 0;
  return items.map((item) => (item.isOptional ? String.fromCharCode(97 + o++) : String(++n)));
}

/** Resolve `3`, `b` or `last` to an absolute 1-based index into `items`, or null. */
export function resolveItemRef(items: readonly DocumentItem[], ref: string): number | null {
  if (ref === "last") return items.length > 0 ? items.length : null;
  const i = itemLabels(items).indexOf(ref.toLowerCase());
  return i === -1 ? null : i + 1;
}
