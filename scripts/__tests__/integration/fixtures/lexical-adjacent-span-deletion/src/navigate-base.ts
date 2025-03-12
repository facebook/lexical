import { LexicalEditor } from 'lexical';
import { useLayoutEffect, useRef, type RefObject } from 'react';

import { getGraphemeBoundaries } from './graphemes';
import {
  getEdgeTextNode,
  getFollowingNode,
  nodeOrParentElement,
} from './dom-utils';
import { isSafari } from './ua-utils';

// The following is not available in TypeScript yet but seems to be available in
// all the browsers we care about
declare global {
  interface Array<T> {
    findLast<S extends T>(
      predicate: (
        this: void,
        value: T,
        index: number,
        obj: readonly T[]
      ) => value is S,
      thisArg?: any
    ): S | undefined;
    findLast(
      predicate: (value: T, index: number, obj: readonly T[]) => unknown,
      thisArg?: any
    ): T | undefined;
    findLastIndex(
      predicate: (value: T, index: number, obj: T[]) => unknown,
      thisArg?: any
    ): number;
  }
}

// A simplified view of a keystroke containing just the fields we are concerned
// with.
type KeyStroke = { key: string; altKey: boolean; shiftKey: boolean };

// A hook to smooth out browser selection handling of mono ruby.
export function useNavigateBase(editor: LexicalEditor) {
  const previousFocus = useRef<SimpleSelectionPoint>([null, 0]);
  const lastKey = useRef<KeyStroke | undefined>(undefined);

  useLayoutEffect(() => {
    const root = editor.getRootElement();
    if (!root) {
      return;
    }

    const onSelectionChangeCallback = (event: Event) => {
      onSelectionChange({
        event,
        root,
        previousFocusRef: previousFocus,
        lastKey: lastKey.current,
      });
      // As best I can tell, Lexical (0.25~26+) sometimes does some selection
      // fix-ups in some browsers which we want to ignore so once we've
      // processed a selection change for one key, clear it so we don't treat
      // these fix-ups as coming from the keyboard.
      lastKey.current = undefined;
    };
    const onKeyDownCallback = (event: KeyboardEvent) => {
      lastKey.current = {
        key: event.key,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
      };
    };

    document.addEventListener('selectionchange', onSelectionChangeCallback, {
      capture: true,
    });
    document.addEventListener('keydown', onKeyDownCallback, { capture: true });

    return () => {
      document.removeEventListener(
        'selectionchange',
        onSelectionChangeCallback,
        { capture: true }
      );
      document.removeEventListener('keydown', onKeyDownCallback, {
        capture: true,
      });
    };
  }, [editor]);
}

type SimpleSelectionPoint = [Node | null, number];

