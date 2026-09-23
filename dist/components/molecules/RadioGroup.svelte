<!-- src/lib/components/molecules/RadioGroup.svelte -->

<script lang="ts">
  import Radio from "../atoms/Radio.svelte";

  type Option = {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
  };

  type Orientation = "vertical" | "horizontal";

  type Props = {
    name: string;
    value?: string;
    options: Option[];
    orientation?: Orientation;
    legend?: string;
  };

  let { name, value = $bindable(undefined), options, orientation = "vertical", legend }: Props =
    $props();
</script>

<fieldset class="radio-group">
  {#if legend}
    <legend class="radio-group__legend">{legend}</legend>
  {/if}
  <div class="radio-group__options" data-orientation={orientation}>
    {#each options as opt (opt.value)}
      <Radio
        {name}
        value={opt.value}
        label={opt.label}
        description={opt.description}
        disabled={opt.disabled}
        checked={value === opt.value}
        onchange={() => (value = opt.value)}
      />
    {/each}
  </div>
</fieldset>

<style>
  .radio-group {
    margin: 0;
    padding: 0;
    border: none;
    min-width: 0;
  }

  .radio-group__legend {
    padding: 0;
    margin-bottom: var(--space-2);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
  }

  .radio-group__options {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .radio-group__options[data-orientation="horizontal"] {
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--space-4);
  }
</style>
