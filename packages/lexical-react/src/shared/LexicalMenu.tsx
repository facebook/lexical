/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {getScrollParent} from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  CAN_USE_DOM,
  COMMAND_PRIORITY_LOW,
  CommandListenerPriority,
  createCommand,
  getDOMShadowRoots,
  isDOMShadowRoot,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  LexicalCommand,
  LexicalEditor,
  mergeRegister,
  registerEventListener,
  TextNode,
} from 'lexical';
import {
  ReactPortal,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactDOM from 'react-dom';

import useLayoutEffect from './useLayoutEffect';

/**
 * Describes where a typeahead trigger matched the text before the cursor: the
 * `leadOffset` where the match starts, the captured `matchingString` (the query
 * after the trigger), and the `replaceableString` (the full matched text,
 * including the trigger, that should be replaced when an option is selected).
 */
export type MenuTextMatch = {
  leadOffset: number;
  matchingString: string;
  replaceableString: string;
};

/**
 * The position and match information for an open menu: a `getRect` function that
 * returns the anchor rectangle the menu is positioned against, and the optional
 * {@link MenuTextMatch} that opened it.
 */
export type MenuResolution = {
  match?: MenuTextMatch;
  getRect: () => DOMRect;
};

/**
 * The base class for an item shown in a {@link LexicalTypeaheadMenuPlugin} or
 * {@link LexicalNodeMenuPlugin} menu. Each option has a unique `key` and a `ref`
 * to its rendered element (used for scrolling and keyboard navigation).
 * Subclass it to attach your own data such as a label or callback.
 */
export class MenuOption {
  key: string;
  ref?: RefObject<HTMLElement | null>;
  icon?: JSX.Element;
  title?: JSX.Element | string;

  constructor(key: string) {
    this.key = key;
    this.ref = {current: null};
    this.setRefElement = this.setRefElement.bind(this);
  }

  setRefElement(element: HTMLElement | null) {
    this.ref = {current: element};
  }
}

/**
 * A render function for a menu's contents. It receives the anchor element ref,
 * the current item props (selected index, options, and helpers to select or
 * highlight an option), and the matching query string, and returns the menu
 * element (or portal) to render, or `null` to render nothing. Provide one to
 * fully customize a menu's appearance.
 */
export type MenuRenderFn<TOption extends MenuOption> = (
  anchorElementRef: RefObject<HTMLElement | null>,
  itemProps: {
    selectedIndex: number | null;
    selectOptionAndCleanUp: (option: TOption) => void;
    setHighlightedIndex: (index: number) => void;
    options: TOption[];
  },
  matchingString: string,
) => ReactPortal | JSX.Element | null;

const scrollIntoViewIfNeeded = (target: HTMLElement) => {
  const typeaheadContainerNode = target.closest(
    '#typeahead-menu',
  ) as HTMLElement | null;
  if (!typeaheadContainerNode) {
    return;
  }

  const typeaheadRect = typeaheadContainerNode.getBoundingClientRect();

  if (typeaheadRect.top + typeaheadRect.height > window.innerHeight) {
    typeaheadContainerNode.scrollIntoView({
      block: 'center',
    });
  }

  if (typeaheadRect.top < 0) {
    typeaheadContainerNode.scrollIntoView({
      block: 'center',
    });
  }

  target.scrollIntoView({block: 'nearest'});
};

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
    if (documentText.slice(-i) === entryText.substring(0, i)) {
      triggerOffset = i;
    }
  }
  return triggerOffset;
}

/**
 * Split Lexical TextNode and return a new TextNode only containing matched text.
 * Common use cases include: removing the node, replacing with a new node.
 */
