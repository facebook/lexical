/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';
import type {JSX} from 'react';

import {$createCodeNode, $isCodeNode} from '@lexical/code';
import {
  editorStateFromSerializedDocument,
  exportFile,
  importFile,
  SerializedDocument,
  serializedDocumentFromEditorState,
} from '@lexical/file';
import {
  $generateHtmlFromNodes,
  $generateNodesFromDOM,
  $withRenderContext,
  contextValue,
} from '@lexical/html';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/markdown';
import {useCollaborationContext} from '@lexical/react/LexicalCollaborationContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {CONNECTED_COMMAND, TOGGLE_CONNECT_COMMAND} from '@lexical/yjs';
import {
  $createParagraphNode,
  $getRoot,
  $insertNodes,
  $isParagraphNode,
  CLEAR_EDITOR_COMMAND,
  CLEAR_HISTORY_COMMAND,
  COLLABORATION_TAG,
  COMMAND_PRIORITY_EDITOR,
  HISTORIC_TAG,
  RootNode,
} from 'lexical';
import {
  startTransition,
  useActionState,
  useEffect,
  useOptimistic,
  useRef,
  useState,
} from 'react';

import {INITIAL_SETTINGS} from '../../appSettings';
import useFlashMessage from '../../hooks/useFlashMessage';
import useModal from '../../hooks/useModal';
import Button from '../../ui/Button';
import {docFromHash, docToHash} from '../../utils/docSerialization';
import {formatCodeWithPrettier} from '../CodeActionMenuPlugin/formatCodeWithPrettier';
import {PLAYGROUND_TRANSFORMERS} from '../MarkdownTransformers';
import {
  SPEECH_TO_TEXT_COMMAND,
  SUPPORT_SPEECH_RECOGNITION,
} from '../SpeechToTextPlugin';
import {RenderContextTerse} from '../TerseExportExtension';
import {SHOW_VERSIONS_COMMAND} from '../VersionsPlugin';

async function sendEditorState(editor: LexicalEditor): Promise<void> {
  const stringifiedEditorState = JSON.stringify(editor.getEditorState());
  try {
    await fetch('http://localhost:1235/setEditorState', {
      body: stringifiedEditorState,
      headers: {
        Accept: 'application/json',
        'Content-type': 'application/json',
      },
      method: 'POST',
    });
  } catch {
    // NO-OP
  }
}

async function validateEditorState(editor: LexicalEditor): Promise<void> {
  const stringifiedEditorState = JSON.stringify(editor.getEditorState());
  let response = null;
  try {
    response = await fetch('http://localhost:1235/validateEditorState', {
      body: stringifiedEditorState,
      headers: {
        Accept: 'application/json',
        'Content-type': 'application/json',
      },
      method: 'POST',
    });
  } catch {
    // NO-OP
  }
  if (response !== null && response.status === 403) {
    throw new Error(
      'Editor state validation failed! Server did not accept changes.',
    );
  }
}

async function shareDoc(doc: SerializedDocument): Promise<void> {
  const url = new URL(window.location.toString());
  url.hash = await docToHash(doc);
  const newUrl = url.toString();
  window.history.replaceState({}, '', newUrl);
  await window.navigator.clipboard.writeText(newUrl);
}

type EditorMode = 'wysiwyg' | 'markdown' | 'html';

