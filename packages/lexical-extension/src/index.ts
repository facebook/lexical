/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export {type AutoFocusConfig, AutoFocusExtension} from './AutoFocusExtension';
export {getKnownTypesAndNodes, type KnownTypesAndNodes} from './config';
export {disabledToggle} from './disabledToggle';
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
  namedStores,
  type NamedStoresOptions,
  type NamedStoresOutput,
} from './namedStores';
export {
  type MergedStoreValue,
  type ReadableStore,
  Store,
  type StoreSubscriber,
  subscribeAll,
  type WritableStore,
} from './Store';
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
