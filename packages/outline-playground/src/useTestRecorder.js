/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor, View, ViewModel} from 'outline';

import {createTextNode} from 'outline';
import {createParagraphNode} from 'outline/ParagraphNode';
import useEvent from './useEvent';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

const MODIFIER_KEYS = [
  'Alt',
  'AltLeft',
  'AltRight',
  'Control',
  'ControlLeft',
  'ControlRight',
  'Shift',
  'ShiftLeft',
  'ShiftRight',
  'Meta',
  'MetaLeft',
  'MetaRight',
];

const copy = (text: string | null) => {
  const textArea = document.createElement('textarea');
  textArea.value = text || '';
  textArea.style.position = 'absolute';
  textArea.style.opacity = '0';
  document.body && document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    const result = document.execCommand('copy');
    console.log(result);
  } catch (error) {
    console.error(error);
  }
  document.body && document.body.removeChild(textArea);
};

const download = (filename: string, text: string | null) => {
  var a = document.createElement('a');
  a.setAttribute(
    'href',
    'data:text/plain;charset=utf-8,' + encodeURIComponent(text || ''),
  );
  a.setAttribute('download', filename);
  a.style.display = 'none';
  document.body && document.body.appendChild(a);
  a.click();
  document.body && document.body.removeChild(a);
};

const getModifiers = (event: KeyboardEvent) => {
  const modifiers = [];
  if (event.altKey) {
    modifiers.push('Alt');
  }
  if (event.ctrlKey) {
    modifiers.push('Control');
  }
  if (event.shiftKey) {
    modifiers.push('Shift');
  }
  if (event.metaKey) {
    modifiers.push('Meta');
  }
  return modifiers;
};

const formatStep = (step) => {
  const formatOneStep = (name, value) => {
    switch (name) {
      case 'click': {
        return `      await page.mouse.click(${value.x}, ${value.y});`;
      }
      case 'press': {
        return `      await page.keyboard.press('${value}');`;
      }
      case 'type': {
        return `      await page.keyboard.type('${value}');`;
      }
      case 'snapshot': {
        return `      await assertHTMLSnapshot(page);
      await assertSelection(page, {
        anchorPath: [${value.anchorPath.toString()}],
        anchorOffset: ${value.anchorOffset},
        focusPath: [${value.focusPath.toString()}],
        focusOffset: ${value.focusOffset},
      });
`;
      }
      default:
        return ``;
    }
  };
  const formattedStep = formatOneStep(step.name, step.value);
  switch (step.count) {
    case 1:
      return formattedStep;
    case 2:
      return [formattedStep, formattedStep].join(`\n`);
    default:
      return `      await repeat(${step.count}, async () => {
  ${formattedStep}
      );`;
  }
};

// stolen from OutlineSelection-test
function sanitizeSelection(selection) {
  let {anchorNode, anchorOffset, focusNode, focusOffset} = selection;
  if (anchorOffset !== 0) {
    anchorOffset--;
  }
  if (focusOffset !== 0) {
    focusOffset--;
  }
  return {anchorNode, focusNode, anchorOffset, focusOffset};
}

