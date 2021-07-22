/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor} from 'outline';

import {insertRichText} from 'outline/SelectionHelpers';

import {useEffect} from 'react';

export default function useOutlineDragonSupport(editor: OutlineEditor) {
  useEffect(() => {
    const handler = (event) => {
      const rootElement = editor.getRootElement();
      if (document.activeElement !== rootElement) {
        return;
      }
      const data = event.data;
      if (typeof data === 'string') {
        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
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
            if (args) {
              const [
                blockStart,
                blockLength,
                text,
                selStart,
                selLength,
                formatCommand,
              ] = args;
              // TODO: we should probably handle formatCommand somehow?
              // eslint-disable-next-line no-unused-expressions
              formatCommand;
              editor.update((view) => {
                const selection = view.getSelection();
                if (selection !== null) {
                  let anchorKey = selection.anchorKey;
                  let setSelStart = 0;
                  let setSelEnd = 0;
                  // set initial selection
                  if (blockStart >= 0 && blockLength >= 0) {
                    setSelStart = blockStart;
                    setSelEnd = blockStart + blockLength;
                    // If the offset is more than the end, make it the end
                    selection.setRange(
                      anchorKey,
                      setSelStart,
                      anchorKey,
                      setSelEnd,
                    );
                  }
                  if (setSelStart !== setSelEnd || text !== '') {
                    insertRichText(selection, text);
                    anchorKey = selection.anchorKey;
                  }
                  // set final selection
                  setSelStart = selStart;
                  setSelEnd = selStart + selLength;
                  const anchorNodeTextLength = selection
                    .getAnchorNode()
                    .getTextContentSize();
                  // If the offset is more than the end, make it the end
                  setSelStart =
                    setSelStart > anchorNodeTextLength
                      ? anchorNodeTextLength
                      : setSelStart;
                  setSelEnd =
                    setSelEnd > anchorNodeTextLength
                      ? anchorNodeTextLength
                      : setSelEnd;
                  selection.setRange(
                    anchorKey,
                    setSelStart,
                    anchorKey,
                    setSelEnd,
                  );
                  // block the chrome extension from handling this event
                  event.stopImmediatePropagation();
                }
              }, 'useOutlineDragonSupport');
            }
          }
        }
      }
    };
    window.addEventListener('message', handler, true);

    return () => {
      window.removeEventListener('message', handler, true);
    };
  }, [editor]);
}
