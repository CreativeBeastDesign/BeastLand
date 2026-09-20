/**
 * Project store: seed integrity, document/hour roll-ups, create/remove
 * round-trip. Runs against the real rune stores (compiled by the Svelte
 * plugin), the same way `workspace.test.ts` exercises the workspace store.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { projects } from "$lib/project/store.svelte.js";
import { data } from "$lib/data/store.svelte.js";
import { worklog } from "$lib/worklog/store.svelte.js";

beforeEach(() => {
  projects.reset();
  data.reset();
  worklog.reset();
});

describe("seed integrity", () => {
  it("seeds exactly two projects", () => {
    expect(projects.projects).toHaveLength(2);
  });

  it("both seeded documents link to an existing project", () => {
    expect(data.documents.length).toBeGreaterThan(0);
    for (const doc of data.documents) {
      expect(doc.projectId).not.toBeNull();
      expect(projects.get(doc.projectId!)).toBeDefined();
    }
  });

  it("the quotation links to Recommendation Engine, the order confirmation to Corporate Design", () => {
    const reco = projects.projects.find((p) => p.name === "Recommendation Engine");
    const corp = projects.projects.find((p) => p.name === "Corporate Design");
    expect(reco).toBeDefined();
    expect(corp).toBeDefined();

    const quotation = data.documents.find((d) => d.docType === "offer");
    const confirmation = data.documents.find((d) => d.docType === "order_confirmation");
    expect(quotation?.projectId).toBe(reco!.id);
    expect(confirmation?.projectId).toBe(corp!.id);
  });
});

describe("documentsOf", () => {
  it("returns the documents linked to a project", () => {
    const reco = projects.projects.find((p) => p.name === "Recommendation Engine")!;
    const docs = projects.documentsOf(reco.id);
    expect(docs.length).toBeGreaterThan(0);
    for (const doc of docs) expect(doc.projectId).toBe(reco.id);
  });

  it("returns an empty array for a project with no linked documents", () => {
    const p = projects.create({ name: "Empty" });
    expect(projects.documentsOf(p.id)).toEqual([]);
  });
});

describe("minutesOf", () => {
  it("counts entries linked directly to the project", () => {
    const project = projects.create({ name: "Direct" });
    worklog.add({
      projectId: project.id,
      note: "direct",
      startedAt: "2026-09-01T09:00:00.000Z",
      stoppedAt: "2026-09-01T09:30:00.000Z",
    });
    expect(projects.minutesOf(project.id)).toBe(30);
  });

  it("counts entries linked via a document's projectId", () => {
    const project = projects.create({ name: "Via doc" });
    const doc = data.createDocument("offer", { projectId: project.id });
    worklog.add({
      documentId: doc.id,
      note: "via doc",
      startedAt: "2026-09-01T09:00:00.000Z",
      stoppedAt: "2026-09-01T10:00:00.000Z",
    });
    expect(projects.minutesOf(project.id)).toBe(60);
  });

  it("sums both direct and document-linked entries", () => {
    const project = projects.create({ name: "Both" });
    const doc = data.createDocument("offer", { projectId: project.id });
    worklog.add({
      documentId: doc.id,
      note: "a",
      startedAt: "2026-09-01T09:00:00.000Z",
      stoppedAt: "2026-09-01T09:15:00.000Z",
    });
    worklog.add({
      projectId: project.id,
      note: "b",
      startedAt: "2026-09-01T10:00:00.000Z",
      stoppedAt: "2026-09-01T10:15:00.000Z",
    });
    expect(projects.minutesOf(project.id)).toBe(30);
  });

  it("does not count entries attributed to a different project", () => {
    const a = projects.create({ name: "A" });
    const b = projects.create({ name: "B" });
    worklog.add({
      projectId: a.id,
      note: "a",
      startedAt: "2026-09-01T09:00:00.000Z",
      stoppedAt: "2026-09-01T09:30:00.000Z",
    });
    expect(projects.minutesOf(b.id)).toBe(0);
  });
});

describe("create / update / remove", () => {
  it("creates a project with defaults filled in", () => {
    const p = projects.create({ name: "New project" });
    expect(p.name).toBe("New project");
    expect(p.status).toBe("planned");
    expect(p.customerId).toBeNull();
    expect(projects.get(p.id)).toEqual(p);
  });

  it("updates a project", () => {
    const p = projects.create({ name: "Old" });
    const updated = projects.update(p.id, { name: "New", status: "active" });
    expect(updated?.name).toBe("New");
    expect(updated?.status).toBe("active");
  });

  it("removes a project (round trip)", () => {
    const before = projects.projects.length;
    const p = projects.create({ name: "Temp" });
    expect(projects.projects).toHaveLength(before + 1);

    const ok = projects.remove(p.id);
    expect(ok).toBe(true);
    expect(projects.get(p.id)).toBeUndefined();
    expect(projects.projects).toHaveLength(before);
  });

  it("remove returns false for an unknown id", () => {
    expect(projects.remove("project:doesnotexist000000")).toBe(false);
  });
});
