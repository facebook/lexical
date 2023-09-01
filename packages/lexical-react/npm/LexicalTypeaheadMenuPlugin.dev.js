/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var LexicalComposerContext = require('@lexical/react/LexicalComposerContext');
var lexical = require('lexical');
var React = require('react');
var utils = require('@lexical/utils');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const CAN_USE_DOM = typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof window.document.createElement !== 'undefined';

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const useLayoutEffectImpl = CAN_USE_DOM ? React.useLayoutEffect : React.useEffect;
var useLayoutEffect = useLayoutEffectImpl;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
class MenuOption {
  constructor(key) {
    this.key = key;
    this.ref = {
      current: null
    };
    this.setRefElement = this.setRefElement.bind(this);
  }
  setRefElement(element) {
    this.ref = {
      current: element
    };
  }
}
const scrollIntoViewIfNeeded = target => {
  const typeaheadContainerNode = document.getElementById('typeahead-menu');
  if (!typeaheadContainerNode) return;
  const typeaheadRect = typeaheadContainerNode.getBoundingClientRect();
  if (typeaheadRect.top + typeaheadRect.height > window.innerHeight) {
    typeaheadContainerNode.scrollIntoView({
      block: 'center'
    });
  }
  if (typeaheadRect.top < 0) {
    typeaheadContainerNode.scrollIntoView({
      block: 'center'
    });
  }
  target.scrollIntoView({
    block: 'nearest'
  });
};

/**
 * Walk backwards along user input and forward through entity title to try
 * and replace more of the user's text with entity.
 */
