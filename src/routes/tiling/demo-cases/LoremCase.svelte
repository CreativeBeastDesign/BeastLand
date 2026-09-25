<!-- src/routes/tiling/demo-cases/LoremCase.svelte -->
<!-- ONE tiny, lorem-style placeholder case study — a showcase of the reading
     components wired into the `case` terminal kind (`$lib/cases`), never a
     real portfolio piece. BeastLand stays a component library: real case
     content lives in a consuming app, registered the same way this demo
     registers itself in `Workspace.svelte`. -->

<script lang="ts">
  import CaseStudy from "$lib/components/templates/CaseStudy.svelte";
  import Section from "$lib/components/organisms/Section.svelte";
  import Callout from "$lib/components/molecules/Callout.svelte";
  import Pipeline from "$lib/components/organisms/Pipeline.svelte";
  import Prose from "$lib/components/atoms/Prose.svelte";
</script>

<CaseStudy
  title="Lorem Ipsum Kiosk"
  subtitle="A placeholder case study demonstrating the reading components inside a terminal tile."
  eyebrow="demo case"
  tags={["demo", "placeholder"]}
  metrics={[{ label: "lorem", value: "42", detail: "ipsum units" }]}
>
  <Section id="lorem-intro" title="Introduction" number={1}>
    <Prose text="Lorem ipsum dolor sit amet, consectetur adipiscing elit. This section exists only to exercise the `case` kind end to end — content is intentionally placeholder text." />
    <Callout tone="info" label="note">
      This tile is rendered by `CaseTile`, wired up through `cases.register(...)` in the demo route.
    </Callout>
  </Section>

  <Section id="lorem-pipeline" title="How it flows" number={2}>
    <Pipeline
      title="lorem pipeline"
      entry="request"
      exit="response"
      steps={[
        { label: "Parse", detail: "Split the lorem into ipsum tokens" },
        { label: "Transform", detail: "Dolor sit amet mutation" },
        { label: "Render", detail: "Consectetur into the tile" },
      ]}
    />
  </Section>

  <Section id="lorem-details" title="Details" number={3}>
    <Prose text="Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Try `@n toc` and `@n goto lorem-pipeline` on this tile's container." />
  </Section>
</CaseStudy>
