/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isDecoratorTextNode, signal} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useExtensionDependency} from '@lexical/react/useExtensionComponent';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {$findMatchingParent} from '@lexical/utils';
import {
  $createParagraphNode,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  LexicalEditor,
  mergeRegister,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {type CSSProperties, type JSX, useRef} from 'react';

import {AIExtension} from './ai/AIExtension';
import {useAI, type UseAIReturn} from './ai/useAI';
import {useSignalValue} from './utils/useExtensionHooks';

const BLOCK_TYPES = [
  {label: 'Normal', value: 'paragraph'},
  {label: 'Heading 1', value: 'h1'},
  {label: 'Heading 2', value: 'h2'},
  {label: 'Heading 3', value: 'h3'},
  {label: 'Quote', value: 'quote'},
];

function applyBlockType(editor: LexicalEditor, type: string) {
  editor.update(() => {
    const selection = $getSelection();
    if (type === 'paragraph') {
      $setBlocksType(selection, $createParagraphNode);
    } else if (type === 'quote') {
      $setBlocksType(selection, $createQuoteNode);
    } else {
      const headingTag = type as 'h1' | 'h2' | 'h3';
      $setBlocksType(selection, () => $createHeadingNode(headingTag));
    }
  });
}

function maskStyle(url: string): CSSProperties {
  return {
    maskImage: `url('${url}')`,
    maskPosition: 'center',
    maskRepeat: 'no-repeat',
    maskSize: 'contain',
  };
}

function Divider() {
  return (
    <div className="mx-1 w-px self-stretch bg-zinc-200 dark:bg-zinc-600" />
  );
}

function $getToolbarState(): {
  blockType: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
} | null {
  const selection = $getSelection();

  if ($isNodeSelection(selection)) {
    const nodes = selection.getNodes();
    const decoratorNode = nodes.find($isDecoratorTextNode);
    if (decoratorNode) {
      return {
        blockType: 'paragraph',
        isBold: decoratorNode.hasFormat('bold'),
        isItalic: decoratorNode.hasFormat('italic'),
        isUnderline: decoratorNode.hasFormat('underline'),
      };
    }
    return null;
  }

  if (!$isRangeSelection(selection)) {
    return null;
  }

  const anchorNode = selection.anchor.getNode();
  const topLevelElement =
    $findMatchingParent(anchorNode, (e) => {
      const parent = e.getParent();
      return parent !== null && $isRootOrShadowRoot(parent);
    }) || anchorNode.getTopLevelElementOrThrow();

  return {
    blockType: $isHeadingNode(topLevelElement)
      ? topLevelElement.getTag()
      : topLevelElement.getType(),
    isBold: selection.hasFormat('bold'),
    isItalic: selection.hasFormat('italic'),
    isUnderline: selection.hasFormat('underline'),
  };
}

export const ToolbarExtension = defineExtension({
  build() {
    return {
      blockType: signal('paragraph'),
      canRedo: signal(false),
      canUndo: signal(false),
      isBold: signal(false),
      isItalic: signal(false),
      isUnderline: signal(false),
    };
  },
  dependencies: [AIExtension],
  name: '@lexical/agent-example/toolbar',
  register(editor, _config, state) {
    const output = state.getOutput();
    return mergeRegister(
      editor.registerUpdateListener(({editorState}) => {
        editorState.read(
          () => {
            const toolbarState = $getToolbarState();
            if (toolbarState) {
              output.blockType.value = toolbarState.blockType;
              output.isBold.value = toolbarState.isBold;
              output.isItalic.value = toolbarState.isItalic;
              output.isUnderline.value = toolbarState.isUnderline;
            }
          },
          {editor},
        );
      }),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          output.canUndo.value = payload;
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          output.canRedo.value = payload;
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  },
});

function useToolbar() {
  const toolbar = useExtensionDependency(ToolbarExtension).output;
  return {
    blockType: useSignalValue(toolbar.blockType),
    canRedo: useSignalValue(toolbar.canRedo),
    canUndo: useSignalValue(toolbar.canUndo),
    isBold: useSignalValue(toolbar.isBold),
    isItalic: useSignalValue(toolbar.isItalic),
    isUnderline: useSignalValue(toolbar.isUnderline),
  };
}

export function Toolbar(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const ai = useAI();
  const toolbar = useToolbar();

  const {
    abort,
    handleExtractEntities,
    handleGenerate,
    isGenerating,
    modelStatus,
  } = ai;
  const aiDisabled = isGenerating || modelStatus === 'loading';

  const btnBase =
    'group flex cursor-pointer items-center justify-center rounded-md border-0 p-1.5 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500';
  const btnInactive =
    'bg-transparent text-zinc-700 enabled:hover:bg-zinc-200 dark:text-zinc-200 dark:enabled:hover:bg-zinc-700';
  const btnActive =
    'bg-blue-500 text-white enabled:hover:bg-blue-600 dark:bg-blue-600 dark:enabled:hover:bg-blue-700';
  const iconBase =
    'flex h-[18px] w-[18px] shrink-0 bg-current group-hover:opacity-100';
  const aiBtnBase =
    'flex cursor-pointer items-center gap-1 rounded-md border border-solid border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors duration-150 enabled:hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 dark:enabled:hover:bg-indigo-900';

  return (
    <div
      className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 overflow-x-auto border-b [border-bottom-style:solid] border-b-black/10 bg-zinc-50 px-2 py-1.5 dark:border-b-white/10 dark:bg-zinc-800"
      ref={toolbarRef}>
      <select
        className="cursor-pointer appearance-none rounded-md border border-solid border-transparent bg-transparent px-2 py-1 text-sm font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-200 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-zinc-200 dark:hover:bg-zinc-700"
        value={toolbar.blockType}
        onChange={(e) => applyBlockType(editor, e.target.value)}
        aria-label="Block type">
        {BLOCK_TYPES.map(({label, value}) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <Divider />
      <button
        disabled={!toolbar.canUndo}
        onClick={() => {
          editor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
        className={`${btnBase} ${btnInactive} mr-0.5`}
        aria-label="Undo">
        <i
          className={`${iconBase} opacity-70`}
          style={maskStyle('/img/undo.svg')}
        />
      </button>
      <button
        disabled={!toolbar.canRedo}
        onClick={() => {
          editor.dispatchCommand(REDO_COMMAND, undefined);
        }}
        className={`${btnBase} ${btnInactive}`}
        aria-label="Redo">
        <i
          className={`${iconBase} opacity-70`}
          style={maskStyle('/img/redo.svg')}
        />
      </button>
      <Divider />
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        className={`${btnBase} mr-0.5 ${toolbar.isBold ? btnActive : btnInactive}`}
        aria-label="Format Bold"
        aria-pressed={toolbar.isBold}>
        <i
          className={`${iconBase} ${toolbar.isBold ? 'opacity-100' : 'opacity-70'}`}
          style={maskStyle('/img/bold.svg')}
        />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        className={`${btnBase} mr-0.5 ${toolbar.isItalic ? btnActive : btnInactive}`}
        aria-label="Format Italics"
        aria-pressed={toolbar.isItalic}>
        <i
          className={`${iconBase} ${toolbar.isItalic ? 'opacity-100' : 'opacity-70'}`}
          style={maskStyle('/img/italic.svg')}
        />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
        className={`${btnBase} mr-0.5 ${toolbar.isUnderline ? btnActive : btnInactive}`}
        aria-label="Format Underline"
        aria-pressed={toolbar.isUnderline}>
        <i
          className={`${iconBase} ${toolbar.isUnderline ? 'opacity-100' : 'opacity-70'}`}
          style={maskStyle('/img/underline.svg')}
        />
      </button>
      <Divider />
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
        }}
        className={`${btnBase} ${btnInactive} mr-0.5`}
        aria-label="Left Align">
        <i
          className={`${iconBase} opacity-70`}
          style={maskStyle('/img/text-align-start.svg')}
        />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
        }}
        className={`${btnBase} ${btnInactive} mr-0.5`}
        aria-label="Center Align">
        <i
          className={`${iconBase} opacity-70`}
          style={maskStyle('/img/text-align-center.svg')}
        />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
        }}
        className={`${btnBase} ${btnInactive} mr-0.5`}
        aria-label="Right Align">
        <i
          className={`${iconBase} opacity-70`}
          style={maskStyle('/img/text-align-end.svg')}
        />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
        }}
        className={`${btnBase} ${btnInactive}`}
        aria-label="Justify Align">
        <i
          className={`${iconBase} opacity-70`}
          style={maskStyle('/img/text-align-justify.svg')}
        />
      </button>
      <Divider />
      <AIButtons
        abort={abort}
        aiDisabled={aiDisabled}
        aiBtnBase={aiBtnBase}
        handleExtractEntities={handleExtractEntities}
        handleGenerate={handleGenerate}
        isGenerating={isGenerating}
      />
    </div>
  );
}

