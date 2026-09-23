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
const LEVEL_RANK = { list: 0, details: 1, full: 2 };
export function parseLevel(input) {
    if (input === "list" || input === "details" || input === "full")
        return input;
    return null;
}
/** Every field whose level is at or below `level`. */
export function fieldsAt(defs, level) {
    return defs.filter((f) => LEVEL_RANK[f.level] <= LEVEL_RANK[level]);
}
/** Build a `KindSpec.view` from field definitions and a lookup by id. */
export function viewFrom(defs, lookup) {
    return (id, level) => {
        const record = lookup(id);
        if (!record)
            return null;
        return fieldsAt(defs, level).map((f) => ({ label: f.label, value: f.get(record) }));
    };
}
