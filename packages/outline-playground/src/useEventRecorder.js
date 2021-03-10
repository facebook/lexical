// @flow

import type {OutlineEditor} from 'outline';

import {useEffect} from 'react';

let startingTimeStamp = 0;

type LogEntryTarget = Array<number>;

type LogEntryEvent =
  | {type: 'compositionstart'}
  | {type: 'compositionupdate', data: string}
  | {type: 'compositionend', data: string}
  | {type: 'keydown', key: string, cancelled: boolean}
  | {type: 'keyup', key: string}
  | {type: 'focus'}
  | {type: 'blur'}
  | {type: 'click'}
  | {
      type: 'selectionchange',
      focusPath: LogEntryTarget,
      focusOffset: number,
      anchorPath: LogEntryTarget,
      anchorOffset: number,
    };

type LogEntry = {
  child: null | LogEntry,
  event: LogEntryEvent,
  parent: null | LogEntry,
  next: null | LogEntry,
  target: null | LogEntryTarget,
  time: number,
};

function isValidTarget(
  target: EventTarget,
  editorElement: HTMLElement,
): boolean {
  // $FlowFixMe: this will work
  return editorElement.contains(target);
}

function generateTestCaseFromLog(
  firstLogEntry: LogEntry,
  editor: OutlineEditor,
): void {
  const editorElement = editor.getEditorElement();
  if (!editorElement) {
    return;
  }
  let currentLogEntry = firstLogEntry;
  let testCase = '';
  let indentSpace = 0;
  let indent = '';

  const updateIndent = (diff: number): void => {
    indentSpace += diff;
    indent = ' '.repeat(indentSpace);
  };

  while (currentLogEntry !== null) {
    const {event} = currentLogEntry;
    if (event.type === 'focus') {
      testCase += `${indent}await page.focus('div.editor');\n`;
    } else if (event.type === 'blur') {
      testCase += `${indent}await page.$eval('div.editor', e => e.blur());\n`;
    } else if (event.type === 'keydown') {
      if (event.cancelled) {
        testCase += `${indent}await keydown(page, '${event.key}', true);\n`;
      } else {
        testCase += `${indent}await keydown(page, '${event.key}', false);\n`;
      }
    } else if (event.type === 'keyup') {
      testCase += `${indent}await page.keyboard.up('${event.key}');\n`;
    } else if (event.type === 'selectionchange') {
      const a = event.anchorPath.join(', ');
      const b = event.anchorOffset;
      const c = event.focusPath.join(', ');
      const d = event.focusOffset;
      testCase += `${indent}await select(page, [${a}], ${b}, [${c}], ${d});\n`;
    } else if (event.type === 'compositionstart') {
      testCase += `${indent}await composition(page, async (page, update, end) => {\n`;
      updateIndent(2);
    } else if (event.type === 'compositionupdate') {
      testCase += `${indent}await update('${event.data}');\n`;
    } else if (event.type === 'compositionend') {
      testCase += `${indent}await end('${event.data}');\n`;
      updateIndent(-2);
      testCase += `${indent}})\n`;
    }
    const child = currentLogEntry.child;
    if (child !== null) {
      currentLogEntry = child;
      continue;
    }
    const next = currentLogEntry.next;
    if (next === null) {
      const parent = currentLogEntry.parent;
      if (parent === null) {
        break;
      } else {
        currentLogEntry = parent.next;
        continue;
      }
    }
    currentLogEntry = next;
  }
  testCase += `${indent}await expectHTML(page, '${editorElement.innerHTML}');\n`;
  // Copy content to clipboard
  navigator.clipboard.writeText(testCase);
  console.log(testCase);
}

function getLogEntryTarget(
  target: EventTarget,
  editorElement: HTMLElement,
): LogEntryTarget {
  if (target === editorElement) {
    return [];
  }
  let path = [];
  if (!(target instanceof Node)) {
    throw new Error('This should never happen');
  }
  let node = target;
  while (true) {
    const parent = node.parentNode;
    if (parent == null) {
      throw new Error('This should never happen');
    } else if (node === editorElement) {
      break;
    }
    const childIndex = [...parent.childNodes].indexOf(node);
    path.push(childIndex);
    node = parent;
  }
  return path.reverse();
}

