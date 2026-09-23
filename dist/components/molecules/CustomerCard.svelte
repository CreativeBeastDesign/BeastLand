<!-- src/lib/components/molecules/CustomerCard.svelte -->

<script lang="ts">
  import { commandBridge } from "../../shell/bridge.js";
  import type { Customer } from "../../data/types.js";
  import { customerName, customerAddress, formatDate } from "../../data/format.js";
  import RecordView, { type RecordField } from "./RecordView.svelte";

  type Props = {
    customer: Customer;
  };

  let { customer }: Props = $props();

  function dash(value: string): string {
    return value ? value : "—";
  }

  let narrowFields = $derived<RecordField[]>([
    { key: "Name", value: dash(customer.lastName) },
    { key: "First Name", value: dash(customer.firstName) },
    { key: "Salutation", value: dash(customer.salutation) },
    { key: "Company", value: dash(customer.company) },
    { key: "Email", value: dash(customer.email) },
    { key: "Street", value: dash(customer.street) },
    { key: "Zip", value: dash(customer.zip) },
    { key: "City", value: dash(customer.city) },
    { key: "Country", value: dash(customer.country) },
    { key: "Updated", value: formatDate(customer.updatedAt) },
  ]);

  let wideFields = $derived<RecordField[]>([
    { key: "Name", value: dash(customerName(customer)) },
    { key: "Salutation", value: dash(customer.salutation) },
    { key: "Company", value: dash(customer.company) },
    { key: "Email", value: dash(customer.email) },
    { key: "Address", value: dash(customerAddress(customer)), wide: true },
    { key: "Country", value: dash(customer.country) },
    { key: "Updated", value: formatDate(customer.updatedAt) },
  ]);
</script>

<div class="customer-card">
  <div class="customer-card__narrow">
    <RecordView fields={narrowFields} oncommand={commandBridge} />
  </div>
  <div class="customer-card__wide">
    <RecordView fields={wideFields} oncommand={commandBridge} />
  </div>
</div>

<style>
  .customer-card__wide {
    display: none;
  }

  @container tile (min-width: 36rem) {
    .customer-card__narrow {
      display: none;
    }

    .customer-card__wide {
      display: block;
    }
  }
</style>
