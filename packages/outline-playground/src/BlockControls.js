/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor, ViewModel} from 'outline';
import {isHeadingNode} from 'outline/HeadingNode';
import {isListNode} from 'outline/ListNode';
import {createParagraphNode} from 'outline/ParagraphNode';
import {createHeadingNode} from 'outline/HeadingNode';
import {createListNode} from 'outline/ListNode';
import {createListItemNode} from 'outline/ListItemNode';
import {createQuoteNode} from 'outline/QuoteNode';
import {createCodeNode} from 'outline/CodeNode';

import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
// $FlowFixMe
import {createPortal} from 'react-dom';

// TODO: create a functional dropdown and selection input
export default function BlockControls({
  editor,
}: {
  editor: OutlineEditor,
}): React.MixedElement | null {
  const [selectedBlockKey, setSelectedBlockKey] = useState(null);
  const [position, setPosition] = useState(0);
  const [editorPosition, setEditorPosition] = useState(0);
  const [blockType, setBlockType] = useState('paragraph');
  const [showDropDown, setShowDropDown] = useState(false);
  const blockControlsRef = useRef(null);

  useEffect(() => {
    return editor.addListener('update', (viewModel: ViewModel) => {
      viewModel.read((view) => {
        const selection = view.getSelection();
        if (selection !== null) {
          const anchorNode = selection.getAnchorNode();
          const block = anchorNode.getTopParentBlockOrThrow();
          const blockKey = block.getKey();
          if (blockKey !== selectedBlockKey) {
            const blockDOM = editor.getElementByKey(blockKey);
            if (blockDOM !== null) {
              const root = editor.getRootElement();
              let editorTop = editorPosition;

              if (root !== null && editorPosition === 0) {
                const {top} = root.getBoundingClientRect();
                editorTop = top;
                setEditorPosition(editorPosition);
              }
              const {top} = blockDOM.getBoundingClientRect();
              setPosition(top - editorTop);
              setSelectedBlockKey(blockKey);
              const type =
                isHeadingNode(block) || isListNode(block)
                  ? block.getTag()
                  : block.getType();
              setBlockType(type);
            }
          }
        }
      });
    });
  }, [editor, editorPosition, selectedBlockKey]);

  return selectedBlockKey !== null ? (
    <>
      <div id="block-controls" style={{top: position}} ref={blockControlsRef}>
        <button
          onClick={() => setShowDropDown(!showDropDown)}
          aria-label="Formatting Options">
          <span className={'block-type ' + blockType} />
        </button>
      </div>
      {showDropDown &&
        createPortal(
          <DropdownList
            editor={editor}
            blockType={blockType}
            blockControlsRef={blockControlsRef}
            setShowDropDown={setShowDropDown}
          />,
          document.body,
        )}
    </>
  ) : null;
}

