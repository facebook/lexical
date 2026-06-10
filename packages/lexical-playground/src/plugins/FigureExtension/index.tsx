/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalCommand, LexicalEditor, LexicalNode} from 'lexical';

import {NodeSelectionDataSelectedExtension} from '@lexical/extension';
import {$insertNodeToNearestRoot, mergeRegister} from '@lexical/utils';
import {
  $createNodeSelection,
  $getAdjacentNode,
  $getNearestNodeFromDOMNode,
  $getSelection,
  $getSlotHost,
  $isRangeSelection,
  $setSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_BEFORE_EDITOR,
  COMMAND_PRIORITY_BEFORE_LOW,
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  createCommand,
  defineExtension,
  isHTMLElement,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
} from 'lexical';

import {
  $createFigureNode,
  $isFigureNode,
  FigureNode,
} from '../../nodes/FigureNode';

export const INSERT_FIGURE_COMMAND: LexicalCommand<void> = createCommand(
  'INSERT_FIGURE_COMMAND',
);

// True when the keydown originated inside the equation editor's LaTeX
// textarea / input, where every arrow key belongs to that field's native
// caret. Consuming such a key (return true without preventDefault) lets the
// native caret move and stops the lower-priority lexical-rich-text arrow
// handler — which preventDefaults and steps the host's NodeSelection out,
// trapping the caret — from running. Mirrors the guard in
// $resolveFigureChromeTarget but scoped to the equation chrome, so an
// unrelated textarea / input that some other extension drops into the editor
// doesn't quietly swallow arrow keys here.
function isWithinSlotEditor(event: KeyboardEvent | null): boolean {
  const target = event?.target;
  return (
    isHTMLElement(target) &&
    target.closest('.editor-equation textarea, .editor-equation input') !== null
  );
}

// Promote a RangeSelection adjacent to a FigureNode boundary into a
// NodeSelection on the Figure, mirroring CardExtension. The Figure's only
// slot value is an atomic (non-inline) decorator, so the caret should step
// over the whole Figure rather than into the slot.
function $handleFigureArrow(
  event: KeyboardEvent | null,
  isBackward: boolean,
): boolean {
  if (isWithinSlotEditor(event)) {
    return true;
  }
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || event?.shiftKey) {
    return false;
  }
  const adjacent = $getAdjacentNode(selection.focus, isBackward);
  if (!$isFigureNode(adjacent)) {
    return false;
  }
  event?.preventDefault();
  const ns = $createNodeSelection();
  ns.add(adjacent.getKey());
  $setSelection(ns);
  return true;
}

// Resolve a click / mousedown target to the FigureNode a chrome interaction
// should select, or null when the target is outside the Figure or inside the
// equation editor's textarea / input (edit mode, where the native caret must
// be kept for LaTeX editing). Shared by the CLICK_COMMAND promotion and the
// mousedown caret suppression so the two stay in lockstep.
function $resolveFigureChromeTarget(
  editor: LexicalEditor,
  target: HTMLElement,
): FigureNode | null {
  if (
    target.closest('.editor-equation textarea, .editor-equation input') !== null
  ) {
    return null;
  }
  const node = $getNearestNodeFromDOMNode(target);
  if (node === null) {
    return null;
  }
  // The clicked node may be the slotted decorator, whose parent chain does not
  // reach the host (a slot value has __parent === null and is linked via
  // __slotHost). Climb getParent(), falling back to getSlotHost() at each slot
  // boundary, until we hit the Figure.
  let figure: FigureNode | null = null;
  for (
    let cursor: LexicalNode | null = node;
    cursor !== null;
    cursor = cursor.getParent() ?? $getSlotHost(cursor)
  ) {
    if ($isFigureNode(cursor)) {
      figure = cursor;
      break;
    }
  }
  if (figure === null) {
    return null;
  }
  const hostElement = editor.getElementByKey(figure.getKey());
  if (hostElement === null || !hostElement.contains(target)) {
    return null;
  }
  return figure;
}

