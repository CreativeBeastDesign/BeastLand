<!-- src/routes/sections/Markdown.svelte -->
<!-- Showcase section: the `Markdown` molecule, one sample document exercising
     every construct it renders, shown once at normal density and once
     `compact` (the density a tile would use). -->

<script lang="ts">
  import Window from "$lib/components/organisms/Window.svelte";
  import Divider from "$lib/components/atoms/Divider.svelte";
  import MarkdownView from "$lib/components/molecules/Markdown.svelte";
  import { commandBridge } from "$lib/shell/bridge.js";

  const sample = `# Release notes

## v1.4.0 — customer refs

A short summary before the details: **bold** text, \`inline code\`, a record
ref like #xp, a container ref like @2, and a [changelog](https://example.com/changelog) link.

### What shipped

- [x] Ship the \`Markdown\` molecule
- [ ] Wire it into the worklog tile
  - [ ] Pick a default \`highlight\` for TypeScript
- Nested notes are plain list items too

### Rollout

| Environment | Status | Errors |
|:---|:--:|---:|
| staging | live | 0 |
| prod | live | 2 |
| canary | rolling out | 12 |

> Errors on prod are being triaged against #xp's account before the canary
> finishes rolling out.

Run these to check the current state:

\`\`\`beast
ls
customer list -d
\`\`\`

Or, for reference, the bit of TypeScript this document is describing:

\`\`\`ts
export function isRunnableFence(lang: string | undefined): boolean {
  return lang !== undefined && RUNNABLE_FENCE_LANGS.has(lang);
}
\`\`\`

---

Refs, fence lines, headings, lists, tables and quotes above all come from
one \`source\` string — nothing here is hand-assembled markup.
`;
</script>

<Window title="Markdown" subtitle="molecule — headings, refs, tasks, tables, runnable fences">
  <p class="section-intro">
    Normal density, with <code>oncommand</code> wired to the terminal — click <code>#xp</code>, <code>@2</code> or a
    fence line to run it, ⇧-click to insert it into the prompt instead.
  </p>
  <MarkdownView source={sample} oncommand={commandBridge} />

  <Divider />

  <p class="section-intro"><code>compact</code> — the density a tile uses.</p>
  <MarkdownView source={sample} oncommand={commandBridge} compact />
</Window>

<style>
  .section-intro {
    margin: 0 0 var(--space-3);
    color: var(--color-text-med);
    font-size: var(--text-sm);
  }

  .section-intro code {
    font-family: var(--font-mono);
    font-size: 0.9em;
  }
</style>
