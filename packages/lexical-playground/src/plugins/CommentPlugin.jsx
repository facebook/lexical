/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  EditorState,
  LexicalEditor,
  NodeKey,
  RangeSelection,
  TextNode,
} from 'lexical';

import './CommentPlugin.css';

import AutoFocusPlugin from '@lexical/react/LexicalAutoFocusPlugin';
import LexicalClearEditorPlugin from '@lexical/react/LexicalClearEditorPlugin';
import LexicalComposer from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import LexicalOnChangePlugin from '@lexical/react/LexicalOnChangePlugin';
import PlainTextPlugin from '@lexical/react/LexicalPlainTextPlugin';
import {createDOMRange, createRectsFromDOMRange} from '@lexical/selection';
import {$isRootTextContentEmpty, $rootTextContentCurry} from '@lexical/text';
import {mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  CLEAR_EDITOR_COMMAND,
  KEY_ESCAPE_COMMAND,
} from 'lexical';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import * as React from 'react';
// $FlowFixMe: Flow doesn't see react-dom module
import {createPortal} from 'react-dom';
import useLayoutEffect from 'shared/useLayoutEffect';

import useModal from '../hooks/useModal';
import {$createMarkNode, $isMarkNode, MarkNode} from '../nodes/MarkNode';
import CommentEditorTheme from '../themes/CommentEditorTheme';
import Button from '../ui/Button';
import ContentEditable from '../ui/ContentEditable.jsx';
import Placeholder from '../ui/Placeholder.jsx';

export type CommentContextType = {
  isActive: boolean,
  setActive: (val: boolean) => void,
};

export type Comment = {
  author: string,
  content: string,
  id: string,
  timeStamp: number,
  type: 'comment',
};

export type Thread = {
  comments: Array<Comment>,
  id: string,
  quote: string,
  type: 'thread',
};

export type Comments = Array<Thread | Comment>;

// $FlowFixMe: needs type
type RtfObject = Object;

