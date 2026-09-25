// Local placeholder content for the /reading showcase route. Fictional
// engineering case study data only — not the user's portfolio.
import type {
  CaseSummary,
  StackGroup,
  PipelineStep,
  Step,
  Alternative,
  TreeNode,
} from "$lib/reading/index.js";

export const caseSummaries: CaseSummary[] = [
  {
    slug: "search-indexer",
    href: "#",
    title: "Rebuilding a search indexer",
    standfirst:
      "Swapped a batch nightly indexer for an incremental pipeline, cutting staleness from 24h to under a minute.",
    tags: ["search", "infra", "rust"],
    metric: { label: "p99 staleness", value: "48s", detail: "was 24h" },
  },
  {
    slug: "billing-ledger",
    href: "#",
    title: "A double-entry ledger for billing",
    standfirst:
      "Replaced ad-hoc balance mutations with an append-only ledger so every invoice discrepancy became provable, not debatable.",
    tags: ["billing", "postgres", "correctness"],
    metric: { label: "disputed invoices", value: "-92%" },
  },
  {
    slug: "edge-cache",
    href: "#",
    title: "Edge caching the config service",
    standfirst:
      "Pushed feature-flag reads to the edge with a signed, versioned snapshot, removing a shared point of failure.",
    tags: ["edge", "caching", "reliability"],
    metric: { label: "origin load", value: "-97%" },
  },
];

export const stackGroups: StackGroup[] = [
  { category: "team", items: ["2 engineers", "1 SRE (part-time)"] },
  { category: "timeline", items: ["Q1 2025", "10 weeks"], note: "Shipped in three stages behind a flag." },
  { category: "stack", items: ["Rust", "Kafka", "Postgres", "OpenSearch"] },
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
