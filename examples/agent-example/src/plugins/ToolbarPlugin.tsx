/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {useCallback, useEffect, useRef, useState} from 'react';

import {useAI} from '../ai/useAI';

function Divider() {
  return <div className="divider" />;
}

export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);

  const {generateParagraph, isGenerating, loadProgress, modelStatus, proofread} =
    useAI();

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
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

  const [aiError, setAiError] = useState<string | null>(null);

  const handleProofread = useCallback(async () => {
    setAiError(null);
    let textToProofread = '';
    let hasSelection = false;

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) && !selection.isCollapsed()) {
        textToProofread = selection.getTextContent();
        hasSelection = true;
      } else {
        textToProofread = $getRoot().getTextContent();
        hasSelection = false;
      }
    });

    if (!textToProofread.trim()) {
      return;
    }

    try {
      const result = await proofread(textToProofread);
      if (!result.trim()) {
        return;
      }

      editor.update(() => {
        if (hasSelection) {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertRawText(result);
          }
        } else {
          const root = $getRoot();
          root.clear();
          const lines = result.split('\n');
          for (const line of lines) {
            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode(line));
            root.append(paragraph);
          }
        }
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setAiError(message);
    }
  }, [editor, proofread]);

  const handleGenerate = useCallback(async () => {
    setAiError(null);
    let context = '';

    editor.getEditorState().read(() => {
      context = $getRoot().getTextContent();
    });

    try {
      const result = await generateParagraph(context);
      if (!result.trim()) {
        return;
      }

      editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(result));
        root.append(paragraph);

        // Move selection to end of inserted paragraph
        paragraph.selectEnd();
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setAiError(message);
    }
  }, [editor, generateParagraph]);

  const aiDisabled = isGenerating || modelStatus === 'loading';

  return (
    <div className="toolbar" ref={toolbarRef}>
      <button
        disabled={!canUndo}
        onClick={() => {
          editor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
        className="toolbar-item spaced"
        aria-label="Undo">
        <i className="format undo" />
      </button>
      <button
        disabled={!canRedo}
        onClick={() => {
          editor.dispatchCommand(REDO_COMMAND, undefined);
        }}
        className="toolbar-item"
        aria-label="Redo">
        <i className="format redo" />
      </button>
      <Divider />
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        className={'toolbar-item spaced ' + (isBold ? 'active' : '')}
        aria-label="Format Bold">
        <i className="format bold" />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        className={'toolbar-item spaced ' + (isItalic ? 'active' : '')}
        aria-label="Format Italics">
        <i className="format italic" />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
        className={'toolbar-item spaced ' + (isUnderline ? 'active' : '')}
        aria-label="Format Underline">
        <i className="format underline" />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
        }}
        className={'toolbar-item spaced ' + (isStrikethrough ? 'active' : '')}
        aria-label="Format Strikethrough">
        <i className="format strikethrough" />
      </button>
      <Divider />
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
        }}
        className="toolbar-item spaced"
        aria-label="Left Align">
        <i className="format left-align" />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
        }}
        className="toolbar-item spaced"
        aria-label="Center Align">
        <i className="format center-align" />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
        }}
        className="toolbar-item spaced"
        aria-label="Right Align">
        <i className="format right-align" />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
        }}
        className="toolbar-item"
        aria-label="Justify Align">
        <i className="format justify-align" />
      </button>
      <Divider />
      {modelStatus === 'loading' && (
        <span className="toolbar-item ai-status">
          Loading model{loadProgress !== null ? ` ${loadProgress}%` : '...'}
        </span>
      )}
      {isGenerating && (
        <span className="toolbar-item ai-status">Generating...</span>
      )}
      {aiError && (
        <span className="toolbar-item ai-error" title={aiError}>
          Error
        </span>
      )}
      <button
        onClick={handleProofread}
        disabled={aiDisabled}
        className="toolbar-item spaced ai-button"
        aria-label="AI Proofread"
        title="Proofread selected text (or entire document)">
        <span className="ai-button-text">Proofread</span>
      </button>
      <button
        onClick={handleGenerate}
        disabled={aiDisabled}
        className="toolbar-item ai-button"
        aria-label="AI Generate Paragraph"
        title="Generate a paragraph at the end of the document">
        <span className="ai-button-text">Generate</span>
      </button>
    </div>
  );
}
