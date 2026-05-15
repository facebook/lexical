/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {NodeKey} from 'lexical';
import type {JSX} from 'react';

import './index.css';

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

import useModal from '../../hooks/useModal';
import {
  ComponentPickerMenuItem,
  ComponentPickerOption,
  getBaseOptions,
  getDynamicOptions,
} from '../ComponentPickerPlugin';

type PickerState = {
  insertBefore: boolean;
  targetNodeKey: NodeKey;
};

/**
 * Playground wrapper for the slot-driven DraggableBlockPlugin rewrite.
 *
 * The drag handle is rendered into each top-level block ElementNode's DOM by
 * `BlockDragHandleExtension` (wired in the playground via the editor's
 * extension list); this wrapper mounts the drop-target line and a floating
 * "+" affordance positioned next to the currently hovered block (tracked via
 * `onElementChanged`). Clicking "+" opens the component picker inline.
 */
export default function DraggableBlockPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [modal, showModal] = useModal();
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
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

  // When the "+" is hovered (but the block itself isn't, since the
  // pointer left the editor area), keep the drag handle visible by
  // stamping a data attribute on the block that the CSS treats the same
  // as `:hover`.
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
  const [pickerPosition, setPickerPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const options = useMemo(() => {
    const baseOptions = getBaseOptions(editor, showModal);
    if (!queryString) {
      return baseOptions;
    }
    const regex = new RegExp(queryString, 'i');
    return [
      ...getDynamicOptions(editor, queryString),
      ...baseOptions.filter(
        option =>
          regex.test(option.title) ||
          option.keywords.some(keyword => regex.test(keyword)),
      ),
    ];
  }, [editor, queryString, showModal]);

  useEffect(() => {
    if (isPickerOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isPickerOpen]);

  useEffect(() => {
    if (!isPickerOpen || !options.length) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightedIndex(current =>
      Math.min(current, Math.max(options.length - 1, 0)),
    );
  }, [isPickerOpen, options.length]);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        (pickerRef.current && pickerRef.current.contains(target)) ||
        (addButtonRef.current && addButtonRef.current.contains(target))
      ) {
        return;
      }
      setIsPickerOpen(false);
      setPickerState(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPickerOpen]);

  const selectOption = useCallback(
    (option: ComponentPickerOption) => {
      if (!pickerState) {
        setIsPickerOpen(false);
        return;
      }
      setIsPickerOpen(false);
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
        option.onSelect(queryString);
        const latestPlaceholder = placeholder.getLatest();
        if ($isParagraphNode(latestPlaceholder)) {
          const onlyChild = latestPlaceholder.getFirstChild();
          if (
            $isTextNode(onlyChild) &&
            onlyChild.getTextContent().length === 0 &&
            latestPlaceholder.getChildrenSize() === 1
          ) {
            latestPlaceholder.remove();
          }
        }
      });
    },
    [editor, pickerState, queryString],
  );

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isPickerOpen || !options.length) {
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex(index =>
          index + 1 >= options.length ? 0 : index + 1,
        );
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex(index =>
          index - 1 < 0 ? options.length - 1 : index - 1,
        );
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const option = options[highlightedIndex];
        if (option) {
          selectOption(option);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setIsPickerOpen(false);
        setPickerState(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [highlightedIndex, isPickerOpen, options, selectOption]);

  function openComponentPicker(e: React.MouseEvent) {
    const targetBlockElem = effectiveBlockElem;
    if (!targetBlockElem) {
      return;
    }
    let targetNodeKey: NodeKey | null = null;
    editor.read(() => {
      const resolvedNode = $getNearestNodeFromDOMNode(targetBlockElem);
      if (resolvedNode) {
        targetNodeKey = resolvedNode.getKey();
      }
    });
    if (!targetNodeKey) {
      return;
    }
    const insertBefore = e.altKey || e.ctrlKey;
    const rect = addButtonRef.current?.getBoundingClientRect();
    setPickerPosition(
      rect
        ? {
            left: rect.left + rect.width + window.scrollX + 8,
            top: rect.top + window.scrollY,
          }
        : null,
    );
    setPickerState({insertBefore, targetNodeKey});
    setQueryString('');
    setHighlightedIndex(0);
    setIsPickerOpen(true);
  }

  // Position the "+" button to the left of the drag handle. The drag
  // handle sits at `-22px` from the wrapper (block's parent div) via the
  // extension's CSS, so the "+" needs to align to the same coordinate
  // system. Using the inner block's rect would mis-align for blocks that
  // carry their own margin-left (e.g. quote), since the inner offset
  // doesn't apply to the wrapper.
  //   ⋮ left = wrapper.left - 22  (16px wide, ends at wrapper.left - 6)
  //   +  left = ⋮.left - 2 (gap) - 16 (width) = wrapper.left - 40
  //   top aligned with ⋮ (top: 4px from wrapper top).
  // Hidden via CSS media query on narrow viewports where the editor's left
  // padding shrinks below the handle column width.
  //
  // Button is rendered at the last-hovered block's position even when no
  // block is hovered, so its own mouseenter can still fire while the
  // editor's mouseleave has already cleared `hoveredBlockElem`. Without
  // this the button would flip to `display: none`, suppressing mouse
  // events and making it impossible to reach.
  const addButtonStyle: React.CSSProperties = useMemo(() => {
    const blockForPosition = effectiveBlockElem || lastHoveredBlockRef.current;
    if (!blockForPosition) {
      return {display: 'none'};
    }
    const rect = blockForPosition.getBoundingClientRect();
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
      {modal}
      {isPickerOpen && pickerPosition
        ? ReactDOM.createPortal(
            <div
              className="typeahead-popover component-picker-menu draggable-block-component-picker"
              ref={pickerRef}
              style={{
                left: pickerPosition.left,
                position: 'absolute',
                top: pickerPosition.top,
                zIndex: 10,
              }}>
              <input
                className="component-picker-search"
                placeholder="Filter blocks..."
                value={queryString}
                ref={searchInputRef}
                onChange={event => setQueryString(event.target.value)}
              />
              <ul>
                {options.map((option, i: number) => (
                  <ComponentPickerMenuItem
                    index={i}
                    isSelected={highlightedIndex === i}
                    onClick={() => {
                      setHighlightedIndex(i);
                      selectOption(option);
                    }}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    key={option.key}
                    option={option}
                  />
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
          className="draggable-block-add-button"
          title="Click to add below"
          onClick={openComponentPicker}
          onMouseEnter={() => setIsOverAddButton(true)}
          onMouseLeave={() => setIsOverAddButton(false)}
          style={addButtonStyle}
        />,
        anchorElem,
      )}
      <DraggableBlockPlugin_EXPERIMENTAL
        anchorElem={anchorElem}
        targetLineRef={targetLineRef}
        targetLineComponent={
          <div ref={targetLineRef} className="draggable-block-target-line" />
        }
        onElementChanged={setHoveredBlockElem}
      />
    </>
  );
}
