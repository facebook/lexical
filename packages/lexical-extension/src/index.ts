/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export {type AutoFocusConfig, AutoFocusExtension} from './AutoFocusExtension';
export {
  type ClearEditorConfig,
  ClearEditorExtension,
  registerClearEditor,
} from './ClearEditorExtension';
export {getKnownTypesAndNodes, type KnownTypesAndNodes} from './config';
export {getExtensionDependencyFromEditor} from './getExtensionDependencyFromEditor';
export {
  getPeerDependencyFromEditor,
  getPeerDependencyFromEditorOrThrow,
} from './getPeerDependencyFromEditor';
export {
  type InitialStateConfig,
  InitialStateExtension,
} from './InitialStateExtension';
export {buildEditorFromExtensions, LexicalBuilder} from './LexicalBuilder';
export {
  namedSignals,
  type NamedSignalsOptions,
  type NamedSignalsOutput,
} from './namedSignals';
export {
  batch,
  computed,
  effect,
  type ReadonlySignal,
  type Signal,
  signal,
  type SignalOptions,
  untracked,
} from './signals';
export {
  registerTabIndentation,
  type TabIndentationConfig,
  TabIndentationExtension,
} from './TabIndentationExtension';
export {
  type AnyLexicalExtension,
  type AnyLexicalExtensionArgument,
  configExtension,
  declarePeerDependency,
  defineExtension,
  type ExtensionConfigBase,
  type ExtensionRegisterState,
  type InitialEditorStateType,
  type LexicalEditorWithDispose,
  type LexicalExtension,
  type LexicalExtensionArgument,
  type LexicalExtensionConfig,
  type LexicalExtensionDependency,
  type LexicalExtensionInit,
  type LexicalExtensionName,
  type LexicalExtensionOutput,
  type NormalizedLexicalExtensionArgument,
  type NormalizedPeerDependency,
  type OutputComponentExtension,
  safeCast,
  shallowMergeConfig,
} from 'lexical';
