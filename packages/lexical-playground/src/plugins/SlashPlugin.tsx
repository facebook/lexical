/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, RangeSelection} from 'lexical';

import {$createCodeNode} from '@lexical/code';
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createHeadingNode, $createQuoteNode} from '@lexical/rich-text';
import {$wrapLeafNodesInElements} from '@lexical/selection';
import {mergeRegister} from '@lexical/utils';
import {
  $createTextNode,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
} from 'lexical';
import {
  ReactPortal,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as React from 'react';
import {createPortal} from 'react-dom';
import useLayoutEffect from 'shared/useLayoutEffect';

type Resolution = {
  match: boolean;
  range: Range;
};

const blockNames = [
  'Normal',
  'Heading 1',
  'Heading 2',
  'Heading 3',
  'Heading 4',
  'Heading 5',
  'Heading 6',
  'Numbered List',
  'Bulleted List',
  'Check List',
  'Quote',
  'Code Block',
];

const BlockTypesData = [
  'paragraph',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'number',
  'bullet',
  'check',
  'quote',
  'code',
];

function SlashTypeaheadItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  result,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  result: string;
}) {
  const liRef = useRef(null);

  let className = 'item';
  if (isSelected) {
    className += ' selected';
  }

  return (
    <li
      key={result}
      tabIndex={-1}
      className={className}
      ref={liRef}
      role="option"
      aria-selected={isSelected}
      id={'typeahead-item-' + index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}>
      <span className={'slash icon ' + BlockTypesData[index]} />
      <span>{result}</span>
    </li>
  );
}

