/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  LexicalEditor,
  RangeSelection,
  TextNode,
} from 'lexical';
import {
  MutableRefObject,
  ReactPortal,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as React from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';

export type QueryMatch = {
  leadOffset: number;
  matchingString: string;
  replaceableString: string;
};

export type Resolution = {
  match: QueryMatch;
  range: Range;
};

export const PUNCTUATION =
  '\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%\'"~=<>_:;';

export class TypeaheadOption {
  key: string;
  ref?: MutableRefObject<HTMLElement | null>;

  constructor(key: string) {
    this.key = key;
    this.ref = {current: null};
    this.setRefElement = this.setRefElement.bind(this);
  }

  setRefElement(element: HTMLElement | null) {
    this.ref = {current: element};
  }
}

declare type MenuRenderFn<TOption extends TypeaheadOption> = (
  anchorElement: HTMLElement | null,
  itemProps: {
    selectedIndex: number | null;
    selectOptionAndCleanUp: (option: TOption) => void;
    setHighlightedIndex: (index: number) => void;
  },
  matchingString: string,
) => ReactPortal | JSX.Element | null;

const scrollIntoViewIfNeeded = (target: HTMLElement) => {
  const container = document.getElementById('typeahead-menu');
  if (container) {
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    if (targetRect.bottom > containerRect.bottom) {
      target.scrollIntoView(false);
    } else if (targetRect.top < containerRect.top) {
      target.scrollIntoView();
    }
  }
};

function getTextUpToAnchor(selection: RangeSelection): string | null {
  const anchor = selection.anchor;
  if (anchor.type !== 'text') {
    return null;
  }
  const anchorNode = anchor.getNode();
  if (!anchorNode.isSimpleText()) {
    return null;
  }
  const anchorOffset = anchor.offset;
  return anchorNode.getTextContent().slice(0, anchorOffset);
}

function tryToPositionRange(leadOffset: number, range: Range): boolean {
  const domSelection = window.getSelection();
  if (domSelection === null || !domSelection.isCollapsed) {
    return false;
  }
  const anchorNode = domSelection.anchorNode;
  const startOffset = leadOffset;
  const endOffset = domSelection.anchorOffset;

  if (anchorNode == null || endOffset == null) {
    return false;
  }

  try {
    range.setStart(anchorNode, startOffset);
    range.setEnd(anchorNode, endOffset);
  } catch (error) {
    return false;
  }

  return true;
}

function getQueryTextForSearch(editor: LexicalEditor): string | null {
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

/**
 * Walk backwards along user input and forward through entity title to try
 * and replace more of the user's text with entity.
 */
function getFullMatchOffset(
  documentText: string,
  entryText: string,
  offset: number,
): number {
  let triggerOffset = offset;
  for (let i = triggerOffset; i <= entryText.length; i++) {
    if (documentText.substr(-i) === entryText.substr(0, i)) {
      triggerOffset = i;
    }
  }
  return triggerOffset;
}

/**
 * Split Lexical TextNode and return a new TextNode only containing matched text.
 * Common use cases include: removing the node, replacing with a new node.
 */
function splitNodeContainingQuery(
  editor: LexicalEditor,
  match: QueryMatch,
): TextNode | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }
  const anchor = selection.anchor;
  if (anchor.type !== 'text') {
    return null;
  }
  const anchorNode = anchor.getNode();
  if (!anchorNode.isSimpleText()) {
    return null;
  }
  const selectionOffset = anchor.offset;
  const textContent = anchorNode.getTextContent().slice(0, selectionOffset);
  const characterOffset = match.replaceableString.length;
  const queryOffset = getFullMatchOffset(
    textContent,
    match.matchingString,
    characterOffset,
  );
  const startOffset = selectionOffset - queryOffset;
  if (startOffset < 0) {
    return null;
  }
  let newNode;
  if (startOffset === 0) {
    [newNode] = anchorNode.splitText(selectionOffset);
  } else {
    [, newNode] = anchorNode.splitText(startOffset, selectionOffset);
  }

  return newNode;
}

function isSelectionOnEntityBoundary(
  editor: LexicalEditor,
  offset: number,
): boolean {
  if (offset !== 0) {
    return false;
  }
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchor = selection.anchor;
      const anchorNode = anchor.getNode();
      const prevSibling = anchorNode.getPreviousSibling();
      return $isTextNode(prevSibling) && prevSibling.isTextEntity();
    }
    return false;
  });
}

