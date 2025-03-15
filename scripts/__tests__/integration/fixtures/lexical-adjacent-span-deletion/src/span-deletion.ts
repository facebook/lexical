import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_NORMAL,
  DELETE_CHARACTER_COMMAND,
  LexicalEditor,
  RangeSelection,
} from 'lexical';
import { useEffect } from 'react';

import { isRbNode } from './RbNode';

export function useSpanDeletion(editor: LexicalEditor) {
  useEffect(
    () =>
      editor.registerCommand<boolean>(
        DELETE_CHARACTER_COMMAND,
        onDeleteCharacterCommand,
        COMMAND_PRIORITY_NORMAL
      ),
    [editor]
  );
}

function onDeleteCharacterCommand(isBackwardDeletion: boolean) {
  const selection = $getSelection();

  // We only know how to deal with range selections. For other types of
  // selections they have probably selected whole ruby nodes so the default
  // handling should be fine.
  if (!$isRangeSelection(selection)) {
    return false;
  }

  // If we have a collapsed selection it sometimes needs to be adjusted in
  // order to correctly cross the boundary between spans.
  if ($adjustSpanDeletion({ isBackwardDeletion, selection })) {
    return false;
  }

  // Defer to the default command handler.
  return false;
}

function $adjustSpanDeletion({
  isBackwardDeletion,
  selection,
}: {
  isBackwardDeletion: boolean;
  selection: RangeSelection;
}): boolean {
  // We are only interested in collapsed selections
  if (!selection.isCollapsed()) {
    return false;
  }

  // Check that the focus is in an rb text node.
  const focusNode = selection.focus.getNode();
  const rbParent = focusNode.getParent();
  if (!$isTextNode(focusNode) || !isRbNode(rbParent)) {
    return false;
  }

  // Check that we are at the edge of our text node
  //
  // This is complicated by Lexical's normalization of selection boundaries.
  //
  // Normally (sorry) we'd be looking for:
  //
  // a) A forwards deletion where the caret is at the _end_ of a text node, or
  // b) A backwards deletion where the caret is at the _start_ of a text node.
  //
  // However, for (b), when the caret is at the start of a text node and the
  // preceding node is also a text node, Lexical will move the caret to the end
  // of the previous text node:
  //
  //   https://github.com/facebook/lexical/blob/3d36e4bac444297607d35107c1a6907e50a2760f/packages/lexical/src/LexicalSelection.ts#L2181-L2183
  //
  // As a result, there will be a discrepancy between the DOM selection and the
  // Lexical selection in this case.
  //
  // To accommodate this, when we are dealing with a backwards deletion, we also
  // need to manually extend the selection for the case when it is at the end of
  // a text node since the _actual_ DOM selection might, in fact, be at start of
  // the next node.
  const onForwardsBoundary =
    !isBackwardDeletion &&
    selection.focus.offset === focusNode.getTextContentSize() &&
    $isTextNode(focusNode.getNextSibling());

  const onBackwardsBoundary =
    isBackwardDeletion &&
    ((selection.focus.offset === 0 &&
      $isTextNode(focusNode.getPreviousSibling())) ||
      selection.focus.offset === focusNode.getTextContentSize());

  if (!onForwardsBoundary && !onBackwardsBoundary) {
    return false;
  }

  // Update the selection
  console.info('Attempting to extend selection');
  selection.modify('extend', isBackwardDeletion, 'character');

  // (WebKit-specific handling omitted)

  return true;
}