function AddCommentBox({
  anchorKey,
  editor,
  onAddComment,
}: {
  anchorKey: NodeKey,
  editor: LexicalEditor,
  onAddComment: () => void,
}): React$Node {
  const boxRef = useRef(null);

  const updatePosition = useCallback(() => {
    const boxElem = boxRef.current;
    const rootElement = editor.getRootElement();
    const anchorElement = editor.getElementByKey(anchorKey);

    if (boxElem !== null && rootElement !== null && anchorElement !== null) {
      const {right} = rootElement.getBoundingClientRect();
      const {top} = anchorElement.getBoundingClientRect();
      boxElem.style.left = `${right - 20}px`;
      boxElem.style.top = `${top - 30}px`;
    }
  }, [anchorKey, editor]);

  useEffect(() => {
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [editor, updatePosition]);

  useLayoutEffect(() => {
    updatePosition();
  }, [anchorKey, editor, updatePosition]);

  return (
    <div className="CommentPlugin_AddCommentBox" ref={boxRef}>
      <button
        className="CommentPlugin_AddCommentBox_button"
        onClick={onAddComment}>
        <i className="icon add-comment" />
      </button>
    </div>
  );
}

function EditorRefPlugin({
  editorRef,
}: {
  editorRef: {current: null | LexicalEditor},
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
  onEscape: (KeyboardEvent) => boolean,
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
  placeholder = 'Type a comment...',
}: {
  autoFocus?: boolean,
  className?: string,
  editorRef?: {current: null | LexicalEditor},
  onChange: (EditorState, LexicalEditor) => void,
  onEscape: (KeyboardEvent) => boolean,
  placeholder?: string,
}) {
  const initialConfig = {
    namespace: 'CommentEditor',
    nodes: [],
    onError: (error) => {
      throw error;
    },
    theme: CommentEditorTheme,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="CommentPlugin_CommentInputBox_EditorContainer">
        <PlainTextPlugin
          contentEditable={<ContentEditable className={className} />}
          placeholder={<Placeholder>{placeholder}</Placeholder>}
        />
        <LexicalOnChangePlugin onChange={onChange} />
        <HistoryPlugin />
        {autoFocus !== false && <AutoFocusPlugin />}
        <EscapeHandlerPlugin onEscape={onEscape} />
        <LexicalClearEditorPlugin />
        {editorRef !== undefined && <EditorRefPlugin editorRef={editorRef} />}
      </div>
    </LexicalComposer>
  );
}

function useOnChange(setContent, setCanSubmit) {
  return useCallback(
    (editorState: EditorState, _editor: LexicalEditor) => {
      editorState.read(() => {
        setContent($rootTextContentCurry());
        setCanSubmit(!$isRootTextContentEmpty(_editor.isComposing(), true));
      });
    },
    [setCanSubmit, setContent],
  );
}

function CommentInputBox({
  editor,
  cancelAddComment,
  submitAddComment,
}: {
  cancelAddComment: () => void,
  editor: LexicalEditor,
  submitAddComment: (Comment | Thread, boolean) => void,
}) {
  const [content, setContent] = useState('');
  const [canSubmit, setCanSubmit] = useState(false);
  const boxRef = useRef(null);
  const selectionState = useMemo(
    () => ({
      container: document.createElement('div'),
      elements: [],
    }),
    [],
  );

  const updateLocation = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();

      if ($isRangeSelection(selection)) {
        const anchor = selection.anchor;
        const focus = selection.focus;
        const range = createDOMRange(
          editor,
          anchor.getNode(),
          anchor.offset,
          focus.getNode(),
          focus.offset,
        );
        const boxElem = boxRef.current;
        if (range !== null && boxElem !== null) {
          const {left, bottom, width} = range.getBoundingClientRect();
          const selectionRects = createRectsFromDOMRange(editor, range);
          let correctedLeft =
            selectionRects.length === 1 ? left + width / 2 - 125 : left - 125;
          if (correctedLeft < 10) {
            correctedLeft = 10;
          }
          boxElem.style.left = `${correctedLeft}px`;
          boxElem.style.top = `${bottom + 20}px`;
          const selectionRectsLength = selectionRects.length;
          const {elements, container} = selectionState;
          const elementsLength = elements.length;

          for (let i = 0; i < selectionRectsLength; i++) {
            const selectionRect = selectionRects[i];
            let elem = elements[i];
            if (elem === undefined) {
              elem = document.createElement('span');
              elements[i] = elem;
              container.appendChild(elem);
            }
            const color = '255, 212, 0';
            const style = `position:absolute;top:${selectionRect.top}px;left:${selectionRect.left}px;height:${selectionRect.height}px;width:${selectionRect.width}px;background-color:rgba(${color}, 0.3);pointer-events:none;z-index:5;`;
            elem.style.cssText = style;
          }
          for (let i = elementsLength - 1; i >= selectionRectsLength; i--) {
            const elem = elements[i];
            container.removeChild(elem);
            elements.pop();
          }
        }
      }
    });
  }, [editor, selectionState]);

  useLayoutEffect(() => {
    updateLocation();
    const container = selectionState.container;
    const body = document.body;
    if (body !== null) {
      body.appendChild(container);
      return () => {
        body.removeChild(container);
      };
    }
  }, [selectionState.container, updateLocation]);

  useEffect(() => {
    window.addEventListener('resize', updateLocation);

    return () => {
      window.removeEventListener('resize', updateLocation);
    };
  }, [updateLocation]);

  const onEscape = (event: KeyboardEvent): boolean => {
    event.preventDefault();
    cancelAddComment();
    return true;
  };

  const submitComment = () => {
    if (canSubmit) {
      let quote = editor.getEditorState().read(() => {
        const selection = $getSelection();
        return selection !== null ? selection.getTextContent() : '';
      });
      if (quote.length > 100) {
        quote = quote.slice(0, 99) + '…';
      }
      submitAddComment(createThread(quote, content), true);
    }
  };

  const onChange = useOnChange(setContent, setCanSubmit);

  return (
    <div className="CommentPlugin_CommentInputBox" ref={boxRef}>
      <PlainTextEditor
        className="CommentPlugin_CommentInputBox_Editor"
        onEscape={onEscape}
        onChange={onChange}
      />
      <div className="CommentPlugin_CommentInputBox_Buttons">
        <Button
          onClick={cancelAddComment}
          className="CommentPlugin_CommentInputBox_Button">
          Cancel
        </Button>
        <Button
          onClick={submitComment}
          disabled={!canSubmit}
          className="CommentPlugin_CommentInputBox_Button primary">
          Comment
        </Button>
      </div>
    </div>
  );
}

