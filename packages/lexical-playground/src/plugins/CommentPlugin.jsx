/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState, LexicalEditor, NodeKey} from 'lexical';

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
  $getSelection,
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

export type Reference = {
  comments: Array<Comment>,
  id: string,
  quote: string,
  type: 'reference',
};

export type Comments = Array<Reference | Comment>;

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

  useLayoutEffect(() => {
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
  submitAddComment: (Comment | Reference, boolean) => void,
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
            const color = '255, 121, 45';
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
      submitAddComment(createReference(quote, content), true);
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
  reference,
  placeholder,
}: {
  placeholder?: string,
  reference?: Reference,
  submitAddComment: (Comment, boolean, reference?: Reference) => void,
}) {
  const [content, setContent] = useState('');
  const [canSubmit, setCanSubmit] = useState(false);
  const editorRef = useRef(null);

  const onChange = useOnChange(setContent, setCanSubmit);

  const submitComment = () => {
    if (canSubmit) {
      submitAddComment(createComment(content), false, reference);
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
  submitAddComment: (Comment | Reference, boolean) => void,
}) {
  return (
    <div className="CommentPlugin_CommentsPanel_Footer" ref={footerRef}>
      <CommentsComposer submitAddComment={submitAddComment} />
    </div>
  );
}

function CommentsPanelListComment({
  comment,
  rtf,
}: {
  comment: Comment,
  rtf: RtfObject,
}): React$Node {
  const seconds = Math.round((comment.timeStamp - performance.now()) / 1000);
  const minutes = Math.round(seconds / 60);

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
    </li>
  );
}

function CommentsPanelList({
  comments,
  listRef,
  submitAddComment,
}: {
  comments: Comments,
  listRef: {current: null | HTMLElement},
  submitAddComment: (
    Comment | Reference,
    boolean,
    reference?: Reference,
  ) => void,
}): React$Node {
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
      {comments.map((commentOrReference) => {
        if (commentOrReference.type === 'reference') {
          return (
            <li
              key={commentOrReference.id}
              className="CommentPlugin_CommentsPanel_List_Reference">
              <blockquote className="CommentPlugin_CommentsPanel_List_Reference_Quote">
                > <span>{commentOrReference.quote}</span>
              </blockquote>
              <ul className="CommentPlugin_CommentsPanel_List_Reference_Comments">
                {commentOrReference.comments.map((comment) => (
                  <CommentsPanelListComment
                    key={comment.id}
                    comment={comment}
                    rtf={rtf}
                  />
                ))}
              </ul>
              <div className="CommentPlugin_CommentsPanel_List_Reference_Editor">
                <CommentsComposer
                  submitAddComment={submitAddComment}
                  reference={commentOrReference}
                  placeholder="Reply to comment..."
                />
              </div>
            </li>
          );
        }
        return (
          <CommentsPanelListComment
            key={commentOrReference.id}
            comment={commentOrReference}
            rtf={rtf}
          />
        );
      })}
    </ul>
  );
}

function CommentsPanel({
  comments,
  submitAddComment,
}: {
  comments: Comments,
  submitAddComment: (
    Comment | Reference,
    boolean,
    reference?: Reference,
  ) => void,
}): React$Node {
  const footerRef = useRef(null);
  const listRef = useRef(null);
  const isEmpty = comments.length === 0;

  useLayoutEffect(() => {
    const footerElem = footerRef.current;
    if (footerElem !== null) {
      const resizeObserver = new ResizeObserver(() => {
        const listElem = listRef.current;
        if (listElem !== null) {
          const rect = footerElem.getBoundingClientRect();
          listElem.style.height = window.innerHeight - rect.height - 133 + 'px';
        }
      });

      resizeObserver.observe(footerElem);
      return () => {
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
          comments={comments}
          listRef={listRef}
          submitAddComment={submitAddComment}
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

function createReference(quote: string, content: string): Reference {
  return {
    comments: [createComment(content)],
    id: createUID(),
    quote,
    type: 'reference',
  };
}

function cloneReference(reference: Reference): Reference {
  return {
    comments: Array.from(reference.comments),
    id: reference.id,
    quote: reference.quote,
    type: 'reference',
  };
}

export default function CommentPlugin({
  initialComments,
}: {
  initialComments?: Comments,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  const [comments, setComments] = useState<Comments>(initialComments || []);
  // const referenceMap = useMemo<Map<string, Set<NodeKey>>>(() => {
  //   return new Map();
  // }, []);
  const [activeAnchorKey, setActiveAnchorKey] = useState(null);
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

  const submitAddComment = useCallback(
    (
      commentOrReference: Comment | Reference,
      hideCommentInput: boolean,
      reference?: Reference,
    ) => {
      setComments((_comments) => {
        const nextComments = Array.from(_comments);
        if (reference !== undefined && commentOrReference.type === 'comment') {
          for (let i = 0; i < nextComments.length; i++) {
            const comment = nextComments[i];
            if (comment.type === 'reference' && comment.id === reference.id) {
              const newReference = cloneReference(comment);
              nextComments.splice(i, 1, newReference);
              newReference.comments.push(commentOrReference);
              break;
            }
          }
        } else {
          nextComments.push(commentOrReference);
        }
        return nextComments;
      });
      if (hideCommentInput) {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const focus = selection.focus;
            const anchor = selection.anchor;

            // Make selection collapsed at the end
            if (selection.isBackward()) {
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
    return mergeRegister(
      editor.registerUpdateListener(({editorState, tags}) => {
        editorState.read(() => {
          const selection = $getSelection();

          if ($isRangeSelection(selection) && !selection.isCollapsed()) {
            const anchorNode = selection.anchor.getNode();

            if ($isTextNode(anchorNode)) {
              setActiveAnchorKey(anchorNode.getKey());
              return;
            }
          }
          setActiveAnchorKey(null);
        });
        if (!tags.has('collaboration')) {
          setShowCommentInput(false);
        }
      }),
    );
  }, [editor]);

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
          />,
          document.body,
        )}
    </>
  );
}
