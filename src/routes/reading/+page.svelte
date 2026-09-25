<script lang="ts">
  import {
    Surface, CaseStudy, CaseIndex, Section, DeepDive, DecisionRecord, Pipeline,
    Disclosure, Stepper, Callout, Tree, Prose, StackManifest,
    type CalloutTone,
  } from "$lib/index.js";

  import {
    caseSummaries,
    stackGroups,
    pipelineSteps,
    deepDivePipelineSteps,
    decisionGains,
    decisionCosts,
    decisionAlternatives,
    steps,
    treeNodes,
  } from "./data.js";

  // Trivial placeholder math renderer: no katex dependency, just escapes the
  // tex source and wraps it in <code> so `$…$` / `$$…$$` render as something
  // rather than literal text.
  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function math(tex: string, display: boolean): string {
    const tag = display ? "pre" : "code";
    return `<${tag} class="math-placeholder">${escapeHtml(tex)}</${tag}>`;
  }

  let currentStep = $state("shadow");

  const calloutTones: { tone: CalloutTone; label: string; text: string }[] = [
    { tone: "neutral", label: "note", text: "This case study uses placeholder company and system names throughout." },
    { tone: "accent", label: "highlight", text: "The **shadow-mode** stage ran for three full weeks before cutover." },
    { tone: "info", label: "context", text: "See the `StackManifest` in the header for team size and timeline." },
    { tone: "success", label: "result", text: "p99 index staleness dropped from 24h to under a minute." },
    { tone: "warning", label: "caveat", text: "Backfills for historical documents still run as a nightly batch." },
    { tone: "danger", label: "incident", text: "A misconfigured retry policy briefly double-published events in week 2." },
  ];
</script>

<svelte:head>
  <title>Reading components · BeastLand</title>
</svelte:head>

