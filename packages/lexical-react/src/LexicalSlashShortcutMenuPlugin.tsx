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
  LexicalNode,
  RangeSelection,
} from 'lexical';
import {Klass} from 'packages/shared/types';
import {
  MutableRefObject,
  ReactPortal,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as React from 'react';
import {createPortal} from 'react-dom';
import useLayoutEffect from 'shared/useLayoutEffect';

type QueryMatch = {
  leadOffset: number;
  matchingString: string;
  replaceableString: string;
};

type Resolution = {
  match: QueryMatch;
  range: Range;
};

const PUNCTUATION =
  '\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%\'"~=<>_:;';
const NAME = '\\b[A-Z][^\\s' + PUNCTUATION + ']';

const DocumentSlashRegex = {
  NAME,
  PUNCTUATION,
};

const PUNC = DocumentSlashRegex.PUNCTUATION;

const TRIGGERS = ['/'].join('');

const VALID_CHARS = '[^' + TRIGGERS + PUNC + '\\s]';

const LENGTH_LIMIT = 75;

const SlashPickerRegex = new RegExp(
  '(^|\\s|\\()(' +
    '[' +
    TRIGGERS +
    ']' +
    '((?:' +
    VALID_CHARS +
    '){0,' +
    LENGTH_LIMIT +
    '})' +
    ')$',
);

export class TypeaheadOption {
  // What shows up in the editor
  title: string;
  // A short description of what this option does.
  description: string;
  // To differentiate this option
  key: string;
  // Icon for display
  icon?: JSX.Element;
  ref?: MutableRefObject<HTMLElement | null>;
  // For extra searching.
  keywords?: Array<string>;
  // To make sure the editor has the node registered.
  nodeKlass?: Klass<LexicalNode>;
  // TBD
  keyboardShortcut?: string;
  // What happens when you select this option?
  onSelect: (matchingString: string) => void;

  constructor(
    title: string,
    options: {
      icon?: JSX.Element;
      keywords?: Array<string>;
      nodeKlass?: Klass<LexicalNode>;
      keyboardShortcut?: string;
      onSelect: (matchingString: string) => void;
    },
  ) {
    this.title = title;
    this.key = (Math.random() + 1).toString(36).substring(7);
    this.keywords = options.keywords;
    this.icon = options.icon;
    this.nodeKlass = options.nodeKlass;
    this.keyboardShortcut = options.keyboardShortcut;
    this.onSelect = options.onSelect;
    this.ref = {current: null};
  }

  setRefElement = (element: HTMLElement | null) => {
    this.ref.current = element;
  };

  isMatch = (query: string) => {
    const queryRegex = new RegExp(query, 'gi');
    return query == null || queryRegex.exec(this.title) || this.keywords != null
      ? this.keywords.some((keyword) => {
          queryRegex.lastIndex = 0;
          return queryRegex.exec(keyword);
        })
      : false;
  };
}

export declare type OptionResolverFn = (
  matchingString: string | null,
) => Array<TypeaheadOption>;

declare type MenuRenderFn = (
  anchorElement: HTMLDivElement | null,
  filteredOptions: Array<TypeaheadOption>,
  itemProps: {
    isSelected: (index: number) => boolean;
    applyCurrentSelected: () => void;
    setSelectedIndex: (index: number) => void;
  },
  matchingString: string,
) => ReactPortal | JSX.Element;

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

function checkForSlashMatch(text, minMatchLength): QueryMatch | null {
  const match = SlashPickerRegex.exec(text);
  if (match !== null) {
    const maybeLeadingWhitespace = match[1];
    const matchingString = match[3];
    if (matchingString.length >= minMatchLength) {
      return {
        leadOffset: match.index + maybeLeadingWhitespace.length,
        matchingString,
        replaceableString: match[2],
      };
    }
  }
  return null;
}

function getPossibleMatch(text): QueryMatch | null {
  const match = checkForSlashMatch(text, 0);
  return match;
}

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

function tryToPositionRange(leadOffset, range: Range): boolean {
  const domSelection = window.getSelection();
  if (domSelection === null || !domSelection.isCollapsed) {
    return false;
  }
  const anchorNode = domSelection.anchorNode;
  const startOffset = leadOffset;
  const endOffset = domSelection.anchorOffset;
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
  for (let ii = triggerOffset; ii <= entryText.length; ii++) {
    if (documentText.substr(-ii) === entryText.substr(0, ii)) {
      triggerOffset = ii;
    }
  }

  return triggerOffset;
}

/**
 * From a Typeahead Search Result, replace plain text from search offset
 */
async function removeSearchQueryFromText(
  editor: LexicalEditor,
  match: QueryMatch,
): Promise<void> {
  return editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
      return;
    }
    const anchor = selection.anchor;
    if (anchor.type !== 'text') {
      return;
    }
    const anchorNode = anchor.getNode();
    if (!anchorNode.isSimpleText()) {
      return;
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
      return;
    }

    let nodeToReplace;
    if (startOffset === 0) {
      [nodeToReplace] = anchorNode.splitText(selectionOffset);
    } else {
      [, nodeToReplace] = anchorNode.splitText(startOffset, selectionOffset);
    }

    nodeToReplace.remove();
  });
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

