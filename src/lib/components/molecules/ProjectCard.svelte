<!-- src/lib/components/molecules/ProjectCard.svelte -->

<script lang="ts">
  import type { Project } from "$lib/project/types.js";
  import { projectStatusLabels } from "$lib/project/types.js";
  import { projects } from "$lib/project/store.svelte.js";
  import { data } from "$lib/data/store.svelte.js";
  import type { Document } from "$lib/data/types.js";
  import { docTypeLabels } from "$lib/data/types.js";
  import { customerName, documentTotals, formatDate, formatMoney } from "$lib/data/format.js";
  import { worklog, clock } from "$lib/worklog/store.svelte.js";
  import { entryMinutes, formatDuration, dayKey, timeOfDay } from "$lib/worklog/types.js";
  import { kinds } from "$lib/tiling/kinds.svelte.js";
  import { shortId } from "$lib/tiling/ids.js";
  import { commandBridge, runBridge } from "$lib/shell/bridge.js";
  import RecordView, { type RecordField } from "./RecordView.svelte";
  import Table from "./Table.svelte";
  import Badge from "$lib/components/atoms/Badge.svelte";
  import EmptyState from "./EmptyState.svelte";

  type Props = {
    project: Project;
  };

  let { project }: Props = $props();

  const dash = (v: string | null | undefined) => (v ? v : "—");

  function shortRef(id: string): string {
    return `#${shortId(id, kinds.allIds).short}`;
  }

  let customer = $derived(project.customerId ? data.getCustomer(project.customerId) : undefined);

  let statusTone = $derived.by(() => {
    if (project.status === "active") return "success" as const;
    if (project.status === "done") return "info" as const;
    if (project.status === "on_hold") return "warning" as const;
    return "neutral" as const;
  });

  let loggedMinutes = $derived(projects.minutesOf(project.id));
  let quoted = $derived(projects.quotedOf(project.id));
  let invoiced = $derived(projects.invoicedOf(project.id));

  let headerFields = $derived.by((): RecordField[] => {
    const fields: (RecordField | null)[] = [
      { key: "Name", value: dash(project.name), prose: true },
      {
        key: "Customer",
        value: customer ? dash(customerName(customer)) : "—",
        prose: true,
        command: customer ? shortRef(customer.id) : undefined,
      },
      { key: "Start", value: formatDate(project.startDate) },
      { key: "End", value: formatDate(project.endDate) },
      { key: "Budget", value: project.budgetMinor === null ? "—" : formatMoney(project.budgetMinor, "CHF") },
      { key: "Logged", value: formatDuration(loggedMinutes) },
      { key: "Quoted", value: formatMoney(quoted, "CHF") },
      { key: "Invoiced", value: formatMoney(invoiced, "CHF") },
    ];
    return fields.filter((field): field is RecordField => field !== null);
  });

  // Documents ---------------------------------------------------------------

  type DocRow = {
    key: string;
    id: string;
    number: string;
    title: string;
    type: string;
    status: string;
    total: string;
  };

  let documents = $derived(projects.documentsOf(project.id));

  let docRows = $derived<DocRow[]>(
    documents.map((d: Document) => ({
      key: d.id,
      id: d.id,
      number: d.number ?? "draft",
      title: d.title || "untitled",
      type: docTypeLabels[d.docType],
      status: d.status,
      total: formatMoney(documentTotals(d).gross),
    })),
  );

  function openDocument(row: DocRow) {
    runBridge(shortRef(row.id));
  }

  // Hours ---------------------------------------------------------------------

  let projectEntryIds = $derived.by(() => {
    const ids = new Set<string>();
    for (const e of worklog.entries) {
      if (e.projectId === project.id) {
        ids.add(e.id);
        continue;
      }
      if (e.documentId) {
        const doc = data.getDocument(e.documentId);
        if (doc?.projectId === project.id) ids.add(e.id);
      }
    }
    return ids;
  });

  let projectEntries = $derived(worklog.entries.filter((e) => projectEntryIds.has(e.id)));

  let recentEntries = $derived(
    projectEntries
      .slice()
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, 5),
  );

  let weekMinutes = $derived.by(() => {
    const from = dayKey(new Date(clock.now - 6 * 86400000).toISOString());
    const today = dayKey(new Date(clock.now).toISOString());
    return projectEntries
      .filter((e) => {
        const k = dayKey(e.startedAt);
        return k >= from && k <= today;
      })
      .reduce((sum, e) => sum + entryMinutes(e, clock.now), 0);
  });
