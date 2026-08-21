/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * A relatively imported factory that declares itself side-effect free, the
 * way Lexical's own factories do. Calls to it are safe to annotate.
 *
 * @__NO_SIDE_EFFECTS__
 */
export function definePureThing<T>(thing: T): T {
  return thing;
}

/**
 * A relatively imported factory with no such declaration: it may well have
 * side effects, so its calls must be left alone.
 */
export function defineImpureThing<T>(thing: T): T {
  return thing;
}

/**
 * An overloaded factory, which is where the annotation ends up on a
 * TSDeclareFunction signature rather than on the implementation. Lexical's
 * own `domOverride` is written this way.
 *
 * @__NO_SIDE_EFFECTS__
 */
export function defineOverloadedThing(thing: string): string;
export function defineOverloadedThing(thing: number): number;
export function defineOverloadedThing(thing: unknown): unknown {
  return thing;
}
