/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorState,
  LexicalCommand,
  LexicalEditor,
  NodeKey,
} from 'lexical';

import './index.css';

import {$getMarkIDs, $isMarkNode, MarkNode} from '@lexical/mark';
import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {ClearEditorPlugin} from '@lexical/react/LexicalClearEditorPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import {$isRootTextContentEmpty, $rootTextContent} from '@lexical/text';
import {mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  KEY_ESCAPE_COMMAND,
} from 'lexical';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import * as React from 'react';
import {createPortal} from 'react-dom';
import useLayoutEffect from 'shared/useLayoutEffect';

import {getNodeFromDOM} from '../../../../lexical/src/LexicalUtils';
import CommentEditorTheme from '../../themes/CommentEditorTheme';
import Button from '../../ui/Button';
import ContentEditable from '../../ui/ContentEditable';
import Placeholder from '../../ui/Placeholder';

export const FIND_TEXT_COMMAND: LexicalCommand<string | RegExp> =
  createCommand('FIND_TEXT_COMMAND');
export const REPLACE_TEXT_COMMAND: LexicalCommand<{
  findText: string | RegExp;
  replaceText: string;
}> = createCommand('REPLACE_TEXT_COMMAND');

function EditorRefPlugin({
  editorRef,
}: {
  editorRef: {current: null | LexicalEditor};
}): null {
  const [editor] = useLexicalComposerContext();

  useLayoutEffect(() => {
    editorRef.current = editor;
    return () => {
      editorRef.current = null;
    };
  }, [editor, editorRef]);

  return null;
}

function EscapeHandlerPlugin({
  onEscape,
}: {
  onEscape: (e: KeyboardEvent) => boolean;
}): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      (event: KeyboardEvent) => {
        return onEscape(event);
      },
      2,
    );
  }, [editor, onEscape]);

  return null;
}

