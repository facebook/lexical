/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalEditable} from '@lexical/react/useLexicalEditable';
import {useLexicalNodeSelection} from '@lexical/react/useLexicalNodeSelection';
import {mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  $isElementNode,
  $isTextNode,
  CLICK_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
  NodeKey,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {ErrorBoundary} from 'react-error-boundary';

import EquationEditor from '../ui/EquationEditor';
import KatexRenderer from '../ui/KatexRenderer';
import {$isEquationNode} from './EquationNode';

type EquationComponentProps = {
  equation: string;
  inline: boolean;
  nodeKey: NodeKey;
};

export default function EquationComponent({
  equation,
  inline,
  nodeKey,
}: EquationComponentProps): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);
  const [equationValue, setEquationValue] = useState(equation);
  const [showEquationEditor, setShowEquationEditor] = useState<boolean>(false);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  // Promote a click on the rendered KaTeX into a NodeSelection on this
  // EquationNode. Without this, an EquationNode that is the only root
  // child has no way to receive a selection — lexical's generic click
  // handler does not turn DecoratorNode clicks into NodeSelection, so
  // `$getSelection()` would stay `null` and downstream commands
  // (Backspace, copy, ...) have nothing to act on.
  //
  // Listening through `CLICK_COMMAND` (instead of a React DOM `onClick`)
  // matches the ImageComponent pattern: the lexical command fires
  // *after* lexical's own selection normalization for the click, so the
  // NodeSelection we set here is not immediately overwritten by the
  // RangeSelection attempt that follows the native `selectionchange`.
  const onClick = useCallback(
    (event: MouseEvent) => {
      if (!isEditable) {
        return false;
      }
      const dom = editor.getElementByKey(nodeKey);
      if (dom === null || !dom.contains(event.target as Node)) {
        return false;
      }
      if (event.shiftKey) {
        setSelected(!isSelected);
      } else {
        clearSelection();
        setSelected(true);
      }
      return true;
    },
    [clearSelection, editor, isEditable, isSelected, nodeKey, setSelected],
  );

  useEffect(() => {
    if (!isEditable) {
      return undefined;
    }
    return editor.registerCommand(CLICK_COMMAND, onClick, COMMAND_PRIORITY_LOW);
  }, [editor, isEditable, onClick]);

  // Remove this equation when the user presses Backspace inside an
  // already-empty `EquationEditor`. Without this, the LaTeX input
  // swallows the keystroke (its value is already empty so the browser
  // does nothing), and lexical never sees the deletion attempt — the
  // node would otherwise sit empty in the editor forever.
  const onDeleteEmpty = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isEquationNode(node)) {
        return;
      }
      const prevSibling = node.getPreviousSibling();
      node.remove();
      if ($isElementNode(prevSibling) || $isTextNode(prevSibling)) {
        prevSibling.selectEnd();
      }
    });
  }, [editor, nodeKey]);

  // Mirror `isSelected` onto the keyed `<div|span class="editor-equation">`
  // (the element returned by `EquationNode.createDOM`) so the existing
  // `.editor-equation.focused` CSS rule renders the outline. React owns
  // the inner `KatexRenderer` subtree but not the keyed wrapper, so we
  // toggle the class imperatively.
  useEffect(() => {
    const dom = editor.getElementByKey(nodeKey);
    if (dom === null) {
      return;
    }
    if (isSelected && isEditable) {
      dom.classList.add('focused');
    } else {
      dom.classList.remove('focused');
    }
  }, [editor, nodeKey, isSelected, isEditable]);

  const onHide = useCallback(
    (restoreSelection?: boolean) => {
      setShowEquationEditor(false);
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isEquationNode(node)) {
          node.setEquation(equationValue);
          if (restoreSelection) {
            node.selectNext(0, 0);
          }
        }
      });
    },
    [editor, equationValue, nodeKey],
  );

  useEffect(() => {
    if (!showEquationEditor && equationValue !== equation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEquationValue(equation);
    }
  }, [showEquationEditor, equation, equationValue]);

  useEffect(() => {
    if (!isEditable) {
      return;
    }
    if (showEquationEditor) {
      return mergeRegister(
        editor.registerCommand(
          SELECTION_CHANGE_COMMAND,
          payload => {
            const activeElement = document.activeElement;
            const inputElem = inputRef.current;
            if (inputElem !== activeElement) {
              onHide();
            }
            return false;
          },
          COMMAND_PRIORITY_HIGH,
        ),
        editor.registerCommand(
          KEY_ESCAPE_COMMAND,
          payload => {
            const activeElement = document.activeElement;
            const inputElem = inputRef.current;
            if (inputElem === activeElement) {
              onHide(true);
              return true;
            }
            return false;
          },
          COMMAND_PRIORITY_HIGH,
        ),
      );
    }
    // Previously this branch promoted any NodeSelection on this
    // equation into the EquationEditor input automatically. That
    // collides with the new single-click → NodeSelection flow (a click
    // would immediately drop the user into the input). The double-click
    // gesture (`KatexRenderer.onDoubleClick`) is now the only path into
    // edit mode.
    return undefined;
  }, [editor, nodeKey, onHide, showEquationEditor, isEditable]);

  return (
    <>
      {showEquationEditor && isEditable ? (
        <EquationEditor
          equation={equationValue}
          setEquation={setEquationValue}
          inline={inline}
          onDeleteEmpty={onDeleteEmpty}
          ref={inputRef}
        />
      ) : (
        <ErrorBoundary
          onError={e =>
            editor._onError(
              e instanceof Error ? e : new Error(String(e), {cause: e}),
            )
          }
          fallback={null}>
          <KatexRenderer
            equation={equationValue}
            inline={inline}
            onDoubleClick={() => {
              if (isEditable) {
                setShowEquationEditor(true);
              }
            }}
          />
        </ErrorBoundary>
      )}
    </>
  );
}