export default function useEventRecorder(editor: OutlineEditor) {
  useEffect(() => {
    const editorElement = editor.getEditorElement();

    if (editorElement !== null) {
      const activeKeys = new Map();
      let firstLogEntry = null;
      let currentLogEntry = null;
      let lastSelection = null;
      let enabled = false;

      startingTimeStamp = performance.now();

      function createLogEntry(
        event: LogEntryEvent,
        target: null | EventTarget,
        time: number,
      ): LogEntry {
        return {
          child: null,
          parent: null,
          next: null,
          time: Math.floor(time - startingTimeStamp),
          target:
            target === null ? null : getLogEntryTarget(target, editorElement),
          event,
        };
      }

      function getSelectionLogEntry(time: number): LogEntry | null {
        const {
          anchorNode,
          focusNode,
          anchorOffset,
          focusOffset,
        } = window.getSelection();
        if (
          lastSelection === null ||
          anchorNode !== lastSelection.anchorNode ||
          focusNode !== lastSelection.focusNode ||
          anchorOffset !== lastSelection.anchorOffset ||
          focusOffset !== lastSelection.focusOffset
        ) {
          if (
            !editorElement.contains(anchorNode) ||
            !editorElement.contains(focusNode)
          ) {
            lastSelection = null;
            return null;
          }
          lastSelection = {
            anchorNode,
            focusNode,
            anchorOffset,
            focusOffset,
          };
          return createLogEntry(
            {
              type: 'selectionchange',
              anchorPath: getLogEntryTarget(anchorNode, editorElement),
              anchorOffset: anchorOffset,
              focusPath: getLogEntryTarget(focusNode, editorElement),
              focusOffset: focusOffset,
            },
            null,
            time,
          );
        }
        return null;
      }

      function pushLogEntry(logEntry: LogEntry): void {
        if (firstLogEntry === null) {
          firstLogEntry = logEntry;
        } else if (currentLogEntry !== null) {
          if (logEntry.event.type === 'compositionstart') {
            currentLogEntry.child = logEntry;
            logEntry.parent = currentLogEntry;
          } else if (logEntry.event.type === 'compositionend') {
            const parent = currentLogEntry.parent;
            if (parent !== null) {
              parent.next = logEntry;
            }
          } else {
            currentLogEntry.next = logEntry;
            logEntry.parent = currentLogEntry.parent;
          }
        }
        currentLogEntry = logEntry;
      }

      function log(
        event: LogEntryEvent,
        target: EventTarget,
        time: number,
        skipSelectionDiff?: boolean,
      ): LogEntry {
        const selectionLogEntry = getSelectionLogEntry(time);
        if (selectionLogEntry !== null) {
          pushLogEntry(selectionLogEntry);
        }
        const entry = createLogEntry(event, target, time);
        pushLogEntry(entry);
        return entry;
      }

      const onCompositionStart = (event: Event) => {
        if (!enabled) {
          return;
        }
        const {target, timeStamp} = event;
        if (isValidTarget(target, editorElement)) {
          // Cancel any existing keydowns from entering text
          activeKeys.forEach((logEntry) => {
            const event = logEntry.event;
            if (event.type === 'keydown') {
              debugger;
              event.cancelled = true;
            }
          });
          log({type: 'compositionstart'}, target, timeStamp, true);
        }
      };

      const onCompositionUpdate = (event: Event) => {
        if (!enabled) {
          return;
        }
        // $FlowFixMe: we have no CompositionEvent, so we use Event
        const {data, target, timeStamp} = event;
        if (isValidTarget(target, editorElement)) {
          log({type: 'compositionupdate', data}, target, timeStamp);
        }
      };

      const onCompositionEnd = (event: Event) => {
        if (!enabled) {
          return;
        }
        // $FlowFixMe: we have no CompositionEvent, so we use Event
        const {data, target, timeStamp} = event;
        if (isValidTarget(target, editorElement)) {
          log({type: 'compositionend', data}, target, timeStamp, false);
        }
      };

      const onKeyDown = (event: KeyboardEvent) => {
        const {key, keyCode, target, timeStamp} = event;
        if (key === 'F12') {
          if (!enabled) {
            enabled = true;
          } else if (firstLogEntry !== null) {
            generateTestCaseFromLog(firstLogEntry, editor);
          }
          event.preventDefault();
          return;
        } else if (key === 'Dead') {
          return;
        }
        if (!enabled) {
          return;
        }
        if (isValidTarget(target, editorElement)) {
          if (activeKeys.has(key)) {
            return;
          }
          // Seems like we have an odd Puppeteer bug when the alt modifer is pressed
          // in combination with a number key. So we disengage the modifer before entering
          // the key command.
          if (activeKeys.has('Alt') && keyCode > 47 && keyCode < 58) {
            activeKeys.delete('Alt');
            log({type: 'keyup', key: 'Alt'}, target, timeStamp);
          }
          const entry = log(
            {type: 'keydown', key, cancelled: false},
            target,
            timeStamp,
          );
          activeKeys.set(key, entry);
        }
      };

      const onKeyUp = (event: KeyboardEvent) => {
        const {key, target, timeStamp} = event;
        if (!enabled || key === 'F12') {
          return;
        } else if (key === 'Dead') {
          return;
        }
        if (isValidTarget(event.target, editorElement)) {
          if (!activeKeys.has(key)) {
            return;
          }
          activeKeys.delete(key);
          log({type: 'keyup', key}, target, timeStamp);
        }
      };

      const onFocus = (event: FocusEvent) => {
        if (!enabled) {
          return;
        }
        const {target, timeStamp} = event;
        if (isValidTarget(event.target, editorElement)) {
          log({type: 'focus'}, target, timeStamp);
        }
      };

      const onBlur = (event: FocusEvent) => {
        if (!enabled) {
          return;
        }
        const {target, timeStamp} = event;
        if (isValidTarget(event.target, editorElement)) {
          log({type: 'blur'}, target, timeStamp);
        }
      };

      const onClick = (event: MouseEvent) => {
        if (!enabled) {
          return;
        }
        const {target, timeStamp} = event;
        if (isValidTarget(event.target, editorElement)) {
          log({type: 'click'}, target, timeStamp);
        }
      };

      document.addEventListener('compositionstart', onCompositionStart, true);
      document.addEventListener('compositionupdate', onCompositionUpdate, true);
      document.addEventListener('compositionend', onCompositionEnd, true);
      document.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('keyup', onKeyUp, true);
      document.addEventListener('focus', onFocus, true);
      document.addEventListener('blur', onBlur, true);
      document.addEventListener('click', onClick, true);

      return () => {
        document.removeEventListener(
          'compositionstart',
          onCompositionStart,
          true,
        );
        document.removeEventListener(
          'compositionupdate',
          onCompositionUpdate,
          true,
        );
        document.removeEventListener('compositionend', onCompositionEnd, true);
        document.removeEventListener('keydown', onKeyDown, true);
        document.removeEventListener('keyup', onKeyUp, true);
        document.removeEventListener('focus', onFocus, true);
        document.removeEventListener('blur', onBlur, true);
        document.removeEventListener('click', onClick, true);
      };
    }
  }, [editor]);
}
