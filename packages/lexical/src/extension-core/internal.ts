/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/** @internal */
export const peerDependencySymbol = Symbol.for(
  '@lexical/internal/peerDependency',
);
/** @internal */
export type peerDependencySymbol = typeof peerDependencySymbol;
/** @internal */
export const configTypeSymbol = Symbol.for('@lexical/internal/configType');
/** @internal */
export type configTypeSymbol = typeof configTypeSymbol;
/** @internal */
export const outputTypeSymbol = Symbol.for('@lexical/internal/outputType');
/** @internal */
export type outputTypeSymbol = typeof outputTypeSymbol;
/** @internal */
export const initTypeSymbol = Symbol.for('@lexical/internal/initType');
/** @internal */
export type initTypeSymbol = typeof initTypeSymbol;

/** @internal */
export interface LexicalExtensionInternal<Config, Output, Init> {
  /** @internal */
  readonly [configTypeSymbol]?: Config;
  /** @internal */
  readonly [outputTypeSymbol]?: Output;
  /** @internal */
  readonly [initTypeSymbol]?: Init;
}