function startTransition(callback: () => void) {
  if (React.startTransition) {
    React.startTransition(callback);
  } else {
    callback();
  }
}

function ShortcutTypeahead<TOption extends TypeaheadOption>({
  close,
  editor,
  resolution,
  options,
  menuRenderFn,
  onSelectOption,
}: {
  close: () => void;
  editor: LexicalEditor;
  resolution: Resolution;
  options: Array<TOption>;
  menuRenderFn: MenuRenderFn<TOption>;
  onSelectOption: (
    option: TOption,
    textNodeContainingQuery: TextNode | null,
    closeMenu: () => void,
    matchingString: string,
  ) => void;
}): JSX.Element | null {
  const [selectedIndex, setHighlightedIndex] = useState<null | number>(null);
  const anchorElementRef = useRef<HTMLElement>(document.createElement('div'));

  useEffect(() => {
    setHighlightedIndex(0);
  }, [resolution.match.matchingString]);

  useEffect(() => {
    const rootElement = editor.getRootElement();

    function positionMenu() {
      const containerDiv = anchorElementRef.current;
      containerDiv.setAttribute('aria-label', 'Typeahead menu');
      containerDiv.setAttribute('id', 'typeahead-menu');
      containerDiv.setAttribute('role', 'listbox');
      if (rootElement !== null) {
        const range = resolution.range;
        const {left, top, height} = range.getBoundingClientRect();
        containerDiv.style.top = `${top + height + window.pageYOffset}px`;
        containerDiv.style.left = `${left + window.pageXOffset}px`;
        containerDiv.style.display = 'block';
        containerDiv.style.position = 'absolute';
        if (!containerDiv.isConnected) {
          document.body.append(containerDiv);
        }
        anchorElementRef.current = containerDiv;
        rootElement.setAttribute('aria-controls', 'typeahead-menu');
      }
    }
    positionMenu();
    window.addEventListener('resize', positionMenu);
    return () => {
      window.removeEventListener('resize', positionMenu);
      if (rootElement !== null) {
        rootElement.removeAttribute('aria-controls');
      }
    };
  }, [editor, resolution, options]);

  const selectOptionAndCleanUp = useCallback(
    async (selectedEntry: TOption) => {
      editor.update(() => {
        const textNodeContainingQuery = splitNodeContainingQuery(
          editor,
          resolution.match,
        );

        onSelectOption(
          selectedEntry,
          textNodeContainingQuery,
          close,
          resolution.match.matchingString,
        );
      });
    },
    [close, editor, resolution.match, onSelectOption],
  );

  const updateSelectedIndex = useCallback(
    (index: number) => {
      const rootElem = editor.getRootElement();
      if (rootElem !== null) {
        rootElem.setAttribute(
          'aria-activedescendant',
          'typeahead-item-' + index,
        );
        setHighlightedIndex(index);
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
    if (options === null) {
      setHighlightedIndex(null);
    } else if (selectedIndex === null) {
      updateSelectedIndex(0);
    }
  }, [options, selectedIndex, updateSelectedIndex]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_DOWN_COMMAND,
        (payload) => {
          const event = payload;
          if (options !== null && options.length && selectedIndex !== null) {
            const newSelectedIndex =
              selectedIndex !== options.length - 1 ? selectedIndex + 1 : 0;
            updateSelectedIndex(newSelectedIndex);
            const option = options[newSelectedIndex];
            if (option.ref != null && option.ref.current) {
              scrollIntoViewIfNeeded(option.ref.current);
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
          if (options !== null && options.length && selectedIndex !== null) {
            const newSelectedIndex =
              selectedIndex !== 0 ? selectedIndex - 1 : options.length - 1;
            updateSelectedIndex(newSelectedIndex);
            const option = options[newSelectedIndex];
            if (option.ref != null && option.ref.current) {
              scrollIntoViewIfNeeded(option.ref.current);
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
          if (options === null || selectedIndex === null) {
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
          if (
            options === null ||
            selectedIndex === null ||
            options[selectedIndex] == null
          ) {
            return false;
          }
          event.preventDefault();
          event.stopImmediatePropagation();
          selectOptionAndCleanUp(options[selectedIndex]);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event: KeyboardEvent | null) => {
          if (
            options === null ||
            selectedIndex === null ||
            options[selectedIndex] == null
          ) {
            return false;
          }
          if (event !== null) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          selectOptionAndCleanUp(options[selectedIndex]);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [
    selectOptionAndCleanUp,
    close,
    editor,
    options,
    selectedIndex,
    updateSelectedIndex,
  ]);

  const listItemProps = useMemo(
    () => ({
      selectOptionAndCleanUp,
      selectedIndex,
      setHighlightedIndex,
    }),
    [selectOptionAndCleanUp, selectedIndex],
  );

  return menuRenderFn(
    anchorElementRef.current,
    listItemProps,
    resolution.match.matchingString,
  );
}

export function useBasicTypeaheadTriggerMatch(
  trigger: string,
  {minLength = 1, maxLength = 75}: {minLength?: number; maxLength?: number},
): TriggerFn {
  return useCallback(
    (text: string) => {
      const validChars = '[^' + trigger + PUNCTUATION + '\\s]';
      const TypeaheadTriggerRegex = new RegExp(
        '(^|\\s|\\()(' +
          '[' +
          trigger +
          ']' +
          '((?:' +
          validChars +
          '){0,' +
          maxLength +
          '})' +
          ')$',
      );
      const match = TypeaheadTriggerRegex.exec(text);
      if (match !== null) {
        const maybeLeadingWhitespace = match[1];
        const matchingString = match[3];
        if (matchingString.length >= minLength) {
          return {
            leadOffset: match.index + maybeLeadingWhitespace.length,
            matchingString,
            replaceableString: match[2],
          };
        }
      }
      return null;
    },
    [maxLength, minLength, trigger],
  );
}

type TypeaheadMenuPluginArgs<TOption extends TypeaheadOption> = {
  onQueryChange: (matchingString: string | null) => void;
  onSelectOption: (
    option: TOption,
    textNodeContainingQuery: TextNode | null,
    closeMenu: () => void,
    matchingString: string,
  ) => void;
  options: Array<TOption>;
  menuRenderFn: MenuRenderFn<TOption>;
  triggerFn: TriggerFn;
};

type TriggerFn = (text: string) => QueryMatch | null;

export function LexicalTypeaheadMenuPlugin<TOption extends TypeaheadOption>({
  options,
  onQueryChange,
  onSelectOption,
  menuRenderFn,
  triggerFn,
}: TypeaheadMenuPluginArgs<TOption>): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  const [resolution, setResolution] = useState<Resolution | null>(null);

  useEffect(() => {
    let activeRange: Range | null = document.createRange();
    let previousText: string | null = null;

    const updateListener = () => {
      editor.getEditorState().read(() => {
        const range = activeRange;
        const selection = $getSelection();
        const text = getQueryTextForSearch(editor);

        if (
          !$isRangeSelection(selection) ||
          !selection.isCollapsed() ||
          text === previousText ||
          text === null ||
          range === null
        ) {
          startTransition(() => setResolution(null));
          return;
        }
        previousText = text;

        const match = triggerFn(text);
        onQueryChange(match ? match.matchingString : null);

        if (
          match !== null &&
          !isSelectionOnEntityBoundary(editor, match.leadOffset)
        ) {
          const isRangePositioned = tryToPositionRange(match.leadOffset, range);
          if (isRangePositioned !== null) {
            startTransition(() =>
              setResolution({
                match,
                range,
              }),
            );
            return;
          }
        }
        startTransition(() => setResolution(null));
      });
    };

    const removeUpdateListener = editor.registerUpdateListener(updateListener);

    return () => {
      activeRange = null;
      removeUpdateListener();
    };
  }, [editor, triggerFn, onQueryChange, resolution]);

  const closeTypeahead = useCallback(() => {
    setResolution(null);
  }, []);

  return resolution === null || editor === null ? null : (
    <ShortcutTypeahead
      close={closeTypeahead}
      resolution={resolution}
      editor={editor}
      options={options}
      menuRenderFn={menuRenderFn}
      onSelectOption={onSelectOption}
    />
  );
}
