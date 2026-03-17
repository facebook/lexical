/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './styles.css';

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  HeadingNode,
  QuoteNode,
} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {$findMatchingParent, mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {useCallback, useEffect, useState} from 'react';

const theme = {
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
  },
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  text: {
    bold: 'editor-textBold',
    italic: 'editor-textItalic',
    underline: 'editor-textUnderline',
  },
};

function applyBlockType(editor, type) {
  const factories = {
    h1: () => $createHeadingNode('h1'),
    h2: () => $createHeadingNode('h2'),
    h3: () => $createHeadingNode('h3'),
    paragraph: () => $createParagraphNode(),
    quote: () => $createQuoteNode(),
  };
  editor.update(() => {
    $setBlocksType($getSelection(), factories[type]);
  });
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchor = selection.anchor.getNode();
      const element =
        $findMatchingParent(anchor, (e) => {
          const parent = e.getParent();
          return parent !== null && $isRootOrShadowRoot(parent);
        }) || anchor.getTopLevelElementOrThrow();

      setBlockType(
        $isHeadingNode(element) ? element.getTag() : element.getType(),
      );
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({editorState}) => {
        editorState.read(() => $updateToolbar(), {editor});
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, $updateToolbar]);

  return (
    <div className="toolbar">
      <select
        value={blockType}
        onChange={(e) => applyBlockType(editor, e.target.value)}>
        <option value="paragraph">Normal</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="quote">Quote</option>
      </select>

      <div className="divider" />

      <button
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        title="Undo">
        ↩
      </button>
      <button
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        title="Redo">
        ↪
      </button>

      <div className="divider" />

      <button
        className={isBold ? 'active' : ''}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        title="Bold">
        B
      </button>
      <button
        className={isItalic ? 'active' : ''}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        title="Italic"
        style={{fontStyle: 'italic'}}>
        I
      </button>
      <button
        className={isUnderline ? 'active' : ''}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        title="Underline"
        style={{textDecoration: 'underline'}}>
        U
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main editor component
// ---------------------------------------------------------------------------

function onError(error) {
  console.error(error);
}

export default function ToolbarEditor() {
  const initialConfig = {
    namespace: 'ToolbarEditor',
    nodes: [HeadingNode, QuoteNode],
    onError,
    theme,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="toolbar-editor">
        <ToolbarPlugin />
        <div className="editor-inner">
          <RichTextPlugin
            ErrorBoundary={LexicalErrorBoundary}
            contentEditable={
              <ContentEditable
                className="editor-input"
                aria-placeholder="Enter some text..."
              />
            }
            placeholder={
              <div className="editor-placeholder">Enter some text...</div>
            }
          />
          <HistoryPlugin />
        </div>
      </div>
    </LexicalComposer>
  );
}
