import * as SelectionHelpers from 'outline-react/OutlineSelectionHelpers';
import {createTextNode} from 'outline';

export function sanitizeHTML(html) {
  // Remove the special space characters
  return html.replace(/\uFEFF/g, '');
}

export function sanitizeSelectionWithEmptyTextNodes(selection) {
  const {anchorNode, focusNode} = selection;
  if (anchorNode === focusNode && anchorNode.textContent === '\uFEFF') {
    return {anchorNode, focusNode, anchorOffset: 0, focusOffset: 0};
  }
  return selection;
}

export function printWhitespace(whitespaceCharacter) {
  return whitespaceCharacter.charCodeAt(0) === 160
    ? '&nbsp;'
    : whitespaceCharacter;
}

export function insertText(text) {
  return {
    type: 'insert_text',
    text,
  };
}

export function insertImmutableNode(text) {
  return {
    type: 'insert_immutable_node',
    text,
  };
}

export function insertSegmentedNode(text) {
  return {
    type: 'insert_segmented_node',
    text,
  };
}

export function convertToImmutableNode() {
  return {
    type: 'covert_to_immutable_node',
    text: null,
  };
}

export function convertToSegmentedNode() {
  return {
    type: 'covert_to_segmented_node',
    text: null,
  };
}

export function insertParagraph(text) {
  return {
    type: 'insert_paragraph',
  };
}

export function deleteWordBackward(n: ?number) {
  return {
    type: 'delete_word_backward',
    text: null,
    times: n,
  };
}

export function deleteWordForward(n: ?number) {
  return {
    type: 'delete_word_forward',
    text: null,
    times: n,
  };
}

export function moveBackward(n: ?number) {
  return {
    type: 'move_backward',
    text: null,
    times: n,
  };
}

export function moveForward(n: ?number) {
  return {
    type: 'move_forward',
    text: null,
    times: n,
  };
}

export function moveEnd() {
  return {
    type: 'move_end',
  };
}

export function deleteBackward(n: ?number) {
  return {
    type: 'delete_backward',
    text: null,
    times: n,
  };
}

export function deleteForward(n: ?number) {
  return {
    type: 'delete_forward',
    text: null,
    times: n,
  };
}

export function formatBold() {
  return {
    type: 'format_text',
    format: 'bold',
  };
}

export function formatItalic() {
  return {
    type: 'format_text',
    format: 'italic',
  };
}

export function formatStrikeThrough() {
  return {
    type: 'format_text',
    format: 'strikethrough',
  };
}

export function formatUnderline() {
  return {
    type: 'format_text',
    format: 'underline',
  };
}

export function redo(n: ?number) {
  return {
    type: 'redo',
    text: null,
    times: n,
  };
}

export function undo(n: ?number) {
  return {
    type: 'undo',
    text: null,
    times: n,
  };
}

export function paste(text: string) {
  return {
    type: 'paste',
    text: text,
  };
}

export function moveNativeSelection(
  anchorPath,
  anchorOffset,
  focusPath,
  focusOffset,
) {
  return {
    type: 'move_native_selection',
    anchorPath,
    anchorOffset,
    focusPath,
    focusOffset,
  };
}

export function getNodeFromPath(path, editorElement) {
  let node = editorElement;
  for (let i = 0; i < path.length; i++) {
    node = node.childNodes[path[i]];
  }
  return node;
}

export function setNativeSelection(
  anchorNode,
  anchorOffset,
  focusNode,
  focusOffset,
) {
  const domSelection = window.getSelection();
  const range = document.createRange();
  if (anchorNode.nodeType === 3 && anchorNode.nodeValue === '\uFEFF') {
    anchorOffset = 1;
    focusOffset = 1;
  }
  range.setStart(anchorNode, anchorOffset);
  range.setEnd(focusNode, focusOffset);
  domSelection.removeAllRanges();
  domSelection.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
}

export function setNativeSelectionWithPaths(
  editorElement,
  anchorPath,
  anchorOffset,
  focusPath,
  focusOffset,
) {
  const anchorNode = getNodeFromPath(anchorPath, editorElement);
  const focusNode = getNodeFromPath(focusPath, editorElement);
  setNativeSelection(anchorNode, anchorOffset, focusNode, focusOffset);
}

function getLastTextNode(startingNode) {
  let node = startingNode;

  mainLoop: while (node !== null) {
    if (node !== startingNode && node.nodeType === 3) {
      return node;
    }
    const child = node.lastChild;
    if (child !== null) {
      node = child;
      continue;
    }
    const previousSibling = node.previousSibling;
    if (previousSibling !== null) {
      node = previousSibling;
      continue;
    }
    let parent = node.parentNode;
    while (parent !== null) {
      const parentSibling = parent.previousSibling;
      if (parentSibling !== null) {
        node = parentSibling;
        continue mainLoop;
      }
      parent = parent.parentNode;
    }
  }

  return null;
}

function getNextTextNode(startingNode) {
  let node = startingNode;

  mainLoop: while (node !== null) {
    if (node !== startingNode && node.nodeType === 3) {
      return node;
    }
    const child = node.firstChild;
    if (child !== null) {
      node = child;
      continue;
    }
    const nextSibling = node.nextSibling;
    if (nextSibling !== null) {
      node = nextSibling;
      continue;
    }
    let parent = node.parentNode;
    while (parent !== null) {
      const parentSibling = parent.nextSibling;
      if (parentSibling !== null) {
        node = parentSibling;
        continue mainLoop;
      }
      parent = parent.parentNode;
    }
  }

  return null;
}

