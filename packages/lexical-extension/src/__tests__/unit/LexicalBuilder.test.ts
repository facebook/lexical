/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  configExtension,
  declarePeerDependency,
  defineExtension,
  LexicalBuilder,
  safeCast,
} from '@lexical/extension';
import {assert, describe, expect, it} from 'vitest';

const InitialStateExtensionName = '@lexical/extension/InitialState';

describe('LexicalBuilder', () => {
  const ConfigExtension = defineExtension({
    config: safeCast<{a: 1; b: string | null}>({a: 1, b: 'b'}),
    name: 'Config',
  });
  it('merges extension configs (siblings)', () => {
    const builder = LexicalBuilder.fromEditor(
      buildEditorFromExtensions(
        ConfigExtension,
        configExtension(ConfigExtension, {b: null}),
      ),
    );
    const reps = builder.sortedExtensionReps();
    expect(reps.length).toBe(2);
    const [rep] = reps.slice(-1);
    expect(rep.extension).toBe(ConfigExtension);
    expect(rep.getState().config).toEqual({a: 1, b: null});
  });
  it('merges extension configs (parent override child)', () => {
    const builder = LexicalBuilder.fromEditor(
      buildEditorFromExtensions(
        defineExtension({
          dependencies: [configExtension(ConfigExtension, {b: null})],
          name: 'parent',
        }),
      ),
    );
    const reps = builder.sortedExtensionReps();
    expect(reps.length).toBe(3);
    const rep = reps.find((r) => r.extension === ConfigExtension);
    assert(rep, 'ConfigExtension not found');
    expect(rep.extension).toBe(ConfigExtension);
    expect(rep.getState().config).toEqual({a: 1, b: null});
  });
  it('merges extension configs (grandparent override child) override after', () => {
    const builder = LexicalBuilder.fromEditor(
      buildEditorFromExtensions(
        defineExtension({
          dependencies: [
            defineExtension({dependencies: [ConfigExtension], name: 'parent'}),
            configExtension(ConfigExtension, {b: null}),
          ],
          name: 'grandparent',
        }),
      ),
    );
    const reps = builder.sortedExtensionReps();
    expect(reps.length).toBe(4);
    const rep = reps.find((r) => r.extension === ConfigExtension);
    assert(rep, 'ConfigExtension not found');
    expect(rep.extension).toBe(ConfigExtension);
    expect(rep.getState().config).toEqual({a: 1, b: null});
  });
  it('merges extension configs (grandparent override child) override before', () => {
    const builder = LexicalBuilder.fromEditor(
      buildEditorFromExtensions(
        defineExtension({
          dependencies: [
            configExtension(ConfigExtension, {b: null}),
            defineExtension({dependencies: [ConfigExtension], name: 'parent'}),
          ],
          name: 'grandparent',
        }),
      ),
    );
    const reps = builder.sortedExtensionReps();
    expect(reps.length).toBe(4);
    const rep = reps.find((r) => r.extension === ConfigExtension);
    assert(rep, 'ConfigExtension not found');
    expect(rep.extension).toBe(ConfigExtension);
    expect(rep.getState().config).toEqual({a: 1, b: null});
  });
  it('handles circular dependencies', () => {
    const ExtensionA = defineExtension({dependencies: [], name: 'A'});
    const ExtensionB = defineExtension({dependencies: [ExtensionA], name: 'B'});
    const ExtensionC = defineExtension({dependencies: [ExtensionB], name: 'C'});
    // This is silly and hard to do but why not prevent it
    ExtensionA.dependencies?.push(ExtensionC);
    expect(() => buildEditorFromExtensions(ExtensionA)).toThrowError(
      'LexicalBuilder: Circular dependency detected for Extension A from B',
    );
  });
  describe('handles peer dependency configuration', () => {
    const ExtensionA = defineExtension({
      name: 'A',
      peerDependencies: [
        declarePeerDependency<typeof ConfigExtension>('Config', {b: 'A'}),
      ],
    });
    it('peer-first', () => {
      const builder = LexicalBuilder.fromEditor(
        buildEditorFromExtensions(ExtensionA, ConfigExtension),
      );
      const reps = builder.sortedExtensionReps();
      expect(reps.map((rep) => rep.extension.name)).toEqual([
        InitialStateExtensionName,
        'Config',
        'A',
      ]);
      expect(reps[1].getState().config).toEqual({
        a: 1,
        b: 'A',
      });
    });
    it('peer-last', () => {
      const builder = LexicalBuilder.fromEditor(
        buildEditorFromExtensions(ExtensionA, ConfigExtension),
      );
      const reps = builder.sortedExtensionReps();
      expect(reps.map((rep) => rep.extension.name)).toEqual([
        InitialStateExtensionName,
        'Config',
        'A',
      ]);
      expect(reps[1].getState().config).toEqual({
        a: 1,
        b: 'A',
      });
    });
  });
});
