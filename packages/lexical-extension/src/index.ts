/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export {
  type AutoFocusConfig,
  AutoFocusExtension,
} from '@lexical/extension/AutoFocusExtension';
export {
  type ClearEditorConfig,
  ClearEditorExtension,
  registerClearEditor,
} from '@lexical/extension/ClearEditorExtension';
export {
  $defaultShouldInsertAfter,
  type ClickAfterLastBlockConfig,
  ClickAfterLastBlockExtension,
  type ClickAfterLastBlockOutput,
} from '@lexical/extension/ClickAfterLastBlockExtension';
export {
  getKnownTypesAndNodes,
  type KnownTypesAndNodes,
} from '@lexical/extension/config';
export {
  $applyFormatToDom,
  $isDecoratorTextNode,
  applyFormatFromStyle,
  applyFormatToDom,
  DecoratorTextExtension,
  DecoratorTextNode,
  type SerializedDecoratorTextNode,
} from '@lexical/extension/DecoratorTextExtension';
export {EditorStateExtension} from '@lexical/extension/EditorStateExtension';
export {
  $getExtensionDependency,
  $getExtensionOutput,
  $getPeerDependency,
} from '@lexical/extension/getExtensionDependency';
export {getExtensionDependencyFromEditor} from '@lexical/extension/getExtensionDependencyFromEditor';
export {
  getPeerDependencyFromEditor,
  getPeerDependencyFromEditorOrThrow,
} from '@lexical/extension/getPeerDependencyFromEditor';
export {
  type HMRConfig,
  HMRExtension,
  type HMROutput,
  type HotContext,
} from '@lexical/extension/HMRExtension';
export {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleExtension,
  HorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
  type SerializedHorizontalRuleNode,
} from '@lexical/extension/HorizontalRuleExtension';
export {IMEExtension} from '@lexical/extension/IMEExtension';
export {
  type InitialStateConfig,
  InitialStateExtension,
} from '@lexical/extension/InitialStateExtension';
export {
  formatKeyboardShortcut,
  type FormatKeyboardShortcutOptions,
  type KeyboardShortcutsConfig,
  KeyboardShortcutsExtension,
  type NamedKeyboardShortcuts,
} from '@lexical/extension/KeyboardShortcutsExtension';
export {
  buildEditorFromExtensions,
  LexicalBuilder,
} from '@lexical/extension/LexicalBuilder';
export {
  namedSignals,
  type NamedSignalsOptions,
  type NamedSignalsOutput,
} from '@lexical/extension/namedSignals';
export {NestedEditorExtension} from '@lexical/extension/NestedEditorExtension';
export {
  type NodeSelectionDataSelectedConfig,
  NodeSelectionDataSelectedExtension,
} from '@lexical/extension/NodeSelectionDataSelectedExtension';
export {NodeSelectionExtension} from '@lexical/extension/NodeSelectionExtension';
export {
  type NormalizeInlineElementsConfig,
  NormalizeInlineElementsExtension,
} from '@lexical/extension/NormalizeInlineElementsExtension';
export {
  type NormalizeTripleClickSelectionConfig,
  NormalizeTripleClickSelectionExtension,
  type NormalizeTripleClickSelectionOutput,
} from '@lexical/extension/NormalizeTripleClickSelectionExtension';
export {
  type PreventSelectAllConfig,
  PreventSelectAllExtension,
} from '@lexical/extension/PreventSelectAllExtension';
export {RootElementExtension} from '@lexical/extension/RootElementExtension';
export {
  type SelectBlockConfig,
  SelectBlockExtension,
} from '@lexical/extension/SelectBlockExtension';
export {SelectionAlwaysOnDisplayExtension} from '@lexical/extension/SelectionAlwaysOnDisplayExtension';
export {
  batch,
  computed,
  effect,
  type ReadonlySignal,
  type Signal,
  signal,
  type SignalOptions,
  untracked,
} from '@lexical/extension/signals';
export {
  type CanIndentPredicate,
  registerTabIndentation,
  type TabIndentationConfig,
  TabIndentationExtension,
} from '@lexical/extension/TabIndentationExtension';
export {WatchEditableExtension} from '@lexical/extension/WatchEditableExtension';
export {watchedSignal} from '@lexical/extension/watchedSignal';
export {
  type AnyLexicalExtension,
  type AnyLexicalExtensionArgument,
  type CompiledKeyboardShortcuts,
  compileKeyboardShortcuts,
  configExtension,
  CONTROL_OR_ALT,
  CONTROL_OR_META,
  declarePeerDependency,
  defineExtension,
  type ExtensionConfigBase,
  type ExtensionRegisterState,
  type InitialEditorStateType,
  type KeyboardShortcut,
  type KeyboardShortcutMatch,
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
