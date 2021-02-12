/**
 *
 * @flow strict-local
 */

import type {OutlineEditor, View} from 'outline';

// $FlowFixMe
import {createPortal} from 'react-dom';

import {
  isDeleteBackward,
  isDeleteForward,
  isDeleteLineBackward,
  isDeleteLineForward,
  isDeleteWordBackward,
  isDeleteWordForward,
  isLineBreak,
  isParagraph,
  isBold,
  isItalic,
  isUndo,
  isRedo,
} from 'outline-react/OutlineHotKeys';

import useOutlineEvent from 'outline-react/useOutlineEvent';

import React, {useState, useCallback, useMemo, useRef, useEffect} from 'react';

// stolen from OutlineSelection-test
function sanitizeSelectionWithEmptyTextNodes(selection) {
  const {anchorNode, focusNode} = selection;
  if (anchorNode === focusNode && anchorNode.textContent === '\uFEFF') {
    return {anchorNode, focusNode, anchorOffset: 0, focusOffset: 0};
  }
  return selection;
}

function sanitizeHTML(html) {
  // Remove the special space characters
  return html.replace(/\uFEFF/g, '');
}

function getPathFromNodeToEditor(node: Node, editorElement) {
  let currentNode = node;
  const path = [];
  while (currentNode !== editorElement) {
    path.unshift(
      Array.from(currentNode?.parentNode?.childNodes ?? []).indexOf(
        currentNode,
      ),
    );
    currentNode = currentNode?.parentNode;
  }
  return path;
}

// $FlowFixMe TODO
type Steps = Array<any>;

export default function useStepRecorder(editor: OutlineEditor): React$Node {
  const [steps, setSteps] = useState<Steps>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [currentInnerHTML, setCurrentInnerHTML] = useState('');
  const previousSelectionRef = useRef(null);

  // just a wrapper around inserting new actions so that we can
  // coalesce some actions like insertText/moveNativeSelection
  const pushStep = useCallback(
    (step, value) => {
      setSteps((currentSteps) => {
        if (
          ['insertText', 'moveNativeSelection'].includes(step) &&
          currentSteps.length > 0 &&
          currentSteps[currentSteps.length - 1][0] === step
        ) {
          const newSteps = currentSteps.slice();
          const [lastStep, lastStepValue] = newSteps.pop();
          if (lastStep === 'insertText') {
            newSteps.push(['insertText', lastStepValue.concat(value)]);
          } else {
            newSteps.push([lastStep, value]);
          }
          return newSteps;
        }
        return [...currentSteps, [step, value]];
      });
    },
    [setSteps],
  );

  const onKeyDown = useCallback(
    (event, view) => {
      if (!isRecording) {
        return;
      }
      if (isDeleteBackward(event)) {
        pushStep('deleteBackward');
      } else if (isDeleteForward(event)) {
        pushStep('deleteForward');
      } else if (isDeleteLineBackward(event)) {
        pushStep("TODO: this operation isn't supported yet");
      } else if (isDeleteLineForward(event)) {
        pushStep("TODO: this operation isn't supported yet");
      } else if (isDeleteWordBackward(event)) {
        pushStep('deleteWordBackward');
      } else if (isDeleteWordForward(event)) {
        pushStep('deleteWordForward');
      } else if (isParagraph(event)) {
        pushStep('insertParagraph');
      } else if (isLineBreak(event)) {
        pushStep('insertLinebreak');
      } else if (isUndo(event)) {
        pushStep("TODO: this operation isn't supported yet");
      } else if (isRedo(event)) {
        pushStep("TODO: this operation isn't supported yet");
      } else if (isBold(event)) {
        pushStep('formatBold');
      } else if (isItalic(event)) {
        pushStep('formatItalic');
      } else if (event.key.length === 1) {
        // I imagine there's a smarter way of checking that it's not a special character.
        // this serves to filter out selection inputs like `ArrowLeft` etc that we handle elsewhere
        pushStep('insertText', event.key);
      }
    },
    [isRecording, pushStep],
  );

  useOutlineEvent(editor, 'keydown', onKeyDown);

  useEffect(() => {
    const removeUpdateListener = editor.addUpdateListener((viewModel) => {
      const currentSelection = viewModel.selection;
      const previousSelection = previousSelectionRef.current;
      const editorElement = editor.getEditorElement();
      if (previousSelection !== currentSelection) {
        if (!viewModel.hasDirtyNodes() && isRecording) {
          const browserSelection = window.getSelection();
          if (
            browserSelection.anchorNode == null ||
            browserSelection.focusNode == null
          ) {
            return;
          }
          const {
            anchorNode,
            anchorOffset,
            focusNode,
            focusOffset,
          } = sanitizeSelectionWithEmptyTextNodes(browserSelection);
          pushStep('moveNativeSelection', [
            `[${getPathFromNodeToEditor(
              anchorNode,
              editorElement,
            ).toString()}]`,
            anchorOffset,
            `[${getPathFromNodeToEditor(focusNode, editorElement).toString()}]`,
            focusOffset,
          ]);
        }
        previousSelectionRef.current = currentSelection;
      }
    });
    return removeUpdateListener;
  }, [editor, isRecording, pushStep]);

  useEffect(() => {
    if (!isRecording) {
      return;
    }
    const removeUpdateListener = editor.addUpdateListener((viewModel) => {
      const editorElement = editor.getEditorElement();
      if (editorElement !== null) {
        setCurrentInnerHTML(editorElement?.innerHTML);
      }
    });
    return removeUpdateListener;
  }, [editor, isRecording]);

  const testContent = useMemo(() => {
    const editorElement = editor.getEditorElement();
    const browserSelection = window.getSelection();

    if (
      editorElement == null ||
      browserSelection == null ||
      browserSelection.anchorNode == null ||
      browserSelection.focusNode == null
    ) {
      return null;
    }

    const processedSteps = [];

    steps.forEach(([action, value]) => {
      processedSteps.push(
        `${action}(${
          value
            ? Array.isArray(value)
              ? value.join(',')
              : typeof value === 'string'
              ? `"${value}"`
              : value
            : ''
        })`,
      );
    });

    const {
      anchorNode,
      anchorOffset,
      focusNode,
      focusOffset,
    } = sanitizeSelectionWithEmptyTextNodes(browserSelection);
    return `
{
  name: '<YOUR TEST NAME>',
  inputs: [
    ${processedSteps.join(',\n    ')}
  ],
  expectedHTML: '<div contenteditable="true" data-outline-editor="true">${sanitizeHTML(
    currentInnerHTML,
  )}</div>',
  expectedSelection: {
    anchorPath: [${getPathFromNodeToEditor(
      anchorNode,
      editorElement,
    ).toString()}],
    anchorOffset: ${anchorOffset},
    focusPath: [${getPathFromNodeToEditor(
      focusNode,
      editorElement,
    ).toString()}],
    focusOffset: ${focusOffset},
  },
},
    `;
  }, [currentInnerHTML, editor, steps]);

  return createPortal(
    <>
      <button
        id="step-recorder-button"
        onClick={() => {
          if (!isRecording) {
            editor.update(
              (view: View) => {
                view.getRoot().clear();
                view.clearSelection();
              },
              () => {
                editor.getEditorElement()?.focus();
              },
            );
            setSteps([]);
          }
          setIsRecording((currentIsRecording) => !currentIsRecording);
        }}>
        {isRecording ? 'STOP RECORDING' : 'RECORD TEST'}
      </button>
      {steps.length !== 0 && <pre id="step-recorder">{testContent}</pre>}
    </>,
    document.body,
  );
}
