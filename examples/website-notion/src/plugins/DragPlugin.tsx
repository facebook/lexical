/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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

const DRAG_MENU_CLASSNAME = 'nle-drag-menu';

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

export function DragPlugin({anchorElem}: DragPluginProps) {
  const [editor] = useLexicalComposerContext();
  const menuRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [draggableElement, setDraggableElement] = useState<HTMLElement | null>(
    null,
  );
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
    setHighlightedIndex((i) => Math.min(i, Math.max(options.length - 1, 0)));
  }, [isPickerOpen, options.length]);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }
    const onClickOutside = (e: MouseEvent) => {
      if (
        (pickerRef.current !== null &&
          pickerRef.current.contains(e.target as Node)) ||
        (menuRef.current !== null && menuRef.current.contains(e.target as Node))
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
    (e: React.MouseEvent) => {
      if (!draggableElement) {
        return;
      }
      let targetNodeKey: string | null = null;
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
    (element: HTMLElement) => !!element.closest(`.${DRAG_MENU_CLASSNAME}`),
    [],
  );

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
      <DraggableBlockPlugin_EXPERIMENTAL
        anchorElem={anchorElem}
        menuRef={menuRef}
        targetLineRef={targetLineRef}
        menuComponent={
          <div
            ref={menuRef}
            className={`${DRAG_MENU_CLASSNAME} absolute top-0 left-0 z-[1] flex cursor-grab items-center gap-0.5 rounded-sm p-0.5 opacity-0 [will-change:transform,opacity] active:cursor-grabbing`}
            style={{
              transition:
                'transform 140ms ease-in-out, opacity 160ms ease-in-out',
            }}>
            <button
              type="button"
              className="flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent [background-size:14px_14px] bg-center bg-no-repeat opacity-50 hover:bg-zinc-100 hover:opacity-100 dark:invert dark:hover:bg-[#ffffdd]"
              style={{backgroundImage: "url('/img/plus.svg')"}}
              title="Click to add below (Alt/Option to add above)"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={openPicker}
            />
            <div
              className="h-[18px] w-[18px] cursor-grab [background-size:14px_14px] bg-center bg-no-repeat opacity-50 hover:bg-zinc-100 hover:opacity-100 dark:invert dark:hover:bg-[#ffffdd]"
              style={{backgroundImage: "url('/img/draggable-block-menu.svg')"}}
            />
          </div>
        }
        targetLineComponent={
          <div
            ref={targetLineRef}
            className="pointer-events-none absolute top-0 left-0 h-[3px] bg-blue-400 opacity-0 [will-change:transform]"
          />
        }
        isOnMenu={isOnMenu}
        onElementChanged={setDraggableElement}
      />
    </>
  );
}
