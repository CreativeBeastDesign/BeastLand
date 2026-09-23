/**
 * Domain types
 *
 * Shapes mirror the backend records (SurrealDB-style ids such as
 * `customer:xpoakahew4rsp2stfg0y` and `document:doc_<uuid>`). Money is kept in
 * minor units (rappen/cents), rates in basis points.
 */
export const docTypeLabels = {
    offer: "Quotation",
    invoice: "Invoice",
    order_confirmation: "Order confirmation",
};
export const docTypePrefix = {
    offer: "QUO",
    invoice: "INV",
    order_confirmation: "OC",
};
