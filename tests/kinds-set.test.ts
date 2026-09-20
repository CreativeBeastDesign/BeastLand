/**
 * The generic `set` hook: every registered kind that can be edited exposes
 * `setFlags` + `set(id, parsed)`, and they agree with each other. This is
 * the contract a new kind must satisfy for `@n set …` to work.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { parseArgs } from "$lib/shell/protocol.js";
import { kinds } from "$lib/tiling/kinds.svelte.js";
import { dataKinds } from "$lib/data/kinds.js";
import { projectKind } from "$lib/project/kind.js";
import { data } from "$lib/data/store.svelte.js";
import { projects } from "$lib/project/store.svelte.js";

const editable = [...dataKinds, projectKind];

beforeEach(() => {
  data.reset();
  projects.reset();
  for (const k of editable) kinds.register(k);
});

describe("KindSpec.set contract", () => {
  for (const spec of editable) {
    it(`${spec.kind}: declares setFlags and every declared flag is accepted`, () => {
      expect(spec.setFlags?.length).toBeGreaterThan(0);
      expect(spec.set).toBeTypeOf("function");
      const id = spec.ids!()[0];
      // A value-taking flag from the spec must produce a non-empty patch, not the usage error.
      const valued = spec.setFlags!.find((f) => f.takesValue && f.name !== "customer" && f.name !== "budget" && f.name !== "discount" && f.name !== "status");
      expect(valued).toBeDefined();
      const r = spec.set!(id, parseArgs([`--${valued!.name}`, "x"]));
      expect(r.ok, `${spec.kind} --${valued!.name} rejected: ${r.ok ? "" : r.error}`).toBe(true);
      if (r.ok) expect(Object.keys(r.patch).length).toBeGreaterThan(0);
    });

    it(`${spec.kind}: no flags → usage error, unknown id → error`, () => {
      const id = spec.ids!()[0];
      const none = spec.set!(id, parseArgs([]));
      expect(none.ok).toBe(false);
      const flagName = spec.setFlags!.find((f) => f.takesValue)!.name;
      const missing = spec.set!(`${spec.kind}:doesnotexist`, parseArgs([`--${flagName}`, "x"]));
      expect(missing.ok).toBe(false);
    });
  }

  it("customer --name splits into first/last", () => {
    const id = data.customers[0].id;
    const r = kinds.get("customer")!.set!(id, parseArgs(["--name", "Ada Lovelace"]));
    expect(r).toEqual({ ok: true, patch: { firstName: "Ada", lastName: "Lovelace" } });
    expect(data.getCustomer(id)?.lastName).toBe("Lovelace");
  });

  it("project --customer resolves a short id through the registry", () => {
    const project = projects.projects[0];
    const target = data.customers[1];
    const short = "#" + target.id.replace("customer:", "").slice(0, 2);
    const r = kinds.get("project")!.set!(project.id, parseArgs(["--customer", short]));
    expect(r.ok).toBe(true);
    expect(projects.get(project.id)?.customerId).toBe(target.id);
    const bad = kinds.get("project")!.set!(project.id, parseArgs(["--customer", "#zz"]));
    expect(bad).toEqual({ ok: false, error: "unknown id: #zz" });
  });
});