function AIButtons({
  abort,
  aiDisabled,
  aiBtnBase,
  handleExtractEntities,
  handleGenerate,
  isGenerating,
}: {
  abort: UseAIReturn['abort'];
  aiDisabled: boolean;
  aiBtnBase: string;
  handleExtractEntities: () => void;
  handleGenerate: () => void;
  isGenerating: boolean;
}) {
  if (isGenerating) {
    return (
      <button
        onClick={abort}
        className="flex cursor-pointer items-center gap-1 rounded-md border border-solid border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors duration-150 hover:bg-red-100 dark:border-red-700 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
        aria-label="Stop AI"
        title="Stop AI generation (Escape)">
        <span className="animate-pulse">Stop</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={aiDisabled}
        className={aiBtnBase}
        aria-label="AI Generate Paragraph"
        title="Generate a paragraph at the end of the document">
        Generate
      </button>
      <button
        onClick={handleExtractEntities}
        disabled={aiDisabled}
        className="flex cursor-pointer items-center gap-1 rounded-md border border-solid border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors duration-150 enabled:hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:enabled:hover:bg-amber-900"
        aria-label="Extract Entities"
        title="Find places, people, and organizations in the text and convert them to interactive nodes">
        <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
          <path d="M8 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM5 4.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM3.5 8a.5.5 0 0 0-.5.5v1a3.5 3.5 0 0 0 3 3.46V15h4v-2.04A3.5 3.5 0 0 0 13 9.5v-1a.5.5 0 0 0-.5-.5h-9z" />
        </svg>
        Extract Entities
      </button>
    </>
  );
}
