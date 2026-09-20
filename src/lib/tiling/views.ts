/**
 * Views — which fields of a record are shown at which level of detail.
 *
 *   list     the single line a `<type> list` prints: the name / title
 *   details  what `<type> #id --details` prints: the handful you need day to day
 *   full     `--full`: everything editable plus timestamps and the raw id
 *
 * Levels nest: `details` includes `list`, `full` includes `details`. This is
 * the generic half; each slice declares its own `FieldDef<T>[]` (see
 * `$lib/data/views.ts`) and hands `viewFrom(defs, lookup)` to its `KindSpec`
 * so `#id -d` / `-f` and `ls` can print any registered kind.
 */

export type Level = "list" | "details" | "full";

export type FieldDef<T> = {
  /** Terminal / flag name, e.g. `email`. */
  key: string;
  /** Human label, e.g. `Email`. */
  label: string;
  level: Level;
  get: (record: T) => string;
};

/** One `Label  value` line of a printed record. */
export type ViewRow = { label: string; value: string };

/** Rows for a record at `level`, or null when the record does not exist. */
export type ViewFn = (contentId: string, level: Level) => ViewRow[] | null;

const LEVEL_RANK: Record<Level, number> = { list: 0, details: 1, full: 2 };

export function parseLevel(input: string | undefined): Level | null {
  if (input === "list" || input === "details" || input === "full") return input;
  return null;
}

/** Every field whose level is at or below `level`. */
export function fieldsAt<T>(defs: FieldDef<T>[], level: Level): FieldDef<T>[] {
  return defs.filter((f) => LEVEL_RANK[f.level] <= LEVEL_RANK[level]);
}

/** Build a `KindSpec.view` from field definitions and a lookup by id. */
export function viewFrom<T>(defs: FieldDef<T>[], lookup: (id: string) => T | undefined): ViewFn {
  return (id, level) => {
    const record = lookup(id);
    if (!record) return null;
    return fieldsAt(defs, level).map((f) => ({ label: f.label, value: f.get(record) }));
  };
}
