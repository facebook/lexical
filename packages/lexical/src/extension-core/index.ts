/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export {
  configExtension,
  declarePeerDependency,
  defineExtension,
  mergeOutputs,
  provideOutput,
} from './defineExtension';
export {
  type configTypeSymbol,
  type initTypeSymbol,
  type LexicalExtensionInternal,
  type outputTypeSymbol,
} from './internal';
export {safeCast} from './safeCast';
export {shallowMergeConfig} from './shallowMergeConfig';
export {
  type AnyLexicalExtension,
  type AnyLexicalExtensionArgument,
  type AnyNormalizedLexicalExtensionArgument,
  type AnyOutputArg,
  type ExtensionConfigBase,
  type ExtensionInitState,
  type ExtensionRegisterState,
  type InitialEditorConfig,
  type InitialEditorStateType,
  type LexicalEditorWithDispose,
  type LexicalExtension,
  type LexicalExtensionArgument,
  type LexicalExtensionConfig,
  type LexicalExtensionDependency,
  type LexicalExtensionInit,
  type LexicalExtensionName,
  type LexicalExtensionOutput,
  type MergeOutputs,
  type NormalizedLexicalExtensionArgument,
  type NormalizedPeerDependency,
  type OutputComponentExtension,
  type RegisterCleanup,
} from './types';