</script>

<div class="project-card">
  <div class="project-card__status-row">
    <span class="project-card__status-label">Status</span>
    <Badge tone={statusTone}>{projectStatusLabels[project.status]}</Badge>
  </div>

  <RecordView fields={headerFields} oncommand={commandBridge} />

  <section class="project-card__section">
    <h3 class="project-card__heading">Documents</h3>
    {#if docRows.length === 0}
      <EmptyState title="No documents" description="Link one with `link #doc`" compact />
    {:else}
      <div class="project-card__documents-slim">
        {#each docRows as row (row.key)}
          <button type="button" class="project-card__doc-row" onclick={() => openDocument(row)}>
            <span class="project-card__doc-number">{row.number}</span>
            <span class="project-card__doc-title">{row.title}</span>
            <span class="project-card__doc-meta">{row.type} · {row.status}</span>
            <span class="project-card__doc-total">{row.total}</span>
          </button>
        {/each}
      </div>
      <div class="project-card__documents-table">
        <Table
          columns={[
            { key: "number", label: "Number" },
            { key: "title", label: "Title" },
            { key: "type", label: "Type" },
            { key: "status", label: "Status" },
            { key: "total", label: "Total CHF", numeric: true },
          ]}
          rows={docRows}
          rowKey={(r) => r.key}
          onrowclick={openDocument}
        />
      </div>
    {/if}
  </section>

  <section class="project-card__section">
    <h3 class="project-card__heading">Hours</h3>
    <div class="project-card__hours-summary">
      <span>Total <strong>{formatDuration(loggedMinutes)}</strong></span>
      <span>This week <strong>{formatDuration(weekMinutes)}</strong></span>
    </div>
    {#if recentEntries.length === 0}
      <EmptyState title="No hours logged" compact />
    {:else}
      <ul class="project-card__entries">
        {#each recentEntries as entry (entry.id)}
          <li class="project-card__entry">
            <span class="project-card__entry-time">{timeOfDay(entry.startedAt)}</span>
            <span class="project-card__entry-note">{entry.note || "(no note)"}</span>
            <span class="project-card__entry-duration">{formatDuration(entryMinutes(entry, clock.now))}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  .project-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-text-med);
  }

  .project-card__status-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .project-card__status-label {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
  }

  .project-card__heading {
    margin: 0 0 var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
  }

  /* Documents ---------------------------------------------------------- */

  .project-card__documents-table {
    display: none;
  }

  .project-card__documents-slim {
    display: flex;
    flex-direction: column;
  }

  .project-card__doc-row {
    all: unset;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding: var(--space-1) 0;
    border-bottom: 1px solid var(--color-border-subtle);
    cursor: pointer;
  }

  .project-card__doc-row:last-child {
    border-bottom: none;
  }

  .project-card__doc-row:hover,
  .project-card__doc-row:focus-visible {
    color: var(--color-text-high);
  }

  .project-card__doc-number {
    color: var(--color-text-low);
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
  }

  .project-card__doc-title {
    font-family: var(--font-ui);
    color: var(--color-text-high);
  }

  .project-card__doc-meta,
  .project-card__doc-total {
    color: var(--color-text-low);
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
  }

  /* Hours ---------------------------------------------------------------- */

  .project-card__hours-summary {
    display: flex;
    gap: var(--space-4);
    margin-bottom: var(--space-2);
    color: var(--color-text-low);
  }

  .project-card__hours-summary strong {
    color: var(--color-text-high);
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
  }

  .project-card__entries {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .project-card__entry {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding: var(--space-1) 0;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .project-card__entry:last-child {
    border-bottom: none;
  }

  .project-card__entry-time,
  .project-card__entry-duration {
    color: var(--color-text-low);
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
  }

  .project-card__entry-note {
    font-family: var(--font-ui);
    color: var(--color-text-med);
  }

  @container tile (min-width: 22rem) {
    .project-card__documents-slim {
      display: none;
    }

    .project-card__documents-table {
      display: block;
    }

    .project-card__entry {
      flex-direction: row;
      align-items: baseline;
      gap: var(--space-3);
    }

    .project-card__entry-time {
      flex: none;
      width: 6ch;
    }

    .project-card__entry-note {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .project-card__entry-duration {
      flex: none;
      width: 5ch;
      text-align: right;
    }
  }
</style>
