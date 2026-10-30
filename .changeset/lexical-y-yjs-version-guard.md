---
'@lexical/y': patch
---

[feature] Refuse to run against a Yjs other than the one `@lexical/y` supports, with a typed `YUnsupportedYjsError`, before anything is written

`@lexical/y` supports exactly one `@y/y` version, its exact peer dependency,
now also exported as `SUPPORTED_YJS_VERSION`. Package managers only warn
about an unmet peer dependency (pnpm by default, npm with
`--legacy-peer-deps`), so an app could still run another `@y/y` and
misbehave without an error. `createYDoc`, `YBinding` (and so
`YCollabExtension`) and the headless helpers now check, once per app, that
the `@y/y` they loaded provides the internals the binding uses, and that
the document comes from that same copy. Otherwise they throw a
`YUnsupportedYjsError` (`code: UNSUPPORTED_YJS_ERROR`) with
`data: {supported, found, reason}`, where `reason` is `'changed-internals'`
or `'other-copy'`.

Verify: with `@y/y@14.0.0-rc.29` installed once (`npm ls @y/y`), nothing
changes.