function SlashTypeahead({
  close,
  editor,
  resolution,
}: {
  close: () => void;
  editor: LexicalEditor;
  resolution: Resolution;
}): JSX.Element | null {
  const divRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<null | number>(null);

  useEffect(() => {
    const div = divRef.current;
    const rootElement = editor.getRootElement();
    if (div !== null && rootElement !== null) {
      const range = resolution.range;
      const {left, top, height} = range.getBoundingClientRect();
      div.style.top = `${top + height + 2}px`;
      div.style.left = `${left - 14}px`;
      div.style.display = 'block';
      rootElement.setAttribute('aria-controls', 'mentions-typeahead');

      return () => {
        div.style.display = 'none';
        rootElement.removeAttribute('aria-controls');
      };
    }
  }, [editor, resolution.range]);

  const applyCurrentSelected = useCallback(() => {
    if (selectedIndex === null) {
      return;
    }
    const selectedEntry = BlockTypesData[selectedIndex];

    close();

    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        return;
      }
      const anchor = selection.anchor;
      if (anchor.type !== 'text') {
        return;
      }
      const anchorNode = anchor.getNode();

      const emptyNode = $createTextNode();
      anchorNode.replace(emptyNode);
      emptyNode.select();
    });

    switch (selectedEntry) {
      case 'Normal':
        break;
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        editor.update(() => {
          const selection = $getSelection();

          if ($isRangeSelection(selection)) {
            $wrapLeafNodesInElements(selection, () =>
              $createHeadingNode(selectedEntry),
            );
          }
        });
        break;
      case 'number':
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        break;
      case 'bullet':
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        break;
      case 'check':
        editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
        break;
      case 'quote':
        editor.update(() => {
          const selection = $getSelection();

          if ($isRangeSelection(selection)) {
            $wrapLeafNodesInElements(selection, () => $createQuoteNode());
          }
        });
        break;
      case 'code':
        editor.update(() => {
          const selection = $getSelection();

          if ($isRangeSelection(selection)) {
            if (selection.isCollapsed()) {
              $wrapLeafNodesInElements(selection, () => $createCodeNode());
            } else {
              const textContent = selection.getTextContent();
              const codeNode = $createCodeNode();
              selection.insertNodes([codeNode]);
              selection.insertRawText(textContent);
            }
          }
        });
        break;
    }
  }, [close, editor, selectedIndex]);

  const updateSelectedIndex = useCallback(
    (index: number) => {
      const rootElem = editor.getRootElement();
      if (rootElem !== null) {
        rootElem.setAttribute(
          'aria-activedescendant',
          'typeahead-item-' + index,
        );
        setSelectedIndex(index);
      }
    },
    [editor],
  );

  useEffect(() => {
    return () => {
      const rootElem = editor.getRootElement();
      if (rootElem !== null) {
        rootElem.removeAttribute('aria-activedescendant');
      }
    };
  }, [editor]);

  useLayoutEffect(() => {
    if (selectedIndex === null) {
      updateSelectedIndex(0);
    }
  }, [selectedIndex, updateSelectedIndex]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_DOWN_COMMAND,
        (payload) => {
          const event = payload;
          if (selectedIndex !== null) {
            if (selectedIndex !== BlockTypesData.length - 1) {
              updateSelectedIndex(selectedIndex + 1);
            }
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_UP_COMMAND,
        (payload) => {
          const event = payload;
          if (selectedIndex !== null) {
            if (selectedIndex !== 0) {
              updateSelectedIndex(selectedIndex - 1);
            }
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ESCAPE_COMMAND,
        (payload) => {
          const event = payload;
          if (selectedIndex === null) {
            return false;
          }
          event.preventDefault();
          event.stopImmediatePropagation();
          close();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_TAB_COMMAND,
        (payload) => {
          const event = payload;
          if (selectedIndex === null) {
            return false;
          }
          event.preventDefault();
          event.stopImmediatePropagation();
          applyCurrentSelected();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event: KeyboardEvent | null) => {
          if (selectedIndex === null) {
            return false;
          }
          if (event !== null) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          setSelectedIndex(selectedIndex);
          applyCurrentSelected();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [applyCurrentSelected, close, editor, selectedIndex, updateSelectedIndex]);

  return (
    <div
      aria-label="Suggested mentions"
      id="mentions-typeahead"
      ref={divRef}
      role="listbox">
      <ul>
        {BlockTypesData.map((result, i) => (
          <SlashTypeaheadItem
            index={i}
            isSelected={i === selectedIndex}
            onClick={() => {
              setSelectedIndex(i);
              applyCurrentSelected();
            }}
            onMouseEnter={() => {
              setSelectedIndex(i);
            }}
            key={result}
            result={blockNames[i]}
          />
        ))}
      </ul>
    </div>
  );
}

function getTextUpToAnchor(selection: RangeSelection): string | null {
  const anchor = selection.anchor;
  if (anchor.type !== 'text') {
    return null;
  }
  const anchorNode = anchor.getNode();
  const parentNode = anchorNode.getParent();
  // For now we only support slash command when it is in
  // paragraph element, similar to requiresParagraphStart
  if (!$isParagraphNode(parentNode)) {
    return null;
  }
  const anchorOffset = anchor.offset;
  return anchorNode.getTextContent().slice(0, anchorOffset);
}

function getTextToSearch(editor: LexicalEditor): string | null {
  let text = null;
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }
    text = getTextUpToAnchor(selection);
  });
  return text;
}

function tryToPositionRange(range: Range): boolean {
  const domSelection = window.getSelection();
  if (domSelection === null || !domSelection.isCollapsed) {
    return false;
  }
  const anchorNode = domSelection.anchorNode;
  try {
    if (anchorNode) {
      range.setStart(anchorNode, 0);
      range.setEnd(anchorNode, 1);
    }
  } catch (error) {
    return false;
  }

  return true;
}

function useSlash(editor: LexicalEditor): ReactPortal | null {
  const [resolution, setResolution] = useState<Resolution | null>(null);

  useEffect(() => {
    let activeRange: Range | null = document.createRange();

    const updateListener = () => {
      const range = activeRange;
      const text = getTextToSearch(editor);

      if (range === null) {
        return;
      }

      if (text === '/') {
        const isRangePositioned = tryToPositionRange(range);
        if (isRangePositioned !== null)
          startTransition(() => setResolution({match: true, range}));
        return;
      }
      startTransition(() => setResolution(null));
    };

    const removeUpdateListener = editor.registerUpdateListener(updateListener);

    return () => {
      activeRange = null;
      removeUpdateListener();
    };
  }, [editor]);

  const closeTypeahead = useCallback(() => {
    setResolution(null);
  }, []);

  return resolution === null || editor === null
    ? null
    : createPortal(
        <SlashTypeahead
          close={closeTypeahead}
          editor={editor}
          resolution={resolution}
        />,
        document.body,
      );
}

export default function SlashPlugin(): ReactPortal | null {
  const [editor] = useLexicalComposerContext();
  return useSlash(editor);
}