function getFullMatchOffset(documentText, entryText, offset) {
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
function $splitNodeContainingQuery(match) {
  const selection = lexical.$getSelection();
  if (!lexical.$isRangeSelection(selection) || !selection.isCollapsed()) {
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
  const queryOffset = getFullMatchOffset(textContent, match.matchingString, characterOffset);
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

// Got from https://stackoverflow.com/a/42543908/2013580
function getScrollParent$1(element, includeHidden) {
  let style = getComputedStyle(element);
  const excludeStaticParent = style.position === 'absolute';
  const overflowRegex = includeHidden ? /(auto|scroll|hidden)/ : /(auto|scroll)/;
  if (style.position === 'fixed') {
    return document.body;
  }
  for (let parent = element; parent = parent.parentElement;) {
    style = getComputedStyle(parent);
    if (excludeStaticParent && style.position === 'static') {
      continue;
    }
    if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) {
      return parent;
    }
  }
  return document.body;
}
function isTriggerVisibleInNearestScrollContainer$1(targetElement, containerElement) {
  const tRect = targetElement.getBoundingClientRect();
  const cRect = containerElement.getBoundingClientRect();
  return tRect.top > cRect.top && tRect.top < cRect.bottom;
}

// Reposition the menu on scroll, window resize, and element resize.
function useDynamicPositioning$1(resolution, targetElement, onReposition, onVisibilityChange) {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  React.useEffect(() => {
    if (targetElement != null && resolution != null) {
      const rootElement = editor.getRootElement();
      const rootScrollParent = rootElement != null ? getScrollParent$1(rootElement, false) : document.body;
      let ticking = false;
      let previousIsInView = isTriggerVisibleInNearestScrollContainer$1(targetElement, rootScrollParent);
      const handleScroll = function () {
        if (!ticking) {
          window.requestAnimationFrame(function () {
            onReposition();
            ticking = false;
          });
          ticking = true;
        }
        const isInView = isTriggerVisibleInNearestScrollContainer$1(targetElement, rootScrollParent);
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
        passive: true
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
const SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND$1 = lexical.createCommand('SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND');
function LexicalMenu({
  close,
  editor,
  anchorElementRef,
  resolution,
  options,
  menuRenderFn,
  onSelectOption,
  shouldSplitNodeWithQuery = false
}) {
  const [selectedIndex, setHighlightedIndex] = React.useState(null);
  const matchingString = resolution.match && resolution.match.matchingString;
  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [matchingString]);
  const selectOptionAndCleanUp = React.useCallback(selectedEntry => {
    editor.update(() => {
      const textNodeContainingQuery = resolution.match != null && shouldSplitNodeWithQuery ? $splitNodeContainingQuery(resolution.match) : null;
      onSelectOption(selectedEntry, textNodeContainingQuery, close, resolution.match ? resolution.match.matchingString : '');
    });
  }, [editor, shouldSplitNodeWithQuery, resolution.match, onSelectOption, close]);
  const updateSelectedIndex = React.useCallback(index => {
    const rootElem = editor.getRootElement();
    if (rootElem !== null) {
      rootElem.setAttribute('aria-activedescendant', 'typeahead-item-' + index);
      setHighlightedIndex(index);
    }
  }, [editor]);
  React.useEffect(() => {
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
  React.useEffect(() => {
    return utils.mergeRegister(editor.registerCommand(SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND$1, ({
      option
    }) => {
      if (option.ref && option.ref.current != null) {
        scrollIntoViewIfNeeded(option.ref.current);
        return true;
      }
      return false;
    }, lexical.COMMAND_PRIORITY_LOW));
  }, [editor, updateSelectedIndex]);
  React.useEffect(() => {
    return utils.mergeRegister(editor.registerCommand(lexical.KEY_ARROW_DOWN_COMMAND, payload => {
      const event = payload;
      if (options !== null && options.length && selectedIndex !== null) {
        const newSelectedIndex = selectedIndex !== options.length - 1 ? selectedIndex + 1 : 0;
        updateSelectedIndex(newSelectedIndex);
        const option = options[newSelectedIndex];
        if (option.ref != null && option.ref.current) {
          editor.dispatchCommand(SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND$1, {
            index: newSelectedIndex,
            option
          });
        }
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return true;
    }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_ARROW_UP_COMMAND, payload => {
      const event = payload;
      if (options !== null && options.length && selectedIndex !== null) {
        const newSelectedIndex = selectedIndex !== 0 ? selectedIndex - 1 : options.length - 1;
        updateSelectedIndex(newSelectedIndex);
        const option = options[newSelectedIndex];
        if (option.ref != null && option.ref.current) {
          scrollIntoViewIfNeeded(option.ref.current);
        }
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return true;
    }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_ESCAPE_COMMAND, payload => {
      const event = payload;
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
      return true;
    }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_TAB_COMMAND, payload => {
      const event = payload;
      if (options === null || selectedIndex === null || options[selectedIndex] == null) {
        return false;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      selectOptionAndCleanUp(options[selectedIndex]);
      return true;
    }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_ENTER_COMMAND, event => {
      if (options === null || selectedIndex === null || options[selectedIndex] == null) {
        return false;
      }
      if (event !== null) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      selectOptionAndCleanUp(options[selectedIndex]);
      return true;
    }, lexical.COMMAND_PRIORITY_LOW));
  }, [selectOptionAndCleanUp, close, editor, options, selectedIndex, updateSelectedIndex]);
  const listItemProps = React.useMemo(() => ({
    options,
    selectOptionAndCleanUp,
    selectedIndex,
    setHighlightedIndex
  }), [selectOptionAndCleanUp, selectedIndex, options]);
  return menuRenderFn(anchorElementRef, listItemProps, resolution.match ? resolution.match.matchingString : '');
}
function useMenuAnchorRef(resolution, setResolution, className) {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  const anchorElementRef = React.useRef(document.createElement('div'));
  const positionMenu = React.useCallback(() => {
    const rootElement = editor.getRootElement();
    const containerDiv = anchorElementRef.current;
    const menuEle = containerDiv.firstChild;
    if (rootElement !== null && resolution !== null) {
      const {
        left,
        top,
        width,
        height
      } = resolution.getRect();
      containerDiv.style.top = `${top + window.pageYOffset}px`;
      containerDiv.style.left = `${left + window.pageXOffset}px`;
      containerDiv.style.height = `${height}px`;
      containerDiv.style.width = `${width}px`;
      if (menuEle !== null) {
        const menuRect = menuEle.getBoundingClientRect();
        const menuHeight = menuRect.height;
        const menuWidth = menuRect.width;
        const rootElementRect = rootElement.getBoundingClientRect();
        if (left + menuWidth > rootElementRect.right) {
          containerDiv.style.left = `${rootElementRect.right - menuWidth + window.pageXOffset}px`;
        }
        const margin = 10;
        if ((top + menuHeight > window.innerHeight || top + menuHeight > rootElementRect.bottom) && top - rootElementRect.top > menuHeight) {
          containerDiv.style.top = `${top - menuHeight + window.pageYOffset - (height + margin)}px`;
        }
      }
      if (!containerDiv.isConnected) {
        if (className != null) {
          containerDiv.className = className;
        }
        containerDiv.setAttribute('aria-label', 'Typeahead menu');
        containerDiv.setAttribute('id', 'typeahead-menu');
        containerDiv.setAttribute('role', 'listbox');
        containerDiv.style.display = 'block';
        containerDiv.style.position = 'absolute';
        document.body.append(containerDiv);
      }
      anchorElementRef.current = containerDiv;
      rootElement.setAttribute('aria-controls', 'typeahead-menu');
    }
  }, [editor, resolution, className]);
  React.useEffect(() => {
    const rootElement = editor.getRootElement();
    if (resolution !== null) {
      positionMenu();
      return () => {
        if (rootElement !== null) {
          rootElement.removeAttribute('aria-controls');
        }
        const containerDiv = anchorElementRef.current;
        if (containerDiv !== null && containerDiv.isConnected) {
          containerDiv.remove();
        }
      };
    }
  }, [editor, positionMenu, resolution]);
  const onVisibilityChange = React.useCallback(isInView => {
    if (resolution !== null) {
      if (!isInView) {
        setResolution(null);
      }
    }
  }, [resolution, setResolution]);
  useDynamicPositioning$1(resolution, anchorElementRef.current, positionMenu, onVisibilityChange);
  return anchorElementRef;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const PUNCTUATION = '\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%\'"~=<>_:;';
function getTextUpToAnchor(selection) {
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
function tryToPositionRange(leadOffset, range) {
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
function getQueryTextForSearch(editor) {
  let text = null;
  editor.getEditorState().read(() => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return;
    }
    text = getTextUpToAnchor(selection);
  });
  return text;
}
function isSelectionOnEntityBoundary(editor, offset) {
  if (offset !== 0) {
    return false;
  }
  return editor.getEditorState().read(() => {
    const selection = lexical.$getSelection();
    if (lexical.$isRangeSelection(selection)) {
      const anchor = selection.anchor;
      const anchorNode = anchor.getNode();
      const prevSibling = anchorNode.getPreviousSibling();
      return lexical.$isTextNode(prevSibling) && prevSibling.isTextEntity();
    }
    return false;
  });
}
function startTransition(callback) {
  if (React.startTransition) {
    React.startTransition(callback);
  } else {
    callback();
  }
}

// Got from https://stackoverflow.com/a/42543908/2013580
function getScrollParent(element, includeHidden) {
  let style = getComputedStyle(element);
  const excludeStaticParent = style.position === 'absolute';
  const overflowRegex = includeHidden ? /(auto|scroll|hidden)/ : /(auto|scroll)/;
  if (style.position === 'fixed') {
    return document.body;
  }
  for (let parent = element; parent = parent.parentElement;) {
    style = getComputedStyle(parent);
    if (excludeStaticParent && style.position === 'static') {
      continue;
    }
    if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) {
      return parent;
    }
  }
  return document.body;
}
function isTriggerVisibleInNearestScrollContainer(targetElement, containerElement) {
  const tRect = targetElement.getBoundingClientRect();
  const cRect = containerElement.getBoundingClientRect();
  return tRect.top > cRect.top && tRect.top < cRect.bottom;
}

// Reposition the menu on scroll, window resize, and element resize.
function useDynamicPositioning(resolution, targetElement, onReposition, onVisibilityChange) {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  React.useEffect(() => {
    if (targetElement != null && resolution != null) {
      const rootElement = editor.getRootElement();
      const rootScrollParent = rootElement != null ? getScrollParent(rootElement, false) : document.body;
      let ticking = false;
      let previousIsInView = isTriggerVisibleInNearestScrollContainer(targetElement, rootScrollParent);
      const handleScroll = function () {
        if (!ticking) {
          window.requestAnimationFrame(function () {
            onReposition();
            ticking = false;
          });
          ticking = true;
        }
        const isInView = isTriggerVisibleInNearestScrollContainer(targetElement, rootScrollParent);
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
        passive: true
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
const SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND = lexical.createCommand('SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND');
function useBasicTypeaheadTriggerMatch(trigger, {
  minLength = 1,
  maxLength = 75
}) {
  return React.useCallback(text => {
    const validChars = '[^' + trigger + PUNCTUATION + '\\s]';
    const TypeaheadTriggerRegex = new RegExp('(^|\\s|\\()(' + '[' + trigger + ']' + '((?:' + validChars + '){0,' + maxLength + '})' + ')$');
    const match = TypeaheadTriggerRegex.exec(text);
    if (match !== null) {
      const maybeLeadingWhitespace = match[1];
      const matchingString = match[3];
      if (matchingString.length >= minLength) {
        return {
          leadOffset: match.index + maybeLeadingWhitespace.length,
          matchingString,
          replaceableString: match[2]
        };
      }
    }
    return null;
  }, [maxLength, minLength, trigger]);
}
function LexicalTypeaheadMenuPlugin({
  options,
  onQueryChange,
  onSelectOption,
  onOpen,
  onClose,
  menuRenderFn,
  triggerFn,
  anchorClassName
}) {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  const [resolution, setResolution] = React.useState(null);
  const anchorElementRef = useMenuAnchorRef(resolution, setResolution, anchorClassName);
  const closeTypeahead = React.useCallback(() => {
    setResolution(null);
    if (onClose != null && resolution !== null) {
      onClose();
    }
  }, [onClose, resolution]);
  const openTypeahead = React.useCallback(res => {
    setResolution(res);
    if (onOpen != null && resolution === null) {
      onOpen(res);
    }
  }, [onOpen, resolution]);
  React.useEffect(() => {
    const updateListener = () => {
      editor.getEditorState().read(() => {
        const range = document.createRange();
        const selection = lexical.$getSelection();
        const text = getQueryTextForSearch(editor);
        if (!lexical.$isRangeSelection(selection) || !selection.isCollapsed() || text === null || range === null) {
          closeTypeahead();
          return;
        }
        const match = triggerFn(text, editor);
        onQueryChange(match ? match.matchingString : null);
        if (match !== null && !isSelectionOnEntityBoundary(editor, match.leadOffset)) {
          const isRangePositioned = tryToPositionRange(match.leadOffset, range);
          if (isRangePositioned !== null) {
            startTransition(() => openTypeahead({
              getRect: () => range.getBoundingClientRect(),
              match
            }));
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
  }, [editor, triggerFn, onQueryChange, resolution, closeTypeahead, openTypeahead]);
  return resolution === null || editor === null ? null : /*#__PURE__*/React.createElement(LexicalMenu, {
    close: closeTypeahead,
    resolution: resolution,
    editor: editor,
    anchorElementRef: anchorElementRef,
    options: options,
    menuRenderFn: menuRenderFn,
    shouldSplitNodeWithQuery: true,
    onSelectOption: onSelectOption
  });
}

exports.LexicalTypeaheadMenuPlugin = LexicalTypeaheadMenuPlugin;
exports.MenuOption = MenuOption;
exports.PUNCTUATION = PUNCTUATION;
exports.SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND = SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND;
exports.getScrollParent = getScrollParent;
exports.useBasicTypeaheadTriggerMatch = useBasicTypeaheadTriggerMatch;
exports.useDynamicPositioning = useDynamicPositioning;
