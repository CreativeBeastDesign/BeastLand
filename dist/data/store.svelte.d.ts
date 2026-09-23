/**
 * Data store
 *
 * In-memory customer/document records, seeded from `$lib/data/seed.js` and
 * persisted through `$lib/shell/storage.ts` so a reload keeps whatever the
 * terminal created.
 * Implements the `DataStore` contract in `$lib/tiling/types.ts`.
 */
import type { DataStore } from "../tiling/types.js";
export declare const data: DataStore;