export type TypeaheadOptions = Array<TypeaheadOption>;

function ShortcutTypeahead({
  close,
  editor,
  resolution,
  options,
  menuRenderFn,
}: {
  close: () => void;
  editor: LexicalEditor;
  resolution: Resolution;
  options: Array<TypeaheadOption>;
  menuRenderFn: MenuRenderFn;
}): JSX.Element | null {
  const [anchorElement, setAnchorElement] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState<null | number>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [resolution.match.matchingString]);

  useEffect(() => {
    const rootElement = editor.getRootElement();
    const containerDiv = document.createElement('div');
    containerDiv.setAttribute('aria-label', 'Typeahead menu');
    containerDiv.setAttribute('id', 'typeahead-menu');
    containerDiv.setAttribute('role', 'listbox');
    if (rootElement !== null) {
      const range = resolution.range;
      const {left, top, height} = range.getBoundingClientRect();
      containerDiv.style.top = `${top + height}px`;
      containerDiv.style.left = `${left}px`;
      containerDiv.style.display = 'block';
      containerDiv.style.position = 'absolute';

      rootElement.setAttribute('aria-controls', 'typeahead-menu');
      document.body.append(containerDiv);
      setAnchorElement(containerDiv);
      return () => {
        containerDiv.remove();
        setAnchorElement(null);
        rootElement.removeAttribute('aria-controls');
      };
    }
  }, [editor, resolution, options]);

  const applyCurrentSelected = useCallback(() => {
    if (options === null || selectedIndex === null) {
      return;
    }
    const selectedEntry = options[selectedIndex];

    close();

    editor.update(async () => {
      await removeSearchQueryFromText(editor, resolution.match);
      selectedEntry.onSelect(resolution.match.matchingString);
    });
  }, [close, editor, resolution.match, options, selectedIndex]);

  const updateSelectedIndex = useCallback(
    (index) => {
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
    if (options === null) {
      setSelectedIndex(null);
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
          if (options !== null && selectedIndex !== null) {
            const newSelectedIndex =
              selectedIndex !== options.length - 1 ? selectedIndex + 1 : 0;
            updateSelectedIndex(newSelectedIndex);
            const option = options[newSelectedIndex];
            if (option.ref.current) {
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
          if (options !== null && selectedIndex !== null) {
            const newSelectedIndex =
              selectedIndex !== 0 ? selectedIndex - 1 : options.length - 1;
            updateSelectedIndex(newSelectedIndex);
            const option = options[newSelectedIndex];
            if (option.ref.current) {
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
          if (options === null || selectedIndex === null) {
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
          if (options === null || selectedIndex === null) {
            return false;
          }
          if (event !== null) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          applyCurrentSelected();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [
    applyCurrentSelected,
    close,
    editor,
    options,
    selectedIndex,
    updateSelectedIndex,
  ]);

  const listItemProps = useMemo(
    () => ({
      applyCurrentSelected,
      isSelected: (index: number) => index === selectedIndex,
      setSelectedIndex,
    }),
    [applyCurrentSelected, selectedIndex],
  );

  return resolution != null && options != null
    ? menuRenderFn(
        anchorElement,
        options,
        listItemProps,
        resolution.match.matchingString,
      )
    : null;
}

function useSlashShortcutMenu(
  editor: LexicalEditor,
  getOptions: OptionResolverFn,
  menuRenderFn: MenuRenderFn,
): JSX.Element {
  const [resolution, setResolution] = useState<Resolution | null>(null);

  const options = useMemo(
    () =>
      getOptions(resolution != null ? resolution.match.matchingString : null),
    [getOptions, resolution],
  );

  useEffect(() => {
    options.forEach((option) => {
      if (!editor.hasNodes([option.nodeKlass])) {
        throw new Error(
          `SlashShortcutMenuPlugin: ${option.nodeKlass.name} not registered on editor`,
        );
      }
    });
  }, [editor, options]);

  useEffect(() => {
    let activeRange: Range | null = document.createRange();
    let previousText = null;

    const updateListener = () => {
      const range = activeRange;
      const text = getQueryTextForSearch(editor);
      if (text === previousText || range === null) {
        startTransition(() => setResolution(null));
        return;
      }
      previousText = text;

      if (text === null) {
        startTransition(() => setResolution(null));
        return;
      }
      const match = getPossibleMatch(text);

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
    };

    const removeUpdateListener = editor.registerUpdateListener(updateListener);

    return () => {
      activeRange = null;
      removeUpdateListener();
    };
  }, [editor, resolution]);

  const closeTypeahead = useCallback(() => {
    setResolution(null);
  }, []);

  return resolution === null || editor === null
    ? null
    : createPortal(
        <ShortcutTypeahead
          close={closeTypeahead}
          resolution={resolution}
          editor={editor}
          options={options}
          menuRenderFn={menuRenderFn}
        />,
        document.body,
      );
}

export default function LexicalSlashShortcutMenuPlugin({
  getOptions,
  menuRenderFn,
}: {
  getOptions: OptionResolverFn;
  menuRenderFn: MenuRenderFn;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  return useSlashShortcutMenu(editor, getOptions, menuRenderFn);
}
