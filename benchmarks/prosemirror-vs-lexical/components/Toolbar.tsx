import {$createCodeNode} from '@lexical/code';
import {TOGGLE_LINK_COMMAND} from '@lexical/link';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';
import {INSERT_HORIZONTAL_RULE_COMMAND} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useExtensionSignalValue} from '@lexical/react/useExtensionSignalValue';
import {
  $createHeadingNode,
  $createQuoteNode,
  type HeadingTagType,
} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {useCallback} from 'react';

import {
  type BlockType,
  ToolbarStateExtension,
} from './extensions/ToolbarStateExtension';

const BLOCK_TYPES: ReadonlyArray<{label: string; value: BlockType}> = [
  {label: 'Paragraph', value: 'paragraph'},
  {label: 'Heading 1', value: 'h1'},
  {label: 'Heading 2', value: 'h2'},
  {label: 'Heading 3', value: 'h3'},
  {label: 'Heading 4', value: 'h4'},
  {label: 'Heading 5', value: 'h5'},
  {label: 'Heading 6', value: 'h6'},
  {label: 'Bullet List', value: 'bullet'},
  {label: 'Numbered List', value: 'number'},
  {label: 'Quote', value: 'quote'},
  {label: 'Code Block', value: 'code'},
];

const HEADING_TAGS = new Set<HeadingTagType>([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
]);

function applyBlockType(editor: LexicalEditor, type: BlockType): void {
  if (HEADING_TAGS.has(type as HeadingTagType)) {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () =>
          $createHeadingNode(type as HeadingTagType),
        );
      }
    });
    return;
  }
  switch (type) {
    case 'paragraph':
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
      return;
    case 'bullet':
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
      return;
    case 'number':
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
      return;
    case 'quote':
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      });
      return;
    case 'code':
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createCodeNode());
        }
      });
      return;
  }
}

// Mirrors the surface of `prosemirror-example-setup`'s default
// `menuBar`: paragraph / heading dropdown, mark toggles, lists, code
// block, blockquote, link, horizontal rule, undo/redo. The DOM
// topology is the same `role="toolbar"` shape and similar number of
// buttons so the benchmark pays comparable per-update layout/script
// work on both editors.
//
// Every value read here comes from `ToolbarStateExtension` signals
// (`useExtensionSignalValue`). The toolbar therefore only re-renders
// when one of those signals actually changes — no per-update
// `useEffect`/`useState` polling.
export function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const blockType = useExtensionSignalValue(ToolbarStateExtension, 'blockType');
  const isBold = useExtensionSignalValue(ToolbarStateExtension, 'isBold');
  const isItalic = useExtensionSignalValue(ToolbarStateExtension, 'isItalic');
  const isCode = useExtensionSignalValue(ToolbarStateExtension, 'isCode');
  const isLink = useExtensionSignalValue(ToolbarStateExtension, 'isLink');
  const canUndo = useExtensionSignalValue(ToolbarStateExtension, 'canUndo');
  const canRedo = useExtensionSignalValue(ToolbarStateExtension, 'canRedo');

  const toggleLink = useCallback(() => {
    if (isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    } else {
      const url = window.prompt('URL');
      if (url) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
      }
    }
  }, [editor, isLink]);

  return (
    <div className="customtoolbar" role="toolbar" aria-label="Formatting">
      <select
        className="toolbar__item toolbar__select"
        value={blockType}
        onChange={e => applyBlockType(editor, e.target.value as BlockType)}
        aria-label="Block type">
        {BLOCK_TYPES.map(({label, value}) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={`toolbar__item ${isBold ? 'toolbar__item--active' : ''}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        aria-label="Bold"
        aria-pressed={isBold}>
        B
      </button>
      <button
        type="button"
        className={`toolbar__item ${isItalic ? 'toolbar__item--active' : ''}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        aria-label="Italic"
        aria-pressed={isItalic}>
        I
      </button>
      <button
        type="button"
        className={`toolbar__item ${isCode ? 'toolbar__item--active' : ''}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
        aria-label="Inline code"
        aria-pressed={isCode}>
        {'</>'}
      </button>
      <button
        type="button"
        className={`toolbar__item ${isLink ? 'toolbar__item--active' : ''}`}
        onClick={toggleLink}
        aria-label="Link"
        aria-pressed={isLink}>
        Link
      </button>
      <button
        type="button"
        className="toolbar__item"
        onClick={() =>
          editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)
        }
        aria-label="Horizontal rule">
        HR
      </button>
      <button
        type="button"
        className="toolbar__item"
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        aria-label="Undo">
        {'<<'}
      </button>
      <button
        type="button"
        className="toolbar__item"
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        aria-label="Redo">
        {'>>'}
      </button>
    </div>
  );
}