function onSelectionChange({
  event,
  root,
  previousFocusRef,
  lastKey,
}: {
  event: Event;
  root: HTMLElement;
  previousFocusRef: RefObject<SimpleSelectionPoint>;
  lastKey?: KeyStroke;
}) {
  const selection = document.getSelection();
  const previousFocus = previousFocusRef.current;
  previousFocusRef.current = [
    selection?.focusNode || null,
    selection?.focusOffset || 0,
  ];

  if (
    // Check we have a fully-resolved selection
    !selection ||
    !selection.anchorNode ||
    !selection.focusNode ||
    // Check it's a selection we _should_ be fixing
    !root.contains(selection.focusNode)
  ) {
    return;
  }

  // Check there actually has been a change in selection (as opposed to
  // a redundant callback resulting from when _we_ changed the selection but
  // also updated our previousFocusRef).
  const nextFocus: SimpleSelectionPoint = [
    selection.focusNode,
    selection.focusOffset,
  ];
  if (previousFocus[0] === nextFocus[0] && previousFocus[1] === nextFocus[1]) {
    return;
  }

  // If the previous and new focus are on opposite sides of a base text span
  // boundary, move the focus one character further along.
  if (lastKey?.key === 'ArrowLeft' || lastKey?.key === 'ArrowRight') {
    const movement = movedAcrossSpanBoundary(previousFocus, nextFocus);
    if (movement) {
      selection.modify(
        lastKey.shiftKey ? 'extend' : 'move',
        movement,
        'character'
      );
      previousFocusRef.current = [
        selection.focusNode || null,
        selection.focusOffset,
      ];
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
  }

  // On Safari, the selection will sometimes jump out of the base text too
  // early, or even jump over the ruby altogether so we need to put it back in.
  if (!!lastKey && fixSafariNavigation(previousFocus, selection, lastKey)) {
    previousFocusRef.current = [
      selection.focusNode || null,
      selection.focusOffset,
    ];
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
}

function movedAcrossSpanBoundary(
  previousFocus: SimpleSelectionPoint,
  nextFocus: SimpleSelectionPoint
): 'left' | 'right' | null {
  const [previousNode, previousOffset] = previousFocus;
  const [nextNode, nextOffset] = nextFocus;

  // For now we have only ever seen this happen when the _previous_ focus is on
  // a text node.
  //
  // The _next_ focus can often land on a span, however, in Chrome and Safari
  // when extending the selection.
  if (!(previousNode instanceof Text)) {
    return null;
  }

  // Check we are in the same base container
  const baseTextContainer = nodeOrParentElement(previousNode)?.closest(
    '[data-type="ruby base"]'
  );
  if (!baseTextContainer || !baseTextContainer.contains(nextNode)) {
    return null;
  }

  // Check for a movement to the right
  if (
    previousNode.parentElement?.nextSibling === nodeOrParentElement(nextNode)
  ) {
    return previousOffset === previousNode.length && nextOffset === 0
      ? 'right'
      : null;
  }

  // Check for a movement to the left
  if (
    previousNode.parentElement?.previousSibling ===
    nodeOrParentElement(nextNode)
  ) {
    return previousOffset === 0 &&
      nextOffset ===
        (nextNode instanceof Text
          ? nextNode.length
          : nextNode?.childNodes.length || 0)
      ? 'left'
      : null;
  }

  return null;
}

function fixSafariNavigation(
  previousFocus: SimpleSelectionPoint,
  selection: Selection,
  lastKey: KeyStroke
): boolean {
  // We've only ever seen these cases in Webkit so don't bother with this
  // processing for more sensible browsers.
  if (!isSafari()) {
    return false;
  }

  // We are only interested in selection changes from arrow key movements
  if (lastKey.key !== 'ArrowLeft' && lastKey.key !== 'ArrowRight') {
    return false;
  }

  // Case 1 is where we jump over the selection altogether.
  //
  // We only want to apply this when Shift is not being pressed since if
  // Shift is being held, the focus _should_ jump over the ruby.
  const nextFocus: SimpleSelectionPoint = [
    selection.focusNode,
    selection.focusOffset,
  ];
  if (!lastKey.shiftKey && previousFocus[0] && nextFocus[0]) {
    const direction = lastKey.key === 'ArrowRight' ? 'right' : 'left';
    const [left, right] =
      direction === 'right'
        ? [previousFocus, nextFocus]
        : [nextFocus, previousFocus];
    const rubyElement = getEnclosedRubyElement(left, right);
    if (rubyElement) {
      const innerTextNode = getEdgeTextNode({
        node: rubyElement,
        edge: direction === 'right' ? 'left' : 'right',
        requireSelectable: true,
      });
      if (innerTextNode) {
        const offset = direction === 'right' ? 0 : innerTextNode.length;
        selection.setBaseAndExtent(
          innerTextNode,
          offset,
          innerTextNode,
          offset
        );
        return true;
      }
    }
  }

  // Case 2 is where the selection jumps out of the ruby base text too soon.
  //
  // This happens in both directions and can apply to a collapsed selection
  // or a non-collapsed selection.
  if (!nodeOrParentElement(nextFocus[0])?.closest('[data-type="ruby base"]')) {
    const expectedNextFocus = getNextBaseTextFocus({
      direction: lastKey.key === 'ArrowLeft' ? 'left' : 'right',
      // On Windows etc. it's the Ctrl key that triggers moving word-by-word but
      // since we're dealing with Safari, assume we're on a Mac where it's the
      // Option (Alt) key that is used for navigating by word boundary.
      granularity: lastKey.altKey ? 'word' : 'grapheme',
      previousFocus,
    });

    if (
      expectedNextFocus &&
      expectedNextFocus[0] &&
      (expectedNextFocus[0] !== nextFocus[0] ||
        expectedNextFocus[1] !== nextFocus[1])
    ) {
      selection.setBaseAndExtent(
        lastKey.shiftKey ? selection.anchorNode! : expectedNextFocus[0],
        lastKey.shiftKey ? selection.anchorOffset : expectedNextFocus[1],
        expectedNextFocus[0],
        expectedNextFocus[1]
      );
      return true;
    }
  }

  return false;
}

function getEnclosedRubyElement(
  left: SimpleSelectionPoint,
  right: SimpleSelectionPoint
): HTMLElement | null {
  const [leftNode, leftOffset] = left;
  // Is the left point on the right-hand edge of a text node?
  if (!(leftNode instanceof Text) || leftOffset !== leftNode.length) {
    return null;
  }

  // Is the left point followed by a ruby node?
  const nextNode = getFollowingNode({
    node: leftNode,
    direction: 'next',
    requireSelectable: false,
  });
  if (
    !(nextNode instanceof HTMLElement) ||
    nextNode.dataset.type !== 'ruby container'
  ) {
    return null;
  }

  // Is the right point on the left-hand edge of a text node?
  const [rightNode] = right;
  if (!(rightNode instanceof Text)) {
    return null;
  }

  // Is the right point preceded by a ruby node?
  const prevNode = getFollowingNode({
    node: rightNode,
    direction: 'previous',
    requireSelectable: false,
  });
  if (
    !(prevNode instanceof HTMLElement) ||
    prevNode.dataset.type !== 'ruby container'
  ) {
    return null;
  }

  // Is the adjacent ruby node the same node in both cases?
  return nextNode === prevNode ? nextNode : null;
}

function getNextBaseTextFocus({
  direction,
  granularity,
  previousFocus,
}: {
  direction: 'left' | 'right';
  granularity: 'grapheme' | 'word';
  previousFocus: SimpleSelectionPoint;
}): SimpleSelectionPoint | null {
  let [previousNode, previousOffset] = previousFocus;

  // Check that the previous focus was actually inside ruby base text container.
  const baseTextContainer = nodeOrParentElement(previousNode)?.closest(
    '[data-type="ruby base"]'
  );
  if (!baseTextContainer) {
    return null;
  }

  // Check that it's a mono ruby base (group ruby works just fine)
  if (baseTextContainer.children.length < 2) {
    return null;
  }

  // We are going to need Intl.Segmenter from this point on (fortunately Safari
  // should have it for all versions we care about).
  if (!('Segmenter' in Intl)) {
    return null;
  }

  // If the focus ended up on one of the base text spans (as it is want to do
  // when extending the selection), push it down to the nearest text node.
  if (previousNode instanceof Element) {
    previousNode = getEdgeTextNode({
      node: previousNode,
      edge: direction === 'right' ? 'left' : 'right',
      requireSelectable: true,
    });
    if (!previousNode) {
      console.assert(false, "Couldn't find the corresponding base text node");
    }
  }

  // Build up a view of the whole base text with a mapping back to individual
  // text nodes
  const toVisit: Array<Node> = [...baseTextContainer.children];
  const baseTextNodes: Array<{ node: Text; start: number }> = [];
  let baseText = '';
  let currentPosition = -1;
  for (const child of toVisit) {
    if (child instanceof Text) {
      if (child === previousNode) {
        currentPosition = baseText.length + previousOffset;
      }
      baseTextNodes.push({ node: child, start: baseText.length });
      baseText += child.textContent;
    } else if (child instanceof Element) {
      toVisit.push(...child.childNodes);
    }
  }

  // Check we have a current position in the base text
  if (currentPosition === -1) {
    console.assert(false, 'Failed to find our position in the base text');
    return null;
  }

  // Find out where we should be next
  const nextPosition = getNextPosition({
    currentPosition,
    direction,
    granularity,
    text: baseText,
  });

  if (nextPosition === -1) {
    return null;
  }

  // Find the first node that full contains the next position
  const nextNode = baseTextNodes.findLast((b) => b.start <= nextPosition);
  if (!nextNode) {
    console.assert(false, 'Failed to find corresponding base text node');
    return null;
  }

  const nextOffset = nextPosition - nextNode.start;
  return [nextNode.node, nextOffset];
}

function getNextPosition({
  currentPosition,
  direction,
  granularity,
  text,
}: {
  currentPosition: number;
  direction: 'left' | 'right';
  granularity: 'grapheme' | 'word';
  text: string;
}): number {
  const boundaries = getSegmentBoundaries(text, granularity);

  // Find our position in the segments
  const segment = boundaries.findLastIndex((b) => b <= currentPosition);
  if (segment === -1) {
    console.assert(false, 'Failed to find the current segment');
    return -1;
  }

  // Find the next position
  let nextPosition: number;
  if (direction === 'left') {
    // Go to the start of the current segment
    nextPosition = boundaries[segment]!;

    // But if we were already there, we need to go to the start of the previous
    // segment.
    if (currentPosition === nextPosition) {
      if (segment === 0) {
        return -1;
      }
      nextPosition = boundaries[segment - 1]!;
    }
  } else {
    // Go to the next boundary, unless we are already at the end
    if (segment >= boundaries.length - 1) {
      return -1;
    } else {
      nextPosition = boundaries[segment + 1]!;
    }
  }

  return nextPosition;
}

function getSegmentBoundaries(text: string, granularity: 'grapheme' | 'word') {
  if (granularity === 'grapheme') {
    return getGraphemeBoundaries(text);
  }

  // Segment the text by word
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
  const segments = [...segmenter.segment(text)].filter((s) => s.isWordLike);
  if (!segments.length) {
    return [];
  }

  return [...segments.map((s) => s.index), text.length];
}
