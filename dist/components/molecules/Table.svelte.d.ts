import type { Snippet } from "svelte";
declare function $$render<T>(): {
    props: {
        columns: {
            key: string;
            label: string;
            align?: "left" | "right";
            numeric?: boolean;
            width?: string;
            render?: Snippet<[row: T]> | undefined;
        }[];
        rows: T[];
        rowKey: (row: T) => string;
        caption?: string;
        showCaption?: boolean;
        dense?: boolean;
        footer?: Snippet;
        onrowclick?: (row: T) => void;
        selectedKey?: string;
        /**
         * Row that is "about to be acted on" — a transient preview (e.g. the row a
         * half-typed command targets), not a selection. Independent of `selectedKey`.
         */
        markedKey?: string;
        empty?: string;
    };
    exports: {};
    bindings: "";
    slots: {};
    events: {};
};
declare class __sveltets_Render<T> {
    props(): ReturnType<typeof $$render<T>>['props'];
    events(): ReturnType<typeof $$render<T>>['events'];
    slots(): ReturnType<typeof $$render<T>>['slots'];
    bindings(): "";
    exports(): {};
}
interface $$IsomorphicComponent {
    new <T>(options: import('svelte').ComponentConstructorOptions<ReturnType<__sveltets_Render<T>['props']>>): import('svelte').SvelteComponent<ReturnType<__sveltets_Render<T>['props']>, ReturnType<__sveltets_Render<T>['events']>, ReturnType<__sveltets_Render<T>['slots']>> & {
        $$bindings?: ReturnType<__sveltets_Render<T>['bindings']>;
    } & ReturnType<__sveltets_Render<T>['exports']>;
    <T>(internal: unknown, props: ReturnType<__sveltets_Render<T>['props']> & {}): ReturnType<__sveltets_Render<T>['exports']>;
    z_$$bindings?: ReturnType<__sveltets_Render<any>['bindings']>;
}
declare const Table: $$IsomorphicComponent;
type Table<T> = InstanceType<typeof Table<T>>;
export default Table;
