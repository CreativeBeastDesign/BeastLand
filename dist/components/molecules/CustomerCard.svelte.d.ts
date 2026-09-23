import type { Customer } from "../../data/types.js";
type Props = {
    customer: Customer;
};
declare const CustomerCard: import("svelte").Component<Props, {}, "">;
type CustomerCard = ReturnType<typeof CustomerCard>;
export default CustomerCard;