function CommentsComposer({
  submitAddComment,
  thread,
  placeholder,
}: {
  placeholder?: string,
  submitAddComment: (Comment, boolean, thread?: Thread) => void,
  thread?: Thread,
}) {
  const [content, setContent] = useState('');
  const [canSubmit, setCanSubmit] = useState(false);
  const editorRef = useRef(null);

  const onChange = useOnChange(setContent, setCanSubmit);

  const submitComment = () => {
    if (canSubmit) {
      submitAddComment(createComment(content), false, thread);
      const editor = editorRef.current;
      if (editor !== null) {
        editor.dispatchCommand(CLEAR_EDITOR_COMMAND);
      }
    }
  };

  return (
    <>
      <PlainTextEditor
        className="CommentPlugin_CommentsPanel_Editor"
        autoFocus={false}
        onEscape={() => {
          return true;
        }}
        onChange={onChange}
        editorRef={editorRef}
        placeholder={placeholder}
      />
      <Button
        className="CommentPlugin_CommentsPanel_SendButton"
        onClick={submitComment}
        disabled={!canSubmit}>
        <i className="send" />
      </Button>
    </>
  );
}

function CommentsPanelFooter({
  footerRef,
  submitAddComment,
}: {
  footerRef: {current: null | HTMLElement},
  submitAddComment: (Comment | Thread, boolean) => void,
}) {
  return (
    <div className="CommentPlugin_CommentsPanel_Footer" ref={footerRef}>
      <CommentsComposer submitAddComment={submitAddComment} />
    </div>
  );
}

function ShowDeleteCommentDialog({
  comment,
  deleteComment,
  onClose,
  thread,
}: {
  comment: Comment,
  deleteComment: (Comment, thread?: Thread) => void,
  onClose: () => void,
  thread?: Thread,
}): React$Node {
  return (
    <>
      Are you sure you want to delete this comment?
      <div className="Modal__content">
        <Button
          onClick={() => {
            deleteComment(comment, thread);
            onClose();
          }}>
          Delete
        </Button>{' '}
        <Button
          onClick={() => {
            onClose();
          }}>
          Cancel
        </Button>
      </div>
    </>
  );
}

function CommentsPanelListComment({
  comment,
  deleteComment,
  thread,
  rtf,
}: {
  comment: Comment,
  deleteComment: (Comment, thread?: Thread) => void,
  rtf: RtfObject,
  thread?: Thread,
}): React$Node {
  const seconds = Math.round((comment.timeStamp - performance.now()) / 1000);
  const minutes = Math.round(seconds / 60);
  const [modal, showModal] = useModal();

  return (
    <li className="CommentPlugin_CommentsPanel_List_Comment">
      <div className="CommentPlugin_CommentsPanel_List_Details">
        <span className="CommentPlugin_CommentsPanel_List_Comment_Author">
          {comment.author}
        </span>
        <span className="CommentPlugin_CommentsPanel_List_Comment_Time">
          · {seconds > -10 ? 'Just now' : rtf.format(minutes, 'minute')}
        </span>
      </div>
      <p>{comment.content}</p>
      <Button
        onClick={() => {
          showModal('Delete Comment', (onClose) => (
            <ShowDeleteCommentDialog
              comment={comment}
              deleteComment={deleteComment}
              thread={thread}
              onClose={onClose}
            />
          ));
        }}
        className="CommentPlugin_CommentsPanel_List_DeleteButton">
        <i className="delete" />
      </Button>
      {modal}
    </li>
  );
}

