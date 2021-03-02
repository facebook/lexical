/**
 *
 * @flow strict-local
 */

import type {OutlineEditor, View} from 'outline';

// $FlowFixMe
import {createPortal} from 'react-dom';
import {createTextNode} from 'outline';
import {createParagraphNode} from 'outline-extensions/ParagraphNode';
import useEvent from './useEvent';

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

import React, {useState, useCallback, useRef, useEffect} from 'react';

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

function formatSteps(steps) {
  return steps.map(([action, value]) => {
    return `${action}(${
      value
        ? Array.isArray(value)
          ? value.join(',')
          : typeof value === 'string'
          ? `"${value}"`
          : value
        : ''
    })`;
  });
}

// $FlowFixMe TODO
type Steps = Array<any>;

const AVAILABLE_INPUTS = {
  deleteBackward: isDeleteBackward,
  deleteForward: isDeleteForward,
  deleteWordBackward: isDeleteWordBackward,
  deleteWordForward: isDeleteWordForward,
  deleteLineForward: isDeleteLineForward,
  deleteLineBackward: isDeleteLineBackward,
  insertParagraph: isParagraph,
  insertLinebreak: isLineBreak,
  undo: isUndo,
  redo: isRedo,
  formatBold: isBold,
  formatItalic: isItalic,
  moveBackward: (e) =>
    e.key === 'ArrowLeft' &&
    !e.shiftKey &&
    !e.metaKey &&
    !e.ctrlKey &&
    !e.altKey,
  moveForward: (e) =>
    e.key === 'ArrowRight' &&
    !e.shiftKey &&
    !e.metaKey &&
    !e.ctrlKey &&
    !e.altKey,
  // I imagine there's a smarter way of checking that it's not a special character.
  // this serves to filter out selection inputs like `ArrowLeft` etc that we handle elsewhere
  insertText: (e) => e.key.length === 1,
};

const COALESCABLE_COMMANDS = [
  'insertText',
  'moveNativeSelection',
  'undo',
  'redo',
  'moveBackward',
  'moveForward',
  'deleteBackward',
  'deleteForward',
  'deleteWordForward',
  'deleteWordBackward',
];

export default function useStepRecorder(editor: OutlineEditor): React$Node {
  const [steps, setSteps] = useState<Steps>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [currentInnerHTML, setCurrentInnerHTML] = useState('');
  const [templatedTest, setTemplatedTest] = useState('');
  const previousSelectionRef = useRef(null);
  const currentEditorRef = useRef(editor);
  const skipNextSelectionChangeRef = useRef(false);

  useEffect(() => {
    currentEditorRef.current = editor;
  }, [editor]);

  const getCurrentEditor = useCallback(() => {
    return currentEditorRef.current;
  }, []);

  const generateTestContent = useCallback(() => {
    const editorElement = editor.getEditorElement();
    const browserSelection = window.getSelection();

    if (
      editorElement == null ||
      browserSelection == null ||
      browserSelection.anchorNode == null ||
      browserSelection.focusNode == null ||
      !editorElement.contains(browserSelection.anchorNode) ||
      !editorElement.contains(browserSelection.focusNode)
    ) {
      return null;
    }

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
    ${formatSteps(steps).join(',\n    ')}
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

  // just a wrapper around inserting new actions so that we can
  // coalesce some actions like insertText/moveNativeSelection
  const pushStep = useCallback(
    (step, value) => {
      setSteps((currentSteps) => {
        if (
          COALESCABLE_COMMANDS.includes(step) &&
          currentSteps.length > 0 &&
          currentSteps[currentSteps.length - 1][0] === step
        ) {
          const newSteps = currentSteps.slice();
          const [lastStep, lastStepValue] = newSteps.pop();
          if (lastStep === 'insertText') {
            newSteps.push(['insertText', lastStepValue.concat(value)]);
          } else if (lastStep === 'moveNativeSelection') {
            newSteps.push([lastStep, value]);
          } else {
            newSteps.push([lastStep, (lastStepValue ?? 1) + 1]);
          }
          return newSteps;
        }
        return [...currentSteps, [step, value]];
      });
    },
    [setSteps],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent, view) => {
      if (!isRecording) {
        return;
      }
      if (event.key === 'v' && (event.metaKey || event.ctrlKey)) {
        return;
      }
      const maybeCommand = Object.keys(AVAILABLE_INPUTS).find((command) =>
        AVAILABLE_INPUTS[command]?.(event),
      );
      if (maybeCommand != null) {
        if (maybeCommand === 'insertText') {
          pushStep('insertText', event.key);
        } else {
          pushStep(maybeCommand);
        }
        if (['moveBackward', 'moveForward'].includes(maybeCommand)) {
          skipNextSelectionChangeRef.current = true;
        }
      }
    },
    [isRecording, pushStep],
  );

  useEvent(editor, 'keydown', onKeyDown);

  const onPaste = useCallback(
    (event: ClipboardEvent, view) => {
      if (!isRecording) {
        return;
      }
      const clipboardData = event.clipboardData;
      const richData = clipboardData?.getData('application/x-outline-nodes');
      if (richData) {
        // TODO
        return;
      }
      const data = clipboardData?.getData('text/plain');
      if (data) {
        pushStep('paste', data);
      }
    },
    [isRecording, pushStep],
  );

  useEvent(editor, 'paste', onPaste);

  useEffect(() => {
    if (steps) {
      setTemplatedTest(generateTestContent());
    }
  }, [generateTestContent, steps]);

  useEffect(() => {
    const removeUpdateListener = editor.addUpdateListener((viewModel) => {
      const currentSelection = viewModel._selection;
      const previousSelection = previousSelectionRef.current;
      const editorElement = editor.getEditorElement();
      const skipNextSelectionChange = skipNextSelectionChangeRef.current;
      if (previousSelection !== currentSelection) {
        if (
          !viewModel.hasDirtyNodes() &&
          isRecording &&
          !skipNextSelectionChange
        ) {
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
      skipNextSelectionChangeRef.current = false;
      setTemplatedTest(generateTestContent());
    });
    return removeUpdateListener;
  }, [editor, generateTestContent, isRecording, pushStep]);

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

  const toggleEditorSelection = useCallback(
    (currentEditor) => {
      if (!isRecording) {
        currentEditor.update((view: View) => {
          const root = view.getRoot();
          root.clear();
          const text = createTextNode();
          root.append(createParagraphNode().append(text));
          text.select();
        });
        setSteps([]);
      }
      setIsRecording((currentIsRecording) => !currentIsRecording);
    },
    [isRecording],
  );

  useEffect(() => {
    const cb = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        toggleEditorSelection(getCurrentEditor());
      }
    };
    document.addEventListener('keydown', cb);
    return () => {
      document.removeEventListener('keydown', cb);
    };
  }, [getCurrentEditor, toggleEditorSelection]);

  return createPortal(
    <>
      <button
        id="step-recorder-button"
        className={isRecording ? 'recording' : null}
        onClick={() => toggleEditorSelection(getCurrentEditor())}
        title={isRecording ? 'Disable step recorder' : 'Enable step recorder'}>
        <span></span>
      </button>
      {steps.length !== 0 && <pre id="step-recorder">{templatedTest}</pre>}
    </>,
    document.body,
  );
}
