/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $findMatchingParent,
  $getNearestNodeFromDOMNode,
  type Klass,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  registerEventListener,
} from 'lexical';
import {useEffect, useRef} from 'react';

const capturedEvents = new Set<string>(['mouseenter', 'mouseleave']);

/**
 * Attaches a DOM event listener to the editor's root element and invokes
 * `eventListener` whenever an event of `eventType` targets a node that is (or
 * is contained by) an instance of `nodeType`. The listener receives the DOM
 * event, the editor, and the matching node's {@link NodeKey}.
 *
 * @returns `null`, this plugin renders no DOM of its own.
 */
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

  useEffect(() => {
    const isCaptured = capturedEvents.has(eventType);

    const onEvent = (event: Event) => {
      editor.update(() => {
        const nearestNode = $getNearestNodeFromDOMNode(event.target as Element);
        if (nearestNode !== null) {
          const targetNode = isCaptured
            ? nearestNode instanceof nodeType
              ? nearestNode
              : null
            : $findMatchingParent(
                nearestNode,
                node => node instanceof nodeType,
              );
          if (targetNode !== null) {
            listenerRef.current(event, editor, targetNode.getKey());
            return;
          }
        }
      });
    };

    return editor.registerRootListener(rootElement => {
      if (rootElement) {
        return registerEventListener(
          rootElement,
          eventType,
          onEvent,
          isCaptured,
        );
      }
    });
    // We intentionally don't respect changes to eventType.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, nodeType]);

  return null;
}
