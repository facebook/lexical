/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from 'lexical';
import type {LinkNode} from 'lexical/LinkNode';

import useLexicalEditorEvents from '@lexical/react/DEPRECATED_useLexicalEditorEvents';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getNearestNodeFromDOMNode} from 'lexical';
import {$isLinkNode} from 'lexical/LinkNode';
import {useCallback, useEffect, useRef} from 'react';

type LinkFilter = (event: MouseEvent, linkNode: LinkNode) => boolean;

export default function ClickableLinkPlugin({
  filter,
  newTab = true,
}: {
  filter?: LinkFilter,
  newTab?: boolean,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  const hasMoved = useRef(false);

  useEffect(() => {
    let prevOffsetX;
    let prevOffsetY;

    const onPointerDown = (event: PointerEvent) => {
      prevOffsetX = event.offsetX;
      prevOffsetY = event.offsetY;
    };

    const onPointerUp = (event: PointerEvent) => {
      hasMoved.current =
        event.offsetX !== prevOffsetX || event.offsetY !== prevOffsetY;
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const onClick = useCallback(
    (e: Event) => {
      // Based on pointerdown/up we can check if cursor moved during click event,
      // and ignore clicks with moves (to allow link text selection)
      const hasMovedDuringClick = hasMoved.current;
      hasMoved.current = false;

      // $FlowExpectedError[incompatible-cast] onClick handler will get MouseEvent, safe to cast
      const event = (e: MouseEvent);
      const linkDomNode = getLinkDomNode(event, editor);
      if (linkDomNode === null) {
        return;
      }

      const href = linkDomNode.getAttribute('href');
      if (
        linkDomNode.getAttribute('contenteditable') === 'false' ||
        href === undefined
      ) {
        return;
      }

      let linkNode = null;
      editor.update(() => {
        const maybeLinkNode = $getNearestNodeFromDOMNode(linkDomNode);
        if ($isLinkNode(maybeLinkNode)) {
          linkNode = maybeLinkNode;
        }
      });

      if (
        linkNode === null ||
        (filter !== undefined && !filter(event, linkNode))
      ) {
        return;
      }

      if (hasMovedDuringClick) {
        return;
      }

      window.open(
        href,
        newTab || event.metaKey || event.ctrlKey ? '_blank' : '_self',
      );
    },
    [editor, filter, newTab],
  );

  useLexicalEditorEvents([['click', onClick]], editor);

  return null;
}

function isLinkDomNode(domNode: Node): boolean {
  return domNode.nodeName.toLowerCase() === 'a';
}

function getLinkDomNode(
  event: MouseEvent,
  editor: LexicalEditor,
): HTMLAnchorElement | null {
  return editor.getEditorState().read(() => {
    // $FlowExpectedError[incompatible-cast]
    const domNode = (event.target: Node);

    if (isLinkDomNode(domNode)) {
      // $FlowExpectedError[incompatible-cast]
      return (domNode: HTMLAnchorElement);
    }

    if (domNode.parentNode && isLinkDomNode(domNode.parentNode)) {
      // $FlowExpectedError[incompatible-cast]
      return (domNode.parentNode: HTMLAnchorElement);
    }

    return null;
  });
}
