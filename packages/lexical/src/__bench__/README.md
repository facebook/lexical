# Lexical Benchmarks

Performance benchmarks for the Lexical core. Run via `pnpm bench` from the
repo root, or scoped to a single project with `--project bench` (data
structure microbenches, node env) or `--project bench-dom` (real-editor
benches, jsdom env).

```sh
pnpm bench                                # all bench projects
pnpm vitest bench --project bench         # microbenches only
pnpm vitest bench --project bench-dom     # editor cycle benches only
pnpm vitest bench --project bench nodeMap # filter by file substring
```

## Two projects, why?

Microbenches that exercise pure data structures (`Map` vs `GenMap`, etc.)
run in `bench` (node env, no DOM) — fastest startup, cleanest numbers.

Benches that exercise a real Lexical editor (which needs a DOM) run in
`bench-dom` (jsdom env). Files in `__bench__/dom/**` are picked up only
by this project. The two projects share the same `pnpm bench` entry but
otherwise stay isolated to keep microbench results uncontaminated by
jsdom setup cost.

## What benches live here

| File | Project | Measures |
| ---- | ------- | -------- |
| `nodeMap.bench.ts` | `bench` | `Map` vs `GenMap` on clone / typing / paste / iteration / get |
| `dom/editorCycle.bench.ts` | `bench-dom` | real `editor.update` cycle cost on a jsdom-backed editor |

Helpers shared across files live in `_utils.ts` (microbench) and
`dom/_utils.ts` (real-editor). Use them when you can; extract new helpers
there if your bench file grows beyond a single workload.

## When to add a bench

Add a bench when you are landing a perf change and want to:

- Establish a baseline so future regressions are detectable.
- Justify a non-obvious algorithmic choice with measurements.
- Compare implementation strategies (the `nodeMap.bench.ts` workflow).

Skip a bench for changes whose perf impact is obvious or unmeasurable in
isolation.

## Conventions

**File naming**

- `*.bench.ts` directly under `__bench__/` for node-env microbenches.
- `*.bench.ts` under `__bench__/dom/` for jsdom-env benches.

**Structure** — sweep across realistic sizes; one `describe` per scenario;
one `bench` per implementation under test.

```ts
import {bench, describe} from 'vitest';

import {buildMap, type FakeNode} from './_utils';
import {MyImpl} from '../MyImpl';

const SIZES = [100, 1000, 10000, 100000] as const;

for (const size of SIZES) {
  describe(`size=${size} :: <scenario name>`, () => {
    let oldImpl: Map<string, FakeNode>;
    let newImpl: MyImpl<string, FakeNode>;

    bench(
      'old',
      () => {
        // operation under test using oldImpl
      },
      {
        setup: () => {
          oldImpl = buildMap(size);
        },
      },
    );

    bench(
      'new',
      () => {
        // operation under test using newImpl
      },
      {
        setup: () => {
          newImpl = MyImpl.fromMap(buildMap(size));
        },
      },
    );
  });
}
```

**Comparison pattern** — when comparing an old vs new implementation,
register both under the same `describe` block. Vitest's summary shows the
relative factor between benches in the same block, which is exactly what
you want to cite in PR descriptions.

**Setup state** — reset state in the `setup` callback so each iteration
starts from a clean baseline. Vitest invokes `setup` before each timed
iteration; allocations inside `setup` do not count toward the benchmark.

**DCE prevention** — V8 may eliminate calls whose return values are
unused. Each bench file should declare a module-level sink and `push`
into it from the timed body so the call can't be elided:

```ts
const benchSinks: unknown[] = [];

bench('get', () => {
  benchSinks.push(map.get(someKey));
});
```

For loops, accumulate into a local and push the local once at the end:

```ts
bench('iterate', () => {
  let count = 0;
  for (const _ of map) count++;
  benchSinks.push(count);
});
```

## Reading results

Vitest bench reports `hz` (ops/sec), `mean`, `p75`, `p99`, and a relative
factor in the summary. The summary block at the end is the primary signal:
look for "Nx faster than..." lines comparing the relevant impls. `mean` is
useful to cite as an absolute number; `p99` indicates tail behavior under
GC or compaction.

Sample size and warmup are managed by Vitest. The default heuristics are
fine for stable comparisons between two impls on the same machine; for
absolute numbers you intend to publish, run multiple times and report the
median.

## Limits

- Numbers are **machine-dependent**. Compare runs on the same machine and
  the same load. Don't compare numbers across hardware.
- jsdom DOM ops are slower than real browsers. Treat `bench-dom` numbers
  as relative comparisons, not absolute production estimates.
- Benches do not run in CI today. They are local tools for perf work.
