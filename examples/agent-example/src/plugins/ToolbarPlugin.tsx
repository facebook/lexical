/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {UseAIReturn} from '../ai/useAI';

import {$createListItemNode, $createListNode} from '@lexical/list';
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
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  LexicalEditor,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import React, {useCallback, useEffect, useRef, useState} from 'react';

const BLOCK_TYPES = [
  {label: 'Normal', value: 'paragraph'},
  {label: 'Heading 1', value: 'h1'},
  {label: 'Heading 2', value: 'h2'},
  {label: 'Heading 3', value: 'h3'},
  {label: 'Quote', value: 'quote'},
];

function formatParagraph(editor: LexicalEditor) {
  editor.update(() => {
    const selection = $getSelection();
    $setBlocksType(selection, () => $createParagraphNode());
  });
}

function formatHeading(editor: LexicalEditor, headingTag: 'h1' | 'h2' | 'h3') {
  editor.update(() => {
    const selection = $getSelection();
    $setBlocksType(selection, () => $createHeadingNode(headingTag));
  });
}

function formatQuote(editor: LexicalEditor) {
  editor.update(() => {
    const selection = $getSelection();
    $setBlocksType(selection, () => $createQuoteNode());
  });
}

function applyBlockType(editor: LexicalEditor, type: string) {
  if (type === 'paragraph') {
    formatParagraph(editor);
  } else if (type === 'quote') {
    formatQuote(editor);
  } else {
    formatHeading(editor, type as 'h1' | 'h2' | 'h3');
  }
}

function maskStyle(url: string): React.CSSProperties {
  return {
    WebkitMaskImage: `url('${url}')`,
    WebkitMaskPosition: 'center',
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskSize: 'contain',
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

export function ToolbarPlugin({ai}: {ai: UseAIReturn}) {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const {
    abort,
    generateParagraph,
    isGenerating,
    makeBulletPoints,
    modelStatus,
  } = ai;

  // Escape key aborts AI operations
  useEffect(() => {
    if (!isGenerating) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        abort();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isGenerating, abort]);

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      let topLevelElement = $findMatchingParent(anchorNode, (e) => {
        const parent = e.getParent();
        return parent !== null && $isRootOrShadowRoot(parent);
      });
      if (topLevelElement === null) {
        topLevelElement = anchorNode.getTopLevelElementOrThrow();
      }

      if ($isHeadingNode(topLevelElement)) {
        setBlockType(topLevelElement.getTag());
      } else {
        setBlockType(topLevelElement.getType());
      }
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({editorState}) => {
        editorState.read(
          () => {
            $updateToolbar();
          },
          {editor},
        );
      }),
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

  const handleBulletPoints = useCallback(async () => {
    let textToConvert = '';

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) && !selection.isCollapsed()) {
        textToConvert = selection.getTextContent();
      } else {
        textToConvert = $getRoot().getTextContent();
      }
    });

    if (!textToConvert.trim()) {
      return;
    }

    const result = await makeBulletPoints(textToConvert);
    if (result == null || !result.trim()) {
      return;
    }

    // Parse bullet points from the model output
    const items = result
      .split('\n')
      .map((line) => line.replace(/^[-*•]\s*/, '').trim())
      .filter((line) => line.length > 0);

    if (items.length === 0) {
      return;
    }

    editor.update(() => {
      const listNode = $createListNode('bullet');
      for (const item of items) {
        const listItem = $createListItemNode();
        listItem.append($createTextNode(item));
        listNode.append(listItem);
      }

      const selection = $getSelection();
      if ($isRangeSelection(selection) && !selection.isCollapsed()) {
        // Replace selected content with the list
        selection.insertNodes([listNode]);
      } else {
        // Replace entire document with the list
        const root = $getRoot();
        root.clear();
        root.append(listNode);
      }
    });
  }, [editor, makeBulletPoints]);

  const handleGenerate = useCallback(async () => {
    let context = '';
    editor.getEditorState().read(() => {
      context = $getRoot().getTextContent();
    });

    // Create a paragraph node to stream tokens into
    let paragraphKey: string | null = null;
    editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
      paragraphKey = paragraph.getKey();
    });

    await generateParagraph(context, (token: string) => {
      if (paragraphKey) {
        editor.update(
          () => {
            const paragraph = $getNodeByKey(paragraphKey!);
            if ($isElementNode(paragraph)) {
              paragraph.append($createTextNode(token));
            }
          },
          {tag: 'ai-stream'},
        );
      }
    });

    // Move selection to end of the generated paragraph
    if (paragraphKey) {
      editor.update(() => {
        const paragraph = $getNodeByKey(paragraphKey!);
        if ($isElementNode(paragraph)) {
          paragraph.selectEnd();
        }
      });
    }
  }, [editor, generateParagraph]);

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
        value={blockType}
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
        disabled={!canUndo}
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
        disabled={!canRedo}
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
        className={`${btnBase} mr-0.5 ${isBold ? btnActive : btnInactive}`}
        aria-label="Format Bold"
        aria-pressed={isBold}>
        <i
          className={`${iconBase} ${isBold ? 'opacity-100' : 'opacity-70'}`}
          style={maskStyle('/img/bold.svg')}
        />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        className={`${btnBase} mr-0.5 ${isItalic ? btnActive : btnInactive}`}
        aria-label="Format Italics"
        aria-pressed={isItalic}>
        <i
          className={`${iconBase} ${isItalic ? 'opacity-100' : 'opacity-70'}`}
          style={maskStyle('/img/italic.svg')}
        />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
        className={`${btnBase} mr-0.5 ${isUnderline ? btnActive : btnInactive}`}
        aria-label="Format Underline"
        aria-pressed={isUnderline}>
        <i
          className={`${iconBase} ${isUnderline ? 'opacity-100' : 'opacity-70'}`}
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
      {isGenerating ? (
        <button
          onClick={abort}
          className="flex cursor-pointer items-center gap-1 rounded-md border border-solid border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors duration-150 hover:bg-red-100 dark:border-red-700 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
          aria-label="Stop AI"
          title="Stop AI generation (Escape)">
          <span className="animate-pulse">Stop</span>
        </button>
      ) : (
        <>
          <button
            onClick={handleBulletPoints}
            disabled={aiDisabled}
            className={aiBtnBase}
            aria-label="AI Bullet Points"
            title="Convert selected text (or entire document) to bullet points">
            Bullet Points
          </button>
          <button
            onClick={handleGenerate}
            disabled={aiDisabled}
            className={aiBtnBase}
            aria-label="AI Generate Paragraph"
            title="Generate a paragraph at the end of the document">
            Generate
          </button>
        </>
      )}
    </div>
  );
}
