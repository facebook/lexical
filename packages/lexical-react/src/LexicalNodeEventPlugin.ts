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
  $nodesOfType,
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
    const registeredElements: WeakSet<HTMLElement> = new WeakSet();
    const listeners: Map<HTMLElement, (event: Event) => void> = new Map();

    const addElementListener = (element: HTMLElement, key: NodeKey) => {
      registeredElements.add(element);

      const listener = (event: Event) => {
        listenerRef.current(event, editor, key);
      };

      element.addEventListener(eventType, listener);
      listeners.set(element, listener);
    };

    editor.getEditorState().read(() => {
      for (const node of $nodesOfType(nodeType)) {
        const key = node.getKey();
        const element = editor.getElementByKey(key);

        if (element === null || registeredElements.has(element)) {
          continue;
        }

        addElementListener(element, key);
      }
    });

    const removeMutationListener = editor.registerMutationListener(
      nodeType,
      (mutations) => {
        editor.getEditorState().read(() => {
          for (const [key, mutation] of mutations) {
            const element: null | HTMLElement = editor.getElementByKey(key);

            if (
              // "updated" might represent a moved node, in which case a new DOM
              // element is created. That requires us to add an event listener too.
              (mutation === 'created' || mutation === 'updated') &&
              element !== null &&
              !registeredElements.has(element)
            ) {
              addElementListener(element, key);
            }
          }
        });
      },
    );

    return () => {
      for (const [element, listener] of listeners) {
        element.removeEventListener(eventType, listener);
      }

      removeMutationListener();
    };
    // We intentionally don't respect changes to eventType.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, nodeType]);

  return null;
}
