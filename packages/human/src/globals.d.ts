/**
 * Host globals the framework relies on that ES2024's lib does not declare. Both browsers and Node ≥ 17 provide
 * `structuredClone`; the package build uses `types: []` (no Node or DOM typings), so it is declared here.
 */
declare function structuredClone<T>(value: T): T;
