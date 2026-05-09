/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {bench, describe} from 'vitest';

import {GenMap} from '../LexicalGenMap';
import {buildMap, type FakeNode, makeNode} from './_utils';

const SIZES = [100, 1000, 10000, 100000] as const;

// Module-level sink push'd into by each bench body so V8 can't elide
// the work. The array is intentionally never read; `push` is the
// observable side effect that anchors the computation. See README.md.
const benchSinks: unknown[] = [];

function buildGenMap(size: number): GenMap<string, FakeNode> {
  const g = new GenMap<string, FakeNode>();
  g._mutable = true;
  g._nursery = new Map();
  for (let i = 0; i < size; i++) {
    const k = String(i);
    g.set(k, makeNode(k));
  }
  g.compact(true);
  return g;
}

for (const size of SIZES) {
  describe(`size=${size} :: clone`, () => {
    let mapBase: Map<string, FakeNode>;
    let genBase: GenMap<string, FakeNode>;

    bench(
      'Map: new Map(prev)',
      () => {
        const _ = new Map(mapBase);
      },
      {
        setup: () => {
          mapBase = buildMap(size);
        },
      },
    );

    bench(
      'GenMap: clone()',
      () => {
        const _ = genBase.clone();
      },
      {
        setup: () => {
          genBase = buildGenMap(size);
        },
      },
    );
  });

  describe(`size=${size} :: clone + 1 set (typing 1 char)`, () => {
    let mapBase: Map<string, FakeNode>;
    let genBase: GenMap<string, FakeNode>;

    bench(
      'Map',
      () => {
        const next = new Map(mapBase);
        next.set('newKey', makeNode('newKey'));
      },
      {
        setup: () => {
          mapBase = buildMap(size);
        },
      },
    );

    bench(
      'GenMap',
      () => {
        const next = genBase.clone();
        next.set('newKey', makeNode('newKey'));
      },
      {
        setup: () => {
          genBase = buildGenMap(size);
        },
      },
    );
  });

  describe(`size=${size} :: 50 sustained cycles (typing)`, () => {
    let mapBase: Map<string, FakeNode>;
    let genBase: GenMap<string, FakeNode>;

    bench(
      'Map',
      () => {
        let cur = mapBase;
        for (let c = 0; c < 50; c++) {
          const next = new Map(cur);
          next.set(`typed${c}`, makeNode(`typed${c}`));
          cur = next;
        }
      },
      {
        setup: () => {
          mapBase = buildMap(size);
        },
      },
    );

    bench(
      'GenMap',
      () => {
        let cur = genBase;
        for (let c = 0; c < 50; c++) {
          const next = cur.clone();
          next.set(`typed${c}`, makeNode(`typed${c}`));
          cur = next;
        }
      },
      {
        setup: () => {
          genBase = buildGenMap(size);
        },
      },
    );
  });

  describe(`size=${size} :: paste 100 nodes (1 cycle, 100 mutations)`, () => {
    let mapBase: Map<string, FakeNode>;
    let genBase: GenMap<string, FakeNode>;

    bench(
      'Map',
      () => {
        const next = new Map(mapBase);
        for (let i = 0; i < 100; i++) {
          const k = `paste${i}`;
          next.set(k, makeNode(k));
        }
      },
      {
        setup: () => {
          mapBase = buildMap(size);
        },
      },
    );

    bench(
      'GenMap',
      () => {
        const next = genBase.clone();
        for (let i = 0; i < 100; i++) {
          const k = `paste${i}`;
          next.set(k, makeNode(k));
        }
      },
      {
        setup: () => {
          genBase = buildGenMap(size);
        },
      },
    );
  });

  describe(`size=${size} :: get`, () => {
    let mapBase: Map<string, FakeNode>;
    let genBase: GenMap<string, FakeNode>;
    const k = String(Math.floor(size / 2));

    bench(
      'Map',
      () => {
        benchSinks.push(mapBase.get(k));
      },
      {
        setup: () => {
          mapBase = buildMap(size);
        },
      },
    );

    bench(
      'GenMap',
      () => {
        benchSinks.push(genBase.get(k));
      },
      {
        setup: () => {
          genBase = buildGenMap(size);
        },
      },
    );
  });

  describe(`size=${size} :: full iteration`, () => {
    let mapBase: Map<string, FakeNode>;
    let genBase: GenMap<string, FakeNode>;

    bench(
      'Map',
      () => {
        let count = 0;
        for (const _ of mapBase) count++;
        benchSinks.push(count);
      },
      {
        setup: () => {
          mapBase = buildMap(size);
        },
      },
    );

    bench(
      'GenMap',
      () => {
        let count = 0;
        for (const _ of genBase) count++;
        benchSinks.push(count);
      },
      {
        setup: () => {
          genBase = buildGenMap(size);
        },
      },
    );
  });
}
