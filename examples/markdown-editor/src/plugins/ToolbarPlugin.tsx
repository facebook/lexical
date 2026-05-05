/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useExtensionSignalValue} from '@lexical/react/useExtensionSignalValue';
import {
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';

import {
  FORMAT_HEADING_COMMAND,
  FORMAT_PARAGRAPH_COMMAND,
} from '../extensions/MarkdownExtension';
import {
  type BlockType,
  ToolbarStateExtension,
} from '../extensions/ToolbarStateExtension';

const BLOCK_TYPES: ReadonlyArray<{label: string; value: BlockType}> = [
  {label: 'Paragraph', value: 'paragraph'},
  {label: 'Heading 1', value: 'h1'},
  {label: 'Heading 2', value: 'h2'},
  {label: 'Heading 3', value: 'h3'},
  {label: 'Bullet List', value: 'bullet'},
  {label: 'Numbered List', value: 'number'},
  {label: 'Check List', value: 'check'},
];

function applyBlockType(editor: LexicalEditor, type: BlockType): void {
  switch (type) {
    case 'paragraph':
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      editor.dispatchCommand(FORMAT_PARAGRAPH_COMMAND, undefined);
      return;
    case 'h1':
    case 'h2':
    case 'h3':
      editor.dispatchCommand(FORMAT_HEADING_COMMAND, type);
      return;
    case 'bullet':
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
      return;
    case 'number':
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
      return;
    case 'check':
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
      return;
  }
}

const buttonBase =
  'group flex h-7 cursor-pointer items-center justify-center rounded-md border-0 px-2 font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500';
const buttonInactive =
  'bg-transparent text-zinc-700 enabled:hover:bg-zinc-200 dark:text-zinc-200 dark:enabled:hover:bg-zinc-700';
const buttonActive =
  'bg-blue-500 text-white enabled:hover:bg-blue-600 dark:bg-blue-600 dark:enabled:hover:bg-blue-700';

function Divider() {
  return (
    <div className="mx-1 h-5 w-px self-center bg-zinc-200 dark:bg-zinc-600" />
  );
}

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const canUndo = useExtensionSignalValue(ToolbarStateExtension, 'canUndo');
  const canRedo = useExtensionSignalValue(ToolbarStateExtension, 'canRedo');
  const blockType = useExtensionSignalValue(ToolbarStateExtension, 'blockType');
  const isBold = useExtensionSignalValue(ToolbarStateExtension, 'isBold');
  const isItalic = useExtensionSignalValue(ToolbarStateExtension, 'isItalic');
  const isCode = useExtensionSignalValue(ToolbarStateExtension, 'isCode');

  return (
    <div
      className="flex flex-1 items-center gap-0.5 overflow-x-auto"
      role="toolbar"
      aria-label="Formatting">
      <select
        className="h-7 cursor-pointer appearance-none rounded-md border border-solid border-transparent bg-transparent px-2 text-sm font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-200 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-zinc-200 dark:hover:bg-zinc-700"
        value={blockType}
        onChange={e => applyBlockType(editor, e.target.value as BlockType)}
        aria-label="Block type">
        {BLOCK_TYPES.map(({label, value}) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <Divider />
      <button
        type="button"
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        className={`${buttonBase} ${buttonInactive} text-xs`}
        aria-label="Undo">
        Undo
      </button>
      <button
        type="button"
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        className={`${buttonBase} ${buttonInactive} text-xs`}
        aria-label="Redo">
        Redo
      </button>
      <Divider />
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        className={`${buttonBase} ${isBold ? buttonActive : buttonInactive} text-sm font-bold`}
        aria-label="Bold"
        aria-pressed={isBold}>
        B
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        className={`${buttonBase} ${isItalic ? buttonActive : buttonInactive} text-sm italic`}
        aria-label="Italic"
        aria-pressed={isItalic}>
        I
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
        className={`${buttonBase} ${isCode ? buttonActive : buttonInactive} font-mono text-xs`}
        aria-label="Inline code"
        aria-pressed={isCode}>
        {'</>'}
      </button>
    </div>
  );
}