function PlainTextEditor({
  className,
  autoFocus,
  onEscape,
  onChange,
  editorRef,
  placeholder,
}: {
  autoFocus?: boolean;
  className?: string;
  editorRef?: {current: null | LexicalEditor};
  onChange: (editorState: EditorState, editor: LexicalEditor) => void;
  onEscape: (e: KeyboardEvent) => boolean;
  placeholder?: string;
}) {
  const initialConfig = {
    namespace: 'Search',
    nodes: [],
    onError: (error: Error) => {
      throw error;
    },
    theme: CommentEditorTheme,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="FindPlugin_CommentInputBox_EditorContainer">
        <PlainTextPlugin
          contentEditable={<ContentEditable className={className} />}
          placeholder={<Placeholder>{placeholder}</Placeholder>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <OnChangePlugin onChange={onChange} />
        <HistoryPlugin />
        {autoFocus !== false && <AutoFocusPlugin />}
        <EscapeHandlerPlugin onEscape={onEscape} />
        <ClearEditorPlugin />
        {editorRef !== undefined && <EditorRefPlugin editorRef={editorRef} />}
      </div>
    </LexicalComposer>
  );
}

function useOnChange(
  setContent: (text: string) => void,
  setCanSubmit: (canSubmit: boolean) => void,
) {
  return useCallback(
    (editorState: EditorState, _editor: LexicalEditor) => {
      editorState.read(() => {
        setContent($rootTextContent());
        setCanSubmit(!$isRootTextContentEmpty(_editor.isComposing(), true));
      });
    },
    [setCanSubmit, setContent],
  );
}

function FindTextEntries() {
  // const [canSubmitFind, setCanSubmitFind] = useState(false);
  // const [canSubmitReplace, setCanSubmitReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const editorRef = useRef<LexicalEditor>(null);
  const [mainEditor] = useLexicalComposerContext();

  const onChangeFind = useOnChange(setFindText, setCanSubmitFind);
  const onChangeReplace = useOnChange(setReplaceText, setCanSubmitReplace);

  const searchEditorContents = () => {
    if (findText !== '') {
      const editor = editorRef.current;
      if (editor !== null) {
        mainEditor.dispatchCommand(FIND_TEXT_COMMAND, findText);
      }
    }
  };

  const replaceTextMethod = () => {
    if (replaceText !== '') {
      const editor = editorRef.current;
      if (editor !== null) {
        mainEditor.dispatchCommand(REPLACE_TEXT_COMMAND, {
          findText,
          replaceText,
        });
      }
    }
  };

  return (
    <>
      <PlainTextEditor
        className="FindPlugin_FindPanel_Editor"
        autoFocus={false}
        onEscape={() => {
          return true;
        }}
        onChange={onChangeFind}
        editorRef={editorRef}
        placeholder={'Find'}
      />
      <Button
        className={'FindPlugin_FindPanel_FindButton'}
        onClick={searchEditorContents}
        disabled={false}>
        <i className={'find'} />
      </Button>
      <PlainTextEditor
        className="FindPlugin_FindPanel_Editor"
        autoFocus={false}
        onEscape={() => {
          return true;
        }}
        onChange={onChangeReplace}
        editorRef={editorRef}
        placeholder={'Replace'}
      />
      <Button
        className={'FindPlugin_FindPanel_ReplaceButton'}
        onClick={replaceTextMethod}
        disabled={replaceText === ''}>
        <i className={'replace'} />
      </Button>
    </>
  );
}

function CommentsPanel(): JSX.Element {
  // const listRef = useRef<HTMLUListElement>(null);
  // const [editor] = useLexicalComposerContext();

  return (
    <div className="FindPlugin_FindPanel">
      <h2 className="FindPlugin_FindPanel_Heading">Find & Replace</h2>
      <div className="FindPlugin_FindPanel_List">
        <div className="FindPlugin_FindPanel_List_Thread_Editor">
          <FindTextEntries />
        </div>
      </div>
    </div>
  );
}

export default function FindPlugin(): JSX.Element {
  const [mainEditor] = useLexicalComposerContext();
  const markNodeMap = useMemo<Map<string, Set<NodeKey>>>(() => {
    return new Map();
  }, []);
  const [activeIDs, setActiveIDs] = useState<Array<string>>([]);
  const [showFindReplace, setShowFindReplace] = useState(false);

  useEffect(() => {
    const changedElems: Array<HTMLElement> = [];
    for (let i = 0; i < activeIDs.length; i++) {
      const id = activeIDs[i];
      const keys = markNodeMap.get(id);
      if (keys !== undefined) {
        for (const key of keys) {
          const elem = mainEditor.getElementByKey(key);
          if (elem !== null) {
            elem.classList.add('selected');
            changedElems.push(elem);
            setShowFindReplace(true);
          }
        }
      }
    }
    return () => {
      for (let i = 0; i < changedElems.length; i++) {
        const changedElem = changedElems[i];
        changedElem.classList.remove('selected');
      }
    };
  }, [activeIDs, mainEditor, markNodeMap]);

  useEffect(() => {
    const markNodeKeysToIDs: Map<NodeKey, Array<string>> = new Map();

    return mergeRegister(
      // registerNestedElementResolver<MarkNode>(
      //   mainEditor,
      //   MarkNode,
      //   (from: MarkNode) => {
      //     return $createMarkNode(from.getIDs());
      //   },
      //   (from: MarkNode, to: MarkNode) => {
      //     // Merge the IDs
      //     const ids = from.getIDs();
      //     ids.forEach((id) => {
      //       to.addID(id);
      //     });
      //   },
      // ),
      mainEditor.registerMutationListener(MarkNode, (mutations) => {
        mainEditor.getEditorState().read(() => {
          for (const [key, mutation] of mutations) {
            const node: null | MarkNode = $getNodeByKey(key);
            let ids: NodeKey[] = [];

            if (mutation === 'destroyed') {
              ids = markNodeKeysToIDs.get(key) || [];
            } else if ($isMarkNode(node)) {
              ids = node.getIDs();
            }

            for (let i = 0; i < ids.length; i++) {
              const id = ids[i];
              let markNodeKeys = markNodeMap.get(id);
              markNodeKeysToIDs.set(key, ids);

              if (mutation === 'destroyed') {
                if (markNodeKeys !== undefined) {
                  markNodeKeys.delete(key);
                  if (markNodeKeys.size === 0) {
                    markNodeMap.delete(id);
                  }
                }
              } else {
                if (markNodeKeys === undefined) {
                  markNodeKeys = new Set();
                  markNodeMap.set(id, markNodeKeys);
                }
                if (!markNodeKeys.has(key)) {
                  markNodeKeys.add(key);
                }
              }
            }
          }
        });
      }),
      mainEditor.registerUpdateListener(({editorState, tags}) => {
        editorState.read(() => {
          const selection = $getSelection();
          let hasActiveIds = false;
          let hasAnchorKey = false;

          if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode();

            if ($isTextNode(anchorNode)) {
              const commentIDs = $getMarkIDs(
                anchorNode,
                selection.anchor.offset,
              );
              if (commentIDs !== null) {
                setActiveIDs(commentIDs);
                hasActiveIds = true;
              }
              if (!selection.isCollapsed()) {
                // setActiveAnchorKey(anchorNode.getKey());
                hasAnchorKey = true;
              }
            }
          }
          if (!hasActiveIds) {
            setActiveIDs((_activeIds) =>
              _activeIds.length === 0 ? _activeIds : [],
            );
          }
          if (!hasAnchorKey) {
            // setActiveAnchorKey(null);
          }
          if (!tags.has('collaboration') && $isRangeSelection(selection)) {
            // setShowCommentInput(false);
          }
        });
      }),
      mainEditor.registerCommand(
        FIND_TEXT_COMMAND,
        (findText: string) => {
          mainEditor.update(() => {
            const textNodes = mainEditor
              .getRootElement()
              ?.querySelectorAll(
                'span, b, em, strong, blockquote, h1, h2, h3, h4, h5, h6, code, pre',
              );
            for (let i = 0; i < textNodes?.length; i++) {
              const n = textNodes?.[i];
              let indexingS: number = n?.textContent?.indexOf(findText) || 0;
              let textNode = getNodeFromDOM(n);
              while (indexingS > -1) {
                if ($isTextNode(textNode)) {
                  let discardNode, oldNode, newNode;
                  if (indexingS === 0) {
                    [oldNode, newNode] = textNode.splitText(
                      indexingS,
                      indexingS + findText.length,
                    );
                  } else if (indexingS > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    [discardNode, oldNode, newNode] = textNode.splitText(
                      0,
                      indexingS,
                      indexingS + findText.length,
                    );
                  }
                  if (oldNode?.getTextContent()?.indexOf(findText) === 0) {
                    oldNode.setStyle('background-color: yellow;'); // TODO: Wrap with MarkNode here
                  }
                  if (oldNode?.getTextContent()?.length > 0) {
                    indexingS = newNode?.getTextContent()?.indexOf(findText);
                    textNode = newNode;
                  }
                }
              }
            }
          });
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      mainEditor.registerCommand(
        REPLACE_TEXT_COMMAND,
        ({findText, replaceText}) => {
          mainEditor.update(() => {
            const textNodes = mainEditor
              .getRootElement()
              ?.querySelectorAll(
                'span, b, em, strong, blockquote, h1, h2, h3, h4, h5, h6, code, pre',
              );
            for (let i = 0; i < textNodes?.length; i++) {
              const n = textNodes?.[i];
              let indexingS: number = n?.textContent?.indexOf(findText) || 0;
              let textNode = getNodeFromDOM(n);
              while (indexingS > -1) {
                if ($isTextNode(textNode)) {
                  let discardNode, oldNode, newNode;
                  if (indexingS === 0) {
                    [oldNode, newNode] = textNode.splitText(
                      indexingS,
                      indexingS + findText.length,
                    );
                  } else if (indexingS > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    [discardNode, oldNode, newNode] = textNode.splitText(
                      0,
                      indexingS,
                      indexingS + findText.length,
                    );
                  }
                  if (oldNode?.getTextContent()?.indexOf(findText) === 0) {
                    oldNode.setTextContent(replaceText);
                  }
                  if (oldNode?.getTextContent()?.length > 0) {
                    indexingS = newNode?.getTextContent()?.indexOf(findText);
                    textNode = newNode;
                  }
                }
              }
            }
          });
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [mainEditor, markNodeMap]);

  return (
    <>
      {createPortal(
        <Button
          className={`FindPlugin_ShowFindReplaceButton ${
            showFindReplace ? 'active' : ''
          }`}
          onClick={() => setShowFindReplace(!showFindReplace)}
          title={
            showFindReplace ? 'Hide Find & Replace' : 'Show Find & Replace'
          }>
          <i className="find" />
        </Button>,
        document.body,
      )}
      {showFindReplace && createPortal(<CommentsPanel />, document.body)}
    </>
  );
}
