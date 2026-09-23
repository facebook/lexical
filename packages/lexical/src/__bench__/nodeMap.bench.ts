/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {describe, test} from 'vitest';

import {GenMap} from '../LexicalGenMap';
import {buildMap, type FakeNode, makeNode} from './_utils';

const SIZES = [100, 1000, 10000, 100000] as const;

// Module-level sink written by each bench body so V8 can't elide the
// work. A simple variable assignment is sufficient as an observable
// side effect — unlike an array push, it doesn't grow without bound
// and avoids memory exhaustion at high iteration counts (size=100000 get).
let _benchSink: unknown;

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

    test('Map: new Map(prev)', async ({bench}) => {
      await bench('Map: new Map(prev)', () => {
        _benchSink = new Map(mapBase);
      }).run({
        setup: () => {
          mapBase = buildMap(size);
        },
      });
    });

    test('GenMap: clone()', async ({bench}) => {
      await bench('GenMap: clone()', () => {
        _benchSink = genBase.clone();
      }).run({
        setup: () => {
          genBase = buildGenMap(size);
        },
      });
    });
  });

  describe(`size=${size} :: clone + 1 set (typing 1 char)`, () => {
    let mapBase: Map<string, FakeNode>;
    let genBase: GenMap<string, FakeNode>;

    test('Map', async ({bench}) => {
      await bench('Map', () => {
        const next = new Map(mapBase);
        next.set('newKey', makeNode('newKey'));
        _benchSink = next;
      }).run({
        setup: () => {
          mapBase = buildMap(size);
        },
      });
    });

    test('GenMap', async ({bench}) => {
      await bench('GenMap', () => {
        const next = genBase.clone();
        next.set('newKey', makeNode('newKey'));
        _benchSink = next;
      }).run({
        setup: () => {
          genBase = buildGenMap(size);
        },
      });
    });
  });

  describe(`size=${size} :: 50 sustained cycles (typing)`, () => {
    let mapBase: Map<string, FakeNode>;
    let genBase: GenMap<string, FakeNode>;

    test('Map', async ({bench}) => {
      await bench('Map', () => {
        let cur = mapBase;
        for (let c = 0; c < 50; c++) {
          const next = new Map(cur);
          next.set(`typed${c}`, makeNode(`typed${c}`));
          cur = next;
        }
        _benchSink = cur;
      }).run({
        setup: () => {
          mapBase = buildMap(size);
        },
      });
    });

    test('GenMap', async ({bench}) => {
      await bench('GenMap', () => {
        let cur = genBase;
        for (let c = 0; c < 50; c++) {
          const next = cur.clone();
          next.set(`typed${c}`, makeNode(`typed${c}`));
          cur = next;
        }
        _benchSink = cur;
      }).run({
        setup: () => {
          genBase = buildGenMap(size);
        },
      });
    });
  });

  describe(`size=${size} :: paste 100 nodes (1 cycle, 100 mutations)`, () => {
    let mapBase: Map<string, FakeNode>;
    let genBase: GenMap<string, FakeNode>;

    test('Map', async ({bench}) => {
      await bench('Map', () => {
        const next = new Map(mapBase);
        for (let i = 0; i < 100; i++) {
          const k = `paste${i}`;
          next.set(k, makeNode(k));
        }
        _benchSink = next;
      }).run({
        setup: () => {
          mapBase = buildMap(size);
        },
      });
    });

    test('GenMap', async ({bench}) => {
      await bench('GenMap', () => {
        const next = genBase.clone();
        for (let i = 0; i < 100; i++) {
          const k = `paste${i}`;
          next.set(k, makeNode(k));
        }
        _benchSink = next;
      }).run({
        setup: () => {
          genBase = buildGenMap(size);
        },
      });
    });
  });

  describe(`size=${size} :: get`, () => {
    let mapBase: Map<string, FakeNode>;
    let genBase: GenMap<string, FakeNode>;
    const k = String(Math.floor(size / 2));

    test('Map', async ({bench}) => {
      await bench('Map', () => {
        _benchSink = mapBase.get(k);
      }).run({
        setup: () => {
          mapBase = buildMap(size);
        },
      });
    });

    test('GenMap', async ({bench}) => {
      await bench('GenMap', () => {
        _benchSink = genBase.get(k);
      }).run({
        setup: () => {
          genBase = buildGenMap(size);
        },
      });
    });
  });

  describe(`size=${size} :: full iteration`, () => {
    let mapBase: Map<string, FakeNode>;
    let genBase: GenMap<string, FakeNode>;

    test('Map', async ({bench}) => {
      await bench('Map', () => {
        let count = 0;
        for (const _ of mapBase) count++;
        _benchSink = count;
      }).run({
        setup: () => {
          mapBase = buildMap(size);
        },
      });
    });

    test('GenMap', async ({bench}) => {
      await bench('GenMap', () => {
        let count = 0;
        for (const _ of genBase) count++;
        _benchSink = count;
      }).run({
        setup: () => {
          genBase = buildGenMap(size);
        },
      });
    });
  });
}