function DropdownList({
  editor,
  blockType,
  blockControlsRef,
  setShowDropDown,
}: {
  editor: OutlineEditor,
  blockType: string,
  blockControlsRef: {current: null | HTMLElement},
  setShowDropDown: (boolean) => void,
}): React$Node {
  const dropDownRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const blockControls = blockControlsRef.current;
    const dropDown = dropDownRef.current;

    if (blockControls !== null && dropDown !== null) {
      const {top, right} = blockControls.getBoundingClientRect();
      const {width} = dropDown.getBoundingClientRect();
      dropDown.style.top = `${top + 40}px`;
      dropDown.style.left = `${right - width}px`;
    }
  }, [blockControlsRef]);

  useEffect(() => {
    const dropDown = dropDownRef.current;
    const blockControls = blockControlsRef.current;

    if (dropDown !== null && blockControls !== null) {
      const handle = (event: MouseEvent) => {
        // $FlowFixMe: no idea why flow is complaining
        const target: HTMLElement = event.target;

        if (!dropDown.contains(target) && !blockControls.contains(target)) {
          setShowDropDown(false);
        }
      };
      document.addEventListener('click', handle);

      return () => {
        document.removeEventListener('click', handle);
      };
    }
  }, [blockControlsRef, setShowDropDown]);

  const formatParagraph = () => {
    if (blockType !== 'paragraph') {
      editor.update((view) => {
        const selection = view.getSelection();

        if (selection !== null) {
          const anchorNode = selection.getAnchorNode();
          const parent = anchorNode.getParentBlockOrThrow();
          const children = parent.getChildren();
          const paragraph = createParagraphNode();
          children.forEach((child) => paragraph.append(child));
          parent.replace(paragraph);
        }
      }, 'formatParagraph');
    }
    setShowDropDown(false);
  };

  const formatLargeHeading = () => {
    if (blockType !== 'h1') {
      editor.update((view) => {
        const selection = view.getSelection();

        if (selection !== null) {
          const anchorNode = selection.getAnchorNode();
          const parent = anchorNode.getParentBlockOrThrow();
          const children = parent.getChildren();
          const paragraph = createHeadingNode('h1');
          children.forEach((child) => paragraph.append(child));
          parent.replace(paragraph);
        }
      }, 'formatLargeHeading');
    }
    setShowDropDown(false);
  };

  const formatSmallHeading = () => {
    if (blockType !== 'h2') {
      editor.update((view) => {
        const selection = view.getSelection();

        if (selection !== null) {
          const anchorNode = selection.getAnchorNode();
          const parent = anchorNode.getParentBlockOrThrow();
          const children = parent.getChildren();
          const paragraph = createHeadingNode('h2');
          children.forEach((child) => paragraph.append(child));
          parent.replace(paragraph);
        }
      }, 'formatSmallHeading');
    }
    setShowDropDown(false);
  };

  const formatBulletList = () => {
    if (blockType !== 'ul') {
      editor.update((view) => {
        const selection = view.getSelection();

        if (selection !== null) {
          const anchorNode = selection.getAnchorNode();
          const parent = anchorNode.getParentBlockOrThrow();
          const children = parent.getChildren();
          const list = createListNode('ul');
          const listItem = createListItemNode();
          list.append(listItem);
          children.forEach((child) => listItem.append(child));
          parent.replace(list);
        }
      }, 'formatBulletList');
    }
    setShowDropDown(false);
  };

  const formatNumberedList = () => {
    if (blockType !== 'ol') {
      editor.update((view) => {
        const selection = view.getSelection();

        if (selection !== null) {
          const anchorNode = selection.getAnchorNode();
          const parent = anchorNode.getParentBlockOrThrow();
          const children = parent.getChildren();
          const list = createListNode('ol');
          const listItem = createListItemNode();
          list.append(listItem);
          children.forEach((child) => listItem.append(child));
          parent.replace(list);
        }
      }, 'formatNumberedList');
    }
    setShowDropDown(false);
  };

  const formatQuote = () => {
    if (blockType !== 'quote') {
      editor.update((view) => {
        const selection = view.getSelection();

        if (selection !== null) {
          const anchorNode = selection.getAnchorNode();
          const parent = anchorNode.getParentBlockOrThrow();
          const children = parent.getChildren();
          const paragraph = createQuoteNode();
          children.forEach((child) => paragraph.append(child));
          parent.replace(paragraph);
        }
      }, 'formatQuote');
    }
    setShowDropDown(false);
  };

  const formatCode = () => {
    if (blockType !== 'code') {
      editor.update((view) => {
        const selection = view.getSelection();

        if (selection !== null) {
          const anchorNode = selection.getAnchorNode();
          const parent = anchorNode.getParentBlockOrThrow();
          const children = parent.getChildren();
          const paragraph = createCodeNode();
          children.forEach((child) => paragraph.append(child));
          parent.replace(paragraph);
        }
      }, 'formatCode');
    }
    setShowDropDown(false);
  };

  return (
    <div className="dropdown" ref={dropDownRef}>
      <button className="item" onClick={formatParagraph}>
        <span className="icon paragraph" />
        <span className="text">Normal</span>
        {blockType === 'paragraph' && <span className="active" />}
      </button>
      <button className="item" onClick={formatLargeHeading}>
        <span className="icon large-heading" />
        <span className="text">Large Heading</span>
        {blockType === 'h1' && <span className="active" />}
      </button>
      <button className="item" onClick={formatSmallHeading}>
        <span className="icon small-heading" />
        <span className="text">Small Heading</span>
        {blockType === 'h2' && <span className="active" />}
      </button>
      <button className="item" onClick={formatBulletList}>
        <span className="icon bullet-list" />
        <span className="text">Bullet List</span>
        {blockType === 'ul' && <span className="active" />}
      </button>
      <button className="item" onClick={formatNumberedList}>
        <span className="icon numbered-list" />
        <span className="text">Numbered List</span>
        {blockType === 'ol' && <span className="active" />}
      </button>
      <button className="item" onClick={formatQuote}>
        <span className="icon quote" />
        <span className="text">Quote</span>
        {blockType === 'quote' && <span className="active" />}
      </button>
      <button className="item" onClick={formatCode}>
        <span className="icon code" />
        <span className="text">Code Block</span>
        {blockType === 'code' && <span className="active" />}
      </button>
    </div>
  );
}
