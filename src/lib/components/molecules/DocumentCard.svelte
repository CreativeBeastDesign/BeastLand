<!-- src/lib/components/molecules/DocumentCard.svelte -->

<script lang="ts">
  import { commandBridge } from "$lib/shell/bridge.js";
  import type { Document } from "$lib/data/types.js";
  import { kinds } from "$lib/tiling/kinds.svelte.js";
  import { docTypeLabels } from "$lib/data/types.js";
  import { formatMoney, formatDate, formatBp, documentTotals, itemTotal, itemLabels } from "$lib/data/format.js";
  import RecordView, { type RecordField } from "./RecordView.svelte";
  import { data } from "$lib/data/store.svelte.js";
  import { shortId } from "$lib/tiling/ids.js";

  type Props = {
    document: Document;
  };

  let { document: doc }: Props = $props();

  let totals = $derived(documentTotals(doc));

  /** Zero amounts (included items) read as an em dash, not `0.00`. */
  const money = (minor: number) => (minor === 0 ? "—" : formatMoney(minor));
  // Required items count 1…n, optional ones a…z; same labels the terminal uses.
  let labels = $derived(itemLabels(doc.items));

  let customerLabel = $derived(
    doc.customer.company
      ? `${doc.customer.displayName} (${doc.customer.company})`
      : doc.customer.displayName || "—",
  );

  let headerFields = $derived.by((): RecordField[] => {
    const fields: (RecordField | null)[] = [
      { key: "Number", value: doc.number ?? "draft" },
      { key: "Type", value: docTypeLabels[doc.docType] },
      { key: "Status", value: doc.status },
      {
        key: "Customer",
        value: customerLabel,
        prose: true,
        command: doc.customerId ? `#${shortId(doc.customerId, kinds.allIds).short}` : undefined,
      },
      { key: "Date", value: formatDate(doc.documentDate) },
      { key: "Valid until", value: formatDate(doc.validUntil) },
      doc.discountBp > 0 ? { key: "Discount", value: formatBp(doc.discountBp) } : null,
      { key: "Total", value: formatMoney(totals.gross, doc.currency) },
      totals.optional > 0 ? { key: "Optional", value: formatMoney(totals.optional, doc.currency) } : null,
    ];
    return fields.filter((field): field is RecordField => field !== null);
  });

  function firstParagraph(text: string): string {
    return text.split(/\n\s*\n/)[0] ?? "";
  }
</script>

