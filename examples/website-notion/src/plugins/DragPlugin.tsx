/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {BLOCK_DRAG_HANDLE_ATTR} from '@lexical/react/LexicalBlockDragHandleExtension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {DraggableBlockPlugin_EXPERIMENTAL} from '@lexical/react/LexicalDraggableBlockPlugin';
import {
  $createParagraphNode,
  $createTextNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $isParagraphNode,
  $isTextNode,
} from 'lexical';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import * as ReactDOM from 'react-dom';

import {BlockOption, getBlockOptions, ICON_URLS} from './blockOptions';

interface PickerState {
  insertBefore: boolean;
  targetNodeKey: string;
}

interface PickerPosition {
  left: number;
  top: number;
}

interface DragPluginProps {
  anchorElem: HTMLElement;
}

/**
 * Drop-target line + a floating "+" affordance positioned next to the
 * currently hovered block. The drag handle itself is rendered into each
 * top-level block's DOM by `BlockDragHandleExtension` (registered in
 * `Editor.tsx`); the plugin here only forwards hover changes via
 * `onElementChanged` so this component can position the picker trigger.
 */
export function DragPlugin({anchorElem}: DragPluginProps) {
  const [editor] = useLexicalComposerContext();
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [hoveredBlockElem, setHoveredBlockElem] = useState<HTMLElement | null>(
    null,
  );
  const [isOverAddButton, setIsOverAddButton] = useState(false);
  const lastHoveredBlockRef = useRef<HTMLElement | null>(null);
  if (hoveredBlockElem) {
    lastHoveredBlockRef.current = hoveredBlockElem;
  }
  // While the mouse is on the "+" button (rendered in a portal outside the
  // editor root), the editor's mouseleave fires and clears `hoveredBlockElem`.
  // Hold the last hovered block so the button stays positioned and visible.
  const effectiveBlockElem =
    hoveredBlockElem || (isOverAddButton ? lastHoveredBlockRef.current : null);

  // When the "+" is hovered (but the block itself isn't), keep the drag
  // handle visible by stamping a data attribute on the block that the
  // CSS targets the same as `:hover`.
  const blockForAddHover =
    isOverAddButton && lastHoveredBlockRef.current
      ? lastHoveredBlockRef.current
      : null;
  useEffect(() => {
    if (
      !blockForAddHover ||
      !blockForAddHover.querySelector(`:scope > [${BLOCK_DRAG_HANDLE_ATTR}]`)
    ) {
      return;
    }
    blockForAddHover.setAttribute('data-add-button-hover', '');
    return () => {
      blockForAddHover.removeAttribute('data-add-button-hover');
    };
  }, [blockForAddHover]);
  const [pickerState, setPickerState] = useState<PickerState | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [queryString, setQueryString] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [pickerPosition, setPickerPosition] = useState<PickerPosition | null>(
    null,
  );

  const options = useMemo(() => {
    const base = getBlockOptions(editor);
    if (!queryString) {
      return base;
    }
    const regex = new RegExp(queryString, 'i');
    return base.filter(
      o => regex.test(o.title) || o.keywords.some(k => regex.test(k)),
    );
  }, [editor, queryString]);

  const closePicker = useCallback(() => {
    setIsPickerOpen(false);
    setPickerState(null);
    setQueryString('');
    setHighlightedIndex(0);
  }, []);

  const selectOption = useCallback(
    (option: BlockOption) => {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightedIndex(i => Math.min(i, Math.max(options.length - 1, 0)));
  }, [isPickerOpen, options.length]);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }
    const onClickOutside = (e: MouseEvent) => {
      if (
        (pickerRef.current !== null &&
          pickerRef.current.contains(e.target as Node)) ||
        (addButtonRef.current !== null &&
          addButtonRef.current.contains(e.target as Node))
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
    const onKeyDown = (e: KeyboardEvent) => {
      if (!options.length) {
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(i => (i + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(i => (i - 1 + options.length) % options.length);
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

  function openPicker(e: React.MouseEvent) {
    const targetBlockElem = effectiveBlockElem;
    if (!targetBlockElem) {
      return;
    }
    let targetNodeKey: string | null = null;
    editor.read(() => {
      const node = $getNearestNodeFromDOMNode(targetBlockElem);
      if (node) {
        targetNodeKey = node.getKey();
      }
    });
    if (!targetNodeKey) {
      return;
    }
    const addButton = addButtonRef.current;
    const rect = addButton ? addButton.getBoundingClientRect() : null;
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
  }

  // Position the "+" button relative to the hovered block's wrapper rect
  // (same coordinate system as the extension's drag handle, which sits at
  // `left: -22px` from the wrapper via CSS). See the playground's
  // DraggableBlockPlugin for the full rationale.
  const addButtonStyle: React.CSSProperties = useMemo(() => {
    const blockForPosition = effectiveBlockElem || lastHoveredBlockRef.current;
    if (!blockForPosition) {
      return {display: 'none'};
    }
    const wrapper = blockForPosition.parentElement;
    const positionEl =
      wrapper && wrapper.hasAttribute(BLOCK_DRAG_WRAPPER_ATTR)
        ? wrapper
        : blockForPosition;
    const rect = positionEl.getBoundingClientRect();
    const anchorRect = anchorElem.getBoundingClientRect();
    return {
      left: rect.left - anchorRect.left - 40 + anchorElem.scrollLeft,
      opacity: effectiveBlockElem ? undefined : 0,
      pointerEvents: 'auto',
      position: 'absolute',
      top: rect.top - anchorRect.top + 4 + anchorElem.scrollTop,
    };
  }, [effectiveBlockElem, anchorElem]);

  return (
    <>
      {isPickerOpen && pickerPosition
        ? ReactDOM.createPortal(
            <div
              ref={pickerRef}
              className="w-[230px] overflow-hidden rounded-lg border border-solid border-zinc-200 bg-white text-[#1c1e21] shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:border-zinc-700 dark:bg-[#232325] dark:text-[#e3e3e3] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
              style={{
                left: pickerPosition.left,
                position: 'absolute',
                top: pickerPosition.top,
                zIndex: 30,
              }}>
              <input
                ref={searchInputRef}
                className="block w-full border-0 border-b [border-bottom-style:solid] border-zinc-200 bg-transparent px-3 py-2 text-[0.85rem] text-inherit outline-none dark:border-zinc-700"
                placeholder="Filter blocks..."
                value={queryString}
                onChange={e => setQueryString(e.target.value)}
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
                        className="inline-block h-4 w-4 shrink-0 [background-size:contain] bg-center bg-no-repeat opacity-70 dark:invert"
                        style={{
                          backgroundImage: `url('${ICON_URLS[option.iconKey]}')`,
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
      {ReactDOM.createPortal(
        <button
          ref={addButtonRef}
          type="button"
          className="flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent [background-size:14px_14px] bg-center bg-no-repeat opacity-50 hover:bg-zinc-100 hover:opacity-100 dark:invert dark:hover:bg-[#ffffdd]"
          style={{...addButtonStyle, backgroundImage: "url('/img/plus.svg')"}}
          title="Click to add below (Alt/Option to add above)"
          onMouseEnter={() => setIsOverAddButton(true)}
          onMouseLeave={() => setIsOverAddButton(false)}
          onMouseDown={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={openPicker}
        />,
        anchorElem,
      )}
      <DraggableBlockPlugin_EXPERIMENTAL
        anchorElem={anchorElem}
        targetLineRef={targetLineRef}
        targetLineComponent={
          <div
            ref={targetLineRef}
            className="pointer-events-none absolute top-0 left-0 h-[3px] bg-blue-400 opacity-0 [will-change:transform]"
          />
        }
        onElementChanged={setHoveredBlockElem}
      />
    </>
  );
}
