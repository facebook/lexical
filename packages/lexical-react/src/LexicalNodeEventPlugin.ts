/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  type Klass,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
} from 'lexical';
import {useRef} from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';

export function NodeEventPlugin({
  nodeType,
  eventType,
  eventListener,
}: {
  nodeType: Klass<LexicalNode>;
  eventType: string;
  eventListener: (
    event: Event,
    editor: LexicalEditor,
    nodeKey: NodeKey,
  ) => void;
}): null {
  const [editor] = useLexicalComposerContext();
  const listenerRef = useRef(eventListener);

  listenerRef.current = eventListener;

  useLayoutEffect(() => {
    return editor.registerMutationListener(nodeType, (mutations) => {
      const registedElements: WeakSet<HTMLElement> = new WeakSet();

      editor.getEditorState().read(() => {
        for (const [key, mutation] of mutations) {
          const element: null | HTMLElement = editor.getElementByKey(key);

          if (
            // Updated might be a move, so that might mean a new DOM element
            // is created. In this case, we need to add and event listener too.
            (mutation === 'created' || mutation === 'updated') &&
            element !== null &&
            !registedElements.has(element)
          ) {
            registedElements.add(element);
            element.addEventListener(eventType, (event: Event) => {
              listenerRef.current(event, editor, key);
            });
          }
        }
      });
    });
    // wW intentionally don't respect changes to eventType.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, nodeType]);

  return null;
}
