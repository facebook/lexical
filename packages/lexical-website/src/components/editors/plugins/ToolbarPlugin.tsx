/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
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
  ElementNode,
  FORMAT_TEXT_COMMAND,
  LexicalEditor,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {useCallback, useEffect, useState} from 'react';

function applyBlockType(editor: LexicalEditor, type: string) {
  const factories: Record<string, () => ElementNode> = {
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

export default function ToolbarPlugin() {
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

  const btnBase =
    'flex h-7 min-w-[28px] cursor-pointer items-center justify-center rounded-md border-0 bg-transparent px-1.5 py-1 text-sm font-semibold text-inherit transition-colors duration-150 enabled:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30 dark:enabled:hover:bg-[#3a3a3c]';

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-[#fafafa] px-2 py-1.5 [border-bottom-style:solid] dark:border-white/10 dark:bg-[#2a2a2c]">
      <select
        className="cursor-pointer rounded-md border border-solid border-transparent bg-transparent px-2 py-1 text-sm font-medium text-inherit hover:bg-zinc-200 focus:outline-none dark:hover:bg-[#3a3a3c]"
        value={blockType}
        onChange={(e) => applyBlockType(editor, e.target.value)}>
        <option value="paragraph">Normal</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="quote">Quote</option>
      </select>

      <div className="mx-1 w-px self-stretch bg-zinc-200 dark:bg-white/15" />

      <button
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        className={btnBase}
        title="Undo">
        ↩
      </button>
      <button
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        className={btnBase}
        title="Redo">
        ↪
      </button>

      <div className="mx-1 w-px self-stretch bg-zinc-200 dark:bg-white/15" />

      <button
        className={`${btnBase} ${isBold ? 'bg-blue-200 text-blue-600 dark:bg-blue-500/25 dark:text-blue-400' : ''}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        aria-pressed={isBold}
        title="Bold">
        B
      </button>
      <button
        className={`${btnBase} ${isItalic ? 'bg-blue-200 text-blue-600 dark:bg-blue-500/25 dark:text-blue-400' : ''}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        aria-pressed={isItalic}
        title="Italic"
        style={{fontStyle: 'italic'}}>
        I
      </button>
      <button
        className={`${btnBase} ${isUnderline ? 'bg-blue-200 text-blue-600 dark:bg-blue-500/25 dark:text-blue-400' : ''}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        aria-pressed={isUnderline}
        title="Underline"
        style={{textDecoration: 'underline'}}>
        U
      </button>
    </div>
  );
}