function $splitNodeContainingQuery(match: MenuTextMatch): TextNode | null {
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

function isTriggerVisibleInNearestScrollContainer(
  targetElement: HTMLElement,
  containerElement: HTMLElement,
): boolean {
  const tRect = targetElement.getBoundingClientRect();
  const cRect = containerElement.getBoundingClientRect();

  const VISIBILITY_MARGIN_PX = 6;
  return (
    tRect.top >= cRect.top - VISIBILITY_MARGIN_PX &&
    tRect.top <= cRect.bottom + VISIBILITY_MARGIN_PX
  );
}

/**
 * Keeps an open menu aligned with its trigger by calling `onReposition` on
 * scroll, window resize, and target element resize while `resolution` is set.
 * Optionally calls `onVisibilityChange` when the trigger enters or leaves its
 * nearest scroll container's viewport.
 */
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
      // Scroll events are non-composed and do not cross shadow boundaries,
      // so the document-level listener below never sees scrolls inside an
      // enclosing shadow tree. Key off the editor root rather than the
      // target — the target may be portaled into the light DOM while the
      // editor (and its scroll container) live inside a shadow tree, and
      // getDOMShadowRoots(target) would then return an empty list. Walk
      // out of the editor's enclosing shadow roots instead so internal
      // scrolls at any depth reposition the floating menu.
      const enclosingShadowRoots = getDOMShadowRoots(
        rootElement ?? targetElement,
      );
      resizeObserver.observe(targetElement);
      return mergeRegister(
        registerEventListener(window, 'resize', onReposition),
        registerEventListener(document, 'scroll', handleScroll, {
          capture: true,
          passive: true,
        }),
        ...enclosingShadowRoots.map(root =>
          registerEventListener(root, 'scroll', handleScroll, {
            capture: true,
            passive: true,
          }),
        ),
        () => resizeObserver.unobserve(targetElement),
      );
    }
  }, [targetElement, editor, onVisibilityChange, onReposition, resolution]);
}

export const SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND: LexicalCommand<{
  index: number;
  option: MenuOption;
}> = /* @__PURE__ */ createCommand('SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND');

function MenuItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: MenuOption;
}) {
  let className = 'item';
  if (isSelected) {
    className += ' selected';
  }
  return (
    <li
      key={option.key}
      tabIndex={-1}
      className={className}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={'typeahead-item-' + index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}>
      {option.icon}
      <span className="text">{option.title}</span>
    </li>
  );
}

