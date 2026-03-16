/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
    h1: 'mt-2 mb-1 text-[1.75rem] font-bold leading-[1.25]',
    h2: 'mt-2 mb-[0.15rem] text-[1.3rem] font-semibold leading-[1.3]',
    h3: 'mt-[0.4rem] mb-[0.1rem] text-[1.1rem] font-semibold leading-[1.35]',
  },
  list: {
    listitem: 'my-[0.1rem] leading-[1.6]',
    ol: 'my-[0.2rem] ml-5 p-0',
    ul: 'my-[0.2rem] ml-5 p-0',
  },
  paragraph: 'my-0 py-0.5 leading-[1.6]',
  quote:
    'my-[0.4rem] border-l-[3px] [border-left-style:solid] border-zinc-300 pl-3.5 italic text-zinc-500 dark:border-zinc-700 dark:text-zinc-400',
  text: {
    bold: 'font-bold',
    code: 'rounded-[3px] bg-[rgba(135,131,120,0.15)] px-[0.3em] py-[0.1em] font-mono text-[0.875em] dark:bg-white/10',
    italic: 'italic',
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

const ICON_URLS = {
  bullet: '/img/list-ul.svg',
  h1: '/img/type-h1.svg',
  h2: '/img/type-h2.svg',
  h3: '/img/type-h3.svg',
  number: '/img/list-ol.svg',
  paragraph: '/img/text-paragraph.svg',
  quote: '/img/chat-square-quote.svg',
};

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
              <div className="w-[220px] overflow-hidden rounded-lg border border-solid border-zinc-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:border-zinc-700 dark:bg-[#232325] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                <ul className="m-0 max-h-[220px] list-none overflow-y-auto p-1">
                  {options.map((option, i) => (
                    <li
                      key={option.key}
                      ref={option.setRefElement}
                      role="option"
                      aria-selected={selectedIndex === i}
                      className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-inherit ${selectedIndex === i ? 'bg-zinc-100 dark:bg-[#3a3a3c]' : 'hover:bg-zinc-100 dark:hover:bg-[#3a3a3c]'} dark:text-zinc-200`}
                      tabIndex={-1}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      onClick={() => {
                        setHighlightedIndex(i);
                        selectOptionAndCleanUp(option);
                      }}>
                      <span
                        className="inline-block h-4 w-4 shrink-0 bg-center bg-no-repeat opacity-70 [background-size:contain] dark:invert"
                        style={{
                          backgroundImage: `url('${ICON_URLS[option.icon]}')`,
                        }}
                      />
                      <span className="flex-1">{option.title}</span>
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
              className="w-[230px] overflow-hidden rounded-lg border border-solid border-zinc-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:border-zinc-700 dark:bg-[#232325] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
              style={{
                left: pickerPosition.left,
                position: 'absolute',
                top: pickerPosition.top,
                zIndex: 30,
              }}>
              <input
                ref={searchInputRef}
                className="block w-full border-0 border-b border-zinc-200 bg-transparent px-3 py-2 text-[0.85rem] text-inherit outline-none [border-bottom-style:solid] dark:border-zinc-700"
                placeholder="Filter blocks..."
                value={queryString}
                onChange={(e) => setQueryString(e.target.value)}
              />
              <ul className="m-0 max-h-[220px] list-none overflow-y-auto p-1">
                {options.map((option, i) => (
                  <li key={option.key}>
                    <button
                      type="button"
                      className={`flex w-full cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1.5 text-left text-sm text-inherit ${highlightedIndex === i ? 'bg-zinc-100 dark:bg-[#3a3a3c]' : 'hover:bg-zinc-100 dark:hover:bg-[#3a3a3c]'}`}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      onClick={() => selectOption(option)}>
                      <span
                        className="inline-block h-4 w-4 shrink-0 bg-center bg-no-repeat opacity-70 [background-size:contain] dark:invert"
                        style={{
                          backgroundImage: `url('${ICON_URLS[option.icon]}')`,
                        }}
                      />
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
          <div
            ref={menuRef}
            className={`${DRAG_MENU_CLASSNAME} absolute left-0 top-0 z-[1] flex cursor-grab items-center gap-0.5 rounded-sm p-0.5 opacity-0 [will-change:transform,opacity] active:cursor-grabbing`}
            style={{
              transition:
                'transform 140ms ease-in-out, opacity 160ms ease-in-out',
            }}>
            <button
              type="button"
              className="flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent bg-center bg-no-repeat opacity-50 [background-size:14px_14px] hover:bg-zinc-100 hover:opacity-100 dark:invert dark:hover:bg-[#ffffdd]"
              style={{backgroundImage: "url('/img/plus.svg')"}}
              title="Click to add below (Alt/Option to add above)"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={openPicker}
            />
            <div
              className="h-[18px] w-[18px] cursor-grab bg-center bg-no-repeat opacity-50 [background-size:14px_14px] hover:bg-zinc-100 hover:opacity-100 dark:invert dark:hover:bg-[#ffffdd]"
              style={{backgroundImage: "url('/img/draggable-block-menu.svg')"}}
            />
          </div>
        }
        targetLineComponent={
          <div
            ref={targetLineRef}
            className="pointer-events-none absolute left-0 top-0 h-[3px] bg-blue-400 opacity-0 [will-change:transform]"
          />
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
      <div className="relative h-[400px] w-full overflow-y-auto rounded-lg border border-solid border-zinc-200 bg-white dark:border-white/[0.12] dark:bg-[#1f1f21] max-[996px]:h-[260px]">
        <div className="relative min-h-full" ref={setAnchorElem}>
          <ContentEditable
            className="min-h-full px-14 py-5 outline-none"
            aria-label="Rich text editor"
            aria-placeholder="Type '/' for commands..."
            placeholder={
              <div className="pointer-events-none absolute left-14 top-[22px] select-none text-[0.95rem] text-zinc-400">
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
