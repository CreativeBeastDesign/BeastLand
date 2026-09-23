/**
 * Field flags for customers and documents — shared by `customer new`,
 * `docs new`, and the kinds' `set` hooks so the grammar exists once.
 */
import { type FlagSpec, type ParsedArgs } from "../shell/protocol.js";
import type { CustomerFields, DocumentFields } from "./types.js";
export declare const customerFieldFlags: FlagSpec[];
export declare function customerFieldsFromFlags(parsed: ParsedArgs): Partial<CustomerFields>;
export declare const documentFieldFlags: FlagSpec[];
export declare function documentFieldsFromFlags(parsed: ParsedArgs): Partial<DocumentFields>;