function CommentsPanelList({
  activeIDs,
  comments,
  deleteComment,
  listRef,
  submitAddComment,
  markNodeMap,
}: {
  activeIDs: Array<string>,
  comments: Comments,
  deleteComment: (Comment, thread?: Thread) => void,
  listRef: {current: null | HTMLElement},
  markNodeMap: Map<string, Set<NodeKey>>,
  submitAddComment: (Comment | Thread, boolean, thread?: Thread) => void,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  const [counter, setCounter] = useState(0);
  const rtf: RtfObject = useMemo(
    () =>
      // $FlowFixMe: Flow hasn't got types yet
      new Intl.RelativeTimeFormat('en', {
        localeMatcher: 'best fit',
        numeric: 'auto',
        style: 'short',
      }),
    [],
  );

  useEffect(() => {
    // Used to keep the time stamp up to date
    const id = setTimeout(() => {
      setCounter(counter + 1);
    }, 10000);

    return () => {
      clearTimeout(id);
    };
  }, [counter]);

  return (
    <ul className="CommentPlugin_CommentsPanel_List" ref={listRef}>
      {comments.map((commentOrThread) => {
        const id = commentOrThread.id;
        if (commentOrThread.type === 'thread') {
          const handleClickThread = (event) => {
            const markNodeKeys = markNodeMap.get(id);
            if (
              markNodeKeys !== undefined &&
              (activeIDs === null || activeIDs.indexOf(id) === -1)
            ) {
              const activeElement = document.activeElement;
              // Move selection to the start of the mark, so that we
              // update the UI with the selected thread.
              editor.update(
                () => {
                  const markNodeKey = Array.from(markNodeKeys)[0];
                  const markNode = $getNodeByKey(markNodeKey);
                  if ($isMarkNode(markNode)) {
                    markNode.selectStart();
                  }
                },
                {
                  onUpdate() {
                    // Restore selection to the previous element
                    if (activeElement !== null) {
                      activeElement.focus();
                    }
                  },
                },
              );
            }
          };

          return (
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
            <li
              key={id}
              onClick={handleClickThread}
              className={`CommentPlugin_CommentsPanel_List_Thread ${
                markNodeMap.has(id) ? 'interactive' : ''
              } ${activeIDs.indexOf(id) === -1 ? '' : 'active'}`}>
              <blockquote className="CommentPlugin_CommentsPanel_List_Thread_Quote">
                > <span>{commentOrThread.quote}</span>
              </blockquote>
              <ul className="CommentPlugin_CommentsPanel_List_Thread_Comments">
                {commentOrThread.comments.map((comment) => (
                  <CommentsPanelListComment
                    key={comment.id}
                    comment={comment}
                    deleteComment={deleteComment}
                    thread={commentOrThread}
                    rtf={rtf}
                  />
                ))}
              </ul>
              <div className="CommentPlugin_CommentsPanel_List_Thread_Editor">
                <CommentsComposer
                  submitAddComment={submitAddComment}
                  thread={commentOrThread}
                  placeholder="Reply to comment..."
                />
              </div>
            </li>
          );
        }
        return (
          <CommentsPanelListComment
            key={id}
            comment={commentOrThread}
            deleteComment={deleteComment}
            rtf={rtf}
          />
        );
      })}
    </ul>
  );
}

function CommentsPanel({
  activeIDs,
  deleteComment,
  comments,
  submitAddComment,
  markNodeMap,
}: {
  activeIDs: Array<string>,
  comments: Comments,
  deleteComment: (Comment, thread?: Thread) => void,
  markNodeMap: Map<string, Set<NodeKey>>,
  submitAddComment: (Comment | Thread, boolean, thread?: Thread) => void,
}): React$Node {
  const footerRef = useRef(null);
  const listRef = useRef(null);
  const isEmpty = comments.length === 0;

  useLayoutEffect(() => {
    const footerElem = footerRef.current;
    if (footerElem !== null) {
      const updateSize = () => {
        const listElem = listRef.current;
        if (listElem !== null) {
          const rect = footerElem.getBoundingClientRect();
          listElem.style.height = window.innerHeight - rect.height - 133 + 'px';
        }
      };
      const resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(footerElem);
      window.addEventListener('resize', updateSize);

      return () => {
        window.removeEventListener('resize', updateSize);
        resizeObserver.disconnect();
      };
    }
  }, [isEmpty]);

  return (
    <div className="CommentPlugin_CommentsPanel">
      <h2 className="CommentPlugin_CommentsPanel_Heading">Comments</h2>
      {isEmpty ? (
        <div className="CommentPlugin_CommentsPanel_Empty">No Comments</div>
      ) : (
        <CommentsPanelList
          activeIDs={activeIDs}
          comments={comments}
          deleteComment={deleteComment}
          listRef={listRef}
          submitAddComment={submitAddComment}
          markNodeMap={markNodeMap}
        />
      )}
      <CommentsPanelFooter
        submitAddComment={submitAddComment}
        footerRef={footerRef}
      />
    </div>
  );
}

function createUID(): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .substr(0, 5);
}

