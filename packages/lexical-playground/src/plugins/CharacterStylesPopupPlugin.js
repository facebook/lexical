/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {RangeSelection, LexicalEditor, ElementNode} from 'lexical';

import {TextNode, $isTextNode, $getSelection, $isRangeSelection} from 'lexical';

// $FlowFixMe
import {createPortal} from 'react-dom';
import {$isLinkNode} from 'lexical/LinkNode';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import withSubscriptions from '@lexical/react/withSubscriptions';

import {$isAtNodeEnd} from '@lexical/helpers/selection';

import React, {useCallback, useEffect, useRef, useState} from 'react';

function setPopupPosition(editor, rect) {
  if (rect === null) {
    editor.style.opacity = '0';
    editor.style.top = '-1000px';
    editor.style.left = '-1000px';
  } else {
    editor.style.opacity = '1';
    editor.style.top = `${rect.top - rect.height * 2.5 + window.pageYOffset}px`;
    editor.style.left = `${
      rect.left + window.pageXOffset - editor.offsetWidth / 2 + rect.width / 2
    }px`;
  }
}

function FloatingCharacterStylesEditor({
  editor,
  isLink,
  isBold,
  isItalic,
  isUnderline,
  isCode,
  isStrikethrough,
}: {
  editor: LexicalEditor,
  isLink: boolean,
  isItalic: boolean,
  isBold: boolean,
  isUnderline: boolean,
  isCode: boolean,
  isStrikethrough: boolean,
}): React$Node {
  const popupCharStylesEditorRef = useRef<HTMLElement | null>(null);
  const mouseDownRef = useRef(false);

  const insertLink = useCallback(() => {
    if (!isLink) {
      editor.execCommand('toggleLink', 'https://');
    } else {
      editor.execCommand('toggleLink', null);
    }
  }, [editor, isLink]);

  const updateCharacterStylesEditor = useCallback(() => {
    const selection = $getSelection();

    const popupCharStylesEditorElem = popupCharStylesEditorRef.current;
    const nativeSelection = window.getSelection();

    if (popupCharStylesEditorElem === null) {
      return;
    }

    const rootElement = editor.getRootElement();
    if (
      selection !== null &&
      !nativeSelection.isCollapsed &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const domRange = nativeSelection.getRangeAt(0);
      let rect;
      if (nativeSelection.anchorNode === rootElement) {
        let inner = rootElement;
        while (inner.firstElementChild != null) {
          inner = inner.firstElementChild;
        }
        rect = inner.getBoundingClientRect();
      } else {
        rect = domRange.getBoundingClientRect();
      }

      if (!mouseDownRef.current) {
        setPopupPosition(popupCharStylesEditorElem, rect);
      }
    }
  }, [editor]);

  useEffect(() => {
    return withSubscriptions(
      editor.addListener('update', ({editorState}) => {
        editorState.read(() => {
          updateCharacterStylesEditor();
        });
      }),

      editor.addListener(
        'command',
        (type) => {
          if (type === 'selectionChange') {
            updateCharacterStylesEditor();
          }
          return false;
        },
        1,
      ),
    );
  }, [editor, updateCharacterStylesEditor]);

  return (
    <div ref={popupCharStylesEditorRef} className="character-style-popup">
      <button
        onClick={() => {
          editor.execCommand('formatText', 'bold');
        }}
        className={'popup-item spaced ' + (isBold ? 'active' : '')}
        aria-label="Format Bold">
        <i className="format bold" />
      </button>
      <button
        onClick={() => {
          editor.execCommand('formatText', 'italic');
        }}
        className={'popup-item spaced ' + (isItalic ? 'active' : '')}
        aria-label="Format Italics">
        <i className="format italic" />
      </button>
      <button
        onClick={() => {
          editor.execCommand('formatText', 'underline');
        }}
        className={'popup-item spaced ' + (isUnderline ? 'active' : '')}
        aria-label="Format Underline">
        <i className="format underline" />
      </button>
      <button
        onClick={() => {
          editor.execCommand('formatText', 'strikethrough');
        }}
        className={'popup-item spaced ' + (isStrikethrough ? 'active' : '')}
        aria-label="Format Strikethrough">
        <i className="format strikethrough" />
      </button>
      <button
        onClick={() => {
          editor.execCommand('formatText', 'code');
        }}
        className={'popup-item spaced ' + (isCode ? 'active' : '')}
        aria-label="Insert Code">
        <i className="format code" />
      </button>
      <button
        onClick={insertLink}
        className={'popup-item spaced ' + (isLink ? 'active' : '')}
        aria-label="Insert Link">
        <i className="format link" />
      </button>
    </div>
  );
}

function getSelectedNode(selection: RangeSelection): TextNode | ElementNode {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  const isBackward = selection.isBackward();
  if (isBackward) {
    return $isAtNodeEnd(focus) ? anchorNode : focusNode;
  } else {
    return $isAtNodeEnd(anchor) ? focusNode : anchorNode;
  }
}

function useCharacterStylesPopup(editor: LexicalEditor): React$Node {
  const [isText, setIsText] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);

  useEffect(() => {
    return editor.addListener('update', ({editorState}) => {
      editorState.read(() => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return;
        }

        const node = getSelectedNode(selection);

        // Update text format
        setIsBold(selection.hasFormat('bold'));
        setIsItalic(selection.hasFormat('italic'));
        setIsUnderline(selection.hasFormat('underline'));
        setIsStrikethrough(selection.hasFormat('strikethrough'));
        setIsCode(selection.hasFormat('code'));

        // Update links
        const parent = node.getParent();
        if ($isLinkNode(parent) || $isLinkNode(node)) {
          setIsLink(true);
        } else {
          setIsLink(false);
        }

        if (selection.getTextContent() !== '') {
          setIsText($isTextNode(node));
        } else {
          setIsText(false);
        }
      });
    });
  }, [editor]);

  if (!isText) {
    return null;
  }

  return createPortal(
    <FloatingCharacterStylesEditor
      editor={editor}
      isLink={isLink}
      isBold={isBold}
      isItalic={isItalic}
      isStrikethrough={isStrikethrough}
      isUnderline={isUnderline}
      isCode={isCode}
    />,
    document.body,
  );
}

export default function CharacterStylesPopupPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();
  return useCharacterStylesPopup(editor);
}
