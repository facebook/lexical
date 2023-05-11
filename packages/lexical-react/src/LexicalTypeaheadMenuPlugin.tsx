/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  MenuRenderFn,
  MenuResolution,
  MenuTextMatch,
  TriggerFn,
} from './shared/LexicalMenu';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  createCommand,
  LexicalCommand,
  LexicalEditor,
  RangeSelection,
  TextNode,
} from 'lexical';
import {useCallback, useEffect, useState} from 'react';
import * as React from 'react';

import {LexicalMenu, MenuOption, useMenuAnchorRef} from './shared/LexicalMenu';

export const PUNCTUATION =
  '\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%\'"~=<>_:;';

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

// Got from https://stackoverflow.com/a/42543908/2013580
export function getScrollParent(
  element: HTMLElement,
  includeHidden: boolean,
): HTMLElement | HTMLBodyElement {
  let style = getComputedStyle(element);
  const excludeStaticParent = style.position === 'absolute';
  const overflowRegex = includeHidden
    ? /(auto|scroll|hidden)/
    : /(auto|scroll)/;
  if (style.position === 'fixed') {
    return document.body;
  }
  for (
    let parent: HTMLElement | null = element;
    (parent = parent.parentElement);

  ) {
    style = getComputedStyle(parent);
    if (excludeStaticParent && style.position === 'static') {
      continue;
    }
    if (
      overflowRegex.test(style.overflow + style.overflowY + style.overflowX)
    ) {
      return parent;
    }
  }
  return document.body;
}

function isTriggerVisibleInNearestScrollContainer(
  targetElement: HTMLElement,
  containerElement: HTMLElement,
): boolean {
  const tRect = targetElement.getBoundingClientRect();
  const cRect = containerElement.getBoundingClientRect();
  return tRect.top > cRect.top && tRect.top < cRect.bottom;
}

// Reposition the menu on scroll, window resize, and element resize.
export function useDynamicPositioning(
  resolution: MenuResolution | null,
  targetElement: HTMLElement | null,
  onReposition: () => void,
  onVisibilityChange?: (isInView: boolean) => void,
) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (targetElement != null && resolution != null) {
      const rootElement = editor.getRootElement();
      const rootScrollParent =
        rootElement != null
          ? getScrollParent(rootElement, false)
          : document.body;
      let ticking = false;
      let previousIsInView = isTriggerVisibleInNearestScrollContainer(
        targetElement,
        rootScrollParent,
      );
      const handleScroll = function () {
        if (!ticking) {
          window.requestAnimationFrame(function () {
            onReposition();
            ticking = false;
          });
          ticking = true;
        }
        const isInView = isTriggerVisibleInNearestScrollContainer(
          targetElement,
          rootScrollParent,
        );
        if (isInView !== previousIsInView) {
          previousIsInView = isInView;
          if (onVisibilityChange != null) {
            onVisibilityChange(isInView);
          }
        }
      };
      const resizeObserver = new ResizeObserver(onReposition);
      window.addEventListener('resize', onReposition);
      document.addEventListener('scroll', handleScroll, {
        capture: true,
        passive: true,
      });
      resizeObserver.observe(targetElement);
      return () => {
        resizeObserver.unobserve(targetElement);
        window.removeEventListener('resize', onReposition);
        document.removeEventListener('scroll', handleScroll);
      };
    }
  }, [targetElement, editor, onVisibilityChange, onReposition, resolution]);
}

export const SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND: LexicalCommand<{
  index: number;
  option: MenuOption;
}> = createCommand('SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND');

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

export type TypeaheadMenuPluginProps<TOption extends MenuOption> = {
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
  onOpen?: (resolution: MenuResolution) => void;
  onClose?: () => void;
  anchorClassName?: string;
};

export function LexicalTypeaheadMenuPlugin<TOption extends MenuOption>({
  options,
  onQueryChange,
  onSelectOption,
  onOpen,
  onClose,
  menuRenderFn,
  triggerFn,
  anchorClassName,
}: TypeaheadMenuPluginProps<TOption>): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [resolution, setResolution] = useState<MenuResolution | null>(null);
  const anchorElementRef = useMenuAnchorRef(
    resolution,
    setResolution,
    anchorClassName,
  );

  const closeTypeahead = useCallback(() => {
    setResolution(null);
    if (onClose != null && resolution !== null) {
      onClose();
    }
  }, [onClose, resolution]);

  const openTypeahead = useCallback(
    (res: MenuResolution) => {
      setResolution(res);
      if (onOpen != null && resolution === null) {
        onOpen(res);
      }
    },
    [onOpen, resolution],
  );

  useEffect(() => {
    const updateListener = () => {
      editor.getEditorState().read(() => {
        const range = document.createRange();
        const selection = $getSelection();
        const text = getQueryTextForSearch(editor);

        if (
          !$isRangeSelection(selection) ||
          !selection.isCollapsed() ||
          text === null ||
          range === null
        ) {
          closeTypeahead();
          return;
        }

        const match = triggerFn(text, editor);
        onQueryChange(match ? match.matchingString : null);

        if (
          match !== null &&
          !isSelectionOnEntityBoundary(editor, match.leadOffset)
        ) {
          const isRangePositioned = tryToPositionRange(match.leadOffset, range);
          if (isRangePositioned !== null) {
            startTransition(() =>
              openTypeahead({
                getRect: () => range.getBoundingClientRect(),
                match,
              }),
            );
            return;
          }
        }
        closeTypeahead();
      });
    };

    const removeUpdateListener = editor.registerUpdateListener(updateListener);

    return () => {
      removeUpdateListener();
    };
  }, [
    editor,
    triggerFn,
    onQueryChange,
    resolution,
    closeTypeahead,
    openTypeahead,
  ]);

  return resolution === null || editor === null ? null : (
    <LexicalMenu
      close={closeTypeahead}
      resolution={resolution}
      editor={editor}
      anchorElementRef={anchorElementRef}
      options={options}
      menuRenderFn={menuRenderFn}
      shouldSplitNodeWithQuery={true}
      onSelectOption={onSelectOption}
    />
  );
}

export {MenuOption, MenuRenderFn, MenuResolution, MenuTextMatch, TriggerFn};