function createComment(content: string): Comment {
  return {
    author: 'Playground User',
    content,
    id: createUID(),
    timeStamp: performance.now(),
    type: 'comment',
  };
}

function createThread(quote: string, content: string): Thread {
  return {
    comments: [createComment(content)],
    id: createUID(),
    quote,
    type: 'thread',
  };
}

function cloneThread(thread: Thread): Thread {
  return {
    comments: Array.from(thread.comments),
    id: thread.id,
    quote: thread.quote,
    type: 'thread',
  };
}

function $unwrapMarkNode(node: MarkNode): void {
  const children = node.getChildren();
  let target = null;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (target === null) {
      node.insertBefore(child);
    } else {
      target.insertAfter(child);
    }
    target = child;
  }
  node.remove();
}

function $wrapSelectionInMarkNode(
  selection: RangeSelection,
  isBackward: boolean,
  id: string,
): void {
  const nodes = selection.getNodes();
  const anchorOffset = selection.anchor.offset;
  const focusOffset = selection.focus.offset;
  const nodesLength = nodes.length;
  const startOffset = isBackward ? focusOffset : anchorOffset;
  const endOffset = isBackward ? anchorOffset : focusOffset;
  let currentNodeParent;
  let currentMarkNode;

  // We only want wrap adjacent text nodes, line break nodes
  // and inline element nodes. For decorator nodes and block
  // element nodes, we stop out their boundary and start again
  // after, if there are more nodes.
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    if ($isElementNode(currentMarkNode) && currentMarkNode.isParentOf(node)) {
      continue;
    }
    const isFirstNode = i === 0;
    const isLastNode = i === nodesLength - 1;
    let targetNode;

    if ($isTextNode(node)) {
      const textContentSize = node.getTextContentSize();
      const startTextOffset = isFirstNode ? startOffset : 0;
      const endTextOffset = isLastNode ? endOffset : textContentSize;
      if (startTextOffset === 0 && endTextOffset === 0) {
        continue;
      }
      const splitNodes = node.splitText(startTextOffset, endTextOffset);
      targetNode =
        splitNodes.length > 1 &&
        (splitNodes.length === 3 ||
          (isFirstNode && !isLastNode) ||
          endTextOffset === textContentSize)
          ? splitNodes[1]
          : splitNodes[0];
    } else if ($isElementNode(node) && node.isInline()) {
      targetNode = node;
    }
    if (targetNode !== undefined) {
      const parentNode = targetNode.getParent();
      if (parentNode == null || !parentNode.is(currentNodeParent)) {
        currentMarkNode = undefined;
      }
      currentNodeParent = parentNode;
      if (currentMarkNode === undefined) {
        currentMarkNode = $createMarkNode([id]);
        targetNode.insertBefore(currentMarkNode);
      }
      currentMarkNode.append(targetNode);
    } else {
      currentNodeParent = undefined;
      currentMarkNode = undefined;
    }
  }
}