export default function ActionsPlugin({
  shouldPreserveNewLinesInMarkdown,
  useCollabV2,
}: {
  shouldPreserveNewLinesInMarkdown: boolean;
  useCollabV2: boolean;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isEditable, setIsEditable] = useState(() => editor.isEditable());
  const [isSpeechToText, setIsSpeechToText] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [modal, showModal] = useModal();
  const showFlashMessage = useFlashMessage();
  const {isCollabActive} = useCollaborationContext();
  const unregisterTransformRef = useRef(() => {});
  const [mode, dispatchMode, isPending] = useActionState(
    async (prevMode: EditorMode, nextMode: EditorMode): Promise<EditorMode> => {
      if (prevMode === 'wysiwyg') {
        // handle transitions from wysiwyg -> nextMode -> wysiwyg when there's a single
        // root child CodeNode that is the nextMode language. e2e tests assume you can
        // do this.
        editor.read(() => {
          const root = $getRoot();
          const codeNode =
            root.getChildrenSize() === 1
              ? root.getChildren().find($isCodeNode)
              : null;
          if (codeNode) {
            const language = codeNode.getLanguage();
            if (language === nextMode) {
              prevMode = nextMode;
              nextMode = 'wysiwyg';
            }
          }
        });
      }
      if (nextMode === 'wysiwyg') {
        unregisterTransformRef.current();
        editor.update(() => {
          if (prevMode === 'html') {
            const root = $getRoot();
            const parser = new DOMParser();
            const content = root.getTextContent();
            const dom = parser.parseFromString(content, 'text/html');
            const nodes = $generateNodesFromDOM(editor, dom);
            root.clear().select();
            $insertNodes(nodes);
            if (root.isEmpty()) {
              root.append($createParagraphNode()).select();
            }
          } else if (prevMode === 'markdown') {
            const root = $getRoot();
            const firstChild = root.getFirstChild();
            if (
              $isCodeNode(firstChild) &&
              firstChild.getLanguage() === 'markdown'
            ) {
              unregisterTransformRef.current();
              $convertFromMarkdownString(
                firstChild.getTextContent(),
                PLAYGROUND_TRANSFORMERS,
                undefined, // node
                shouldPreserveNewLinesInMarkdown,
              );
            }
          }
        });
      } else if (nextMode === 'markdown') {
        editor.update(() => {
          const markdown = $convertToMarkdownString(
            PLAYGROUND_TRANSFORMERS,
            undefined, //node
            shouldPreserveNewLinesInMarkdown,
          );
          const codeNode = $createCodeNode('markdown');
          $getRoot().clear().append(codeNode);
          codeNode.select().insertRawText(markdown);
          codeNode.select(0, 0);
        });
      } else if (nextMode === 'html') {
        const rawHtml = editor.read(() =>
          $withRenderContext(
            [contextValue(RenderContextTerse, true)],
            editor,
          )(() => $generateHtmlFromNodes(editor)),
        );
        const html = await formatCodeWithPrettier(rawHtml, 'html');
        editor.update(() => {
          const codeNode = $createCodeNode('html');
          $getRoot().clear().append(codeNode);
          codeNode.select().insertRawText(html.trimEnd());
          codeNode.select(0, 0);
        });
      }
      return nextMode;
    },
    'wysiwyg',
  );
  const [optimisticMode, setOptimisticMode] = useOptimistic<EditorMode>(mode);
  const isMarkdown = optimisticMode === 'markdown';
  const isHtml = optimisticMode === 'html';

  useEffect(() => {
    if (mode !== 'wysiwyg') {
      const unregister = editor.registerNodeTransform(RootNode, rootNode => {
        let codeNode = rootNode.getChildren().find($isCodeNode);
        if (!codeNode) {
          codeNode = $createCodeNode(mode);
        }
        if (rootNode.getChildrenSize() !== 1 || !codeNode.getParent()) {
          rootNode.splice(0, rootNode.getChildrenSize(), [codeNode]);
          codeNode.select();
        }
        if (codeNode.getLanguage() !== mode) {
          codeNode.setLanguage(mode);
        }
      });
      unregisterTransformRef.current = unregister;
      return unregister;
    }
  }, [editor, mode]);
  useEffect(() => {
    if (INITIAL_SETTINGS.isCollab) {
      return;
    }
    docFromHash(window.location.hash).then(doc => {
      if (doc && doc.source === 'Playground') {
        editor.setEditorState(editorStateFromSerializedDocument(editor, doc));
        editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
      }
    });
  }, [editor]);
  useEffect(() => {
    return mergeRegister(
      editor.registerEditableListener(editable => {
        setIsEditable(editable);
      }),
      editor.registerCommand<boolean>(
        CONNECTED_COMMAND,
        payload => {
          const isConnected = payload;
          setConnected(isConnected);
          return false;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(
      ({dirtyElements, prevEditorState, tags}) => {
        // If we are in read only mode, send the editor state
        // to server and ask for validation if possible.
        if (
          !isEditable &&
          dirtyElements.size > 0 &&
          !tags.has(HISTORIC_TAG) &&
          !tags.has(COLLABORATION_TAG)
        ) {
          validateEditorState(editor);
        }
        editor.getEditorState().read(() => {
          const root = $getRoot();
          const children = root.getChildren();

          if (children.length > 1) {
            setIsEditorEmpty(false);
          } else {
            if ($isParagraphNode(children[0])) {
              const paragraphChildren = children[0].getChildren();
              setIsEditorEmpty(paragraphChildren.length === 0);
            } else {
              setIsEditorEmpty(false);
            }
          }
        });
      },
    );
  }, [editor, isEditable]);

  const toggleMode = (targetMode: 'html' | 'markdown') => {
    startTransition(() => {
      const nextMode =
        mode === 'wysiwyg'
          ? targetMode
          : mode === targetMode
            ? 'wysiwyg'
            : mode;
      if (mode === nextMode) {
        return;
      }
      setOptimisticMode(nextMode);
      dispatchMode(nextMode);
    });
  };

  return (
    <div className="actions">
      {SUPPORT_SPEECH_RECOGNITION && (
        <button
          onClick={() => {
            editor.dispatchCommand(SPEECH_TO_TEXT_COMMAND, !isSpeechToText);
            setIsSpeechToText(!isSpeechToText);
          }}
          className={
            'action-button action-button-mic ' +
            (isSpeechToText ? 'active' : '')
          }
          title="Speech To Text"
          aria-label={`${
            isSpeechToText ? 'Enable' : 'Disable'
          } speech to text`}>
          <i className="mic" />
        </button>
      )}
      <button
        className="action-button import"
        onClick={() => importFile(editor)}
        title="Import"
        aria-label="Import editor state from JSON">
        <i className="import" />
      </button>

      <button
        className="action-button export"
        onClick={() =>
          exportFile(editor, {
            fileName: `Playground ${new Date().toISOString()}`,
            source: 'Playground',
          })
        }
        title="Export"
        aria-label="Export editor state to JSON">
        <i className="export" />
      </button>
      <button
        className="action-button share"
        disabled={isCollabActive || INITIAL_SETTINGS.isCollab}
        onClick={() =>
          shareDoc(
            serializedDocumentFromEditorState(editor.getEditorState(), {
              source: 'Playground',
            }),
          ).then(
            () => showFlashMessage('URL copied to clipboard'),
            () => showFlashMessage('URL could not be copied to clipboard'),
          )
        }
        title="Share"
        aria-label="Share Playground link to current editor state">
        <i className="share" />
      </button>
      <button
        className="action-button clear"
        disabled={isEditorEmpty}
        onClick={() => {
          showModal('Clear editor', onClose => (
            <ShowClearDialog editor={editor} onClose={onClose} />
          ));
        }}
        title="Clear"
        aria-label="Clear editor contents">
        <i className="clear" />
      </button>
      <button
        className={`action-button ${!isEditable ? 'unlock' : 'lock'}`}
        onClick={() => {
          // Send latest editor state to commenting validation server
          if (isEditable) {
            sendEditorState(editor);
          }
          editor.setEditable(!editor.isEditable());
        }}
        title="Read-Only Mode"
        aria-label={`${!isEditable ? 'Unlock' : 'Lock'} read-only mode`}>
        <i className={!isEditable ? 'unlock' : 'lock'} />
      </button>
      <button
        className="action-button"
        data-active={isMarkdown}
        disabled={isHtml || isPending}
        onClick={() => toggleMode('markdown')}
        title={isMarkdown ? 'Convert From Markdown' : 'Convert To Markdown'}
        aria-label={
          isMarkdown ? 'Convert from markdown' : 'Convert To Markdown'
        }>
        <i className="markdown" />
      </button>
      <button
        className="action-button"
        data-active={isHtml}
        disabled={isMarkdown || isPending}
        onClick={() => toggleMode('html')}
        title={isHtml ? 'Convert From HTML' : ' Convert To HTML'}
        aria-label={isHtml ? 'Convert from html' : 'Convert to html'}>
        <i className="html" />
      </button>
      {isCollabActive && (
        <>
          <button
            className="action-button connect"
            onClick={() => {
              editor.dispatchCommand(TOGGLE_CONNECT_COMMAND, !connected);
            }}
            title={`${
              connected ? 'Disconnect' : 'Connect'
            } Collaborative Editing`}
            aria-label={`${
              connected ? 'Disconnect from' : 'Connect to'
            } a collaborative editing server`}>
            <i className={connected ? 'disconnect' : 'connect'} />
          </button>
          {useCollabV2 && (
            <button
              className="action-button versions"
              onClick={() => {
                editor.dispatchCommand(SHOW_VERSIONS_COMMAND, undefined);
              }}>
              <i className="versions" />
            </button>
          )}
        </>
      )}
      {modal}
    </div>
  );
}

function ShowClearDialog({
  editor,
  onClose,
}: {
  editor: LexicalEditor;
  onClose: () => void;
}): JSX.Element {
  return (
    <>
      Are you sure you want to clear the editor?
      <div className="Modal__content">
        <Button
          onClick={() => {
            editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
            editor.focus();
            onClose();
          }}>
          Clear
        </Button>{' '}
        <Button
          onClick={() => {
            editor.focus();
            onClose();
          }}>
          Cancel
        </Button>
      </div>
    </>
  );
}