export function LexicalMenu<TOption extends MenuOption>({
  close,
  editor,
  anchorElementRef,
  resolution,
  options,
  menuRenderFn: menuRenderFnProp,
  onSelectOption,
  shouldSplitNodeWithQuery = false,
  commandPriority = COMMAND_PRIORITY_LOW,
  preselectFirstItem = true,
}: {
  close: () => void;
  editor: LexicalEditor;
  anchorElementRef: RefObject<HTMLElement | null>;
  resolution: MenuResolution;
  options: TOption[];
  shouldSplitNodeWithQuery?: boolean;
  menuRenderFn?: MenuRenderFn<TOption>;
  onSelectOption: (
    option: TOption,
    textNodeContainingQuery: TextNode | null,
    closeMenu: () => void,
    matchingString: string,
  ) => void;
  commandPriority?: CommandListenerPriority;
  preselectFirstItem?: boolean;
}): JSX.Element | null {
  const [rawSelectedIndex, setHighlightedIndex] = useState<null | number>(null);
  // Clamp highlighted index if options list shrinks
  const selectedIndex =
    rawSelectedIndex !== null
      ? Math.min(options.length - 1, rawSelectedIndex)
      : null;

  const matchingString = resolution.match && resolution.match.matchingString;

  useEffect(() => {
    if (preselectFirstItem) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHighlightedIndex(0);
    }
  }, [matchingString, preselectFirstItem]);

  const selectOptionAndCleanUp = useCallback(
    (selectedEntry: TOption) => {
      editor.update(() => {
        const textNodeContainingQuery =
          resolution.match != null && shouldSplitNodeWithQuery
            ? $splitNodeContainingQuery(resolution.match)
            : null;

        onSelectOption(
          selectedEntry,
          textNodeContainingQuery,
          close,
          resolution.match ? resolution.match.matchingString : '',
        );
      });
    },
    [editor, shouldSplitNodeWithQuery, resolution.match, onSelectOption, close],
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

  const defaultMenuRenderFn = useCallback(() => {
    return anchorElementRef.current && options.length
      ? ReactDOM.createPortal(
          <div className="typeahead-popover mentions-menu">
            <ul>
              {options.map((option, i: number) => (
                <MenuItem
                  index={i}
                  isSelected={selectedIndex === i}
                  onClick={() => {
                    setHighlightedIndex(i);
                    selectOptionAndCleanUp(option);
                  }}
                  onMouseEnter={() => {
                    setHighlightedIndex(i);
                  }}
                  key={option.key}
                  option={option}
                />
              ))}
            </ul>
          </div>,
          anchorElementRef.current,
        )
      : null;
  }, [
    anchorElementRef,
    options,
    selectedIndex,
    selectOptionAndCleanUp,
    setHighlightedIndex,
  ]);

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
    } else if (selectedIndex === null && preselectFirstItem) {
      updateSelectedIndex(0);
    }
  }, [options, selectedIndex, updateSelectedIndex, preselectFirstItem]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND,
        ({option}) => {
          if (option.ref && option.ref.current != null) {
            scrollIntoViewIfNeeded(option.ref.current);
            return true;
          }

          return false;
        },
        commandPriority,
      ),
    );
  }, [editor, updateSelectedIndex, commandPriority]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_DOWN_COMMAND,
        payload => {
          const event = payload;
          if (options !== null && options.length) {
            const newSelectedIndex =
              selectedIndex === null
                ? 0
                : selectedIndex !== options.length - 1
                  ? selectedIndex + 1
                  : 0;

            updateSelectedIndex(newSelectedIndex);

            const option = options[newSelectedIndex];
            if (!option) {
              updateSelectedIndex(-1);
              event.preventDefault();
              event.stopImmediatePropagation();
              return true;
            }

            if (option.ref && option.ref.current) {
              editor.dispatchCommand(
                SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND,
                {
                  index: newSelectedIndex,
                  option,
                },
              );
            }
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          return true;
        },
        commandPriority,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_UP_COMMAND,
        payload => {
          const event = payload;
          if (options !== null && options.length) {
            const newSelectedIndex =
              selectedIndex === null
                ? options.length - 1
                : selectedIndex !== 0
                  ? selectedIndex - 1
                  : options.length - 1;

            updateSelectedIndex(newSelectedIndex);

            const option = options[newSelectedIndex];
            if (!option) {
              updateSelectedIndex(-1);
              event.preventDefault();
              event.stopImmediatePropagation();
              return true;
            }

            if (option.ref && option.ref.current) {
              scrollIntoViewIfNeeded(option.ref.current);
            }
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          return true;
        },
        commandPriority,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ESCAPE_COMMAND,
        payload => {
          const event = payload;
          event.preventDefault();
          event.stopImmediatePropagation();
          close();
          return true;
        },
        commandPriority,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_TAB_COMMAND,
        payload => {
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
        commandPriority,
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event: KeyboardEvent | null) => {
          if (
            options === null ||
            selectedIndex === null ||
            options[selectedIndex] == null ||
            // Shift+Enter must reach rich-text line-break handling
            (event && event.shiftKey)
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
        commandPriority,
      ),
    );
  }, [
    selectOptionAndCleanUp,
    close,
    editor,
    options,
    selectedIndex,
    updateSelectedIndex,
    commandPriority,
  ]);

  const listItemProps = useMemo(
    () => ({
      options,
      selectOptionAndCleanUp,
      selectedIndex,
      setHighlightedIndex,
    }),
    [selectOptionAndCleanUp, selectedIndex, options],
  );

  if (menuRenderFnProp != null) {
    return menuRenderFnProp(
      anchorElementRef,
      listItemProps,
      resolution.match ? resolution.match.matchingString : '',
    );
  }

  return defaultMenuRenderFn();
}

function setContainerDivAttributes(
  containerDiv: HTMLElement,
  className?: string,
) {
  if (className != null) {
    containerDiv.className = className;
  }
  containerDiv.setAttribute('aria-label', 'Typeahead menu');
  containerDiv.setAttribute('role', 'listbox');
  containerDiv.style.display = 'block';
  containerDiv.style.position = 'absolute';
}

function resolveMenuParent(
  editor: LexicalEditor,
): HTMLElement | ShadowRoot | undefined {
  if (!CAN_USE_DOM) {
    return undefined;
  }
  const rootElement = editor.getRootElement();
  if (rootElement !== null) {
    const root = rootElement.getRootNode();
    if (isDOMShadowRoot(root)) {
      return root as ShadowRoot;
    }
  }
  return document.body;
}