<div class="document-card">
  <RecordView fields={headerFields} oncommand={commandBridge} />

  <section class="document-card__items">
    <h3 class="document-card__heading">Items</h3>

    <div class="document-card__items-slim">
      {#each doc.items as item, i (item.id)}
        <div class="document-card__item-block" class:document-card__item-block--optional={item.isOptional}>
          <div class="document-card__item-line">
            <span class="document-card__idx">{labels[i]}</span>
            <span class="document-card__item-title">{item.title}</span>
          </div>
          <div class="document-card__item-sub document-card__num-text">
            {item.quantity} × {money(item.unitPriceMinor)} = {money(itemTotal(item))}
          </div>
        </div>
      {/each}
    </div>

    <table class="document-card__items-table items">
      <thead>
        <tr>
          <th class="document-card__idx">#</th>
          <th>Title</th>
          <th class="document-card__num">Qty</th>
          <th class="document-card__num">Unit price</th>
          <th class="document-card__num">Total</th>
        </tr>
      </thead>
      <tbody>
        {#each doc.items as item, i (item.id)}
          <tr class:document-card__row--optional={item.isOptional}>
            <td class="document-card__idx">{labels[i]}</td>
            <td class="document-card__item-title">{item.title}</td>
            <td class="document-card__num">{item.quantity}</td>
            <td class="document-card__num">{money(item.unitPriceMinor)}</td>
            <td class="document-card__num">{money(itemTotal(item))}</td>
          </tr>
        {/each}
      </tbody>
      <!-- Totals live in the Total column so their decimals align with the rows;
           the currency is stated once, on the label, instead of on every amount. -->
      <tfoot>
        <tr>
          <td colspan="4" class="document-card__foot-label">Net</td>
          <td class="document-card__num">{formatMoney(totals.net)}</td>
        </tr>
        {#if totals.discount > 0}
          <tr>
            <td colspan="4" class="document-card__foot-label">Discount {formatBp(doc.discountBp)}</td>
            <td class="document-card__num">-{formatMoney(totals.discount)}</td>
          </tr>
        {/if}
        <tr>
          <td colspan="4" class="document-card__foot-label">Tax</td>
          <td class="document-card__num">{formatMoney(totals.tax)}</td>
        </tr>
        <tr class="document-card__foot-total">
          <td colspan="4" class="document-card__foot-label">Total {doc.currency}</td>
          <td class="document-card__num">{formatMoney(totals.gross)}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Slim layout has no table; a compact two-column totals block instead. -->
    <div class="document-card__totals document-card__num-text">
      <div><span>Net</span><span>{formatMoney(totals.net)}</span></div>
      {#if totals.discount > 0}
        <div><span>Discount</span><span>-{formatMoney(totals.discount)}</span></div>
      {/if}
      <div><span>Tax</span><span>{formatMoney(totals.tax)}</span></div>
      <div class="document-card__totals-total"><span>Total {doc.currency}</span><span>{formatMoney(totals.gross)}</span></div>
    </div>
  </section>

  {#if doc.coverLetter}
    <section class="document-card__cover">
      <h3 class="document-card__heading">Cover letter</h3>
      <p class="document-card__cover-text">{firstParagraph(doc.coverLetter)}</p>
    </section>
  {/if}
</div>

<style>
  .document-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-text-med);
  }

  .document-card__heading {
    margin: 0 0 var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
  }

  .document-card__items-table {
    display: none;
  }

  .document-card__item-block {
    padding: var(--space-1) 0;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .document-card__item-block:last-child {
    border-bottom: none;
  }

  .document-card__item-line {
    display: flex;
    gap: var(--space-2);
    color: var(--color-text-high);
  }

  .document-card__item-sub {
    padding-left: var(--space-3);
    color: var(--color-text-med);
  }

  .document-card__item-block--optional .document-card__item-sub {
    color: var(--color-text-low);
  }

  .document-card__item-title {
    font-family: var(--font-ui);
  }

  /* Tabular numerals: numbers align in the table, totals block and any
     mixed number/money line, while `#`, labels and status/number/type
     values stay `--font-mono`. */
  .document-card__idx,
  .document-card__num,
  .document-card__num-text {
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
  }

  .items {
    width: 100%;
    border-collapse: collapse;
  }

  .items th,
  .items td {
    text-align: left;
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .items thead th {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-low);
  }

  /* Right-align numbers so decimal points line up (beats `.items td`). */
  .items th.document-card__num,
  .items td.document-card__num,
  .items th.document-card__idx,
  .items td.document-card__idx {
    text-align: right;
  }

  .items td.document-card__idx {
    color: var(--color-text-low);
    width: 2.5ch;
  }

  tr.document-card__row--optional,
  .document-card__item-block--optional {
    color: var(--color-text-low);
  }

  .document-card__totals {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-1);
    margin-top: var(--space-2);
  }

  .document-card__totals > div {
    display: flex;
    gap: var(--space-3);
    min-width: 10rem;
    justify-content: space-between;
  }

  .document-card__totals-total {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
    border-top: 1px solid var(--color-border-subtle);
    padding-top: var(--space-1);
  }

  .items tfoot td {
    border-bottom: none;
    padding-top: var(--space-1);
    padding-bottom: 0;
  }

  .items tfoot tr:first-child td {
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border);
  }

  .items td.document-card__foot-label {
    text-align: right;
    color: var(--color-text-low);
  }

  .items .document-card__foot-total td {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
  }

  .document-card__cover {
    display: none;
  }

  .document-card__cover-text {
    margin: 0;
    color: var(--color-text-med);
    font-family: var(--font-ui);
  }

  @container tile (min-width: 22rem) {
    .document-card__items-slim,
    .document-card__totals {
      display: none;
    }

    .document-card__items-table {
      display: table;
    }
  }

  @container tile (min-width: 36rem) {
    .document-card__cover {
      display: block;
    }
  }
</style>
