/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {expectTypeOf} from 'expect-type';
import {
  declarePeerDependency,
  defineExtension,
  type ExtensionConfigBase,
  type LexicalExtension,
  type NormalizedPeerDependency,
} from 'lexical';

function assertType<T>(value: T): void {}

describe('defineExtension', () => {
  it('does not change identity', () => {
    const extensionArg: LexicalExtension<
      ExtensionConfigBase,
      'test',
      undefined,
      never
    > = {
      name: 'test',
    };
    const extension = defineExtension(extensionArg);
    expect(extension).toBe(extensionArg);
    expectTypeOf(extension).toEqualTypeOf(extensionArg);
  });
  it('infers the expected type (base case)', () => {
    assertType<LexicalExtension<ExtensionConfigBase, 'test', undefined, never>>(
      defineExtension({name: 'test'}),
    );
  });
  it('infers the expected type (config inference)', () => {
    assertType<LexicalExtension<{number: 123}, 'test', undefined, never>>(
      defineExtension({config: {number: 123}, name: 'test'}),
    );
  });
  it('infers the expected type (output inference)', () => {
    assertType<
      LexicalExtension<ExtensionConfigBase, 'test', {output: number}, never>
    >(
      defineExtension({
        build() {
          return {output: 321};
        },
        name: 'test',
      }),
    );
  });
  it('can define an extension without config', () => {
    assertType<LexicalExtension<ExtensionConfigBase, 'test', undefined, never>>(
      defineExtension({name: 'test'}),
    );
  });
  it('infers the correct init type', () => {
    assertType<
      LexicalExtension<ExtensionConfigBase, 'test', undefined, 'string'>
    >(
      defineExtension({
        init: () => 'string',
        name: 'test',
      }),
    );
  });
});

describe('declarePeerDependency', () => {
  it('validates the type argument', () => {
    const other = defineExtension({config: {other: true}, name: 'other'});
    const dep = declarePeerDependency<typeof other>('other');
    assertType<NormalizedPeerDependency<typeof other>>(dep);
    expect(dep).toEqual(['other', undefined]);
    // @ts-expect-error -- name doesn't match
    declarePeerDependency<typeof other>('wrong');
  });
});
