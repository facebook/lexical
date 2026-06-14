/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalCommand, LexicalEditor, NodeKey} from 'lexical';
import type {JSX, RefObject} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalSlotRef} from '@lexical/react/useLexicalSlotRef';
import {$insertNodeToNearestRoot} from '@lexical/utils';
import {
  $getNodeByKey,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  defineExtension,
  setDOMUnmanaged,
} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {$createReviewNode, $isReviewNode, ReviewNode} from './ReviewNode';

export const INSERT_REVIEW_COMMAND: LexicalCommand<void> =
  /* @__PURE__ */ createCommand('INSERT_REVIEW_COMMAND');

const STARS = [1, 2, 3, 4, 5];

interface MountedChildren {
  childrenEl: HTMLElement;
  hostDom: HTMLElement;
}

// The getDOMSlot analog of useLexicalSlotRef: attaches the Review's hidden
// children element (where the reconciler renders the linked-list body prose)
// into the chrome and reveals it. Same idempotent no-cleanup-per-render shape
// as useLexicalSlotRef so a chrome re-render never detaches the element
// mid-edit; the final unmount parks it back hidden in the host DOM.
function useReviewChildren<T extends HTMLElement = HTMLElement>(
  editor: LexicalEditor,
  nodeKey: NodeKey,
): RefObject<T | null> {
  const targetRef = useRef<T | null>(null);
  const mountedRef = useRef<MountedChildren | null>(null);
  useEffect(() => {
    const target = targetRef.current;
    const hostDom = editor.getElementByKey(nodeKey);
    if (target === null || hostDom === null) {
      return;
    }
    const childrenEl = hostDom.querySelector<HTMLElement>(
      '.lexical-review-children',
    );
    if (childrenEl === null) {
      return;
    }
    if (childrenEl.parentElement !== target) {
      target.appendChild(childrenEl);
    }
    childrenEl.style.display = '';
    mountedRef.current = {childrenEl, hostDom};
  });
  useEffect(() => {
    return () => {
      const mounted = mountedRef.current;
      if (mounted !== null) {
        mounted.childrenEl.style.display = 'none';
        if (mounted.childrenEl.parentElement !== mounted.hostDom) {
          mounted.hostDom.appendChild(mounted.childrenEl);
        }
        mountedRef.current = null;
      }
    };
  }, []);
  return targetRef;
}

// The interactive rating control — the React-driven part that distinguishes
// this demo from CardNode's static chrome. It mirrors the committed `rating`
// NodeState into React (via an update listener) and writes edits back through
// editor.update, so the value participates in undo/redo, copy/paste and collab
// like any other model state. The buttons live under the contentEditable=false
// shell, so clicking them sets the rating without moving the editor selection.
function ReviewStars({
  editor,
  nodeKey,
}: {
  editor: LexicalEditor;
  nodeKey: NodeKey;
}): JSX.Element {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  useEffect(() => {
    const read = () => {
      const node = $getNodeByKey(nodeKey);
      setRating($isReviewNode(node) ? node.getRating() : 0);
    };
    editor.getEditorState().read(read);
    return editor.registerUpdateListener(({editorState}) =>
      editorState.read(read),
    );
  }, [editor, nodeKey]);
  const setStars = (value: number) =>
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isReviewNode(node)) {
        // Clicking the current top star clears the rating back to zero.
        node.setRating(value === rating ? 0 : value);
      }
    });
  const shown = hover || rating;
  return (
    <div
      className="lexical-review-stars"
      aria-label={`Rating: ${rating} of 5`}
      onMouseLeave={() => setHover(0)}>
      {STARS.map(value => (
        <button
          key={value}
          type="button"
          className={
            value <= shown
              ? 'lexical-review-star lexical-review-star-on'
              : 'lexical-review-star'
          }
          aria-pressed={value <= rating}
          aria-label={`${value} star${value === 1 ? '' : 's'}`}
          onMouseEnter={() => setHover(value)}
          onClick={() => setStars(value)}>
          ★
        </button>
      ))}
    </div>
  );
}

function ReviewChrome({
  editor,
  nodeKey,
}: {
  editor: LexicalEditor;
  nodeKey: NodeKey;
}): JSX.Element {
  // The chrome is foreign DOM injected into a managed element's host DOM; mark
  // it unmanaged synchronously (a ref callback runs before any layout effect
  // moves the editable regions into it) so the mutation observer skips the
  // whole chrome subtree instead of evicting it as unknown DOM.
  const chromeRef = useCallback((el: HTMLDivElement | null) => {
    if (el !== null) {
      setDOMUnmanaged(el);
    }
  }, []);
  const authorRef = useLexicalSlotRef<HTMLDivElement>(
    editor,
    nodeKey,
    'author',
  );
  const childrenRef = useReviewChildren<HTMLDivElement>(editor, nodeKey);
  // Testimonial layout: rating, then the quoted prose, then the attribution.
  return (
    <div className="lexical-review-chrome" ref={chromeRef}>
      <ReviewStars editor={editor} nodeKey={nodeKey} />
      <div className="lexical-review-body" ref={childrenRef} />
      <div className="lexical-review-author" ref={authorRef} />
    </div>
  );
}

// React presentation for every ReviewNode: a portal into each host's DOM
// renders the chrome, and the chrome attaches the editable regions and the
// rating widget. This is the ElementNode equivalent of a DecoratorNode's
// decorate(), implemented in userland with a mutation listener.
export function ReviewPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [keys, setKeys] = useState<ReadonlySet<NodeKey>>(() => new Set());
  useEffect(() => {
    return editor.registerMutationListener(
      ReviewNode,
      mutations => {
        setKeys(prev => {
          let changed = false;
          const next = new Set(prev);
          for (const [key, mutation] of mutations) {
            if (mutation === 'destroyed') {
              changed = next.delete(key) || changed;
            } else if (!next.has(key)) {
              next.add(key);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      {skipInitialization: false},
    );
  }, [editor]);
  return (
    <>
      {Array.from(keys, key => {
        const dom = editor.getElementByKey(key);
        return dom === null
          ? null
          : createPortal(
              <ReviewChrome editor={editor} nodeKey={key} />,
              dom,
              key,
            );
      })}
    </>
  );
}

export const ReviewExtension = /* @__PURE__ */ defineExtension({
  name: '@lexical/playground/Review',
  nodes: [ReviewNode],
  register: editor => {
    return editor.registerCommand<void>(
      INSERT_REVIEW_COMMAND,
      () => {
        $insertNodeToNearestRoot($createReviewNode());
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  },
});