function $getCommentIDs(node: TextNode, offset: number): null | Array<string> {
  let currentNode = node;
  while (currentNode !== null) {
    if ($isMarkNode(currentNode)) {
      return currentNode.getIDs();
    } else if (
      $isTextNode(currentNode) &&
      offset === currentNode.getTextContentSize()
    ) {
      const nextSibling = currentNode.getNextSibling();
      if ($isMarkNode(nextSibling)) {
        return nextSibling.getIDs();
      }
    }
    currentNode = currentNode.getParent();
  }
  return null;
}

export default function CommentPlugin({
  initialComments,
}: {
  initialComments?: Comments,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  const [comments, setComments] = useState<Comments>(initialComments || []);
  const markNodeMap = useMemo<Map<string, Set<NodeKey>>>(() => {
    return new Map();
  }, []);
  const [activeAnchorKey, setActiveAnchorKey] = useState(null);
  const [activeIDs, setActiveIDs] = useState<Array<string>>([]);
  const [activeMarkKeys, setActiveMarkKeys] = useState<Array<string>>([]);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const cancelAddComment = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      // Restore selection
      if (selection !== null) {
        selection.dirty = true;
      }
    });
    setShowCommentInput(false);
  }, [editor]);

  const deleteComment = useCallback(
    (comment: Comment, thread?: Thread) => {
      setComments((_comments) => {
        const nextComments = Array.from(_comments);

        if (thread !== undefined) {
          for (let i = 0; i < nextComments.length; i++) {
            const nextComment = nextComments[i];
            if (nextComment.type === 'thread' && nextComment.id === thread.id) {
              const newThread = cloneThread(nextComment);
              nextComments.splice(i, 1, newThread);
              const threadComments = newThread.comments;
              const index = threadComments.indexOf(comment);
              threadComments.splice(index, 1);
              if (threadComments.length === 0) {
                const threadIndex = nextComments.indexOf(newThread);
                nextComments.splice(threadIndex, 1);
                // Remove ids from associated marks
                const id = thread !== undefined ? thread.id : comment.id;
                const markNodeKeys = markNodeMap.get(id);
                if (markNodeKeys !== undefined) {
                  // Do async to avoid causing a React infinite loop
                  setTimeout(() => {
                    editor.update(() => {
                      for (const key of markNodeKeys) {
                        const node: null | MarkNode = $getNodeByKey(key);
                        if ($isMarkNode(node)) {
                          node.deleteID(id);
                          if (node.getIDs().length === 0) {
                            $unwrapMarkNode(node);
                          }
                        }
                      }
                    });
                  });
                }
              }
              break;
            }
          }
        } else {
          const index = nextComments.indexOf(comment);
          nextComments.splice(index, 1);
        }
        return nextComments;
      });
    },
    [editor, markNodeMap],
  );

  const submitAddComment = useCallback(
    (
      commentOrThread: Comment | Thread,
      isInlineComment: boolean,
      thread?: Thread,
    ) => {
      setComments((_comments) => {
        const nextComments = Array.from(_comments);
        if (thread !== undefined && commentOrThread.type === 'comment') {
          for (let i = 0; i < nextComments.length; i++) {
            const comment = nextComments[i];
            if (comment.type === 'thread' && comment.id === thread.id) {
              const newThread = cloneThread(comment);
              nextComments.splice(i, 1, newThread);
              newThread.comments.push(commentOrThread);
              break;
            }
          }
        } else {
          nextComments.push(commentOrThread);
        }
        return nextComments;
      });
      if (isInlineComment) {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const focus = selection.focus;
            const anchor = selection.anchor;
            const isBackward = selection.isBackward();
            const id = commentOrThread.id;

            // Wrap content in a MarkNode
            $wrapSelectionInMarkNode(selection, isBackward, id);

            // Make selection collapsed at the end
            if (isBackward) {
              focus.set(anchor.key, anchor.offset, anchor.type);
            } else {
              anchor.set(focus.key, focus.offset, focus.type);
            }
          }
        });
        setShowCommentInput(false);
      }
    },
    [editor],
  );

  useEffect(() => {
    const changedElems = [];
    for (let i = 0; i < activeMarkKeys.length; i++) {
      const key = activeMarkKeys[i];
      const elem = editor.getElementByKey(key);
      if (elem !== null) {
        elem.classList.add('selected');
        changedElems.push(elem);
      }
    }
    return () => {
      for (let i = 0; i < changedElems.length; i++) {
        const changedElem = changedElems[i];
        changedElem.classList.remove('selected');
      }
    };
  }, [activeMarkKeys, editor]);

  useEffect(() => {
    const markNodeKeysToIDs: Map<NodeKey, Array<string>> = new Map();

    return mergeRegister(
      editor.registerMutationListener(MarkNode, (mutations) => {
        for (const [key, mutation] of mutations) {
          const node: null | MarkNode = $getNodeByKey(key);
          let ids = [];
          let keyAdded = false;

          if (mutation === 'destroyed') {
            ids = markNodeKeysToIDs.get(key) || [];
            setActiveMarkKeys((keys) => keys.filter((_key) => key !== _key));
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
              if (mutation === 'created') {
                keyAdded = true;
              }
              if (markNodeKeys === undefined) {
                markNodeKeys = new Set();
                markNodeMap.set(id, markNodeKeys);
              }
              if (!markNodeKeys.has(key)) {
                markNodeKeys.add(key);
              }
            }
          }

          if (keyAdded) {
            setActiveMarkKeys((keys) => [...keys, key]);
          }
        }
      }),
      editor.registerUpdateListener(({editorState, tags}) => {
        editorState.read(() => {
          const selection = $getSelection();
          let hasActiveIds = false;

          if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode();

            if ($isTextNode(anchorNode)) {
              const commentIDs = $getCommentIDs(
                anchorNode,
                selection.anchor.offset,
              );
              if (commentIDs !== null) {
                setActiveIDs(commentIDs);
                hasActiveIds = true;
              } else if (!selection.isCollapsed()) {
                setActiveAnchorKey(anchorNode.getKey());
                return;
              }
            }
          }
          if (!hasActiveIds) {
            setActiveIDs((_activeIds) =>
              _activeIds.length === 0 ? _activeIds : [],
            );
          }
          setActiveAnchorKey(null);
        });
        if (!tags.has('collaboration')) {
          setShowCommentInput(false);
        }
      }),
    );
  }, [editor, markNodeMap]);

  const onAddComment = () => {
    const domSelection = window.getSelection();
    domSelection.removeAllRanges();
    setShowCommentInput(true);
  };

  return (
    <>
      {showCommentInput &&
        createPortal(
          <CommentInputBox
            editor={editor}
            cancelAddComment={cancelAddComment}
            submitAddComment={submitAddComment}
          />,
          document.body,
        )}
      {activeAnchorKey !== null &&
        !showCommentInput &&
        createPortal(
          <AddCommentBox
            anchorKey={activeAnchorKey}
            editor={editor}
            onAddComment={onAddComment}
          />,
          document.body,
        )}
      {createPortal(
        <Button
          className={`CommentPlugin_ShowCommentsButton ${
            showComments ? 'active' : ''
          }`}
          onClick={() => setShowComments(!showComments)}
          title={showComments ? 'Hide Comments' : 'Show Comments'}>
          <i className="comments" />
        </Button>,
        document.body,
      )}
      {showComments &&
        createPortal(
          <CommentsPanel
            comments={comments}
            submitAddComment={submitAddComment}
            deleteComment={deleteComment}
            activeIDs={activeIDs}
            markNodeMap={markNodeMap}
          />,
          document.body,
        )}
    </>
  );
}
