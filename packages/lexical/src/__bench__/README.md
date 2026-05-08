# Lexical Benchmarks

Performance benchmarks for the Lexical core. Run via `pnpm bench` from the
repo root, or scoped with `--project bench` (data-structure, node env) or
`--project bench-dom` (real-editor, jsdom env).

```sh
pnpm bench                           # all bench projects
pnpm vitest bench --project bench    # data-structure microbenches only
pnpm vitest bench --project bench-dom  # editor cycle benches only
```

## What benches live here

| File | Project | Measures |
| ---- | ------- | -------- |
| `nodeMap.bench.ts` | `bench` | `Map` vs `GenMap` on clone / typing / paste / iteration / get |
| `dom/editorCycle.bench.ts` | `bench-dom` | real `editor.update` cycle cost on a jsdom-backed editor |

## When to add a bench

Add a bench when you are landing a perf change and want to:

- Establish a baseline so future regressions are detectable.
- Justify a non-obvious algorithmic choice with measurements.
- Compare implementation strategies (the `nodeMap.bench.ts` workflow).

Skip a bench for changes whose perf impact is obvious or unmeasurable in
isolation.

## Conventions

**File naming**

- `*.bench.ts` directly under `__bench__/` for node-env microbenches
  (data structures, pure logic).
- `*.bench.ts` under `__bench__/dom/` for jsdom-env benches that exercise
  a real editor.

**Structure**

```ts
import {bench, describe} from 'vitest';

const SIZES = [100, 1000, 10000, 100000] as const;

for (const size of SIZES) {
  describe(`size=${size} :: <scenario>`, () => {
    let state;
    bench(
      'impl A',
      () => {
        // operation under test
      },
      {setup: () => { state = build(size); }},
    );
    bench(
      'impl B',
      () => {
        // operation under test
      },
      {setup: () => { state = build(size); }},
    );
  });
}
```

- Sweep across realistic doc sizes; pick the largest that still completes
  in a few seconds per case.
- Reset state in `setup` so each iteration starts from a clean baseline.

## Reading results

Vitest bench reports `hz` (ops/sec), `mean`, `p75`, `p99`, and a relative
factor in the summary. The summary block at the end is the primary signal:
look for "Nx faster than..." lines comparing the relevant impls.

## Limits

- Numbers are **machine-dependent**. Compare runs on the same machine, same
  load. Don't compare numbers across different hardware.
- jsdom DOM ops are slower than real browsers. Treat `bench-dom` numbers as
  relative comparisons, not absolute production estimates.
- Benches do not run in CI today. They are local tools for perf work.
