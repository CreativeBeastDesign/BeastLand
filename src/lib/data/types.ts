/**
 * Domain types
 *
 * Shapes mirror the backend records (SurrealDB-style ids such as
 * `customer:xpoakahew4rsp2stfg0y` and `document:doc_<uuid>`). Money is kept in
 * minor units (rappen/cents), rates in basis points.
 */

export type CustomerId = `customer:${string}`;
export type DocumentId = `document:${string}`;

export type Customer = {
  id: CustomerId;
  salutation: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  createdAt: string;
  updatedAt: string;
};

/** Editable customer fields, i.e. everything but ids and timestamps. */
export type CustomerFields = Omit<Customer, "id" | "createdAt" | "updatedAt">;

export type DocType = "offer" | "invoice" | "order_confirmation";
export type DocStatus = "draft" | "sent" | "accepted" | "rejected" | "paid";
export type ItemUnit = "flat" | "hour" | "day" | "piece";

export type DocumentItem = {
  id: string;
  title: string;
  description: string;
  quantity: number;
  unit: ItemUnit;
  unitPriceMinor: number;
  taxRateBp: number;
  isOptional: boolean;
  catalogItemId: string | null;
};

/** Snapshot of the customer as it was when the document was created. */
export type DocumentCustomer = {
  displayName: string;
  salutation: string;
  company: string;
  email: string;
  street: string;
  zip: string;
  city: string;
  country: string;
};

export type Document = {
  id: DocumentId;
  number: string | null;
  docType: DocType;
  status: DocStatus;
  title: string;
  authorId: string;
  currency: string;
  customerId: CustomerId | null;
  /** Full `project:…` id of the parent project, or `null` when unlinked. */
  projectId: string | null;
  customer: DocumentCustomer;
  documentDate: string;
  validUntil: string | null;
  issuedAt: string | null;
  discountBp: number;
  pricingMode: "fixed" | "hourly";
  items: DocumentItem[];
  coverLetter: string;
  salutationOverride: string;
  importantNotes: string[];
  outOfScopeNotes: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
};

/** Editable document header fields. */
export type DocumentFields = Pick<
  Document,
  | "title"
  | "status"
  | "documentDate"
  | "validUntil"
  | "discountBp"
  | "coverLetter"
  | "salutationOverride"
  | "projectId"
>;

/** Editable item fields. */
export type DocumentItemFields = Omit<DocumentItem, "id" | "catalogItemId">;

export const docTypeLabels: Record<DocType, string> = {
  offer: "Quotation",
  invoice: "Invoice",
  order_confirmation: "Order confirmation",
};

export const docTypePrefix: Record<DocType, string> = {
  offer: "QUO",
  invoice: "INV",
  order_confirmation: "OC",
};
