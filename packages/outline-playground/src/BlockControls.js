// @flow
import type {OutlineEditor, ViewModel} from 'outline';
import {HeadingNode} from 'outline-extensions/HeadingNode';
import {ListNode} from 'outline-extensions/ListNode';

import * as React from 'react';
import {useEffect, useState} from 'react';

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

  useEffect(() => {
    return editor.addUpdateListener((viewModel: ViewModel) => {
      viewModel.read((view) => {
        const selection = view.getSelection();
        if (selection !== null) {
          const anchorNode = selection.getAnchorNode();
          const block = anchorNode.getTopParentBlockOrThrow();
          const blockKey = block.getKey();
          if (blockKey !== selectedBlockKey) {
            const blockDOM = editor.getElementByKey(blockKey);
            const editorElem = editor.getEditorElement();
            let editorTop = editorPosition;

            if (editorElem !== null && editorPosition === 0) {
              const {top} = editorElem.getBoundingClientRect();
              editorTop = top;
              setEditorPosition(editorPosition);
            }
            const {top} = blockDOM.getBoundingClientRect();
            setPosition(top - editorTop);
            setSelectedBlockKey(blockKey);
            const type =
              block instanceof HeadingNode || block instanceof ListNode
                ? block.getTag()
                : block.getType();
            setBlockType(type);
          }
        }
      });
    });
  }, [editor, editorPosition, selectedBlockKey]);

  return selectedBlockKey !== null ? (
    <div id="block-controls" style={{top: position}}>
      <div
        className="button"
        role="button"
        tabIndex="0"
        aria-label="Formatting Options">
        <span className={'block-type ' + blockType} />
        <span className="block-arrow" />
      </div>
    </div>
  ) : null;
}
