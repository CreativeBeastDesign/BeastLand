// Local placeholder content for the /reading showcase route. Fictional
// engineering case study data only — not the user's portfolio.
import type {
  CaseSummary,
  StackGroup,
  PipelineStep,
  Step,
  Alternative,
  TreeNode,
  BenchmarkVariant,
  BenchmarkMetric,
} from "$lib/reading/index.js";

// Tag counts are deliberately uneven across the three cards — one tag
// (1 line), a handful (2 lines) and a long run of them (3 lines) — to
// exercise CaseIndex's subgrid row alignment: whichever card's tag row
// wraps tallest sets that row's height for every card in the same visual
// row, so titles/standfirsts/footers still land on a shared baseline.
export const caseSummaries: CaseSummary[] = [
  {
    slug: "search-indexer",
    href: "#",
    title: "Rebuilding a search indexer",
    standfirst:
      "Swapped a batch nightly indexer for an incremental pipeline, cutting staleness from 24h to under a minute.",
    tags: ["search"],
    metric: { label: "p99 staleness", value: "48s", detail: "was 24h" },
  },
  {
    slug: "billing-ledger",
    href: "#",
    title: "A double-entry ledger for billing",
    standfirst:
      "Replaced ad-hoc balance mutations with an append-only ledger so every invoice discrepancy became provable, not debatable.",
    tags: ["billing", "postgres", "correctness", "ledger", "invoices"],
    metric: { label: "disputed invoices", value: "-92%" },
  },
  {
    slug: "edge-cache",
    href: "#",
    title: "Edge caching the config service",
    standfirst:
      "Pushed feature-flag reads to the edge with a signed, versioned snapshot, removing a shared point of failure.",
    tags: [
      "edge",
      "caching",
      "reliability",
      "distributed-systems",
      "zero-downtime",
      "feature-flags",
      "versioned-snapshots",
    ],
    // No metric — exercises the reserved-but-empty metric row so this
    // card's footer still lines up with the other two.
  },
];

// Two `section`s ("roles" / "tooling") exercise StackManifest's section
// headings — a single manifest, one shared key column, rather than two
// separate grids that don't line up.
export const stackGroups: StackGroup[] = [
  { category: "team", items: ["2 engineers", "1 SRE (part-time)"], section: "roles" },
  { category: "timeline", items: ["Q1 2025", "10 weeks"], note: "Shipped in three stages behind a flag.", section: "roles" },
  { category: "stack", items: ["Rust", "Kafka", "Postgres", "OpenSearch"], section: "tooling" },
  { category: "ide", items: ["Zed", "Neovim"], section: "tooling" },
];

export const pipelineSteps: PipelineStep[] = [
  { label: "ingest", detail: "Change-data-capture stream from the primary write path" },
  { label: "normalize", detail: "Schema validation, dedupe, and tokenization" },
  { label: "shard", detail: "Consistent-hash routing to index shards" },
  { label: "commit", detail: "Segment merge and searcher refresh" },
  { label: "verify", detail: "Shadow-query diff against the old index", muted: true },
];

export const deepDivePipelineSteps: PipelineStep[] = [
  { label: "read wal", detail: "Tail the write-ahead log for the primary table" },
  { label: "decode", detail: "Turn logical replication messages into typed events" },
  { label: "publish", detail: "Emit to the `docs.changed` Kafka topic" },
];

export const decisionGains = [
  "Search results reflect writes within seconds instead of a day",
  "Reindex-from-scratch time dropped from 6 hours to 40 minutes",
  "On-call no longer pages for \"index looks stale\"",
];

export const decisionCosts = [
  "New Kafka dependency to operate and monitor",
  "Incremental updates are harder to reason about than a nightly rebuild",
  "One extra hop of latency on the write path (~8ms)",
];

export const decisionAlternatives: Alternative[] = [
  { option: "Shorten the nightly batch window to hourly", rejectedBecause: "still leaves up to 59 minutes of staleness and the batch job was already near its resource ceiling" },
  { option: "Poll the primary table for changed rows", rejectedBecause: "polling interval trades load for staleness and misses deletes without extra bookkeeping" },
  { option: "Buy a managed CDC connector", rejectedBecause: "vendor's connector didn't support our partitioning scheme without a rewrite" },
];

export const steps: Step[] = [
  { id: "discovery", label: "Discovery", detail: "Mapped every writer of the old index" },
  { id: "design", label: "Design", detail: "ADR-014: incremental over batch" },
  { id: "shadow", label: "Shadow mode", detail: "New pipeline runs alongside the old one" },
  { id: "cutover", label: "Cutover", detail: "Flip reads to the new index" },
  { id: "cleanup", label: "Cleanup", detail: "Retire the nightly batch job" },
];

// Four steps with two-line details, rendered horizontally, to exercise the
// Stepper's fit-to-container fix (no overflow, first/last markers in bounds).
export const rolloutSteps: Step[] = [
  { id: "discovery", label: "Discovery", detail: "Mapped every writer of the old index across three services" },
  { id: "design", label: "Design", detail: "ADR-014 reviewed and accepted by the platform team" },
  { id: "shadow", label: "Shadow mode", detail: "New pipeline ran alongside the old one for three weeks" },
  { id: "cutover", label: "Cutover", detail: "Flipped reads to the new index behind a kill switch" },
];

export const benchmarkVariants: BenchmarkVariant[] = [
  { id: "naive", label: "naive Dockerfile" },
  { id: "tuned", label: "tuned" },
  { id: "distroless", label: "distroless" },
  { id: "pokkum", label: "pokkum" },
];

export const benchmarkMetrics: BenchmarkMetric[] = [
  {
    id: "image-size",
    label: "Image size",
    unit: "MB",
    better: "lower",
    scale: "log",
    values: { naive: 1138.5, tuned: 165.3, distroless: 159.4, pokkum: 137.8 },
  },
  {
    id: "os-packages",
    label: "OS packages",
    better: "lower",
    values: { naive: 413, tuned: 19, distroless: 10, pokkum: 11 },
  },
  {
    id: "cves",
    label: "High + critical CVEs",
    better: "lower",
    values: { naive: 580, tuned: 13, distroless: 6, pokkum: 0 },
  },
  {
    id: "build-config-lines",
    label: "Maintained build-config lines",
    better: "lower",
    values: { naive: 8, tuned: 18, distroless: 13, pokkum: 0 },
  },
  {
    id: "shell-in-image",
    label: "Shell in image",
    better: "lower",
    values: { naive: true, tuned: true, distroless: false, pokkum: false },
  },
  {
    id: "reproducible",
    label: "Reproducible",
    better: "higher",
    values: {
      naive: "no (by construction)",
      tuned: "no (by construction)",
      distroless: "no (by construction)",
      pokkum: true,
    },
  },
];

export const treeNodes: TreeNode[] = [
  {
    id: "root",
    label: "search-indexer",
    open: true,
    children: [
      {
        id: "src",
        label: "src",
        open: true,
        children: [
          { id: "ingest", label: "ingest", children: [
            { id: "cdc-rs", label: "cdc.rs", note: "WAL tailer" },
            { id: "decode-rs", label: "decode.rs" },
          ] },
          { id: "shard-rs", label: "shard.rs", note: "consistent hashing" },
          { id: "commit-rs", label: "commit.rs" },
        ],
      },
      { id: "tests", label: "tests", children: [
        { id: "shadow-test", label: "shadow_diff.rs" },
      ] },
      { id: "cargo", label: "Cargo.toml" },
      { id: "readme", label: "README.md" },
      { id: "vendor", label: "vendor", disabled: true, note: "generated, not checked in" },
    ],
  },
];
