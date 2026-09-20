<!-- src/routes/sections/FormsAndData.svelte -->
<!-- Showcase section: form & data molecules/atoms (checkbox, switch, radio,
     textarea, select, table, progress, skeleton, empty state). -->

<script lang="ts">
  import Window from "$lib/components/organisms/Window.svelte";
  import Divider from "$lib/components/atoms/Divider.svelte";
  import Button from "$lib/components/atoms/Button.svelte";
  import Checkbox from "$lib/components/atoms/Checkbox.svelte";
  import Switch from "$lib/components/atoms/Switch.svelte";
  import RadioGroup from "$lib/components/molecules/RadioGroup.svelte";
  import Textarea from "$lib/components/atoms/Textarea.svelte";
  import Select from "$lib/components/molecules/Select.svelte";
  import Table from "$lib/components/molecules/Table.svelte";
  import Progress from "$lib/components/atoms/Progress.svelte";
  import Skeleton from "$lib/components/atoms/Skeleton.svelte";
  import EmptyState from "$lib/components/molecules/EmptyState.svelte";
  import { formatMoney } from "$lib/data/format.js";

  // --- Checkbox / switch ------------------------------------------------------
  let acceptTerms = $state(true);
  let subscribe = $state(false);
  let selectAllState = $state(false);
  let notifyEmail = $state(true);
  let notifyPush = $state(false);

  // --- Radio group -------------------------------------------------------------
  let billing = $state("monthly");
  const billingOptions = [
    { value: "monthly", label: "Monthly", description: "Billed every month" },
    { value: "yearly", label: "Yearly", description: "Two months free" },
    { value: "lifetime", label: "Lifetime", description: "One-time payment", disabled: true },
  ];

  // --- Textarea ------------------------------------------------------------------
  let notes = $state("Ship the invoice once the discount is confirmed with the customer.");
  let autoResize = $state(true);

  // --- Select ----------------------------------------------------------------------
  let currency = $state("CHF");
  const currencyOptions = [
    { value: "CHF", label: "CHF — Swiss franc" },
    { value: "EUR", label: "EUR — Euro" },
    { value: "USD", label: "USD — US dollar" },
    { value: "GBP", label: "GBP — British pound", disabled: true },
  ];

  // --- Table -------------------------------------------------------------------------
  type Row = { id: string; title: string; qty: number; price: number };

  const rows: Row[] = [
    { id: "1", title: "Consulting", qty: 3, price: 15000 },
    { id: "2", title: "Design sprint", qty: 1, price: 480000 },
    { id: "3", title: "Hosting (monthly)", qty: 12, price: 2500 },
    { id: "4", title: "Support retainer", qty: 1, price: 90000 },
    { id: "5", title: "Onboarding", qty: 2, price: 35000 },
  ];

  let selectedKey = $state<string | undefined>("2");
  let total = $derived(rows.reduce((sum, r) => sum + r.qty * r.price, 0));

  // --- Progress ------------------------------------------------------------------------
  let progressValue = $state(62);

  // --- Empty state --------------------------------------------------------------------
  let showEmptyState = $state(true);
</script>

