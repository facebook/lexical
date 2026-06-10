/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {effect, namedSignals} from '@lexical/extension';
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  defineExtension,
  LexicalEditor,
  safeCast,
  TextFormatType,
} from 'lexical';

const TEXT_FORMAT_BY_EXEC_COMMAND = new Map<string, TextFormatType>([
  ['bold', 'bold'],
  ['italic', 'italic'],
  ['strikeThrough', 'strikethrough'],
  ['subscript', 'subscript'],
  ['superscript', 'superscript'],
  ['underline', 'underline'],
]);

export function registerDragonSupport(editor: LexicalEditor): () => void {
  const origin = window.location.origin;
  const handler = (event: MessageEvent) => {
    if (event.origin !== origin) {
      return;
    }
    const rootElement = editor.getRootElement();

    if (document.activeElement !== rootElement) {
      return;
    }

    const data = event.data;

    if (typeof data === 'string') {
      let parsedData;

      try {
        parsedData = JSON.parse(data);
      } catch (_e) {
        return;
      }

      if (
        parsedData &&
        parsedData.protocol === 'nuanria_messaging' &&
        parsedData.type === 'request'
      ) {
        const payload = parsedData.payload;

        if (payload && payload.functionId === 'makeChanges') {
          const args = payload.args;

          if (Array.isArray(args)) {
            const [
              elementStart,
              elementLength,
              text,
              selStart,
              selLength,
              formatCommand,
            ] = args;
            if (
              ![elementStart, elementLength, selStart, selLength].every(
                Number.isFinite,
              ) ||
              (typeof text !== 'string' && text !== -1)
            ) {
              return;
            }
            editor.update(() => {
              const selection = $getSelection();

              if ($isRangeSelection(selection)) {
                const anchor = selection.anchor;
                let anchorNode = anchor.getNode();
                let setSelStart = 0;
                let setSelEnd = 0;

                if ($isTextNode(anchorNode)) {
                  // set initial selection
                  if (elementStart >= 0 && elementLength >= 0) {
                    setSelStart = elementStart;
                    setSelEnd = elementStart + elementLength;
                    // If the offset is more than the end, make it the end
                    selection.setTextNodeRange(
                      anchorNode,
                      setSelStart,
                      anchorNode,
                      setSelEnd,
                    );
                  }
                }

                // Dragon sends -1 (a number, not a string) as text for
                // selection-only changes, such as Select-and-Say
                // corrections and cursor moves by voice
                if (
                  typeof text === 'string' &&
                  (setSelStart !== setSelEnd || text !== '')
                ) {
                  selection.insertRawText(text);
                  anchorNode = anchor.getNode();
                }

                if ($isTextNode(anchorNode)) {
                  // set final selection
                  const anchorNodeTextLength = anchorNode.getTextContentSize();
                  // Clamp to the text size. Negative offsets have no meaning
                  // in the protocol, so they collapse the selection instead
                  // of leaving a range the next input would replace
                  setSelStart = Math.min(
                    Math.max(selStart, 0),
                    anchorNodeTextLength,
                  );
                  setSelEnd =
                    selStart < 0 || selLength < 0
                      ? setSelStart
                      : Math.min(selStart + selLength, anchorNodeTextLength);
                  selection.setTextNodeRange(
                    anchorNode,
                    setSelStart,
                    anchorNode,
                    setSelEnd,
                  );
                }

                // format the selection, e.g. for the "bold that" voice
                // command. Dragon's extension applies this through
                // document.execCommand, so the values are execCommand names.
                if (
                  typeof formatCommand === 'string' &&
                  selLength > 0 &&
                  !selection.isCollapsed()
                ) {
                  const format = TEXT_FORMAT_BY_EXEC_COMMAND.get(formatCommand);
                  if (format !== undefined) {
                    selection.formatText(format);
                  }
                }

                // block the chrome extension from handling this event
                event.stopImmediatePropagation();
              }
            });
          }
        }
      }
    }
  };

  window.addEventListener('message', handler, true);
  return () => {
    window.removeEventListener('message', handler, true);
  };
}

export interface DragonConfig {
  disabled: boolean;
}

/**
 * Add Dragon speech to text input support to the editor, via the
 * \@lexical/dragon module.
 */
export const DragonExtension = /* @__PURE__ */ defineExtension({
  build: (editor, config, state) => namedSignals(config),
  config: /* @__PURE__ */ safeCast<DragonConfig>({
    disabled: typeof window === 'undefined',
  }),
  name: '@lexical/dragon',
  register: (editor, config, state) =>
    effect(() =>
      state.getOutput().disabled.value
        ? undefined
        : registerDragonSupport(editor),
    ),
});
