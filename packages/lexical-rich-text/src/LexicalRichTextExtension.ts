/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {DragonExtension} from '@lexical/dragon';
import {
  effect,
  namedSignals,
  NormalizeInlineElementsExtension,
  NormalizeTripleClickSelectionExtension,
} from '@lexical/extension';
import {CoreImportExtension, DOMImportExtension} from '@lexical/html';
import {$onEscapeDown, $onEscapeUp} from '@lexical/utils';
import {
  COMMAND_PRIORITY_LOW,
  configExtension,
  defineExtension,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  mergeRegister,
  safeCast,
  shallowMergeConfig,
  type TextFormatType,
} from 'lexical';

import {HeadingAnnounceExtension} from './HeadingAnnounceExtension';
import {
  $isQuoteNode,
  defaultShouldHandlePasteAsFiles,
  type EscapeFormatTriggerConfig,
  HeadingNode,
  QuoteNode,
  registerRichText,
  type ShouldHandlePasteAsFiles,
  type TriggerConfig,
} from './index';
import {RichTextImportRules} from './RichTextImportExtension';

/**
 * Configuration for {@link RichTextExtension}.
 *
 * @property escapeFormatTriggers - Per-format trigger configuration that
 *   controls which text formats are automatically cleared from the selection
 *   on specific user interactions.
 *
 *   Defaults to:
 *   ```ts
 *   {
 *     capitalize: {enter: true, space: true, tab: true},
 *     lowercase: {enter: true, space: true, tab: true},
 *     uppercase: {enter: true, space: true, tab: true},
 *   }
 *   ```
 *
 *   To opt in to escaping `code` formatting at text node boundaries:
 *   ```ts
 *   configExtension(RichTextExtension, {
 *     escapeFormatTriggers: {
 *       code: {onlyAtBoundary: true, enter: true, click: true, arrow: true},
 *     },
 *   })
 *   ```
 */
export interface RichTextConfig {
  escapeFormatTriggers: EscapeFormatTriggerConfig;
  /**
   * When `true`, the arrow keys add a paragraph before or after a shadow root
   * QuoteNode (`$createQuoteNode({shadowRoot: true})`) that is the first or
   * last block in its parent, so the quote can be escaped. Such a quote holds
   * block-level children, so the caret is always in a nested block and neither
   * Enter nor the generic block cursor navigation can move past it — without
   * this the quote is a trap once it is the last block.
   *
   * Defaults to `true`. A quote that holds inline content is never matched, so
   * this is inert unless something opts in to shadow root quotes.
   */
  shadowRootQuoteEscapeWithArrows: boolean;
  shouldHandlePasteAsFiles: ShouldHandlePasteAsFiles;
}

const DEFAULT_RICH_TEXT_CONFIG: RichTextConfig = {
  escapeFormatTriggers: {
    capitalize: {enter: true, space: true, tab: true},
    lowercase: {enter: true, space: true, tab: true},
    uppercase: {enter: true, space: true, tab: true},
  },
  shadowRootQuoteEscapeWithArrows: true,
  shouldHandlePasteAsFiles: defaultShouldHandlePasteAsFiles,
};

/**
 * A shadow root QuoteNode holds block-level children, so the caret always sits
 * in a nested block and the quote is never the selection's own block: neither
 * Enter (which splits the nested block) nor the generic shadow root block
 * cursor navigation can move past it when it is the last block in its parent.
 * It therefore needs the same arrow-key escape as CodeNode
 * (see `CodeIndentExtension`'s `escapeWithArrows`).
 */
function $isShadowRootQuoteNode(node?: LexicalNode | null): node is QuoteNode {
  return $isQuoteNode(node) && node.isShadowRoot();
}

/**
 * Adds a paragraph before or after a shadow root quote when the caret is at
 * its edge and it is the first or last block in its parent, so the quote can
 * be escaped with the arrow keys. Enabled through
 * {@link RichTextConfig.shadowRootQuoteEscapeWithArrows} rather than exported,
 * so it is reachable only by configuring {@link RichTextExtension}.
 */
function registerShadowRootQuoteEscape(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      event =>
        event.altKey ? false : $onEscapeDown($isShadowRootQuoteNode, event),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_RIGHT_COMMAND,
      event => $onEscapeDown($isShadowRootQuoteNode, event),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      event =>
        event.altKey ? false : $onEscapeUp($isShadowRootQuoteNode, event),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_LEFT_COMMAND,
      event => $onEscapeUp($isShadowRootQuoteNode, event),
      COMMAND_PRIORITY_LOW,
    ),
  );
}

function mergeTriggerConfig(
  config: TriggerConfig | null | undefined,
  override: TriggerConfig | null | undefined,
): TriggerConfig | null | undefined {
  if (!config || override === null) {
    return override;
  }
  return shallowMergeConfig(config, override);
}

function mergeEscapeFormatTriggers(
  config: EscapeFormatTriggerConfig,
  overrides: EscapeFormatTriggerConfig,
) {
  const merged = shallowMergeConfig(config, overrides);
  for (const k of Object.keys(overrides) as TextFormatType[]) {
    merged[k] = mergeTriggerConfig(config[k], overrides[k]);
  }
  return merged;
}

function mergeRichTextConfig(
  config: RichTextConfig,
  overrides: Partial<RichTextConfig>,
): RichTextConfig {
  const merged = shallowMergeConfig(config, overrides);
  if (overrides.escapeFormatTriggers) {
    merged.escapeFormatTriggers = mergeEscapeFormatTriggers(
      config.escapeFormatTriggers,
      overrides.escapeFormatTriggers,
    );
  }
  return merged;
}

export const RichTextExtension = defineExtension({
  build: (_editor, config) => namedSignals(config),
  config: safeCast<RichTextConfig>(DEFAULT_RICH_TEXT_CONFIG),
  conflictsWith: ['@lexical/plain-text'],
  dependencies: [
    HeadingAnnounceExtension,
    DragonExtension,
    NormalizeInlineElementsExtension,
    NormalizeTripleClickSelectionExtension,
    // DOMImportExtension support for the nodes registered here. Inert
    // unless the editor routes HTML through the pipeline (e.g. via
    // ClipboardDOMImportExtension or $generateNodesFromDOMViaExtension).
    CoreImportExtension,
    configExtension(DOMImportExtension, {
      rules: RichTextImportRules,
    }),
  ],
  mergeConfig: mergeRichTextConfig,
  name: '@lexical/rich-text',
  nodes: () => [HeadingNode, QuoteNode],
  register: (editor, _config, state) =>
    effect(() => {
      const {
        escapeFormatTriggers,
        shadowRootQuoteEscapeWithArrows,
        shouldHandlePasteAsFiles,
      } = state.getOutput();
      return mergeRegister(
        registerRichText(
          editor,
          escapeFormatTriggers,
          shouldHandlePasteAsFiles,
        ),
        ...(shadowRootQuoteEscapeWithArrows.value
          ? [registerShadowRootQuoteEscape(editor)]
          : []),
      );
    }),
});

/**
 * Bundles {@link RichTextImportRules} together with the runtime
 * {@link RichTextExtension}.
 *
 * @experimental
 * @deprecated {@link RichTextExtension} now registers
 * {@link RichTextImportRules} (and `CoreImportExtension`) itself —
 * depend on it directly instead.
 */
export const RichTextImportExtension = defineExtension({
  dependencies: [RichTextExtension],
  name: '@lexical/rich-text/Import',
});
