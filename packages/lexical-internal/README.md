# `@lexical/internal`

> [!WARNING]
> This package contains **internal** utilities shared across the Lexical
> packages (small DOM/environment helpers, `invariant`, error-message
> formatting, the version constant). It exists so those modules resolve
> through normal package resolution — including the `source` export
> condition used when developing against a linked checkout.
>
> It is **not** a public API. Import from `lexical` and the `@lexical/*`
> feature packages instead. Nothing here follows semver and any export may
> change or disappear without notice.
