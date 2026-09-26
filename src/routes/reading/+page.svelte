<script lang="ts">
  import {
    Surface, CaseStudy, CaseIndex, Section, DeepDive, DecisionRecord, Pipeline,
    Disclosure, Stepper, Callout, Tree, Prose, StackManifest, Benchmark, Markdown,
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
    rolloutSteps,
    treeNodes,
    benchmarkVariants,
    benchmarkMetrics,
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

  // Placeholder long-form body copy (German) exercising the reading
  // typography: three paragraphs, **bold**, one *em*, inline `code`, a link.
  const readingProseDe = `Die Umstellung auf die inkrementelle Pipeline war kein einzelner Schnitt, sondern eine **schrittweise Ablösung** des nächtlichen Batch-Jobs über mehrere Wochen hinweg, begleitet von Kennzahlen, die jede Etappe bestätigten, bevor die nächste begann.

Am schwierigsten war *nicht* die Indexierungslogik selbst, sondern die Frage, wie sich der Konsum des Write-Ahead-Logs sicher fortsetzen lässt, ohne Ereignisse doppelt zu verarbeiten. Die Lösung dedupliziert auf \`(table, pk, xid)\`, bevor ein Schreibvorgang den Index erreicht.

Weitere Details zur Umstellung und den Alternativen, die wir verworfen haben, stehen im [Decision Record](#decision-incremental) weiter oben — inklusive der Kennzahlen, die den Ausschlag gegeben haben.`;

  // Placeholder benchmark table, five numeric columns — wide enough to
  // overflow a narrow container and exercise the horizontal scroll/fade.
  const readingTableMd = `| Variant | p50 (ms) | p99 (ms) | Memory (MB) | CPU (%) | Cost ($/mo) |
| --- | --- | --- | --- | --- | --- |
| pokkum | 4.2 | 18.6 | 96 | 12 | 38 |
| baseline-a | 6.1 | 31.4 | 140 | 19 | 61 |
| baseline-b | 5.8 | 27.9 | 128 | 17 | 54 |
| baseline-c | 9.3 | 44.2 | 210 | 26 | 89 |`;

  // Bullet + numbered lists exercising the marker-column layout: long
  // wrapping items (so a wrapped line's alignment under the item's own
  // text, not the marker, is visible), one nested level per list, and an
  // inline code token near a line end (the `hyphens`/`overflow-wrap` fix).
  const readingListsMd = `- The connector retries a failed WAL read up to five times with exponential backoff before it escalates to the on-call rotation and pages whoever is holding the pager that week
- Backfills run nightly against the same replication slot the tailer uses, just far enough behind that a backfill batch never races a live write from the tailer
   - Nested: a backfill batch is capped at 5,000 rows so it never holds the slot open long enough to block the tailer sitting behind it
- See the incident write-ups this section was distilled from in \`Lessons.md\`

1. Cut read traffic over for the lowest-risk tenant first, watching shadow-query diffs for a full week before touching anything else in the fleet
2. Roll forward one tenant tier at a time, smallest catalog to largest, so a regression only ever affects the tier currently mid-migration
   1. Nested: every tier gets its own dashboard rather than a shared one, so a spike in tier three can't hide a smaller regression in tier one
3. Decommission the nightly full rebuild once every tenant has run the incremental path for two weeks with zero shadow-diff mismatches`;

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
      <code>Benchmark</code>, <code>Stepper</code>, <code>Outline</code>, <code>Tree</code>, <code>CaseIndex</code> and <code>CaseStudy</code>.
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
      { label: "verification", value: "Bit-for-bit", detail: "shadow-query diff against the old index, replayed nightly for three weeks before cutover" },
      { label: "on-call pages", value: "0", detail: "for staleness" },
    ]}
  >
    {#snippet hero()}
      <Pipeline title="indexing pipeline, at a glance" entry="write commit" exit="searchable doc" steps={pipelineSteps} />
    {/snippet}

    {#snippet meta()}
      <StackManifest groups={stackGroups} />
      <Stepper steps={rolloutSteps} orientation="horizontal" current="shadow" completed={["discovery", "design"]} label="Rollout" />
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

    <Section id="build-variants" number="03" title="Build variants compared">
      <Prose text="The same service, built four ways. `pokkum` is this project's own tool — every other column is a baseline it's being measured against." />
      <Benchmark
        title="build variants compared"
        variants={benchmarkVariants}
        metrics={benchmarkMetrics}
        highlight="pokkum"
        caption="Placeholder numbers for a fictional service image. Image size uses a log scale — 1.1GB and 138MB would otherwise barely differ on screen."
      />
    </Section>

    <Section id="repo-layout" number="04" title="Repository layout">
      <Prose text="The pipeline lives in its own crate alongside the existing monolith, so it can be deployed and rolled back independently." />
      <Tree nodes={treeNodes} label="search-indexer repository" />
    </Section>

    <Section id="results" number="05" title="Results and lessons" collapsible open={false}>
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

      <!-- Reading typography demo: a full Prose block (German placeholder,
           `lang="de"` for hyphenation) and a Markdown table wide enough to
           overflow a narrow container. -->
      <Prose text={readingProseDe} lang="de" />
      <Markdown source={readingTableMd} />
      <Markdown source={readingListsMd} />
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