<div class="reading-page">
  <header class="reading-page__intro">
    <p class="reading-page__eyebrow">// reading components showcase</p>
    <h1 class="reading-page__title">Long-form &amp; case-study components</h1>
    <p class="reading-page__lead">
      One fictional, placeholder case study exercising every reading component: <code>Prose</code>,
      <code>Callout</code>, <code>Disclosure</code>, <code>StackManifest</code>, <code>Metric</code>/<code>MetricGrid</code>,
      <code>CaseCard</code>, <code>Section</code>, <code>DeepDive</code>, <code>DecisionRecord</code>, <code>Pipeline</code>,
      <code>Stepper</code>, <code>Outline</code>, <code>Tree</code>, <code>CaseIndex</code> and <code>CaseStudy</code>.
    </p>
  </header>

  <CaseIndex studies={caseSummaries} label="More case studies (placeholder)">
    {#snippet children()}
      <p class="case-index-intro">
        A few other fake write-ups, for the <code>CaseIndex</code> / <code>CaseCard</code> pairing:
      </p>
    {/snippet}
  </CaseIndex>

  <!-- `CaseStudy`'s root is a plain <article> with no background of its own
       (by design — it's meant to sit inside a Tile/Window that already
       supplies one). This page renders directly on the shell's wallpaper, so
       it gets its own glass surface here for contrast, the same way the
       root showcase wraps every demo block in a `Window`. -->
  <Surface glass radius="window" class="reading-page__surface">
  <CaseStudy
    title="Rebuilding a search indexer"
    subtitle="How a two-person team replaced a nightly batch job with an incremental pipeline, and cut search staleness from a day to under a minute."
    eyebrow="case study"
    tags={["search", "infra", "rust", "kafka"]}
    metrics={[
      { label: "p99 staleness", value: "48s", detail: "was 24h" },
      { label: "reindex time", value: "40m", detail: "was 6h" },
      { label: "on-call pages", value: "-100%", detail: "for staleness" },
    ]}
  >
    {#snippet hero()}
      <Pipeline title="indexing pipeline, at a glance" entry="write commit" exit="searchable doc" steps={pipelineSteps} />
    {/snippet}

    {#snippet meta()}
      <StackManifest groups={stackGroups} />
    {/snippet}

    <Section id="background" number="01" title="Why the nightly batch had to go">
      <Prose
        text="The old indexer ran once a night: a single Rust binary that scanned every table, rebuilt a full **OpenSearch** snapshot, and swapped it in atomically. It was simple and reliable — until the catalog grew past 40 million documents and the run started taking longer than the maintenance window."
      />
      <Callout tone="warning" label="symptom">
        Support tickets about "my new listing doesn't show up in search" doubled quarter over quarter, all traceable to the same root cause: staleness, not a bug.
      </Callout>
      <Prose
        text="We considered shortening the batch window first — see the [decision record](#decision-incremental) below for why that, and two other options, didn't make the cut."
      />
    </Section>

    <Section id="approach" number="02" title="An incremental pipeline instead">
      <Prose text="Instead of re-scanning everything nightly, we tail the primary database's write-ahead log and push each change through a small pipeline, event by event." />

      <DeepDive
        id="wal-deep-dive"
        title="Reading the write-ahead log safely"
        summary="The trickiest part wasn't the indexing logic — it was making WAL consumption resumable, ordered, and safe to replay without double-counting."
        number="02.1"
        links="auto"
      >
        <Section id="wal-tailing" level={3} title="Tailing the log">
          <Prose text="A dedicated connector subscribes to logical replication and turns each row change into a typed `DocumentChanged` event, preserving the commit order per primary key." />
        </Section>
        <Section id="wal-idempotency" level={3} title="Idempotent replay">
          <Prose
            text="Every event carries the source transaction id as its key, so re-processing after a crash is safe: consumers dedupe on `(table, pk, xid)` before writing to the index. In notation, that's simply requiring $f(f(x)) = f(x)$ for the write path — replaying is a no-op once applied."
            {math}
          />
        </Section>
        <Pipeline title="wal tailer, internally" steps={deepDivePipelineSteps} />
      </DeepDive>

      <Disclosure id="rollout-detail" label="Full rollout timeline" count={4} hint="Four stages, spread across ten weeks">
        <Stepper {steps} current={currentStep} completed={["discovery", "design"]} onstep={(id) => (currentStep = id)} />
      </Disclosure>
    </Section>

    <Section id="repo-layout" number="03" title="Repository layout">
      <Prose text="The pipeline lives in its own crate alongside the existing monolith, so it can be deployed and rolled back independently." />
      <Tree nodes={treeNodes} label="search-indexer repository" />
    </Section>

    <Section id="results" number="04" title="Results and lessons" collapsible open={false}>
      <Prose text="Nine weeks after the design doc, the incremental pipeline was serving 100% of production reads. A summary of what we gained, what it cost, and what we'd considered instead follows below." />

      <div class="callout-grid">
        {#each calloutTones as item (item.tone)}
          <Callout tone={item.tone} label={item.label}>
            <Prose text={item.text} inline />
          </Callout>
        {/each}
      </div>

      <DecisionRecord
        id="decision-incremental"
        title="Move from nightly batch to incremental indexing"
        status="accepted"
        context="Search staleness had grown from minutes to up to 24 hours as the catalog scaled past 40M documents, and the nightly batch job was approaching its maintenance-window ceiling."
        decision="Replace the full nightly rebuild with an event-driven pipeline that tails the primary database's write-ahead log and applies changes to the index incrementally, keeping a much smaller nightly job only for backfills."
        gains={decisionGains}
        costs={decisionCosts}
        alternatives={decisionAlternatives}
        unlisted={false}
      />
    </Section>
  </CaseStudy>
  </Surface>
</div>

<style>
  .reading-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    max-width: 72rem;
    margin: 0 auto;
    padding-block: var(--space-6);
  }

  .reading-page__intro {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-width: 52rem;
  }

  .reading-page__eyebrow {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: 0.04em;
    color: var(--color-text-low);
  }

  .reading-page__title {
    margin: 0;
    font-family: var(--font-ui);
    font-size: calc(var(--text-lg) * 1.6);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
  }

  .reading-page__lead {
    margin: 0;
    color: var(--color-text-med);
    font-size: var(--text-base);
  }

  .reading-page__lead code {
    font-family: var(--font-mono);
    font-size: 0.9em;
    color: var(--color-text-high);
  }

  .case-index-intro {
    margin: 0;
    color: var(--color-text-med);
    font-size: var(--text-sm);
  }

  .case-index-intro code {
    font-family: var(--font-mono);
    font-size: 0.9em;
  }

  :global(.reading-page__surface) {
    padding: var(--space-6);
  }

  .callout-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: var(--space-3);
  }

  :global(.math-placeholder) {
    font-family: var(--font-mono);
    color: var(--color-accent);
  }
</style>