function moveNativeSelectionBackward() {
  const domSelection = window.getSelection();
  const {anchorNode, anchorOffset} = domSelection;

  if (domSelection.isCollapsed) {
    const target =
      anchorNode.nodeType === 1 ? anchorNode : anchorNode.parentNode;
    const keyDownEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'ArrowLeft',
    });
    target.dispatchEvent(keyDownEvent);
    if (!keyDownEvent.defaultPrevented) {
      if (anchorNode.nodeType === 3) {
        if (anchorOffset === 0) {
          const lastTextNode = getLastTextNode(anchorNode);

          if (lastTextNode === null) {
            throw new Error('moveNativeSelectionBackward: TODO');
          } else {
            const textLength = lastTextNode.nodeValue.length;
            setNativeSelection(
              lastTextNode,
              textLength,
              lastTextNode,
              textLength,
            );
          }
        } else {
          setNativeSelection(
            anchorNode,
            anchorOffset - 1,
            anchorNode,
            anchorOffset - 1,
          );
        }
      } else {
        throw new Error('moveNativeSelectionBackward: TODO');
      }
    }
    const keyUpEvent = new KeyboardEvent('keyup', {
      bubbles: true,
      cancelable: true,
      key: 'ArrowLeft',
    });
    target.dispatchEvent(keyUpEvent);
  } else {
    throw new Error('moveNativeSelectionBackward: TODO');
  }
}

function moveNativeSelectionForward() {
  const domSelection = window.getSelection();
  const {anchorNode, anchorOffset} = domSelection;

  if (domSelection.isCollapsed) {
    const target =
      anchorNode.nodeType === 1 ? anchorNode : anchorNode.parentNode;
    const keyDownEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'ArrowRight',
    });
    target.dispatchEvent(keyDownEvent);
    if (!keyDownEvent.defaultPrevented) {
      if (anchorNode.nodeType === 3) {
        const text = anchorNode.nodeValue;
        if (text.length === anchorOffset || text === '\uFEFF') {
          const nextTextNode = getNextTextNode(anchorNode);

          if (nextTextNode === null) {
            throw new Error('moveNativeSelectionForward: TODO');
          } else {
            setNativeSelection(nextTextNode, 0, nextTextNode, 0);
          }
        } else {
          setNativeSelection(
            anchorNode,
            anchorOffset + 1,
            anchorNode,
            anchorOffset + 1,
          );
        }
      } else {
        throw new Error('moveNativeSelectionForward: TODO');
      }
    }
    const keyUpEvent = new KeyboardEvent('keyup', {
      bubbles: true,
      cancelable: true,
      key: 'ArrowRight',
    });
    target.dispatchEvent(keyUpEvent);
  } else {
    throw new Error('moveNativeSelectionForward: TODO');
  }
}

export async function applySelectionInputs(inputs, update, editor) {
  const editorElement = editor.getEditorElement();
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const times = input?.times ?? 1;

    for (let j = 0; j < times; j++) {
      await update((view) => {
        const selection = view.getSelection();

        switch (input.type) {
          case 'insert_text': {
            SelectionHelpers.insertText(selection, input.text);
            break;
          }
          case 'insert_paragraph': {
            SelectionHelpers.insertParagraph(selection);
            break;
          }
          case 'move_backward': {
            moveNativeSelectionBackward();
            break;
          }
          case 'move_forward': {
            moveNativeSelectionForward();
            break;
          }
          case 'move_end': {
            SelectionHelpers.moveEnd(selection);
            break;
          }
          case 'delete_backward': {
            SelectionHelpers.deleteBackward(selection);
            break;
          }
          case 'delete_forward': {
            SelectionHelpers.deleteForward(selection);
            break;
          }
          case 'delete_word_backward': {
            SelectionHelpers.deleteWordBackward(selection);
            break;
          }
          case 'delete_word_forward': {
            SelectionHelpers.deleteWordForward(selection);
            break;
          }
          case 'format_text': {
            SelectionHelpers.formatText(selection, input.format);
            break;
          }
          case 'move_native_selection': {
            setNativeSelectionWithPaths(
              editorElement,
              input.anchorPath,
              input.anchorOffset,
              input.focusPath,
              input.focusOffset,
            );
            break;
          }
          case 'insert_immutable_node': {
            const text = createTextNode(input.text);
            text.makeImmutable();
            SelectionHelpers.insertNodes(selection, [text]);
            text.selectNext();
            break;
          }
          case 'insert_segmented_node': {
            const text = createTextNode(input.text);
            text.makeSegmented();
            SelectionHelpers.insertNodes(selection, [text]);
            text.selectNext();
            break;
          }
          case 'covert_to_immutable_node': {
            const text = createTextNode(selection.getTextContent());
            text.makeImmutable();
            SelectionHelpers.insertNodes(selection, [text]);
            text.selectNext();
            break;
          }
          case 'covert_to_segmented_node': {
            const text = createTextNode(selection.getTextContent());
            text.makeSegmented();
            SelectionHelpers.insertNodes(selection, [text]);
            text.selectNext();
            break;
          }
          case 'undo': {
            editorElement.dispatchEvent(
              new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                ctrlKey: true,
                key: 'z',
              }),
            );
            break;
          }
          case 'redo': {
            editorElement.dispatchEvent(
              new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                ctrlKey: true,
                shiftKey: true,
                key: 'z',
              }),
            );
            break;
          }
          case 'paste': {
            editorElement.dispatchEvent(
              Object.assign(
                new Event('paste', {
                  bubbles: true,
                  cancelable: true,
                }),
                {
                  clipboardData: {
                    getData: (type) => {
                      if (type === 'text/plain') {
                        return input.text;
                      }
                      return '';
                    },
                  },
                },
              ),
            );
            break;
          }
        }
      });
    }
  }
}