{#snippet priceCell(row: Row)}
  <span class="forms-and-data__num">{formatMoney(row.qty * row.price)}</span>
{/snippet}

{#snippet tableFooter()}
  <tr>
    <td colspan="2" class="forms-and-data__total-label">Total</td>
    <td class="forms-and-data__total-value">{formatMoney(total)}</td>
  </tr>
{/snippet}

{#snippet emptyIcon()}
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 4v16" />
  </svg>
{/snippet}

{#snippet emptyActions()}
  <Button variant="accent" size="sm">New document</Button>
  <Button variant="ghost" size="sm">Import</Button>
{/snippet}

<Window
  title="Forms & data"
  subtitle="checkbox, switch, radio, textarea, select, table, progress, skeleton, empty state"
>
  <p class="section-intro">Checkbox &amp; switch, with indeterminate and disabled states.</p>
  <div class="stack">
    <Checkbox bind:checked={acceptTerms} label="Accept terms" description="Required to continue" />
    <Checkbox bind:checked={subscribe} label="Subscribe to updates" />
    <Checkbox
      bind:checked={selectAllState}
      indeterminate={!selectAllState}
      label="Select all"
      description="Shows a dash until every item is checked"
    />
    <Checkbox checked label="Disabled, checked" disabled />
  </div>

  <div class="row">
    <Switch bind:checked={notifyEmail} label="Email notifications" />
    <Switch bind:checked={notifyPush} label="Push notifications" size="sm" />
    <Switch checked label="Disabled" disabled />
  </div>

  <Divider />

  <p class="section-intro">Radio group as a fieldset, with a disabled option.</p>
  <RadioGroup name="billing" bind:value={billing} options={billingOptions} legend="Billing cycle" />

  <Divider />

  <p class="section-intro">Textarea, plain and mono, with auto-resize.</p>
  <div class="stack">
    <Textarea bind:value={notes} autoResize={autoResize} placeholder="Notes…" />
    <Checkbox bind:checked={autoResize} label="Auto-resize" size="sm" />
    <Textarea mono placeholder="curl -X POST https://api.example.com" rows={2} />
  </div>

  <Divider />

  <p class="section-intro">Select — a custom listbox with keyboard nav and type-ahead.</p>
  <div class="row">
    <Select bind:value={currency} options={currencyOptions} placeholder="Currency" />
    <Select options={currencyOptions} placeholder="Invalid" invalid />
    <Select options={currencyOptions} placeholder="Disabled" disabled />
  </div>

  <Divider />

  <p class="section-intro">Table — sortable-looking items list with a rendered money column and totals.</p>
  <div class="forms-and-data__table-frame">
    <Table
      columns={[
        { key: "title", label: "Item" },
        { key: "qty", label: "Qty", numeric: true, width: "4rem" },
        { key: "price", label: "Total", numeric: true, render: priceCell },
      ]}
      {rows}
      rowKey={(r) => r.id}
      onrowclick={(r) => (selectedKey = r.id)}
      {selectedKey}
      caption="Draft invoice items"
      footer={tableFooter}
    />
  </div>

  <Divider />

  <p class="section-intro">Progress — determinate and indeterminate.</p>
  <div class="stack">
    <Progress value={progressValue} label="Uploading assets — {progressValue}%" />
    <Progress tone="success" value={100} label="Build complete" size="sm" />
    <Progress label="Syncing…" />
    <div class="row">
      <Button variant="glass" size="sm" onclick={() => (progressValue = Math.max(0, progressValue - 10))}
        >-10%</Button
      >
      <Button variant="glass" size="sm" onclick={() => (progressValue = Math.min(100, progressValue + 10))}
        >+10%</Button
      >
    </div>
  </div>

  <Divider />

  <p class="section-intro">Skeleton — loading placeholders, single and multi-line.</p>
  <div class="stack">
    <div class="row">
      <Skeleton width="2.5rem" height="2.5rem" radius="pill" />
      <div class="stack forms-and-data__skeleton-lines">
        <Skeleton width="10rem" height="0.75rem" />
        <Skeleton width="7rem" height="0.75rem" />
      </div>
    </div>
    <Skeleton lines={3} height="0.75rem" />
  </div>

  <Divider />

  <p class="section-intro">Empty state.</p>
  <div class="row">
    <Checkbox bind:checked={showEmptyState} label="Show empty state" size="sm" />
  </div>
  {#if showEmptyState}
    <EmptyState
      title="No documents yet"
      description="Create your first quote or invoice to see it listed here."
      icon={emptyIcon}
      actions={emptyActions}
    />
  {/if}
</Window>

<style>
  .section-intro {
    margin: 0 0 var(--space-3);
    color: var(--color-text-med);
    font-size: var(--text-sm);
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  .row:last-child {
    margin-bottom: 0;
  }

  .forms-and-data__table-frame {
    max-height: 16rem;
    overflow: auto;
    border-radius: var(--radius-control);
    border: var(--border-width) solid var(--color-border-subtle);
  }

  .forms-and-data__num {
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
  }

  .forms-and-data__total-label {
    text-align: right;
    padding: var(--space-2) var(--space-3);
    color: var(--color-text-low);
    font-weight: var(--font-weight-semibold);
  }

  .forms-and-data__total-value {
    text-align: right;
    padding: var(--space-2) var(--space-3);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
  }

  .forms-and-data__skeleton-lines {
    justify-content: center;
    gap: var(--space-2);
  }
</style>