export const FigureExtension = defineExtension({
  dependencies: [
    // The slotted decorator owns `useLexicalNodeSelection` for its own
    // selected outline. The Figure host has its own decorate() chrome but
    // doesn't subscribe to NodeSelection there, so this mirrors the host's
    // NodeSelection state onto a `data-selected` attribute and CSS renders
    // the host outline.
    configExtension(NodeSelectionDataSelectedExtension, {nodes: [FigureNode]}),
  ],
  name: '@lexical/playground/Figure',
  register: editor => {
    const onChromeMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!isHTMLElement(target)) {
        return;
      }
      const isChrome = editor.read(
        () => $resolveFigureChromeTarget(editor, target) !== null,
      );
      if (isChrome) {
        event.preventDefault();
      }
    };
    return mergeRegister(
      editor.registerCommand<void>(
        INSERT_FIGURE_COMMAND,
        () => {
          $insertNodeToNearestRoot($createFigureNode());
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand<KeyboardEvent | null>(
        KEY_ARROW_RIGHT_COMMAND,
        event => $handleFigureArrow(event, false),
        COMMAND_PRIORITY_BEFORE_EDITOR,
      ),
      editor.registerCommand<KeyboardEvent | null>(
        KEY_ARROW_LEFT_COMMAND,
        event => $handleFigureArrow(event, true),
        COMMAND_PRIORITY_BEFORE_EDITOR,
      ),
      // Up / down don't promote the Figure (there's no vertical step onto an
      // atom), but the equation editor still needs them: consume them while
      // its textarea is focused so the rich-text NodeSelection arrow handler
      // doesn't trap the caret.
      editor.registerCommand<KeyboardEvent | null>(
        KEY_ARROW_UP_COMMAND,
        isWithinSlotEditor,
        COMMAND_PRIORITY_BEFORE_EDITOR,
      ),
      editor.registerCommand<KeyboardEvent | null>(
        KEY_ARROW_DOWN_COMMAND,
        isWithinSlotEditor,
        COMMAND_PRIORITY_BEFORE_EDITOR,
      ),
      // A click anywhere on the Figure (its only content is an atomic
      // decorator slot value, never an editable region) selects the whole
      // Figure as a NodeSelection. This keeps the slotted decorator from
      // ever receiving its own lone NodeSelection — without it the
      // decorator's own command handlers run against a parentless slotted
      // node and throw. Double-click-to-edit stays alive because it is a
      // separate React onDoubleClick on the rendered content, not this
      // lexical CLICK_COMMAND.
      //
      // Registered at BEFORE_LOW so it runs ahead of the slotted decorator's
      // own CLICK_COMMAND handler (e.g. EquationComponent at LOW), which would
      // otherwise win the race and give the slot value a lone NodeSelection.
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        event => {
          const target = event.target;
          if (!isHTMLElement(target)) {
            return false;
          }
          const figure = $resolveFigureChromeTarget(editor, target);
          if (figure === null) {
            return false;
          }
          event.preventDefault();
          const ns = $createNodeSelection();
          ns.add(figure.getKey());
          $setSelection(ns);
          return true;
        },
        COMMAND_PRIORITY_BEFORE_LOW,
      ),
      // Suppress the native caret the browser would place at the mousedown
      // point before the CLICK_COMMAND above promotes the click to a
      // whole-Figure NodeSelection. Without this the caret flashes in the
      // clicked region for a frame. Equation-editor mousedowns fall through
      // (the textarea / input guard) so LaTeX editing keeps its caret.
      editor.registerRootListener((rootElement, prevRootElement) => {
        if (prevRootElement !== null) {
          prevRootElement.removeEventListener('mousedown', onChromeMouseDown);
        }
        if (rootElement !== null) {
          rootElement.addEventListener('mousedown', onChromeMouseDown);
        }
      }),
    );
  },
});
