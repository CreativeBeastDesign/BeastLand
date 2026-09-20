/**
 * Field flags for customers and documents — shared by `customer new`,
 * `docs new`, and the kinds' `set` hooks so the grammar exists once.
 */

import { flag, type FlagSpec, type ParsedArgs } from "$lib/shell/protocol.js";
import type { CustomerFields, DocumentFields } from "./types.js";
import { splitName } from "./format.js";

export const customerFieldFlags: FlagSpec[] = [
  { name: "name", description: "Full name (split into first/last)", takesValue: true },
  { name: "firstname", short: "f", description: "First name", takesValue: true },
  { name: "lastname", short: "l", description: "Last name", takesValue: true },
  { name: "company", description: "Company", takesValue: true },
  { name: "email", description: "Email address", takesValue: true },
  { name: "street", description: "Street address", takesValue: true },
  { name: "zip", description: "Postal code", takesValue: true },
  { name: "city", description: "City", takesValue: true },
  { name: "country", description: "Country code", takesValue: true },
  { name: "salutation", description: "Salutation", takesValue: true },
];

export function customerFieldsFromFlags(parsed: ParsedArgs): Partial<CustomerFields> {
  const fields: Partial<CustomerFields> = {};
  const name = flag(parsed, "name");
  if (typeof name === "string") {
    const { firstName, lastName } = splitName(name);
    fields.firstName = firstName;
    fields.lastName = lastName;
  }
  const firstname = flag(parsed, "firstname", "f");
  if (typeof firstname === "string") fields.firstName = firstname;
  const lastname = flag(parsed, "lastname", "l");
  if (typeof lastname === "string") fields.lastName = lastname;
  for (const key of ["company", "email", "street", "zip", "city", "country", "salutation"] as const) {
    const v = flag(parsed, key);
    if (typeof v === "string") fields[key] = v;
  }
  return fields;
}

export const documentFieldFlags: FlagSpec[] = [
  { name: "title", description: "Document title", takesValue: true },
  {
    name: "status",
    description: "Document status",
    takesValue: true,
    values: ["draft", "sent", "accepted", "rejected", "paid"],
  },
  { name: "date", description: "Document date (ISO)", takesValue: true },
  { name: "valid-until", description: "Valid-until date (ISO)", takesValue: true },
  { name: "discount", description: "Discount, in basis points", takesValue: true },
];

export function documentFieldsFromFlags(parsed: ParsedArgs): Partial<DocumentFields> {
  const patch: Partial<DocumentFields> = {};
  const title = flag(parsed, "title");
  if (typeof title === "string") patch.title = title;
  const status = flag(parsed, "status");
  if (typeof status === "string") patch.status = status as DocumentFields["status"];
  const date = flag(parsed, "date");
  if (typeof date === "string") patch.documentDate = date;
  const validUntil = flag(parsed, "valid-until");
  if (typeof validUntil === "string") patch.validUntil = validUntil;
  const discount = flag(parsed, "discount");
  if (typeof discount === "string") patch.discountBp = parseInt(discount, 10);
  return patch;
}