function getPathFromNodeToEditor(node: Node, rootElement) {
  let currentNode = node;
  const path = [];
  while (currentNode !== rootElement) {
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

export default function useStepRecorder(
  editor: OutlineEditor,
): [React$Node, React$Node] {
  const [steps, setSteps] = useState<Steps>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [, setCurrentInnerHTML] = useState('');
  const [templatedTest, setTemplatedTest] = useState('');
  const previousSelectionRef = useRef(null);
  const skipNextSelectionChangeRef = useRef(false);
  const preRef = useRef(null);

  const getCurrentEditor = useCallback(() => {
    return editor;
  }, [editor]);

  const generateTestContent = useCallback(() => {
    const rootElement = editor.getRootElement();
    const browserSelection = window.getSelection();

    if (
      rootElement == null ||
      browserSelection == null ||
      browserSelection.anchorNode == null ||
      browserSelection.focusNode == null ||
      !rootElement.contains(browserSelection.anchorNode) ||
      !rootElement.contains(browserSelection.focusNode)
    ) {
      return null;
    }

    return `
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, assertHTMLSnapshot, assertSelection} from '../utils';

describe('Regression test', () => {
  initializeE2E((e2e) => {
    it('passes the test', async () => {
      const {page} = e2e;

      await page.focus('div.editor');
${steps.map(formatStep).join(`\n`)}
    });
});
    `;
  }, [editor, steps]);

  // just a wrapper around inserting new actions so that we can
  // coalesce some actions like insertText/moveNativeSelection
  const pushStep = useCallback(
    (name, value) => {
      setSteps((currentSteps) => {
        // trying to group steps
        const lastStep = steps[steps.length - 1];
        if (lastStep && lastStep.name === name) {
          if (name === 'type') {
            // for typing events we just append the text
            lastStep.value += value;
            return [...currentSteps];
          } else {
            // for other events we bump the counter if their values are the same
            if (lastStep.value === value) {
              lastStep.count += 1;
              return [...currentSteps];
            }
          }
        }
        // could not group, just append a new one
        return [...currentSteps, {name, value, count: 1}];
      });
    },
    [steps, setSteps],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isRecording) {
        return;
      }
      const modifiers = getModifiers(event);
      if (modifiers.length > 0) {
        if (!MODIFIER_KEYS.includes(event.code) && event.key !== 'Dead') {
          pushStep('press', `${modifiers.join('+')}+${event.code}`);
        }
      } else {
        if ([...event.key].length > 1) {
          pushStep('press', event.key);
        } else {
          pushStep('type', event.key);
        }
      }
    },
    [pushStep, isRecording],
  );

  const onClick = useCallback(
    (event: MouseEvent) => {
      if (!isRecording) {
        return;
      }
      pushStep('click', {
        x: event.x,
        y: event.y,
      });
    },
    [pushStep, isRecording],
  );

  useEvent(editor, 'keydown', onKeyDown);
  useEvent(editor, 'click', onClick);

  useLayoutEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTo(0, preRef.current.scrollHeight);
    }
  }, [generateTestContent]);

  useEffect(() => {
    if (steps) {
      setTemplatedTest(generateTestContent());
      if (preRef.current) {
        preRef.current.scrollTo(0, preRef.current.scrollHeight);
      }
    }
  }, [generateTestContent, steps]);

  useEffect(() => {
    const removeUpdateListener = editor.addListener(
      'update',
      (viewModel: ViewModel) => {
        if (!isRecording) {
          return;
        }
        const currentSelection = viewModel._selection;
        const previousSelection = previousSelectionRef.current;
        const skipNextSelectionChange = skipNextSelectionChangeRef.current;
        if (previousSelection !== currentSelection) {
          if (!viewModel.hasDirtyNodes() && !skipNextSelectionChange) {
            const browserSelection = window.getSelection();
            if (
              browserSelection.anchorNode == null ||
              browserSelection.focusNode == null
            ) {
              return;
            }
          }
          previousSelectionRef.current = currentSelection;
        }
        skipNextSelectionChangeRef.current = false;
        setTemplatedTest(generateTestContent());
      },
    );
    return removeUpdateListener;
  }, [editor, generateTestContent, isRecording, pushStep]);

  // save innerHTML
  useEffect(() => {
    if (!isRecording) {
      return;
    }
    const removeUpdateListener = editor.addListener('update', (viewModel) => {
      const rootElement = editor.getRootElement();
      if (rootElement !== null) {
        setCurrentInnerHTML(rootElement?.innerHTML);
      }
    });
    return removeUpdateListener;
  }, [editor, isRecording]);

  // clear editor and start recording
  const toggleEditorSelection = useCallback(
    (currentEditor) => {
      if (!isRecording) {
        currentEditor.update(
          (view: View) => {
            const root = view.getRoot();
            root.clear();
            const text = createTextNode();
            root.append(createParagraphNode().append(text));
            text.select();
          },
          'useStepRecorder',
        );
        setSteps([]);
      }
      setIsRecording((currentIsRecording) => !currentIsRecording);
    },
    [isRecording],
  );

  // hotkey
  // useEffect(() => {
  //   const cb = (event: KeyboardEvent) => {
  //     if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
  //       toggleEditorSelection(getCurrentEditor());
  //     }
  //   };
  //   document.addEventListener('keydown', cb);
  //   return () => {
  //     document.removeEventListener('keydown', cb);
  //   };
  // }, [getCurrentEditor, toggleEditorSelection]);

  const onSnapshotClick = useCallback(() => {
    if (!isRecording) {
      return;
    }
    const browserSelection = window.getSelection();
    if (
      browserSelection.anchorNode == null ||
      browserSelection.focusNode == null
    ) {
      return;
    }
    const {anchorNode, anchorOffset, focusNode, focusOffset} =
      sanitizeSelection(browserSelection);
    const anchorPath = getPathFromNodeToEditor(
      anchorNode,
      getCurrentEditor().getRootElement(),
    );
    const focusPath = getPathFromNodeToEditor(
      focusNode,
      getCurrentEditor().getRootElement(),
    );
    pushStep('snapshot', {
      anchorPath,
      anchorNode,
      anchorOffset,
      focusPath,
      focusNode,
      focusOffset,
    });
  }, [pushStep, isRecording, getCurrentEditor]);

  const onCopyClick = useCallback(() => {
    copy(generateTestContent());
  }, [generateTestContent]);

  const onDownloadClick = useCallback(() => {
    download('test.js', generateTestContent());
  }, [generateTestContent]);

  const button = (
    <button
      id="test-recorder-button"
      className={`editor-dev-button ${isRecording ? 'active' : ''}`}
      onClick={() => toggleEditorSelection(getCurrentEditor())}
      title={isRecording ? 'Disable test recorder' : 'Enable test recorder'}
    />
  );
  const output = isRecording ? (
    <div className="test-recorder-output">
      <div className="test-recorder-toolbar">
        <button
          className="test-recorder-button"
          id="test-recorder-button-snapshot"
          title="Insert snapshot"
          onClick={onSnapshotClick}
        />
        <button
          className="test-recorder-button"
          id="test-recorder-button-copy"
          title="Copy to clipboard"
          onClick={onCopyClick}
        />
        <button
          className="test-recorder-button"
          id="test-recorder-button-download"
          title="Download as a file"
          onClick={onDownloadClick}
        />
      </div>
      <pre id="test-recorder" ref={preRef}>
        {templatedTest}
      </pre>
    </div>
  ) : null;

  return [button, output];
}