export function useMenuAnchorRef(
  resolution: MenuResolution | null,
  setResolution: (r: MenuResolution | null) => void,
  className?: string,
  parent?: HTMLElement,
  shouldIncludePageYOffset__EXPERIMENTAL: boolean = true,
): RefObject<HTMLElement | null> {
  const [editor] = useLexicalComposerContext();
  const resolvedParent: HTMLElement | ShadowRoot | undefined =
    parent ?? resolveMenuParent(editor);
  const initialAnchorElement = CAN_USE_DOM
    ? document.createElement('div')
    : null;
  const anchorElementRef = useRef<HTMLElement | null>(initialAnchorElement);
  const positionMenu = useCallback(() => {
    if (anchorElementRef.current === null || resolvedParent === undefined) {
      return;
    }
    anchorElementRef.current.style.top = anchorElementRef.current.style.bottom;
    const rootElement = editor.getRootElement();
    const containerDiv = anchorElementRef.current;

    const menuEle = containerDiv.firstChild as HTMLElement;
    if (rootElement !== null && resolution !== null) {
      const {left, top, width, height} = resolution.getRect();
      const anchorHeight = anchorElementRef.current.offsetHeight; // use to position under anchor
      containerDiv.style.top = `${
        top +
        anchorHeight +
        3 +
        (shouldIncludePageYOffset__EXPERIMENTAL ? window.pageYOffset : 0)
      }px`;
      containerDiv.style.left = `${left + window.pageXOffset}px`;
      containerDiv.style.height = `${height}px`;
      containerDiv.style.width = `${width}px`;
      if (menuEle !== null) {
        menuEle.style.top = `${top}`;
        const menuRect = menuEle.getBoundingClientRect();
        const menuHeight = menuRect.height;
        const menuWidth = menuRect.width;

        const rootElementRect = rootElement.getBoundingClientRect();

        if (left + menuWidth > rootElementRect.right) {
          containerDiv.style.left = `${
            rootElementRect.right - menuWidth + window.pageXOffset
          }px`;
        }
        if (
          (top + menuHeight > window.innerHeight ||
            top + menuHeight > rootElementRect.bottom) &&
          top - rootElementRect.top > menuHeight + height
        ) {
          containerDiv.style.top = `${
            top -
            menuHeight -
            height +
            (shouldIncludePageYOffset__EXPERIMENTAL ? window.pageYOffset : 0)
          }px`;
        }
      }

      if (!containerDiv.isConnected) {
        setContainerDivAttributes(containerDiv, className);
        resolvedParent.append(containerDiv);
      }
      containerDiv.setAttribute('id', 'typeahead-menu');
      rootElement.setAttribute('aria-controls', 'typeahead-menu');
    }
  }, [
    editor,
    resolution,
    shouldIncludePageYOffset__EXPERIMENTAL,
    className,
    resolvedParent,
  ]);

  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (resolution !== null) {
      positionMenu();
    }
    return () => {
      if (rootElement !== null) {
        rootElement.removeAttribute('aria-controls');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const containerDiv = anchorElementRef.current;
      if (containerDiv !== null && containerDiv.isConnected) {
        containerDiv.remove();
        containerDiv.removeAttribute('id');
      }
    };
  }, [editor, positionMenu, resolution]);

  const onVisibilityChange = useCallback(
    (isInView: boolean) => {
      if (resolution !== null) {
        if (!isInView) {
          setResolution(null);
        }
      }
    },
    [resolution, setResolution],
  );

  useDynamicPositioning(
    resolution,
    anchorElementRef.current,
    positionMenu,
    onVisibilityChange,
  );

  // Append the context for the menu immediately
  if (
    initialAnchorElement != null &&
    initialAnchorElement === anchorElementRef.current
  ) {
    setContainerDivAttributes(initialAnchorElement, className);
    if (resolvedParent != null) {
      resolvedParent.append(initialAnchorElement);
    }
  }

  return anchorElementRef;
}

/**
 * Detects whether the text before the cursor should open a typeahead menu.
 * Given the current `text` and `editor`, it returns a {@link MenuTextMatch}
 * describing the match, or `null` if there is none. See
 * {@link useBasicTypeaheadTriggerMatch} for a common implementation.
 */
export type TriggerFn = (
  text: string,
  editor: LexicalEditor,
) => MenuTextMatch | null;
