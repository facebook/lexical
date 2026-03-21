/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './styles.css';

import {TabIndentationExtension} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListExtension,
} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {DraggableBlockPlugin_EXPERIMENTAL} from '@lexical/react/LexicalDraggableBlockPlugin';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {
  $createHeadingNode,
  $createQuoteNode,
  RichTextExtension,
} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {
  $createParagraphNode,
  $createTextNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  defineExtension,
} from 'lexical';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import * as ReactDOM from 'react-dom';

const theme = {
  heading: {
    h1: 'nle-h1',
    h2: 'nle-h2',
    h3: 'nle-h3',
  },
  list: {
    listitem: 'nle-listitem',
    ol: 'nle-list-ol',
    ul: 'nle-list-ul',
  },
  paragraph: 'nle-paragraph',
  quote: 'nle-quote',
  text: {
    bold: 'nle-text-bold',
    code: 'nle-text-code',
    italic: 'nle-text-italic',
  },
};

const editorExtension = defineExtension({
  dependencies: [
    RichTextExtension,
    HistoryExtension,
    ListExtension,
    TabIndentationExtension,
  ],
  name: '@lexical/website/notion-like-editor',
  namespace: '@lexical/website/notion-like-editor',
  theme,
});

const DRAG_MENU_CLASSNAME = 'nle-drag-menu';

class BlockOption extends MenuOption {
  constructor(title, {icon, keywords = [], onSelect}) {
    super(title);
    this.title = title;
    this.icon = icon;
    this.keywords = keywords;
    this.onSelect = onSelect;
  }
}

function getBlockOptions(editor) {
  return [
    new BlockOption('Text', {
      icon: 'paragraph',
      keywords: ['paragraph', 'text', 'p', 'normal'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode());
          }
        }),
    }),
    new BlockOption('Heading 1', {
      icon: 'h1',
      keywords: ['heading', 'title', 'h1'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h1'));
          }
        }),
    }),
    new BlockOption('Heading 2', {
      icon: 'h2',
      keywords: ['heading', 'subtitle', 'h2'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h2'));
          }
        }),
    }),
    new BlockOption('Heading 3', {
      icon: 'h3',
      keywords: ['heading', 'h3'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h3'));
          }
        }),
    }),
    new BlockOption('Bulleted List', {
      icon: 'bullet',
      keywords: ['bulleted list', 'unordered list', 'ul'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
    }),
    new BlockOption('Numbered List', {
      icon: 'number',
      keywords: ['numbered list', 'ordered list', 'ol'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
    }),
    new BlockOption('Quote', {
      icon: 'quote',
      keywords: ['quote', 'blockquote'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createQuoteNode());
          }
        }),
    }),
  ];
}

function SlashMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState(null);

  const options = useMemo(() => {
    const base = getBlockOptions(editor);
    if (!queryString) {
      return base;
    }
    const regex = new RegExp(queryString, 'i');
    return base.filter(
      (o) => regex.test(o.title) || o.keywords.some((k) => regex.test(k)),
    );
  }, [editor, queryString]);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    allowWhitespace: true,
    minLength: 0,
  });

  const onSelectOption = useCallback(
    (selectedOption, nodeToRemove, closeMenu) => {
      editor.update(() => {
        if (nodeToRemove !== null) {
          nodeToRemove.remove();
        }
        selectedOption.onSelect();
        closeMenu();
      });
    },
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      menuRenderFn={(
        anchorRef,
        {selectedIndex, selectOptionAndCleanUp, setHighlightedIndex},
      ) =>
        anchorRef.current
          ? ReactDOM.createPortal(
              <div className="nle-slash-menu">
                <ul>
                  {options.map((option, i) => (
                    <li
                      key={option.key}
                      ref={option.setRefElement}
                      role="option"
                      aria-selected={selectedIndex === i}
                      className={`nle-slash-item${selectedIndex === i ? ' selected' : ''}`}
                      tabIndex={-1}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      onClick={() => {
                        setHighlightedIndex(i);
                        selectOptionAndCleanUp(option);
                      }}>
                      <span className={`nle-icon nle-icon-${option.icon}`} />
                      <span className="nle-slash-label">{option.title}</span>
                    </li>
                  ))}
                </ul>
              </div>,
              anchorRef.current,
            )
          : null
      }
    />
  );
}

