/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, RangeSelection, TextFormatType} from 'lexical';

import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  INSERT_PARAGRAPH_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  mergeRegister,
  safeCast,
} from 'lexical';

import {namedSignals} from './namedSignals';
import {effect} from './signals';

/**
 * Trigger types that cause format escape at text node boundaries.
 * - `enter`: Escape on paragraph insertion (Enter key)
 * - `click`: Escape on mouse click
 * - `arrow`: Escape on arrow key navigation (left/right)
 */
export type EscapeFormatTrigger = 'enter' | 'click' | 'arrow';

/**
 * Configuration for {@link EscapeFormatAtBoundaryExtension}.
 *
 * @property disabled - When true, the extension is inactive.
 * @property formats - Text format types to escape at boundaries (e.g. `['code']`).
 * @property triggers - Which user interactions trigger the escape behavior.
 */
export interface EscapeFormatAtBoundaryConfig {
  disabled: boolean;
  formats: TextFormatType[];
  triggers: {[K in EscapeFormatTrigger]?: boolean};
}

function $escapeFormatIfAtBoundary(
  selection: RangeSelection,
  direction: 'start' | 'end' | 'both',
  formats: TextFormatType[],
): void {
  if (!selection.isCollapsed() || selection.anchor.type !== 'text') {
    return;
  }
  const anchor = selection.anchor;
  const anchorNode = anchor.getNode();
  if (!$isTextNode(anchorNode)) {
    return;
  }
  const hasTrackedFormat = formats.some((format) =>
    anchorNode.hasFormat(format),
  );
  if (!hasTrackedFormat) {
    return;
  }
  const atEnd =
    anchor.offset === anchorNode.getTextContentSize() &&
    anchorNode.getNextSibling() === null;
  const atStart =
    anchor.offset === 0 && anchorNode.getPreviousSibling() === null;
  if (
    (direction === 'end' && atEnd) ||
    (direction === 'start' && atStart) ||
    (direction === 'both' && (atEnd || atStart))
  ) {
    selection.setFormat(0);
    selection.setStyle('');
  }
}

function registerEscapeFormatAtBoundary(
  editor: LexicalEditor,
  formats: TextFormatType[],
  triggers: {[K in EscapeFormatTrigger]?: boolean},
): () => void {
  const cleanups: Array<() => void> = [];

  if (triggers.click) {
    cleanups.push(
      editor.registerCommand(
        CLICK_COMMAND,
        () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $escapeFormatIfAtBoundary(selection, 'both', formats);
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }

  if (triggers.enter) {
    cleanups.push(
      editor.registerCommand(
        INSERT_PARAGRAPH_COMMAND,
        () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $escapeFormatIfAtBoundary(selection, 'both', formats);
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }

  if (triggers.arrow) {
    cleanups.push(
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_LEFT_COMMAND,
        (event) => {
          if (event.shiftKey) {
            return false;
          }
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $escapeFormatIfAtBoundary(selection, 'start', formats);
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_RIGHT_COMMAND,
        (event) => {
          if (event.shiftKey) {
            return false;
          }
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $escapeFormatIfAtBoundary(selection, 'end', formats);
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }

  return mergeRegister(...cleanups);
}

/**
 * An extension to escape text format (e.g. code) when the cursor is at the
 * boundary of a formatted text node with no adjacent sibling in that direction.
 * This prevents the format from "leaking" into subsequently typed text.
 *
 * @example
 * ```ts
 * configExtension(EscapeFormatAtBoundaryExtension, {
 *   triggers: {enter: true, click: true, arrow: true},
 * })
 * ```
 */
export const EscapeFormatAtBoundaryExtension = defineExtension({
  build(editor, config) {
    return namedSignals(config);
  },
  config: safeCast<EscapeFormatAtBoundaryConfig>({
    disabled: false,
    formats: ['code'],
    triggers: {enter: true},
  }),
  name: '@lexical/extension/EscapeFormatAtBoundary',
  register(editor, config, state) {
    const {disabled, formats, triggers} = state.getOutput();
    return effect(() => {
      if (!disabled.value) {
        return registerEscapeFormatAtBoundary(
          editor,
          formats.value,
          triggers.value,
        );
      }
    });
  },
});
