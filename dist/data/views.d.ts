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
import type { Customer, Document } from "./types.js";
export { fieldsAt, parseLevel, viewFrom, type FieldDef, type Level, } from "../tiling/views.js";
import { type FieldDef } from "../tiling/views.js";
export declare const customerFields: FieldDef<Customer>[];
export declare const documentFields: FieldDef<Document>[];
