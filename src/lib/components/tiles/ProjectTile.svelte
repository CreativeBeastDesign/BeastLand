<!-- src/lib/components/tiles/ProjectTile.svelte -->
<!-- Tile body for the `project` kind: looks the record up by id. -->

<script lang="ts">
  import { projects } from "$lib/project/store.svelte.js";
  import ProjectCard from "$lib/components/molecules/ProjectCard.svelte";
  import EmptyRecord from "./EmptyRecord.svelte";

  let { contentId }: { contentId: string } = $props();
  let project = $derived(projects.get(contentId));
</script>

{#if project}
  <ProjectCard {project} />
{:else}
  <EmptyRecord />
{/if}
