/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {JSX} from 'react';

import './index.css';

import {
  autoUpdate,
  flip,
  inline,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  getParentElement,
  KEY_ESCAPE_COMMAND,
  LexicalEditor,
  mergeRegister,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import {Dispatch, useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {$isRubyNode, $toggleRuby, RubyNode} from '../../nodes/RubyNode';

function preventDefault(
  event: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>,
): void {
  event.preventDefault();
}

function getRubyNodeKeyFromDOM(
  editor: LexicalEditor,
  target: EventTarget | null,
): string | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }
  let el: HTMLElement | null = target;
  while (el) {
    if (el.dataset.rubyAnnotation !== undefined) {
      const wrapper = el.parentElement;
      if (wrapper) {
        const key = wrapper.getAttribute('data-lexical-key');
        if (key) {
          return key;
        }
      }
    }
    if (el.hasAttribute('data-lexical-editor')) {
      break;
    }
    el = el.parentElement;
  }
  return null;
}

function FloatingRubyEditor({
  editor,
  anchorElem,
  isRubyEditMode,
  setIsRubyEditMode,
}: {
  editor: LexicalEditor;
  anchorElem: HTMLElement;
  isRubyEditMode: boolean;
  setIsRubyEditMode: Dispatch<boolean>;
}): JSX.Element {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [annotation, setAnnotation] = useState('');
  const [baseText, setBaseText] = useState('');
  const [rubyNodeKey, setRubyNodeKey] = useState<string | null>(null);
  const [isRubyClick, setIsRubyClick] = useState(false);

  const isVisible = isRubyClick || isRubyEditMode;
  const scrollerElem = getParentElement(anchorElem);

  const {refs, floatingStyles} = useFloating({
    middleware: [
      inline(),
      offset(10),
      flip({
        boundary: scrollerElem || undefined,
        padding: 10,
      }),
      shift({
        boundary: scrollerElem || undefined,
        crossAxis: true,
        mainAxis: true,
        padding: 10,
      }),
    ],
    placement: 'bottom-start',
    strategy: 'absolute',
    whileElementsMounted: (...args) =>
      autoUpdate(...args, {ancestorScroll: false}),
  });

  const positionToRubyNode = useCallback(
    (node: RubyNode) => {
      setBaseText(node.getTextContent());
      setAnnotation(node.getAnnotation());
      setRubyNodeKey(node.getKey());

      const element = editor.getElementByKey(node.getKey());
      if (element) {
        refs.setPositionReference({
          getBoundingClientRect: () => element.getBoundingClientRect(),
          getClientRects: () => element.getClientRects(),
        });
      }
    },
    [editor, refs],
  );

  useEffect(() => {
    if (!isRubyEditMode) {
      return;
    }
    editor.read('latest', () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) && !selection.isCollapsed()) {
        setBaseText(selection.getTextContent());
        setAnnotation('');
        setRubyNodeKey(null);

        const nativeSelection = window.getSelection();
        if (nativeSelection !== null && nativeSelection.rangeCount > 0) {
          const range = nativeSelection.getRangeAt(0);
          refs.setPositionReference(range);
        }
      }
    });
  }, [editor, isRubyEditMode, refs]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        event => {
          const key = getRubyNodeKeyFromDOM(editor, event.target);
          if (key) {
            editor.read(() => {
              const node = $getNodeByKey(key);
              if ($isRubyNode(node)) {
                positionToRubyNode(node);
                setIsRubyClick(true);
              }
            });
            return false;
          }
          if (isRubyClick) {
            setIsRubyClick(false);
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          if (isRubyEditMode) {
            const selection = $getSelection();
            if ($isRangeSelection(selection) && !selection.isCollapsed()) {
              setBaseText(selection.getTextContent());
              setAnnotation('');
              setRubyNodeKey(null);

              const nativeSelection = window.getSelection();
              if (nativeSelection !== null && nativeSelection.rangeCount > 0) {
                const range = nativeSelection.getRangeAt(0);
                refs.setPositionReference(range);
              }
            }
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (isVisible) {
            setIsRubyClick(false);
            setIsRubyEditMode(false);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [
    editor,
    isRubyEditMode,
    isRubyClick,
    isVisible,
    positionToRubyNode,
    refs,
    setIsRubyEditMode,
  ]);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  useEffect(() => {
    const editorElement = editorRef.current;
    if (editorElement === null) {
      return;
    }
    const handleBlur = (event: FocusEvent) => {
      if (
        !editorElement.contains(event.relatedTarget as Element) &&
        isVisible
      ) {
        setIsRubyClick(false);
        setIsRubyEditMode(false);
      }
    };
    editorElement.addEventListener('focusout', handleBlur);
    return () => {
      editorElement.removeEventListener('focusout', handleBlur);
    };
  }, [editorRef, setIsRubyEditMode, isVisible]);

  const handleSubmit = (
    event:
      | React.KeyboardEvent<HTMLInputElement>
      | React.MouseEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    if (!annotation.trim()) {
      return;
    }
    editor.update(() => {
      if (rubyNodeKey) {
        const node = $getNodeByKey(rubyNodeKey);
        if ($isRubyNode(node)) {
          node.setAnnotation(annotation.trim());
        }
      } else {
        $toggleRuby(annotation.trim());
      }
    });
    setIsRubyClick(false);
    setIsRubyEditMode(false);
  };

  const handleDelete = () => {
    editor.update(() => {
      $toggleRuby(null);
    });
    setIsRubyClick(false);
    setIsRubyEditMode(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmit(event);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsRubyClick(false);
      setIsRubyEditMode(false);
    }
  };

  return (
    <div
      ref={el => {
        editorRef.current = el;
        refs.setFloating(el);
      }}
      className="ruby-editor"
      style={{
        ...floatingStyles,
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}>
      {isVisible && (
        <>
          <span className="ruby-base-text" title={baseText}>
            {baseText}
          </span>
          <input
            ref={inputRef}
            className="ruby-input"
            value={annotation}
            placeholder="annotation"
            onChange={event => setAnnotation(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div
            className="ruby-confirm button"
            role="button"
            tabIndex={0}
            onMouseDown={preventDefault}
            onClick={handleSubmit}
          />
          {rubyNodeKey !== null && (
            <div
              className="ruby-trash button"
              role="button"
              tabIndex={0}
              onMouseDown={preventDefault}
              onClick={handleDelete}
            />
          )}
        </>
      )}
    </div>
  );
}

function useFloatingRubyEditorToolbar(
  editor: LexicalEditor,
  anchorElem: HTMLElement,
  isRubyEditMode: boolean,
  setIsRubyEditMode: Dispatch<boolean>,
): JSX.Element | null {
  const [activeEditor, setActiveEditor] = useState(editor);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        setActiveEditor(newEditor);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  return createPortal(
    <FloatingRubyEditor
      editor={activeEditor}
      anchorElem={anchorElem}
      isRubyEditMode={isRubyEditMode}
      setIsRubyEditMode={setIsRubyEditMode}
    />,
    anchorElem,
  );
}

export default function FloatingRubyEditorPlugin({
  anchorElem = document.body,
  isRubyEditMode,
  setIsRubyEditMode,
}: {
  anchorElem?: HTMLElement;
  isRubyEditMode: boolean;
  setIsRubyEditMode: Dispatch<boolean>;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  return useFloatingRubyEditorToolbar(
    editor,
    anchorElem,
    isRubyEditMode,
    setIsRubyEditMode,
  );
}