function DragPlugin({anchorElem}) {
  const [editor] = useLexicalComposerContext();
  const menuRef = useRef(null);
  const targetLineRef = useRef(null);
  const pickerRef = useRef(null);
  const searchInputRef = useRef(null);
  const [draggableElement, setDraggableElement] = useState(null);
  const [pickerState, setPickerState] = useState(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [queryString, setQueryString] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [pickerPosition, setPickerPosition] = useState(null);

  const options = useMemo(() => {
    const base = getBlockOptions(editor);
    if (!queryString) {
      return base;
    }
    const regex = new RegExp(queryString, 'i');
    return base.filter(
      (o) => regex.test(o.title) || o.keywords.some((k) => regex.test(k)),
    );
  }, [editor, queryString]);

  const closePicker = useCallback(() => {
    setIsPickerOpen(false);
    setPickerState(null);
    setQueryString('');
    setHighlightedIndex(0);
  }, []);

  const selectOption = useCallback(
    (option) => {
      if (!pickerState || !option) {
        return;
      }
      closePicker();
      editor.update(() => {
        const node = $getNodeByKey(pickerState.targetNodeKey);
        if (!node) {
          return;
        }
        const placeholder = $createParagraphNode();
        const textNode = $createTextNode('');
        placeholder.append(textNode);
        if (pickerState.insertBefore) {
          node.insertBefore(placeholder);
        } else {
          node.insertAfter(placeholder);
        }
        textNode.select();
        option.onSelect();
        const latest = placeholder.getLatest();
        if ($isParagraphNode(latest)) {
          const child = latest.getFirstChild();
          if (
            $isTextNode(child) &&
            child.getTextContent().length === 0 &&
            latest.getChildrenSize() === 1
          ) {
            latest.remove();
          }
        }
      });
    },
    [closePicker, editor, pickerState],
  );

  useEffect(() => {
    if (isPickerOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isPickerOpen]);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }
    setHighlightedIndex((i) => Math.min(i, Math.max(options.length - 1, 0)));
  }, [isPickerOpen, options.length]);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }
    const onClickOutside = (e) => {
      if (
        (pickerRef.current !== null && pickerRef.current.contains(e.target)) ||
        (menuRef.current !== null && menuRef.current.contains(e.target))
      ) {
        return;
      }
      closePicker();
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [closePicker, isPickerOpen]);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }
    const onKeyDown = (e) => {
      if (!options.length) {
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((i) => (i - 1 + options.length) % options.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectOption(options[highlightedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePicker();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closePicker, highlightedIndex, isPickerOpen, options, selectOption]);

  const openPicker = useCallback(
    (e) => {
      if (!draggableElement) {
        return;
      }
      let targetNodeKey = null;
      editor.read(() => {
        const node = $getNearestNodeFromDOMNode(draggableElement);
        if (node) {
          targetNodeKey = node.getKey();
        }
      });
      if (!targetNodeKey) {
        return;
      }
      const rect =
        menuRef.current !== null
          ? menuRef.current.getBoundingClientRect()
          : null;
      setPickerPosition(
        rect
          ? {
              left: rect.left + rect.width + window.scrollX + 8,
              top: rect.top + window.scrollY,
            }
          : null,
      );
      setPickerState({insertBefore: e.altKey || e.ctrlKey, targetNodeKey});
      setQueryString('');
      setHighlightedIndex(0);
      setIsPickerOpen(true);
    },
    [draggableElement, editor],
  );

  const isOnMenu = useCallback(
    (element) => !!element.closest(`.${DRAG_MENU_CLASSNAME}`),
    [],
  );

  return (
    <>
      {isPickerOpen && pickerPosition
        ? ReactDOM.createPortal(
            <div
              ref={pickerRef}
              className="nle-block-picker"
              style={{
                left: pickerPosition.left,
                position: 'absolute',
                top: pickerPosition.top,
                zIndex: 30,
              }}>
              <input
                ref={searchInputRef}
                className="nle-block-picker-search"
                placeholder="Filter blocks..."
                value={queryString}
                onChange={(e) => setQueryString(e.target.value)}
              />
              <ul>
                {options.map((option, i) => (
                  <li key={option.key}>
                    <button
                      type="button"
                      className={`nle-block-picker-item${highlightedIndex === i ? ' selected' : ''}`}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      onClick={() => selectOption(option)}>
                      <span className={`nle-icon nle-icon-${option.icon}`} />
                      {option.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
      <DraggableBlockPlugin_EXPERIMENTAL
        anchorElem={anchorElem}
        menuRef={menuRef}
        targetLineRef={targetLineRef}
        menuComponent={
          <div ref={menuRef} className={DRAG_MENU_CLASSNAME}>
            <button
              type="button"
              className="nle-drag-add"
              title="Click to add below (Alt/Option to add above)"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={openPicker}
            />
            <div className="nle-drag-handle" />
          </div>
        }
        targetLineComponent={
          <div ref={targetLineRef} className="nle-target-line" />
        }
        isOnMenu={isOnMenu}
        onElementChanged={setDraggableElement}
      />
    </>
  );
}

export default function NotionLikeEditor() {
  const [anchorElem, setAnchorElem] = useState(null);

  return (
    <LexicalExtensionComposer extension={editorExtension}>
      <div className="nle-editor">
        <div className="nle-editor-inner" ref={setAnchorElem}>
          <ContentEditable
            className="nle-editor-input"
            aria-placeholder="Type '/' for commands..."
            placeholder={
              <div className="nle-editor-placeholder">
                Type &apos;/&apos; for commands...
              </div>
            }
          />
          <SlashMenuPlugin />
          {anchorElem ? <DragPlugin anchorElem={anchorElem} /> : null}
        </div>
      </div>
    </LexicalExtensionComposer>
  );
}
